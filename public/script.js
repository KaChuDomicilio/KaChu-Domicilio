// ==== KaChu Catálogo – script.js ====
// Soporta productos por pieza y por peso (step/minQty) y, opcionalmente,
// precios por kg y por pieza con escalones/combos.

/* == 1) CONFIG & ESTADO: Referencias de UI, persistencia, constantes == */
// --------- Referencias de UI ---------
const modalCart = document.getElementById('modalCart');
const modalCheckout = document.getElementById('modalCheckout');

const btnCart = document.getElementById('btnCart');
const btnContinue = document.getElementById('btnContinue');

const cartList = document.getElementById('cartList');
const cartBadge = document.getElementById('cartBadge');

const checkoutForm = document.getElementById('checkoutForm');
const zone = document.getElementById('zone');
const address = document.getElementById('address');
const btnCancel = document.getElementById('btnCancel');
const btnWhatsApp = document.getElementById('btnWhatsApp');

const cashField = document.getElementById('cashField');
const cashGiven = document.getElementById('cashGiven');

const modalConfirm = document.getElementById('modalConfirm');
const btnConfirmYes = document.getElementById('btnConfirmYes');
const btnConfirmNo  = document.getElementById('btnConfirmNo');

const categorySelect = document.getElementById('category');
const subcategorySelect = document.getElementById('subcategory');
const searchInput = document.getElementById('searchInput');
const emptyState = document.getElementById('emptyState');
const grid = document.querySelector('.grid');

const btnClearCart = document.getElementById('btnClearCart');
const checkoutTotalPill = document.getElementById('checkoutTotalPill');

const modalTransfer = document.getElementById('modalTransferencia');
const btnTransferOK = document.getElementById('btnTransferOK');

btnClearCart?.addEventListener('click', clearCart);

// --------- Persistencia ---------
const CART_KEY = 'kachu_cart_v1';
const CHECKOUT_KEY = 'kachu_checkout_v1';

// === FAVORITOS (estado/persistencia) ===
const FAVS_KEY = 'kachu_favs_v1';
let favorites = new Set();

const cashHelp = document.getElementById('cashHelp');

// === FREE SHIPPING (estado/UI) ===
const fsPill = document.getElementById('fs-promo');
const fsMsg  = fsPill?.querySelector('.fs-msg');
const fsBar  = fsPill?.querySelector('.fs-bar');

// === FREE SHIPPING (toast temporizado) ===
let fsTimer = null;
let fsLastText = '';
let fsShowOnAdd = false; // bandera: mostrar cuando se agregó producto

const FS_SHOW_MS = 8000; // tiempo visible
const FS_COOLDOWN_MS = 600; // margen para evitar parpadeos rápidos

function loadFavs(){
  try{
    const raw = localStorage.getItem(FAVS_KEY);
    favorites = new Set(Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : []);
  }catch{ favorites = new Set(); }
}
function saveFavs(){
  localStorage.setItem(FAVS_KEY, JSON.stringify(Array.from(favorites)));
}
function isFav(id){ return favorites.has(String(id)); }
function toggleFav(id){
  const key = String(id);
  if (favorites.has(key)) favorites.delete(key); else favorites.add(key);
  saveFavs();
}

function showFsToastOnce() {
  if (!fsPill) return;
  // Evita reanimar si ya está visible con el mismo texto
  const isShowing = fsPill.classList.contains('show');
  const current = fsMsg?.innerHTML || '';
  if (isShowing && current === fsLastText) return;

  fsLastText = current;

  clearTimeout(fsTimer);
  fsPill.classList.remove('hidden');
  // forzamos reflujo para reiniciar transición si se repite
  void fsPill.offsetWidth;
  fsPill.classList.add('show');

  fsTimer = setTimeout(() => {
    fsPill.classList.remove('show');
    // opcional: ocultar completamente tras la animación
    setTimeout(() => fsPill.classList.add('hidden'), FS_COOLDOWN_MS);
  }, FS_SHOW_MS);
}

let ZONES = [];                         // [{nombre, costo, freeShippingThreshold?}, ...]
const zonesByName = new Map();          // nombre -> { cost, threshold }

/* == 2) CARGA DE DATOS: Endpoints + fetch con fallback == */
// --- API primero; estáticos como respaldo ---
const API = {
  productos:  ['/api/data/productos'],
  categorias: ['/api/data/categorias'],
  zonas:      ['/api/data/zonas'],
  servicio:   ['/api/data/servicio'],
};

// fetch sin caché
async function fetchNoCache(url){
  const u = url + (url.includes('?') ? `&t=${Date.now()}` : `?t=${Date.now()}`);
  return fetch(u, { cache: 'no-store' });
}
// intenta URLs en orden hasta 200
async function fetchFirstOk(urls){
  for (const url of urls){
    try{
      const r = await fetchNoCache(url);
      if (r.ok) return { url, json: await r.json() };
    }catch(_){}
  }
  throw new Error('No se pudo leer ninguna URL:\n' + urls.join('\n'));
}

/* == 3) HELPERS & ESTADO EN MEMORIA (cart, índices, utilidades) == */
// --------- Helpers ---------
const cart = new Map(); // id -> { id, name, unit, qty, soldBy, unitLabel, step, minQty }
const pricingById = new Map(); // id -> { tiers:[{qty,price}, ...] }  (legado/compat)
const productsById = new Map(); // <-- índice completo de productos (para motor de precios)

function money(n){ return '$' + Number(n).toFixed(2); }
function parseMoney(str){ return parseFloat((str||'').replace(/[^0-9.]/g,'')) || 0; }
function normalize(str){ return (str || '').toString().toLowerCase().trim(); }
function currency(n){ return '$' + Number(n || 0).toFixed(2); }

function decimalsFromStep(step){
  const s = String(step || 1);
  return s.includes('.') ? (s.split('.')[1] || '').length : 0;
}
function formatQty(qty, step){
  const d = decimalsFromStep(step || 1);
  return Number(qty || 0).toFixed(d).replace(/\.?0+$/,'');
}

function getCardInfo(card){
  const name = card.querySelector('h3')?.textContent.trim() || '';
  const unit = parseMoney(card.querySelector('.price')?.textContent);
  const id = card.dataset.id || name; // usa id real si viene de la API
  const soldBy    = card.dataset.soldby || 'unit';
  const unitLabel = card.dataset.unitlabel || (soldBy==='weight' ? 'kg' : 'pza');
  const step      = parseFloat(card.dataset.step || (soldBy==='weight' ? '0.25' : '1')) || 1;
  const minQty    = parseFloat(card.dataset.minqty || step) || step;
  return { id, name, unit, soldBy, unitLabel, step, minQty };
}

function saveCart(){
  const arr = Array.from(cart.values());
  localStorage.setItem(CART_KEY, JSON.stringify(arr));
}
function loadCart(){
  try{
    const raw = localStorage.getItem(CART_KEY);
    if(!raw) return;
    const arr = JSON.parse(raw);
    cart.clear();
    arr.forEach(it => {
      if(it && it.id && it.qty > 0){
        cart.set(it.id, {
          id: it.id,
          name: it.name,
          unit: it.unit,
          qty: it.qty,
          soldBy: it.soldBy || 'unit',
          unitLabel: it.unitLabel || (it.soldBy==='weight' ? 'kg' : 'pza'),
          step: parseFloat(it.step) || (it.soldBy==='weight' ? 0.25 : 1),
          minQty: parseFloat(it.minQty) || (parseFloat(it.step) || 1)
        });
      }
    });
  }catch(e){ console.warn('No se pudo cargar el carrito:', e); }
}

function saveCheckout(){
  const pay = checkoutForm.querySelector('input[name="pay"]:checked')?.value || '';
  const data = {
    zone: zone.value || '',
    pay,
    address: address.value || '',
    cashGiven: cashGiven.value || ''
  };
  localStorage.setItem(CHECKOUT_KEY, JSON.stringify(data));
}
function loadCheckout(){
  try{
    const raw = localStorage.getItem(CHECKOUT_KEY);
    if(!raw) return;
    const data = JSON.parse(raw);

    if(data.zone) zone.value = data.zone;
    if(data.pay){
      const r = checkoutForm.querySelector(`input[name="pay"][value="${data.pay}"]`);
      if(r){ r.checked = true; }
    }
    if(data.address) address.value = data.address;
    if(data.cashGiven) cashGiven.value = data.cashGiven;

    cashField.classList.toggle('hidden', data.pay !== 'Efectivo');
  }catch(e){ console.warn('No se pudo cargar checkout:', e); }
}

