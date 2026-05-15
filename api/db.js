import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export async function query(text, params) {
  const client = await pool.connect();
  try {
    const res = await client.query(text, params);
    return res;
  } finally {
    client.release();
  }
}

export async function initDB() {
  await query(`
    CREATE TABLE IF NOT EXISTS kv_store (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
}

export async function kvGet(key) {
  await initDB();
  const res = await query('SELECT value FROM kv_store WHERE key = $1', [key]);
  if (res.rows.length === 0) return null;
  try { return JSON.parse(res.rows[0].value); } catch { return res.rows[0].value; }
}

export async function kvSet(key, value) {
  await initDB();
  const val = typeof value === 'string' ? value : JSON.stringify(value);
  await query(`
    INSERT INTO kv_store (key, value, updated_at)
    VALUES ($1, $2, NOW())
    ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()
  `, [key, val]);
}
