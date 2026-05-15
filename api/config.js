import { kvGet, kvSet } from './db.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const config = await kvGet('config') || {};
      return res.status(200).json(config);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { webhookUrl, sendTime, timezone, template, senderName } = req.body;
      if (!webhookUrl) return res.status(400).json({ error: 'webhookUrl is required' });
      const config = { webhookUrl, sendTime, timezone, template, senderName };
      await kvSet('config', config);
      return res.status(200).json({ message: 'Config saved' });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
