// KaChuCatalog/netlify/functions/zones.js
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,X-Admin-Key',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: cors, body: '' };
  }

  // Import dinámico para evitar problemas de bundling
  const { getStore } = await import('@netlify/blobs');
  const store = getStore('zones');
  const ADMIN = process.env.ADMIN_KEY || '';

  try {
    if (event.httpMethod === 'GET') {
      const data = await store.get('zones', { type: 'json' }) || { zones: [] };
      return {
        statusCode: 200,
        headers: { ...cors, 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      };
    }

    if (event.httpMethod === 'POST') {
      const key = event.headers['x-admin-key'] || event.headers['X-Admin-Key'] || '';
      if (key !== ADMIN) {
        return { statusCode: 401, headers: cors, body: 'Unauthorized' };
      }
      const body = JSON.parse(event.body || '{}');
      if (!Array.isArray(body.zones)) {
        return { statusCode: 400, headers: cors, body: 'Bad JSON: { zones: [...] } required' };
      }
      const zones = body.zones.map(z => ({
        id: z.id || (z.name || '').toLowerCase().replace(/\s+/g, '-'),
        name: z.name,
        fee: Number(z.fee || 0)
      }));
      await store.setJSON('zones', { zones });
      return {
        statusCode: 200,
        headers: { ...cors, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: true })
      };
    }

    return { statusCode: 405, headers: cors, body: 'Method Not Allowed' };
  } catch (e) {
    return { statusCode: 500, headers: cors, body: 'Server error: ' + e.message };
  }
};
