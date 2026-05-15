import { kvGet } from './db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const schedule = await kvGet('schedule') || [];
    const updatedAt = await kvGet('schedule_updated_at');
    return res.status(200).json({ schedule, updatedAt });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
