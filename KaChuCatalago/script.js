// Utilidades simples para abrir/cerrar modales
const modalCart = document.getElementById('modalCart');
const modalCheckout = document.getElementById('modalCheckout');

const btnCart = document.getElementById('btnCart');
const btnContinue = document.getElementById('btnContinue');

const cartList = document.getElementById('cartList'); // lista demo
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

// ===== Filtros y búsqueda =====
const categorySelect = document.getElementById('category');
const subcategorySelect = document.getElementById('subcategory');
const searchInput = document.getElementById('searchInput');
const emptyState = document.getElementById('emptyState');
const grid = document.querySelector('.grid');

// ===== Persistencia local =====
const CART_KEY = 'kachu_cart_v1';
const CHECKOUT_KEY = 'kachu_checkout_v1';

function saveCart(){
  const arr = Array.from(cart.values()); // [{id,name,unit,qty}, ...]
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

    // Mostrar/ocultar campo de efectivo según lo cargado
    const isCash = data.pay === 'Efectivo';
    cashField.classList.toggle('hidden', !isCash);
  }catch(e){ console.warn('No se pudo cargar checkout:', e); }
}


// ===== Carrito en memoria =====
const cart = new Map(); // id -> { id, name, unit, qty }

// Helpers de dinero y parsing
function money(n){ return '$' + Number(n).toFixed(2); }
function parseMoney(str){ return parseFloat((str||'').replace(/[^0-9.]/g,'')) || 0; }

// Lee info de una tarjeta
function getCardInfo(card){
  const name = card.querySelector('h3')?.textContent.trim() || '';
  const unit = parseMoney(card.querySelector('.price')?.textContent);
  // Por ahora usamos el nombre como id (si después hay duplicados, añadimos data-sku)
  const id = name;
  return { id, name, unit };
}


// ⚙️ Configura aquí el WhatsApp del negocio (formato: 52 + número MX)
const STORE_WHATSAPP = '528135697787'; // Ej: '5218145069123'  ← PÓNLO cuando lo tengas

function fmt(n){ return Number(n).toFixed(2); }

function collectCartItems(){
  // Lee la lista del carrito actual en el modal
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

function buildTicket({items, zoneName, shipping, pay, subtotal, totalDue, address, changeInfo}){
  const now = new Date();
  const fecha = now.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });

  const lineasProductos = items.map(i =>
    `- ${i.name} — $${fmt(i.unit)} x ${i.qty} = $${fmt(i.line)}`
  ).join('\n');

  const partes = [
    `*Abarrotes KaChu*`,
    `_8:00am a 10:00pm | Lunes–Sábado_`,
    `_8:00am a 9:00pm | Domingo_`,
    ``,
    `*Pedido:* ${fecha}`,
    `*Zona:* ${zoneName || 'N/A'} (*envío:* $${fmt(shipping)})`,
    `*Método de pago:* ${pay}${pay==='*Tarjeta*' ? ' (*+IVA*)' : ''}`,
    ``,
    `*Productos:*`,
    lineasProductos ||'- (vacío)',
    ``,
    `*Subtotal:* $${fmt(subtotal)}`,
    `*Total:* $${fmt(totalDue)}`,
  ];

  if (pay === 'Efectivo' && changeInfo) partes.push(changeInfo);  // “Cambio: $… / Faltan: $…”
  partes.push(
    ``,
    `*Dirección:* ${address}`,
    `*Notas:* _El total puede variar según tipo de pago y zona de entrega._`,
    ``,
    `*¡Gracias por tu proxima compra!*`
  );

  return partes.join('\n');
}

function openWhatsAppWithMessage(text){
  const base = STORE_WHATSAPP
    ? `https://wa.me/${STORE_WHATSAPP}?text=`
    : `https://wa.me/?text=`;
  const url = base + encodeURIComponent(text);
  window.open(url, '_blank');
}



// --- Abrir carrito
btnCart.addEventListener('click', () => {
  openModal(modalCart);
  // habilitar/deshabilitar "Continuar" según si hay items (demo)
  toggleContinueButton();
});

// --- Continuar → abre Checkout
btnContinue.addEventListener('click', () => {
  if (btnContinue.disabled) return;
  closeModal(modalCart);
  openModal(modalCheckout);
});

// --- Cerrar por overlay o botón X
document.querySelectorAll('[data-close="cart"]').forEach(el=>{
  el.addEventListener('click', ()=> closeModal(modalCart));
});
document.querySelectorAll('[data-close="checkout"]').forEach(el=>{
  el.addEventListener('click', ()=> closeModal(modalCheckout));
});

document.querySelectorAll('[data-close="confirm"]').forEach(el=>{
  el.addEventListener('click', ()=> closeModal(modalConfirm));
});

