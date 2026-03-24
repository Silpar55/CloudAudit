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
