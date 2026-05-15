import { kvSet } from './db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { schedule } = req.body;
    if (!schedule || !Array.isArray(schedule)) {
      return res.status(400).json({ error: 'Invalid schedule data' });
    }

    const valid = schedule.filter(row =>
      row.date && row.phone && row.name && row.activity &&
      /^\d{4}-\d{2}-\d{2}$/.test(row.date) &&
      /^\d{10,15}$/.test(row.phone)
    );

    if (!valid.length) {
      return res.status(400).json({ error: 'No valid rows found in schedule' });
    }

    await kvSet('schedule', valid);
    await kvSet('schedule_updated_at', new Date().toISOString());

    return res.status(200).json({ count: valid.length, message: 'Schedule saved successfully' });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
