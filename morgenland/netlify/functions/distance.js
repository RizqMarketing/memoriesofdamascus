// Google Distance Matrix proxy — Morgenland (Rotterdam only)
// Query: /.netlify/functions/distance?pc=3011AB
// Returns: { ok, km, city }

const ORIGIN = 'Librijesteeg 4, 3011 EB Rotterdam, Netherlands';

exports.handler = async (event) => {
  const pc = (event.queryStringParameters?.pc || '').replace(/\s/g, '').toUpperCase();
  if (!/^\d{4}[A-Z]{0,2}$/.test(pc)) {
    return json(400, { ok: false, error: 'invalid_postcode' });
  }

  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return json(500, { ok: false, error: 'missing_api_key' });

  const dest = encodeURIComponent(pc + ', Netherlands');
  const origin = encodeURIComponent(ORIGIN);
  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin}&destinations=${dest}&mode=driving&language=nl&region=nl&units=metric&key=${key}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.status !== 'OK') return json(502, { ok: false, error: 'api_' + data.status });

    const el = data.rows?.[0]?.elements?.[0];
    if (el?.status !== 'OK') return json(404, { ok: false, error: 'no_route' });

    const km = Math.round(el.distance.value / 1000);
    const city = (data.destination_addresses?.[0] || '').split(',')[0] || pc;

    return json(200, { ok: true, km, city }, { 'Cache-Control': 'public, max-age=86400' });
  } catch (err) {
    return json(500, { ok: false, error: 'fetch_failed' });
  }
};

function json(status, body, extraHeaders = {}) {
  return {
    statusCode: status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      ...extraHeaders
    },
    body: JSON.stringify(body)
  };
}
