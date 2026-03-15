import { pool } from "#config";

export const ensureFallbackResourceExists = async () => {
  const query = `
    INSERT INTO resources (resource_id, aws_account_id, service, instance_type, region)
    VALUES ('Unknown', NULL, 'Account-Level', 'N/A', 'Global')
    ON CONFLICT (resource_id) DO NOTHING;
  `;
  try {
    await pool.query(query);
  } catch (error) {
    console.error("Failed to ensure fallback resource exists:", error);
  }
};

export const getAnomaliesByInternalId = async (internalAccountId) => {
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
    const { rows } = await pool.query(query, [internalAccountId]);
    return rows;
  } catch (error) {
    console.error("Error fetching anomalies:", error);
    return null;
  }
};
