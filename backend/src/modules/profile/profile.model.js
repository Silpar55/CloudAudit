import { pool } from "#config";

// GET FUNCTION
export const getProfileById = async (userId) => {
  const query = `
    SELECT 
        user_id, 
        email, 
        first_name, 
        last_name, 
        phone,
        country_code,
        created_at
    FROM users
    WHERE user_id = $1;
  `;

  try {
    const { rows } = await pool.query(query, [userId]);
    return rows[0] || null;
  } catch (error) {
    console.error("Error fetching profile:", error);
    return null;
  }
};

// PATCH FUNCTION
export const updateProfile = async (
  userId,
  { first_name, last_name, phone, country_code },
) => {
  // Dynamic query generation to handle partial updates
  const fields = [];
  const values = [];
  let idx = 1;

  if (first_name !== undefined) {
    fields.push(`first_name = $${idx++}`);
    values.push(first_name);
  }
  if (last_name !== undefined) {
    fields.push(`last_name = $${idx++}`);
    values.push(last_name);
  }
  if (phone !== undefined) {
    fields.push(`phone = $${idx++}`);
    values.push(phone);
  }
  if (country_code !== undefined) {
    fields.push(`country_code = $${idx++}`);
    values.push(country_code);
  }

  if (fields.length === 0) return null;

  values.push(userId);
  const query = `
    UPDATE users 
    SET ${fields.join(", ")}
    WHERE user_id = $${idx}
    RETURNING user_id, email, first_name, last_name, phone, country_code;
  `;

  try {
    const { rows } = await pool.query(query, values);
    return rows[0];
  } catch (error) {
    console.error("Error updating profile:", error);
    return null;
  }
};

export const setPendingEmail = async (userId, newEmail, token, expiresAt) => {
  const query = `
    UPDATE users
    SET pending_email = $1, verification_token = $2, verification_expires_at = $3
    WHERE id = $4
    RETURNING id, pending_email;
  `;
  const values = [newEmail, token, expiresAt, userId];
  const { rows } = await pool.query(query, values);
  return rows[0];
};

export const getUserByVerificationToken = async (token) => {
  const query = `
    SELECT id, pending_email, verification_expires_at 
    FROM users 
    WHERE verification_token = $1
  `;
  const { rows } = await pool.query(query, [token]);
  return rows[0];
};

export const confirmEmailChange = async (userId, newEmail) => {
  const query = `
    UPDATE users
    SET email = $1, 
        email_verified = true, 
        pending_email = NULL, 
        verification_token = NULL, 
        verification_expires_at = NULL
    WHERE id = $2
    RETURNING id, email, first_name, last_name;
  `;
  const { rows } = await pool.query(query, [newEmail, userId]);
  return rows[0];
};
