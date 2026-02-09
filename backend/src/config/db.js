import { pool } from "./pool.js";

export async function verifyDatabaseConnection({
  retries = 10,
  delay = 2000,
} = {}) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await pool.query("SELECT 1");
      console.log("Database connected");
      return;
    } catch (err) {
      console.error(
        `Database connection failed (attempt ${attempt}/${retries})`,
      );

      if (attempt === retries) {
        console.error("Database unreachable. Exiting.");
        throw err;
      }

      await new Promise((res) => setTimeout(res, delay));
    }
  }
}
