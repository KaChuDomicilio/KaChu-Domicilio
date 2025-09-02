// ===== checkout.js =====
const checkoutForm = document.getElementById('checkoutForm');
const zone = document.getElementById('zone');
const address = document.getElementById('address');
const btnWhatsApp = document.getElementById('btnWhatsApp');

const cashField = document.getElementById('cashField');
const cashGiven = document.getElementById('cashGiven');
const cashHelp  = document.getElementById('cashHelp');
const checkoutTotalPill = document.getElementById('checkoutTotalPill');

const btnConfirmYes = document.getElementById('btnConfirmYes');
const btnConfirmNo  = document.getElementById('btnConfirmNo');

const STORE_WHATSAPP = '528135697787';
let transferNoticeShown = false;

// Persistencia checkout
function saveCheckout(){
  const pay = checkoutForm.querySelector('input[name="pay"]:checked')?.value || '';
  const data = { zone: zone.value || '', pay, address: address.value || '', cashGiven: cashGiven.value || '' };
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

// Validación + total dinámico
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
    if (!raw.length) { cashOk = false; msg = 'Con este dato calcularemos tu feria/cambio.'; }
    else if (isNaN(cash)) { cashOk = false; msg = 'Coloca un número válido (ej. 500.00).'; }
    else if (cash < totalDue) { cashOk = false; msg = `El efectivo ingresado no cubre el total ($${totalDue.toFixed(2)}).`; }

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
// Exponer para otros módulos
window.updateCheckoutTotalPill = updateCheckoutTotalPill;

// Campo efectivo visible solo si corresponde
checkoutForm.addEventListener('change', () => {
  const pay = checkoutForm.querySelector('input[name="pay"]:checked')?.value;
  cashField.classList.toggle('hidden', pay !== 'Efectivo');
  validateCheckout();
});

function attachTransferNotice() {
  if (!checkoutForm) return;
  const radios = checkoutForm.querySelectorAll('input[name="pay"]');
  radios.forEach(r => {
    r.addEventListener('change', (e) => {
      const v = e.target.value;
      if (v === 'Transferencia') {
        if (!transferNoticeShown) {
          if (typeof openModal === 'function') openModal(document.getElementById('modalTransferencia'));
          transferNoticeShown = true;
        }
      } else {
        transferNoticeShown = false;
      }
    });
  });
}
attachTransferNotice();

// Confirmación post-WhatsApp
btnConfirmNo?.addEventListener('click', () => closeModal(document.getElementById('modalConfirm')));
btnConfirmYes?.addEventListener('click', () => {
  if (typeof clearCart === 'function') clearCart();
  resetCheckoutForm();
  closeModal(document.getElementById('modalConfirm'));
  closeModal(document.getElementById('modalCheckout'));
});

// Reset checkout
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
window.resetCheckoutForm = resetCheckoutForm;

// WhatsApp
function buildTicket({ items, zoneName, shipping, pay, subtotal, totalDue, address, efectivo }) {
  const lines = [];
  lines.push('*KaChu Domicilio*','');
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
        if (pricing.adjusted && it.soldBy === 'weight') lines.push(`> Ajustado a ${pricing.qty} ${unitTxt} para cuadrar combos`);
        lines.push(`> Total: $${Number(pricing.total).toFixed(2)}`);
      } else {
        const u = Number(it.unit).toFixed(2);
        const l = Number(it.line).toFixed(2);
        const qtyTxt = (it.soldBy === 'weight') ? `${formatQty(it.qty, it.step)} ${unitTxt}` : `${formatQty(it.qty, 1)}`;
        lines.push(`> ${qtyTxt} x $${u} = $${l}`);
      }
      lines.push('');
    });
  }
  const isFree = Number(shipping) === 0;
  const envioTag = isFree ? `${zoneName || 'Zona'}` : (zoneName || 'Zona');
  lines.push(`*Subtotal:* $${Number(subtotal).toFixed(2)}`);
  lines.push(`*Envío:* (${envioTag}) $${Number(shipping).toFixed(2)}`);
  lines.push(`*Total a pagar:* $${Number(totalDue).toFixed(2)}`,'');
  lines.push(`*Pago:* ${pay}`);
  if (efectivo) {
    lines.push(`*Paga con:* $${Number(efectivo.pagaCon).toFixed(2)}`);
    lines.push(`*Cambio:* $${Number(efectivo.cambio).toFixed(2)}`);
  }
  lines.push('');
  if (address) { lines.push('*Dirección de entrega:*', `> ${address}`, ''); }
  lines.push('*Aviso:* _Hemos recibido tu solicitud, en un máximo de *15min-20min* te estaríamos entregando tu pedido_','');
  if (pay === 'Transferencia') {
    lines.push('','*Aviso:* _Pago Transferencia_');
    lines.push('> Con *este método de pago* la *entrega* de tu pedido puede *tardar un poco más de lo establecido.*');
    lines.push('> Esperamos la captura de tu transferencia, cuando se *refleje el pago* en nuestra Banca *procedemos a enviar* tu pedido');
  }
  lines.push(' ```Gracias por tu compra...``` ');
  return lines.join('\n');
}
function openWhatsAppWithMessage(text){
  const base = STORE_WHATSAPP ? `https://wa.me/${STORE_WHATSAPP}?text=` : `https://wa.me/?text=`;
  const url = base + encodeURIComponent(text);
  window.open(url, '_blank', 'noopener');
}

// Submit checkout
checkoutForm.addEventListener('submit', (e) => {
  e.preventDefault();
  validateCheckout();
  if (!checkoutForm.checkValidity()) {
    checkoutForm.reportValidity();
    return;
  }
  // items del carrito desde catálogo
  const items = (typeof getCartItemsDetailed === 'function') ? getCartItemsDetailed() : [];
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

  const ticket = buildTicket({ items, zoneName, shipping, pay, subtotal, totalDue, address: addressText, efectivo });
  openWhatsAppWithMessage(ticket);
  if (typeof openModal === 'function') openModal(document.getElementById('modalConfirm'));
});

// Eventos base
checkoutForm.addEventListener('input', validateCheckout);
checkoutForm.addEventListener('change', validateCheckout);
checkoutForm.addEventListener('input', saveCheckout);
checkoutForm.addEventListener('change', saveCheckout);

// Init parte checkout + servicio/zonas/categorías
window.addEventListener('DOMContentLoaded', async () => {
  try {
    const service = await loadServiceStatus();
    if (!service.active) {
      if (typeof showServiceOverlay === 'function') showServiceOverlay(service);
      return;
    }
  } catch (err) { console.error('Service status error', err); }

  await Promise.allSettled([ loadCategories(), loadZones() ]);
  loadCheckout();
  validateCheckout();
});