// ==== KaChu Catálogo – script.js (API-first, sin caché, solo activos) ====

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

btnClearCart?.addEventListener('click', clearCart);

// --------- Persistencia ---------
const CART_KEY = 'kachu_cart_v1';
const CHECKOUT_KEY = 'kachu_checkout_v1';

const cashHelp = document.getElementById('cashHelp');

function showCashBubble(msg) {
  if (!cashBubble) return;
  cashBubble.textContent = msg;
  cashBubble.classList.remove('hidden');
}
function hideCashBubble() {
  if (!cashBubble) return;
  cashBubble.classList.add('hidden');
}


// --- API primero; estáticos como respaldo ---
const API = {
  productos:  ['/api/data/productos',  '/public/data/productos.json',  '/data/productos.json',  'productos.json'],
  categorias: ['/api/data/categorias', '/public/data/categorias.json', '/data/categorias.json', 'categorias.json'],
  zonas:      ['/api/data/zonas',      '/public/data/zonas.json',      '/data/zonas.json',      'zonas.json'],
  servicio:   ['/api/data/servicio',   '/public/data/servicio.json',   '/data/servicio.json',   'servicio.json'],
};

// fetch sin caché (+timestamp para evitar CDN/browser cache)
async function fetchNoCache(url){
  const u = url + (url.includes('?') ? `&t=${Date.now()}` : `?t=${Date.now()}`);
  return fetch(u, { cache: 'no-store' });
}

// intenta URLs en orden hasta obtener 200
async function fetchFirstOk(urls){
  for (const url of urls){
    try{
      const r = await fetchNoCache(url);
      if (r.ok) return { url, json: await r.json() };
    }catch(_){}
  }
  throw new Error('No se pudo leer ninguna URL:\n' + urls.join('\n'));
}

// --------- Helpers ---------
const cart = new Map(); // id -> { id, name, unit, qty }
function money(n){ return '$' + Number(n).toFixed(2); }
function parseMoney(str){ return parseFloat((str||'').replace(/[^0-9.]/g,'')) || 0; }
function normalize(str){ return (str || '').toString().toLowerCase().trim(); }

function getCardInfo(card){
  const name = card.querySelector('h3')?.textContent.trim() || '';
  const unit = parseMoney(card.querySelector('.price')?.textContent);
  const id = name; // simple por ahora
  return { id, name, unit };
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
        cart.set(it.id, { id: it.id, name: it.name, unit: it.unit, qty: it.qty });
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

// --------- Categorías (desde categorias.json o derivadas de productos) ---------
let categoriesMap = null; // Map<string, string[]>  // name -> [subs]

function fillCategorySelectFromMap() {
  if (!categorySelect) return;
  const cats = Array.from(categoriesMap.keys()).sort();
  categorySelect.innerHTML = `<option value="">Todas</option>` +
    cats.map(c => `<option>${c}</option>`).join('');
  // Reset subcategoría
  subcategorySelect.innerHTML = `<option value="">Todas</option>`;
  subcategorySelect.disabled = true;
}

function fillSubcategorySelectFromMap(selectedCat) {
  const subs = categoriesMap.get(selectedCat) || [];
  subcategorySelect.innerHTML = `<option value="">Todas</option>` +
    subs.slice().sort().map(s => `<option>${s}</option>`).join('');
  subcategorySelect.disabled = subs.length === 0;
}

// --------- Modales ---------
function openModal(modal){
  if (!modal) return;
  modal.inert = false;                     // permitimos foco
  modal.classList.add('open');
  modal.removeAttribute('aria-hidden');    // visible para a11y
  // opcional: llevar foco al botón cerrar si existe
  setTimeout(() => modal.querySelector('.modal__close, [data-close]')?.focus?.(), 0);
}

function closeModal(modal){
  if (!modal) return;
  // si el foco está dentro del modal, quítalo antes de ocultar
  const active = document.activeElement;
  if (active && modal.contains(active)) active.blur();

  modal.classList.remove('open');
  modal.setAttribute('aria-hidden','true'); // oculto para a11y
  modal.inert = true;                       // bloquea foco/tab
}
// === Placeholder de imagen (sin red y correctamente codificado) ===
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
  grid.innerHTML = products.map(p => {
    const price = typeof p.price === 'number' ? p.price : parseFloat(p.price || 0);
    const img   = (p.image && String(p.image).trim()) ? p.image : svgPlaceholder('Sin foto');
    const cat   = p.category || '';
    const sub   = p.subcategory || '';
    const name  = p.name || '';

    return `
      <article class="card" data-category="${cat}" data-subcategory="${sub}">
        <img src="${img}" alt="${name}">
        <div class="info">
          <h3>${name}</h3>
          <p class="price">$${price.toFixed(2)}</p>
          <button class="btn add">Agregar</button>
        </div>
      </article>
    `;
  }).join('');
}

