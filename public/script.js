'use strict';
/* KaChu Catálogo – script.js */

var EPS = 1e-6;

/* == 1) CONFIG & ESTADO == */
var modalCart      = document.getElementById('modalCart');
var modalCheckout  = document.getElementById('modalCheckout');
var btnCart        = document.getElementById('btnCart');
var btnContinue    = document.getElementById('btnContinue');
var cartList       = document.getElementById('cartList');
var cartBadge      = document.getElementById('cartBadge');
var checkoutForm   = document.getElementById('checkoutForm');
var zone           = document.getElementById('zone');
var address        = document.getElementById('address');
var btnCancel      = document.getElementById('btnCancel');
var btnWhatsApp    = document.getElementById('btnWhatsApp');
var cashField      = document.getElementById('cashField');
var cashGiven      = document.getElementById('cashGiven');
var cashHelp       = document.getElementById('cashHelp');

var twoPaymentsSwitch = document.getElementById('twoPaymentsSwitch');
var splitBox          = document.getElementById('splitPayFields');
var payAmount1        = document.getElementById('payAmount1');
var payAmount2        = document.getElementById('payAmount2');
var cashFieldSplit    = document.getElementById('cashFieldSplit');
var cashGivenSplit    = document.getElementById('cashGivenSplit');
var cashSplitHelp     = document.getElementById('cashSplitHelp');
var splitSubtotalEl   = document.getElementById('splitSubtotal');
var splitFeeEl        = document.getElementById('splitFee');
var splitTotalEl      = document.getElementById('splitTotal');
var splitChangeEl     = document.getElementById('splitChange');
var splitMissingEl    = document.getElementById('splitMissing'); // <— NUEVO en HTML

var modalConfirm   = document.getElementById('modalConfirm');
var btnConfirmYes  = document.getElementById('btnConfirmYes');
var btnConfirmNo   = document.getElementById('btnConfirmNo');

var categorySelect = document.getElementById('category');
var subcategorySelect = document.getElementById('subcategory');
var searchInput    = document.getElementById('searchInput');
var emptyState     = document.getElementById('emptyState');
var grid           = document.querySelector('.grid');

var btnClearCart   = document.getElementById('btnClearCart');
var checkoutTotalPill = document.getElementById('checkoutTotalPill');

var modalTransfer  = document.getElementById('modalTransferencia');
var btnTransferOK  = document.getElementById('btnTransferOK');
if (btnClearCart) btnClearCart.addEventListener('click', clearCart);

/* FAVORITOS (rail + modal) */
var favsSection   = document.getElementById('favsSection');
var favsTrack     = document.getElementById('favsTrack');
var favsDots      = document.getElementById('favsDots');
var favsPrev      = document.getElementById('favsPrev');
var favsNext      = document.getElementById('favsNext');
var favsAll       = document.getElementById('favsAll');
var modalFavs     = document.getElementById('modalFavs');
var favsModalList = document.getElementById('favsModalList');

/* FREE SHIPPING */
var fsPill = document.getElementById('fs-promo');
var fsMsg  = fsPill ? fsPill.querySelector('.fs-msg') : null;
var fsBar  = fsPill ? fsPill.querySelector('.fs-bar') : null;
var fsTimer = null, fsLastText = '', fsShowOnAdd = false;
var FS_SHOW_MS = 8000, FS_COOLDOWN_MS = 600;

/* Persistencia */
var CART_KEY     = 'kachu_cart_v1';
var CHECKOUT_KEY = 'kachu_checkout_v1';
var FAVS_KEY     = 'kachu_favs_v1';
var favorites = new Set();

/* Estado memoria */
var cart = new Map();               // id -> item
var productsById = new Map();       // id -> producto
var pricingById  = new Map();       // legacy combos (opcional)
var categoriesMap  = null;

/* Zonas */
var ZONES = [];
var zonesByName = new Map();

/* == 2) API + fetch == */
var API = {
  productos:  ['/api/data/productos'],
  categorias: ['/api/data/categorias'],
  zonas:      ['/api/data/zonas'],
  servicio:   ['/api/data/servicio'],
  ads:        ['/api/data/ads', '/ads.json'] // <— NUEVO: fallback a /ads.json
};
function fetchNoCache(url){
  var u = url + (url.indexOf('?') >= 0 ? '&t=' + Date.now() : '?t=' + Date.now());
  return fetch(u, { cache: 'no-store' });
}
function fetchFirstOk(urls){
  function tryOne(idx, resolve, reject){
    if (idx >= urls.length) { reject(new Error('No se pudo leer ninguna URL')); return; }
    var url = urls[idx];
    fetchNoCache(url).then(function(r){
      if (!r.ok) { tryOne(idx+1, resolve, reject); return; }
      r.json().then(function(json){ resolve({ url: url, json: json }); }).catch(function(){ tryOne(idx+1, resolve, reject); });
    }).catch(function(){ tryOne(idx+1, resolve, reject); });
  }
  return new Promise(function(resolve, reject){ tryOne(0, resolve, reject); });
}
/* == ADS: carga y normalización desde ads.json == */
var AdsData = { enabled:false, messages:[] };

function normalizeAds(json){
  var out = { enabled:false, messages:[] };
  if (!json || typeof json !== 'object') return out;

  var enabled = (json.enabled !== false);
  var msgs = Array.isArray(json.messages) ? json.messages : [];

  out.enabled = enabled;
  out.messages = msgs.map(function(m){
    var l1 = (m.l1 || '').toString();
    var l2 = (m.l2 || '').toString();
    var ctaText = (m.ctaText || '').toString().trim();
    var ctaUrl  = (m.ctaUrl  || '').toString().trim();
    return { l1: l1, l2: l2, ctaText: ctaText, ctaUrl: ctaUrl };
  }).filter(function(m){ return m.l1 || m.l2; });

  return out;
}

function loadAds(){
  return fetchFirstOk(API.ads).then(function(res){
    AdsData = normalizeAds(res.json);
  }).catch(function(){
    AdsData = { enabled:false, messages:[] };
  });
}

/* == 3) Helpers == */
function money(n){ return '$' + Number(n).toFixed(2); }
function currency(n){ return '$' + Number(n || 0).toFixed(2); }
function parseMoney(str){ return parseFloat((str||'').replace(/[^0-9.]/g,'')) || 0; }
function normalize(str){ return (str || '').toString().toLowerCase().trim(); }
function decimalsFromStep(step){ var s = String(step || 1); return s.indexOf('.') >= 0 ? (s.split('.')[1] || '').length : 0; }
function formatQty(qty, step){ var d = decimalsFromStep(step || 1); return Number(qty || 0).toFixed(d).replace(/\.?0+$/,''); }

function getCardInfo(card){
  var name = (card.querySelector('h3') && card.querySelector('h3').textContent.trim()) || '';
  var unit = parseMoney(card.querySelector('.price') ? card.querySelector('.price').textContent : '');
  var id = card.dataset.id || name;
  var soldBy    = card.dataset.soldby || 'unit';
  var unitLabel = card.dataset.unitlabel || (soldBy==='weight' ? 'kg' : 'pza');
  var step      = parseFloat(card.dataset.step || (soldBy==='weight' ? '0.25' : '1')) || 1;
  var minQty    = parseFloat(card.dataset.minqty || step) || step;
  return { id: id, name: name, unit: unit, soldBy: soldBy, unitLabel: unitLabel, step: step, minQty: minQty };
}
/* ==== Radios helpers (pay1 / pay2) ==== */
function getRadioVal(groupName){
  var r = checkoutForm.querySelector('input[name="'+ groupName +'"]:checked');
  return r ? r.value : '';
}
function setRadioVal(groupName, value){
  var r = checkoutForm.querySelector('input[name="'+ groupName +'"][value="'+ value +'"]');
  if (r) r.checked = true;
}
// Muestra/oculta el campo "¿Con cuánto?"
function toggleCashFieldSplit(){
  var m1 = getRadioVal('pay1');
  var m2 = getRadioVal('pay2');
  var show = (m1 === 'Efectivo' || m2 === 'Efectivo');
  if (cashFieldSplit) cashFieldSplit.classList.toggle('hidden', !show);
}

