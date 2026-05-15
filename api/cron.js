import { kvGet, kvSet } from './db.js';

export default async function handler(req, res) {
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const [schedule, config] = await Promise.all([
      kvGet('schedule'),
      kvGet('config')
    ]);

    if (!schedule) return res.status(200).json({ message: 'No schedule uploaded yet' });

    const webhookUrl = config?.webhookUrl;
    if (!webhookUrl) return res.status(200).json({ message: 'Webhook URL not configured' });

    const tz = config.timezone || 'Asia/Kolkata';
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(new Date());

    const todayEntries = schedule.filter(row => row.date === today);
    if (!todayEntries.length) {
      return res.status(200).json({ sent: 0, date: today, message: 'No activities today' });
    }

    const template = config.template ||
      'Good morning {name}! 🌅 Your activity today is *{activity}*. See you at the Morning Session! 💪';

    let sent = 0, failed = 0;
    const results = [];

    for (const entry of todayEntries) {
      const message = template
        .replace(/{name}/g, entry.name)
        .replace(/{activity}/g, entry.activity.charAt(0).toUpperCase() + entry.activity.slice(1))
        .replace(/{date}/g, entry.date)
        .replace(/{phone}/g, entry.phone);

      const payload = { phone: entry.phone, name: entry.name, activity: entry.activity, date: entry.date, message };

      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.REPLYCX_API_KEY}`
          },
          body: JSON.stringify(payload)
        });
        const ok = response.ok;
        results.push({ name: entry.name, phone: entry.phone, status: ok ? 'sent' : 'failed' });
        if (ok) sent++; else failed++;
        await new Promise(r => setTimeout(r, 300));
      } catch (err) {
        results.push({ name: entry.name, phone: entry.phone, status: 'error', error: err.message });
        failed++;
      }
    }

    await kvSet(`log:${today}`, { date: today, sent, failed, results, triggeredAt: new Date().toISOString(), source: 'cron' });
    return res.status(200).json({ sent, failed, date: today, results });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
