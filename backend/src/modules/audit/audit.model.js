import { pool } from "#config";

export const insertAuditLog = async (teamId, userId, action, details) => {
  const query = `
    INSERT INTO audit_logs (team_id, user_id, action, details)
    VALUES ($1, $2, $3, $4);
  `;
  await pool.query(query, [
    teamId,
    userId,
    action,
    typeof details === "string" ? details : JSON.stringify(details ?? {}),
  ]);
};

export const listTeamNotificationsForUser = async (
  teamId,
  userId,
  {
    page = 1,
    limit = 5,
    includeDismissed = false,
  } = {},
) => {
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(20, Math.max(1, parseInt(limit, 10) || 5));
  const offset = (safePage - 1) * safeLimit;

  // If includeDismissed=false, hide dismissed notifications for this user.
  const dismissedCondition = includeDismissed
    ? ""
    : " AND nr.dismissed_at IS NULL";

  const countQuery = `
    SELECT COUNT(*)::int AS total
    FROM audit_logs al
    LEFT JOIN notification_receipts nr
      ON nr.audit_log_id = al.audit_log_id
     AND nr.user_id = $2
    WHERE al.team_id = $1
      AND al.action = 'ML_ANALYSIS_RAN'
      ${dismissedCondition};
  `;

  const { rows: countRows } = await pool.query(countQuery, [teamId, userId]);
  const total = countRows[0]?.total ?? 0;

  const listQuery = `
    SELECT
      al.audit_log_id,
      al.team_id,
      al.user_id,
      al.action,
      al.details,
      al.created_at,
      u.first_name,
      u.last_name,
      u.email,
      (nr.read_at IS NOT NULL) AS is_read,
      (nr.dismissed_at IS NOT NULL) AS is_dismissed
    FROM audit_logs al
    LEFT JOIN notification_receipts nr
      ON nr.audit_log_id = al.audit_log_id
     AND nr.user_id = $2
    LEFT JOIN users u ON u.user_id = al.user_id
    WHERE al.team_id = $1
      AND al.action = 'ML_ANALYSIS_RAN'
      ${dismissedCondition}
    ORDER BY al.created_at DESC
    LIMIT $3 OFFSET $4;
  `;

  const { rows: logs } = await pool.query(listQuery, [
    teamId,
    userId,
    safeLimit,
    offset,
  ]);

  return {
    logs,
    total,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.max(1, Math.ceil(total / safeLimit)),
  };
};

export const markNotificationRead = async (teamId, auditLogId, userId) => {
  await pool.query(
    `
      WITH target AS (
        SELECT audit_log_id
        FROM audit_logs
        WHERE audit_log_id = $1
          AND team_id = $3
          AND action = 'ML_ANALYSIS_RAN'
      )
      INSERT INTO notification_receipts (audit_log_id, user_id, read_at)
      SELECT $1, $2, NOW()
      FROM target
      ON CONFLICT (audit_log_id, user_id)
      DO UPDATE SET read_at = NOW()
    `,
    [auditLogId, userId, teamId],
  );
};

export const dismissNotification = async (teamId, auditLogId, userId) => {
  await pool.query(
    `
      WITH target AS (
        SELECT audit_log_id
        FROM audit_logs
        WHERE audit_log_id = $1
          AND team_id = $3
          AND action = 'ML_ANALYSIS_RAN'
      )
      INSERT INTO notification_receipts (audit_log_id, user_id, dismissed_at, read_at)
      SELECT $1, $2, NOW(), NOW()
      FROM target
      ON CONFLICT (audit_log_id, user_id)
      DO UPDATE SET
        dismissed_at = NOW(),
        read_at = NOW()
    `,
    [auditLogId, userId, teamId],
  );
};

/**
 * Paginated audit log list with optional filters.
 * @param {string} teamId
 * @param {{ page?: number, limit?: number, action?: string, dateFrom?: string, dateTo?: string }} filters
 */
export const listAuditLogsForTeam = async (teamId, filters = {}) => {
  const page = Math.max(1, parseInt(filters.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(filters.limit, 10) || 20));
  const offset = (page - 1) * limit;

  const conditions = ["al.team_id = $1"];
  const params = [teamId];
  let idx = 2;

  if (filters.action && String(filters.action).trim()) {
    conditions.push(`al.action ILIKE $${idx}`);
    params.push(`%${String(filters.action).trim()}%`);
    idx += 1;
  }

  if (filters.dateFrom) {
    conditions.push(`al.created_at::date >= $${idx}::date`);
    params.push(filters.dateFrom);
    idx += 1;
  }

  if (filters.dateTo) {
    conditions.push(`al.created_at::date <= $${idx}::date`);
    params.push(filters.dateTo);
    idx += 1;
  }

  const where = conditions.join(" AND ");

  const countQuery = `
    SELECT COUNT(*)::int AS total
    FROM audit_logs al
    WHERE ${where};
  `;
  const { rows: countRows } = await pool.query(countQuery, params);
  const total = countRows[0]?.total ?? 0;

  const limitIdx = idx;
  const offsetIdx = idx + 1;
  const listQuery = `
    SELECT
      al.audit_log_id,
      al.team_id,
      al.user_id,
      al.action,
      al.details,
      al.created_at,
      u.first_name,
      u.last_name,
      u.email
    FROM audit_logs al
    LEFT JOIN users u ON u.user_id = al.user_id
    WHERE ${where}
    ORDER BY al.created_at DESC
    LIMIT $${limitIdx} OFFSET $${offsetIdx};
  `;
  const listParams = [...params, limit, offset];
  const { rows: logs } = await pool.query(listQuery, listParams);

  return {
    logs,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
};
