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

export const getTeamsByUserId = async (userId) => {
  const query = `
      SELECT * FROM team_dashboard_view
      WHERE team_id IN (
        SELECT team_id
        FROM team_members
        WHERE user_id = $1
      )
    `;

  try {
    const { rows } = await pool.query(query, [userId]);
    return rows;
  } catch (error) {
    return null;
  }
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

export const addTeamMember = async (teamId, userId, role) => {
  const query = `
    INSERT INTO team_members (team_id, user_id, role)
    VALUES ($1,$2,$3)
    RETURNING *;
  `;

  try {
    const { rows } = await pool.query(query, [teamId, userId, role]);
    return rows[0];
  } catch (error) {
    return null;
  }
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
