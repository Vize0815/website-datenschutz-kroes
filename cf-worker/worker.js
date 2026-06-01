export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'OPTIONS') {
      return corsResponse(null, 204);
    }

    if (path === '/track' && request.method === 'POST') {
      return handleTrack(request, env);
    }

    if (path === '/admin/clicks' && request.method === 'GET') {
      return handleAdminClicks(request, env, url);
    }

    return handleNewsletter(request, env);
  }
};

async function handleTrack(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return corsResponse(JSON.stringify({ error: 'Invalid JSON' }), 400);
  }

  const { slug } = body;
  if (!slug || typeof slug !== 'string' || !/^[\w-]+$/.test(slug)) {
    return corsResponse(JSON.stringify({ error: 'Invalid slug' }), 400);
  }

  const current = parseInt(await env.CLICKS.get(slug) || '0', 10);
  await env.CLICKS.put(slug, String(current + 1));

  return corsResponse(JSON.stringify({ ok: true }), 200);
}

async function handleAdminClicks(request, env, url) {
  const token = url.searchParams.get('token');
  if (!env.ADMIN_TOKEN || token !== env.ADMIN_TOKEN) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const list = await env.CLICKS.list();
  const entries = await Promise.all(
    list.keys.map(async key => [key.name, parseInt(await env.CLICKS.get(key.name) || '0', 10)])
  );

  const sorted = Object.fromEntries(entries.sort(([, a], [, b]) => b - a));

  return new Response(JSON.stringify(sorted, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    }
  });
}

async function handleNewsletter(request, env) {
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

  const payload = {
    email,
    listIds: [3],
    updateEnabled: true,
    attributes: { FIRSTNAME: name }
  };
  if (company) payload.attributes.COMPANY = company;

  const brevoRes = await fetch('https://api.brevo.com/v3/contacts', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'api-key': env.BREVO_API_KEY
    },
    body: JSON.stringify(payload)
  });

  const status = brevoRes.status;
  if (status === 201 || status === 204) {
    return corsResponse(JSON.stringify({ ok: true }), 200);
  }

  const errData = await brevoRes.json().catch(() => ({}));
  return corsResponse(JSON.stringify({ error: errData.message || 'Brevo error' }), 500);
}

function corsResponse(body, status) {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': 'https://datenschutz-kroes.at',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
