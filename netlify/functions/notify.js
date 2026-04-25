/**
 * Notify function — getriggerd vanuit form-handlers na succesvolle Supabase insert.
 *
 * Stuurt 2 emails via Resend:
 *  1. Bevestiging naar klant
 *  2. Notificatie naar Anouk (NOTIFY_EMAIL)
 *
 * Vereiste Netlify env vars:
 *   - RESEND_API_KEY     (re_...)
 *   - NOTIFY_EMAIL       (waar Anouk notificaties ontvangt, bv. info@memoriesofdamascus.nl)
 *   - FROM_EMAIL         (afzender, bv. "Memories of Damascus <hello@memoriesofdamascus.nl>")
 *                        — gebruik 'onboarding@resend.dev' tijdens test (Resend's test-afzender)
 *
 * POST body (JSON):
 *   { site, formulier, naam, email, telefoon, bericht, datum, personen,
 *     type_evenement, totaal_bedrag, configurator?, workshop_type? }
 */

const SITE_NAAM = {
  mod: 'Memories of Damascus',
  morgenland: 'Morgenland',
  kookworkshops: 'Morgenland Kookt'
};

const SITE_REPLY_TO = {
  mod: 'bestellen@memoriesofdamascus.nl',
  morgenland: 'info@morgenland.nu',
  kookworkshops: 'info@morgenlandkookt.nl'
};

function fmtBedrag(n) {
  if (n == null || isNaN(parseFloat(n))) return null;
  return '€' + Number(n).toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function fmtDatum(s) {
  if (!s) return null;
  try { return new Date(s).toLocaleDateString('nl-NL', { day: '2-digit', month: 'long', year: 'numeric' }); } catch (_) { return s; }
}

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c]);
}

function buildKlantEmail(p) {
  const merk = SITE_NAAM[p.site] || 'Memories of Damascus';
  const greet = p.naam ? `Beste ${escapeHtml(p.naam.split(' ')[0])}` : 'Hallo';
  return {
    subject: `Bedankt voor uw aanvraag — ${merk}`,
    html: `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:32px;color:#1e0a0a;background:#f5edd6;border:1px solid #c9942a">
        <h1 style="font-size:22px;color:#c9942a;font-style:italic;margin:0 0 16px">${merk}</h1>
        <p style="font-size:15px;line-height:1.6;margin:0 0 14px"><strong>${greet}</strong>,</p>
        <p style="font-size:15px;line-height:1.6;margin:0 0 14px">Bedankt voor uw aanvraag. We hebben uw bericht in goede orde ontvangen en nemen binnen 24 uur persoonlijk contact met u op.</p>
        ${p.bericht ? `<div style="background:#fff;border-left:3px solid #c9942a;padding:12px 16px;margin:16px 0;font-size:14px;line-height:1.5"><em>"${escapeHtml(p.bericht)}"</em></div>` : ''}
        <p style="font-size:14px;line-height:1.6;margin:24px 0 0;color:#5a3a2a">Met vriendelijke groet,<br><strong>Het team van ${merk}</strong></p>
      </div>
    `,
    text: `${greet},\n\nBedankt voor uw aanvraag bij ${merk}. We hebben uw bericht ontvangen en nemen binnen 24 uur persoonlijk contact met u op.\n\nMet vriendelijke groet,\nHet team van ${merk}`
  };
}

function buildAnoukEmail(p) {
  const merk = SITE_NAAM[p.site] || p.site;
  const rows = [
    ['Site', merk],
    ['Formulier', p.formulier],
    ['Naam', p.naam],
    ['Email', p.email],
    ['Telefoon', p.telefoon || '—'],
    ['Datum', fmtDatum(p.datum) || '—'],
    ['Tijdstip', p.tijdstip || '—'],
    ['Personen', p.personen || '—'],
    ['Type', p.type_evenement || '—'],
    ['Workshop', p.workshop_type || '—'],
    ['Totaal', fmtBedrag(p.totaal_bedrag) || '—']
  ].filter(r => r[1] && r[1] !== '—' || r[0] === 'Email' || r[0] === 'Naam' || r[0] === 'Site' || r[0] === 'Formulier');

  const tableHtml = rows.map(r => `<tr><td style="padding:6px 12px 6px 0;color:#888;vertical-align:top;width:110px">${r[0]}</td><td style="padding:6px 0;color:#1a1a1a">${escapeHtml(r[1])}</td></tr>`).join('');

  return {
    subject: `Nieuwe aanvraag — ${escapeHtml(p.naam || '?')} (${merk})`,
    html: `
      <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a1a1a">
        <h2 style="font-size:18px;color:#c9942a;margin:0 0 4px">Nieuwe aanvraag binnen</h2>
        <div style="font-size:13px;color:#888;margin:0 0 20px">${merk} · ${p.formulier}</div>
        <table style="width:100%;font-size:14px;border-collapse:collapse">${tableHtml}</table>
        ${p.bericht ? `<div style="margin-top:18px;padding:14px;background:#f8f5ee;border-left:3px solid #c9942a;font-size:14px;line-height:1.5"><strong>Bericht:</strong><br>${escapeHtml(p.bericht)}</div>` : ''}
        ${p.configurator ? `<details style="margin-top:18px;font-size:13px"><summary style="cursor:pointer;color:#888">Configurator-data</summary><pre style="background:#f8f5ee;padding:12px;font-size:12px;overflow-x:auto">${escapeHtml(JSON.stringify(p.configurator, null, 2))}</pre></details>` : ''}
        <div style="margin-top:24px;font-size:13px;color:#888">Volledige aanvraag bekijken: <a href="https://memoriesofdamascus.netlify.app/dashboard">dashboard openen →</a></div>
      </div>
    `
  };
}

async function sendViaResend({ from, to, subject, html, text, replyTo }) {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text,
      reply_to: replyTo
    })
  });
  if (!r.ok) {
    const body = await r.text();
    throw new Error(`Resend ${r.status}: ${body}`);
  }
  return r.json();
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  if (!process.env.RESEND_API_KEY || !process.env.NOTIFY_EMAIL || !process.env.FROM_EMAIL) {
    console.warn('notify.js: missing env vars, skipping email send');
    return { statusCode: 200, body: JSON.stringify({ ok: false, reason: 'env-missing' }) };
  }

  let payload;
  try { payload = JSON.parse(event.body); } catch (_) {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  if (!payload.email || !payload.naam) {
    return { statusCode: 400, body: 'Missing naam/email' };
  }

  const FROM = process.env.FROM_EMAIL;
  const ANOUK = process.env.NOTIFY_EMAIL;
  const replyTo = SITE_REPLY_TO[payload.site] || ANOUK;

  const klantMail = buildKlantEmail(payload);
  const anoukMail = buildAnoukEmail(payload);

  const results = await Promise.allSettled([
    sendViaResend({ from: FROM, to: payload.email, subject: klantMail.subject, html: klantMail.html, text: klantMail.text, replyTo }),
    sendViaResend({ from: FROM, to: ANOUK, subject: anoukMail.subject, html: anoukMail.html, replyTo: payload.email })
  ]);

  const errors = results.filter(r => r.status === 'rejected').map(r => r.reason && r.reason.message);
  if (errors.length) console.error('notify.js errors:', errors);

  return {
    statusCode: 200,
    body: JSON.stringify({
      ok: errors.length === 0,
      klant: results[0].status,
      anouk: results[1].status,
      errors: errors.length ? errors : undefined
    })
  };
};
