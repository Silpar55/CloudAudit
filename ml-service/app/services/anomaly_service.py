import json
import os
import pandas as pd
import psycopg2
from dotenv import load_dotenv

from ..models.explainer import ExplainerUtility
from ..models.isolation_forest import CostAnomalyDetector

# Load environment variables from the .env file
load_dotenv()


class AnomalyService:
	def __init__(self):
		# Fetch the database URL securely from the environment
		self.db_url = os.getenv("DATABASE_URL")

		if not self.db_url:
			raise ValueError("DATABASE_URL environment variable is missing.")

		self.detector = CostAnomalyDetector(contamination=0.05)
		self.model_version = "iforest_v1.0"

	def run_analysis_for_account(self, aws_account_id: str):
		# 1. Connect to Database using the URL from .env
		conn = psycopg2.connect(self.db_url)

		try:
			# 2. Fetch the last 60 days of data for this specific account
			query = """
                SELECT daily_cost_id, aws_account_id, time_period_start, total_cost, service, region
                FROM daily_cost_summaries 
                WHERE aws_account_id = %(account_id)s
                ORDER BY time_period_start ASC
            """

			# Pandas securely executes the query and creates a DataFrame instantly
			df = pd.read_sql(query, conn, params={"account_id": aws_account_id})

			if len(df) < 14:
				return {"status": "skipped", "message": "Not enough data. Minimum 14 days required."}

			# 3. Run the Machine Learning Model
			anomalies = self.detector.detect(df)

			# 4. Save results to the database if any anomalies are found
			if not anomalies.empty:
				self._save_anomalies(anomalies, conn)

			return {
				"status": "success",
				"anomalies_detected": len(anomalies)
			}

		finally:
			# Always ensure the connection is closed
			conn.close()

	def _save_anomalies(self, anomalies_df: pd.DataFrame, conn):
		cursor = conn.cursor()

		# Initialize the explainer with the active database connection
		explainer = ExplainerUtility(conn)

		# UPDATED: Added resource_id and root_cause_details to the insert query
		insert_query = """
			INSERT INTO cost_anomalies 
			(daily_cost_id, aws_account_id, expected_cost, deviation_pct, severity, model_version, detected_at, resource_id, root_cause_details)
			VALUES (%s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP, %s, %s)
			ON CONFLICT (daily_cost_id, model_version) 
			DO UPDATE SET 
				expected_cost = EXCLUDED.expected_cost,
				deviation_pct = EXCLUDED.deviation_pct,
				severity = EXCLUDED.severity,
				detected_at = CURRENT_TIMESTAMP,
				resource_id = EXCLUDED.resource_id,
				root_cause_details = EXCLUDED.root_cause_details
		"""

		for index, row in anomalies_df.iterrows():
			expected = anomalies_df['total_cost'].median()
			deviation = ((row['total_cost'] - expected) / expected) * 100 if expected > 0 else 0

			# 1. RUN THE EXPLAINER DRILL-DOWN
			# We pass the specific details of the anomaly to find the exact cause
			root_cause = explainer.find_root_cause(
				account_id=row['aws_account_id'],
				service=row['service'],
				region=row['region'],
				target_date=row['time_period_start']
			)

			# 2. Safely extract the resource_id and format the JSON context
			resource_id = root_cause['resource_id'] if root_cause else None
			print(resource_id)
			root_cause_json = json.dumps(root_cause) if root_cause else None
			print(root_cause_json)

			cursor.execute(insert_query, (
				str(row['daily_cost_id']),
				str(row['aws_account_id']),
				float(expected),
				float(deviation),
				int(row['severity']),
				self.model_version,
				resource_id,  # New: The specific failing resource
				root_cause_json  # New: The JSON payload for the LLM
			))

		conn.commit()
		cursor.close()
