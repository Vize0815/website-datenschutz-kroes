// Newsletter Proxy (Cloudflare Worker) für Brevo Double Opt In.
// Stand: identisch mit der Live Version vom 23.10.2026, nur die Zieladresse
// nach der Bestätigung zeigt jetzt auf /newsletter-bestaetigt/.
// Hinweis: Die frühere Klickzähler Funktion (/track) war nie live und ist in
// der Git Historie (Commit 9023a5a) zu finden.
export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return corsResponse(null, 204);
    }
    if (request.method !== 'POST') {
      return corsResponse(JSON.stringify({ error: 'Method not allowed' }), 405);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return corsResponse(JSON.stringify({ error: 'Invalid JSON' }), 400);
    }

    const { email, name, company } = body;
    if (!email || !name) {
      return corsResponse(JSON.stringify({ error: 'Missing fields' }), 400);
    }

    const attributes = { FIRSTNAME: name };
    if (company) attributes.COMPANY = company;

    // Brevo schickt die Bestätigungsmail (Vorlage #2). Erst nach Klick auf den
    // Link landet der Kontakt in Liste 3.
    const payload = {
      email,
      attributes,
      includeListIds: [3],
      templateId: 2,
      redirectionUrl: 'https://datenschutz-kroes.at/newsletter-bestaetigt/'
    };

    const brevoRes = await fetch('https://api.brevo.com/v3/contacts/doubleOptinConfirmation', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': env.BREVO_API_KEY
      },
      body: JSON.stringify(payload)
    });

    const status = brevoRes.status;
    if (status === 204) {
      return corsResponse(JSON.stringify({ ok: true }), 200);
    }
    const errData = await brevoRes.json().catch(() => ({}));
    return corsResponse(JSON.stringify({ error: errData.message || 'Brevo error' }), 500);
  }
};

function corsResponse(body, status) {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': 'https://datenschutz-kroes.at',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