// --- Cancelar en checkout → regresa al catálogo (cierra ambos)
btnCancel.addEventListener('click', () => {
  closeModal(modalCheckout);
});

// --- Habilitar enviar por WhatsApp cuando el formulario esté completo
checkoutForm.addEventListener('input', validateCheckout);
checkoutForm.addEventListener('change', validateCheckout);

checkoutForm.addEventListener('input', saveCheckout);
checkoutForm.addEventListener('change', saveCheckout);


function validateCheckout(){
  const zoneOk = zone.value.trim() !== '';
  const pay = checkoutForm.querySelector('input[name="pay"]:checked')?.value || '';
  const addressOk = address.value.trim().length > 0;

  let cashOk = true;
  if (pay === 'Efectivo') {
    cashOk = cashGiven.value.trim() !== '' && !isNaN(parseFloat(cashGiven.value)) && parseFloat(cashGiven.value) >= 0;
  }

  btnWhatsApp.disabled = !(zoneOk && pay && addressOk && cashOk);
}


checkoutForm.addEventListener('submit', (e)=>{
  e.preventDefault();

  // Subtotal leído del total del carrito (vista)
  const subtotal = parseFloat(document.getElementById('cartTotal').textContent.replace(/[^0-9.]/g, '')) || 0;

  // Zona y costo
  const [zoneName, zoneCostRaw] = (zone.value || '').split('|');
  const shipping = parseFloat(zoneCostRaw || '0') || 0;

  // Pago
  const pay = checkoutForm.querySelector('input[name="pay"]:checked')?.value || 'Efectivo';

  // Total final (4.3% oculto si tarjeta)
  const base = subtotal + shipping;
  const totalDue = pay === 'Tarjeta' ? +(base * 1.043).toFixed(2) : +base.toFixed(2);

  // Cambio si efectivo
  let changeInfo = '';
  if (pay === 'Efectivo') {
    const cash = parseFloat(cashGiven.value || '0') || 0;
    const change = +(cash - totalDue).toFixed(2);
    changeInfo = change >= 0
      ? `Cambio aproximado: $${fmt(change)}`
      : `Faltan: $${fmt(Math.abs(change))}`;
  }

  // Armar ticket con el detalle de productos actual del modal
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

  // Abrir WhatsApp con el mensaje prellenado
  openWhatsAppWithMessage(ticket);
  
	// Mostrar confirmación para limpiar o mantener
	openModal(modalConfirm);


});

// ===== Tarjetas: botón Agregar -> control - 1 + (con carrito real)
document.querySelectorAll('.card').forEach(card => {
  const addBtn = card.querySelector('.btn.add');
  if (!addBtn) return;
  addBtn.addEventListener('click', () => switchToQtyControl(card, 1, true));
});




// Helpers de modal
function openModal(modal){
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
}
function closeModal(modal){
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
}

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

  // Subtotal (se muestra como "Total" en el modal del carrito)
  document.getElementById('cartTotal').textContent = money(+subtotal.toFixed(2));

  // Badge 🛒
  const totalQty = items.reduce((a,b)=> a + b.qty, 0);
  cartBadge.textContent = totalQty;
  cartBadge.style.display = totalQty ? '' : 'none';

  // Botón Continuar
  btnContinue.disabled = totalQty === 0;
  
  // 👇 persistir
  saveCart();
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
      // Confirmar eliminación
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
  // Añadir al carrito si es la primera vez
  if (addToCart) {
    cart.set(id, { id, name, unit, qty: startQty });
    renderCart();
  }
  const addBtn = card.querySelector('.btn.add');
  const control = createQtyControl(card, cart.get(id)?.qty || startQty);
  if (addBtn) addBtn.replaceWith(control);
}

// Alinea UI de tarjetas con el estado del carrito (cuando cambian desde el carrito)
function syncCardsQty(id){
  document.querySelectorAll('.card').forEach(card=>{
    const info = getCardInfo(card);
    if (info.id !== id) return;

    const item = cart.get(id);
    const addBtn = card.querySelector('.btn.add');
    const qtyControl = card.querySelector('.qty-control');

    if (item) {
      // Debe verse el control con la cantidad correcta
      if (!qtyControl) {
        switchToQtyControl(card, item.qty, false);
      } else {
        qtyControl.querySelector('span').textContent = item.qty;
      }
    } else {
      // Debe volver el botón "Agregar"
      if (qtyControl) qtyControl.replaceWith(createAddButton(card));
    }
  });
}


// Mostrar el campo "¿Con cuánto vas a pagar?" SOLO si elige Efectivo
checkoutForm.addEventListener('change', () => {
  const pay = checkoutForm.querySelector('input[name="pay"]:checked')?.value;
  const isCash = pay === 'Efectivo';
  cashField.classList.toggle('hidden', !isCash);
  validateCheckout();
});

