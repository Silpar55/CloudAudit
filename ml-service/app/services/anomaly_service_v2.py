"""
app/services/anomaly_service_v2.py
v2.0 — Orchestrates Prophet-based anomaly detection with standardized JSON output.

Key differences from v1.0 (anomaly_service.py):
  - Segments data by (service, region) before detection
  - Uses Prophet residual scores instead of Isolation Forest contamination
  - Produces a fully standardized JSON schema with explainability metadata
  - Handles all null/missing explanation cases explicitly with failure reasons
  - Severity and deviation_pct are cross-account comparable (not locally normalized)
"""

import json
import logging
import os

import pandas as pd
import psycopg2
from dotenv import load_dotenv

from ..models.explainer import ExplainerUtility
from ..models.prophet_detector import ProphetCostDetector

load_dotenv()
logger = logging.getLogger(__name__)

# Explanation failure reason constants — used by the LLM recommendation layer
# to understand WHY a root cause could not be determined.
EXPLANATION_FAILURES = {
    "no_cost_data_rows_found": (
        "No raw cost_data rows match this service/region/date combination. "
        "The daily summary may have been sourced from Cost Explorer cache rather than CUR."
    ),
    "no_cost_increase_vs_prior_day": (
        "Root cause query found no individual resource with a cost increase "
        "compared to the previous day. The anomaly may be a gradual accumulation "
        "rather than a single-resource spike."
    ),
    "resource_id_null": (
        "cost_data rows exist for this period but resource_id is NULL, "
        "meaning the resource was not tagged or identified in the billing report."
    ),
    "query_error": (
        "A database error occurred during the root cause drill-down query."
    ),
}


def _build_explanation_block(root_cause: dict | None, failure_reason: str | None) -> tuple:
    """
    Returns (explainability_level, explanation_dict) for a single anomaly.

    explainability levels:
      "full"    — resource_id, operation, usage_type, and all amounts present
      "partial" — some fields present but resource_id is null
      "none"    — explanation entirely unavailable
    """
    if root_cause is None:
        return "none", None

    missing_fields = []
    if not root_cause.get("resource_id"):
        missing_fields.append("resource_id")

    if missing_fields:
        return "partial", {
            **root_cause,
            "resource_id": None,
            "missing_fields": missing_fields,
            "missing_reason": (
                "resource_id not tagged in cost_data for this operation. "
                "The resource may be untagged or the usage type is account-level."
            ),
        }

    return "full", root_cause


class AnomalyServiceV2:
    def __init__(self):
        self.db_url = os.getenv("DATABASE_URL")
        if not self.db_url:
            raise ValueError("DATABASE_URL environment variable is missing.")

        self.detector = ProphetCostDetector()
        self.model_version = "prophet_v2.0"

    def _save_anomalies(self, anomalies_df: pd.DataFrame, conn) -> list:
        """
        Saves detected anomalies to cost_anomalies table and returns
        the fully standardized JSON list for the API response.
        """
        cursor = conn.cursor()
        explainer = ExplainerUtility(conn)
        results = []

        insert_query = """
            INSERT INTO cost_anomalies
            (daily_cost_id, aws_account_id, expected_cost, deviation_pct,
             severity, model_version, detected_at, resource_id, root_cause_details)
            VALUES (%s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP, %s, %s)
            ON CONFLICT (daily_cost_id, model_version)
            DO UPDATE SET
                expected_cost      = EXCLUDED.expected_cost,
                deviation_pct      = EXCLUDED.deviation_pct,
                severity           = EXCLUDED.severity,
                detected_at        = CURRENT_TIMESTAMP,
                resource_id        = EXCLUDED.resource_id,
                root_cause_details = EXCLUDED.root_cause_details
        """

        for _, row in anomalies_df.iterrows():
            # --- Root cause drill-down ---
            failure_reason = None
            root_cause = None

            try:
                root_cause = explainer.find_root_cause(
                    account_id=row["aws_account_id"],
                    service=row["service"],
                    region=row["region"],
                    target_date=row["time_period_start"],
                )

                if root_cause is None:
                    failure_reason = "no_cost_increase_vs_prior_day"

            except Exception as e:
                logger.error("Root cause query failed: %s", str(e))
                failure_reason = "query_error"

            # --- Build explainability block ---
            explainability, explanation = _build_explanation_block(root_cause, failure_reason)

            resource_id = (
                root_cause.get("resource_id")
                if root_cause and root_cause.get("resource_id")
                else None
            )

            # --- Persist to DB ---
            # root_cause_details stores the raw explanation dict (or null).
            # For partial results, we store what we have including missing_fields.
            root_cause_json = json.dumps(explanation) if explanation else None

            try:
                cursor.execute(insert_query, (
                    str(row["daily_cost_id"]),
                    str(row["aws_account_id"]),
                    float(row["yhat"]),            # Prophet's predicted mean
                    float(row["deviation_pct"]),
                    int(row["severity"]),
                    self.model_version,
                    resource_id,
                    root_cause_json,
                ))
            except Exception as e:
                logger.error(
                    "DB insert failed for daily_cost_id %s: %s",
                    row["daily_cost_id"], str(e)
                )
                continue

            # --- Build API response record ---
            record = {
                "daily_cost_id": str(row["daily_cost_id"]),
                "aws_account_id": str(row["aws_account_id"]),
                "date": row["time_period_start"].strftime("%Y-%m-%d"),
                "service": row["service"],
                "region": row["region"],
                "actual_cost": round(float(row["total_cost"]), 4),
                "expected_cost": round(float(row["yhat"]), 4),
                "expected_cost_upper_bound": round(float(row["yhat_upper"]), 4),
                "deviation_pct": round(float(row["deviation_pct"]), 2),
                "severity": int(row["severity"]),
                "explainability": explainability,  # "full" | "partial" | "none"
                "explanation": explanation,
            }

            # Only add failure metadata when explanation is absent
            if explainability == "none":
                record["explanation_failure_reason"] = failure_reason
                record["explanation_failure_description"] = EXPLANATION_FAILURES.get(
                    failure_reason, "Unknown failure."
                )

            results.append(record)

        conn.commit()
        cursor.close()
        return results

    def run_analysis_for_account(self, aws_account_id: str) -> dict:
        conn = psycopg2.connect(self.db_url)

        try:
            # Fetch ALL service+region rows — the detector will segment internally
            query = """
                SELECT daily_cost_id, aws_account_id, time_period_start,
                       total_cost, service, region
                FROM daily_cost_summaries
                WHERE aws_account_id = %(account_id)s
                ORDER BY time_period_start ASC
            """
            df = pd.read_sql(query, conn, params={"account_id": aws_account_id})

            if df.empty:
                return {
                    "status": "skipped",
                    "model_version": self.model_version,
                    "message": "No cost data found for this account.",
                }

            # Check minimum data across any single segment
            segment_counts = df.groupby(["service", "region"]).size()
            if segment_counts.max() < 14:
                return {
                    "status": "skipped",
                    "model_version": self.model_version,
                    "message": (
                        f"Not enough data. Largest segment has "
                        f"{segment_counts.max()} days. Minimum 14 required."
                    ),
                }

            anomalies_df = self.detector.detect(df)

            detected_list = []
            if not anomalies_df.empty:
                detected_list = self._save_anomalies(anomalies_df, conn)

            return {
                "status": "success",
                "model_version": self.model_version,
                "anomalies_detected": len(detected_list),
                "data": detected_list,
            }

        finally:
            conn.close()