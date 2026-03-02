import { pool } from "#config";

const allowedFields = [
  "firstName",
  "lastName",
  "email",
  "password",
  "phone",
  "countryCode",
  "verificationToken",
  "verificationExpiresAt",
];

export const createUser = async (user) => {
  const safeData = Object.fromEntries(
    Object.entries(user).filter(([key]) => allowedFields.includes(key)),
  );

  const keys = Object.keys(safeData);
  const values = Object.values(safeData);

  const columns = keys
    .map((k) => k.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`)) // camel → snake
    .join(", ");

  const placeholders = keys.map((_, i) => `$${i + 1}`).join(", "); // $1, $2, $3, etc.

  const query = `
    INSERT INTO users (${columns})
    VALUES (${placeholders})
    RETURNING *;
    `;

  try {
    const { rows } = await pool.query(query, values);
    return rows[0];
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const findUser = async (email) => {
  const query = `
    SELECT *
    FROM users
    WHERE email = $1;
    `;

  try {
    const { rows } = await pool.query(query, [email]);
    return rows[0];
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const findUserById = async (userId) => {
  const query = `
    SELECT *
    FROM users
    WHERE user_id = $1;
    `;

  try {
    const { rows } = await pool.query(query, [userId]);
    return rows[0];
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const getUserByVerificationToken = async (token) => {
  const query = `
    SELECT *
    FROM users
    WHERE verification_token = $1;
  `;

  try {
    const { rows } = await pool.query(query, [token]);
    return rows[0];
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const verifyEmailAndClearToken = async (userId, emailToSet) => {
  const query = `
    UPDATE users
    SET email = $1,
        email_verified = true,
        pending_email = NULL,
        verification_used_at = NOW()
    WHERE user_id = $2
    RETURNING *;
  `;

  try {
    const { rows } = await pool.query(query, [emailToSet, userId]);
    return rows[0];
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const deactivateUser = async (userId) => {
  try {
    const { rows } = await pool.query(
      `UPDATE users
       SET is_active      = FALSE,
           deactivated_at = NOW(),
           email          = CONCAT('deleted_', EXTRACT(EPOCH FROM NOW())::BIGINT, '_', email)
       WHERE user_id = $1
       RETURNING *`,
      [userId],
    );
    return rows[0];
  } catch (error) {
    console.error("Error deactivating user:", error);
    return null;
  }
};

export const deactivateUserTeamMemberships = async (userId) => {
  try {
    const { rows } = await pool.query(
      `UPDATE team_members
       SET is_active = FALSE
       WHERE user_id = $1
       RETURNING *`,
      [userId],
    );
    return rows;
  } catch {
    return null;
  }
};

export const updateUserPassword = async (userId, hashedPassword) => {
  try {
    const { rows } = await pool.query(
      `UPDATE users
       SET password = $1
       WHERE user_id = $2
       RETURNING user_id, email`,
      [hashedPassword, userId],
    );
    return rows[0];
  } catch {
    return null;
  }
};

export const setPasswordResetToken = async (userId, token, expiresAt) => {
  try {
    const { rows } = await pool.query(
      `UPDATE users
       SET verification_token      = $1,
           verification_expires_at = $2,
           verification_used_at    = NULL
       WHERE user_id = $3
       RETURNING user_id, email`,
      [token, expiresAt, userId],
    );
    return rows[0];
  } catch {
    return null;
  }
};

export const resetPasswordAndClearToken = async (userId, hashedPassword) => {
  try {
    const { rows } = await pool.query(
      `UPDATE users
       SET password                = $1,
           verification_token      = NULL,
           verification_expires_at = NULL,
           verification_used_at    = NOW()
       WHERE user_id = $2
       RETURNING user_id, email`,
      [hashedPassword, userId],
    );
    return rows[0];
  } catch {
    return null;
  }
};
