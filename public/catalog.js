// ===== catalog.js =====

// Referencias UI específicas del catálogo
const categorySelect = document.getElementById('category');
const subcategorySelect = document.getElementById('subcategory');
const searchInput = document.getElementById('searchInput');
const emptyState = document.getElementById('emptyState');
const grid = document.querySelector('.grid');

const cartList = document.getElementById('cartList');
const cartBadge = document.getElementById('cartBadge');
const btnContinue = document.getElementById('btnContinue');
const btnClearCart = document.getElementById('btnClearCart');

btnClearCart?.addEventListener('click', clearCart);

// Utilidad tarjetas
function getCardInfo(card){
  const name = card.querySelector('h3')?.textContent.trim() || '';
  const unit = parseMoney(card.querySelector('.price')?.textContent);
  const id = name; // compatibilidad
  const soldBy    = card.dataset.soldby || 'unit';
  const unitLabel = card.dataset.unitlabel || (soldBy==='weight' ? 'kg' : 'pza');
  const step      = parseFloat(card.dataset.step || (soldBy==='weight' ? '0.25' : '1')) || 1;
  const minQty    = parseFloat(card.dataset.minqty || step) || step;
  return { id, name, unit, soldBy, unitLabel, step, minQty };
}

// Render de productos
function renderProductGrid(products){
  if(!grid) return;
  const html = products.map(p => {
    const price = typeof p.price === 'number' ? p.price : parseFloat(p.price || 0);
    const img   = (p.image && String(p.image).trim()) ? p.image : svgPlaceholder('Sin foto');
    const cat   = p.category || '';
    const sub   = p.subcategory || '';
    const name  = p.name || '';
    const soldBy    = p.soldBy || 'unit';
    const unitLabel = p.unitLabel || (soldBy==='weight' ? 'kg' : 'pza');
    const step      = Number(p.step ?? (soldBy==='weight' ? 0.25 : 1));
    const minQty    = Number(p.minQty ?? step);

    // Mostrar si hay combo de 1 (kg/pza)
    let displayPrice = price;
    const allTiers =
      (Array.isArray(p?.bundlePricing?.tiers) && p.bundlePricing.tiers) ||
      (Array.isArray(p?.kgPricing?.tiers)     && p.kgPricing.tiers)     ||
      (Array.isArray(p?.priceCombos)          && p.priceCombos)         || null;
    if (allTiers) {
      const t1 = allTiers.find(t => Number(t.qty) === 1);
      if (t1) displayPrice = Number(t1.price) || price;
    }

    return `
      <article class="card"
        data-category="${cat}" data-subcategory="${sub}"
        data-soldby="${soldBy}" data-unitlabel="${unitLabel}"
        data-step="${step}" data-minqty="${minQty}">
        <img src="${img}" alt="${name}">
        <div class="info">
          <h3>${name}</h3>
          <p class="price">$${Number(displayPrice).toFixed(2)}</p>
          <button class="btn add">${soldBy==='weight' ? `Agregar ${formatQty(minQty, step)} ${unitLabel}` : 'Agregar'}</button>
        </div>
      </article>`;
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
    if (cat && sub) { if (!subsByCat.has(cat)) subsByCat.set(cat, new Set()); subsByCat.get(cat).add(sub); }
  });
  if (categorySelect){
    const current = categorySelect.value;
    categorySelect.innerHTML = `<option value="">Todas</option>` + Array.from(cats).sort().map(c => `<option>${c}</option>`).join('');
    if ([...cats, ''].includes(current)) categorySelect.value = current;
  }
  if (subcategorySelect){
    const cat = categorySelect?.value || '';
    const subs = subsByCat.get(cat) || new Set();
    subcategorySelect.innerHTML = `<option value="">Todas</option>` + Array.from(subs).sort().map(s => `<option>${s}</option>`).join('');
    subcategorySelect.disabled = !cat;
  }
}
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

