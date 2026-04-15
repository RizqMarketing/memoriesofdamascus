// Google Distance Matrix proxy — keeps API key server-side.
// Query: /.netlify/functions/distance?pc=3011AB
// Returns: { ok, kmBest, kmRotterdam, city }

const ORIGINS = {
  best: 'De Run 21, 5481 AA Best, Netherlands',
  rotterdam: 'Librijesteeg 4, 3011 HR Rotterdam, Netherlands'
};

exports.handler = async (event) => {
  const pc = (event.queryStringParameters?.pc || '').replace(/\s/g, '').toUpperCase();
  if (!/^\d{4}[A-Z]{0,2}$/.test(pc)) {
    return json(400, { ok: false, error: 'invalid_postcode' });
  }

  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return json(500, { ok: false, error: 'missing_api_key' });

  const dest = encodeURIComponent(pc + ', Netherlands');
  const origins = encodeURIComponent(`${ORIGINS.best}|${ORIGINS.rotterdam}`);
  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origins}&destinations=${dest}&mode=driving&language=nl&region=nl&units=metric&key=${key}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.status !== 'OK') return json(502, { ok: false, error: 'api_' + data.status });

    const rows = data.rows;
    const eBest = rows[0]?.elements?.[0];
    const eRot = rows[1]?.elements?.[0];
    if (eBest?.status !== 'OK' || eRot?.status !== 'OK') {
      return json(404, { ok: false, error: 'no_route' });
    }

    const kmBest = Math.round(eBest.distance.value / 1000);
    const kmRotterdam = Math.round(eRot.distance.value / 1000);
    const city = (data.destination_addresses?.[0] || '').split(',')[0] || pc;

    return json(200, {
      ok: true,
      kmBest,
      kmRotterdam,
      city,
      cached: false
    }, { 'Cache-Control': 'public, max-age=86400' });
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
