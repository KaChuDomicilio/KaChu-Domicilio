// ESM, igual que tus otras rutas
export default function handler(req, res) {
  const hasToken = !!process.env.BLOB_READ_WRITE_TOKEN;
  res.status(200).json({
    hasToken,
    // útil para depurar: nombre de proyecto y entorno
    project: process.env.VERCEL_PROJECT_PRODUCTION_URL || null,
    env: process.env.VERCEL_ENV || 'unknown'
  });
}
