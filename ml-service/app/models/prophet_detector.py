"""
app/models/prophet_detector.py
v2.0 — Prophet-based cost anomaly detector.

Strategy:
  For each (service, region) segment within an account:
    1. Fit a Prophet model on historical daily costs
    2. Generate a forecast with uncertainty intervals
    3. Compute residual = actual_cost - yhat_upper
    4. Flag as anomaly if residual > 0  (cost exceeded upper confidence bound)
    5. Score severity as % above the upper bound — cross-account comparable
"""

import logging
import pandas as pd
from prophet import Prophet

logger = logging.getLogger(__name__)

# Minimum days required per segment to fit a reliable Prophet model.
# Below this, the model has too little data for weekly seasonality to emerge.
MIN_DAYS_PER_SEGMENT = 14

# Uncertainty interval width. 0.95 means Prophet sets yhat_upper at the 95th
# percentile of its simulated forecast distribution. Costs that exceed this
# are genuine outliers, not noise. Raise to 0.99 to be more conservative.
INTERVAL_WIDTH = 0.95


class ProphetCostDetector:
    def __init__(self, interval_width: float = INTERVAL_WIDTH):
        self.interval_width = interval_width
        self.model_version = "prophet_v2.0"

    def _fit_and_predict(self, segment_df: pd.DataFrame) -> pd.DataFrame:
        """
        Fits a Prophet model on one (service, region) segment and returns
        the original DataFrame rows with forecast columns appended:
            yhat, yhat_lower, yhat_upper, residual, is_anomaly, severity
        """
        # Prophet requires exactly two columns: 'ds' (datestamp) and 'y' (value)
        prophet_df = segment_df[["time_period_start", "total_cost"]].rename(
            columns={"time_period_start": "ds", "total_cost": "y"}
        )
        prophet_df["ds"] = pd.to_datetime(prophet_df["ds"])

        # Build the model:
        #   - weekly_seasonality=True  : captures Mon-Sun cost patterns
        #   - daily_seasonality=False  : we have 1 row/day, intra-day has no meaning
        #   - yearly_seasonality=False : 60 days of data is too short for yearly
        #   - changepoint_prior_scale  : how flexible the trend is. 0.05 = moderately
        #     flexible, avoids over-fitting spikes as trend changes.
        model = Prophet(
            interval_width=self.interval_width,
            weekly_seasonality=True,
            daily_seasonality=False,
            yearly_seasonality=False,
            changepoint_prior_scale=0.05,
        )

        # Suppress Prophet's verbose Stan output — keep logs clean
        model.fit(prophet_df, iter=300)

        # Predict on the SAME historical dates (in-sample forecast).
        # We're not predicting the future here — we're asking:
        # "Given the pattern, what SHOULD each historical day have cost?"
        forecast = model.predict(prophet_df[["ds"]])

        # Merge forecast back onto the original segment
        result = segment_df.copy()
        result["ds"] = pd.to_datetime(result["time_period_start"])
        result = result.merge(
            forecast[["ds", "yhat", "yhat_lower", "yhat_upper"]],
            on="ds",
            how="left"
        )

        # ANOMALY DETECTION:
        # A day is an anomaly if the actual cost exceeded the upper bound of
        # what the model predicted. This is the residual above the ceiling.
        result["residual"] = result["total_cost"] - result["yhat_upper"]
        result["is_anomaly"] = result["residual"] > 0

        # SEVERITY SCORING (0–100):
        # Percentage above the expected upper bound — meaningful and comparable.
        # e.g. severity=500 means cost was 5x the upper confidence bound.
        # We cap at 100 for UI display, but store raw deviation_pct separately.
        result["deviation_pct"] = (
            (result["total_cost"] - result["yhat"]) / result["yhat"].clip(lower=0.01)
        ) * 100

        # SEVERITY (0–100): derived directly from deviation_pct, not from residual/yhat_upper.
        #
        # Mapping rationale:
        #   deviation_pct  0%   →  severity  0   (no deviation, not an anomaly)
        #   deviation_pct  50%  →  severity  17
        #   deviation_pct 100%  →  severity  33
        #   deviation_pct 200%  →  severity  67
        #   deviation_pct 300%  →  severity 100  (cap — catastrophic spike)
        #
        # Formula: severity = min((deviation_pct / 300) * 100, 100)
        # The 300 cap is tunable — lower it (e.g. 200) if you want severity to
        # reach 100 sooner, raise it if your data has extremely large routine swings.
        SEVERITY_CAP_PCT = 300.0

        result["severity"] = (
                (result["deviation_pct"].clip(lower=0) / SEVERITY_CAP_PCT) * 100
        ).clip(upper=100).round(2)

        return result

    def detect(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Entry point. Accepts a full account DataFrame (all services, all regions).

        Returns a DataFrame of detected anomaly rows only, with these extra columns:
            yhat          — Prophet's predicted cost for that day
            yhat_upper    — Upper bound of the 95% confidence interval
            residual      — How far actual exceeded the upper bound
            deviation_pct — % deviation from the predicted mean
            severity      — 0–100 score (% above upper bound, capped)
            segment_key   — "(service) / (region)" label for logging/debugging

        Segments with fewer than MIN_DAYS_PER_SEGMENT rows are skipped —
        Prophet cannot build a reliable weekly seasonal model on sparse data.
        """
        df["time_period_start"] = pd.to_datetime(df["time_period_start"])
        all_anomalies = []

        # Segment by service + region — this is the key architectural fix.
        # Each segment gets its OWN model fitted to ITS OWN cost pattern.
        groups = df.groupby(["service", "region"], group_keys=False)

        for (service, region), segment_df in groups:
            segment_key = f"{service} / {region}"

            if len(segment_df) < MIN_DAYS_PER_SEGMENT:
                logger.info(
                    "Skipping segment '%s' — only %d days (min %d required)",
                    segment_key, len(segment_df), MIN_DAYS_PER_SEGMENT
                )
                continue

            try:
                result = self._fit_and_predict(segment_df)
                result["segment_key"] = segment_key

                anomalies = result[result["is_anomaly"]].copy()
                if not anomalies.empty:
                    logger.info(
                        "Segment '%s': %d anomaly(ies) detected out of %d days",
                        segment_key, len(anomalies), len(segment_df)
                    )
                all_anomalies.append(anomalies)

            except Exception as e:
                # A single segment failure must not abort the whole account analysis.
                logger.error(
                    "Prophet fitting failed for segment '%s': %s", segment_key, str(e)
                )
                continue

        if not all_anomalies:
            return pd.DataFrame()

        return pd.concat(all_anomalies, ignore_index=True)