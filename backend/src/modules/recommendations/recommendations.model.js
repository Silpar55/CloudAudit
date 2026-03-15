import { pool } from "#config";

export const getRecommendationsByInternalId = async (internalAccountId) => {
  const query = `
    SELECT * FROM recommendations 
    WHERE aws_account_id = $1 
    ORDER BY estimated_monthly_savings DESC, created_at DESC;
  `;
  try {
    const { rows } = await pool.query(query, [internalAccountId]);
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

  try {
    // 1. Check if a pending recommendation already exists for this exact resource and action
    const checkQuery = `
      SELECT recommendation_id FROM recommendations 
      WHERE aws_account_id = $1 
        AND resource_id = $2 
        AND recommendation_type = $3 
        AND status = 'pending'
      LIMIT 1;
    `;
    const { rows } = await pool.query(checkQuery, [
      recData.aws_account_id,
      recData.resource_id,
      recData.recommendation_type,
    ]);

    if (rows.length > 0) {
      const existingRecId = rows[0].recommendation_id;
      const updateQuery = `
        UPDATE recommendations 
        SET description = $1,
            estimated_monthly_savings = $2,
            confidence_score = $3,
            metadata = $4,
            resolution_type = $5,
            action_steps = $6,
            anomaly_id = COALESCE($7, anomaly_id), -- Keep existing anomaly link if not provided
            updated_at = NOW()
        WHERE recommendation_id = $8;
      `;
      await pool.query(updateQuery, [
        recData.description,
        recData.estimated_monthly_savings,
        recData.confidence_score,
        recData.metadata,
        resolutionType,
        actionSteps,
        recData.anomaly_id,
        existingRecId,
      ]);
    } else {
      const insertQuery = `
        INSERT INTO recommendations (
          aws_account_id, resource_id, resource_type, anomaly_id, 
          recommendation_type, description, estimated_monthly_savings, 
          confidence_score, status, metadata, resolution_type, action_steps
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9, $10, $11);
      `;
      await pool.query(insertQuery, [
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
      ]);
    }
  } catch (error) {
    console.error("Error upserting recommendation:", error);
  }
};

export const getRecommendationById = async (
  recommendationId,
  internalAccountId,
) => {
  const query = `SELECT * FROM recommendations WHERE recommendation_id = $1 AND aws_account_id = $2;`;
  const { rows } = await pool.query(query, [
    recommendationId,
    internalAccountId,
  ]);
  return rows[0];
};

export const updateRecommendationStatus = async (
  recommendationId,
  status,
  updates = {},
) => {
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
  values.push(recommendationId);

  const { rows } = await pool.query(query, values);
  return rows[0];
};

export const logAuditAction = async (teamId, userId, action, details) => {
  const query = `INSERT INTO audit_logs (team_id, user_id, action, details) VALUES ($1, $2, $3, $4);`;
  await pool.query(query, [teamId, userId, action, JSON.stringify(details)]);
};

export const getOrphanedAnomalies = async (internalAccountId) => {
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
    const { rows } = await pool.query(query, [internalAccountId]);
    return rows;
  } catch (error) {
    console.error("Error fetching orphaned anomalies:", error);
    return [];
  }
};
