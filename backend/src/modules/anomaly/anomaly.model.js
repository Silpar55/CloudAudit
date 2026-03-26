import { pool } from "#config";

let anomalyStatusColumnsAvailable = null;

/** Clears cached schema detection (used by unit tests). */
export const resetAnomalyStatusColumnCache = () => {
  anomalyStatusColumnsAvailable = null;
};

const hasAnomalyStatusColumns = async () => {
  if (anomalyStatusColumnsAvailable !== null) return anomalyStatusColumnsAvailable;
  const query = `
    SELECT COUNT(*)::int AS c
    FROM information_schema.columns
    WHERE table_name = 'cost_anomalies'
      AND column_name IN ('status', 'dismissed_at', 'resolved_at', 'status_note');
  `;
  const { rows } = await pool.query(query);
  anomalyStatusColumnsAvailable = (rows[0]?.c ?? 0) === 4;
  return anomalyStatusColumnsAvailable;
};

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
  try {
    const hasStatus = await hasAnomalyStatusColumns();
    const query = hasStatus
      ? `
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
          root_cause_details,
          status,
          dismissed_at,
          resolved_at,
          status_note
        FROM cost_anomalies
        WHERE aws_account_id = $1
        ORDER BY detected_at DESC;
      `
      : `
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
          root_cause_details,
          'open'::text AS status,
          NULL::timestamptz AS dismissed_at,
          NULL::timestamptz AS resolved_at,
          NULL::text AS status_note
        FROM cost_anomalies
        WHERE aws_account_id = $1
        ORDER BY detected_at DESC;
      `;
    const { rows } = await pool.query(query, [internalAccountId]);
    return rows;
  } catch (error) {
    console.error("Error fetching anomalies:", error);
    return null;
  }
};

export const getAnomalyById = async (anomalyId, internalAccountId) => {
  const query = `
    SELECT *
    FROM cost_anomalies
    WHERE anomaly_id = $1
      AND aws_account_id = $2
    LIMIT 1;
  `;
  const { rows } = await pool.query(query, [anomalyId, internalAccountId]);
  return rows[0] || null;
};

export const updateAnomalyStatus = async (
  anomalyId,
  internalAccountId,
  status,
  statusNote = null,
) => {
  const hasStatus = await hasAnomalyStatusColumns();
  if (!hasStatus) {
    throw new Error(
      "Anomaly status columns are missing. Recreate the DB from migrations/001_initial_schema.sql (or add the cost_anomalies status columns manually).",
    );
  }
  const query = `
    UPDATE cost_anomalies
    SET
      status = $1,
      status_note = COALESCE($2, status_note),
      dismissed_at = CASE
        WHEN $1 = 'dismissed' THEN NOW()
        ELSE dismissed_at
      END,
      resolved_at = CASE
        WHEN $1 = 'resolved' THEN NOW()
        ELSE resolved_at
      END
    WHERE anomaly_id = $3
      AND aws_account_id = $4
    RETURNING *;
  `;
  const { rows } = await pool.query(query, [
    status,
    statusNote,
    anomalyId,
    internalAccountId,
  ]);
  return rows[0] || null;
};
