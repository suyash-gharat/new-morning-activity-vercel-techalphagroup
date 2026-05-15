import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const raw = await kv.get('schedule');
    const schedule = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : [];
    const updatedAt = await kv.get('schedule_updated_at');
    return res.status(200).json({ schedule, updatedAt });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
