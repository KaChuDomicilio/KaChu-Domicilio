// ===== utils.js =====
// Estado compartido (global)
const CART_KEY = 'kachu_cart_v1';
const CHECKOUT_KEY = 'kachu_checkout_v1';

const API = {
  productos:  ['/api/data/productos',  '/public/data/productos.json',  '/data/productos.json',  'productos.json'],
  categorias: ['/api/data/categorias', '/public/data/categorias.json', '/data/categorias.json', 'categorias.json'],
  zonas:      ['/api/data/zonas',      '/public/data/zonas.json',      '/data/zonas.json',      'zonas.json'],
  servicio:   ['/api/data/servicio',   '/public/data/servicio.json',   '/data/servicio.json',   'servicio.json'],
};

// Estructuras compartidas
const cart = new Map();          // id -> item
const productsById = new Map();  // id -> producto
let categoriesMap = null;        // Map<string, string[]>

// Helpers
function money(n){ return '$' + Number(n).toFixed(2); }
function parseMoney(str){ return parseFloat((str||'').replace(/[^0-9.]/g,'')) || 0; }
function normalize(str){ return (str || '').toString().toLowerCase().trim(); }
function decimalsFromStep(step){ const s = String(step || 1); return s.includes('.') ? (s.split('.')[1] || '').length : 0; }
function formatQty(qty, step){ const d = decimalsFromStep(step || 1); return Number(qty || 0).toFixed(d).replace(/\.?0+$/,''); }

// fetch sin caché y fallback de URLs
async function fetchNoCache(url){
  const u = url + (url.includes('?') ? `&t=${Date.now()}` : `?t=${Date.now()}`);
  return fetch(u, { cache: 'no-store' });
}
async function fetchFirstOk(urls){
  for (const url of urls){
    try{ const r = await fetchNoCache(url); if (r.ok) return { url, json: await r.json() }; }catch(_){}
  }
  throw new Error('No se pudo leer ninguna URL:\n' + urls.join('\n'));
}

// Placeholder de imagen
function svgPlaceholder(text = 'Sin foto') {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120">
      <rect width="100%" height="100%" fill="#EEE"/>
      <text x="50%" y="50%" dominant-baseline="middle"
            text-anchor="middle" fill="#999" font-family="Arial" font-size="12">${text}</text>
    </svg>`;
  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
}

// === Motor de precios (combos por kg o por pieza) ===
function _num(v, d = 0){ const n = parseFloat(String(v ?? '').toString().replace(',', '.')); return Number.isFinite(n) ? n : d; }
function _toCount(q, step){ return Math.round((q + 1e-9) / step); }
function _roundToStep(q, step){ return _toCount(q, step) * step; }

function normalizePricingFromProduct(p){
  const unit = (p?.soldBy === 'weight') ? 'weight' : 'unit';
  const step = unit === 'weight' ? _num(p?.step, 0.25) : 1;
  const minQty = unit === 'weight' ? _num(p?.minQty, step) : 1;
  const basePrice = _num(p?.price, 0);

  let tiers = [];
  if (Array.isArray(p?.bundlePricing?.tiers)) tiers = p.bundlePricing.tiers;   // por pieza
  else if (Array.isArray(p?.kgPricing?.tiers)) tiers = p.kgPricing.tiers;      // por kg
  else if (Array.isArray(p?.priceCombos))      tiers = p.priceCombos;          // compat panel

  tiers = (tiers || [])
    .map(t => ({ qty: _num(t.qty,0), price: _num(t.price,0) }))
    .filter(t => t.qty > 0 && t.price > 0)
    .sort((a,b) => a.qty - b.qty);

  return { unit, step, minQty, basePrice, tiers };
}
function clampQtyToStepAndMin(qty, cfg){
  const q = Math.max(_num(qty, cfg.minQty), cfg.minQty);
  const snapped = _roundToStep(q, cfg.step);
  return Math.max(snapped, cfg.minQty);
}
function computeBestPriceRaw(product, qtyRaw){
  const cfg = normalizePricingFromProduct(product);
  const qty = clampQtyToStepAndMin(qtyRaw, cfg);

  if (!cfg.tiers.length){
    const total = +(qty * cfg.basePrice).toFixed(2);
    return { qty, requestedQty: qty, total, breakdown: [{ qty, times: 1, price: +cfg.basePrice.toFixed(2) }], pricingMode: 'base', adjusted: false };
  }

  const step = cfg.step;
  const N = _toCount(qty, step);
  const tiers = cfg.tiers.map(t => ({ count: _toCount(t.qty, step), rawQty: t.qty, price: +t.price.toFixed(2) })).filter(t => t.count >= 1);

  if (!tiers.length){
    const total = +(qty * cfg.basePrice).toFixed(2);
    return { qty, requestedQty: qty, total, breakdown: [{ qty, times: 1, price: +cfg.basePrice.toFixed(2) }], pricingMode: 'base', adjusted: false };
  }

  const INF = 1e15;
  const dp = new Array(N + 201).fill(INF);
  const choice = new Array(N + 201).fill(-1);
  dp[0] = 0;
  for (let i=1;i<dp.length;i++){
    for (let j=0;j<tiers.length;j++){
      const t = tiers[j];
      if (i - t.count >= 0){
        const cand = dp[i - t.count] + t.price;
        if (cand < dp[i]) { dp[i] = cand; choice[i] = j; }
      }
    }
  }
  let exact = N;
  while (exact < dp.length && dp[exact] === INF) exact++;
  if (exact >= dp.length || dp[exact] === INF){
    const total = +(qty * cfg.basePrice).toFixed(2);
    return { qty, requestedQty: qty, total, breakdown: [{ qty, times: 1, price: +cfg.basePrice.toFixed(2) }], pricingMode: 'fallback', adjusted: false };
  }

  const used = new Map();
  let k = exact;
  while (k > 0){ const j = choice[k]; used.set(j, (used.get(j)||0)+1); k -= tiers[j].count; }

  const adjustedQty = +(exact * step).toFixed(3);
  let total = 0;
  const breakdown = [];
  for (const [j, times] of used.entries()){
    const t = tiers[j]; total += times * t.price;
    breakdown.push({ qty: t.rawQty, times, price: t.price });
  }
  total = +total.toFixed(2);

  return { qty: adjustedQty, requestedQty: qty, total, breakdown: breakdown.sort((a,b)=>a.qty-b.qty), pricingMode: 'combos', adjusted: adjustedQty !== qty };
}
function bestPriceById(id, qty){
  const p = productsById.get(id);
  if (!p){
    return { qty, requestedQty: qty, total: +((qty || 0) * 0).toFixed(2), breakdown: [], pricingMode: 'base', adjusted: false };
  }
  return computeBestPriceRaw(p, qty);
}

// Stubs seguros (evita errores si catalog llama antes de que checkout cargue)
function updateCheckoutTotalPill(){ /* se redefine en checkout.js */ }