/* == 4) MOTOR DE PRECIOS (combos por kg/pza; cálculo de mejor precio) == */
function _num(v, d = 0){
  const n = parseFloat(String(v ?? '').toString().replace(',', '.'));
  return Number.isFinite(n) ? n : d;
}
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
    .sort((a,b) => a.qty - b.qty); // asc

  return { unit, step, minQty, basePrice, tiers };
}

function clampQtyToStepAndMin(qty, cfg){
  const q = Math.max(_num(qty, cfg.minQty), cfg.minQty);
  const snapped = _roundToStep(q, cfg.step);
  return Math.max(snapped, cfg.minQty);
}

/** Calcula el mejor precio usando combos (si existen). Devuelve números crudos. */
function computeBestPriceRaw(product, qtyRaw){
  const cfg = normalizePricingFromProduct(product);
  const qty = clampQtyToStepAndMin(qtyRaw, cfg);

  const hasTiers = Array.isArray(cfg.tiers) && cfg.tiers.length > 0;
  if (!hasTiers){
    const total = +(qty * cfg.basePrice).toFixed(2);
    return {
      qty, requestedQty: qty, total,
      breakdown: [{ qty, times: 1, price: +cfg.basePrice.toFixed(2) }],
      pricingMode: 'base', adjusted: false
    };
  }

  const step = cfg.step;
  const N = _toCount(qty, step);

  const tiers = cfg.tiers
    .map(t => ({ count: _toCount(t.qty, step), rawQty: t.qty, price: +t.price.toFixed(2) }))
    .filter(t => t.count >= 1);

  if (!tiers.length){
    const total = +(qty * cfg.basePrice).toFixed(2);
    return {
      qty, requestedQty: qty, total,
      breakdown: [{ qty, times: 1, price: +cfg.basePrice.toFixed(2) }],
      pricingMode: 'base', adjusted: false
    };
  }

  const INF = 1e15;
  const dp = new Array(N + 1).fill(INF);
  const choice = new Array(N + 1).fill(-1);
  dp[0] = 0;

  for (let i = 1; i <= N; i++){
    for (let j = 0; j < tiers.length; j++){
      const t = tiers[j];
      if (i - t.count >= 0){
        const cand = dp[i - t.count] + t.price;
        if (cand < dp[i]) { dp[i] = cand; choice[i] = j; }
      }
    }
  }

  if (dp[N] === INF){
    const total = +(qty * cfg.basePrice).toFixed(2);
    return {
      qty, requestedQty: qty, total,
      breakdown: [{ qty, times: 1, price: +cfg.basePrice.toFixed(2) }],
      pricingMode: 'base', adjusted: false
    };
  }

  const used = new Map();
  let k = N;
  while (k > 0){
    const j = choice[k];
    used.set(j, (used.get(j) || 0) + 1);
    k -= tiers[j].count;
  }

  let total = 0;
  const breakdown = [];
  for (const [j, times] of used.entries()){
    const t = tiers[j];
    total += times * t.price;
    breakdown.push({ qty: t.rawQty, times, price: t.price });
  }
  total = +total.toFixed(2);

  return {
    qty,
    requestedQty: qty,
    total,
    breakdown: breakdown.sort((a,b)=> a.qty - b.qty),
    pricingMode: 'combos',
    adjusted: false
  };
}

// Wrapper por id
function bestPriceById(id, qty){
  const p = productsById.get(id);
  if (!p){
    const it = cart.get(id);
    const line = +((it?.unit || 0) * qty).toFixed(2);
    return { qty, requestedQty: qty, total: line, breakdown: [], pricingMode: 'base', adjusted: false };
  }
  const hasEmbeddedTiers =
    (Array.isArray(p?.bundlePricing?.tiers) && p.bundlePricing.tiers.length) ||
    (Array.isArray(p?.kgPricing?.tiers) && p.kgPricing.tiers.length) ||
    (Array.isArray(p?.priceCombos) && p.priceCombos.length);

  let prod = p;
  if (!hasEmbeddedTiers){
    const legacy = pricingById.get(id);
    if (legacy?.tiers?.length){
      if ((p.soldBy || 'unit') === 'weight'){
        prod = { ...p, kgPricing: { tiers: legacy.tiers } };
      } else {
        prod = { ...p, bundlePricing: { tiers: legacy.tiers } };
      }
    }
  }
  return computeBestPriceRaw(prod, qty);
}

/* == 5) CATEGORÍAS: selects y mapeos == */
let categoriesMap = null;

function fillCategorySelectFromMap() {
  if (!categorySelect) return;
  const cats = Array.from(categoriesMap.keys()).sort();
  categorySelect.innerHTML = `<option value="">Todas</option>` +
    cats.map(c => `<option>${c}</option>`).join('');
  subcategorySelect.innerHTML = `<option value="">Todas</option>`;
  subcategorySelect.disabled = true;
}
function fillSubcategorySelectFromMap(selectedCat) {
  const subs = categoriesMap.get(selectedCat) || [];
  subcategorySelect.innerHTML = `<option value="">Todas</option>` +
    subs.slice().sort().map(s => `<option>${s}</option>`).join('');
  subcategorySelect.disabled = subs.length === 0;
}

/* == 6) MODALES == */
btnTransferOK?.addEventListener('click', () => closeModal(modalTransfer));
function openModal(modal){
  if (!modal) return;
  modal.inert = false;
  modal.classList.add('open');
  modal.removeAttribute('aria-hidden');
  setTimeout(() => modal.querySelector('.modal__close, [data-close]')?.focus?.(), 0);
}
function closeModal(modal){
  if (!modal) return;
  const active = document.activeElement;
  if (active && modal.contains(active)) active.blur();
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden','true');
  modal.inert = true;
}

/* == 7) UI productos == */
// ===== Favoritos: UI (carrusel + modal) =====
const favsSection  = document.getElementById('favsSection');
const favsRail     = document.getElementById('favsRail');
const btnFavsPrev  = document.getElementById('btnFavsPrev');
const btnFavsNext  = document.getElementById('btnFavsNext');
const btnFavsExpand= document.getElementById('btnFavsExpand');
const modalFavs    = document.getElementById('modalFavs');
const favsModalList= document.getElementById('favsModalList');

function favHeartSVG(active=false){
  // contorno (no activo) / lleno (activo) con la misma forma
  return active
    ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12.1 21.35l-1.1-1.02C5.14 14.88 2 12.07 2 8.5 2 6.01 3.99 4 6.5 4c1.54 0 3.04.8 3.9 2.09C11.46 4.8 12.96 4 14.5 4 17.01 4 19 6.01 19 8.5c0 3.57-3.14 6.38-8.01 11.83l-0.89 1.02z"></path></svg>'
    : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12.1 21.35l-1.1-1.02C5.14 14.88 2 12.07 2 8.5 2 6.01 3.99 4 6.5 4c1.54 0 3.04.8 3.9 2.09C11.46 4.8 12.96 4 14.5 4 17.01 4 19 6.01 19 8.5c0 3.57-3.14 6.38-8.01 11.83l-0.89 1.02z" fill="none"></path></svg>';
}

// ===== Favoritos: render de mini-tarjetas en el carrusel =====
// Requiere en el HTML:
// <section id="favsSection" class="favs">…<div class="favs-viewport"><div id="favsTrack" class="favs-track"></div></div>…</section>