/* Persistencia carrito/checkout/favs */
function saveCart(){ localStorage.setItem(CART_KEY, JSON.stringify(Array.from(cart.values()))); }
function loadCart(){
  try{
    var raw = localStorage.getItem(CART_KEY);
    if(!raw) return;
    var arr = JSON.parse(raw);
    cart.clear();
    arr.forEach(function(it){
      if(it && it.id && it.qty > 0){
        cart.set(it.id, {
          id: it.id, name: it.name, unit: it.unit, qty: it.qty,
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
  var pay = (checkoutForm.querySelector('input[name="pay"]:checked') || {}).value || '';
  var data = { zone: zone.value || '', pay: pay, address: address.value || '', cashGiven: cashGiven.value || '' };
  localStorage.setItem(CHECKOUT_KEY, JSON.stringify(data));
}
function loadCheckout(){
  try{
    var raw = localStorage.getItem(CHECKOUT_KEY);
    if(!raw) return;
    var data = JSON.parse(raw);
    if(data.zone) zone.value = data.zone;
    if(data.pay){
      var r = checkoutForm.querySelector('input[name="pay"][value="' + data.pay + '"]');
      if(r){ r.checked = true; }
    }
    if(data.address) address.value = data.address;
    if(data.cashGiven) cashGiven.value = data.cashGiven;
    if (cashField) cashField.classList.toggle('hidden', data.pay !== 'Efectivo');
  }catch(e){ console.warn('No se pudo cargar checkout:', e); }
}
function loadFavs(){
  try{
    var raw = localStorage.getItem(FAVS_KEY);
    var arr = JSON.parse(raw);
    favorites = new Set(Array.isArray(arr) ? arr : []);
  }catch(e){ favorites = new Set(); }
}
function saveFavs(){ localStorage.setItem(FAVS_KEY, JSON.stringify(Array.from(favorites))); }
function isFav(id){ return favorites.has(String(id)); }
function toggleFav(id){
  var key = String(id);
  if (favorites.has(key)) favorites.delete(key); else favorites.add(key);
  saveFavs();
}

/* == 4) Motor de precios (combos) == */
function _num(v, d){ if (d===void 0) d = 0; var n = parseFloat(String(v==null?'':v).replace(',', '.')); return isFinite(n) ? n : d; }
function _toCount(q, step){ return Math.round((q + 1e-9) / step); }
function _roundToStep(q, step){ return _toCount(q, step) * step; }
function normalizePricingFromProduct(p){
  var unit = (p && p.soldBy === 'weight') ? 'weight' : 'unit';
  var step = unit === 'weight' ? _num(p && p.step, 0.25) : 1;
  var minQty = unit === 'weight' ? _num(p && p.minQty, step) : 1;
  var basePrice = _num(p && p.price, 0);
  var tiers = [];
  if (p && p.bundlePricing && Array.isArray(p.bundlePricing.tiers)) tiers = p.bundlePricing.tiers;
  else if (p && p.kgPricing && Array.isArray(p.kgPricing.tiers)) tiers = p.kgPricing.tiers;
  else if (p && Array.isArray(p.priceCombos)) tiers = p.priceCombos;
  tiers = (tiers || []).map(function(t){ return { qty: _num(t.qty,0), price: _num(t.price,0) }; })
                       .filter(function(t){ return t.qty > 0 && t.price > 0; })
                       .sort(function(a,b){ return a.qty - b.qty; });
  return { unit: unit, step: step, minQty: minQty, basePrice: basePrice, tiers: tiers };
}
function clampQtyToStepAndMin(qty, cfg){
  var q = Math.max(_num(qty, cfg.minQty), cfg.minQty);
  var snapped = _roundToStep(q, cfg.step);
  return Math.max(snapped, cfg.minQty);
}
function computeBestPriceRaw(product, qtyRaw){
  var cfg = normalizePricingFromProduct(product);
  var qty = clampQtyToStepAndMin(qtyRaw, cfg);
  var hasTiers = Array.isArray(cfg.tiers) && cfg.tiers.length > 0;
  if (!hasTiers){
    var total0 = +(qty * cfg.basePrice).toFixed(2);
    return { qty: qty, requestedQty: qty, total: total0, breakdown:[{ qty: qty, times:1, price:+cfg.basePrice.toFixed(2)}], pricingMode:'base', adjusted:false };
  }
  var step = cfg.step, N = _toCount(qty, step);
  var tiers = cfg.tiers.map(function(t){ return { count:_toCount(t.qty, step), rawQty:t.qty, price:+t.price.toFixed(2) }; })
                       .filter(function(t){ return t.count >= 1; });
  if (!tiers.length){
    var total1 = +(qty * cfg.basePrice).toFixed(2);
    return { qty: qty, requestedQty: qty, total: total1, breakdown:[{ qty: qty, times:1, price:+cfg.basePrice.toFixed(2)}], pricingMode:'base', adjusted:false };
  }
  var INF = 1e15;
  var dp = new Array(N + 1).fill(INF);
  var choice = new Array(N + 1).fill(-1);
  dp[0] = 0;
  var i, j;
  for (i = 1; i <= N; i++){
    for (j = 0; j < tiers.length; j++){
      var t = tiers[j];
      if (i - t.count >= 0){
        var cand = dp[i - t.count] + t.price;
        if (cand < dp[i]) { dp[i] = cand; choice[i] = j; }
      }
    }
  }
  if (dp[N] === INF){
    var total2 = +(qty * cfg.basePrice).toFixed(2);
    return { qty: qty, requestedQty: qty, total: total2, breakdown:[{ qty: qty, times:1, price:+cfg.basePrice.toFixed(2)}], pricingMode:'base', adjusted:false };
  }
  var used = new Map(); var k = N;
  while (k > 0){ j = choice[k]; used.set(j, (used.get(j) || 0) + 1); k -= tiers[j].count; }
  var total = 0; var breakdown = [];
  used.forEach(function(times, jj){ var tt = tiers[jj]; total += times * tt.price; breakdown.push({ qty: tt.rawQty, times: times, price: tt.price }); });
  total = +total.toFixed(2);
  breakdown.sort(function(a,b){ return a.qty - b.qty; });
  return { qty: qty, requestedQty: qty, total: total, breakdown: breakdown, pricingMode:'combos', adjusted:false };
}
function bestPriceById(id, qty){
  var p = productsById.get(id);
  if (!p){
    var it = cart.get(id);
    var line = +(((it && it.unit) || 0) * qty).toFixed(2);
    return { qty: qty, requestedQty: qty, total: line, breakdown: [], pricingMode: 'base', adjusted: false };
  }
  var hasEmbeddedTiers =
    (p && p.bundlePricing && Array.isArray(p.bundlePricing.tiers) && p.bundlePricing.tiers.length) ||
    (p && p.kgPricing && Array.isArray(p.kgPricing.tiers) && p.kgPricing.tiers.length) ||
    (p && Array.isArray(p.priceCombos) && p.priceCombos.length);
  var prod = p;
  if (!hasEmbeddedTiers){
    var legacy = pricingById.get(id);
    if (legacy && legacy.tiers && legacy.tiers.length){
      if ((p.soldBy || 'unit') === 'weight') prod = Object.assign({}, p, { kgPricing: { tiers: legacy.tiers } });
      else                                   prod = Object.assign({}, p, { bundlePricing: { tiers: legacy.tiers } });
    }
  }
  return computeBestPriceRaw(prod, qty);
}

/* == 5) Categorías == */
function fillCategorySelectFromMap() {
  if (!categorySelect) return;
  var cats = Array.from(categoriesMap.keys()).sort();
  categorySelect.innerHTML = '<option value="">Todas</option>' + cats.map(function(c){ return '<option>' + c + '</option>'; }).join('');
  subcategorySelect.innerHTML = '<option value="">Todas</option>';
  subcategorySelect.disabled = true;
}
function fillSubcategorySelectFromMap(selectedCat) {
  var subs = categoriesMap.get(selectedCat) || [];
  subcategorySelect.innerHTML = '<option value="">Todas</option>' + subs.slice().sort().map(function(s){ return '<option>' + s + '</option>'; }).join('');
  subcategorySelect.disabled = subs.length === 0;
}

/* == 6) Modales == */
if (btnTransferOK) btnTransferOK.addEventListener('click', function(){ closeModal(modalTransfer); });
function openModal(modal){
  if (!modal) return;
  modal.inert = false;
  modal.classList.add('open');
  modal.removeAttribute('aria-hidden');
  setTimeout(function(){ var x = modal.querySelector('.modal__close, [data-close]'); if (x && x.focus) x.focus(); }, 0);
}
function closeModal(modal){
  if (!modal) return;
  var active = document.activeElement;
  if (active && modal.contains(active)) active.blur();
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden','true');
  modal.inert = true;
}

/* == 7) FAVORITOS: helpers UI (rail + modal) == */
function favHeartSVG(active){
  if (active) return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21l-1.45-1.32C6 15.36 3 12.61 3 9.28 3 7 4.79 5 7.05 5c1.4 0 2.75.66 3.6 1.71C11.5 5.66 12.85 5 14.25 5 16.51 5 18.3 7 18.3 9.28c0 3.33-3 6.08-7.55 10.4L12 21z"></path></svg>';
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12.1 8.64l-.1.1-.1-.1C10.14 6.9 7.1 7.24 5.8 9.28c-1.03 1.62-.72 3.82.74 5.04L12 19l5.46-4.68c1.46-1.22 1.77-3.42.74-5.04-1.3-2.04-4.34-2.38-6.04-.64z" fill="none" stroke="#ef4444" stroke-width="1.8" stroke-linejoin="round"/></svg>';
}

/* === Controles de cantidad (HTML) === */
function favQtyMarkup(id, qty, step){
  var isDec = (step % 1) !== 0;
  var show  = isDec ? (+qty).toFixed(2).replace(/\.00$/,'') : String(qty);
  return '' +
    '<div class="fav-qty" data-id="'+id+'">' +
      '<button class="qminus" type="button" aria-label="Disminuir">−</button>' +
      '<span class="qcount">'+ show +'</span>' +
      '<button class="qplus"  type="button" aria-label="Aumentar">+</button>' +
    '</div>';
}

/* Si está en carrito: controles; si no: botón Agregar */
function favQtyOrAddHTML(p){
  var it = cart.get(p.id);
  var isAvailable = (p.active !== false);
  if (!isAvailable){
    return '<button class="btn add unavailable" type="button" disabled aria-disabled="true" title="No disponible">No disponible</button>';
  }
  if (!it){
    return '<button class="btn add" type="button" data-id="' + p.id + '">Agregar</button>';
  }
  return favQtyMarkup(p.id, it.qty, it.step > 0 ? it.step : 1);
}

/* Actualiza una tarjeta concreta del rail */
function updateFavCardQtyUI(id){
  if (!favsTrack) return;
  var card = favsTrack.querySelector('.fav-card[data-id="'+CSS.escape(id)+'"]');
  if (!card) return;
  var meta = card.querySelector('.meta');
  if (!meta) return;

  var item = cart.get(id);
  var addBtn = meta.querySelector('.btn.add');
  var existing = meta.querySelector('.fav-qty');

  if (item){
    var html = favQtyMarkup(id, item.qty, item.step > 0 ? item.step : 1);
    if (existing) existing.outerHTML = html;
    else {
      if (addBtn) addBtn.remove();
      meta.insertAdjacentHTML('beforeend', html);
    }
  } else {
    if (!addBtn){
      if (existing) existing.remove();
      meta.insertAdjacentHTML('beforeend','<button class="btn add" type="button" data-id="'+id+'">Agregar</button>');
    }
  }
}

/* Sincroniza todas las tarjetas del rail */
function refreshAllFavQtyUIs(){
  if (!favsTrack) return;
  favsTrack.querySelectorAll('.fav-card').forEach(function(c){
    var id = c.getAttribute('data-id');
    if (id) updateFavCardQtyUI(id);
  });
}

/* ===== RENDER modal de favoritos ===== */
function renderFavoritesModal(){
  if (!favsModalList) return;
  var items = Array.from(favorites)
    .map(function(id){ return productsById.get(id); })
    .filter(function(p){ return !!p; });

  favsModalList.innerHTML = items.map(function(p){
    var it = cart.get(p.id);
    var img = (p.image && String(p.image).trim()) ? p.image : svgPlaceholder('Sin foto');
    var price = Number(p.price||0).toFixed(2);
    var unitLabel = (p.soldBy === 'weight') ? 'kg' : 'pza';
    var isAvailable = (p.active !== false);
    var agotado = isAvailable ? '' : '<span class="status-badge">Agotado</span>';

    var actions = isAvailable
      ? (it ? ('<div class="actions">'+ favQtyMarkup(p.id, it.qty, it.step || (p.soldBy==='weight'?0.25:1)) +'</div>')
             : ('<div class="actions"><button class="btn ghost favs-add">Agregar</button></div>'))
      : ('<div class="actions"><button class="btn add unavailable" type="button" disabled aria-disabled="true">No disponible</button></div>');

    return '' +
      '<div class="favs-modal-card' + (isAvailable ? '' : ' is-unavailable') + '" data-id="' + p.id + '">' +
        '<div style="position:relative">' +
          '<img src="' + img + '" alt="">' +
          agotado +
        '</div>' +
        '<div class="meta"><h4>' + (p.name||'') + '</h4>' +
        '<p class="p">$' + price + ' <small>por ' + unitLabel + '</small></p></div>' +
        actions +
        '<button class="btn btn-remove favs-remove">Quitar</button>' +
      '</div>';
  }).join('');

  favsModalList.onclick = function(e){
    var card = e.target.closest('.favs-modal-card'); if (!card) return;
    var id = card.dataset.id;
    var p = productsById.get(id); if (!p) return;

    if (e.target.closest('.favs-add')){
      if (p.active === false) return;
      var minQty = Number(p.minQty != null ? p.minQty : (p.soldBy === 'weight' ? 0.25 : 1));
      var unitLabel = p.soldBy === 'weight' ? 'kg' : 'pza';
      cart.set(id, { id:id, name:p.name, unit:+Number(p.price||0), qty:minQty, soldBy:p.soldBy||'unit', unitLabel:unitLabel, step:Number(p.step|| (p.soldBy==='weight'?0.25:1)), minQty:minQty });
      renderCart(); syncCardsQty(id); renderFavoritesModal(); updateFavCardQtyUI(id);
      return;
    }

    if (e.target.closest('.favs-remove')){
      toggleFav(id);
      renderFavoritesModal();
      renderFavoritesRail();
      updateAllCardHearts();
      return;
    }

    var qplus  = e.target.closest('.qplus');
    var qminus = e.target.closest('.qminus');
    if (qplus || qminus){
      if (p.active === false) return;
      var it = cart.get(id);
      if (!it){
        var soldBy = p.soldBy || 'unit';
        var step   = Number(p.step != null ? p.step : (soldBy==='weight' ? 0.25 : 1));
        var minQty = Number(p.minQty != null ? p.minQty : step);
        var unitLabel = p.unitLabel || (soldBy==='weight' ? 'kg' : 'pza');
        it = { id:id, name:p.name, unit:+Number(p.price||0), qty:minQty, soldBy:soldBy, unitLabel:unitLabel, step:step, minQty:minQty };
      }
      var stepv = it.step > 0 ? it.step : 1;
      var minQ  = it.minQty > 0 ? it.minQty : (it.soldBy==='weight'?0.25:1);

      if (qplus){
        var nxt = +(it.qty + stepv).toFixed(3);
        if (it.soldBy !== 'weight') nxt = Math.max(1, Math.round(nxt));
        it.qty = nxt; cart.set(id, it);
      } else {
        var next = +(it.qty - stepv).toFixed(3);
        if (next < (minQ - EPS)) {
          if (confirm('¿Eliminar este artículo del carrito?')) {
            cart.delete(id);
          } else {
            return;
          }
        } else {
          if (it.soldBy !== 'weight') next = Math.max(1, Math.round(next));
          it.qty = next; cart.set(id, it);
        }
      }
      renderCart(); syncCardsQty(id); renderFavoritesModal(); updateFavCardQtyUI(id);
      return;
    }
  };

  applyFavsModalScroll(items.length);
}

/* == 8) GRID de productos == */
function svgPlaceholder(text){
  if (text===void 0) text = 'Sin foto';
  var svg = '' +
    '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120">' +
      '<rect width="100%" height="100%" fill="#EEE"/>' +
      '<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#999" font-family="Arial" font-size="12">' + text + '</text>' +
    '</svg>';
  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
}

function renderProductGrid(products){
  if(!grid) return;
  var html = products.map(function(p){
    var id    = p.id || p.name;
    var price = Number(p.price || 0);
    var img   = (p.image && String(p.image).trim()) ? p.image : svgPlaceholder('Sin foto');
    var cat   = p.category || '';
    var sub   = p.subcategory || '';
    var name  = p.name || '';
    var soldBy    = p.soldBy || 'unit';
    var unitLabel = p.unitLabel || (soldBy==='weight' ? 'kg' : 'pza');
    var step      = Number(p.step != null ? p.step : (soldBy==='weight' ? 0.25 : 1));
    var minQty    = Number(p.minQty != null ? p.minQty : step);
    var isAvailable = (p.active !== false);

    var displayPrice = price;
    var allTiers =
      (p && p.bundlePricing && Array.isArray(p.bundlePricing.tiers) && p.bundlePricing.tiers) ||
      (p && p.kgPricing && Array.isArray(p.kgPricing.tiers) && p.kgPricing.tiers) ||
      (Array.isArray(p.priceCombos) && p.priceCombos) || null;
    if (allTiers) {
      var t1 = allTiers.find(function(t){ return Number(t.qty) === 1; });
      if (t1) displayPrice = Number(t1.price) || price;
    }

    var addLabel = isAvailable ? (soldBy === 'weight' ? ('Agregar ' + formatQty(minQty, step) + ' ' + unitLabel) : 'Agregar') : 'No disponible';
    var addClasses = isAvailable ? 'btn add' : 'btn add unavailable';
    var addAttrs   = isAvailable ? '' : ' aria-disabled="true" data-unavailable="1"';

    var safeName = name.replace(/\"/g, '&quot;');
    return '' +
      '<article class="card' + (isAvailable ? '' : ' is-unavailable') + '"' +
               ' data-id="' + id + '"' +
               ' data-category="' + cat + '"' +
               ' data-subcategory="' + sub + '"' +
               ' data-soldby="' + soldBy + '"' +
               ' data-unitlabel="' + unitLabel + '"' +
               ' data-step="' + step + '"' +
               ' data-minqty="' + minQty + '"' +
               (isAvailable ? '' : ' data-available="0"') + '>' +
        '<div class="media">' +
          '<img class="thumb" src="' + img + '" alt="' + safeName + '">' +
          '<button class="fav-heart' + (isFav(id) ? ' is-fav' : '') + '"' +
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
      '</article>';
  }).join('');
  grid.innerHTML = html;
}

function buildCategoryFilters(products){
  if (categoriesMap && categoriesMap.size) return;
  var cats = new Set();
  var subsByCat = new Map();
  products.forEach(function(p){
    var cat = p.category || '';
    var sub = p.subcategory || '';
    if (cat) cats.add(cat);
    if (cat && sub) {
      if (!subsByCat.has(cat)) subsByCat.set(cat, new Set());
      subsByCat.get(cat).add(sub);
    }
  });
  if (categorySelect){
    var current = categorySelect.value;
    categorySelect.innerHTML = '<option value="">Todas</option>' +
      Array.from(cats).sort().map(function(c){ return '<option>' + c + '</option>'; }).join('');
    if (Array.from(cats).concat(['']).indexOf(current) >= 0) categorySelect.value = current;
  }
  if (subcategorySelect){
    var cat = (categorySelect && categorySelect.value) || '';
    var subs = subsByCat.get(cat) || new Set();
    subcategorySelect.innerHTML = '<option value="">Todas</option>' +
      Array.from(subs).sort().map(function(s){ return '<option>' + s + '</option>'; }).join('');
    subcategorySelect.disabled = !cat;
  }
}

/* Botones en tarjetas + corazones */
function bindAddButtons(){
  Array.prototype.forEach.call(document.querySelectorAll('.card'), function(card){
    var addBtn = card.querySelector('.btn.add');
    if (!addBtn || addBtn.dataset.bound === '1') return;
    if (addBtn.classList.contains('unavailable') || card.dataset.available === '0') { addBtn.disabled = true; return; }
    addBtn.dataset.bound = '1';
    addBtn.addEventListener('click', function(){
      var info = getCardInfo(card);
      switchToQtyControl(card, info.minQty, true);
      updateFavCardQtyUI(info.id);
      if (modalFavs && modalFavs.classList.contains('open')) renderFavoritesModal();
    });
  });
}
function bindFavoriteHearts(){
  Array.prototype.forEach.call(document.querySelectorAll('.card .fav-heart'), function(btn){
    if (btn.dataset.bound === '1') return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', function(){
      var id = btn.dataset.id || (btn.closest('.card') ? btn.closest('.card').dataset.id : '');
      if (!id) return;
      toggleFav(id);
      var on = isFav(id);
      btn.classList.toggle('is-fav', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.innerHTML = favHeartSVG(on);
      renderFavoritesRail();
      if (modalFavs && modalFavs.classList.contains('open')) renderFavoritesModal();
    });
  });
}
function updateAllCardHearts(){
  Array.prototype.forEach.call(document.querySelectorAll('.card'), function(card){
    var id  = card.dataset.id;
    var btn = card.querySelector('.fav-heart');
    if (!btn || !id) return;
    var on = isFav(id);
    btn.classList.toggle('is-fav', on);
    btn.setAttribute('aria-pressed', on ? 'true':'false');
    btn.innerHTML = favHeartSVG(on);
  });
}

/* == 9) CARRITO == */
function renderCart(){
  var items = Array.from(cart.values());
  cartList.innerHTML = '';
  var subtotal = 0;
  items.forEach(function(it){
    var pricing = bestPriceById(it.id, it.qty);
    var line = pricing.total;
    subtotal += line;

    var li = document.createElement('li');
    li.className = 'cart-item';
    li.dataset.id = it.id;
    li.innerHTML = '' +
      '<div class="row">' +
        '<span class="name">' + it.name + '</span>' +
        '<span class="unit">' + money(it.unit) + '</span>' +
      '</div>' +
      '<div class="row">' +
        '<div class="qty">' +
          '<button class="chip cart-minus">-</button>' +
          '<span class="count">' + (it.soldBy === 'weight' ? (formatQty(it.qty, it.step) + ' ' + it.unitLabel) : (formatQty(it.qty, 1))) + '</span>' +
          '<button class="chip cart-plus">+</button>' +
        '</div>' +
        '<span class="line-total">' + money(line) + '</span>' +
      '</div>';
    if (pricing.pricingMode === 'combos' && pricing.breakdown && pricing.breakdown.length){
      var unitLbl = (it.soldBy === 'weight') ? (it.unitLabel || 'kg') : 'pza';
      var parts = pricing.breakdown.map(function(b){ return b.times + '×' + b.qty + ' ' + unitLbl + ' = $' + b.price.toFixed(2); }).join('  ·  ');
      var note = document.createElement('div');
      note.className = 'combo-note';
      note.style.cssText = 'font-size:.85rem;color:#64748b;margin-top:2px;';
      note.textContent = parts;
      li.appendChild(note);
    }
    cartList.appendChild(li);
  });

  document.getElementById('cartTotal').textContent = money(+subtotal.toFixed(2));
  var totalQty = items.reduce(function(a,b){ return a + b.qty; }, 0);
  cartBadge.textContent = totalQty;
  cartBadge.hidden = totalQty === 0;
  btnContinue.disabled = totalQty === 0;
  if (btnClearCart) btnClearCart.disabled = totalQty === 0;

  var needsScroll = items.length > 4;
  cartList.classList.toggle('scroll', needsScroll);
  if (needsScroll) {
    var vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
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

  refreshAllFavQtyUIs();
}
window.addEventListener('resize', function(){
  var needsScroll = (cartList.querySelectorAll('.cart-item').length > 4);
  cartList.classList.toggle('scroll', needsScroll);
  if (needsScroll) {
    var vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
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
  Array.prototype.forEach.call(document.querySelectorAll('.card'), function(card){
    var qtyCtrl = card.querySelector('.qty-control');
    if (qtyCtrl) qtyCtrl.replaceWith(createAddButton(card));
  });
  refreshAllFavQtyUIs();
}
cartList.addEventListener('click', function(e){
  var minus = e.target.closest('.cart-minus');
  var plus  = e.target.closest('.cart-plus');
  if (!minus && !plus) return;
  var li = e.target.closest('.cart-item');
  if (!li) return;
  var id = li.dataset.id;
  var item = cart.get(id);
  if (!item) return;

  var step   = (typeof item.step === 'number' && item.step > 0) ? item.step : 1;
  var minQty = (typeof item.minQty === 'number' && item.minQty > 0) ? item.minQty : ((item.soldBy === 'weight') ? 0.25 : 1);
  var snap = function(n){ return +n.toFixed(3); };
  var clampUnits = function(n){ return Math.max(1, Math.round(n)); };

  if (plus) {
    var q = snap((item.qty || minQty) + step);
    if (item.soldBy !== 'weight') q = clampUnits(q);
    item.qty = q; cart.set(id, item); renderCart(); syncCardsQty(id); updateFavCardQtyUI(id); return;
  }
  if (minus) {
    var next = snap((item.qty || minQty) - step);
    if (next < (minQty - EPS)) {
      if (confirm('¿Eliminar este artículo del carrito?')) { cart.delete(id); renderCart(); refreshAllFavQtyUIs(); syncCardsQty(id); }
    } else {
      var q2 = next; if (item.soldBy !== 'weight') q2 = clampUnits(q2);
      item.qty = q2; cart.set(id, item); renderCart(); syncCardsQty(id); updateFavCardQtyUI(id);
    }
  }
});

/* == 10) Botones tarjeta == */
function createAddButton(card){
  var info = getCardInfo(card);
  var btn = document.createElement('button');
  btn.className = 'btn add';
  btn.textContent = (info.soldBy === 'weight') ? ('Agregar ' + formatQty(info.minQty, info.step) + ' ' + info.unitLabel) : 'Agregar';
  btn.addEventListener('click', function(){ switchToQtyControl(card, info.minQty, true); });
  return btn;
}
function createQtyControl(card, qty){
  var control = document.createElement('div');
  control.className = 'qty-control';
  var info = getCardInfo(card);
  var id = info.id, name = info.name, unit = info.unit, soldBy = info.soldBy, unitLabel = info.unitLabel, step = info.step, minQty = info.minQty;
  var isDecimal = (step % 1) !== 0;
  var fmt = function(v){ return isDecimal ? (+v).toFixed(2).replace(/\.00$/,'') : String(v); };

  var btnMinus = document.createElement('button'); btnMinus.textContent = '−';
  var spanQty  = document.createElement('span');   spanQty.textContent  = fmt(qty);
  var btnPlus  = document.createElement('button'); btnPlus.textContent  = '+';
  control.appendChild(btnMinus); control.appendChild(spanQty); control.appendChild(btnPlus);

  btnPlus.addEventListener('click', function(){
    var cur = cart.get(id) || { id: id, name: name, unit: unit, soldBy: soldBy, unitLabel: unitLabel, step: step, minQty: minQty, qty: 0 };
    cur.qty = +(cur.qty + step).toFixed(3);
    if (soldBy === 'unit') cur.qty = Math.round(cur.qty);
    cart.set(id, cur);
    spanQty.textContent = fmt(cur.qty);
    fsShowOnAdd = true;
    renderCart();
    updateFavCardQtyUI(id);
    if (modalFavs && modalFavs.classList.contains('open')) renderFavoritesModal();
  });
  btnMinus.addEventListener('click', function(){
    var cur = cart.get(id) || { id: id, name: name, unit: unit, soldBy: soldBy, unitLabel: unitLabel, step: step, minQty: minQty, qty: 0 };
    var next = +(cur.qty - step).toFixed(3);
    if (next < (minQty - EPS)) {
      if (confirm('¿Eliminar este artículo del carrito?')) {
        cart.delete(id); renderCart(); refreshAllFavQtyUIs(); control.replaceWith(createAddButton(card));
        if (modalFavs && modalFavs.classList.contains('open')) renderFavoritesModal();
      }
    } else {
      cur.qty = next;
      if (soldBy === 'unit') cur.qty = Math.max(1, Math.round(cur.qty));
      cart.set(id, cur);
      spanQty.textContent = fmt(cur.qty);
      renderCart();
      updateFavCardQtyUI(id);
      if (modalFavs && modalFavs.classList.contains('open')) renderFavoritesModal();
    }
  });
  return control;
}
function switchToQtyControl(card, startQty, addToCart){
  if (startQty===void 0) startQty = 1;
  if (addToCart===void 0) addToCart = false;
  var info = getCardInfo(card);
  var prod = productsById.get(info.id);
  if (prod && prod.active === false) return;
  var start = addToCart ? info.minQty : ((cart.get(info.id) || {}).qty || info.minQty);
  if (addToCart) {
    cart.set(info.id, Object.assign({}, info, { qty: start }));
    renderCart();
  }
  var addBtn = card.querySelector('.btn.add');
  var control = createQtyControl(card, (cart.get(info.id) || {}).qty || start);
  if (addBtn) addBtn.replaceWith(control);
}
function syncCardsQty(id){
  Array.prototype.forEach.call(document.querySelectorAll('.card'), function(card){
    var info = getCardInfo(card);
    if (info.id !== id) return;
    var item = cart.get(id);
    var qtyControl = card.querySelector('.qty-control');
    if (item) {
      if (!qtyControl) {
        switchToQtyControl(card, item.qty, false);
      } else {
        var span = qtyControl.querySelector('span');
        if (span) span.textContent = (item.soldBy === 'weight') ? formatQty(item.qty, item.step) : formatQty(item.qty, 1);
      }
    } else {
      if (qtyControl) qtyControl.replaceWith(createAddButton(card));
    }
  });
}

/* == 11) FILTROS == */
function showEmpty(msg){ emptyState.textContent = msg; emptyState.classList.remove('hidden'); }
function hideEmpty(){ emptyState.textContent = ''; emptyState.classList.add('hidden'); }
function getCards(){ return Array.prototype.slice.call(document.querySelectorAll('.card')); }
function applyFilters(){
  var searchVal = normalize(searchInput.value);
  var cards = getCards();
  var visibleCount = 0;

  if (searchVal) {
    hideEmpty();
    if (categorySelect.value !== '' || subcategorySelect.value !== '') {
      categorySelect.value = ''; subcategorySelect.value = ''; subcategorySelect.disabled = true;
    }
    cards.forEach(function(card){
      var name = normalize(card.querySelector('h3') ? card.querySelector('h3').textContent : '');
      var match = name.indexOf(searchVal) >= 0;
      card.style.display = match ? '' : 'none';
      if (match) visibleCount++;
    });
    if (visibleCount === 0){
      showEmpty('Verifique que escribió bien el nombre del producto | Posiblemente no haya inventario de este producto.');
    } else { hideEmpty(); }
    updateAllCardHearts();
    return;
  }

  var catVal = categorySelect.value;
  var hasCategory = !!catVal;
  subcategorySelect.disabled = !hasCategory;
  if (!hasCategory) subcategorySelect.value = '';

  cards.forEach(function(card){
    var cardCat = card.getAttribute('data-category') || '';
    var cardSub = card.getAttribute('data-subcategory') || '';
    var show = true;
    if (hasCategory) {
      show = (cardCat === catVal);
      if (show && subcategorySelect.value) show = (cardSub === subcategorySelect.value);
    }
    card.style.display = show ? '' : 'none';
    if (show) visibleCount++;
  });

  if (!hasCategory) {
    if (visibleCount === 0) showEmpty('Por el momento no hay productos para mostrar.');
    else hideEmpty();
  } else {
    if (visibleCount === 0) {
      if (subcategorySelect.value) showEmpty('Aún no contamos con artículos en esta subcategoría.');
      else showEmpty('Aún no contamos con artículos en esta categoría.');
    } else hideEmpty();
  }
  updateAllCardHearts();
}

/* == 12) CARGA de datos == */
function loadCategories() {
  return fetchFirstOk(API.categorias).then(function(res){
    var json = res.json;
    var list = Array.isArray(json) ? json : (Array.isArray(json && json.categories) ? json.categories : []);
    if (!list.length) throw new Error('categorias.json vacío o inesperado');
    categoriesMap = new Map();
    list.forEach(function(item){
      var name = item.name || item.category || '';
      var subs = Array.isArray(item.subcategories) ? item.subcategories : (Array.isArray(item.subs) ? item.subs : []);
      if (name) categoriesMap.set(name, subs);
    });
    fillCategorySelectFromMap();
  }).catch(function(){
    categoriesMap = null;
    console.warn('No se cargó categorias.json. Se derivará de productos.');
  });
}

function loadProducts() {
  return Promise.allSettled(API.productos.map(function(u){ return fetchNoCache(u).then(function(r){ if (!r.ok) throw new Error('!ok'); return r.json(); }); }))
  .then(function(results){
    var arrays = results.map(function(r){ return (r.status === 'fulfilled' ? r.value : null); })
      .filter(Boolean)
      .map(function(json){ return Array.isArray(json) ? json : (Array.isArray(json && json.products) ? json.products : []); })
      .filter(function(arr){ return Array.isArray(arr); });
    if (!arrays.length) throw new Error('No se pudo leer productos');

    var byId = new Map();
    function toBoolActive(v){
      if (v === false || v === 0) return false;
      if (typeof v === 'string') { var s = v.trim().toLowerCase(); if (s === '0' || s === 'false' || s === 'no') return false; }
      return true;
    }
    arrays.forEach(function(list){
      list.forEach(function(raw){
        var id = (raw.id != null ? raw.id : raw.name);
        id = id != null ? String(id) : '';
        if (!id) return;
        var p = Object.assign({}, raw);
        p.id = id;
        p.active = toBoolActive(p.active);
        byId.set(id, p);
      });
    });

    var all = Array.from(byId.values());
    var visible = all.map(function(p){ return Object.assign({}, p, { active: (p.active !== false) }); });
    productsById.clear();
    visible.forEach(function(p){ productsById.set(p.id, p); });

    renderProductGrid(visible);
    buildCategoryFilters(visible);
    bindAddButtons();
    bindFavoriteHearts();
    applyFilters();
    renderFavoritesRail();
  }).catch(function(e){
    console.error('loadProducts() error', e);
    var demo = [
      { id:'Coca-Cola 2.5lt Retornable', name: 'Coca-Cola 2.5lt Retornable', price: 40, category: 'Sodas', subcategory: 'Coca-Cola', image: 'https://via.placeholder.com/120', active: true, soldBy:'unit' },
      { id:'Coca-Cola 1.5lt Retornable', name: 'Coca-Cola 1.5lt Retornable', price: 28, category: 'Sodas', subcategory: 'Coca-Cola', image: 'https://via.placeholder.com/120', active: true, soldBy:'unit' }
    ];
    demo.forEach(function(p){ productsById.set(p.id, p); });
    renderProductGrid(demo);
    buildCategoryFilters(demo);
    bindAddButtons();
    bindFavoriteHearts();
    applyFilters();
  });
}

function loadZones() {
  return fetchFirstOk(API.zonas).then(function(res){
    var json = res.json;
    var zonas = [];
    if (Array.isArray(json)) zonas = json;
    else if (json && typeof json === 'object') {
      ['zonas','zones','items','data','records','rows'].some(function(k){
        if (Array.isArray(json[k])) { zonas = json[k]; return true; }
        return false;
      });
      if (!zonas.length && Object.keys(json).every(function(k){ return typeof json[k] === 'number'; })) {
        zonas = Object.keys(json).map(function(nombre){ return { nombre: nombre, costo: json[nombre] }; });
      }
    }
    if (!Array.isArray(zonas) || !zonas.length) throw new Error('zonas vacío/inesperado');

    ZONES = zonas.map(function(z){
      var nombre = String(z.nombre != null ? z.nombre : z.name != null ? z.name : '');
      var costo  = Number(z.costo != null ? z.costo : z.cost != null ? z.cost : z.price != null ? z.price : 0);
      var hasFlag = (z.freeShipping === true) || (z.envioGratis === true);
      var minFlag = Number(z.freeMin != null ? z.freeMin : z.minimoGratis != null ? z.minimoGratis : 0);
      var legacy  = Number(z.freeShippingThreshold != null ? z.freeShippingThreshold : z.free_threshold != null ? z.free_threshold : 0);
      var threshold = hasFlag && minFlag > 0 ? minFlag : (legacy > 0 ? legacy : 0);
      return { nombre: nombre, costo: costo, freeShippingThreshold: threshold };
    }).filter(function(z){ return z.nombre; });

    zonesByName.clear();
    ZONES.forEach(function(z){ zonesByName.set(z.nombre, { cost: z.costo, threshold: z.freeShippingThreshold }); });

    zone.innerHTML = ['<option value="">Selecciona una zona…</option>'].concat(
      ZONES.map(function(z){
        return '<option value="' + z.nombre + '|' + z.costo.toFixed(2) + '" data-th="' + (z.freeShippingThreshold || 0) + '">' +
               z.nombre + ' — $' + z.costo.toFixed(2) + '</option>';
      })
    ).join('');
  }).catch(function(e){
    console.warn('loadZones()', e);
    ZONES = [
      { nombre: 'Montecarlo', costo: 15, freeShippingThreshold: 149 },
      { nombre: 'Haciendas',  costo: 20, freeShippingThreshold: 0 },
      { nombre: 'Privadas del Roble', costo: 25, freeShippingThreshold: 0 }
    ];
    zonesByName.clear();
    ZONES.forEach(function(z){ zonesByName.set(z.nombre, { cost: z.costo, threshold: z.freeShippingThreshold }); });
    zone.innerHTML = ['<option value="">Selecciona una zona…</option>'].concat(
      ZONES.map(function(z){
        return '<option value="' + z.nombre + '|' + z.costo.toFixed(2) + '" data-th="' + (z.freeShippingThreshold || 0) + '">' +
               z.nombre + ' — $' + z.costo.toFixed(2) + '</option>';
      })
    ).join('');
  });
}

function loadServiceStatus(){
  return fetchFirstOk(API.servicio).then(function(res){
    var json = res.json;
    var data = Array.isArray(json) ? {} : (json || {});
    return { active: data.active !== false, message: data.message || '', image: data.image || '' };
  }).catch(function(){ return { active: true, message: '', image: '' }; });
}

/* == 13) EVENTOS GLOBALES == */
categorySelect.addEventListener('change', function(){
  if (categoriesMap && categoriesMap.size && categorySelect.value) fillSubcategorySelectFromMap(categorySelect.value);
  else subcategorySelect.disabled = !categorySelect.value;
  applyFilters();
});
subcategorySelect.addEventListener('change', applyFilters);
searchInput.addEventListener('input', applyFilters);

btnCart.addEventListener('click', function(){ openModal(modalCart); toggleContinueButton(); });

var transferNoticeShown = false;
btnContinue.addEventListener('click', function(){
  if (btnContinue.disabled) return;
  closeModal(modalCart);
  transferNoticeShown = false;
  openModal(modalCheckout);
});
if (btnConfirmNo)  btnConfirmNo.addEventListener('click', function(){ closeModal(modalConfirm); });
if (btnConfirmYes) btnConfirmYes.addEventListener('click', function(){
  if (typeof clearCart === 'function') clearCart();
  else {
    cart.clear(); renderCart();
    Array.prototype.forEach.call(document.querySelectorAll('.card .qty-control'), function(q){
      var card = q.closest('.card'); q.replaceWith(createAddButton(card));
    });
  }
  resetCheckoutForm();
  closeModal(modalConfirm);
  closeModal(modalCheckout);
});
Array.prototype.forEach.call(document.querySelectorAll('[data-close="cart"]'), function(el){ el.addEventListener('click', function(){ closeModal(modalCart); }); });
Array.prototype.forEach.call(document.querySelectorAll('[data-close="checkout"]'), function(el){ el.addEventListener('click', function(){ closeModal(modalCheckout); }); });
Array.prototype.forEach.call(document.querySelectorAll('[data-close="confirm"]'), function(el){ el.addEventListener('click', function(){ closeModal(modalConfirm); }); });
if (btnCancel) btnCancel.addEventListener('click', function(){ closeModal(modalCheckout); });

checkoutForm.addEventListener('input', validateCheckout);
checkoutForm.addEventListener('change', validateCheckout);
checkoutForm.addEventListener('input', saveCheckout);
checkoutForm.addEventListener('change', saveCheckout);

/* Aviso Transferencia */
(function attachTransferNotice(){
  if (!checkoutForm) return;
  var radios = checkoutForm.querySelectorAll('input[name="pay"]');
  Array.prototype.forEach.call(radios, function(r){
    r.addEventListener('change', function(e){
      var v = e.target.value;
      if (v === 'Transferencia') { if (!transferNoticeShown) { if (modalTransfer) openModal(modalTransfer); transferNoticeShown = true; } }
      else transferNoticeShown = false;
    });
  });
})();

/* FREE SHIPPING helpers */
function getCartSubtotalFast(){
  var txt = (document.getElementById('cartTotal') ? document.getElementById('cartTotal').textContent : '$0.00') || '$0.00';
  return parseFloat(txt.replace(/[^0-9.]/g,'')) || 0;
}
function getSelectedZoneInfo(){
  var val = zone.value || '';
  if (!val) return { name:'', cost:0, threshold:0 };
  var parts = val.split('|');
  var name = parts[0];
  var costStr = parts[1];
  var opt = zone.selectedOptions && zone.selectedOptions[0];
  var th  = opt ? Number(opt.dataset.th || 0) : ((zonesByName.get(name) || {}).threshold || 0);
  var cost = parseFloat(costStr || '0') || 0;
  return { name: name, cost: cost, threshold: th };
}
function computeShippingWithThreshold(subtotal){
  var z = getSelectedZoneInfo();
  var cost = z.cost, threshold = z.threshold;
  if (threshold > 0 && subtotal >= threshold) return 0;
  return cost;
}
function updateFreeShippingPromo(){
  if (!fsPill) return;
  var z = getSelectedZoneInfo();
  var name = z.name, threshold = z.threshold;
  var subtotal = getCartSubtotalFast();
  if (!name || !(threshold > 0)) {
    fsPill.classList.remove('show');
    fsPill.classList.add('hidden');
    return;
  }
  var progress = Math.max(0, Math.min(100, Math.round((subtotal / threshold) * 100)));
  var remaining = Math.max(0, threshold - subtotal);
  if (remaining > 0){
    if (fsMsg) fsMsg.innerHTML = 'Agrega <strong>' + currency(remaining) + '</strong> al carrito para Envío <strong>GRATIS</strong>.';
  } else {
    if (fsMsg) fsMsg.innerHTML = '¡Genial! Obtienes <strong>ENVÍO GRATIS</strong>. Aprovecha y agrega más productos.';
    progress = 100;
  }
  if (fsBar) fsBar.style.width = progress + '%';
  fsPill.classList.remove('is-red','is-amber','is-green');
  if (progress < 40) fsPill.classList.add('is-red');
  else if (progress < 100) fsPill.classList.add('is-amber');
  else fsPill.classList.add('is-green');

  if (fsShowOnAdd) { showFsToastOnce(); fsShowOnAdd = false; }
}
function showFsToastOnce() {
  if (!fsPill) return;
  var isShowing = fsPill.classList.contains('show');
  var current = (fsMsg && fsMsg.innerHTML) || '';
  if (isShowing && current === fsLastText) return;
  fsLastText = current;
  clearTimeout(fsTimer);
  fsPill.classList.remove('hidden');
  void fsPill.offsetWidth;
  fsPill.classList.add('show');
  fsTimer = setTimeout(function(){
    fsPill.classList.remove('show');
    setTimeout(function(){ fsPill.classList.add('hidden'); }, FS_COOLDOWN_MS);
  }, FS_SHOW_MS);
}
zone.addEventListener('change', function(){
  validateCheckout();
  updateCheckoutTotalPill();
  fsShowOnAdd = true;
  updateFreeShippingPromo();
});
/* == MINI POP-UP ADS (persistente/rotativo) == */
/* Preferencias/snooze */
var ADS_SNOOZE_MIN = 360;              // 6 horas de “no mostrar” tras cerrar
var ADS_SNOOZE_KEY = 'kachu_ads_snooze_until';

/* Tiempos (ms) */
var ADS_DISPLAY_MS = 6000;             // visible
var ADS_PAUSE_MS   = 10000;            // pausa entre mensajes

/* Estado */
var __adsNode = null, __adsClose = null, __adsL1 = null, __adsL2 = null, __adsCta = null;
var __adsTimers = [];
var __adsRunning = false;
var __adsIndex = 0;

/* Util: fecha/hora */
function nowMs(){ return Date.now(); }
function snoozedUntil(){ return parseInt(localStorage.getItem(ADS_SNOOZE_KEY)||'0',10) || 0; }
function setSnooze(minutes){
  var until = nowMs() + Math.max(1, minutes) * 60 * 1000;
  localStorage.setItem(ADS_SNOOZE_KEY, String(until));
}

/* Crear DOM si hace falta */
function ensureAdsDOM(){
  if (__adsNode) return;
  var sec = document.createElement('section');
  sec.id = 'popupKachu';
  sec.setAttribute('role','dialog');
  sec.setAttribute('aria-live','polite');
  sec.setAttribute('aria-label','Notificación');

  sec.innerHTML = '' +
    '<button class="ad-close" aria-label="Cerrar notificación">✕</button>' +
    '<p class="l1"></p>' +
    '<p class="l2"></p>' +
    '<p class="lcta" style="margin:0 22px 0 0;display:none">' +
      '<a class="cta" href="#" target="_blank" rel="noopener"></a>' +
    '</p>';

  document.body.appendChild(sec);

  __adsNode  = sec;
  __adsClose = sec.querySelector('.ad-close');
  __adsL1    = sec.querySelector('.l1');
  __adsL2    = sec.querySelector('.l2');
  __adsCta   = sec.querySelector('.lcta .cta');

  __adsClose.addEventListener('click', function(){
    stopAdsCycle(true);
    setSnooze(ADS_SNOOZE_MIN);
  });
}

/* Render del mensaje */
function setAdsContent(msg){
  // l1 y l2: como texto simple para evitar inyecciones; si necesitas HTML en l2, cámbialo a innerHTML conscientemente.
  __adsL1.textContent = (msg.l1 || '').trim();
  __adsL2.textContent = (msg.l2 || '').trim();

  var hasCTA = msg.ctaText && msg.ctaUrl;
  var pcta = __adsNode.querySelector('.lcta');
  if (hasCTA){
    __adsCta.textContent = msg.ctaText;
    __adsCta.href = msg.ctaUrl;
    pcta.style.display = '';
  } else {
    __adsCta.removeAttribute('href');
    pcta.style.display = 'none';
  }
}

/* Animaciones */
function adsAnimateIn(){
  __adsNode.classList.remove('out');
  __adsNode.style.display = 'block';
  void __adsNode.offsetWidth;
  __adsNode.classList.add('in');
}
function adsAnimateOut(cb){
  __adsNode.classList.remove('in');
  __adsNode.classList.add('out');
  var t = setTimeout(function(){
    __adsNode.style.display = 'none';
    cb && cb();
  }, 240);
  __adsTimers.push(t);
}

/* Ciclo */
function adsCycleOnce(){
  if (!__adsRunning) return;
  if (!AdsData.enabled || !AdsData.messages.length) { stopAdsCycle(true); return; }

  var msg = AdsData.messages[__adsIndex % AdsData.messages.length];
  setAdsContent(msg);
  adsAnimateIn();

  var t1 = setTimeout(function(){
    adsAnimateOut(function(){
      if (!__adsRunning) return;
      __adsIndex = (__adsIndex + 1) % AdsData.messages.length;
      var t2 = setTimeout(function(){ adsCycleOnce(); }, 1100 + ADS_PAUSE_MS);
      __adsTimers.push(t2);
    });
  }, ADS_DISPLAY_MS);
  __adsTimers.push(t1);
}

function startAdsCycle(){
  if (__adsRunning) return;
  if (!AdsData.enabled || !AdsData.messages.length) return;
  if (nowMs() < snoozedUntil()) return; // respetar snooze

  ensureAdsDOM();
  __adsRunning = true;
  __adsNode.style.display = 'block';
  var t = setTimeout(adsCycleOnce, 50);
  __adsTimers.push(t);
}

function stopAdsCycle(hideNow){
  __adsRunning = false;
  __adsTimers.forEach(function(t){ clearTimeout(t); });
  __adsTimers = [];
  if (__adsNode && hideNow){
    __adsNode.classList.remove('in','out');
    __adsNode.style.display = 'none';
  }
}

/* Pausar cuando la pestaña no es visible (ahorra batería/CPU) */
document.addEventListener('visibilitychange', function(){
  if (document.hidden) stopAdsCycle(true);
  else startAdsCycle();
});

/* == 14) WHATSAPP == */
checkoutForm.addEventListener('submit', function(e){
  e.preventDefault();
  validateCheckout();
  if (!checkoutForm.checkValidity()) { checkoutForm.reportValidity(); return; }

  var items = getCartItemsDetailed();
  var subtotal = items.reduce(function(acc, it){ return acc + it.line; }, 0);
  var zoneInfo = getSelectedZoneInfo();
  var shipping = computeShippingWithThreshold(subtotal);
  var base     = subtotal + shipping;

  var splitInfo = collectSplitPayForOrder();
  var pay = (checkoutForm.querySelector('input[name="pay"]:checked') || {}).value || 'Efectivo';

  var totalDue = +base.toFixed(2);
  var efectivo = null;
  var ticket;

  if (splitInfo && splitInfo.splitEnabled){
    if (splitInfo.paid + 1e-6 < splitInfo.total){
      alert('Faltan ' + formatMoney(splitInfo.total - splitInfo.paid) + ' para cubrir el total.');
      return;
    }
    totalDue = splitInfo.total;

    ticket = buildTicket({
      items: items,
      zoneName: zoneInfo.name,
      shipping: shipping,
      pay: 'Pago dividido',
      subtotal: subtotal,
      totalDue: totalDue,
      address: address.value.trim(),
      split: splitInfo
    });
  } else {
    if (pay === 'Tarjeta') totalDue = +(base * 1.043).toFixed(2);
    if (pay === 'Efectivo') {
      var pagaCon = parseFloat(cashGiven.value || '0') || 0;
      var cambio  = +(pagaCon - totalDue).toFixed(2);
      efectivo = { pagaCon: pagaCon, cambio: cambio };
    }
    ticket = buildTicket({
      items: items,
      zoneName: zoneInfo.name,
      shipping: shipping,
      pay: pay,
      subtotal: subtotal,
      totalDue: totalDue,
      address: address.value.trim(),
      efectivo: efectivo
    });
  }

  openWhatsAppWithMessage(ticket);
  openModal(modalConfirm);
});
function getCartItemsDetailed(){
  var items = [];
  cart.forEach(function(it){
    items.push({
      id: it.id, name: it.name, unit: Number(it.unit), qty: Number(it.qty),
      line: bestPriceById(it.id, it.qty).total,
      soldBy: it.soldBy, unitLabel: it.unitLabel, step: it.step
    });
  });
  return items;
}
function buildTicket(data) {
  var items = data.items, zoneName = data.zoneName, shipping = data.shipping, pay = data.pay, subtotal = data.subtotal, totalDue = data.totalDue, address = data.address, efectivo = data.efectivo, split = data.split;
  var lines = [];
  lines.push('*KaChu Domicilio*');
  lines.push('');

  if (items && items.length) {
    lines.push('*Artículos:*');
    items.forEach(function(it){
      var prod = productsById.get(it.id);
      var pricing = prod ? computeBestPriceRaw(prod, it.qty) : { total: it.line, breakdown: [] };
      var unitTxt = (it.soldBy === 'weight') ? (it.unitLabel || 'kg') : 'pza';
      lines.push('* ' + it.name);
      if (pricing.breakdown && pricing.breakdown.length) {
        pricing.breakdown.forEach(function(b){
          lines.push('> ' + b.times + ' × ' + b.qty + ' ' + unitTxt + ' = $' + Number(b.price).toFixed(2));
        });
        lines.push('> Total: $' + Number(pricing.total).toFixed(2));
      } else {
        var u = Number(it.unit).toFixed(2);
        var l = Number(it.line).toFixed(2);
        var qtyTxt = (it.soldBy === 'weight') ? (formatQty(it.qty, it.step) + ' ' + unitTxt) : (formatQty(it.qty, 1));
        lines.push('> ' + qtyTxt + ' x $' + u + ' = $' + l);
      }
      lines.push('');
    });
  }

  lines.push('*Subtotal:* $' + Number(subtotal).toFixed(2));
  lines.push('*Envío:* (' + (zoneName || 'Zona') + ') $' + Number(shipping).toFixed(2));

  if (split && split.splitEnabled){
    lines.push('');
    lines.push('*Pago:* Dividido');
    lines.push('> Método 1: ' + split.payments[0].method + ' — $' + split.payments[0].amount.toFixed(2));
    lines.push('> Método 2: ' + split.payments[1].method + ' — $' + split.payments[1].amount.toFixed(2));
    if (split.cardFee > 0) lines.push('> Comisión tarjeta: $' + split.cardFee.toFixed(2));
    lines.push('*Total a pagar:* $' + Number(split.total).toFixed(2));
    if (split.change > 0)  lines.push('*Cambio estimado:* $' + Number(split.change).toFixed(2));
  } else {
    lines.push('*Total a pagar:* $' + Number(totalDue).toFixed(2));
    lines.push('');
    lines.push('*Pago:* ' + pay);
    if (efectivo) {
      lines.push('*Paga con:* $' + Number(efectivo.pagaCon).toFixed(2));
      lines.push('*Cambio:* $' + Number(efectivo.cambio).toFixed(2));
    }
  }

  lines.push('');
  if (address) { lines.push('*Dirección de entrega:*'); lines.push('> ' + address); lines.push(''); }
  lines.push('*Aviso:* _Hemos recibido tu solicitud, en un máximo de *15min-20min* te estaríamos entregando tu pedido_');
  lines.push('');
  if (!split && (checkoutForm.querySelector('input[name="pay"]:checked') || {}).value === 'Transferencia') {
    lines.push('*Aviso:* _Pago Transferencia_');
    lines.push('> Con *este método de pago* la *entrega* de tu pedido puede *tardar un poco más de lo establecido.*');
    lines.push('> Esperamos la captura de tu transferencia y, cuando se *refleje* en nuestra banca, *enviamos* tu pedido.');
  }
  lines.push(' ```Gracias por tu compra...``` ');
  return lines.join('\n');
}

var STORE_WHATSAPP = '528135697787';
function openWhatsAppWithMessage(text){
  var base = STORE_WHATSAPP ? ('https://wa.me/' + STORE_WHATSAPP + '?text=') : 'https://wa.me/?text=';
  var url = base + encodeURIComponent(text);
  window.open(url, '_blank', 'noopener');
}

/* == 15) CHECKOUT == */
function toggleContinueButton(){
  var items = cartList.querySelectorAll('.cart-item').length;
  btnContinue.disabled = items === 0;
  cartBadge.hidden = items === 0;
}
var CARD_FEE_RATE = 0.043; // 4.3%
var __splitLastEdited = 1; // 1 = editó #1, 2 = editó #2

function formatMoney(n){ return '$' + Number(n||0).toFixed(2); }

function getCheckoutBase(){
  var subtotal = getCartSubtotalFast();
  var shipping = computeShippingWithThreshold(subtotal);
  return { subtotal: subtotal, shipping: shipping, base: subtotal + shipping };
}

function initSplitPay() {
  if (!twoPaymentsSwitch || !splitBox) return;

  // Switch ON/OFF
  twoPaymentsSwitch.addEventListener('change', function(){
    var on = !!twoPaymentsSwitch.checked;

    splitBox.classList.toggle('hidden', !on);
    var singleBox = document.getElementById('singlePayBox');
    if (singleBox) singleBox.classList.toggle('hidden', on);
    if (cashField) cashField.classList.add('hidden'); // ocultar efectivo de pago único si split ON

    if (!on){
      payAmount1.value = '';
      payAmount2.value = '';
      cashGivenSplit.value = '';
      if (cashFieldSplit) cashFieldSplit.classList.add('hidden');
    }

    recalcSplitPay();
    validateCheckout();
  });

  // Radios pay1 / pay2
  checkoutForm.querySelectorAll('input[name="pay1"]').forEach(function(r){
    r.addEventListener('change', function(){
      ensureDistinctMethodsRadios('pay1');
      toggleCashFieldSplit();
      recalcSplitPay();
      validateCheckout();
    });
  });
  checkoutForm.querySelectorAll('input[name="pay2"]').forEach(function(r){
    r.addEventListener('change', function(){
      ensureDistinctMethodsRadios('pay2');
      toggleCashFieldSplit();
      recalcSplitPay();
      validateCheckout();
    });
  });

  // Ambos montos son editables
  if (payAmount1){
    payAmount1.addEventListener('input', function(){
      __splitLastEdited = 1;
      recalcSplitPay();
      validateCheckout();
    });
  }
  if (payAmount2){
    payAmount2.addEventListener('input', function(){
      __splitLastEdited = 2;
      recalcSplitPay();
      validateCheckout();
    });
  }

  if (cashGivenSplit){
    cashGivenSplit.addEventListener('input', function(){
      recalcSplitPay();
      validateCheckout();
    });
  }

  // Primera corrida
  ensureDistinctMethodsRadios(null);
  toggleCashFieldSplit();
  recalcSplitPay();
}

function ensureDistinctMethodsRadios(changedGroup /* 'pay1' | 'pay2' | null */){
  var m1 = getRadioVal('pay1') || 'Efectivo';
  var m2 = getRadioVal('pay2') || 'Transferencia';
  if (m1 !== m2) return;

  // Preferencia para mover pay2 a la siguiente válida
  var order = ['Efectivo', 'Tarjeta', 'Transferencia'];
  var start = order.indexOf(m2);
  for (var i = 1; i < order.length + 1; i++){
    var cand = order[(start + i) % order.length];
    if (cand !== m1){
      setRadioVal('pay2', cand);
      break;
    }
  }
}

function recalcSplitPay(){
  var baseInfo = getCheckoutBase();
  var base = +baseInfo.base.toFixed(2);        // subtotal + envío (sin comisión)
  var m1 = getRadioVal('pay1') || 'Efectivo';
  var m2 = getRadioVal('pay2') || 'Transferencia';

  // split OFF: sólo pintar base y salir
  if (!twoPaymentsSwitch || !twoPaymentsSwitch.checked){
    if (splitSubtotalEl) splitSubtotalEl.textContent = formatMoney(base);
    if (splitFeeEl)      splitFeeEl.textContent      = formatMoney(0);
    if (splitTotalEl)    splitTotalEl.textContent    = formatMoney(base);
    if (splitChangeEl)   splitChangeEl.textContent   = formatMoney(0);
    if (splitMissingEl)  splitMissingEl.textContent  = 'Faltan: ' + formatMoney(0);
    updateCheckoutTotalPill();
    return;
  }

  var a1 = Math.max(0, Math.min(base, +((payAmount1 && payAmount1.value) || 0)));
  var a2 = Math.max(0, +((payAmount2 && payAmount2.value) || 0));
  var fee = 0;

  if (__splitLastEdited === 2){
    // Editó #2 ⇒ recalcular #1
    if (m2 === 'Tarjeta'){
      // a2 viene con fee incluido ⇒ neto que cubre del base:
      var net2 = +(a2 / (1 + CARD_FEE_RATE)).toFixed(2);
      fee = +(a2 - net2).toFixed(2);
      var rest = Math.max(0, +(base - net2).toFixed(2));
      a1 = rest;
      if (payAmount1) payAmount1.value = a1 ? a1.toFixed(2) : '';
    } else {
      // #2 sin fee ⇒ neto = a2
      var rest2 = Math.max(0, +(base - a2).toFixed(2));
      a1 = rest2;
      if (payAmount1) payAmount1.value = a1 ? a1.toFixed(2) : '';
      fee = 0;
    }
  } else {
    // Editó #1 ⇒ recalcular #2
    var faltante = Math.max(0, +(base - a1).toFixed(2));
    if (faltante > 0){
      if (m2 === 'Tarjeta'){
        a2  = +(faltante * (1 + CARD_FEE_RATE)).toFixed(2); // bruto con fee
        fee = +(a2 - faltante).toFixed(2);
      } else {
        a2 = faltante; fee = 0;
      }
    } else {
      a2 = 0; fee = 0;
    }
    if (payAmount2) payAmount2.value = a2 ? a2.toFixed(2) : '';
  }

  // Faltante (sin considerar fee)
  var faltanSinFee = Math.max(0, +(base - Math.min(base, a1) - (m2==='Tarjeta' ? Math.min(base, +(a2/(1+CARD_FEE_RATE)).toFixed(2)) : Math.min(base, a2))).toFixed(2));
  if (splitMissingEl) splitMissingEl.textContent = 'Faltan: ' + formatMoney(faltanSinFee);

  // Cambio (si alguno es Efectivo)
  var cashDue = 0;
  if (m1 === 'Efectivo') cashDue += a1;
  if (m2 === 'Efectivo') cashDue += a2;
  var change = 0;
  if (cashDue > 0 && cashGivenSplit && cashGivenSplit.value){
    var pagaCon = +cashGivenSplit.value || 0;
    var totalConFee = +(base + fee).toFixed(2);
    var paid = +(a1 + a2).toFixed(2);
    if (pagaCon >= cashDue && paid + 1e-6 >= totalConFee){
      change = +(pagaCon - cashDue).toFixed(2);
    }
  }

  if (splitSubtotalEl) splitSubtotalEl.textContent = formatMoney(base);
  if (splitFeeEl)      splitFeeEl.textContent      = formatMoney(fee);
  if (splitTotalEl)    splitTotalEl.textContent    = formatMoney(base + fee);
  if (splitChangeEl)   splitChangeEl.textContent   = formatMoney(change);

  toggleCashFieldSplit();
  updateCheckoutTotalPill();
}

function collectSplitPayForOrder(){
  if (!twoPaymentsSwitch || !twoPaymentsSwitch.checked) return null;

  var baseInfo = getCheckoutBase();
  var base = +baseInfo.base.toFixed(2);
  var m1 = getRadioVal('pay1') || 'Efectivo';
  var m2 = getRadioVal('pay2') || 'Transferencia';

  var a1 = Math.max(0, Math.min(base, +((payAmount1 && payAmount1.value) || 0)));
  var a2 = Math.max(0, +((payAmount2 && payAmount2.value) || 0));

  // Normaliza fee (si usuario editó #2, ya trae fee si es Tarjeta)
  var fee = 0, net2 = a2;
  if (m2 === 'Tarjeta'){
    net2 = +(a2 / (1 + CARD_FEE_RATE)).toFixed(2);
    fee  = +(a2 - net2).toFixed(2);
  }

  var paid = +(a1 + a2).toFixed(2);
  var total = +(base + fee).toFixed(2);

  // Cambio (si hay efectivo y “paga con”)
  var cashPortion = 0;
  if (m1 === 'Efectivo') cashPortion += a1;
  if (m2 === 'Efectivo') cashPortion += a2;

  var change = 0;
  if (cashPortion > 0 && cashGivenSplit && cashGivenSplit.value){
    var pagaCon = +cashGivenSplit.value || 0;
    if (pagaCon >= cashPortion && paid + 1e-6 >= total){
      change = +(pagaCon - cashPortion).toFixed(2);
    }
  }

  return {
    splitEnabled: true,
    payments: [
      { method: m1, amount: +a1.toFixed(2) },
      { method: m2, amount: +a2.toFixed(2) },
    ],
    cardFee: +fee.toFixed(2),
    subtotal: +baseInfo.subtotal.toFixed(2),
    shipping: +baseInfo.shipping.toFixed(2),
    total: total,
    change: +change.toFixed(2),
    paid: paid,
  };
}

function validateCheckout() {
  var zoneOk    = zone.value.trim() !== '';
  var addressOk = address.value.trim().length > 0;

  var sw = document.getElementById('twoPaymentsSwitch');
  var splitOn = !!(sw && sw.checked);

  var paySingle = (checkoutForm.querySelector('input[name="pay"]:checked') || {}).value || '';

  // Efectivo (pago único)
  var cashOk = true;
  if (!splitOn && paySingle === 'Efectivo') {
    var baseInfo = getCheckoutBase();
    var totalDueSingle = +(baseInfo.base).toFixed(2);

    var raw  = cashGiven.value.trim();
    var cash = parseFloat(raw);
    var msg = '';
    if (!raw.length)           { cashOk = false; msg = 'Con este dato calcularemos tu feria/cambio.'; }
    else if (isNaN(cash))      { cashOk = false; msg = 'Coloca un número válido (ej. 500.00).'; }
    else if (cash < totalDueSingle)  { cashOk = false; msg = 'El efectivo ingresado no cubre el total ($' + totalDueSingle.toFixed(2) + ').'; }

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

  // Split
  var splitOk = true;
  if (splitOn){
    var baseInfo2 = getCheckoutBase();
    var base = +baseInfo2.base.toFixed(2);
    var m1 = getRadioVal('pay1') || 'Efectivo';
    var m2 = getRadioVal('pay2') || 'Transferencia';
    if (m1 === m2) splitOk = false;

    var a1 = Math.max(0, Math.min(base, +((payAmount1 && payAmount1.value) || 0)));
    var a2 = Math.max(0, +((payAmount2 && payAmount2.value) || 0));
    var fee = (m2 === 'Tarjeta') ? +((a2 / (1 + CARD_FEE_RATE)) * CARD_FEE_RATE).toFixed(2) : 0;

    var total = +(base + fee).toFixed(2);
    var paid  = +(a1 + a2).toFixed(2);
    if (paid + 1e-6 < total) splitOk = false;
  }
  // No exigir pay único si split está ON
  var paySelectedOk = splitOn ? true : !!paySingle;

  btnWhatsApp.disabled = !(zoneOk && addressOk && cashOk && paySelectedOk && (!splitOn || splitOk));
  updateCheckoutTotalPill();
}

function resetCheckoutForm() {
  if (zone) zone.selectedIndex = 0;
  if (address) address.value = '';
  if (cashGiven) cashGiven.value = '';
  Array.prototype.forEach.call(checkoutForm.querySelectorAll('input[name="pay"]'), function(r){ r.checked = false; });
  cashField.classList.add('hidden');
  localStorage.removeItem(CHECKOUT_KEY);
  validateCheckout();
  if (typeof updateCheckoutTotalPill === 'function') updateCheckoutTotalPill();
}
function updateCheckoutTotalPill(){
  if (!checkoutTotalPill) return;

  var baseInfo = getCheckoutBase();
  var base = +baseInfo.base.toFixed(2); // subtotal + envío (sin comisión)

  // PAGO ÚNICO
  if (!twoPaymentsSwitch || !twoPaymentsSwitch.checked){
    var pay = (checkoutForm.querySelector('input[name="pay"]:checked') || {}).value || '';
    var totalDue = (pay === 'Tarjeta') ? +(base * (1 + CARD_FEE_RATE)).toFixed(2) : base;
    checkoutTotalPill.textContent = 'Total: ' + formatMoney(totalDue);
    return;
  }

  // SPLIT
  var m2 = (typeof getRadioVal === 'function' ? getRadioVal('pay2') : '') || 'Transferencia';
  var a2 = Math.max(0, +((payAmount2 && payAmount2.value) || 0)); // si m2=Tarjeta, a2 incluye fee
  var fee = 0;

  if (m2 === 'Tarjeta' && a2 > 0){
    var net2 = +(a2 / (1 + CARD_FEE_RATE)).toFixed(2); // lo que realmente cubre del base
    fee = +(a2 - net2).toFixed(2);                      // pura comisión
  }

  var total = +(base + fee).toFixed(2);
  checkoutTotalPill.textContent = 'Total: ' + formatMoney(total);
}

checkoutForm.addEventListener('change', function(){
  var pay = (checkoutForm.querySelector('input[name="pay"]:checked') || {}).value;
  if (cashField) cashField.classList.toggle('hidden', data.pay !== 'Efectivo');
  validateCheckout();
});

/* == 16) Social FABs == */
(function(){
  function closeAll(except){
    Array.prototype.forEach.call(document.querySelectorAll('.social-fabs .fab'), function(f){
      if (except && f===except) return;
      f.classList.remove('open');
      var btn = f.querySelector('.fab-btn');
      if (btn) btn.setAttribute('aria-expanded','false');
      var title = f.querySelector('.fab-title');
      if (title) title.textContent = title.getAttribute('data-name') || title.textContent;
    });
  }
  function initAlternator(fab){
    var title = fab.querySelector('.fab-title'); if (!title) return;
    var name = title.getAttribute('data-name') || title.textContent.trim();
    var alt  = 'click aquí';
    setInterval(function(){
      if (!fab.classList.contains('open')) { title.textContent = name; return; }
      title.textContent = (title.textContent === name) ? alt : name;
    }, 2400);
  }
  function initFab(fab){
    var btn = fab.querySelector('.fab-btn'); if (!btn) return;
    initAlternator(fab);
    function toggle(){
      if (fab.classList.contains('open')) { fab.classList.remove('open'); btn.setAttribute('aria-expanded','false'); }
      else { closeAll(fab); fab.classList.add('open'); btn.setAttribute('aria-expanded','true'); }
    }
    btn.addEventListener('click', toggle);
    btn.addEventListener('keydown', function(e){ if (e.key==='Enter' || e.key===' ') { e.preventDefault(); toggle(); } });
  }
  function initRail(){
    var rail = document.querySelector('.social-fabs'); if (!rail) return;
    Array.prototype.forEach.call(rail.querySelectorAll('.fab'), initFab);
    document.addEventListener('click', function(e){ if (!rail.contains(e.target)) closeAll(); });
  }
  if (document.readyState==='loading'){ window.addEventListener('DOMContentLoaded', initRail); }
  else { initRail(); }
})();

/* == 17) OVERLAY SERVICIO OFF == */
function showServiceOverlay(data){
  var message = data.message, image = data.image;
  var overlay = document.createElement('div');
  overlay.className = 'service-overlay';
  overlay.innerHTML = '' +
    '<div class="service-card">' +
      (image ? ('<img src="' + image + '" alt="">') : '') +
      '<h1>' + (message || 'Servicio temporalmente no disponible') + '</h1>' +
      (!image ? '<p>Gracias por tu comprensión.</p>' : '') +
    '</div>';
  document.body.appendChild(overlay);
  document.body.classList.add('service-blocked');
}

/* == 18) FAVORITOS: carrusel por grupos & nav ===== */
function favsGroupSize() {
  var vw = window.innerWidth || document.documentElement.clientWidth || 360;
  if (vw < 640) return 2;
  if (!favsTrack) return 2;
  var first = favsTrack.querySelector('.fav-card'); if (!first) return 2;
  var slideW = first.offsetWidth;
  var styles = getComputedStyle(favsTrack);
  var gap = parseFloat(styles.columnGap || styles.gap || '12') || 12;
  var visible = Math.max(1, Math.floor((favsTrack.clientWidth + gap) / (slideW + gap)));
  return Math.max(2, visible);
}
function favsScrollBySlide(dir) {
  if (!favsTrack) return;
  var first = favsTrack.querySelector('.fav-card'); if (!first) return;
  var slideW = first.offsetWidth;
  var styles = getComputedStyle(favsTrack);
  var gap = parseFloat(styles.columnGap || styles.gap || '12') || 12;
  var group = favsGroupSize();
  var delta = dir * group * (slideW + gap);
  favsTrack.scrollBy({ left: delta, behavior: 'smooth' });
}
function favsBuildDotsByGroups() {
  if (!favsTrack || !favsDots) return;
  var cards = Array.prototype.slice.call(favsTrack.querySelectorAll('.fav-card'));
  if (!cards.length) { favsDots.innerHTML = ''; return; }
  var totalGroups = Math.ceil(cards.length / favsGroupSize());
  var approx = Math.round((favsTrack.scrollLeft / Math.max(1, favsTrack.scrollWidth)) * totalGroups);
  var current = Math.max(0, Math.min(totalGroups - 1, approx));
  favsDots.innerHTML = Array.from({ length: totalGroups })
    .map(function(_, i){ return '<span class="favs-dot' + (i === current ? ' is-active' : '') + '"></span>'; })
    .join('');
}
function updateFavsNavVisibility() {
  if (!favsTrack) return;
  var atStart = favsTrack.scrollLeft <= 1;
  var maxScroll = favsTrack.scrollWidth - favsTrack.clientWidth - 1;
  var atEnd = favsTrack.scrollLeft >= maxScroll;
  if (favsPrev) { favsPrev.hidden = atStart; favsPrev.setAttribute('aria-hidden', atStart ? 'true' : 'false'); }
  if (favsNext) { favsNext.hidden = atEnd;   favsNext.setAttribute('aria-hidden', atEnd ? 'true' : 'false'); }
}
function favsApplyCenteredPadding(){
  if (!favsTrack) return;
  var first = favsTrack.querySelector('.fav-card'); if (!first) return;
  var vw = favsTrack.clientWidth;
  var slideW = first.offsetWidth;
  var styles = getComputedStyle(favsTrack);
  var gap = parseFloat(styles.columnGap || styles.gap || '12') || 12;
  var pad = Math.max(0, (vw - slideW) / 2);
  favsTrack.style.paddingLeft  = pad + 'px';
  favsTrack.style.paddingRight = pad + 'px';
  favsTrack.dataset.slideW = String(slideW);
  favsTrack.dataset.gap = String(gap);
}
function favsSetupCenteredCarousel(){
  favsApplyCenteredPadding();
  favsBuildDotsByGroups();
  updateFavsNavVisibility();
  if (favsTrack && !favsTrack.dataset._groupBound) {
    favsTrack.addEventListener('scroll', function(){
      favsBuildDotsByGroups();
      updateFavsNavVisibility();
    }, { passive: true });
    favsTrack.dataset._groupBound = '1';
  }
}
window.addEventListener('resize', function(){
  clearTimeout(window.__favsResizeT);
  window.__favsResizeT = setTimeout(function(){
    favsApplyCenteredPadding();
    favsBuildDotsByGroups();
    updateFavsNavVisibility();
  }, 100);
});
function bindFavsRailEvents(){
  if (favsPrev) favsPrev.addEventListener('click', function(){ favsScrollBySlide(-1); });
  if (favsNext) favsNext.addEventListener('click', function(){ favsScrollBySlide(+1); });
  if (favsAll)  favsAll.addEventListener('click', function(){ renderFavoritesModal(); openModal(modalFavs); });
}
Array.prototype.forEach.call(document.querySelectorAll('[data-close="favs"]'), function(el){
  el.addEventListener('click', function(){ closeModal(modalFavs); });
});

/* Modal scroll thresholds */
function applyFavsModalScroll(itemsLen){
  if (!favsModalList) return;
  var w = window.innerWidth || document.documentElement.clientWidth || 1024;
  var limit = (w < 480) ? 3 : (w < 780) ? 6 : 10;
  if (itemsLen > limit) favsModalList.classList.add('scroll');
  else favsModalList.classList.remove('scroll');
}

/* ======= RENDER del RIEL de FAVORITOS ======= */
function renderFavoritesRail(){
  if (!favsSection || !favsTrack) return;

  var items = Array.from(favorites)
    .map(function(id){ return productsById.get(id); })
    .filter(function(p){ return !!p; });

  if (!items.length){
    favsTrack.innerHTML = '';
    favsSection.classList.add('hidden');
    favsBuildDotsByGroups();
    updateFavsNavVisibility();
    return;
  }

  favsSection.classList.remove('hidden');

  favsTrack.innerHTML = items.map(function(p){
    var it = cart.get(p.id);
    var img = (p.image && String(p.image).trim()) ? p.image : svgPlaceholder('Sin foto');
    var price = Number(p.price||0).toFixed(2);
    var unitLabel = (p.soldBy === 'weight') ? 'kg' : 'pza';
    var isAvailable = (p.active !== false);

    var actions = isAvailable
      ? favQtyOrAddHTML(p)
      : '<button class="btn add unavailable" type="button" disabled aria-disabled="true" title="No disponible">No disponible</button>';

    return '' +
      '<div class="fav-card' + (isAvailable ? '' : ' is-unavailable') + '" data-id="' + p.id + '">' +
        '<div class="media"><img src="' + img + '" alt=""></div>' +
        '<div class="meta">' +
          '<h4>' + (p.name || '') + '</h4>' +
          '<p class="p">$' + price + ' <small>por ' + unitLabel + '</small></p>' +
          actions +
        '</div>' +
      '</div>';
  }).join('');

  favsTrack.onclick = function(e){
    var card = e.target.closest('.fav-card'); if (!card) return;
    var id = card.getAttribute('data-id'); if (!id) return;
    var p = productsById.get(id); if (!p) return;
    if (p.active === false) return;

    if (e.target.closest('.btn.add') && !e.target.classList.contains('unavailable')){
      var minQty = Number(p.minQty != null ? p.minQty : (p.soldBy==='weight' ? 0.25 : 1));
      var step   = Number(p.step   != null ? p.step   : (p.soldBy==='weight' ? 0.25 : 1));
      var unitLabel = p.soldBy==='weight' ? 'kg' : 'pza';
      cart.set(id, { id:id, name:p.name, unit:+Number(p.price||0), qty:minQty, soldBy:p.soldBy||'unit', unitLabel:unitLabel, step:step, minQty:minQty });
      renderCart();
      updateFavCardQtyUI(id);
      return;
    }

    var qplus  = e.target.closest('.qplus');
    var qminus = e.target.closest('.qminus');
    if (qplus || qminus){
      var it = cart.get(id);
      if (!it){
        var soldBy = p.soldBy || 'unit';
        var step   = Number(p.step != null ? p.step : (soldBy==='weight' ? 0.25 : 1));
        var minQty = Number(p.minQty != null ? p.minQty : step);
        var unitLabel = p.unitLabel || (soldBy==='weight' ? 'kg' : 'pza');
        it = { id:id, name:p.name, unit:+Number(p.price||0), qty:minQty, soldBy:soldBy, unitLabel:unitLabel, step:step, minQty:minQty };
      }
      var stepv = it.step > 0 ? it.step : 1;
      var minQ  = it.minQty > 0 ? it.minQty : (it.soldBy==='weight'?0.25:1);

      if (qplus){
        var nxt = +(it.qty + stepv).toFixed(3);
        if (it.soldBy !== 'weight') nxt = Math.max(1, Math.round(nxt));
        it.qty = nxt; cart.set(id, it);
      } else {
        var next = +(it.qty - stepv).toFixed(3);
        if (next < (minQ - EPS)) {
          if (confirm('¿Eliminar este artículo del carrito?')) {
            cart.delete(id);
          } else {
            return;
          }
        } else {
          if (it.soldBy !== 'weight') next = Math.max(1, Math.round(next));
          it.qty = next; cart.set(id, it);
        }
      }
      renderCart();
      updateFavCardQtyUI(id);
    }
  };

  favsSetupCenteredCarousel();
  favsBuildDotsByGroups();
  updateFavsNavVisibility();
  refreshAllFavQtyUIs();
}

/* == 19) INIT == */
window.addEventListener('DOMContentLoaded', function(){
  (function fixTopbarOffset(){
    var topbar = document.querySelector('.topbar'); if (!topbar) return;
    var applyOffset = function(){
      var h = topbar.offsetHeight || 0;
      document.body.classList.add('has-fixed-topbar');
      document.body.style.setProperty('--topbar-h', h + 'px');
    };
    window.addEventListener('load', applyOffset);
    window.addEventListener('resize', applyOffset);
    if (document.readyState !== 'loading') applyOffset();
  })();

  loadServiceStatus().then(function(service){
    if (!service.active) { showServiceOverlay(service); return; }
  }).catch(function(err){ console.error('Service status error', err); });

  loadCart(); initSplitPay(); recalcSplitPay(); renderCart(); validateCheckout(); loadCheckout();

  // Favoritos
  loadFavs();
  favsSetupCenteredCarousel();
  bindFavsRailEvents();

  Promise.all([ loadCategories(), loadProducts(), loadZones(), loadAds() ]).then(function(){
  Array.from(cart.keys()).forEach(function(id){ syncCardsQty(id); });
  toggleContinueButton();
  updateFreeShippingPromo();
  renderFavoritesRail();
  updateAllCardHearts();

  if (zone.value && (cart.size > 0)) { fsShowOnAdd = true; updateFreeShippingPromo(); }
  bindAddButtons();
  bindFavoriteHearts();

  // ===== iniciar pop-up de anuncios =====
  startAdsCycle();
}).catch(function(e){ console.error(e); });
});