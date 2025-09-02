// ===== modals.js =====

// Referencias de modales
const modalCart = document.getElementById('modalCart');
const modalCheckout = document.getElementById('modalCheckout');
const modalConfirm = document.getElementById('modalConfirm');
const modalTransfer = document.getElementById('modalTransferencia');

const btnCart = document.getElementById('btnCart');
const btnContinue = document.getElementById('btnContinue');
const btnCancel = document.getElementById('btnCancel');
const btnTransferOK = document.getElementById('btnTransferOK');
const btnConfirmYes = document.getElementById('btnConfirmYes');
const btnConfirmNo  = document.getElementById('btnConfirmNo');

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

btnTransferOK?.addEventListener('click', () => closeModal(modalTransfer));

document.querySelectorAll('[data-close="cart"]').forEach(el=> el.addEventListener('click', ()=> closeModal(modalCart)));
document.querySelectorAll('[data-close="checkout"]').forEach(el=> el.addEventListener('click', ()=> closeModal(modalCheckout)));
document.querySelectorAll('[data-close="confirm"]').forEach(el=> el.addEventListener('click', ()=> closeModal(modalConfirm)));

btnCancel?.addEventListener('click', () => closeModal(modalCheckout));

// Social FABs
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

// Overlay “servicio apagado”
function showServiceOverlay({ message, image }){
  const overlay = document.createElement('div');
  overlay.className = 'service-overlay';
  overlay.innerHTML = `
    <div class="service-card">
      ${image ? `<img src="${image}" alt="">` : ''}
      <h1>${message || 'Servicio temporalmente no disponible'}</h1>
      ${!image ? `<p>Gracias por tu comprensión.</p>` : ''}
    </div>`;
  document.body.appendChild(overlay);
  document.body.classList.add('service-blocked');
}

// Exponer para otros módulos
window.openModal = openModal;
window.closeModal = closeModal;
window.showServiceOverlay = showServiceOverlay;

// Botón carrito (requiere toggleContinueButton de catalog.js)
btnCart?.addEventListener('click', () => {
  openModal(modalCart);
  if (typeof toggleContinueButton === 'function') toggleContinueButton();
});
