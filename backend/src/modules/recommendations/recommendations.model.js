/**
 * CloudAudit — Data access: `recommendations`.
 * PostgreSQL queries and row mapping for this feature.
 */

import { pool } from "#config";
import { insertAuditLog } from "#modules/audit/audit.model.js";

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
    // Ensure the referenced resource exists to satisfy FK constraints.
    // In real AWS accounts, cost_data rows may include resource_id values that are not yet
    // present in resources (e.g. first-time sync). We create a minimal placeholder row.
    if (recData.resource_id && recData.resource_id !== "Unknown") {
      try {
        const metaQuery = `
          SELECT product_code, region
          FROM cost_data
          WHERE aws_account_id = $1 AND resource_id = $2
          ORDER BY time_interval DESC
          LIMIT 1;
        `;
        const { rows: metaRows } = await pool.query(metaQuery, [
          recData.aws_account_id,
          recData.resource_id,
        ]);
        const productCode = metaRows?.[0]?.product_code || "UnknownService";
        const region = metaRows?.[0]?.region || "UnknownRegion";

        const resourceUpsert = `
          INSERT INTO resources (resource_id, aws_account_id, service, instance_type, region, last_seen)
          VALUES ($1, $2, $3, $4, $5, NOW())
          ON CONFLICT (resource_id) DO UPDATE
          SET last_seen = NOW();
        `;
        await pool.query(resourceUpsert, [
          recData.resource_id,
          recData.aws_account_id,
          productCode,
          "unknown",
          region,
        ]);
      } catch (resourceErr) {
        // If this fails, we'll still attempt the recommendation insert; the FK will surface clearly.
        console.error("Error ensuring resource exists:", resourceErr);
      }
    }

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
            anomaly_id = COALESCE($7, anomaly_id)
        WHERE recommendation_id = $8;
      `;
      // Removed updated_at = NOW()
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
      // Avoid creating a duplicate pending row right after the user implemented the same
      // resource + recommendation type (scan runs again and still sees idle cost signals).
      const recentImplemented = await pool.query(
        `
        SELECT 1 FROM recommendations
        WHERE aws_account_id = $1
          AND resource_id = $2
          AND recommendation_type = $3
          AND status = 'implemented'
          AND implemented_at IS NOT NULL
          AND implemented_at > NOW() - INTERVAL '14 days'
        LIMIT 1;
        `,
        [
          recData.aws_account_id,
          recData.resource_id,
          recData.recommendation_type,
        ],
      );
      if (recentImplemented.rows.length > 0) {
        return;
      }

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
  client = null,
) => {
  const { implementedBy, rollbackReason, metadata } = updates;
  const metadataUpdate = metadata ? `, metadata = $4` : ``;
  // Without metadata, recommendation_id is $4; with metadata it is $5.
  const idPlaceholder = metadata ? "$5" : "$4";

  const query = `
    UPDATE recommendations 
    SET status = $1::recommendation_status, 
        implemented_at = CASE 
          WHEN $1::recommendation_status = 'implemented'::recommendation_status 
          THEN CURRENT_TIMESTAMP 
          ELSE implemented_at 
        END,
        implemented_by = COALESCE($2, implemented_by),
        rolled_back_at = CASE 
          WHEN $1::recommendation_status = 'rolled_back'::recommendation_status 
          THEN CURRENT_TIMESTAMP 
          ELSE rolled_back_at 
        END,
        rollback_reason = COALESCE($3, rollback_reason)
        ${metadataUpdate}
    WHERE recommendation_id = ${idPlaceholder}
    RETURNING *;
  `;

  const values = [status, implementedBy || null, rollbackReason || null];
  if (metadata) values.push(metadata);
  values.push(recommendationId);

  const db = client || pool;
  const { rows } = await db.query(query, values);
  return rows[0];
};

export const logAuditAction = async (teamId, userId, action, details) => {
  await insertAuditLog(teamId, userId, action, details);
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
