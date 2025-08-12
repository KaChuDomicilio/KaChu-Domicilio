import { getStore } from '@netlify/blobs';

export default async (req) => {
  const store = getStore('cats');
  const ADMIN = process.env.ADMIN_KEY || '';

  if (req.method === 'OPTIONS') return new Response(null, { status: 204 });

  if (req.method === 'GET') {
    const data = await store.get('categories', { type: 'json' });
    return Response.json(data || { categories: [] });
  }

  if (req.method === 'POST') {
    const key = req.headers.get('x-admin-key') || '';
    if (key !== ADMIN) return new Response('Unauthorized', { status: 401 });
    const body = await req.json().catch(() => null);
    // { categories: [{name, subcategories:[]}, ...] }
    if (!body || !Array.isArray(body.categories)) {
      return new Response('Bad JSON', { status: 400 });
    }
    await store.setJSON('categories', body);
    return Response.json({ ok: true });
  }

  return new Response('Method Not Allowed', { status: 405 });
};
