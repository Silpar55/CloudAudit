import os
import pandas as pd
import psycopg2
from dotenv import load_dotenv
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
                SELECT daily_cost_id, aws_account_id, time_period_start, total_cost 
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

		insert_query = """
            INSERT INTO cost_anomalies 
            (daily_cost_id, aws_account_id, expected_cost, deviation_pct, severity, model_version)
            VALUES (%s, %s, %s, %s, %s, %s)
        """

		for index, row in anomalies_df.iterrows():
			# Estimate expected cost using the median of the dataset
			expected = anomalies_df['total_cost'].median()
			deviation = ((row['total_cost'] - expected) / expected) * 100 if expected > 0 else 0

			cursor.execute(insert_query, (
				str(row['daily_cost_id']),
				str(row['aws_account_id']),
				float(expected),
				float(deviation),
				int(row['severity']),
				self.model_version
			))

		conn.commit()
		cursor.close()