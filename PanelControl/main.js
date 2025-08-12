// =======================
// Panel de Control KaChu
// Lógica visual (sin guardados)
// =======================
document.addEventListener('DOMContentLoaded', () => {
  // === CONFIG API (ajusta tu dominio del catálogo y clave) ===
  const API_BASE = 'https://kachudomicilio.netlify.app/kachucatalago/.netlify/functions';
  const ADMIN_KEY = 'kachu-2025-ultra';

  // --- Sidebar (hamburguesa) ya lo teníamos ---
  const menuBtn    = document.querySelector('.menu-btn');
  const sidebar    = document.getElementById('menuLateral');
  const overlay    = document.getElementById('menuOverlay');

  function openMenu(){
    sidebar.classList.add('activo');
    overlay.classList.add('activo');
    document.body.style.overflow = 'hidden';
  }
  function closeMenu(){
    sidebar.classList.remove('activo');
    overlay.classList.remove('activo');
    document.body.style.overflow = '';
  }
  function toggleMenu(){
    sidebar.classList.contains('activo') ? closeMenu() : openMenu();
  }
  if (menuBtn && sidebar && overlay) {
    menuBtn.addEventListener('click', toggleMenu);
    overlay.addEventListener('click', closeMenu);
    document.addEventListener('keydown', (e)=>{ if (e.key === 'Escape') closeMenu(); });
    sidebar.addEventListener('click', (e)=>{ if (e.target.tagName === 'BUTTON') closeMenu(); });
  }

  // ======================
  //   Botón flotante "+" 
  //   y modal principal
  // ======================
  const btnAgregar   = document.getElementById('btnAgregar');
  const modalAgregar = document.getElementById('modalAgregar');
  const modalContent = document.getElementById('modalContent');

  // Vistas dentro del modal
  const menuOpciones = document.getElementById('menuOpciones');
  const formCatSub   = document.getElementById('formCatSub');
  const formProducto = document.getElementById('formProducto');
  const formZona     = document.getElementById('formZona');

  // Botones del menú de opciones
  const btnCatSub    = document.getElementById('btnCatSub');
  const btnProducto  = document.getElementById('btnProducto');
  // "Agregar Zona" no tiene id en el HTML -> lo resolvemos por texto
  const btnZona = (() => {
    const opts = modalContent.querySelectorAll('#menuOpciones .modal-opcion');
    return Array.from(opts).find(b => (b.textContent || '').toLowerCase().includes('zona'));
  })();

  // --------- Helpers de UI ---------
  function openModalAgregar(){
    showView('menu');
    modalAgregar.classList.remove('oculto');
    document.body.style.overflow = 'hidden';
  }
  function closeModalAgregar(){
    modalAgregar.classList.add('oculto');
    document.body.style.overflow = '';
    // reset visual básico
    resetForms();
  }
  function showView(view){
    // view: "menu" | "cat" | "prod" | "zona"
    menuOpciones.style.display = (view === 'menu') ? 'block' : 'none';
    formCatSub.style.display   = (view === 'cat')  ? 'block' : 'none';
    formProducto.style.display = (view === 'prod') ? 'block' : 'none';
    formZona.style.display     = (view === 'zona') ? 'block' : 'none';
  }
  function resetForms(){
    // Categoría/Subcategoría
    selectCategoria.value = '';
    inputNuevaCategoria.value = '';
    selectSubcategoria.value = '';
    inputNuevaSubcategoria.value = '';
    selectSubcategoria.disabled = true;
    inputNuevaSubcategoria.disabled = true;
    btnGuardarCat.disabled = true;

    // Producto
    inputNombreProducto.value = '';
    inputPrecioProducto.value = '';
    inputStockProducto.value  = '';
    selectCategoriaProd.value = '';
    selectSubcategoriaProd.value = '';
    selectSubcategoriaProd.disabled = true;
    btnGuardarProd.disabled = true;

    // Zona
    inputNombreZona.value = '';
    inputCostoZona.value  = '';
    btnGuardarZona.disabled = true;
  }

  if (btnAgregar) btnAgregar.addEventListener('click', openModalAgregar);

  // Cerrar modal al hacer click fuera del contenido
  if (modalAgregar && modalContent) {
    modalAgregar.addEventListener('click', (e)=>{
      if (!modalContent.contains(e.target)) {
        closeModalAgregar();
      }
    });
    // Tecla ESC cierra
    document.addEventListener('keydown', (e)=>{
      if (!modalAgregar.classList.contains('oculto') && e.key === 'Escape') closeModalAgregar();
    });
  }

  // Abrir vistas desde el menú principal
  if (btnCatSub)   btnCatSub.addEventListener('click', () => showView('cat'));
  if (btnProducto) btnProducto.addEventListener('click', () => showView('prod'));
  if (btnZona)     btnZona.addEventListener('click',     () => showView('zona'));

  // === Estado en memoria de categorías ===
  // catsState = { "Bebidas": ["Refrescos","Jugos"], "Panadería": ["Pan"] }
  const catsState = {};
  function upsertCategory(catName){
    const n = (catName || '').trim();
    if (!n) return;
    if (!catsState[n]) catsState[n] = [];
  }
  function upsertSubcategory(catName, subName){
    const c = (catName || '').trim();
    const s = (subName || '').trim();
    if (!c || !s) return;
    upsertCategory(c);
    if (!catsState[c].includes(s)) catsState[c].push(s);
  }
  function buildCatsPayloadFromState(){
    const categories = Object.entries(catsState).map(([name, subcategories]) => ({ name, subcategories }));
    return { categories };
  }
  async function pushCategoriesFromState(){
    const payload = buildCatsPayloadFromState();
    const res = await fetch(`${API_BASE}/cats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Key': ADMIN_KEY },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const txt = await res.text().catch(()=> '');
      throw new Error('Error POST /cats: ' + txt);
    }
    return res.json();
  }
  async function pullCategoriesToState(){
    try{
      const r = await fetch(`${API_BASE}/cats`, { cache: 'no-store' });
      const { categories=[] } = await r.json();
      // limpiar y volcar
      for (const k of Object.keys(catsState)) delete catsState[k];
      categories.forEach(c=>{
        upsertCategory(c.name);
        (c.subcategories||[]).forEach(s=> upsertSubcategory(c.name, s));
      });
      if (typeof renderCatsIntoSelects === 'function') renderCatsIntoSelects();
    }catch(e){ console.warn('No se pudo cargar categorías del servidor:', e); }
  }

  // ======================
  //   Form Cat/Subcat (UI)
  // ======================
  const selectCategoria        = document.getElementById('selectCategoria');
  const inputNuevaCategoria    = document.getElementById('inputNuevaCategoria');
  const selectSubcategoria     = document.getElementById('selectSubcategoria');
  const inputNuevaSubcategoria = document.getElementById('inputNuevaSubcategoria');
  const btnCancelarCat         = document.getElementById('btnCancelarCat');
  const btnGuardarCat          = document.getElementById('btnGuardarCat');

  function validateCatForm(){
    const hasCat = !!selectCategoria.value.trim() || !!inputNuevaCategoria.value.trim();
    const enableSub = hasCat;
    selectSubcategoria.disabled     = !enableSub;
    inputNuevaSubcategoria.disabled = !enableSub;
    btnGuardarCat.disabled = !hasCat;
  }
  [selectCategoria, inputNuevaCategoria, selectSubcategoria, inputNuevaSubcategoria]
    .forEach(el => el && el.addEventListener('input', validateCatForm));
  if (btnCancelarCat) btnCancelarCat.addEventListener('click', () => {
    resetForms();
    showView('menu');
  });
  if (btnGuardarCat) btnGuardarCat.addEventListener('click', async () => {
    // 1) Leer form
    const catExisting = (selectCategoria.value || '').trim();
    const catNew      = (inputNuevaCategoria.value || '').trim();
    const subExisting = (selectSubcategoria.value || '').trim();
    const subNew      = (inputNuevaSubcategoria.value || '').trim();

    // 2) Actualizar estado local
    const chosenCat = catNew || catExisting;
    if (chosenCat) upsertCategory(chosenCat);
    const chosenSub = subNew || subExisting;
    if (chosenSub) upsertSubcategory(chosenCat, chosenSub);

    // 3) Enviar al servidor
    try {
      await pushCategoriesFromState();
      showToast('Categorías guardadas en el servidor.');
    } catch (e) {
      console.error(e);
      showToast('Error guardando categorías.');
      return; // no hacer reset si falló
    }

    // 4) UI
    resetForms();
    showView('menu');
  });

  // ======================
  //   Form Producto (UI)
  // ======================
  const inputNombreProducto   = document.getElementById('inputNombreProducto');
  const inputPrecioProducto   = document.getElementById('inputPrecioProducto');
  const inputStockProducto    = document.getElementById('inputStockProducto');
  const selectCategoriaProd   = document.getElementById('selectCategoriaProd');
  const selectSubcategoriaProd= document.getElementById('selectSubcategoriaProd');
  const inputImagenProducto   = document.getElementById('inputImagenProducto');
  const btnCancelarProd       = document.getElementById('btnCancelarProd');
  const btnGuardarProd        = document.getElementById('btnGuardarProd');

  function validateProdForm(){
    const hasCat = !!selectCategoriaProd.value.trim();
    selectSubcategoriaProd.disabled = !hasCat;

    const nameOk = !!inputNombreProducto.value.trim();
    const price  = parseFloat(inputPrecioProducto.value);
    const stock  = parseInt(inputStockProducto.value, 10);
    const priceOk= !isNaN(price) && price >= 0;
    const stockOk= !isNaN(stock) && stock >= 0;

    btnGuardarProd.disabled = !(nameOk && priceOk && stockOk && hasCat);
  }
  [inputNombreProducto, inputPrecioProducto, inputStockProducto, selectCategoriaProd, selectSubcategoriaProd, inputImagenProducto]
    .forEach(el => el && el.addEventListener('input', validateProdForm));
  if (btnCancelarProd) btnCancelarProd.addEventListener('click', () => {
    resetForms();
    showView('menu');
  });
  if (btnGuardarProd) btnGuardarProd.addEventListener('click', () => {
    showToast('Guardado correctamente.');
    resetForms();
    showView('menu');
  });

  // ======================
  //   Form Zona (UI)
  // ======================
  const inputNombreZona = document.getElementById('inputNombreZona');
  const inputCostoZona  = document.getElementById('inputCostoZona');
  const btnCancelarZona = document.getElementById('btnCancelarZona');
  const btnGuardarZona  = document.getElementById('btnGuardarZona');

  function validateZonaForm(){
    const nameOk = !!inputNombreZona.value.trim();
    const cost   = parseFloat(inputCostoZona.value);
    const costOk = !isNaN(cost) && cost >= 0;
    btnGuardarZona.disabled = !(nameOk && costOk);
  }
  [inputNombreZona, inputCostoZona].forEach(el => el && el.addEventListener('input', validateZonaForm));
  if (btnCancelarZona) btnCancelarZona.addEventListener('click', () => {
    resetForms();
    showView('menu');
  });
  if (btnGuardarZona) btnGuardarZona.addEventListener('click', () => {
    showToast('Guardado correctamente.');
    resetForms();
    showView('menu');
  });

  // ======================
  //   Toast de “Guardado”
  // ======================
  const toast = document.getElementById('mensajeGuardado');
  const btnCerrarMensaje = document.getElementById('cerrarMensaje');
  let toastTimer = null;

  function showToast(text = 'Guardado correctamente.'){
    if (!toast) return;
    toast.querySelector('span').textContent = text;
    toast.style.display = 'flex';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(()=> toast.style.display = 'none', 1800);
  }
  if (btnCerrarMensaje) btnCerrarMensaje.addEventListener('click', () => {
    toast.style.display = 'none';
    clearTimeout(toastTimer);
  });

  // Cargar categorías existentes del servidor al iniciar
  pullCategoriesToState();
});
