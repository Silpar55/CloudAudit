import pg from "pg";

export default async function connect() {
  const { Pool } = pg;
  const pool = new Pool();

  return pool;
}
