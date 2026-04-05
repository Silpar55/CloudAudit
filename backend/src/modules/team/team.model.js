/**
 * CloudAudit — Data access: `team`.
 * PostgreSQL queries and row mapping for this feature.
 */

import { pool } from "#config";

// GET FUNCTION
export const getTeamById = async (teamId) => {
  const query = `
    SELECT 
        t.team_id,
        t.name,
        t.description,
        t.status,
        COUNT(tm.user_id) FILTER (WHERE tm.is_active = TRUE)::int AS member_count,
        t.created_at
    FROM teams t
    LEFT JOIN team_members tm 
        ON tm.team_id = t.team_id
    WHERE t.team_id = $1
    GROUP BY t.team_id;
  `;

  const { rows } = await pool.query(query, [teamId]);

  return rows[0] || null;
};

export const getTeamMemberById = async (teamId, userId) => {
  const query = `
    SELECT * FROM team_members
    WHERE team_id = $1 AND user_id = $2;
  `;

  try {
    const { rows } = await pool.query(query, [teamId, userId]);
    return rows[0];
  } catch (error) {
    return null;
  }
};

/** Active members with user profile — for roster UI (indexed lookup by team). */
export const getActiveTeamMembersWithUsers = async (teamId) => {
  const query = `
    SELECT
      tm.team_member_id,
      tm.user_id,
      tm.role,
      tm.created_at AS joined_at,
      u.email,
      u.first_name,
      u.last_name
    FROM team_members tm
    INNER JOIN users u ON u.user_id = tm.user_id
    WHERE tm.team_id = $1
      AND tm.is_active = TRUE
    ORDER BY
      CASE tm.role
        WHEN 'owner' THEN 1
        WHEN 'admin' THEN 2
        ELSE 3
      END,
      u.first_name,
      u.last_name;
  `;
  const { rows } = await pool.query(query, [teamId]);
  return rows;
};

export const searchInvitableUsersByEmail = async (teamId, q, limit = 8) => {
  const query = `
    SELECT
      u.user_id,
      u.email,
      u.first_name,
      u.last_name
    FROM users u
    WHERE u.is_active = TRUE
      AND u.email ILIKE $2
      AND u.user_id NOT IN (
        SELECT tm.user_id
        FROM team_members tm
        WHERE tm.team_id = $1
          AND tm.is_active = TRUE
      )
    ORDER BY u.email
    LIMIT $3;
  `;

  const like = `%${q}%`;
  const { rows } = await pool.query(query, [teamId, like, limit]);
  return rows;
};

export const countActiveOwners = async (teamId) => {
  const query = `
    SELECT COUNT(*)::int AS c
    FROM team_members
    WHERE team_id = $1
      AND is_active = TRUE
      AND role = 'owner';
  `;
  const { rows } = await pool.query(query, [teamId]);
  return rows[0]?.c ?? 0;
};

/** For scheduled jobs: audit log must reference a real user (FK). */
export const getActiveTeamOwnerUserId = async (teamId) => {
  const query = `
    SELECT user_id
    FROM team_members
    WHERE team_id = $1
      AND is_active = TRUE
      AND role = 'owner'
    LIMIT 1;
  `;
  const { rows } = await pool.query(query, [teamId]);
  return rows[0]?.user_id ?? null;
};

export const getTeamsByUserId = async (userId) => {
  const query = `
      SELECT * FROM team_dashboard_view
      WHERE team_id IN (
        SELECT team_id
        FROM team_members
        WHERE user_id = $1
          AND is_active = TRUE
      )
    `;

  try {
    const { rows } = await pool.query(query, [userId]);
    return rows;
  } catch (error) {
    return null;
  }
};

export const getTeamNotificationCounts = async (userId) => {
  const query = `
    SELECT
      tm.team_id,
      COUNT(
        CASE
          WHEN nr.dismissed_at IS NULL AND nr.read_at IS NULL
          THEN al.audit_log_id
          ELSE NULL
        END
      )::int AS unread_count
    FROM team_members tm
    LEFT JOIN audit_logs al
      ON al.team_id = tm.team_id
     AND al.action = 'ML_ANALYSIS_RAN'
    LEFT JOIN notification_receipts nr
      ON nr.audit_log_id = al.audit_log_id
     AND nr.user_id = $1
    WHERE tm.user_id = $1
      AND tm.is_active = TRUE
    GROUP BY tm.team_id
    ORDER BY unread_count DESC;
  `;

  const { rows } = await pool.query(query, [userId]);
  return rows;
};

// POST FUNCTIONS

export const createTeam = async (name, description = null) => {
  const query = `
        INSERT INTO teams (name, description, status)
        VALUES ($1, $2, 'aws_required')
        RETURNING *;
    `;

  try {
    const { rows } = await pool.query(query, [name, description]);
    return rows[0];
  } catch (error) {
    console.error("Error creating team:", error);
    return null;
  }
};