// Habilitar/Deshabilitar "Continuar" en base a si hay items (demo)
function toggleContinueButton(){
  const items = cartList.querySelectorAll('.cart-item').length;
  btnContinue.disabled = items === 0;
  // Badge demo: si no hay items, oculta la burbuja
  cartBadge.style.display = items === 0 ? 'none' : '';
}

function resetOrderState(){
  // 1) Vaciar carrito en memoria y en UI
  cart.clear();
  saveCart();
  renderCart();

  // 2) Volver las tarjetas a “Agregar”
  document.querySelectorAll('.card').forEach(card=>{
    const qtyCtrl = card.querySelector('.qty-control');
    if (qtyCtrl) qtyCtrl.replaceWith(createAddButton(card));
  });

  // 3) Resetear formulario de checkout
  checkoutForm.reset();           // limpia radios, selects e inputs
  zone.value = '';                // asegura zona en blanco
  address.value = '';
  cashGiven.value = '';
  cashField.classList.add('hidden');
  btnWhatsApp.disabled = true;

  // 4) Borrar persistencia del checkout
  localStorage.removeItem(CHECKOUT_KEY);

  // 5) Revalidar y cerrar modales
  validateCheckout();
  closeModal(modalCheckout);
  closeModal(modalCart);

  // 6) Opcional: pequeño aviso local
  // alert('Pedido enviado. ¡Gracias!'); 
}

btnConfirmYes.addEventListener('click', () => {
  resetOrderState();          // ← ya la tienes creada en tu script
  closeModal(modalConfirm);
});

btnConfirmNo.addEventListener('click', () => {
  // No limpiamos nada, solo cerramos el modal
  closeModal(modalConfirm);
});

function normalize(str){
  return (str || '').toString().toLowerCase().trim();
}

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
  const catVal = categorySelect.value;         // tal cual (respeta mayúsculas como en data-*)
  const subVal = subcategorySelect.value;

  const cards = getCards();
  let visibleCount = 0;

  // Reglas de prioridad:
  // 1) Si hay búsqueda, ignora categoría y subcategoría (la búsqueda es global)
  if (searchVal) {
    hideEmpty();
    // Asegurar que selects “vuelvan a estado inicial” (como pediste)
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
    return; // fin porque la búsqueda manda
  }

  // 2) No hay búsqueda: aplicar categoría/subcategoría
  // Habilitar/deshabilitar subcategoría según categoría
  const hasCategory = !!catVal;
  subcategorySelect.disabled = !hasCategory;
  if (!hasCategory) {
    subcategorySelect.value = '';
  }

  cards.forEach(card => {
    const cardCat = card.getAttribute('data-category') || '';
    const cardSub = card.getAttribute('data-subcategory') || '';

    let show = true;
    if (hasCategory) {
      // Si hay categoría seleccionada: mostrar todo lo de esa categoría...
      show = (cardCat === catVal);
      // ... y si además hay subcategoría, filtrar por ella también
      if (show && subcategorySelect.value) {
        show = (cardSub === subcategorySelect.value);
      }
    }
    card.style.display = show ? '' : 'none';
    if (show) visibleCount++;
  });

  // Mensajes de “sin resultados”
  if (!hasCategory) {
    // Sin filtros → mostrar todo, nunca empty (a menos que realmente no haya cartas)
    if (visibleCount === 0) {
      showEmpty('Por el momento no hay productos para mostrar.');
    } else {
      hideEmpty();
    }
  } else {
    if (visibleCount === 0) {
      if (subcategorySelect.value) {
        showEmpty('Aún no contamos con artículos en esta subcategoría. Estamos trabajando constantemente para ir agregando más artículos.');
      } else {
        showEmpty('Aún no contamos con artículos en esta categoría. Estamos trabajando constantemente para ir agregando más artículos.');
      }
    } else {
      hideEmpty();
    }
  }
}

// Eventos de filtros
categorySelect.addEventListener('change', () => {
  // Al elegir categoría, solo habilita subcategoría y aplica filtros
  // (NO toca búsqueda; la búsqueda solo resetea cuando el usuario escribe)
  applyFilters();
});

subcategorySelect.addEventListener('change', () => {
  applyFilters();
});

searchInput.addEventListener('input', () => {
  applyFilters();
});

// Pintado inicial (asegura subcategoría deshabilitada si no hay categoría)
applyFilters();


// ===== INIT =====
loadCart();
renderCart(); //Pinta lo Cargado
validateCheckout();
loadCheckout();

// Sincroniza tarjetas con cantidades cargadas
Array.from(cart.keys()).forEach(id => syncCardsQty(id));
toggleContinueButton();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(console.error);
  });
}
