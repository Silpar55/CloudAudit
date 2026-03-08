import { pool } from "#config";

export const getAnomaliesByAccountId = async (internalId) => {
  const query = `
    SELECT 
      anomaly_id, 
      daily_cost_id, 
      aws_account_id, 
      resource_id, 
      detected_at, 
      expected_cost, 
      deviation_pct, 
      severity, 
      model_version, 
      root_cause_details
    FROM cost_anomalies
    WHERE aws_account_id = $1
    ORDER BY detected_at DESC;
  `;

  try {
    const { rows } = await pool.query(query, [internalId]);
    return rows;
  } catch (error) {
    console.error("Error fetching anomalies:", error);
    return null;
  }
};
