import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const [scheduleRaw, configRaw] = await Promise.all([
      kv.get('schedule'),
      kv.get('config')
    ]);

    if (!scheduleRaw) {
      return res.status(400).json({ error: 'No schedule found. Upload a CSV first.' });
    }

    const schedule = typeof scheduleRaw === 'string' ? JSON.parse(scheduleRaw) : scheduleRaw;
    const config = configRaw
      ? (typeof configRaw === 'string' ? JSON.parse(configRaw) : configRaw)
      : {};

    const webhookUrl = config.webhookUrl;
    if (!webhookUrl) {
      return res.status(400).json({ error: 'Webhook URL not configured. Go to Configuration tab.' });
    }

    const tz = config.timezone || 'Asia/Kolkata';
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(new Date());

    const todayEntries = schedule.filter(row => row.date === today);

    if (!todayEntries.length) {
      return res.status(200).json({ sent: 0, skipped: 0, date: today, message: 'No activities today' });
    }

    const template = config.template ||
      'Good morning {name}! Your activity today is *{activity}*. See you at the Morning Session!';

    const results = [];
    let sent = 0, failed = 0;

    for (const entry of todayEntries) {
      const message = template
        .replace(/{name}/g, entry.name)
        .replace(/{activity}/g, entry.activity.charAt(0).toUpperCase() + entry.activity.slice(1))
        .replace(/{date}/g, entry.date)
        .replace(/{phone}/g, entry.phone);

      const payload = {
        phone: entry.phone,
        name: entry.name,
        activity: entry.activity,
        date: entry.date,
        message: message
      };

      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'MorningActivityScheduler/1.0'
          },
          body: JSON.stringify(payload)
        });

        const ok = response.ok;
        results.push({ phone: entry.phone, name: entry.name, status: ok ? 'sent' : 'failed', httpStatus: response.status });
        if (ok) sent++; else failed++;

        await new Promise(r => setTimeout(r, 200));

      } catch (err) {
        results.push({ phone: entry.phone, name: entry.name, status: 'error', error: err.message });
        failed++;
      }
    }

    const logKey = `log:${today}`;
    await kv.set(logKey, JSON.stringify({ date: today, sent, failed, results, triggeredAt: new Date().toISOString() }));

    return res.status(200).json({ sent, failed, total: todayEntries.length, date: today, results });

  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
