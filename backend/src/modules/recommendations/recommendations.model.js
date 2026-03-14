import { pool } from "#config";

export const getRecommendationsByAccountId = async (internalId) => {
  const query = `
    SELECT * FROM recommendations 
    WHERE aws_account_id = $1 
    ORDER BY estimated_monthly_savings DESC, created_at DESC;
  `;
  try {
    const { rows } = await pool.query(query, [internalId]);
    return rows;
  } catch (error) {
    console.error("Error fetching recommendations:", error);
    return null;
  }
};

export const getActiveResourcesByService = async (
  internalAccountId,
  productCode,
  days,
) => {
  const query = `
    SELECT DISTINCT resource_id, SUM(unblended_cost) as total_recent_cost
    FROM cost_data
    WHERE aws_account_id = $1 
      AND product_code = $2 
      AND time_interval >= NOW() - INTERVAL '${days} days'
      AND resource_id IS NOT NULL
      AND resource_id != 'Unknown'
    GROUP BY resource_id;
  `;
  try {
    const { rows } = await pool.query(query, [internalAccountId, productCode]);
    return rows;
  } catch (error) {
    console.error("Error fetching distinct resources:", error);
    return [];
  }
};

export const upsertRecommendation = async (recData) => {
  const resolutionType = recData.resolution_type || "automated";
  const actionSteps = recData.action_steps
    ? JSON.stringify(recData.action_steps)
    : null;

  const query = `
    INSERT INTO recommendations (
      aws_account_id, resource_id, resource_type, anomaly_id, 
      recommendation_type, description, estimated_monthly_savings, 
      confidence_score, status, metadata, resolution_type, action_steps
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9, $10, $11)
    ON CONFLICT (recommendation_id) 
    DO UPDATE SET
      description = EXCLUDED.description,
      estimated_monthly_savings = EXCLUDED.estimated_monthly_savings,
      confidence_score = EXCLUDED.confidence_score,
      metadata = EXCLUDED.metadata,
      resolution_type = EXCLUDED.resolution_type,
      action_steps = EXCLUDED.action_steps;
  `;

  const values = [
    recData.aws_account_id,
    recData.resource_id,
    recData.resource_type,
    recData.anomaly_id,
    recData.recommendation_type,
    recData.description,
    recData.estimated_monthly_savings,
    recData.confidence_score,
    recData.metadata,
    resolutionType,
    actionSteps,
  ];

  try {
    await pool.query(query, values);
  } catch (error) {
    console.error("Error upserting recommendation:", error);
  }
};

export const getRecommendationById = async (id, accountId) => {
  const query = `SELECT * FROM recommendations WHERE recommendation_id = $1 AND aws_account_id = $2;`;
  const { rows } = await pool.query(query, [id, accountId]);
  return rows[0];
};

export const updateRecommendationStatus = async (id, status, updates = {}) => {
  const { implementedBy, rollbackReason, metadata } = updates;
  const metadataUpdate = metadata ? `, metadata = $4` : ``;

  const query = `
    UPDATE recommendations 
    SET status = $1, 
        implemented_at = CASE WHEN $1 = 'implemented' THEN NOW() ELSE implemented_at END,
        implemented_by = COALESCE($2, implemented_by),
        rolled_back_at = CASE WHEN $1 = 'rolled_back' THEN NOW() ELSE rolled_back_at END,
        rollback_reason = COALESCE($3, rollback_reason)
        ${metadataUpdate}
    WHERE recommendation_id = $5
    RETURNING *;
  `;

  const values = [status, implementedBy || null, rollbackReason || null];
  if (metadata) values.push(metadata);
  values.push(id);

  const { rows } = await pool.query(query, values);
  return rows[0];
};

export const logAuditAction = async (teamId, userId, action, details) => {
  const query = `INSERT INTO audit_logs (team_id, user_id, action, details) VALUES ($1, $2, $3, $4);`;
  await pool.query(query, [teamId, userId, action, JSON.stringify(details)]);
};

// Add this new function
export const getOrphanedAnomalies = async (accountId) => {
  const query = `
    SELECT 
      a.anomaly_id, a.resource_id, a.expected_cost, a.deviation_pct, a.root_cause_details,
      dcs.service, dcs.region
    FROM cost_anomalies a
    JOIN daily_cost_summaries dcs ON a.daily_cost_id = dcs.daily_cost_id
    LEFT JOIN recommendations r ON a.anomaly_id = r.anomaly_id
    WHERE a.aws_account_id = $1 
      AND r.recommendation_id IS NULL;
  `;
  try {
    const { rows } = await pool.query(query, [accountId]);
    return rows;
  } catch (error) {
    console.error("Error fetching orphaned anomalies:", error);
    return [];
  }
};
