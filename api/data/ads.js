import { put, head } from '@vercel/blob';
const KEY   = 'data/ads.json';                 // archivo en tu Blob
const token = process.env.BLOB_READ_WRITE_TOKEN;

// Documento por defecto (si aún no existe)
const DEFAULT_DOC = { enabled: false, messages: [] };

/**
 * Normaliza el payload a la forma canónica:
 * { enabled: boolean, messages: [{ l1, l2?, ctaText?, ctaUrl? }, ...] }
 * Acepta también formato legacy: array simple => enabled:true + messages: [...]
 */
function normalizeDoc(input) {
  // 1) Orígenes aceptados
  let enabled = false;
  let rawMessages = [];

  if (Array.isArray(input)) {
    // Legacy: sólo array -> asumimos habilitado
    enabled = true;
    rawMessages = input;
  } else if (input && typeof input === 'object') {
    enabled = !!input.enabled;
    rawMessages =
      Array.isArray(input.messages) ? input.messages :
      Array.isArray(input.ads)      ? input.ads      :
      Array.isArray(input.items)    ? input.items    :
      Array.isArray(input.data)     ? input.data     : [];
  }

  // 2) Limpieza de cada mensaje
  const messages = rawMessages
    .map((x) => {
      if (!x || typeof x !== 'object') return null;

      const l1 = (x.l1 ?? '').toString().trim();
      const l2 = (x.l2 ?? '').toString().trim();
      const ctaText = (x.ctaText ?? '').toString().trim();
      let ctaUrl = (x.ctaUrl ?? '').toString().trim();

      // Acepta sólo http/https para URL; si no, la descartamos
      if (ctaUrl && !/^https?:\/\//i.test(ctaUrl)) ctaUrl = '';

      if (!l1) return null; // l1 es obligatorio

      const msg = { l1 };
      if (l2) msg.l2 = l2;
      if (ctaText) msg.ctaText = ctaText;
      if (ctaUrl) msg.ctaUrl = ctaUrl;
      return msg;
    })
    .filter(Boolean);

  return { enabled, messages };
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      try {
        // Lee el JSON actual desde el Blob
        const meta = await head(KEY, { token });
        const r = await fetch(meta.url, { cache: 'no-store' });
        const data = await r.json();
        const doc = normalizeDoc(data);
        return res.status(200).json(doc);
      } catch {
        // Si aún no existe, devolvemos el default
        return res.status(200).json(DEFAULT_DOC);
      }
    }

    if (req.method === 'PUT') {
      // Acepta body como string o objeto
      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch { body = {}; }
      }

      const doc = normalizeDoc(body);

      // Guarda el documento normalizado en el Blob
      await put(KEY, JSON.stringify(doc, null, 2), {
        access: 'public',
        addRandomSuffix: false,
        allowOverwrite: true,      // importante para actualizar el mismo archivo
        contentType: 'application/json',
        token
      });

      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, PUT');
    return res.status(405).end();
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
}