export const addTeamMember = async (
  teamId,
  userId,
  role,
  {
    notifyAnalysisEmail = true,
    analysisPrefsPrompted = true,
  } = {},
) => {
  const query = `
    INSERT INTO team_members (
      team_id,
      user_id,
      role,
      notify_analysis_email,
      analysis_prefs_prompted
    )
    VALUES ($1,$2,$3,$4,$5)
    RETURNING *;
  `;

  try {
    const { rows } = await pool.query(query, [
      teamId,
      userId,
      role,
      notifyAnalysisEmail,
      analysisPrefsPrompted,
    ]);
    return rows[0];
  } catch (error) {
    return null;
  }
};

/** Verified team emails opted in for ML / analysis result notifications. */
export const getTeamAnalysisNotificationEmails = async (teamId) => {
  const query = `
    SELECT DISTINCT ON (LOWER(TRIM(u.email)))
      TRIM(u.email) AS email
    FROM team_members tm
    INNER JOIN users u ON u.user_id = tm.user_id
    WHERE tm.team_id = $1
      AND tm.is_active = TRUE
      AND tm.notify_analysis_email = TRUE
      AND u.is_active = TRUE
      AND u.email_verified = TRUE
      AND TRIM(COALESCE(u.email, '')) <> ''
    ORDER BY LOWER(TRIM(u.email));
  `;
  const { rows } = await pool.query(query, [teamId]);
  return rows.map((r) => r.email).filter(Boolean);
};

export const updateMemberAnalysisNotificationPrefs = async (
  teamId,
  userId,
  { notify_analysis_email, analysis_prefs_prompted },
) => {
  let n = 1;
  const fields = [];
  const values = [];

  if (notify_analysis_email !== undefined) {
    fields.push(`notify_analysis_email = $${n++}`);
    values.push(Boolean(notify_analysis_email));
  }
  if (analysis_prefs_prompted !== undefined) {
    fields.push(`analysis_prefs_prompted = $${n++}`);
    values.push(Boolean(analysis_prefs_prompted));
  }

  if (fields.length === 0) return null;

  values.push(teamId, userId);
  const query = `
    UPDATE team_members
    SET ${fields.join(", ")}
    WHERE team_id = $${n} AND user_id = $${n + 1}
    RETURNING *;
  `;

  const { rows } = await pool.query(query, values);
  return rows[0] ?? null;
};

// PATCH FUNCTIONS

export const updateTeam = async (teamId, { name, description }) => {
  // Dynamic query generation to handle partial updates
  const fields = [];
  const values = [];
  let idx = 1;

  if (name) {
    fields.push(`name = $${idx++}`);
    values.push(name);
  }
  if (description !== undefined) {
    // Allows clearing description if empty string passed
    fields.push(`description = $${idx++}`);
    values.push(description);
  }

  if (fields.length === 0) return null;

  values.push(teamId);
  const query = `
    UPDATE teams 
    SET ${fields.join(", ")}
    WHERE team_id = $${idx}
    RETURNING *;
  `;

  try {
    const { rows } = await pool.query(query, values);
    return rows[0];
  } catch (error) {
    console.error("Error updating team:", error);
    return null;
  }
};

export const updateTeamStatus = async (teamId, status) => {
  const query = `
    UPDATE teams SET status = $1
    WHERE team_id = $2
    RETURNING *;
  `;
  try {
    const { rows } = await pool.query(query, [status, teamId]);
    return rows[0];
  } catch (error) {
    return null;
  }
};

export const activateTeamMember = async (memberId) => {
  const query = `
    UPDATE team_members SET is_active = TRUE
    WHERE team_member_id = $1
    RETURNING *;
  `;

  try {
    const { rows } = await pool.query(query, [memberId]);
    return rows[0];
  } catch (error) {
    console.log(error);
    return null;
  }
};

export const reactivateTeamMemberAsMember = async (memberId) => {
  const query = `
    UPDATE team_members
    SET is_active = TRUE,
        role = 'member'
    WHERE team_member_id = $1
    RETURNING *;
  `;

  try {
    const { rows } = await pool.query(query, [memberId]);
    return rows[0];
  } catch (error) {
    console.log(error);
    return null;
  }
};

export const changeMemberRole = async (memberId, newRole) => {
  const query = `
      UPDATE team_members SET role = $1
      WHERE team_member_id = $2
      RETURNING *;
    `;

  try {
    const { rows } = await pool.query(query, [newRole, memberId]);
    return rows[0];
  } catch (error) {
    console.log(error);
    return null;
  }
};

// DELETE FUNCTIONS
export const deleteTeam = async (teamId) => {
  const query = `
    DELETE FROM teams
    WHERE team_id = $1
    RETURNING *;
  `;

  try {
    const { rows } = await pool.query(query, [teamId]);
    return rows[0];
  } catch (error) {
    console.error("deleteTeam failed:", error);
    return null;
  }
};

export const deactivateTeamMember = async (memberId) => {
  const query = `
    UPDATE team_members SET is_active = FALSE
    WHERE team_member_id = $1
    RETURNING *;
  `;

  try {
    const { rows } = await pool.query(query, [memberId]);
    return rows[0];
  } catch (error) {
    console.log(error);
    return null;
  }
};

// ─── Invitations ───────────────────────────────────────────────────────────────

