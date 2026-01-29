import { pool } from "#config";

const allowedFields = [
  "firstName",
  "lastName",
  "email",
  "password",
  "phone",
  "countryCode",
];

export async function createUser(user) {
  // Whitelist fields
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
}

export async function findUser(email) {
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
}