// Derivar filtros desde productos si no hay categorias.json (FALTABA)
function buildCategoryFilters(products){
  if (categoriesMap && categoriesMap.size) return; // ya tenemos categorias.json

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

// Enlazar “Agregar” en cada tarjeta (FALTABA)
function bindAddButtons(){
  document.querySelectorAll('.card').forEach(card => {
    const addBtn = card.querySelector('.btn.add');
    if (!addBtn || addBtn.dataset.bound === '1') return;
    addBtn.dataset.bound = '1';
    addBtn.addEventListener('click', () => switchToQtyControl(card, 1, true));
  });
}

// --------- Render del carrito ---------
function renderCart(){
  const items = Array.from(cart.values());
  cartList.innerHTML = '';

  let subtotal = 0;
  items.forEach(it=>{
    const line = +(it.unit * it.qty).toFixed(2);
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
          <span class="count">${it.qty}</span>
          <button class="chip cart-plus">+</button>
        </div>
        <span class="line-total">${money(line)}</span>
      </div>
    `;
    cartList.appendChild(li);
  });

  document.getElementById('cartTotal').textContent = money(+subtotal.toFixed(2));

  const totalQty = items.reduce((a,b)=> a + b.qty, 0);
  cartBadge.textContent = totalQty;
  cartBadge.style.display = totalQty ? '' : 'none';

  btnContinue.disabled = totalQty === 0;
  if (btnClearCart) btnClearCart.disabled = totalQty === 0;

  // --- activar/desactivar scroll del carrito según cantidad ---
  const needsScroll = items .length > 4;
  cartList.classList.toggle('scroll', needsScroll);

  // si quieres que el alto se ajuste al tamaño de pantalla:
  if (needsScroll) {
    const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
    cartList.style.maxHeight = Math.floor(vh * 0.48) + 'px'; // 48% del alto de la ventana
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

  // Regresa todos los productos a botón “Agregar”
  document.querySelectorAll('.card').forEach(card => {
    const qtyCtrl = card.querySelector('.qty-control');
    if (qtyCtrl) qtyCtrl.replaceWith(createAddButton(card));
  });
}

// Control qty en carrito
cartList.addEventListener('click', (e) => {
  const minus = e.target.closest('.cart-minus');
  const plus  = e.target.closest('.cart-plus');
  if (!minus && !plus) return;

  const li = e.target.closest('.cart-item');
  if (!li) return;
  const id = li.dataset.id;
  const item = cart.get(id);
  if (!item) return;

  if (plus) {
    item.qty++;
    cart.set(id, item);
    renderCart();
    syncCardsQty(id);
  }
  if (minus) {
    if (item.qty <= 1) {
      if (confirm('¿Eliminar este artículo del carrito?')) {
        cart.delete(id);
        renderCart();
        syncCardsQty(id);
      }
    } else {
      item.qty--;
      cart.set(id, item);
      renderCart();
      syncCardsQty(id);
    }
  }
});

// --------- Botones en tarjetas ---------
function createAddButton(card){
  const btn = document.createElement('button');
  btn.className = 'btn add';
  btn.textContent = 'Agregar';
  btn.addEventListener('click', () => switchToQtyControl(card, 1, true));
  return btn;
}
function createQtyControl(card, qty){
  const control = document.createElement('div');
  control.className = 'qty-control';

  const btnMinus = document.createElement('button');
  btnMinus.textContent = '−';
  const spanQty = document.createElement('span');
  spanQty.textContent = qty;
  const btnPlus = document.createElement('button');
  btnPlus.textContent = '+';

  btnPlus.addEventListener('click', () => {
    const { id, name, unit } = getCardInfo(card);
    const current = cart.get(id) || { id, name, unit, qty: 0 };
    current.qty++;
    cart.set(id, current);
    spanQty.textContent = current.qty;
    renderCart();
  });

  btnMinus.addEventListener('click', () => {
    const { id, name, unit } = getCardInfo(card);
    const current = cart.get(id) || { id, name, unit, qty: 0 };
    if (current.qty <= 1) {
      if (confirm('¿Eliminar este artículo del carrito?')) {
        cart.delete(id);
        renderCart();
        control.replaceWith(createAddButton(card));
      }
    } else {
      current.qty--;
      cart.set(id, current);
      spanQty.textContent = current.qty;
      renderCart();
    }
  });

  return control;
}
function switchToQtyControl(card, startQty = 1, addToCart = false){
  const { id, name, unit } = getCardInfo(card);
  if (addToCart) {
    cart.set(id, { id, name, unit, qty: startQty });
    renderCart();
  }
  const addBtn = card.querySelector('.btn.add');
  const control = createQtyControl(card, cart.get(id)?.qty || startQty);
  if (addBtn) addBtn.replaceWith(control);
}
function syncCardsQty(id){
  document.querySelectorAll('.card').forEach(card=>{
    const info = getCardInfo(card);
    if (info.id !== id) return;

    const item = cart.get(id);
    const qtyControl = card.querySelector('.qty-control');

    if (item) {
      if (!qtyControl) {
        switchToQtyControl(card, item.qty, false);
      } else {
        qtyControl.querySelector('span').textContent = item.qty;
      }
    } else {
      if (qtyControl) qtyControl.replaceWith(createAddButton(card));
    }
  });
}

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

  // 1) si hay búsqueda, manda la búsqueda (ignora selects)
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

  // 2) sin búsqueda: aplicar categoría/subcategoría
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

// --------- Carga de datos (API-first) ---------
async function loadCategories() {
  try {
    const { json } = await fetchFirstOk(API.categorias);
    const list = Array.isArray(json) ? json : (Array.isArray(json.categories) ? json.categories : []);
    if (!list.length) throw new Error('categorias.json vacío o con formato inesperado');
    // Construye el Map
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

    // Normaliza "active": si falta, se considera true (compatibilidad)
    const normalized = all.map(p => ({ ...p, active: (p?.active === false ? false : true) }));
    // Solo productos ACTIVOS
    const visible = normalized.filter(p => p.active);

    renderProductGrid(visible);
    buildCategoryFilters(visible);
    bindAddButtons();
    applyFilters();

    console.info('Productos desde:', url, '| Total:', all.length, '| Activos:', visible.length);
  } catch (e) {
    console.error('loadProducts()', e);
    const demo = [
      { name: 'Coca-Cola 2.5lt Retornable', price: 40, category: 'Sodas',   subcategory: 'Coca-Cola', image: 'https://via.placeholder.com/120', active: true },
      { name: 'Coca-Cola 1.5lt Retornable', price: 28, category: 'Sodas',   subcategory: 'Coca-Cola', image: 'https://via.placeholder.com/120', active: true }
    ];
    renderProductGrid(demo);
    buildCategoryFilters(demo);
    bindAddButtons();
    applyFilters();
  }
}

async function loadZones() {
  try {
    const { url, json } = await fetchFirstOk(API.zonas);
    console.debug('ZONAS raw from', url, json);

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
btnContinue.addEventListener('click', () => {
  if (btnContinue.disabled) return;
  closeModal(modalCart);
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

  // Totales actuales (igual que en tu pill)
  const subtotal = parseFloat(document.getElementById('cartTotal').textContent.replace(/[^0-9.]/g,'')) || 0;
  const [, zoneCostRaw] = (zone.value || '').split('|');
  const shipping = parseFloat(zoneCostRaw || '0') || 0;
  const base = subtotal + shipping;
  const totalDue = pay === 'Tarjeta' ? +(base * 1.043).toFixed(2) : +base.toFixed(2);

  // Validación de efectivo y mensaje en <small>
  let cashOk = true;
  if (pay === 'Efectivo') {
    const raw  = cashGiven.value.trim();
    const cash = parseFloat(raw);
    let msg = '';

    if (!raw.length) {
      cashOk = false; msg = 'Escribe el monto con el que pagarás.';
    } else if (isNaN(cash)) {
      cashOk = false; msg = 'Coloca un número válido (ej. 500.00).';
    } else if (cash < totalDue) {
      cashOk = false; msg = `El efectivo no cubre el total ($${totalDue.toFixed(2)}).`;
    }

    // bloquea submit nativo + muestra/oculta el <small>
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

  // Habilita/deshabilita WhatsApp
  btnWhatsApp.disabled = !(zoneOk && pay && addressOk && cashOk);

  // Actualiza el pill de total
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

checkoutForm.addEventListener('change', () => {
  const pay = checkoutForm.querySelector('input[name="pay"]:checked')?.value;
  cashField.classList.toggle('hidden', pay !== 'Efectivo');
  validateCheckout();
});

checkoutForm.addEventListener('submit', (e)=>{
  e.preventDefault();
  validateCheckout();
  if (!checkoutForm.checkValidity()) {
    // Muestra el bubble y también el tooltip nativo si el navegador decide
    checkoutForm.reportValidity();
    return;
  }
  const subtotal = parseFloat(document.getElementById('cartTotal').textContent.replace(/[^0-9.]/g, '')) || 0;

  const [zoneName, zoneCostRaw] = (zone.value || '').split('|');
  const shipping = parseFloat(zoneCostRaw || '0') || 0;

  const pay = checkoutForm.querySelector('input[name="pay"]:checked')?.value || 'Efectivo';

  const base = subtotal + shipping;
  const totalDue = pay === 'Tarjeta' ? +(base * 1.043).toFixed(2) : +base.toFixed(2);

  let changeInfo = '';
  if (pay === 'Efectivo') {
    const cash = parseFloat(cashGiven.value || '0') || 0;
    const change = +(cash - totalDue).toFixed(2);
    changeInfo = change >= 0
      ? `Cambio aproximado: $${Number(change).toFixed(2)}`
      : `Faltan: $${Number(Math.abs(change)).toFixed(2)}`;
  }

  const items = collectCartItems();
  const addressText = address.value.trim();

  const ticket = buildTicket({
    items,
    zoneName,
    shipping,
    pay,
    subtotal,
    totalDue,
    address: addressText,
    changeInfo
  });

  openWhatsAppWithMessage(ticket);
  openModal(modalConfirm);
});

// Lee items del modal del carrito (para armar ticket)
function collectCartItems(){
  const items = [];
  document.querySelectorAll('#cartList .cart-item').forEach(li=>{
    const name = li.querySelector('.name')?.textContent.trim() || '';
    const unit = parseFloat((li.querySelector('.unit')?.textContent || '').replace(/[^0-9.]/g,'')) || 0;
    const qty  = parseInt(li.querySelector('.count')?.textContent || '0', 10) || 0;
    const line = +(unit * qty).toFixed(2);
    items.push({ name, unit, qty, line });
  });
  return items;
}
function buildTicket({ items, zoneName, shipping, pay, subtotal, totalDue, address, changeInfo }) {
  const lines = [];
  lines.push('🧾 *Pedido KaChu*');
  lines.push('');
  if (items && items.length) {
    lines.push('*Artículos:*');
    items.forEach(it => {
      const u = Number(it.unit).toFixed(2);
      const l = Number(it.line).toFixed(2);
      lines.push(`• ${it.name} — $${u} x ${it.qty} = $${l}`);
    });
    lines.push('');
  }
  lines.push(`*Subtotal:* $${Number(subtotal).toFixed(2)}`);
  lines.push(`*Envío (${zoneName || 'Zona'}):* $${Number(shipping).toFixed(2)}`);
  if (pay === 'Tarjeta') lines.push(`% incluida`);
  lines.push(`*Total a pagar:* $${Number(totalDue).toFixed(2)}`);
  lines.push('');
  lines.push(`*Pago:* ${pay}`);
  if (pay === 'Efectivo' && changeInfo) lines.push(changeInfo);
  lines.push('');
  if (address) {
    lines.push('*Dirección:*');
    lines.push(address);
    lines.push('');
  }
  lines.push('Gracias por tu compra 🙌');
  return lines.join('\n');
}

const STORE_WHATSAPP = '528135697787'; // MX con 52 + número
function openWhatsAppWithMessage(text){
  const base = STORE_WHATSAPP
    ? `https://wa.me/${STORE_WHATSAPP}?text=`
    : `https://wa.me/?text=`;
  const url = base + encodeURIComponent(text);
  const win = window.open(url, '_blank', 'noopener');
  // if (!win) window.location.href = url;
}

// Control de “Continuar”
function toggleContinueButton(){
  const items = cartList.querySelectorAll('.cart-item').length;
  btnContinue.disabled = items === 0;
  cartBadge.style.display = items === 0 ? 'none' : '';
}

// --------- INIT ---------
window.addEventListener('DOMContentLoaded', async () => {

  // 0) Checar estado del servicio ANTES de montar catálogo
  try {
    const service = await loadServiceStatus();
    if (!service.active) {
      showServiceOverlay(service); // bloquea la UI
      return;
    }
  } catch (err) {
    console.error('Service status error', err);
    // continúa si prefieres
  }

  // 1) Flujo del catálogo
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

// ===== Social FABs (1 solo logo) =====
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
