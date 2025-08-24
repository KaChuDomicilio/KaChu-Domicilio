import { put, head } from '@vercel/blob';
const KEY = 'data/servicio.json';
const token = process.env.BLOB_READ_WRITE_TOKEN;

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      try {
        const meta = await head(KEY, { token });
        const r = await fetch(meta.url, { cache: 'no-store' });
        const data = await r.json();
        return res.status(200).json({
          active: data?.active !== false,
          message: data?.message || '',
          image: data?.image || ''
        });
      } catch {
        return res.status(200).json({ active: true, message: '', image: '' });
      }
    }

    if (req.method === 'PUT') {
      let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch {} }
      const payload = {
        active: body?.active !== false,
        message: String(body?.message || ''),
        image:   String(body?.image || '')
      };
await put(KEY, JSON.stringify(payload, null, 2), {
  access: 'public',
  addRandomSuffix: false,
  allowOverwrite: true,          // ← clave
  contentType: 'application/json',
  token
});

      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, PUT');
    res.status(405).end();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
}
