// /api/data/zonas.js
import { put, head } from '@vercel/blob';

const KEY = 'data/zonas.json';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      try {
        const meta = await head(KEY);
        const r = await fetch(meta.url, { cache:'no-store' });
        const data = await r.json();
        const arr = Array.isArray(data) ? data : (data.zonas || data.zones || []);
        return res.status(200).json(arr); // ← tu panel ya esperaba array
      } catch {
        return res.status(200).json([]);
      }
    }

    if (req.method === 'PUT') {
      let body = req.body;
      if (typeof body === 'string') try { body = JSON.parse(body); } catch {}
      const arr = Array.isArray(body) ? body : (body?.zonas || body?.zones || []);
      await put(KEY, JSON.stringify(arr, null, 2), {
        access: 'public',
        addRandomSuffix: false,
        contentType: 'application/json'
      });
      return res.status(200).json({ ok:true });
    }

    res.setHeader('Allow', 'GET, PUT');
    return res.status(405).end();
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
}
