const WEBHOOK_URL = 'https://outbound.reply.cx/api/v1/outbound/6M7bW3f8CngH072703062137xJI2dDEN/campaign/7TmqtiFu945G091707094178RXBtDQn1';
const REPLYCX_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2NvdW50X2lkIjo1MX0.O4gAw2o9ABNdUfredMhsbV5I-zPiuV0-1buqWOdgs9s';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const testPayload = {
      phone: '919999999999',
      name: 'Test Employee',
      activity: 'meditation',
      date: new Date().toISOString().split('T')[0]
    };

    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${REPLYCX_API_KEY}`
      },
      body: JSON.stringify(testPayload)
    });

    const responseText = await response.text();

    return res.status(200).json({
      status: response.status,
      ok: response.ok,
      message: response.ok ? 'Webhook reachable and working!' : `HTTP ${response.status}`,
      response: responseText
    });
  } catch (err) {
    return res.status(200).json({ ok: false, error: err.message });
  }
}
