import { getStore } from '@netlify/blobs';

export default async (req) => {
  const store = getStore('zones');
  const ADMIN = process.env.ADMIN_KEY || '';

  if (req.method === 'OPTIONS') return new Response(null, { status: 204 });

  if (req.method === 'GET') {
    const data = await store.get('zones', { type: 'json' });
    return Response.json(data || { zones: [] });
  }

  if (req.method === 'POST') {
    const key = req.headers.get('x-admin-key') || '';
    if (key !== ADMIN) return new Response('Unauthorized', { status: 401 });
    const body = await req.json().catch(() => null);
    // { zones: [{id?, name, fee}, ...] }
    if (!body || !Array.isArray(body.zones)) {
      return new Response('Bad JSON', { status: 400 });
    }
    // Normaliza ids si faltan
    const zones = body.zones.map(z => ({
      id: z.id || z.name?.toLowerCase().replace(/\s+/g,'-'),
      name: z.name, fee: Number(z.fee||0)
    }));
    await store.setJSON('zones', { zones });
    return Response.json({ ok: true });
  }

  return new Response('Method Not Allowed', { status: 405 });
};
