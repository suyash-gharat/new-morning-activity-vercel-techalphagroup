async function neonQuery(sql, params = []) {
  const connString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  
  const url = new URL(connString);
  const user = decodeURIComponent(url.username);
  const password = decodeURIComponent(url.password);
  const host = url.hostname;
  
  const httpUrl = `https://${host}/sql`;
  
  const response = await fetch(httpUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${Buffer.from(`${user}:${password}`).toString('base64')}`,
      'Neon-Connection-String': connString
    },
    body: JSON.stringify({ query: sql, params })
  });
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`DB error: ${text}`);
  }
  
  return response.json();
}

export async function initDB() {
  await neonQuery(`
    CREATE TABLE IF NOT EXISTS kv_store (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
}

export async function kvGet(key) {
  await initDB();
  const res = await neonQuery('SELECT value FROM kv_store WHERE key = $1', [key]);
  if (!res.rows || res.rows.length === 0) return null;
  try { return JSON.parse(res.rows[0].value); } catch { return res.rows[0].value; }
}

export async function kvSet(key, value) {
  await initDB();
  const val = typeof value === 'string' ? value : JSON.stringify(value);
  await neonQuery(`
    INSERT INTO kv_store (key, value, updated_at)
    VALUES ($1, $2, NOW())
    ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()
  `, [key, val]);
}