// Carrito
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
      </div>`;

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

  if (typeof updateCheckoutTotalPill === 'function') updateCheckoutTotalPill();
}

// Redimensionar
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
window.clearCart = clearCart;

// Qty dentro del carrito
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
  const minQty = (typeof item.minQty === 'number' && item.minQty > 0) ? item.minQty : ((item.soldBy === 'weight') ? 0.25 : 1);
  const snap = (n) => +n.toFixed(3);
  const clampUnits = (n) => Math.max(1, Math.round(n));

  if (plus) {
    let q = snap((item.qty || minQty) + step);
    if (item.soldBy !== 'weight') q = clampUnits(q);
    item.qty = q; cart.set(id, item);
    renderCart(); syncCardsQty(id); return;
  }
  if (minus) {
    const next = snap((item.qty || minQty) - step);
    if (next < (minQty - 1e-6)) {
      if (confirm('¿Eliminar este artículo del carrito?')) { cart.delete(id); renderCart(); syncCardsQty(id); }
    } else {
      let q = next; if (item.soldBy !== 'weight') q = clampUnits(q);
      item.qty = q; cart.set(id, item);
      renderCart(); syncCardsQty(id);
    }
  }
});

// Botones en tarjetas
function createAddButton(card){
  const info = getCardInfo(card);
  const btn = document.createElement('button');
  btn.className = 'btn add';
  btn.textContent = (info.soldBy === 'weight') ? `Agregar ${formatQty(info.minQty, info.step)} ${info.unitLabel}` : 'Agregar';
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
        cart.delete(id); renderCart(); control.replaceWith(createAddButton(card));
      }
    } else {
      cur.qty = next; if (soldBy === 'unit') cur.qty = Math.max(1, Math.round(cur.qty));
      cart.set(id, cur); spanQty.textContent = fmt(cur.qty); renderCart();
    }
  });
  return control;
}
function switchToQtyControl(card, startQty = 1, addToCart = false){
  const info = getCardInfo(card);
  const start = addToCart ? info.minQty : (cart.get(info.id)?.qty || info.minQty);
  if (addToCart) { cart.set(info.id, { ...info, qty: start }); renderCart(); }
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
        if (span) { span.textContent = (item.soldBy === 'weight') ? formatQty(item.qty, item.step) : formatQty(item.qty, 1); }
      }
    } else {
      if (qtyControl) qtyControl.replaceWith(createAddButton(card));
    }
  });
}

// Filtros / búsqueda
function showEmpty(msg){ emptyState.textContent = msg; emptyState.classList.remove('hidden'); }
function hideEmpty(){ emptyState.textContent = ''; emptyState.classList.add('hidden'); }
function getCards(){ return Array.from(document.querySelectorAll('.card')); }

function applyFilters(){
  const searchVal = normalize(searchInput.value);
  const cards = getCards();
  let visibleCount = 0;

  if (searchVal) {
    hideEmpty();
    if (categorySelect.value !== '' || subcategorySelect.value !== '') {
      categorySelect.value = ''; subcategorySelect.value = ''; subcategorySelect.disabled = true;
    }
    cards.forEach(card => {
      const name = normalize(card.querySelector('h3')?.textContent);
      const match = name.includes(searchVal);
      card.style.display = match ? '' : 'none';
      if (match) visibleCount++;
    });
    if (visibleCount === 0){
      showEmpty('Verifique que escribió bien el nombre del producto | Posiblemente no haya inventario de este producto. Estamos trabajando para agregarlo a la lista.');
    } else { hideEmpty(); }
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
      if (show && subcategorySelect.value) show = (cardSub === subcategorySelect.value);
    }
    card.style.display = show ? '' : 'none';
    if (show) visibleCount++;
  });

  if (!hasCategory) {
    if (visibleCount === 0) { showEmpty('Por el momento no hay productos para mostrar.'); } else { hideEmpty(); }
  } else {
    if (visibleCount === 0) {
      if (subcategorySelect.value) showEmpty('Aún no contamos con artículos en esta subcategoría. Estamos trabajando constantemente para ir agregando más artículos.');
      else showEmpty('Aún no contamos con artículos en esta categoría. Estamos trabajando constantemente para ir agregando más artículos.');
    } else { hideEmpty(); }
  }
}

// Carga de productos (aquí harás cambios a futuro)
async function loadProducts() {
  try {
    const { url, json } = await fetchFirstOk(API.productos);
    const all = Array.isArray(json) ? json : (Array.isArray(json.products) ? json.products : []);
    if (!all.length) throw new Error('productos vacío o con formato inesperado');

    const normalized = all.map(p => ({ ...p, active: (p?.active === false ? false : true) }));
    const visible = normalized.filter(p => p.active);

    // indexar para motor de precios
    productsById.clear();
    visible.forEach(p => { const id = p.id || p.name; p.id = id; productsById.set(id, p); });

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

// Eventos de filtros
categorySelect.addEventListener('change', () => {
  if (categoriesMap && categoriesMap.size && categorySelect.value) {
    const subs = categoriesMap.get(categorySelect.value) || [];
    subcategorySelect.innerHTML = `<option value="">Todas</option>` + subs.slice().sort().map(s => `<option>${s}</option>`).join('');
    subcategorySelect.disabled = subs.length === 0;
  } else {
    subcategorySelect.disabled = !categorySelect.value;
  }
  applyFilters();
});
subcategorySelect.addEventListener('change', applyFilters);
searchInput.addEventListener('input', applyFilters);

// Botón continuar (abre modal checkout desde modals.js)
function toggleContinueButton(){
  const items = cartList.querySelectorAll('.cart-item').length;
  btnContinue.disabled = items === 0;
  cartBadge.style.display = items === 0 ? 'none' : '';
}
window.toggleContinueButton = toggleContinueButton;

btnContinue.addEventListener('click', () => {
  if (btnContinue.disabled) return;
  if (typeof closeModal === 'function') closeModal(document.getElementById('modalCart'));
  if (typeof openModal === 'function') openModal(document.getElementById('modalCheckout'));
});

// Items detallados para checkout
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
window.getCartItemsDetailed = getCartItemsDetailed;

// INIT catálogo
window.addEventListener('DOMContentLoaded', async () => {
  // Inicializar carrito almacenado
  (function loadCart(){
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
  })();

  renderCart();
  await loadProducts();
  // Sincroniza qty en tarjetas para items ya en carrito
  Array.from(cart.keys()).forEach(id => syncCardsQty(id));
  toggleContinueButton();
});

// Guardar carrito en cada render
(function patchSaveCart(){
  const _render = renderCart;
  window.renderCart = function(){
    _render();
    // persistir
    const arr = Array.from(cart.values());
    localStorage.setItem(CART_KEY, JSON.stringify(arr));
  };
})();