function renderFavoritesRail(){
  // favsSection: <section>, favsRail: el track <div id="favsTrack" class="favs-track">
  if (!window.favsSection || !window.favsRail) return;

  // 1) Construimos la lista con productos válidos
  const items = Array.from(favorites)
    .map(id => productsById.get(id))
    .filter(p => p && p.active !== false);

  // 2) Mostrar/ocultar el bloque
  favsSection.classList.toggle('hidden', items.length === 0);
  if (!items.length){ favsRail.innerHTML = ''; return; }

  // 3) HTML de cada mini-card (coincide con el CSS que te pasé)
  const html = items.map(p => {
    const id   = p.id;
    const name = p.name || '';
    const img  = (p.image && String(p.image).trim()) ? p.image : svgPlaceholder('Sin foto');
    const price= Number(p.price||0);
    const fav  = isFav ? isFav(id) : (typeof isFavorite === 'function' ? isFavorite(id) : false);

    return `
      <article class="fav-card" data-id="${id}">
        <div class="media">
          <img src="${img}" alt="${name.replace(/"/g,'&quot;')}">
          <button class="fav-heart ${fav ? 'is-fav' : ''}" data-id="${id}" type="button" aria-label="${fav ? 'Quitar de favoritos':'Marcar como favorito'}">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <!-- contorno -->
              <path class="icon-stroke" d="M12.1 8.64l-.1.1-.1-.1C10.14 6.9 7.1 7.24 5.8 9.28c-1.03 1.62-.72 3.82.74 5.04L12 19l5.46-4.68c1.46-1.22 1.77-3.42.74-5.04-1.3-2.04-4.34-2.38-6.04-.64z" fill="none" stroke="#ef4444" stroke-width="1.8" stroke-linejoin="round"/>
              <!-- relleno -->
              <path class="icon-fill" d="M12 21l-1.45-1.32C6 15.36 3 12.61 3 9.28 3 7 4.79 5 7.05 5c1.4 0 2.75.66 3.6 1.71C11.5 5.66 12.85 5 14.25 5 16.51 5 18.3 7 18.3 9.28c0 3.33-3 6.08-7.55 10.4L12 21z" fill="#ef4444"/>
            </svg>
          </button>
        </div>
        <div class="meta">
          <h4>${name}</h4>
          <div class="price">${money(price)}</div>
          <button class="btn add" type="button" data-id="${id}">Agregar</button>
        </div>
      </article>
    `;
  }).join('');

  favsRail.innerHTML = html;

  // 4) (una sola vez) Delegado de clicks en el track: corazón / agregar
  if (!favsRail.dataset.bound){
    favsRail.addEventListener('click', (e) => {
      const heart = e.target.closest('.fav-heart');
      const add   = e.target.closest('.btn.add');

      // Toggle favorito
      if (heart){
        const id = heart.dataset.id;
        if (typeof toggleFavorite === 'function') toggleFavorite(id);
        heart.classList.toggle('is-fav', (isFav ? isFav(id) : isFavorite(id)));
        return;
      }

      // Agregar al carrito
      if (add){
        const id = add.dataset.id;
        const p  = productsById.get(id);
        // si existe tarjeta en el grid, reutilizamos su flujo (muestra control de qty)
        const card = document.querySelector(`.card[data-id="${CSS.escape(id)}"]`);
        if (card && typeof switchToQtyControl === 'function'){
          const info = getCardInfo(card);
          switchToQtyControl(card, info.minQty, true);
        } else {
          // fallback: agregar directo al carrito con minQty
          const soldBy    = p.soldBy || 'unit';
          const step      = Number(p.step ?? (soldBy==='weight' ? 0.25 : 1));
          const minQty    = Number(p.minQty ?? step);
          const unitLabel = p.unitLabel || (soldBy==='weight' ? 'kg' : 'pza');
          cart.set(id, { id, name: p.name, unit: Number(p.price||0), qty: minQty, soldBy, unitLabel, step, minQty });
          renderCart();
        }
      }
    });
    favsRail.dataset.bound = '1';
  }
}

function bindFavsRailEvents(){
  if (btnFavsPrev) btnFavsPrev.addEventListener('click', () => favsRail?.scrollBy({ left: -320, behavior: 'smooth' }));
  if (btnFavsNext) btnFavsNext.addEventListener('click', () => favsRail?.scrollBy({ left:  320, behavior: 'smooth' }));
  if (btnFavsExpand) btnFavsExpand.addEventListener('click', () => { renderFavoritesModal(); openModal(modalFavs); });

  // Clicks dentro del rail (Agregar/Quitar)
  favsRail?.addEventListener('click', (e) => {
    const chip = e.target.closest('.fav-chip'); if (!chip) return;
    const id = chip.dataset.id;
    if (e.target.closest('.fav-add')) {
      // simular click en "Agregar" de la tarjeta (si existe) o añadir al carrito con minQty
      const p = productsById.get(id);
      if (!p || p.active === false) return;
      const card = document.querySelector(`.card[data-id="${CSS.escape(id)}"]`);
      if (card) {
        const add = card.querySelector('.btn.add:not(.unavailable)');
        if (add) { add.click(); return; }
      }
      // fallback: añadir directo
      const minQty = Number(p.minQty ?? (p.soldBy === 'weight' ? 0.25 : 1));
      const unitLabel = p.soldBy === 'weight' ? 'kg' : 'pza';
      cart.set(id, { id, name:p.name, unit:+Number(p.price||0), qty:minQty, soldBy:p.soldBy||'unit', unitLabel, step:Number(p.step|| (p.soldBy==='weight'?0.25:1)), minQty });
      renderCart(); syncCardsQty(id);
    }
    if (e.target.closest('.fav-remove')) {
      toggleFav(id);
      renderFavoritesRail();
      // Actualiza corazones
      updateAllCardHearts();
    }
  });
}

function renderFavoritesModal(){
  if (!favsModalList) return;
  const items = Array.from(favorites)
    .map(id => productsById.get(id))
    .filter(p => p && p.active !== false);
  favsModalList.innerHTML = items.map(p => {
    const img = (p.image && String(p.image).trim()) ? p.image : svgPlaceholder('Sin foto');
    const price = Number(p.price||0).toFixed(2);
    const unitLabel = (p.soldBy === 'weight') ? 'kg' : 'pza';
    return `
      <div class="favs-modal-card" data-id="${p.id}">
        <img src="${img}" alt="">
        <div class="meta">
          <h4>${p.name}</h4>
          <p class="p">$${price} <small>por ${unitLabel}</small></p>
        </div>
        <div class="actions">
          <button class="btn ghost favs-add">Agregar</button>
          <button class="btn btn-remove favs-remove">Quitar</button>
        </div>
      </div>
    `;
  }).join('');

  // Delegación de eventos
  favsModalList.addEventListener('click', favsModalClickHandler, { once: true });
}
function favsModalClickHandler(e){
  const card = e.target.closest('.favs-modal-card'); if (!card) return;
  const id = card.dataset.id;
  if (e.target.closest('.favs-add')){
    const p = productsById.get(id);
    if (!p || p.active === false) return;
    const minQty = Number(p.minQty ?? (p.soldBy === 'weight' ? 0.25 : 1));
    const unitLabel = p.soldBy === 'weight' ? 'kg' : 'pza';
    cart.set(id, { id, name:p.name, unit:+Number(p.price||0), qty:minQty, soldBy:p.soldBy||'unit', unitLabel, step:Number(p.step|| (p.soldBy==='weight'?0.25:1)), minQty });
    renderCart(); syncCardsQty(id);
  }
  if (e.target.closest('.favs-remove')){
    toggleFav(id);
    renderFavoritesModal();
    renderFavoritesRail();
    updateAllCardHearts();
  }
  // volver a escuchar (porque usamos once:true)
  favsModalList.addEventListener('click', favsModalClickHandler, { once: true });
}

// Cerrar modal favoritos con overlay o ✕
document.querySelectorAll('[data-close="favs"]').forEach(el => el.addEventListener('click', ()=> closeModal(modalFavs)));

