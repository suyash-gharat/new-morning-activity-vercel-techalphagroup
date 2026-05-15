export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { webhookUrl } = req.body;
  if (!webhookUrl) return res.status(400).json({ error: 'webhookUrl required' });

  try {
    const testPayload = {
      phone: '919999999999',
      name: 'Test Employee',
      activity: 'meditation',
      date: new Date().toISOString().split('T')[0],
      message: 'Good morning Test Employee! 🌅 Your activity today is *Meditation*. See you at the Morning Session! 💪',
      test: true
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload)
    });

    return res.status(200).json({
      status: response.status,
      ok: response.ok,
      message: response.ok ? 'Webhook reachable' : `HTTP ${response.status}`
    });
  } catch (err) {
    return res.status(200).json({ ok: false, error: err.message });
  }
}
