import { neon } from '@neondatabase/serverless';

function getSQL() {
  const connString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  return neon(connString);
}

export async function initDB() {
  const sql = getSQL();
  await sql`
    CREATE TABLE IF NOT EXISTS kv_store (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;
}

export async function kvGet(key) {
  await initDB();
  const sql = getSQL();
  const rows = await sql`SELECT value FROM kv_store WHERE key = ${key}`;
  if (!rows || rows.length === 0) return null;
  try { return JSON.parse(rows[0].value); } catch { return rows[0].value; }
}

export async function kvSet(key, value) {
  await initDB();
  const sql = getSQL();
  const val = typeof value === 'string' ? value : JSON.stringify(value);
  await sql`
    INSERT INTO kv_store (key, value, updated_at)
    VALUES (${key}, ${val}, NOW())
    ON CONFLICT (key) DO UPDATE SET value = ${val}, updated_at = NOW()
  `;
}