function svgPlaceholder(text = 'Sin foto') {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120">
      <rect width="100%" height="100%" fill="#EEE"/>
      <text x="50%" y="50%" dominant-baseline="middle"
            text-anchor="middle" fill="#999" font-family="Arial" font-size="12">${text}</text>
    </svg>`;
  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
}

function renderProductGrid(products){
  if(!grid) return;
  const html = products.map(p => {
    const id    = p.id || p.name;
    const price = Number(p.price || 0);
    const img   = (p.image && String(p.image).trim()) ? p.image : svgPlaceholder('Sin foto');
    const cat   = p.category || '';
    const sub   = p.subcategory || '';
    const name  = p.name || '';
    const soldBy    = p.soldBy || 'unit';
    const unitLabel = p.unitLabel || (soldBy==='weight' ? 'kg' : 'pza');
    const step      = Number(p.step ?? (soldBy==='weight' ? 0.25 : 1));
    const minQty    = Number(p.minQty ?? step);

    const isAvailable = (p.active !== false); // ← aquí está la regla

    // (tu cálculo displayPrice igual que antes)
    let displayPrice = price;
    const allTiers =
      (Array.isArray(p?.bundlePricing?.tiers) && p.bundlePricing.tiers) ||
      (Array.isArray(p?.kgPricing?.tiers)     && p.kgPricing.tiers)     ||
      (Array.isArray(p?.priceCombos)          && p.priceCombos)         || null;
    if (allTiers) {
      const t1 = allTiers.find(t => Number(t.qty) === 1);
      if (t1) displayPrice = Number(t1.price) || price;
    }

    // Botón/estado segun disponibilidad
    const addLabel = isAvailable
      ? (soldBy === 'weight'
          ? ('Agregar ' + formatQty(minQty, step) + ' ' + unitLabel)
          : 'Agregar')
      : 'No disponible';

    const addClasses = isAvailable ? 'btn add' : 'btn add unavailable';
    const addAttrs   = isAvailable ? '' : ' aria-disabled="true" data-unavailable="1"';
// Dentro del map() de renderProductGrid:
return (
  '<article class="card' + (isAvailable ? '' : ' is-unavailable') + '"' +
    ' data-id="' + id + '"' +
    ' data-category="' + cat + '"' +
    ' data-subcategory="' + sub + '"' +
    ' data-soldby="' + soldBy + '"' +
    ' data-unitlabel="' + unitLabel + '"' +
    ' data-step="' + step + '"' +
    ' data-minqty="' + minQty + '"' +
    (isAvailable ? '' : ' data-available="0"') +
  '>' +
    // NUEVO: contenedor de imagen + corazón abajo-izquierda
    '<div class="media">' +
      '<img class="thumb" src="' + img + '" alt="' + name.replace(/"/g, '&quot;') + '">' +
      '<button class="fav-heart' + (isFav(id) ? ' is-fav' : '') + '"'+
              ' type="button" data-id="' + id + '" aria-pressed="' + (isFav(id) ? 'true':'false') + '"' +
              ' aria-label="Marcar favorito">' +
        favHeartSVG(isFav(id)) +
      '</button>' +
    '</div>' +

    '<div class="info">' +
      '<h3>' + name + '</h3>' +
      '<p class="price">$' + Number(displayPrice).toFixed(2) + '</p>' +
      '<button class="' + addClasses + '"' + addAttrs + '>' + addLabel + '</button>' +
    '</div>' +
  '</article>'
);
  }).join('');
  grid.innerHTML = html;
}

function buildCategoryFilters(products){
  if (categoriesMap && categoriesMap.size) return;
  const cats = new Set();
  const subsByCat = new Map();
  products.forEach(p => {
    const cat = p.category || '';
    const sub = p.subcategory || '';
    if (cat) cats.add(cat);
    if (cat && sub) {
      if (!subsByCat.has(cat)) subsByCat.set(cat, new Set());
      subsByCat.get(cat).add(sub);
    }
  });
  if (categorySelect){
    const current = categorySelect.value;
    categorySelect.innerHTML = `<option value="">Todas</option>` +
      Array.from(cats).sort().map(c => `<option>${c}</option>`).join('');
    if ([...cats, ''].includes(current)) categorySelect.value = current;
  }
  if (subcategorySelect){
    const cat = categorySelect?.value || '';
    const subs = subsByCat.get(cat) || new Set();
    subcategorySelect.innerHTML = `<option value="">Todas</option>` +
      Array.from(subs).sort().map(s => `<option>${s}</option>`).join('');
    subcategorySelect.disabled = !cat;
  }
}

function bindAddButtons(){
  document.querySelectorAll('.card').forEach(card => {
    const addBtn = card.querySelector('.btn.add');
    if (!addBtn || addBtn.dataset.bound === '1') return;

    // Si el producto está marcado como no disponible, no enlazar evento
    if (addBtn.classList.contains('unavailable') || card.dataset.available === '0') {
      addBtn.disabled = true; // por si acaso
      return;
    }

    addBtn.dataset.bound = '1';
    addBtn.addEventListener('click', () => {
      const info = getCardInfo(card);
      switchToQtyControl(card, info.minQty, true);
    });
  });
}
function bindFavoriteToggles(){
  document.querySelectorAll('.card .fav-toggle').forEach(btn => {
    if (btn.dataset.bound === '1') return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', () => {
      const card = btn.closest('.card'); if (!card) return;
      const id = card.dataset.id;
      toggleFav(id);
      // UI heart
      btn.classList.toggle('active', isFav(id));
      btn.setAttribute('aria-pressed', isFav(id) ? 'true' : 'false');
      btn.innerHTML = favHeartSVG(isFav(id));
      // rail + modal
      renderFavoritesRail();
    });
  });
}

function updateAllCardHearts(){
  document.querySelectorAll('.card').forEach(card => {
    const id = card.dataset.id;
    const btn = card.querySelector('.fav-toggle');
    if (!btn) return;
    const active = isFav(id);
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', active ? 'true':'false');
    btn.innerHTML = favHeartSVG(active);
  });
}

/* == 8) CARRITO == */
function renderCart(){
  const items = Array.from(cart.values());
  cartList.innerHTML = '';

  let subtotal = 0;
  items.forEach(it=>{
    const pricing = bestPriceById(it.id, it.qty);
    const line = pricing.total;
    subtotal += line;

    const li = document.createElement('li');
    li.className = 'cart-item';
    li.dataset.id = it.id;
    li.innerHTML = `
      <div class="row">
        <span class="name">${it.name}</span>
        <span class="unit">${money(it.unit)}</span>
      </div>
      <div class="row">
        <div class="qty">
          <button class="chip cart-minus">-</button>
          <span class="count">${
            it.soldBy === 'weight'
              ? `${formatQty(it.qty, it.step)} ${it.unitLabel}`
              : `${formatQty(it.qty, 1)}`
          }</span>
          <button class="chip cart-plus">+</button>
        </div>
        <span class="line-total">${money(line)}</span>
      </div>
    `;

    if (pricing.pricingMode === 'combos' && pricing.breakdown?.length){
      const unitLbl = (it.soldBy === 'weight') ? (it.unitLabel || 'kg') : 'pz';
      const parts = pricing.breakdown.map(b => `${b.times}×${b.qty} ${unitLbl} = $${b.price.toFixed(2)}`).join('  ·  ');
      const note = document.createElement('div');
      note.className = 'combo-note';
      note.style.cssText = 'font-size:.85rem;color:#64748b;margin-top:2px;';
      // note.textContent = `Combos: ${parts}`;
      li.appendChild(note);
    }

    cartList.appendChild(li);
  });

  document.getElementById('cartTotal').textContent = money(+subtotal.toFixed(2));

  const totalQty = items.reduce((a,b)=> a + b.qty, 0);
  cartBadge.textContent = totalQty;
  cartBadge.style.display = totalQty ? '' : 'none';

  btnContinue.disabled = totalQty === 0;
  if (btnClearCart) btnClearCart.disabled = totalQty === 0;

  const needsScroll = items.length > 4;
  cartList.classList.toggle('scroll', needsScroll);

  if (needsScroll) {
    const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
    cartList.style.maxHeight = Math.floor(vh * 0.48) + 'px';
    cartList.style.overflowY = 'auto';
  } else {
    cartList.style.maxHeight = '';
    cartList.style.overflowY = '';
  }
  saveCart();
  updateCheckoutTotalPill();
  fsShowOnAdd = true;
  updateFreeShippingPromo();
}

window.addEventListener('resize', () => {
  const needsScroll = (cartList.querySelectorAll('.cart-item').length > 4);
  cartList.classList.toggle('scroll', needsScroll);
  if (needsScroll) {
    const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
    cartList.style.maxHeight = Math.floor(vh * 0.48) + 'px';
  } else {
    cartList.style.maxHeight = '';
  }
});

function clearCart() {
  if (!cart.size) return;
  if (!confirm('¿Vaciar todo el carrito?')) return;
  cart.clear();
  renderCart();
  document.querySelectorAll('.card').forEach(card => {
    const qtyCtrl = card.querySelector('.qty-control');
    if (qtyCtrl) qtyCtrl.replaceWith(createAddButton(card));
  });
}

cartList.addEventListener('click', (e) => {
  const minus = e.target.closest('.cart-minus');
  const plus  = e.target.closest('.cart-plus');
  if (!minus && !plus) return;

  const li = e.target.closest('.cart-item');
  if (!li) return;
  const id = li.dataset.id;
  const item = cart.get(id);
  if (!item) return;

  const step   = (typeof item.step === 'number' && item.step > 0) ? item.step : 1;
  const minQty = (typeof item.minQty === 'number' && item.minQty > 0)
                  ? item.minQty
                  : ((item.soldBy === 'weight') ? 0.25 : 1);

  const snap = (n) => +n.toFixed(3);
  const clampUnits = (n) => Math.max(1, Math.round(n));

  if (plus) {
    let q = snap((item.qty || minQty) + step);
    if (item.soldBy !== 'weight') q = clampUnits(q);
    item.qty = q;
    cart.set(id, item);
    renderCart();
    syncCardsQty(id);
    return;
  }

  if (minus) {
    const next = snap((item.qty || minQty) - step);
    if (next < (minQty - 1e-6)) {
      if (confirm('¿Eliminar este artículo del carrito?')) {
        cart.delete(id);
        renderCart();
        syncCardsQty(id);
      }
    } else {
      let q = next;
      if (item.soldBy !== 'weight') q = clampUnits(q);
      item.qty = q;
      cart.set(id, item);
      renderCart();
      syncCardsQty(id);
    }
  }
});

/* == 9) BOTONES EN TARJETAS == */
function createAddButton(card){
  const info = getCardInfo(card);
  const btn = document.createElement('button');
  btn.className = 'btn add';
  btn.textContent = (info.soldBy === 'weight')
    ? `Agregar ${formatQty(info.minQty, info.step)} ${info.unitLabel}`
    : 'Agregar';
  btn.addEventListener('click', () => switchToQtyControl(card, info.minQty, true));
  return btn;
}

function createQtyControl(card, qty){
  const control = document.createElement('div');
  control.className = 'qty-control';
  const { id, name, unit, soldBy, unitLabel, step, minQty } = getCardInfo(card);
  const isDecimal = (step % 1) !== 0;
  const fmt = v => isDecimal ? (+v).toFixed(2).replace(/\.00$/,'') : String(v);

  const btnMinus = document.createElement('button'); btnMinus.textContent = '−';
  const spanQty  = document.createElement('span');   spanQty.textContent  = fmt(qty);
  const btnPlus  = document.createElement('button'); btnPlus.textContent  = '+';

  control.append(btnMinus, spanQty, btnPlus);

  btnPlus.addEventListener('click', () => {
    const cur = cart.get(id) || { id, name, unit, soldBy, unitLabel, step, minQty, qty: 0 };
    cur.qty = +(cur.qty + step).toFixed(3);
    if (soldBy === 'unit') cur.qty = Math.round(cur.qty);
    cart.set(id, cur);
    spanQty.textContent = fmt(cur.qty);
    fsShowOnAdd = true;           // ← también cuenta como "agregar"
    renderCart();
  });

  btnMinus.addEventListener('click', () => {
    const cur = cart.get(id) || { id, name, unit, soldBy, unitLabel, step, minQty, qty: 0 };
    const next = +(cur.qty - step).toFixed(3);
    if (next < minQty + 1e-6) {
      if (confirm('¿Eliminar este artículo del carrito?')) {
        cart.delete(id);
        renderCart();
        control.replaceWith(createAddButton(card));
      }
    } else {
      cur.qty = next;
      if (soldBy === 'unit') cur.qty = Math.max(1, Math.round(cur.qty));
      cart.set(id, cur);
      spanQty.textContent = fmt(cur.qty);
      renderCart();
    }
  });

  return control;
}

function switchToQtyControl(card, startQty = 1, addToCart = false){
  const info = getCardInfo(card);
  const prod = productsById.get(info.id);
  if (prod && prod.active === false) return; // ← no permitir

  const start = addToCart ? info.minQty : (cart.get(info.id)?.qty || info.minQty);
  if (addToCart) {
    cart.set(info.id, { ...info, qty: start });
    renderCart();
  }
  const addBtn = card.querySelector('.btn.add');
  const control = createQtyControl(card, cart.get(info.id)?.qty || start);
  if (addBtn) addBtn.replaceWith(control);
}

function syncCardsQty(id){
  document.querySelectorAll('.card').forEach(card => {
    const info = getCardInfo(card);
    if (info.id !== id) return;

    const item = cart.get(id);
    const qtyControl = card.querySelector('.qty-control');

    if (item) {
      if (!qtyControl) {
        switchToQtyControl(card, item.qty, false);
      } else {
        const span = qtyControl.querySelector('span');
        if (span) {
          span.textContent = (item.soldBy === 'weight') 
            ? formatQty(item.qty, item.step)
            : formatQty(item.qty, 1);
        }
      }
    } else {
      if (qtyControl) qtyControl.replaceWith(createAddButton(card));
    }
  });
}

/* == 10) FILTROS == */
function showEmpty(msg){
  emptyState.textContent = msg;
  emptyState.classList.remove('hidden');
}
function hideEmpty(){
  emptyState.textContent = '';
  emptyState.classList.add('hidden');
}
function getCards(){
  return Array.from(document.querySelectorAll('.card'));
}

function applyFilters(){
  const searchVal = normalize(searchInput.value);
  const cards = getCards();
  let visibleCount = 0;

  if (searchVal) {
    hideEmpty();
    if (categorySelect.value !== '' || subcategorySelect.value !== '') {
      categorySelect.value = '';
      subcategorySelect.value = '';
      subcategorySelect.disabled = true;
    }
    cards.forEach(card => {
      const name = normalize(card.querySelector('h3')?.textContent);
      const match = name.includes(searchVal);
      card.style.display = match ? '' : 'none';
      if (match) visibleCount++;
    });
    if (visibleCount === 0){
      showEmpty('Verifique que escribió bien el nombre del producto | Posiblemente no haya inventario de este producto. Estamos trabajando para agregarlo a la lista.');
    } else {
      hideEmpty();
    }
    // 👇 ACTUALIZA CORAZONES ANTES DE SALIR
    updateAllCardHearts();
    return;
  }

  const catVal = categorySelect.value;
  const hasCategory = !!catVal;
  subcategorySelect.disabled = !hasCategory;
  if (!hasCategory) subcategorySelect.value = '';

  cards.forEach(card => {
    const cardCat = card.getAttribute('data-category') || '';
    const cardSub = card.getAttribute('data-subcategory') || '';
    let show = true;

    if (hasCategory) {
      show = (cardCat === catVal);
      if (show && subcategorySelect.value) {
        show = (cardSub === subcategorySelect.value);
      }
    }
    card.style.display = show ? '' : 'none';
    if (show) visibleCount++;
  });

  if (!hasCategory) {
    if (visibleCount === 0) { showEmpty('Por el momento no hay productos para mostrar.'); }
    else { hideEmpty(); }
  } else {
    if (visibleCount === 0) {
      if (subcategorySelect.value) showEmpty('Aún no contamos con artículos en esta subcategoría. Estamos trabajando constantemente para ir agregando más artículos.');
      else showEmpty('Aún no contamos con artículos en esta categoría. Estamos trabajando constantemente para ir agregando más artículos.');
    } else { hideEmpty(); }
  }
  // 👇 ACTUALIZA CORAZONES AL TERMINAR
  updateAllCardHearts();
}

/* == 11) CARGA: productos, categorías, zonas, servicio == */
async function loadCategories() {
  try {
    const { json } = await fetchFirstOk(API.categorias);
    const list = Array.isArray(json) ? json : (Array.isArray(json.categories) ? json.categories : []);
    if (!list.length) throw new Error('categorias.json vacío o con formato inesperado');
    categoriesMap = new Map();
    list.forEach(item => {
      const name = item.name || item.category || '';
      const subs = Array.isArray(item.subcategories) ? item.subcategories
                : Array.isArray(item.subs) ? item.subs
                : [];
      if (name) categoriesMap.set(name, subs);
    });
    fillCategorySelectFromMap();
    console.info('Categorías cargadas:', categoriesMap.size);
  } catch (e) {
    categoriesMap = null;
    console.warn('No se cargó categorias.json. Usaremos categorías derivadas de productos.');
  }
}

async function loadProducts() {
  try {
    // Intentar todas las URLs y quedarnos con la lista más completa
    const urls = API.productos;
    const results = await Promise.allSettled(urls.map(u => fetchNoCache(u).then(r => r.ok ? r.json() : Promise.reject())));
    
    // Extrae arrays válidos
    const arrays = results
      .map(r => (r.status === 'fulfilled' ? r.value : null))
      .filter(Boolean)
      .map(json => Array.isArray(json) ? json : (Array.isArray(json.products) ? json.products : []))
      .filter(arr => Array.isArray(arr));

    if (!arrays.length) throw new Error('No se pudo leer productos desde ninguna fuente');

    // Merge por id (o name si no hay id)
    const byId = new Map();
    const dupes = new Set();

    const toBoolActive = (v) => {
      // Normaliza active: false/0/"0"/"false" => false
      if (v === false) return false;
      if (v === 0) return false;
      if (typeof v === 'string') {
        const s = v.trim().toLowerCase();
        if (s === '0' || s === 'false' || s === 'no') return false;
      }
      return true; // default
    };

    arrays.forEach(list => {
      list.forEach(raw => {
        const id = (raw.id ?? raw.name)?.toString() ?? '';
        if (!id) return;

        // Si ya existe, lo marcamos como duplicado para revisión
        if (byId.has(id)) dupes.add(id);

        // Clona y normaliza lo mínimo
        const p = { ...raw };
        p.id = id;
        // Asegura active consistente
        p.active = toBoolActive(p.active);

        byId.set(id, p);
      });
    });

    const all = Array.from(byId.values());
    const normalized = all.map(p => ({ ...p, active: (p.active !== false) }));
    const visible = normalized;

    // Índice y render
    productsById.clear();
    visible.forEach(p => productsById.set(p.id, p));

    renderProductGrid(visible);
    buildCategoryFilters(visible);
    bindAddButtons();
    bindFavoriteToggles();
    applyFilters();
    renderFavoritesRail();

    console.info(
      'Productos (merge) | Fuentes OK:', arrays.length,
      '| Total:', all.length,
      '| Activos:', visible.length,
      dupes.size ? `| Duplicados id: ${Array.from(dupes).slice(0,5).join(', ')}${dupes.size>5?'…':''}` : ''
    );
  } catch (e) {
    console.error('loadProducts() merge error', e);
    // Fallback de demostración (tu bloque demo existente)
    const demo = [
      { id:'Coca-Cola 2.5lt Retornable', name: 'Coca-Cola 2.5lt Retornable', price: 40, category: 'Sodas', subcategory: 'Coca-Cola', image: 'https://via.placeholder.com/120', active: true, soldBy:'unit' },
      { id:'Coca-Cola 1.5lt Retornable', name: 'Coca-Cola 1.5lt Retornable', price: 28, category: 'Sodas', subcategory: 'Coca-Cola', image: 'https://via.placeholder.com/120', active: true, soldBy:'unit' }
    ];
    demo.forEach(p=>productsById.set(p.id, p));
    renderProductGrid(demo);
    buildCategoryFilters(demo);
    bindAddButtons();
    applyFilters();
  }
}

/* ******************  CORREGIDO  ****************** */
async function loadZones() {
  try {
    const { url, json } = await fetchFirstOk(API.zonas);
    let zonas = [];
    if (Array.isArray(json)) {
      zonas = json;
    } else if (json && typeof json === 'object') {
      const keys = ['zonas','zones','items','data','records','rows'];
      for (const k of keys) {
        if (Array.isArray(json[k])) { zonas = json[k]; break; }
      }
      if (!zonas.length && Object.values(json).every(v => typeof v === 'number')) {
        zonas = Object.entries(json).map(([nombre, costo]) => ({ nombre, costo }));
      }
    }
    if (!Array.isArray(zonas) || !zonas.length) {
      throw new Error('zonas vacío o con formato inesperado');
    }

    // ✅ Acepta 2 formatos:
    // (A) nuevo panel: { nombre, costo, freeShipping: true, freeMin: 149 }
    // (B) anterior:    { nombre, costo, freeShippingThreshold: 149 } o free_threshold
    ZONES = zonas.map(z => {
      const nombre = String(z.nombre ?? z.name ?? '');
      const costo  = Number(z.costo ?? z.cost ?? z.price ?? 0);

      const hasFlag = (z.freeShipping === true) || (z.envioGratis === true);
      const minFlag = Number(z.freeMin ?? z.minimoGratis ?? 0);
      const legacy  = Number(z.freeShippingThreshold ?? z.free_threshold ?? 0);

      // Si viene el flag + mínimo válido, úsalo; si no, cae al legacy; si no, 0
      const threshold = hasFlag && minFlag > 0 ? minFlag : (legacy > 0 ? legacy : 0);

      return { nombre, costo, freeShippingThreshold: threshold };
    }).filter(z => z.nombre);

    zonesByName.clear();
    ZONES.forEach(z => zonesByName.set(z.nombre, { cost: z.costo, threshold: z.freeShippingThreshold }));

    // Pinta el select con data-th correcto
    zone.innerHTML = [
      '<option value="">Selecciona una zona…</option>',
      ...ZONES.map(z =>
        `<option value="${z.nombre}|${z.costo.toFixed(2)}" data-th="${z.freeShippingThreshold || 0}">` +
        `${z.nombre} — $${z.costo.toFixed(2)}</option>`
      )
    ].join('');

    console.info('Zonas cargadas desde:', url, 'Total:', ZONES.length);
  } catch (e) {
    console.warn('loadZones()', e);
    ZONES = [
      { nombre: 'Montecarlo', costo: 15, freeShippingThreshold: 149 },
      { nombre: 'Haciendas',  costo: 20, freeShippingThreshold: 0 },
      { nombre: 'Privadas del Roble', costo: 25, freeShippingThreshold: 0 },
    ];
    zonesByName.clear();
    ZONES.forEach(z => zonesByName.set(z.nombre, { cost: z.costo, threshold: z.freeShippingThreshold }));

    zone.innerHTML = [
      '<option value="">Selecciona una zona…</option>',
      ...ZONES.map(z =>
        `<option value="${z.nombre}|${z.costo.toFixed(2)}" data-th="${z.freeShippingThreshold || 0}">` +
        `${z.nombre} — $${z.costo.toFixed(2)}</option>`
      )
    ].join('');
  }
}
/* ************************************************** */

async function loadServiceStatus(){
  try{
    const { json } = await fetchFirstOk(API.servicio);
    const data = Array.isArray(json) ? {} : (json || {});
    return {
      active: data.active !== false,
      message: data.message || '',
      image: data.image || ''
    };
  }catch(_){
    return { active: true, message: '', image: '' };
  }
}

/* == 12) EVENTOS GLOBALES == */
categorySelect.addEventListener('change', () => {
  if (categoriesMap && categoriesMap.size && categorySelect.value) {
    fillSubcategorySelectFromMap(categorySelect.value);
  } else {
    subcategorySelect.disabled = !categorySelect.value;
  }
  applyFilters();
});
subcategorySelect.addEventListener('change', applyFilters);
searchInput.addEventListener('input', applyFilters);

btnCart.addEventListener('click', () => {
  openModal(modalCart);
  toggleContinueButton();
});

let transferNoticeShown = false;

btnContinue.addEventListener('click', () => {
  if (btnContinue.disabled) return;
  closeModal(modalCart);
  transferNoticeShown = false;
  openModal(modalCheckout);
});

btnConfirmNo?.addEventListener('click', () => closeModal(modalConfirm));
btnConfirmYes?.addEventListener('click', () => {
  if (typeof clearCart === 'function') clearCart();
  else {
    cart.clear();
    renderCart();
    document.querySelectorAll('.card .qty-control')?.forEach(q => {
      const card = q.closest('.card');
      q.replaceWith(createAddButton(card));
    });
  }
  resetCheckoutForm();
  closeModal(modalConfirm);
  closeModal(modalCheckout);
});

document.querySelectorAll('[data-close="cart"]').forEach(el=> el.addEventListener('click', ()=> closeModal(modalCart)));
document.querySelectorAll('[data-close="checkout"]').forEach(el=> el.addEventListener('click', ()=> closeModal(modalCheckout)));
document.querySelectorAll('[data-close="confirm"]').forEach(el=> el.addEventListener('click', ()=> closeModal(modalConfirm)));

btnCancel.addEventListener('click', () => closeModal(modalCheckout));

checkoutForm.addEventListener('input', validateCheckout);
checkoutForm.addEventListener('change', validateCheckout);
checkoutForm.addEventListener('input', saveCheckout);
checkoutForm.addEventListener('change', saveCheckout);

// Aviso Transferencia
function attachTransferNotice() {
  if (!checkoutForm) return;
  const radios = checkoutForm.querySelectorAll('input[name="pay"]');
  radios.forEach(r => {
    r.addEventListener('change', (e) => {
      const v = e.target.value;
      if (v === 'Transferencia') {
        if (!transferNoticeShown) {
          if (modalTransfer) openModal(modalTransfer);
          transferNoticeShown = true;
        }
      } else {
        transferNoticeShown = false;
      }
    });
  });
}
attachTransferNotice();

/* == FREE SHIPPING: helpers y UI == */
function getCartSubtotalFast(){
  const txt = document.getElementById('cartTotal')?.textContent || '$0.00';
  return parseFloat(txt.replace(/[^0-9.]/g,'')) || 0;
}
function getSelectedZoneInfo(){
  const val = zone.value || '';
  if (!val) return { name:'', cost:0, threshold:0 };
  const [name, costStr] = val.split('|');
  const opt = zone.selectedOptions?.[0];
  const th  = opt ? Number(opt.dataset.th || 0) : (zonesByName.get(name)?.threshold || 0);
  const cost = parseFloat(costStr || '0') || 0;
  return { name, cost, threshold: th };
}
function computeShippingWithThreshold(subtotal){
  const { cost, threshold } = getSelectedZoneInfo();
  if (threshold > 0 && subtotal >= threshold) return 0;
  return cost;
}
function updateFreeShippingPromo(){
  if (!fsPill) return;

  const { name, threshold } = getSelectedZoneInfo();
  const subtotal = getCartSubtotalFast();
  // Si no hay zona o no hay umbral, ocultamos el toast.
  if (!name || !(threshold > 0)) {
    fsPill.classList.remove('show');
    fsPill.classList.add('hidden');
    return;
  }
  let progress = Math.max(0, Math.min(100, Math.round((subtotal / threshold) * 100)));
  const remaining = Math.max(0, threshold - subtotal);

  if (remaining > 0){
    fsMsg.innerHTML = `Agrega <strong>${currency(remaining)}</strong> al carrito para Envío <strong>GRATIS</strong>.`;
  } else {
    fsMsg.innerHTML = `¡Genial! Obtienes <strong>ENVÍO GRATIS</strong>.
    Aprovecha y Agrega más productos a tu carrito.`;
    progress = 100;
  }
  fsBar.style.width = progress + '%';
  fsPill.classList.remove('is-red','is-amber','is-green');
  if (progress < 40) fsPill.classList.add('is-red');
  else if (progress < 100) fsPill.classList.add('is-amber');
  else fsPill.classList.add('is-green');

  // Mostrar como "toast" solo en acciones clave:
  // - si el usuario acaba de agregar productos
  // - si cambió la zona (veremos un trigger desde el listener de zone)
  if (fsShowOnAdd) {
    showFsToastOnce();
    fsShowOnAdd = false; // consumir bandera
  }
}

zone.addEventListener('change', () => {
  validateCheckout();
  updateCheckoutTotalPill();
  fsShowOnAdd = true;           // ← fuerza mostrar el toast con la nueva info
  updateFreeShippingPromo();
});

/* == 13) WHATSAPP == */
checkoutForm.addEventListener('submit', (e) => {
  e.preventDefault();
  validateCheckout();
  if (!checkoutForm.checkValidity()) {
    checkoutForm.reportValidity();
    return;
  }
  const items = getCartItemsDetailed();
  const subtotal = items.reduce((acc, it)=> acc + it.line, 0);

  const { name: zoneName } = getSelectedZoneInfo();
  const shipping = computeShippingWithThreshold(subtotal);

  const pay = checkoutForm.querySelector('input[name="pay"]:checked')?.value || 'Efectivo';
  const base = subtotal + shipping;
  const totalDue = pay === 'Tarjeta' ? +(base * 1.043).toFixed(2) : +base.toFixed(2);

  const addressText = address.value.trim();

  let efectivo = null;
  if (pay === 'Efectivo') {
    const pagaCon = parseFloat(cashGiven.value || '0') || 0;
    const cambio  = +(pagaCon - totalDue).toFixed(2);
    efectivo = { pagaCon, cambio };
  }

  const ticket = buildTicket({
    items,
    zoneName,
    shipping,
    pay,
    subtotal,
    totalDue,
    address: addressText,
    efectivo,
  });

  openWhatsAppWithMessage(ticket);
  openModal(modalConfirm);
});

function getCartItemsDetailed(){
  const items = [];
  for (const it of cart.values()){
    items.push({
      id: it.id,
      name: it.name,
      unit: Number(it.unit),
      qty: Number(it.qty),
      line: bestPriceById(it.id, it.qty).total,
      soldBy: it.soldBy,
      unitLabel: it.unitLabel,
      step: it.step
    });
  }
  return items;
}

function buildTicket({ items, zoneName, shipping, pay, subtotal, totalDue, address, efectivo }) {
  const lines = [];

  lines.push('*KaChu Domicilio*');
  lines.push('');

  if (items && items.length) {
    lines.push('*Artículos:*');
    items.forEach(it => {
      const prod = productsById.get(it.id);
      const pricing = prod ? computeBestPriceRaw(prod, it.qty) : { total: it.line, breakdown: [] };
      const unitTxt = (it.soldBy === 'weight') ? (it.unitLabel || 'kg') : 'pza';

      lines.push(`* ${it.name}`);
      if (pricing.breakdown?.length) {
        pricing.breakdown.forEach(b => {
          lines.push(`> ${b.times} × ${b.qty} ${unitTxt} = $${Number(b.price).toFixed(2)}`);
        });
        if (pricing.adjusted && it.soldBy === 'weight') {
          lines.push(`> Ajustado a ${pricing.qty} ${unitTxt} para cuadrar combos`);
        }
        lines.push(`> Total: $${Number(pricing.total).toFixed(2)}`);
      } else {
        const u = Number(it.unit).toFixed(2);
        const l = Number(it.line).toFixed(2);
        const qtyTxt = (it.soldBy === 'weight')
          ? `${formatQty(it.qty, it.step)} ${unitTxt}`
          : `${formatQty(it.qty, 1)}`;
        lines.push(`> ${qtyTxt} x $${u} = $${l}`);
      }
      lines.push('');
    });
  }

  const isFree = Number(shipping) === 0;
  const envioTag = isFree ? `${zoneName || 'Zona'}` : (zoneName || 'Zona');

  lines.push(`*Subtotal:* $${Number(subtotal).toFixed(2)}`);
  lines.push(`*Envío:* (${envioTag}) $${Number(shipping).toFixed(2)}`);
  lines.push(`*Total a pagar:* $${Number(totalDue).toFixed(2)}`);
  lines.push('');

  lines.push(`*Pago:* ${pay}`);
  if (efectivo) {
    lines.push(`*Paga con:* $${Number(efectivo.pagaCon).toFixed(2)}`);
    lines.push(`*Cambio:* $${Number(efectivo.cambio).toFixed(2)}`);
  }
  lines.push('');
  if (address) {
    lines.push('*Dirección de entrega:*');
    lines.push(`> ${address}`);
    lines.push('');
  }
  lines.push('*Aviso:* _Hemos recibido tu solicitud, en un máximo de *15min-20min* te estaríamos entregando tu pedido_');
  lines.push('');
  if (pay === 'Transferencia') {
    lines.push('');
    lines.push('*Aviso:* _Pago Transferencia_');
    lines.push('> Con *este método de pago* la *entrega* de tu pedido puede *tardar un poco más de lo establecido.*');
    lines.push('> Esperamos la captura de tu transferencia, cuando se *refleje el pago* en nuestra Banca *procedemos a enviar* tu pedido');
  }
  lines.push(' ```Gracias por tu compra...``` ');
  return lines.join('\n');
}

const STORE_WHATSAPP = '528135697787';
function openWhatsAppWithMessage(text){
  const base = STORE_WHATSAPP
    ? `https://wa.me/${STORE_WHATSAPP}?text=`
// eslint-disable-next-line no-useless-escape
    : `https://wa.me/?text=`;
  const url = base + encodeURIComponent(text);
  window.open(url, '_blank', 'noopener');
}

