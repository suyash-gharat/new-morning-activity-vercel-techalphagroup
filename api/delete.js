import { kvGet, kvSet, initDB } from './db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    await initDB();
    const { action, index } = req.body;

    // Delete entire schedule
    if (action === 'clear') {
      await kvSet('schedule', []);
      await kvSet('schedule_updated_at', new Date().toISOString());
      return res.status(200).json({ message: 'Schedule cleared' });
    }

    // Delete single row by index
    if (action === 'delete' && index !== undefined) {
      const schedule = await kvGet('schedule') || [];
      schedule.splice(index, 1);
      await kvSet('schedule', schedule);
      await kvSet('schedule_updated_at', new Date().toISOString());
      return res.status(200).json({ message: 'Row deleted', count: schedule.length });
    }

    // Update single row
    if (action === 'update' && index !== undefined) {
      const { row } = req.body;
      const schedule = await kvGet('schedule') || [];
      schedule[index] = row;
      await kvSet('schedule', schedule);
      await kvSet('schedule_updated_at', new Date().toISOString());
      return res.status(200).json({ message: 'Row updated', count: schedule.length });
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
