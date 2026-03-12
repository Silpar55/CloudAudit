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

	def _save_anomalies(self, anomalies_df: pd.DataFrame, conn) -> list:
		"""
		Saves anomalies to the database AND returns a list of dictionaries
		formatted perfectly for the frontend JSON response.
		"""
		cursor = conn.cursor()
		explainer = ExplainerUtility(conn)

		# We will collect the formatted results here to send back to the API
		results_for_frontend = []

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

			root_cause = explainer.find_root_cause(
				account_id=row['aws_account_id'],
				service=row['service'],
				region=row['region'],
				target_date=row['time_period_start']
			)


			resource_id = root_cause['resource_id'] if root_cause else None
			root_cause_json = json.dumps(root_cause) if root_cause else None

			# Execute database save
			cursor.execute(insert_query, (
				str(row['daily_cost_id']),
				str(row['aws_account_id']),
				float(expected),
				float(deviation),
				int(row['severity']),
				self.model_version,
				resource_id,
				root_cause_json
			))

			# Build the dictionary for the API response
			results_for_frontend.append({
				"daily_cost_id": str(row['daily_cost_id']),
				"service": row['service'],
				"region": row['region'],
				"date": row['time_period_start'].strftime("%Y-%m-%d"),
				"severity": int(row['severity']),
				"deviation_pct": round(float(deviation), 2),
				"explanation": root_cause  # Include the parsed JSON object, not the string
			})

		conn.commit()
		cursor.close()

		return results_for_frontend

	def run_analysis_for_account(self, aws_account_id: str):
		conn = psycopg2.connect(self.db_url)

		try:
			query = """
	                SELECT daily_cost_id, aws_account_id, time_period_start, total_cost, service, region 
	                FROM daily_cost_summaries 
	                WHERE aws_account_id = %(account_id)s
	                ORDER BY time_period_start ASC
	            """
			df = pd.read_sql(query, conn, params={"account_id": aws_account_id})

			if len(df) < 14:
				return {"status": "skipped", "message": "Not enough data. Minimum 14 days required."}

			anomalies = self.detector.detect(df)

			# Get the formatted list back from the save function
			detected_list = []
			if not anomalies.empty:
				detected_list = self._save_anomalies(anomalies, conn)

			# Return the full payload structured for the frontend
			return {
				"status": "success",
				"anomalies_detected": len(detected_list),
				"data": detected_list
			}

		finally:
			conn.close()