/* == 14) CHECKOUT == */
function toggleContinueButton(){
  const items = cartList.querySelectorAll('.cart-item').length;
  btnContinue.disabled = items === 0;
  cartBadge.style.display = items === 0 ? 'none' : '';
}

function validateCheckout() {
  const zoneOk    = zone.value.trim() !== '';
  const pay       = checkoutForm.querySelector('input[name="pay"]:checked')?.value || '';
  const addressOk = address.value.trim().length > 0;

  const subtotal = getCartSubtotalFast();
  const shipping = computeShippingWithThreshold(subtotal);
  const base = subtotal + shipping;
  const totalDue = pay === 'Tarjeta' ? +(base * 1.043).toFixed(2) : +base.toFixed(2);

  let cashOk = true;
  if (pay === 'Efectivo') {
    const raw  = cashGiven.value.trim();
    const cash = parseFloat(raw);
    let msg = '';

    if (!raw.length) {
      cashOk = false; msg = 'Con este dato calcularemos tu feria/cambio.';
    } else if (isNaN(cash)) {
      cashOk = false; msg = 'Coloca un número válido (ej. 500.00).';
    } else if (cash < totalDue) {
      cashOk = false; msg = `El efectivo ingresado no cubre el total ($${totalDue.toFixed(2)}).`;
    }

    if (!cashOk) {
      cashGiven.setCustomValidity(msg);
      if (cashHelp) { cashHelp.textContent = msg; cashHelp.classList.add('show'); }
    } else {
      cashGiven.setCustomValidity('');
      if (cashHelp) { cashHelp.textContent = ''; cashHelp.classList.remove('show'); }
    }
  } else {
    cashGiven.setCustomValidity('');
    if (cashHelp) { cashHelp.textContent = ''; cashHelp.classList.remove('show'); }
  }

  btnWhatsApp.disabled = !(zoneOk && pay && addressOk && cashOk);
  updateCheckoutTotalPill();
}

