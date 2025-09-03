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

const cashHelp = document.getElementById('cashHelp');

/* == 2) CARGA DE DATOS: Endpoints + fetch con fallback == */
// --- API primero; estáticos como respaldo ---
const API = {
  productos:  ['/api/data/productos',  '/public/data/productos.json',  '/data/productos.json',  'productos.json'],
  categorias: ['/api/data/categorias', '/public/data/categorias.json', '/data/categorias.json', 'categorias.json'],
  zonas:      ['/api/data/zonas',      '/public/data/zonas.json',      '/data/zonas.json',      'zonas.json'],
  servicio:   ['/api/data/servicio',   '/public/data/servicio.json',   '/data/servicio.json',   'servicio.json'],
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
  //const id = name; // mantenemos id = nombre (compatibilidad)
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
// ======= MOTOR DE PRECIOS (combos por kg y por pieza) =======
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
  // Aseguramos que la cantidad esté "snap" al step y respete minQty, PERO sin ajustar hacia arriba por combos
  const qty = clampQtyToStepAndMin(qtyRaw, cfg);

  // Sin combos => precio lineal base (sin ajuste, sin desglose)
  const hasTiers = Array.isArray(cfg.tiers) && cfg.tiers.length > 0;
  if (!hasTiers){
    const total = +(qty * cfg.basePrice).toFixed(2);
    return {
      qty, requestedQty: qty, total,
      breakdown: [{ qty, times: 1, price: +cfg.basePrice.toFixed(2) }],
      pricingMode: 'base', adjusted: false
    };
  }

  // Con combos: resolvemos EXACTAMENTE N "pasos".
  // Si NO hay combinación exacta, NO ajustamos hacia arriba: caemos a precio base.
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

  // Si NO hay solución exacta, precio base sin ajuste de cantidad
  if (dp[N] === INF){
    const total = +(qty * cfg.basePrice).toFixed(2);
    return {
      qty, requestedQty: qty, total,
      breakdown: [{ qty, times: 1, price: +cfg.basePrice.toFixed(2) }],
      pricingMode: 'base', adjusted: false
    };
  }

  // Reconstrucción exacta
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
    qty,                 // 👈 ya no subimos cantidad
    requestedQty: qty,
    total,
    breakdown: breakdown.sort((a,b)=> a.qty - b.qty),
    pricingMode: 'combos',
    adjusted: false      // 👈 nunca true (no hay ajuste hacia arriba)
  };
}

