import { kv } from '@vercel/kv';

const DEFAULT_CONFIG = {
  webhookUrl: 'https://outbound.reply.cx/api/v1/outbound/6M7bW3f8CngH072703062137xJI2dDEN/campaign/7TmqtiFu945G091707094178RXBtDQn1',
  apiKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2NvdW50X2lkIjo1MX0.O4gAw2o9ABNdUfredMhsbV5I-zPiuV0-1buqWOdgs9s',
  sendTime: '08:00',
  timezone: 'Asia/Kolkata',
  senderName: 'Morning Activity Bot'
};

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const raw = await kv.get('config');
      const saved = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : {};
      const config = { ...DEFAULT_CONFIG, ...saved };
      return res.status(200).json(config);
    } catch (err) {
      return res.status(200).json(DEFAULT_CONFIG);
    }
  }

  if (req.method === 'POST') {
    try {
      const config = {
        webhookUrl: DEFAULT_CONFIG.webhookUrl,
        apiKey: DEFAULT_CONFIG.apiKey,
        sendTime: req.body.sendTime || DEFAULT_CONFIG.sendTime,
        timezone: req.body.timezone || DEFAULT_CONFIG.timezone,
        senderName: req.body.senderName || DEFAULT_CONFIG.senderName
      };
      await kv.set('config', JSON.stringify(config));
      return res.status(200).json({ message: 'Config saved' });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
