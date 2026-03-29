import pg from "pg";

const { Pool } = pg;

function shouldUseSsl() {
  // RDS commonly enforces SSL (pg_hba.conf "no encryption" errors otherwise).
  // Prefer explicit PGSSL=true, but default to SSL in production.
  const flag = String(process.env.PGSSL || "").trim().toLowerCase();
  if (flag === "true" || flag === "1" || flag === "yes") return true;
  if (flag === "false" || flag === "0" || flag === "no") return false;
  return String(process.env.NODE_ENV || "").toLowerCase() === "production";
}

export const pool = new Pool({
  ssl: shouldUseSsl()
    ? {
        // For a simple EC2 deployment, this avoids needing to bundle the RDS CA.
        // If you want strict verification, mount/provide the RDS CA and set this to true.
        rejectUnauthorized: false,
      }
    : undefined,
});
