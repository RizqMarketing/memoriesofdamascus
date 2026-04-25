/**
 * Mollie create-payment Function
 *
 * Wordt aangeroepen door frontend met een offerteverzoek-id.
 * - Haalt rij op uit Supabase (via service_role)
 * - Maakt Mollie payment aan
 * - Slaat payment_id + payment_url + status='open' terug op de rij
 * - Geeft de checkout URL terug
 *
 * Vereiste Netlify env vars:
 *   - MOLLIE_API_KEY              (live_... of test_...)
 *   - SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY   (NOOIT in client; alleen hier server-side)
 *   - SITE_URL                    (bv. https://memoriesofdamascus.nl — voor redirect na betaling)
 */

const SITE_NAAM = {
  mod: 'Memories of Damascus',
  morgenland: 'Morgenland',
  kookworkshops: 'Morgenland Kookt'
};

async function fetchOfferte(id) {
  const r = await fetch(`${process.env.SUPABASE_URL}/rest/v1/offerteverzoeken?id=eq.${encodeURIComponent(id)}&select=*`, {
    headers: {
      'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
    }
  });
  if (!r.ok) throw new Error(`Supabase fetch ${r.status}`);
  const rows = await r.json();
  return rows[0];
}

async function patchOfferte(id, patch) {
  const r = await fetch(`${process.env.SUPABASE_URL}/rest/v1/offerteverzoeken?id=eq.${encodeURIComponent(id)}`, {
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

async function createMolliePayment({ amount, description, offerteId, siteUrl }) {
  const r = await fetch('https://api.mollie.com/v2/payments', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.MOLLIE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      amount: { currency: 'EUR', value: Number(amount).toFixed(2) },
      description,
      redirectUrl: `${siteUrl}/payment-result.html?id=${offerteId}`,
      webhookUrl: `${siteUrl}/.netlify/functions/mollie-webhook`,
      metadata: { offerte_id: offerteId }
    })
  });
  if (!r.ok) {
    const body = await r.text();
    throw new Error(`Mollie ${r.status}: ${body}`);
  }
  return r.json();
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  if (!process.env.MOLLIE_API_KEY || !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Missing env vars' }) };
  }

  let body;
  try { body = JSON.parse(event.body); } catch (_) {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const offerteId = body.offerte_id;
  if (!offerteId) return { statusCode: 400, body: 'Missing offerte_id' };

  try {
    const offerte = await fetchOfferte(offerteId);
    if (!offerte) return { statusCode: 404, body: 'Offerte niet gevonden' };
    if (!offerte.totaal_bedrag || Number(offerte.totaal_bedrag) <= 0) {
      return { statusCode: 400, body: 'Geen bedrag op offerte' };
    }

    const merk = SITE_NAAM[offerte.site] || 'Catering';
    const beschrijving = `${merk} — aanvraag ${offerteId.slice(0, 8)}`;
    const siteUrl = process.env.SITE_URL || 'https://memoriesofdamascus.netlify.app';

    const payment = await createMolliePayment({
      amount: offerte.totaal_bedrag,
      description: beschrijving,
      offerteId,
      siteUrl
    });

    await patchOfferte(offerteId, {
      mollie_payment_id: payment.id,
      payment_status: payment.status, // 'open' bij creatie
      payment_url: payment._links.checkout.href
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checkoutUrl: payment._links.checkout.href, paymentId: payment.id })
    };
  } catch (e) {
    console.error('mollie-create-payment', e);
    return { statusCode: 500, body: JSON.stringify({ error: String(e.message || e) }) };
  }
};
