// Netlify Function: передаёт заявку в Make, не раскрывая секретный URL в HTML.
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };
  const webhook = process.env.MAKE_WEBHOOK_URL;
  if (!webhook) return { statusCode: 503, body: 'Webhook is not configured' };
  let data;
  try { data = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, body: 'Invalid JSON' }; }
  // Базовая защита от случайных/спам-запросов. Публичный endpoint не является аутентифицированным.
  if (data['bot-field']) return { statusCode: 200, body: 'OK' };
  const name = String(data.name || '').trim().slice(0, 80);
  const phone = String(data.phone || '').trim().slice(0, 22);
  if (!name || !phone || data['form-name'] !== 'appointment')
    return { statusCode: 400, body: 'Invalid submission' };
  const payload = {
    form: 'appointment', name, phone,
    car: String(data.car || '').slice(0, 80),
    date: String(data.date || '').slice(0, 30),
    service: String(data.service || '').slice(0, 100),
    comment: String(data.comment || '').slice(0, 500)
  };
  try {
    const response = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) return { statusCode: 502, body: 'Notification failed' };
    return { statusCode: 200, body: 'OK' };
  } catch {
    return { statusCode: 502, body: 'Notification failed' };
  }
};