// Wrapper por id (usa productsById); fallback a unit*qty si no hay producto indexado
function bestPriceById(id, qty){
  const p = productsById.get(id);
  if (!p){
    const it = cart.get(id);
    const line = +((it?.unit || 0) * qty).toFixed(2);
    return { qty, requestedQty: qty, total: line, breakdown: [], pricingMode: 'base', adjusted: false };
  }

  // Si el producto NO trae tiers embebidos, intenta usar los "legacy" de pricingById
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
// ======= FIN MOTOR DE PRECIOS =======


/* == 5) CATEGORÍAS: selects y mapeos == */
// --------- Categorías ---------
let categoriesMap = null; // Map<string, string[]>

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

/* == 6) MODALES: abrir/cerrar y overlay transferencia == */
// --------- Modales ---------
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

/* == 7) UI: placeholder imagen, render de productos, “Agregar” == */
// === Placeholder de imagen ===
function svgPlaceholder(text = 'Sin foto') {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120">
      <rect width="100%" height="100%" fill="#EEE"/>
      <text x="50%" y="50%" dominant-baseline="middle"
            text-anchor="middle" fill="#999" font-family="Arial" font-size="12">${text}</text>
    </svg>`;
  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
}

// === Render de tarjetas de producto ===
function renderProductGrid(products){
  if(!grid) return;
  const html = products.map(p => {
    const id    = p.id || p.name;              // <-- id real si existe
    const price = typeof p.price === 'number' ? p.price : parseFloat(p.price || 0);
    const img   = (p.image && String(p.image).trim()) ? p.image : svgPlaceholder('Sin foto');
    const cat   = p.category || '';
    const sub   = p.subcategory || '';
    const name  = p.name || '';

    // Datos para peso/pieza
    const soldBy    = p.soldBy || 'unit';
    const unitLabel = p.unitLabel || (soldBy==='weight' ? 'kg' : 'pza');
    const step      = Number(p.step ?? (soldBy==='weight' ? 0.25 : 1));
    const minQty    = Number(p.minQty ?? step);

    // (Legado)
    if (soldBy === 'weight' && p.kgPricing && Array.isArray(p.kgPricing.tiers)) {
      pricingById.set(name, { tiers: p.kgPricing.tiers });
    }

    // Precio a mostrar
    let displayPrice = price;
    const allTiers =
      (Array.isArray(p?.bundlePricing?.tiers) && p.bundlePricing.tiers) ||
      (Array.isArray(p?.kgPricing?.tiers)     && p.kgPricing.tiers)     ||
      (Array.isArray(p?.priceCombos)          && p.priceCombos)         || null;
    if (allTiers) {
      const t1 = allTiers.find(t => Number(t.qty) === 1);
      if (t1) displayPrice = Number(t1.price) || price;
    }

    // 🚫 Evitamos backticks anidados:
    const addLabel = (soldBy === 'weight')
      ? ('Agregar ' + formatQty(minQty, step) + ' ' + unitLabel)
      : 'Agregar';

    return (
      '<article class="card"' +
        ' data-id="' + id + '"' +              // <-- AQUI
        ' data-category="' + cat + '"' +
        ' data-subcategory="' + sub + '"' +
        ' data-soldby="' + soldBy + '"' +
        ' data-unitlabel="' + unitLabel + '"' +
        ' data-step="' + step + '"' +
        ' data-minqty="' + minQty + '"' +
      '>' +
        '<img src="' + img + '" alt="' + name.replace(/"/g, '&quot;') + '">' +
        '<div class="info">' +
          '<h3>' + name + '</h3>' +
          '<p class="price">$' + Number(displayPrice).toFixed(2) + '</p>' +
          '<button class="btn add">' + addLabel + '</button>' +
        '</div>' +
      '</article>'
    );
  }).join('');
  grid.innerHTML = html;
}

// Derivar filtros desde productos si no hay categorias.json
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

// Enlazar “Agregar” en cada tarjeta
function bindAddButtons(){
  document.querySelectorAll('.card').forEach(card => {
    const addBtn = card.querySelector('.btn.add');
    if (!addBtn || addBtn.dataset.bound === '1') return;
    addBtn.dataset.bound = '1';
    addBtn.addEventListener('click', () => {
      const info = getCardInfo(card);
      switchToQtyControl(card, info.minQty, true);
    });
  });
}

/* == 8) CARRITO: render, qty +/- y sincronización con cards == */
// --------- Render del carrito ---------
function renderCart(){
  const items = Array.from(cart.values());
  cartList.innerHTML = '';

  let subtotal = 0;
  items.forEach(it=>{
    const pricing = bestPriceById(it.id, it.qty);        // <-- motor de precios
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

    // Nota de combos (desglose)
    if (pricing.pricingMode === 'combos' && pricing.breakdown?.length){
      const unitLbl = (it.soldBy === 'weight') ? (it.unitLabel || 'kg') : 'pz';
      const parts = pricing.breakdown.map(b => `${b.times}×${b.qty} ${unitLbl} = $${b.price.toFixed(2)}`).join('  ·  ');
      const note = document.createElement('div');
      note.className = 'combo-note';
      note.style.cssText = 'font-size:.85rem;color:#64748b;margin-top:2px;';
      note.textContent = `Combos: ${parts}` + (pricing.adjusted ? ' (ajustado)' : '');
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
}

//Redimencionar ventana
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

// Vaciar carrito
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

// Control qty en carrito (respeta step/minQty y soldBy)
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

/* == 9) BOTONES EN TARJETAS: crear/alternar controles de cantidad == */
// --------- Botones en tarjetas ---------
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

/* == 10) FILTROS / BÚSQUEDA: aplicar y estados vacíos == */
// --------- Filtros / búsqueda ---------
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
}

/* == 11) CARGA: productos, categorías, zonas, servicio == */
// --------- Carga de datos ---------
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
    const { url, json } = await fetchFirstOk(API.productos);
    const all = Array.isArray(json) ? json : (Array.isArray(json.products) ? json.products : []);
    if (!all.length) throw new Error('productos vacío o con formato inesperado');

    // Normaliza "active"
    const normalized = all.map(p => ({ ...p, active: (p?.active === false ? false : true) }));
    const visible = normalized.filter(p => p.active);

    // Indexar productos (clave: id || name) para motor de precios
    productsById.clear();
    visible.forEach(p => {
      const id = p.id || p.name;
      p.id = id; // asegurar consistencia con id=nombre en tarjetas
      productsById.set(id, p);
    });

    renderProductGrid(visible);
    buildCategoryFilters(visible);
    bindAddButtons();
    applyFilters();

    console.info('Productos desde:', url, '| Total:', all.length, '| Activos:', visible.length);
  } catch (e) {
    console.error('loadProducts()', e);
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
    zone.innerHTML = [
      '<option value="">Selecciona una zona…</option>',
      ...zonas.map(z => {
        const nombre = z.nombre ?? z.name ?? '';
        const costo  = Number(z.costo ?? z.cost ?? z.price ?? 0);
        return `<option value="${nombre}|${costo.toFixed(2)}">${nombre} — $${costo.toFixed(2)}</option>`;
      })
    ].join('');
    console.info('Zonas cargadas desde:', url, 'Total:', zonas.length);
  } catch (e) {
    console.warn('loadZones()', e);
    zone.innerHTML = [
      '<option value="">Selecciona una zona…</option>',
      '<option value="Montecarlo|15.00">Montecarlo — $15.00</option>',
      '<option value="Haciendas|20.00">Haciendas — $20.00</option>'
    ].join('');
  }
}

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

/* == 12) EVENTOS GLOBALES: selects, modales y validaciones == */
// --------- Eventos globales ---------
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

// <<< reset de aviso al abrir checkout >>>
let transferNoticeShown = false;

btnContinue.addEventListener('click', () => {
  if (btnContinue.disabled) return;
  closeModal(modalCart);
  transferNoticeShown = false;
  openModal(modalCheckout);
});

// Confirmación post-WhatsApp
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

function validateCheckout() {
  const zoneOk    = zone.value.trim() !== '';
  const pay       = checkoutForm.querySelector('input[name="pay"]:checked')?.value || '';
  const addressOk = address.value.trim().length > 0;

  const subtotal = parseFloat(document.getElementById('cartTotal').textContent.replace(/[^0-9.]/g,'')) || 0;
  const [, zoneCostRaw] = (zone.value || '').split('|');
  const shipping = parseFloat(zoneCostRaw || '0') || 0;
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

// Si se envió correctamente por WhatsApp, resetear formulario
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
  const subtotal = parseFloat(document.getElementById('cartTotal').textContent.replace(/[^0-9.]/g, '')) || 0;
  const [_, zoneCostRaw] = (zone.value || '').split('|');
  const shipping = parseFloat(zoneCostRaw || '0') || 0;
  const pay = checkoutForm.querySelector('input[name="pay"]:checked')?.value || '';
  const base = subtotal + shipping;
  const totalDue = pay === 'Tarjeta' ? +(base * 1.043).toFixed(2) : +base.toFixed(2);
  checkoutTotalPill.textContent = `Total: $${totalDue.toFixed(2)}`;
}

// Cambios de campos del checkout (mostrar efectivo, etc.)
checkoutForm.addEventListener('change', () => {
  const pay = checkoutForm.querySelector('input[name="pay"]:checked')?.value;
  cashField.classList.toggle('hidden', pay !== 'Efectivo');
  validateCheckout();
});

// —— Aviso de Transferencia SOLO al seleccionar ese radio ——
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

/* == 13) WHATSAPP: ticket y envío == */
checkoutForm.addEventListener('submit', (e) => {
  e.preventDefault();
  validateCheckout();
  if (!checkoutForm.checkValidity()) {
    checkoutForm.reportValidity();
    return;
  }
  const items = getCartItemsDetailed(); // usa bestPriceById() en computeLineTotal
  const subtotal = items.reduce((acc, it)=> acc + it.line, 0);

  const [zoneName, zoneCostRaw] = (zone.value || '').split('|');
  const shipping = parseFloat(zoneCostRaw || '0') || 0;

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

// Devuelve items del carrito con línea calculada (tiered-aware)
function getCartItemsDetailed(){
  const items = [];
  for (const it of cart.values()){
    items.push({
      id: it.id,
      name: it.name,
      unit: Number(it.unit),
      qty: Number(it.qty),
      line: bestPriceById(it.id, it.qty).total, // total usando motor
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
    : `https://wa.me/?text=`;
  const url = base + encodeURIComponent(text);
  window.open(url, '_blank', 'noopener');
}

/* == 14) CHECKOUT: habilitar/deshabilitar, botón continuar == */
// Control de “Continuar”
function toggleContinueButton(){
  const items = cartList.querySelectorAll('.cart-item').length;
  btnContinue.disabled = items === 0;
  cartBadge.style.display = items === 0 ? 'none' : '';
}

/* == 15) INIT: arranque general, servicio, cargas, FABs, overlay == */
// --------- INIT ---------
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

  try {
    await Promise.all([ loadCategories(), loadProducts(), loadZones() ]);
    Array.from(cart.keys()).forEach(id => syncCardsQty(id));
    toggleContinueButton();
  } catch (e) {
    console.error(e);
  }
});

// ===== Social FABs =====
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
// Overlay de servicio OFF
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