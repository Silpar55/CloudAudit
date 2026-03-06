import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest


class CostAnomalyDetector:
	def __init__(self, contamination=0.04):
		# contamination: The estimated percentage of outliers in the data.
		# 4% means roughly 1 anomaly every 25 days, which is realistic for cloud costs.
		self.model = IsolationForest(
			contamination=contamination,
			random_state=42,
			n_jobs=-1  # Uses all available CPU cores for speed
		)

	def detect(self, df: pd.DataFrame) -> pd.DataFrame:
		"""
		Expects a DataFrame with at least: ['time_period_start', 'total_cost']
		Returns a DataFrame containing ONLY the detected anomalies with severity scores.
		"""
		# Ensure time_period_start is a datetime object
		df['time_period_start'] = pd.to_datetime(df['time_period_start'])

		# FEATURE ENGINEERING:
		# Cloud costs drop on weekends. We add the day of the week (0=Mon, 6=Sun)
		# so the model learns that a drop on Saturday is normal, not an anomaly.
		df['day_of_week'] = df['time_period_start'].dt.dayofweek

		# Define the data the model will look at
		features = df[['total_cost', 'day_of_week']]

		# FIT AND PREDICT
		# Returns 1 for normal data, -1 for anomalies
		df['anomaly_label'] = self.model.fit_predict(features)

		# SCORING (Explainer Utility)
		# decision_function returns raw anomaly scores. Negative = anomaly.
		raw_scores = self.model.decision_function(features)


		# Convert raw scores into a human-readable "Severity Score" (0 to 100)
		# Higher score = more severe anomaly
		scores = -raw_scores
		min_score = scores.min()
		max_score = scores.max()

		if max_score - min_score == 0:
			df['severity'] = 0
		else:
			df['severity'] = ((scores - min_score) / (max_score - min_score) * 100).round(2)

		# Filter and return ONLY the anomalies
		anomalies = df[df['anomaly_label'] == -1].copy()

		return anomalies