function resetCheckoutForm() {
  if (zone) zone.selectedIndex = 0;
  if (address) address.value = '';
  if (cashGiven) cashGiven.value = '';
  checkoutForm.querySelectorAll('input[name="pay"]').forEach(r => (r.checked = false));
  cashField.classList.add('hidden');
  localStorage.removeItem(CHECKOUT_KEY);
  validateCheckout();
  updateCheckoutTotalPill?.();
}

function updateCheckoutTotalPill(){
  if (!checkoutTotalPill) return;
  const subtotal = getCartSubtotalFast();
  const shipping = computeShippingWithThreshold(subtotal);
  const pay = checkoutForm.querySelector('input[name="pay"]:checked')?.value || '';
  const base = subtotal + shipping;
  const totalDue = pay === 'Tarjeta' ? +(base * 1.043).toFixed(2) : +base.toFixed(2);
  checkoutTotalPill.textContent = `Total: $${totalDue.toFixed(2)}`;
}

checkoutForm.addEventListener('change', () => {
  const pay = checkoutForm.querySelector('input[name="pay"]:checked')?.value;
  cashField.classList.toggle('hidden', pay !== 'Efectivo');
  validateCheckout();
});

/* == 15) INIT == */
window.addEventListener('DOMContentLoaded', async () => {
  (function fixTopbarOffset(){
    const topbar = document.querySelector('.topbar');
    if (!topbar) return;
    const applyOffset = () => {
      const h = topbar.offsetHeight || 0;
      document.body.classList.add('has-fixed-topbar');
      document.body.style.setProperty('--topbar-h', h + 'px');
    };
    window.addEventListener('load', applyOffset);
    window.addEventListener('resize', applyOffset);
    if (document.readyState !== 'loading') applyOffset();
  })();

  try {
    const service = await loadServiceStatus();
    if (!service.active) {
      showServiceOverlay(service);
      return;
    }
  } catch (err) {
    console.error('Service status error', err);
  }

  loadCart();
  renderCart();
  validateCheckout();
  loadCheckout();
// ⬇️ NUEVO
  loadFavs();
  bindFavsRailEvents();
  try {
    await Promise.all([ loadCategories(), loadProducts(), loadZones() ]);
    Array.from(cart.keys()).forEach(id => syncCardsQty(id));
    toggleContinueButton();
    updateFreeShippingPromo();   // estado inicial (si ya hay zona guardada)
    // ⬇️ NUEVO: inicial pintado del rail
    renderFavoritesRail();
    updateAllCardHearts();
    if (zone.value && (cart.size > 0)) {
      fsShowOnAdd = true;
      updateFreeShippingPromo();
    }
  } catch (e) {
    console.error(e);
  }
});

