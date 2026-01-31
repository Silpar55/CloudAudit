import { pool } from "#config";

export const createTeam = async (name) => {
  const query = `
        INSERT INTO teams (name)
        VALUES ($1)
        RETURNING *;
    `;

  try {
    const { rows } = await pool.query(query, [name]);
    return rows[0];
  } catch (error) {
    return null;
  }
};

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

export const getTeamMember = async (teamId, userId) => {
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

export const activateTeamMember = async (memberId) => {
  const query = `
    UPDATE team_members
    SET is_active = TRUE
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

export const deactiveTeamMember = async (memberId) => {
  const query = `
    UPDATE team_members
    SET is_active = FALSE
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
