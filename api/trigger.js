import { kvGet, kvSet, initDB } from './db.js';

const WEBHOOK_URL = 'https://outbound.reply.cx/api/v1/outbound/6M7bW3f8CngH072703062137xJI2dDEN/campaign/7TmqtiFu945G091707094178RXBtDQn1';
const REPLYCX_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2NvdW50X2lkIjo1MX0.O4gAw2o9ABNdUfredMhsbV5I-zPiuV0-1buqWOdgs9s';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    await initDB();
    const schedule = await kvGet('schedule');
    if (!schedule) return res.status(400).json({ error: 'No schedule found. Upload a CSV first.' });

    const tz = 'Asia/Kolkata';
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(new Date());

    const todayEntries = schedule.filter(row => row.date === today);
    if (!todayEntries.length) {
      return res.status(200).json({ sent: 0, date: today, message: 'No activities today' });
    }

    const results = [];
    let sent = 0, failed = 0;

    for (const entry of todayEntries) {
      // ReplyCX expects an array
      const payload = [
        {
          phone: entry.phone,
          name: entry.name,
          activity: entry.activity
        }
      ];

      try {
        const response = await fetch(WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${REPLYCX_API_KEY}`,
            'Accept': 'application/json'
          },
          body: JSON.stringify(payload)
        });
        const responseText = await response.text();
        console.log(`ReplyCX response for ${entry.name}: ${response.status} - ${responseText}`);
        const ok = response.ok;
        results.push({ phone: entry.phone, name: entry.name, status: ok ? 'sent' : 'failed', httpStatus: response.status, response: responseText });
        if (ok) sent++; else failed++;
        await new Promise(r => setTimeout(r, 200));
      } catch (err) {
        results.push({ phone: entry.phone, name: entry.name, status: 'error', error: err.message });
        failed++;
      }
    }

    await kvSet(`log:${today}`, { date: today, sent, failed, results, triggeredAt: new Date().toISOString() });
    return res.status(200).json({ sent, failed, total: todayEntries.length, date: today, results });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
