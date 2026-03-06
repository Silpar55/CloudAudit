from typing import Dict, Any

import pandas as pd


class ExplainerUtility:
	def __init__(self, db_connection):
		self.conn = db_connection

	def find_root_cause(self, account_id, service, region, target_date) -> dict[str, float | Any] | None:
		"""
		Drills down into the raw cost_data to find the exact resource and operation
		that caused the cost spike by comparing the target_date to the day before.
		"""
		query = """
            WITH current_day AS (
                SELECT resource_id, operation, usage_type, SUM(unblended_cost) as cost_today
                FROM cost_data
                WHERE aws_account_id = %(account_id)s
                  AND product_code = %(service)s
                  AND region = %(region)s
                  AND DATE(time_interval) = DATE(%(target_date)s)
                GROUP BY resource_id, operation, usage_type
            ),
            previous_day AS (
                SELECT resource_id, operation, usage_type, SUM(unblended_cost) as cost_yesterday
                FROM cost_data
                WHERE aws_account_id = %(account_id)s
                  AND product_code = %(service)s
                  AND region = %(region)s
                  AND DATE(time_interval) = DATE(%(target_date)s) - INTERVAL '1 day'
                GROUP BY resource_id, operation, usage_type
            )
            SELECT 
                c.resource_id, 
                c.operation, 
                c.usage_type, 
                c.cost_today,
                COALESCE(p.cost_yesterday, 0) as cost_yesterday,
                (c.cost_today - COALESCE(p.cost_yesterday, 0)) as cost_increase
            FROM current_day c
            LEFT JOIN previous_day p 
                ON c.resource_id = p.resource_id 
                AND c.operation = p.operation 
                AND c.usage_type = p.usage_type
            WHERE (c.cost_today - COALESCE(p.cost_yesterday, 0)) > 0
            ORDER BY cost_increase DESC
            LIMIT 1;
        """

		# Execute the drill-down query
		df = pd.read_sql(query, self.conn, params={
			"account_id": account_id,
			"service": service,
			"region": region,
			"target_date": target_date
		})

		if df.empty:
			return None

		# Extract the top contributor
		top_cause = df.iloc[0]

		return {
			"resource_id": top_cause['resource_id'],
			"operation": top_cause['operation'],
			"usage_type": top_cause['usage_type'],
			"spike_amount": float(top_cause['cost_increase']),
			"previous_cost": float(top_cause['cost_yesterday']),
			"current_cost": float(top_cause['cost_today'])
		}
