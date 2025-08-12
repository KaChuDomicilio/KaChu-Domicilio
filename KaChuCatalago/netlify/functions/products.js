import { getStore } from '@netlify/blobs';

export default async (req) => {
  const store = getStore('products');
  const ADMIN = process.env.ADMIN_KEY || '';

  if (req.method === 'OPTIONS') return new Response(null, { status: 204 });

  if (req.method === 'GET') {
    const data = await store.get('products', { type: 'json' });
    return Response.json(data || { products: [] });
  }

  if (req.method === 'POST') {
    const key = req.headers.get('x-admin-key') || '';
    if (key !== ADMIN) return new Response('Unauthorized', { status: 401 });

    const body = await req.json().catch(() => null);
    // Dos modos:
    // 1) { action:"add", product:{...} }
    // 2) { action:"set", products:[...] }
    if (!body || !body.action) return new Response('Bad JSON', { status: 400 });

    const current = (await store.get('products', { type: 'json' })) || { products: [] };

    if (body.action === 'add') {
      const p = body.product || {};
      if (!p.name || p.price == null || !p.category) {
        return new Response('Missing required product fields', { status: 400 });
      }
      const id = p.id || p.name.toLowerCase().replace(/\s+/g,'-');
      const product = {
        id,
        name: p.name,
        price: Number(p.price),
        category: p.category,
        subcategory: p.subcategory || '',
        description: p.description || '',
        image: p.image || '' // URL opcional (Drive, Cloudinary, etc.)
      };
      // evita duplicados por id
      const idx = current.products.findIndex(x => x.id === id);
      if (idx >= 0) current.products[idx] = product;
      else current.products.push(product);

      await store.setJSON('products', current);
      return Response.json({ ok: true, id });
    }

    if (body.action === 'set') {
      if (!Array.isArray(body.products)) {
        return new Response('Bad JSON products', { status: 400 });
      }
      const normalized = body.products.map(p => ({
        id: p.id || p.name.toLowerCase().replace(/\s+/g,'-'),
        name: p.name,
        price: Number(p.price),
        category: p.category,
        subcategory: p.subcategory || '',
        description: p.description || '',
        image: p.image || ''
      }));
      await store.setJSON('products', { products: normalized });
      return Response.json({ ok: true, count: normalized.length });
    }

    return new Response('Unknown action', { status: 400 });
  }

  return new Response('Method Not Allowed', { status: 405 });
};
