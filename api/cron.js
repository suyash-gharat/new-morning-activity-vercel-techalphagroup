import { kvGet, kvSet, initDB } from './db.js';

const WEBHOOK_URL = 'https://outbound.reply.cx/api/v1/outbound/6M7bW3f8CngH072703062137xJI2dDEN/campaign/7TmqtiFu945G091707094178RXBtDQn1';
const REPLYCX_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2NvdW50X2lkIjo1MX0.O4gAw2o9ABNdUfredMhsbV5I-zPiuV0-1buqWOdgs9s';

export default async function handler(req, res) {
  // Verify this is called from Vercel Cron
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('[cron] Daily trigger fired at', new Date().toISOString());

  try {
    await initDB();
    const schedule = await kvGet('schedule');

    if (!schedule || !schedule.length) {
      console.log('[cron] No schedule found, skipping.');
      return res.status(200).json({ message: 'No schedule uploaded yet' });
    }

    const tz = 'Asia/Kolkata';
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(new Date());

    const todayEntries = schedule.filter(row => row.date === today);
    console.log(`[cron] Found ${todayEntries.length} entries for ${today}`);

    if (!todayEntries.length) {
      return res.status(200).json({ sent: 0, date: today, message: 'No activities today' });
    }

    const template = 'Good morning {name}! 🌅 Your activity today is *{activity}*. See you at the Morning Session! 💪';
    let sent = 0, failed = 0;
    const results = [];

    for (const entry of todayEntries) {
      const message = template
        .replace(/{name}/g, entry.name)
        .replace(/{activity}/g, entry.activity.charAt(0).toUpperCase() + entry.activity.slice(1))
        .replace(/{date}/g, entry.date)
        .replace(/{phone}/g, entry.phone);

      // ReplyCX expects array
      const payload = [{ phone: entry.phone, name: entry.name, activity: entry.activity }];

      try {
        const response = await fetch(WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${REPLYCX_API_KEY}`
          },
          body: JSON.stringify(payload)
        });
        const responseText = await response.text();
        const ok = response.ok;
        results.push({ name: entry.name, phone: entry.phone, status: ok ? 'sent' : 'failed', response: responseText });
        if (ok) sent++; else failed++;
        console.log(`[cron] ${entry.name} → ${ok ? '✓ sent' : '✗ failed'} (${response.status}) ${responseText}`);
        await new Promise(r => setTimeout(r, 300));
      } catch (err) {
        results.push({ name: entry.name, phone: entry.phone, status: 'error', error: err.message });
        failed++;
        console.error(`[cron] Error for ${entry.name}:`, err.message);
      }
    }

    await kvSet(`log:${today}`, {
      date: today, sent, failed, results,
      triggeredAt: new Date().toISOString(), source: 'cron'
    });

    console.log(`[cron] Done — sent: ${sent}, failed: ${failed}`);
    return res.status(200).json({ sent, failed, date: today, results });

  } catch (err) {
    console.error('[cron] Fatal:', err);
    return res.status(500).json({ error: err.message });
  }
}