/* == Social FABs == */
(function(){
  function closeAll(except=null){
    document.querySelectorAll('.social-fabs .fab').forEach(f=>{
      if (except && f===except) return;
      f.classList.remove('open');
      const btn = f.querySelector('.fab-btn');
      if (btn) btn.setAttribute('aria-expanded','false');
      const title = f.querySelector('.fab-title');
      if (title) title.textContent = title.getAttribute('data-name') || title.textContent;
    });
  }
  function initAlternator(fab){
    const title = fab.querySelector('.fab-title');
    if (!title) return;
    const name = title.getAttribute('data-name') || title.textContent.trim();
    const alt  = 'click aquí';
    setInterval(() => {
      if (!fab.classList.contains('open')) { title.textContent = name; return; }
      title.textContent = (title.textContent === name) ? alt : name;
    }, 2400);
  }
  function initFab(fab){
    const btn = fab.querySelector('.fab-btn');
    if (!btn) return;
    initAlternator(fab);
    const toggle = () => {
      if (fab.classList.contains('open')){
        fab.classList.remove('open'); btn.setAttribute('aria-expanded','false');
      } else {
        closeAll(fab);
        fab.classList.add('open');    btn.setAttribute('aria-expanded','true');
      }
    };
    btn.addEventListener('click', toggle);
    btn.addEventListener('keydown', (e)=>{ if (e.key==='Enter' || e.key===' ') { e.preventDefault(); toggle(); } });
  }
  function initRail(){
    const rail = document.querySelector('.social-fabs');
    if (!rail) return;
    rail.querySelectorAll('.fab').forEach(initFab);
    document.addEventListener('click', (e)=>{ if (!rail.contains(e.target)) closeAll(); });
  }
  if (document.readyState==='loading'){ window.addEventListener('DOMContentLoaded', initRail); }
  else { initRail(); }
})();

/* == 16) OVERLAY SERVICIO OFF == */
function showServiceOverlay({ message, image }){
  const overlay = document.createElement('div');
  overlay.className = 'service-overlay';
  overlay.innerHTML = `
    <div class="service-card">
      ${image ? `<img src="${image}" alt="">` : ''}
      <h1>${message || 'Servicio temporalmente no disponible'}</h1>
      ${!image ? `<p>Gracias por tu comprensión.</p>` : ''}
    </div>
  `;
  document.body.appendChild(overlay);
  document.body.classList.add('service-blocked');
}