export const findPendingInvitationByTeamAndEmail = async (teamId, normalizedEmail) => {
  const query = `
    SELECT *
    FROM team_invitations
    WHERE team_id = $1
      AND LOWER(TRIM(invited_email)) = LOWER(TRIM($2::text))
      AND status = 'pending'
      AND is_global_link = FALSE
    LIMIT 1;
  `;
  const { rows } = await pool.query(query, [teamId, normalizedEmail]);
  return rows[0] || null;
};

export const findPendingGlobalInvitationByTeamId = async (teamId) => {
  const query = `
    SELECT *
    FROM team_invitations
    WHERE team_id = $1
      AND status = 'pending'
      AND is_global_link = TRUE
    LIMIT 1;
  `;
  const { rows } = await pool.query(query, [teamId]);
  return rows[0] || null;
};

export const createTeamInvitation = async ({
  teamId,
  invitedUserId,
  invitedEmail,
  invitedBy,
  token,
  expiresAt,
  isGlobalLink = false,
}) => {
  const query = `
    INSERT INTO team_invitations (
      team_id,
      invited_user_id,
      invited_email,
      invited_by,
      token,
      status,
      expires_at,
      is_global_link
    )
    VALUES ($1,$2,$3,$4,$5,'pending',$6,$7)
    RETURNING *;
  `;
  const { rows } = await pool.query(query, [
    teamId,
    invitedUserId,
    invitedEmail,
    invitedBy,
    token,
    expiresAt,
    isGlobalLink,
  ]);
  return rows[0] || null;
};

export const setInvitationEmailsSent = async (invitationId, count) => {
  const query = `
    UPDATE team_invitations
    SET invite_emails_sent = $2
    WHERE invitation_id = $1
      AND status = 'pending'
    RETURNING *;
  `;
  const { rows } = await pool.query(query, [invitationId, count]);
  return rows[0] || null;
};

export const getInvitationByToken = async (token) => {
  const query = `
    SELECT *
    FROM team_invitations
    WHERE token = $1;
  `;
  const { rows } = await pool.query(query, [token]);
  return rows[0] || null;
};

export const getInvitationById = async (invitationId) => {
  const query = `
    SELECT *
    FROM team_invitations
    WHERE invitation_id = $1;
  `;
  const { rows } = await pool.query(query, [invitationId]);
  return rows[0] || null;
};

export const markInvitationAccepted = async (invitationId) => {
  const query = `
    UPDATE team_invitations
    SET status = 'accepted',
        responded_at = NOW()
    WHERE invitation_id = $1
      AND status = 'pending'
    RETURNING *;
  `;
  const { rows } = await pool.query(query, [invitationId]);
  return rows[0] || null;
};

export const listPendingInvitationsForUser = async (
  userId,
  userEmail,
  limit = 20,
) => {
  const query = `
    SELECT
      i.invitation_id,
      i.team_id,
      i.invited_email,
      i.invited_by,
      i.status,
      i.created_at,
      i.expires_at,
      t.name AS team_name,
      t.description AS team_description,
      u.email AS invited_by_email,
      u.first_name AS invited_by_first_name,
      u.last_name AS invited_by_last_name
    FROM team_invitations i
    INNER JOIN teams t ON t.team_id = i.team_id
    LEFT JOIN users u ON u.user_id = i.invited_by
    WHERE i.status = 'pending'
      AND i.is_global_link = FALSE
      AND (i.expires_at IS NULL OR i.expires_at > NOW())
      AND (
        i.invited_user_id = $1
        OR (
          i.invited_user_id IS NULL
          AND LOWER(TRIM(i.invited_email)) = LOWER(TRIM($2::text))
        )
      )
    ORDER BY i.created_at DESC
    LIMIT $3;
  `;
  const { rows } = await pool.query(query, [userId, userEmail, limit]);
  return rows;
};

export const markInvitationDeclined = async (invitationId, userId, userEmail) => {
  const email = String(userEmail || "").trim().toLowerCase();
  const query = `
    UPDATE team_invitations
    SET status = 'declined',
        responded_at = NOW()
    WHERE invitation_id = $1
      AND status = 'pending'
      AND (
        invited_user_id = $2
        OR (
          invited_user_id IS NULL
          AND LOWER(TRIM(invited_email)) = $3
        )
      )
    RETURNING *;
  `;
  const { rows } = await pool.query(query, [invitationId, userId, email]);
  return rows[0] || null;
};

export const cancelPendingInvitationsForUserAndTeam = async (
  teamId,
  userId,
  userEmail,
) => {
  const email = String(userEmail || "").trim().toLowerCase();
  const query = `
    UPDATE team_invitations
    SET status = 'cancelled',
        responded_at = NOW()
    WHERE team_id = $1
      AND status = 'pending'
      AND (
        invited_user_id = $2
        OR (
          invited_user_id IS NULL
          AND LOWER(TRIM(invited_email)) = $3
        )
      )
    RETURNING invitation_id;
  `;
  const { rows } = await pool.query(query, [teamId, userId, email]);
  return rows;
};
