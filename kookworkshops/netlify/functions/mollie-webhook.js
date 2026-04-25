/**
 * Mollie webhook Function
 *
 * Mollie POST'ed hierheen elke keer dat een payment-status verandert.
 * Body: { id: 'tr_xxx' } — niet de hele payment, alleen het ID.
 * We moeten zelf de status opvragen bij Mollie API en daarna Supabase updaten.
 *
 * Vereiste Netlify env vars:
 *   - MOLLIE_API_KEY
 *   - SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 */

async function fetchMolliePayment(id) {
  const r = await fetch(`https://api.mollie.com/v2/payments/${encodeURIComponent(id)}`, {
    headers: { 'Authorization': `Bearer ${process.env.MOLLIE_API_KEY}` }
  });
  if (!r.ok) throw new Error(`Mollie ${r.status}: ${await r.text()}`);
  return r.json();
}

async function patchOfferteByMollieId(mollieId, patch) {
  const url = `${process.env.SUPABASE_URL}/rest/v1/offerteverzoeken?mollie_payment_id=eq.${encodeURIComponent(mollieId)}`;
  const r = await fetch(url, {
    method: 'PATCH',
    headers: {
      'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify(patch)
  });
  if (!r.ok) throw new Error(`Supabase patch ${r.status}: ${await r.text()}`);
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  // Mollie verstuurt application/x-www-form-urlencoded met "id=tr_xxx"
  const params = new URLSearchParams(event.body || '');
  const id = params.get('id') || (event.body && JSON.parse(event.body).id);
  if (!id) return { statusCode: 400, body: 'Missing payment id' };

  try {
    const payment = await fetchMolliePayment(id);
    const patch = {
      payment_status: payment.status
    };
    if (payment.status === 'paid') {
      patch.paid_at = payment.paidAt || new Date().toISOString();
      patch.status = 'bevestigd'; // automatisch op bevestigd zetten als betaald
    }
    await patchOfferteByMollieId(id, patch);

    // Mollie verwacht een 200 OK, anders herhaalt hij de webhook
    return { statusCode: 200, body: 'OK' };
  } catch (e) {
    console.error('mollie-webhook', e);
    // Liever 200 returnen om infinite retries te voorkomen tenzij echt iets stuk
    return { statusCode: 500, body: String(e.message || e) };
  }
};
