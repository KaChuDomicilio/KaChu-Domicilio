// === main.js (KaChu Panel) ===
let srvInitialActive = true; // recordará el estado con que se abre el modal

// Helpers
const $  = (s, ctx = document) => ctx.querySelector(s);
const $$ = (s, ctx = document) => Array.from(ctx.querySelectorAll(s));

// Referencias UI
const menuBtn        = $('.menu-btn');
const menuLateral    = $('#menuLateral');
const menuOverlay    = $('#menuOverlay');

const btnAgregar     = $('#btnAgregar');
const modalAgregar   = $('#modalAgregar');
const menuOpciones   = $('#menuOpciones');
const formZona       = $('#formZona');
const btnZona        = $('#btnZona');
const btnCancelarZona= $('#btnCancelarZona');
const btnGuardarZona = $('#btnGuardarZona'); // activado/desactivado por validación
const inputNombreZona= $('#inputNombreZona');
const inputCostoZona = $('#inputCostoZona');

const btnAbrirZonas  = $('#btnAbrirZonas');
const modalZonas     = $('#modalZonas');
const btnCerrarZonas = $('#btnCerrarZonas');
const tablaZonasBody = $('#tablaZonasBody');

const modalEditarZona      = $('#modalEditarZona');
const btnCerrarEditarZona  = $('#btnCerrarEditarZona');
const editNombreZona       = $('#editNombreZona');
const editCostoZona        = $('#editCostoZona');
const btnGuardarZonaEditada= $('#btnGuardarZonaEditada'); // sin lógica
const btnCancelarEditarZona = $('#btnCancelarEditarZona');

const toast        = $('#mensajeGuardado');
const toastClose   = $('#cerrarMensaje');

const API_ZONAS = '/api/data/zonas';
// API de categorías (mismo patrón que zonas)
const API_CATEGORIAS = '/api/data/categorias';

// Refs del formulario Cat/Subcat
const btnCatSub = document.getElementById('btnCatSub');
const formCatSub = document.getElementById('formCatSub');

const selCategoriaExistente = document.getElementById('selCategoriaExistente');
const inputNuevaCategoria   = document.getElementById('inputNuevaCategoria');

const selSubcategoriaExistente = document.getElementById('selSubcategoriaExistente');
const inputNuevaSubcategoria   = document.getElementById('inputNuevaSubcategoria');

const btnGuardarCatSub = document.getElementById('btnGuardarCatSub');
const btnCancelarCatSub = document.getElementById('btnCancelarCatSub');

// Categorías/Subcategorías (modal de edición)
const btnCats        = document.getElementById('btnCats');
const modalCats      = document.getElementById('modalCats');
const btnCerrarCats  = document.getElementById('btnCerrarCats');
const tablaCatsBody  = document.getElementById('tablaCatsBody');
const catTitle       = document.getElementById('catTitle');
const subcatList     = document.getElementById('subcatList');
const inputNuevaSubcat = document.getElementById('inputNuevaSubcat');
const btnAgregarSubcat = document.getElementById('btnAgregarSubcat');

let selectedCat = '';         // categoría actualmente seleccionada en el modal

let toastTimer = null;

// APIs
const API_PRODUCTOS   = '/api/data/productos';

// Refs admin productos
const filterCategory     = document.getElementById('filterCategory');
const filterSubcategory  = document.getElementById('filterSubcategory');
const filterSearch       = document.getElementById('filterSearch');

const tablaProductosBody = document.getElementById('tablaProductosBody');
const productosEmpty     = document.getElementById('productosEmpty');

// Estado en memoria
let productsCache   = []; // {id,name,price,category,subcategory,image,active}
let categoriesCache = []; // {name, subcategories[]}

// ====== [PRODUCTOS] Modal edición ======
const modalEditProd       = document.getElementById('modalEditProd');
const editProdName        = document.getElementById('editProdName');
const editProdPrice       = document.getElementById('editProdPrice');
const editProdCategory    = document.getElementById('editProdCategory');
const editProdSubcategory = document.getElementById('editProdSubcategory');
const editProdImage       = document.getElementById('editProdImage');
const btnCancelEditProd   = document.getElementById('btnCancelEditProd');
const btnSaveEditProd     = document.getElementById('btnSaveEditProd');

let editingProdId = null; // id del producto que estamos editando

// ----- (+) Agregar producto (SOLO con categorías/sub existentes)
const btnProducto          = document.getElementById('btnProducto');
const formProducto         = document.getElementById('formProducto');

const inputProdName        = document.getElementById('inputProdName');
const inputProdPrice       = document.getElementById('inputProdPrice');
const selProdCategory      = document.getElementById('selProdCategory');
const selProdSubcategory   = document.getElementById('selProdSubcategory');
const inputProdImage       = document.getElementById('inputProdImage');   // opcional
const chkProdActive        = document.getElementById('chkProdActive');

const btnGuardarProducto   = document.getElementById('btnGuardarProducto');
const btnCancelarProducto  = document.getElementById('btnCancelarProducto');

const API_SERVICIO = '/api/data/servicio';

const optServicio   = document.getElementById('optServicio');
const modalServicio = document.getElementById('modalServicio');
const srvActive     = document.getElementById('srvActive');
const srvMessage    = document.getElementById('srvMessage');
const srvImage      = document.getElementById('srvImage');
const btnSrvCancel  = document.getElementById('btnSrvCancel');
const btnSrvSave    = document.getElementById('btnSrvSave');

// Referencias para los nuevos elementos
const inputProdUnit = document.getElementById('inputProdUnit');
const kgOptions = document.getElementById('kgOptions');
const inputProdStep = document.getElementById('inputProdStep');
const inputProdMinQty = document.getElementById('inputProdMinQty');

// Referencias para los nuevos elementos en el modal de edición
const editProdUnit = document.getElementById('editProdUnit');
const editKgOptions = document.getElementById('editKgOptions');
const editProdStep = document.getElementById('editProdStep');
const editProdMinQty = document.getElementById('editProdMinQty');

// Mostrar/ocultar opciones según la unidad seleccionada en la edición
editProdUnit?.addEventListener('change', () => {
  if (editProdUnit.value === 'weight') {
    editKgOptions.style.display = 'block';  // Mostrar opciones de peso
  } else {
    editKgOptions.style.display = 'none';   // Ocultar opciones de peso
  }
});

// Mostrar/ocultar opciones según la unidad seleccionada
inputProdUnit?.addEventListener('change', () => {
  if (inputProdUnit.value === 'weight') {
    kgOptions.style.display = 'block';  // Mostrar opciones de peso
  } else {
    kgOptions.style.display = 'none';   // Ocultar opciones de peso
  }
});

async function loadServicio(){
  try{
    const r = await fetch(API_SERVICIO, { cache:'no-store' });
    if (!r.ok) throw new Error(await r.text());
    return await r.json(); // {active, message, image}
  }catch(_){
    return { active: true, message: "", image: "" };
  }
}

function setServicioFormState(activeOn){
  const disableFields = !!activeOn;
  srvMessage.disabled = disableFields;
  srvImage.disabled   = disableFields;

  const changed = (srvActive.checked !== srvInitialActive);
  btnSrvSave.disabled = !(changed || !srvActive.checked);
}

async function openServicioModal(){
  const data = await loadServicio();
  srvActive.checked  = !!data.active;
  srvMessage.value   = data.message || "";
  srvImage.value     = data.image || "";

  srvInitialActive = !!data.active;

  setServicioFormState(srvActive.checked);
  abrirModal(modalServicio);
}

optServicio?.addEventListener('click', () => {
  cerrarMenu?.();
  openServicioModal().catch(err => {
    console.error(err); mostrarToast?.('Error cargando estado del servicio');
  });
});

srvActive?.addEventListener('change', () => {
  setServicioFormState(srvActive.checked);
});

btnSrvCancel?.addEventListener('click', () => {
  cerrarModal(modalServicio);
});

btnSrvSave?.addEventListener('click', async () => {
  if (btnSrvSave.disabled) return;
  try {
    const payload = {
      active: !!srvActive.checked,
      message: (srvMessage.value || '').trim(),
      image: (srvImage.value || '').trim()
    };
    await apiPut(API_SERVICIO, payload);
    mostrarToast?.(payload.active ? 'Servicio ACTIVADO' : 'Servicio DESACTIVADO');
    cerrarModal(modalServicio);
  } catch (err) {
    console.error(err);
    mostrarToast?.('Error al guardar el estado del servicio');
  }
});


function numeroDesdeTexto(v){ return parseFloat(String(v||'').replace(',', '.')); }
function normalizeStr(s){ return (s||'').toString().trim(); }

// ---- Add Product helpers (solo existentes)
function fillProdSelectorsFromCategories(){
  selProdCategory.innerHTML =
    `<option value="">Selecciona…</option>` +
    categoriesCache.map(c => `<option value="${c.name}">${c.name}</option>`).join('');

  selProdSubcategory.innerHTML = `<option value="">Selecciona…</option>`;
  selProdSubcategory.disabled = true;
}

function prepararFormProducto(){
  inputProdName.value = '';
  inputProdPrice.value = '';
  inputProdImage.value = '';
  if (selProdCategory) selProdCategory.value = '';
  if (selProdSubcategory){
    selProdSubcategory.innerHTML = `<option value="">Selecciona…</option>`;
    selProdSubcategory.disabled = true;
  }
  chkProdActive.checked = true;
  validarFormProducto();
}

function validarFormProducto(){
  const nameOk = normalizeStr(inputProdName.value).length > 0;
  const price  = numeroDesdeTexto(inputProdPrice.value);
  const priceOk= Number.isFinite(price) && price > 0; // mínimo 0.01

  const catOk  = normalizeStr(selProdCategory.value).length > 0;
  const subOk  = !selProdSubcategory.disabled && normalizeStr(selProdSubcategory.value).length > 0;

  const ok = nameOk && priceOk && catOk && subOk;
  btnGuardarProducto.disabled = !ok;
  btnGuardarProducto.setAttribute('aria-disabled', String(!ok));
}

btnProducto?.addEventListener('click', async () => {
  if (menuOpciones) menuOpciones.style.display = 'none';
  if (formZona)     formZona.style.display     = 'none';
  if (formCatSub)   formCatSub.style.display   = 'none';
  if (formProducto) formProducto.style.display = 'block';

  if (!categoriesCache.length){
    const payload = await apiGet(API_CATEGORIAS).catch(()=>({categories:[]}));
    categoriesCache = Array.isArray(payload) ? payload : (payload.categories || []);
  }
  fillProdSelectorsFromCategories();
  prepararFormProducto();
  validarFormProducto();
});

selProdCategory?.addEventListener('change', () => {
  const selected = normalizeStr(selProdCategory.value);
  if (!selected){
    selProdSubcategory.innerHTML = `<option value="">Selecciona…</option>`;
    selProdSubcategory.disabled = true;
    validarFormProducto();
    return;
  }
  const found = categoriesCache.find(c => c.name === selected);
  const subs = Array.isArray(found?.subcategories) ? found.subcategories : [];
  selProdSubcategory.innerHTML =
    `<option value="">Selecciona…</option>` +
    subs.sort().map(s => `<option value="${s}">${s}</option>`).join('');
  selProdSubcategory.disabled = subs.length === 0;
  validarFormProducto();
});
selProdSubcategory?.addEventListener('change', validarFormProducto);

inputProdName?.addEventListener('input', validarFormProducto);
inputProdPrice?.addEventListener('input', validarFormProducto);
inputProdPrice?.addEventListener('blur', () => {
  const n = numeroDesdeTexto(inputProdPrice.value);
  if (Number.isFinite(n) && n > 0) inputProdPrice.value = n.toFixed(2);
});
inputProdImage?.addEventListener('input', () => {}); // opcional, no afecta validación

btnGuardarProducto?.addEventListener('click', async (e) => {
  e.preventDefault();
  if (btnGuardarProducto.disabled) return;

  const name  = normalizeStr(inputProdName.value);
  const price = +(numeroDesdeTexto(inputProdPrice.value) || 0).toFixed(2);
  const image = normalizeStr(inputProdImage.value);
  const active = !!chkProdActive.checked;

  const cat = normalizeStr(selProdCategory.value);
  const sub = normalizeStr(selProdSubcategory.value);

  // Datos adicionales para productos por peso
  const unit = inputProdUnit.value;
  const step = unit === 'weight' ? parseFloat(inputProdStep.value) : null;
  const minQty = unit === 'weight' ? parseFloat(inputProdMinQty.value) : null;

  try {
    const id = `p_${Date.now()}`;
    const producto = {
      id, name, price, category: cat, subcategory: sub, image, active, 
      soldBy: unit, step, minQty
    };

    if (!productsCache.length) {
      const payload = await apiGet(API_PRODUCTOS).catch(() => ({ products: [] }));
      productsCache = Array.isArray(payload) ? payload : (payload.products || []);
    }

    productsCache.push(producto);
    await apiPut(API_PRODUCTOS, { products: productsCache });

    mostrarToast?.('Producto agregado');
    prepararFormProducto(); // listo para siguiente alta

    // Refresca filtros/tabla/switch global
    fillFilterSelectors();
    applyProductosFilters();
    updateVaciarToggleUI();
  } catch (err) {
    console.error(err);
    mostrarToast?.('Error al guardar producto');
  }
});

btnCancelarProducto?.addEventListener('click', (e) => {
  e.preventDefault();
  if (formProducto) formProducto.style.display = 'none';
  if (menuOpciones) menuOpciones.style.display = 'block';
  prepararFormProducto();
});


// ================== [PRODUCTOS] INIT + LISTENERS + LOAD ==================

async function initProductosPanel(){
  try{
    await Promise.all([ loadCategoriasAdmin(), loadProductosAdmin() ]);

    fillFilterSelectors();
    applyProductosFilters();
    updateVaciarToggleUI();
  } catch (err){
    console.error(err);
    if (typeof mostrarToast === 'function') mostrarToast('Error al cargar productos');
  }
}

// Validar formulario de edición
function validateEditProdForm() {
  const nameOk = (editProdName.value || '').trim().length > 0;
  const priceVal = parseFloat(String(editProdPrice.value || '').replace(',', '.'));
  const priceOk = Number.isFinite(priceVal) && priceVal >= 0;
  const catOk = (editProdCategory.value || '').trim().length > 0;
  const subOk = editProdSubcategory.disabled ? true : (editProdSubcategory.value || '').trim().length > 0;

  const ok = nameOk && priceOk && catOk && subOk;
  if (btnSaveEditProd) {
    btnSaveEditProd.disabled = !ok;
    btnSaveEditProd.setAttribute('aria-disabled', String(!ok));
  }
}

function validateEditProdForm(){
  const nameOk = (editProdName.value || '').trim().length > 0;
  const priceVal = parseFloat(String(editProdPrice.value || '').replace(',', '.'));
  const priceOk = Number.isFinite(priceVal) && priceVal >= 0;
  const catOk = (editProdCategory.value || '').trim().length > 0;
  const subOk = editProdSubcategory.disabled ? true : (editProdSubcategory.value || '').trim().length > 0;

  const ok = nameOk && priceOk && catOk && subOk;
  if (btnSaveEditProd){
    btnSaveEditProd.disabled = !ok;
    btnSaveEditProd.setAttribute('aria-disabled', String(!ok));
  }
}

editProdName?.addEventListener('input', validateEditProdForm);
editProdPrice?.addEventListener('input', validateEditProdForm);
editProdPrice?.addEventListener('blur', () => {
  const n = parseFloat(String(editProdPrice.value || '').replace(',', '.'));
  if (Number.isFinite(n) && n >= 0) editProdPrice.value = n.toFixed(2);
});
editProdCategory?.addEventListener('change', () => {
  fillEditCatAndSub(editProdCategory, editProdSubcategory, editProdCategory.value, '');
  validateEditProdForm();
});
editProdSubcategory?.addEventListener('change', validateEditProdForm);

btnCancelEditProd?.addEventListener('click', () => {
  cerrarModal(modalEditProd);
  editingProdId = null;
});

// Cerrar al hacer click afuera
modalEditProd?.addEventListener('click', (e) => {
  const cont = modalEditProd.querySelector('.modal-contenido');
  if (e.target === modalEditProd && cont && !cont.contains(e.target)) cerrarModal(modalEditProd);
});

// Guardar los cambios cuando el usuario edita el producto
btnSaveEditProd?.addEventListener('click', async () => {
  if (btnSaveEditProd.disabled) return;

  const name = (editProdName.value || '').trim();
  const price = parseFloat(String(editProdPrice.value || '').replace(',', '.')) || 0;
  const cat = (editProdCategory.value || '').trim();
  const sub = (editProdSubcategory.value || '').trim();
  const image = (editProdImage.value || '').trim();

  const unit = editProdUnit.value;
  const step = unit === 'weight' ? parseFloat(editProdStep.value) : null;
  const minQty = unit === 'weight' ? parseFloat(editProdMinQty.value) : null;

  try {
    let idx = productsCache.findIndex(p => (p.id || '') === (editingProdId || ''));
    if (idx === -1) {
      idx = productsCache.findIndex(p => p.name === name && p.category === cat && p.subcategory === sub);
    }
    if (idx === -1) return mostrarToast?.('No se encontró el producto');

    productsCache[idx] = {
      ...productsCache[idx],
      name,
      price: +price.toFixed(2),
      category: cat,
      subcategory: sub,
      image,
      soldBy: unit,
      step,
      minQty
    };

    await apiPut(API_PRODUCTOS, { products: productsCache });
    cerrarModal(modalEditProd);
    editingProdId = null;
    mostrarToast?.('Producto actualizado');
    applyProductosFilters();
  } catch (err) {
    console.error(err);
    mostrarToast?.('Error al guardar cambios');
  }
});


// Listeners de filtros
function attachProductosFilterListeners(){
  if (typeof updateSubcategoryFilter !== 'function' || typeof applyProductosFilters !== 'function') return;

  filterCategory?.addEventListener('change', () => {
    updateSubcategoryFilter();
    applyProductosFilters();
    updateVaciarToggleUI();
  });

  filterSubcategory?.addEventListener('change', () => {
    applyProductosFilters();
    updateVaciarToggleUI();   // ← agregar
  });

  let searchTimer = null;
  filterSearch?.addEventListener('input', () => {
    clearTimeout(searchTimer);
    if (filterCategory) filterCategory.value = '';
    if (filterSubcategory) {
      filterSubcategory.innerHTML = `<option value="">Selecciona subcategoría</option>`;
      filterSubcategory.disabled = true;
    }
    searchTimer = setTimeout(() => {
      applyProductosFilters();
      updateVaciarToggleUI(); // ← agregar
    }, 120);
  });
}

// Boot
function bootProductosPanel(){
  attachProductosFilterListeners();
  initProductosPanel().catch(err => {
    console.error(err);
    if (typeof mostrarToast === 'function') mostrarToast('Error al iniciar productos');
  });
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', bootProductosPanel);
} else {
  bootProductosPanel();
}

function fillEditCatAndSub(catSel, subSel, selectedCat = '', selectedSub = ''){
  const cats = categoriesCache.map(c => c.name);
  catSel.innerHTML = cats.map(c => `<option value="${c}">${c}</option>`).join('');
  if (selectedCat && cats.includes(selectedCat)) {
    catSel.value = selectedCat;
  } else {
    catSel.value = cats[0] || '';
  }
  const subs = (categoriesCache.find(c => c.name === catSel.value)?.subcategories) || [];
  subSel.innerHTML = subs.map(s => `<option value="${s}">${s}</option>`).join('');
  subSel.disabled = subs.length === 0;
  if (selectedSub && subs.includes(selectedSub)) {
    subSel.value = selectedSub;
  } else if (subs.length) {
    subSel.value = subs[0];
  }
}


async function apiGet(url) {
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
async function apiPut(url, data) {
  const r = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

function stripDiacritics(s){
  return (s || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
}
function normalize(s){
  return stripDiacritics((s||'').toLowerCase().trim());
}

function buildCatMapFromCategories(){
  const map = new Map();
  categoriesCache.forEach(c => map.set(c.name, Array.isArray(c.subcategories)? c.subcategories.slice():[]));
  return map;
}
function buildCatMapFromProducts(){
  const map = new Map();
  productsCache.forEach(p=>{
    const cat = p.category || '';
    const sub = p.subcategory || '';
    if (!cat) return;
    if (!map.has(cat)) map.set(cat, []);
    if (sub && !map.get(cat).includes(sub)) map.get(cat).push(sub);
  });
  return map;
}

// Carga datos
async function loadCategoriasAdmin(){
  const payload = await apiGet(API_CATEGORIAS).catch(()=>({categories:[]}));
  categoriesCache = Array.isArray(payload) ? payload : (payload.categories || []);
}
async function loadProductosAdmin(){
  const payload = await apiGet(API_PRODUCTOS).catch(()=>({products:[]}));
  productsCache = Array.isArray(payload) ? payload : (payload.products || []);

  let touched = false;
  productsCache.forEach((p, i) => {
    if (!p.id) {
      p.id = `p_${Date.now()}_${i}`;
      touched = true;
    }
  });
  if (touched) {
    try { await apiPut(API_PRODUCTOS, { products: productsCache }); } catch {}
  }
}

const toggleVaciarCatalogo = document.getElementById('toggleVaciarCatalogo');

function countActiveProducts(){
  return productsCache.reduce((acc,p)=> acc + (p.active === false ? 0 : 1), 0);
}

function getCurrentScope(){
  const cat = (filterCategory?.value || '').trim();
  const sub = (filterSubcategory?.value || '').trim();
  return { cat, sub, isValid: !!cat && !!sub };
}
function countTotalInScope(cat, sub){
  return productsCache.reduce((acc,p)=> acc + ((p.category===cat && p.subcategory===sub) ? 1 : 0), 0);
}
function countActiveProductsInScope(cat, sub){
  return productsCache.reduce((acc,p)=> acc + ((p.category===cat && p.subcategory===sub && p.active !== false) ? 1 : 0), 0);
}

function updateVaciarToggleUI(){
  if (!toggleVaciarCatalogo) return;
  const { cat, sub, isValid } = getCurrentScope();
  // Si no hay categoría y subcategoría seleccionadas, inhabilita el switch
  if (!isValid) {
    toggleVaciarCatalogo.checked  = false;
    toggleVaciarCatalogo.disabled = true;
    toggleVaciarCatalogo.title = 'Selecciona categoría y subcategoría para usar este switch';
    return;
  }
  const totalInScope  = countTotalInScope(cat, sub);
  const activeInScope = countActiveProductsInScope(cat, sub);
  // "Encendido" cuando hay al menos un producto activo en ese ámbito
  toggleVaciarCatalogo.checked  = activeInScope > 0;
  // Deshabilitado si no hay productos en el ámbito o ya están todos inactivos
  toggleVaciarCatalogo.disabled = (totalInScope === 0) || (activeInScope === 0);

  if (totalInScope === 0) {
    toggleVaciarCatalogo.title = 'No hay productos en esta categoría/subcategoría';
  } else if (activeInScope === 0) {
    toggleVaciarCatalogo.title = 'Activa productos individualmente en la tabla para reactivar esta subcategoría';
  } else {
    toggleVaciarCatalogo.title = `Apaga para desactivar todos los productos de "${cat} / ${sub}"`;
  }
}

toggleVaciarCatalogo?.addEventListener('change', async () => {
  const { cat, sub, isValid } = getCurrentScope();
  if (!isValid) {
    updateVaciarToggleUI();
    return;
  }
  // Si intentan "encenderlo", impedimos (igual que antes) y pedimos reactivar individuales
  if (toggleVaciarCatalogo.checked){
    toggleVaciarCatalogo.checked = false;
    mostrarToast?.(`Activa al menos un producto en "${cat} / ${sub}" desde la tabla`);
    return;
  }
  // Apagar = desactivar TODOS los productos del ámbito
  if (!confirm(`¿Desactivar TODOS los productos de "${cat} / ${sub}"?`)) {
    updateVaciarToggleUI();
    return;
  }
  try{
    let touched = false;
    productsCache = productsCache.map(p => {
      if (p.category === cat && p.subcategory === sub && p.active !== false) {
        touched = true;
        return { ...p, active: false };
      }
      return p;
    });
    if (touched) {
      await apiPut(API_PRODUCTOS, { products: productsCache });
    }
    applyProductosFilters();
    updateVaciarToggleUI();
    mostrarToast?.(`Subcategoría "${cat} / ${sub}" desactivada`);
  }catch(err){
    console.error(err);
    mostrarToast?.('Error al desactivar productos');
    updateVaciarToggleUI();
  }
});

function fillFilterSelectors(){
  const map = categoriesCache.length ? buildCatMapFromCategories() : buildCatMapFromProducts();

  filterCategory.innerHTML = `<option value="">Todas las categorías</option>` +
    Array.from(map.keys()).sort().map(c=>`<option value="${c}">${c}</option>`).join('');

  filterSubcategory.innerHTML = `<option value="">Todas las subcategorías</option>`;
  filterSubcategory.disabled = true;
}

function updateSubcategoryFilter(){
  const selectedCat = filterCategory.value;
  const map = categoriesCache.length ? buildCatMapFromCategories() : buildCatMapFromProducts();
  const subs = selectedCat ? (map.get(selectedCat) || []) : [];

  filterSubcategory.innerHTML = `<option value="">Todas las subcategorías</option>` +
    subs.slice().sort().map(s=>`<option value="${s}">${s}</option>`).join('');
  filterSubcategory.disabled = !selectedCat || subs.length===0;
}

function applyProductosFilters(){
  const cat  = filterCategory.value;
  const sub  = filterSubcategory.value;
  const terms = normalize(filterSearch.value).split(/\s+/).filter(Boolean);

  const filtered = productsCache.filter(p=>{
    if (cat && p.category !== cat) return false;
    if (sub && p.subcategory !== sub) return false;
    if (terms.length){
      const name = normalize(p.name);
      return terms.every(t => name.includes(t));
    }
    return true;
  });

  renderProductosTable(filtered);
}

function renderProductosTable(list){
  tablaProductosBody.innerHTML = '';
  if (!list.length){
    productosEmpty?.classList?.remove('hidden');
    return;
  }
  productosEmpty?.classList?.add('hidden');

  list.forEach(p=>{
    const tr = document.createElement('tr');
    tr.dataset.id = p.id || '';

    const imgTd = document.createElement('td');
    imgTd.innerHTML = `<img src="${p.image || ''}" alt="" class="table-thumb" onerror="this.style.visibility='hidden'">`;

    const nameTd = document.createElement('td');
    nameTd.textContent = p.name || '';

    const priceTd = document.createElement('td');
    priceTd.textContent = `$${Number(p.price||0).toFixed(2)}`;

    const catTd = document.createElement('td');
    catTd.textContent = p.category || '';

    const subTd = document.createElement('td');
    subTd.textContent = p.subcategory || '';

    const actionsTd = document.createElement('td');
    actionsTd.style.whiteSpace = 'nowrap';
    actionsTd.innerHTML = `
      <button class="btn-accion btn-edit-prod">Editar</button>
      <button class="btn-accion btn-del-prod" style="background:#ef4444">Eliminar</button>
      <label class="switch" style="vertical-align:middle; margin-left:8px;">
        <input type="checkbox" class="prod-active" ${p.active === false ? '' : 'checked'}>
        <span class="track"><span class="thumb"></span></span>
      </label>
    `;

    tr.appendChild(imgTd);
    tr.appendChild(nameTd);
    tr.appendChild(priceTd);
    tr.appendChild(catTd);
    tr.appendChild(subTd);
    tr.appendChild(actionsTd);
    tablaProductosBody.appendChild(tr);
  });
}

tablaProductosBody?.addEventListener('change', async (e) => {
  const chk = e.target.closest('.prod-active');
  if (!chk) return;
  const tr = e.target.closest('tr');
  const id = tr?.dataset?.id || '';
  if (!id) return;

  try {
    const idx = productsCache.findIndex(x => (x.id||'') === id);
    if (idx === -1) return;
    productsCache[idx].active = chk.checked;

    await apiPut(API_PRODUCTOS, { products: productsCache });
    mostrarToast?.(chk.checked ? 'Producto activado' : 'Producto desactivado');
    updateVaciarToggleUI(); 
  } catch (err) {
    console.error(err);
    mostrarToast?.('Error al actualizar estado');
    chk.checked = !chk.checked;
  }
});

tablaProductosBody?.addEventListener('click', async (e) => {
  const tr = e.target.closest('tr');
  if (!tr) return;
  const id = tr.dataset.id || '';

  if (e.target.closest('.btn-edit-prod')) {
    let prod = productsCache.find(p => (p.id || '') === id);
    if (!prod) {
      const tds = tr.querySelectorAll('td');
      const name = tds[1]?.textContent?.trim() || '';
      const cat  = tds[3]?.textContent?.trim() || '';
      const sub  = tds[4]?.textContent?.trim() || '';
      prod = productsCache.find(p => p.name === name && p.category === cat && p.subcategory === sub);
    }
    if (!prod) return mostrarToast?.('No se encontró el producto');

    openProductEditModal(prod);
    return;
  }

  if (e.target.closest('.btn-del-prod')) {
    if (!confirm('¿Eliminar este producto?')) return;
    try{
      const newList = productsCache.filter(p => (p.id || '') !== id);
      if (newList.length === productsCache.length) {
        const tds = tr.querySelectorAll('td');
        const name = tds[1]?.textContent?.trim() || '';
        const cat  = tds[3]?.textContent?.trim() || '';
        const sub  = tds[4]?.textContent?.trim() || '';
        productsCache = productsCache.filter(p => !(p.name === name && p.category === cat && p.subcategory === sub));
      } else {
        productsCache = newList;
      }
      await apiPut(API_PRODUCTOS, { products: productsCache });
      mostrarToast?.('Producto eliminado');
      applyProductosFilters();
      updateVaciarToggleUI();
    } catch (err) {
      console.error(err);
      mostrarToast?.('Error al eliminar');
    }
  }
});


// ================== Menú hamburguesa ==================
function abrirMenu() {
  if (!menuLateral || !menuOverlay) return;
  menuLateral.classList.add('activo');
  menuOverlay.classList.add('activo');
}
function cerrarMenu() {
  if (!menuLateral || !menuOverlay) return;
  menuLateral.classList.remove('activo');
  menuOverlay.classList.remove('activo');
}
menuBtn?.addEventListener('click', abrirMenu);
menuOverlay?.addEventListener('click', cerrarMenu);

// ================== Utilidades de modal ==================
function abrirModal(modalEl) {
  if (!modalEl) return;
  modalEl.classList.remove('oculto');
}
function cerrarModal(modalEl) {
  if (!modalEl) return;
  modalEl.classList.add('oculto');
}

function renderCategoriasTabla() {
  tablaCatsBody.innerHTML = '';
  categoriesCache.forEach(c => {
    const tr = document.createElement('tr');
    tr.dataset.cat = c.name;

    tr.innerHTML = `
      <td>
        <button class="btn-link select-cat">${c.name}</button>
      </td>
      <td>
        <button class="btn-accion btn-edit-cat">Editar</button>
        <button class="btn-accion btn-del-cat" style="background:#ef4444">Eliminar</button>
      </td>
    `;
    tablaCatsBody.appendChild(tr);
  });
}

function renderSubcats(catName) {
  selectedCat = catName || '';
  catTitle.textContent = selectedCat ? `Subcategorías de: ${selectedCat}` : 'Subcategorías';
  subcatList.innerHTML = '';

  const cat = categoriesCache.find(c => c.name === selectedCat);
  const subs = Array.isArray(cat?.subcategories) ? cat.subcategories : [];

  subs.forEach(s => {
    const li = document.createElement('li');
    li.dataset.sub = s;
    li.style.display = 'flex';
    li.style.alignItems = 'center';
    li.style.gap = '8px';

    li.innerHTML = `
      <span style="flex:1 1 auto">${s}</span>
      <button class="btn-accion btn-edit-sub">Editar</button>
      <button class="btn-accion btn-del-sub" style="background:#ef4444">Eliminar</button>
    `;
    subcatList.appendChild(li);
  });
}

btnCats?.addEventListener('click', async () => {
  cerrarMenu?.();
  try {
    const payload = await apiGet(API_CATEGORIAS);
    categoriesCache = Array.isArray(payload) ? payload : (payload.categories || []);
    renderCategoriasTabla();
    if (categoriesCache.length) renderSubcats(categoriesCache[0].name);
    abrirModal?.(modalCats);
  } catch (err) {
    console.error(err);
    mostrarToast?.('Error al cargar categorías');
  }
});

btnCerrarCats?.addEventListener('click', () => cerrarModal?.(modalCats));
modalCats?.addEventListener('click', (e) => {
  const cont = modalCats.querySelector('.contenido-zonas');
  if (e.target === modalCats) cerrarModal?.(modalCats);
});

tablaCatsBody?.addEventListener('click', async (e) => {
  const tr = e.target.closest('tr');
  if (!tr) return;
  const catName = tr.dataset.cat;

  if (e.target.closest('.select-cat')) {
    renderSubcats(catName);
    return;
  }

  if (e.target.closest('.btn-edit-cat')) {
    const nuevo = prompt('Nuevo nombre para la categoría:', catName);
    if (!nuevo) return;

    if (categoriesCache.some(c => c.name.toLowerCase() === nuevo.toLowerCase() && c.name !== catName)) {
      return mostrarToast?.('Ya existe una categoría con ese nombre');
    }

    const idx = categoriesCache.findIndex(c => c.name === catName);
    if (idx === -1) return;

    const old = categoriesCache[idx].name;
    categoriesCache[idx].name = nuevo;
    try {
      await apiPut(API_CATEGORIAS, { categories: categoriesCache });
      renderCategoriasTabla();
      if (selectedCat === old) renderSubcats(nuevo);
      mostrarToast?.('Categoría actualizada');
    } catch (err) {
      console.error(err);
      mostrarToast?.('Error al actualizar categoría');
    }
    return;
  }

  if (e.target.closest('.btn-del-cat')) {
    if (!confirm(`¿Eliminar la categoría "${catName}" y todas sus subcategorías?`)) return;
    const nuevas = categoriesCache.filter(c => c.name !== catName);
    try {
      await apiPut(API_CATEGORIAS, { categories: nuevas });
      categoriesCache = nuevas;
      renderCategoriasTabla();
      if (selectedCat === catName) {
        renderSubcats(nuevas[0]?.name || '');
      }
      mostrarToast?.('Categoría eliminada');
    } catch (err) {
      console.error(err);
      mostrarToast?.('Error al eliminar categoría');
    }
  }
});

btnAgregarSubcat?.addEventListener('click', async () => {
  const s = (inputNuevaSubcat?.value || '').trim();
  if (!selectedCat) return mostrarToast?.('Selecciona una categoría');
  if (!s) return;

  const cat = categoriesCache.find(c => c.name === selectedCat);
  if (!cat) return;

  if (cat.subcategories.some(x => x.toLowerCase() === s.toLowerCase())) {
    return mostrarToast?.('Esa subcategoría ya existe');
    }

  cat.subcategories.push(s);
  try {
    await apiPut(API_CATEGORIAS, { categories: categoriesCache });
    inputNuevaSubcat.value = '';
    renderSubcats(selectedCat);
    mostrarToast?.('Subcategoría agregada');
  } catch (err) {
    console.error(err);
    mostrarToast?.('Error al agregar subcategoría');
  }
});

subcatList?.addEventListener('click', async (e) => {
  const li = e.target.closest('li');
  if (!li) return;
  const subName = li.dataset.sub;
  const cat = categoriesCache.find(c => c.name === selectedCat);
  if (!cat) return;

  if (e.target.closest('.btn-edit-sub')) {
    const nuevo = prompt('Nuevo nombre para la subcategoría:', subName);
    if (!nuevo) return;

    if (cat.subcategories.some(x => x.toLowerCase() === nuevo.toLowerCase() && x !== subName)) {
      return mostrarToast?.('Ya existe una subcategoría con ese nombre');
    }
    const idx = cat.subcategories.findIndex(x => x === subName);
    if (idx === -1) return;

    cat.subcategories[idx] = nuevo;
    try {
      await apiPut(API_CATEGORIAS, { categories: categoriesCache });
      renderSubcats(selectedCat);
      mostrarToast?.('Subcategoría actualizada');
    } catch (err) {
      console.error(err);
      mostrarToast?.('Error al actualizar subcategoría');
    }
    return;
  }

  if (e.target.closest('.btn-del-sub')) {
    if (!confirm(`¿Eliminar la subcategoría "${subName}"?`)) return;
    const nuevas = cat.subcategories.filter(x => x !== subName);
    cat.subcategories = nuevas;
    try {
      await apiPut(API_CATEGORIAS, { categories: categoriesCache });
      renderSubcats(selectedCat);
      mostrarToast?.('Subcategoría eliminada');
    } catch (err) {
      console.error(err);
      mostrarToast?.('Error al eliminar subcategoría');
    }
  }
});


// Cierre por clic fuera del contenido
function habilitarCierreExterior(modalEl, contentSelector = '.modal-contenido') {
  if (!modalEl) return;
  modalEl.addEventListener('click', (e) => {
    const cont = modalEl.querySelector(contentSelector);
    if (!cont) return;
    if (e.target === modalEl) cerrarModal(modalEl);
  });
}
habilitarCierreExterior(modalAgregar, '.modal-contenido');
habilitarCierreExterior(modalEditarZona, '.modal-contenido');
modalZonas?.addEventListener('click', (e) => {
  const cont = modalZonas.querySelector('.contenido-zonas');
  if (e.target === modalZonas) cerrarModal(modalZonas);
});

// ================== VALIDACIÓN "Agregar Zona" ==================
function numeroDesdeTextoZona(v) {
  if (typeof v !== 'string') return NaN;
  return parseFloat(v.replace(',', '.'));
}
function validarFormZona() {
  const nombreOk = !!(inputNombreZona && inputNombreZona.value.trim().length > 0);
  const costoVal = numeroDesdeTextoZona(inputCostoZona ? inputCostoZona.value.trim() : '');
  const costoOk  = Number.isFinite(costoVal) && costoVal >= 0;

  const habilitar = nombreOk && costoOk;
  if (btnGuardarZona) {
    btnGuardarZona.disabled = !habilitar;
    btnGuardarZona.setAttribute('aria-disabled', String(!habilitar));
  }
}
function prepararFormZona() {
  if (inputNombreZona) inputNombreZona.value = '';
  if (inputCostoZona)  inputCostoZona.value  = '';
  validarFormZona();
}
inputNombreZona?.addEventListener('input', validarFormZona);
inputCostoZona?.addEventListener('input', validarFormZona);

// ================== Botón flotante (+) ==================
btnAgregar?.addEventListener('click', () => {
  if (menuOpciones) menuOpciones.style.display = 'block';
  if (formZona)     formZona.style.display     = 'none';
  if (formCatSub)    formCatSub.style.display    = 'none';
  if (formProducto)  formProducto.style.display  = 'none';
  abrirModal(modalAgregar);
});

btnZona?.addEventListener('click', () => {
  if (!menuOpciones || !formZona) return;
  menuOpciones.style.display = 'none';
  formZona.style.display     = 'block';
  prepararFormZona();
});

btnCancelarZona?.addEventListener('click', (e) => {
  e.preventDefault();
  if (!menuOpciones || !formZona) return;
  menuOpciones.style.display = 'block';
  formZona.style.display     = 'none';
  prepararFormZona();
});

// Guardar zona REAL
btnGuardarZona?.addEventListener('click', async (e) => {
  e.preventDefault();
  if (btnGuardarZona.disabled) return;

  const nombre = inputNombreZona.value.trim();
  const costo  = numeroDesdeTextoZona(inputCostoZona.value.trim());

  try {
    const zonas = await apiGet(API_ZONAS).catch(() => []);
    if (zonas.some(z => z.nombre.toLowerCase() === nombre.toLowerCase())) {
      return mostrarToast('Esa zona ya existe');
    }
    zonas.push({ nombre, costo: +Number(costo).toFixed(2) });
    await apiPut(API_ZONAS, zonas);

    mostrarToast('Zona guardada');
    if (inputNombreZona) inputNombreZona.value = '';
    if (inputCostoZona)  inputCostoZona.value  = '';
    (btnGuardarZona || {}).disabled = true;

    if (modalZonas && !modalZonas.classList.contains('oculto')) {
      await cargarZonasEnTabla();
    }
  } catch (err) {
    console.error(err);
    mostrarToast('Error al guardar zona');
  }
});

// ================== Modal Zonas (desde menú) ==================
btnAbrirZonas?.addEventListener('click', async () => {
  cerrarMenu();
  await cargarZonasEnTabla();
  abrirModal(modalZonas);
});
btnCerrarZonas?.addEventListener('click', () => cerrarModal(modalZonas));

// ================== Modal Editar Zona ==================
btnCerrarEditarZona?.addEventListener('click', () => cerrarModal(modalEditarZona));
btnGuardarZonaEditada?.addEventListener('click', async (e) => {
  e.preventDefault();
  const original = modalEditarZona.dataset.original || '';
  const nuevoNombre = editNombreZona.value.trim();
  const nuevoCosto  = numeroDesdeTextoZona(editCostoZona.value.trim());

  try {
    const zonas = await apiGet(API_ZONAS);
    const idx = zonas.findIndex(z => z.nombre === original);
    if (idx === -1) return mostrarToast('No se encontró la zona');

    if (nuevoNombre.toLowerCase() !== original.toLowerCase() &&
        zonas.some(z => z.nombre.toLowerCase() === nuevoNombre.toLowerCase())) {
      return mostrarToast('Ya existe una zona con ese nombre');
    }

    zonas[idx] = { nombre: nuevoNombre, costo: +Number(nuevoCosto).toFixed(2) };
    await apiPut(API_ZONAS, zonas);

    cerrarModal(modalEditarZona);
    await cargarZonasEnTabla();
    mostrarToast('Zona actualizada');
  } catch (err) {
    console.error(err);
    mostrarToast('Error al actualizar zona');
  }
});


btnCancelarEditarZona?.addEventListener('click', (e) => {
  e.preventDefault();
  cerrarModal(modalEditarZona);
  if (modalZonas && modalZonas.classList.contains('oculto')) {
    abrirModal(modalZonas);
  }
});

async function cargarZonasEnTabla() {
  const zonas = await apiGet(API_ZONAS).catch(() => []);
  tablaZonasBody.innerHTML = '';
  zonas.forEach(z => {
    const tr = document.createElement('tr');
    tr.dataset.nombre = z.nombre;
    tr.innerHTML = `
      <td>${z.nombre}</td>
      <td>$${Number(z.costo).toFixed(2)}</td>
      <td>
        <button class="btn-accion btn-edit">Editar</button>
        <button class="btn-accion btn-eliminar" style="background:#ef4444">Eliminar</button>
      </td>
    `;
    tablaZonasBody.appendChild(tr);
  });
  return zonas;
}

function normalizeStr2(s){ return (s||'').toString().trim(); }

// Carga categorías (para el form Cat/Sub)
async function cargarCategorias() {
  const payload = await apiGet(API_CATEGORIAS).catch(()=>({categories:[]}));
  const categories = Array.isArray(payload) ? payload : (payload.categories || []);

  if (selCategoriaExistente) {
    selCategoriaExistente.innerHTML =
      `<option value="">(ninguna)</option>` +
      categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
  }

  if (selSubcategoriaExistente) {
    selSubcategoriaExistente.innerHTML = `<option value="">(ninguna)</option>`;
    selSubcategoriaExistente.disabled = true;
  }
  categoriesCache = categories;
  return categories;
}

function validarFormCatSub(){
  const cat = normalizeStr2(inputNuevaCategoria?.value) || normalizeStr2(selCategoriaExistente?.value);
  const sub = normalizeStr2(inputNuevaSubcategoria?.value) || normalizeStr2(selSubcategoriaExistente?.value);
  const ok = !!cat && !!sub;
  if (btnGuardarCatSub) {
    btnGuardarCatSub.disabled = !ok;
    btnGuardarCatSub.setAttribute('aria-disabled', String(!ok));
  }
}

function prepararFormCatSub(){
  if (inputNuevaCategoria) inputNuevaCategoria.value = '';
  if (inputNuevaSubcategoria) inputNuevaSubcategoria.value = '';
  if (selCategoriaExistente) selCategoriaExistente.value = '';
  if (selSubcategoriaExistente) {
    selSubcategoriaExistente.innerHTML = `<option value="">(ninguna)</option>`;
    selSubcategoriaExistente.disabled = true;
  }
  validarFormCatSub();
}
btnCatSub?.addEventListener('click', async () => {
  if (menuOpciones) menuOpciones.style.display = 'none';
  if (formZona)     formZona.style.display     = 'none';
  if (formCatSub)   formCatSub.style.display   = 'block';

  await cargarCategorias();
  prepararFormCatSub();
});

selCategoriaExistente?.addEventListener('change', () => {
  const selected = (selCategoriaExistente.value || '').trim();

  const newCatTyped = (inputNuevaCategoria?.value || '').trim().length > 0;
  if (newCatTyped) {
    selSubcategoriaExistente.innerHTML = `<option value="">(ninguna)</option>`;
    selSubcategoriaExistente.disabled = true;
    validarFormCatSub();
    return;
  }

  if (!selected) {
    selSubcategoriaExistente.innerHTML = `<option value="">(ninguna)</option>`;
    selSubcategoriaExistente.disabled = true;
    validarFormCatSub();
    return;
  }

  const found = categoriesCache.find(c => c.name === selected);
  const subs = Array.isArray(found?.subcategories) ? found.subcategories : [];
  selSubcategoriaExistente.innerHTML =
    `<option value="">(ninguna)</option>` +
    subs.map(s => `<option value="${s}">${s}</option>`).join('');
  selSubcategoriaExistente.disabled = subs.length === 0;

  validarFormCatSub();
});

inputNuevaCategoria?.addEventListener('input', () => {
  const typed = normalizeStr2(inputNuevaCategoria.value).length > 0;
  if (typed) {
    if (selCategoriaExistente) selCategoriaExistente.value = '';
    if (selSubcategoriaExistente) {
      selSubcategoriaExistente.innerHTML = `<option value="">(ninguna)</option>`;
      selSubcategoriaExistente.disabled = true;
    }
  } else {
    selCategoriaExistente?.dispatchEvent(new Event('change'));
  }
  validarFormCatSub();
});

inputNuevaSubcategoria?.addEventListener('input', validarFormCatSub);
selSubcategoriaExistente?.addEventListener('change', validarFormCatSub);
btnGuardarCatSub?.addEventListener('click', async (e) => {
  e.preventDefault();

  const cat = normalizeStr2(inputNuevaCategoria?.value) || normalizeStr2(selCategoriaExistente?.value);
  const sub = normalizeStr2(inputNuevaSubcategoria?.value) || normalizeStr2(selSubcategoriaExistente?.value);
  if (!cat || !sub) return mostrarToast?.('Indica categoría y subcategoría');

  try {
    const payload = await apiGet(API_CATEGORIAS).catch(()=>({categories:[]}));
    const categories = Array.isArray(payload) ? payload : (payload.categories || []);

    let entry = categories.find(c => c.name.toLowerCase() === cat.toLowerCase());
    if (!entry) {
      entry = { name: cat, subcategories: [] };
      categories.push(entry);
    }
    const existsSub = entry.subcategories.some(s => s.toLowerCase() === sub.toLowerCase());
    if (!existsSub) entry.subcategories.push(sub);
    else return mostrarToast?.('Esa subcategoría ya existe en esa categoría');

    await apiPut(API_CATEGORIAS, { categories });

    mostrarToast?.('Categoría/Subcategoría guardadas');
    prepararFormCatSub();

  } catch (err) {
    console.error(err);
    mostrarToast?.('Error al guardar');
  }
});
btnCancelarCatSub?.addEventListener('click', (e) => {
  e.preventDefault();
  if (formCatSub)   formCatSub.style.display   = 'none';
  if (menuOpciones) menuOpciones.style.display = 'block';
  prepararFormCatSub();
});

tablaZonasBody?.addEventListener('click', async (e) => {
  const tr = e.target.closest('tr');
  if (!tr) return;
  const nombreOriginal = tr.dataset.nombre;

  if (e.target.closest('.btn-edit')) {
    try {
      const zonas = await apiGet(API_ZONAS);
      const z = zonas.find(x => x.nombre === nombreOriginal);
      if (!z) return;
      editNombreZona.value = z.nombre;
      editCostoZona.value  = Number(z.costo).toFixed(2);
      modalEditarZona.dataset.original = nombreOriginal;
      abrirModal(modalEditarZona);
    } catch (err) {
      console.error(err);
      mostrarToast('Error al cargar zona');
    }
    return;
  }

  if (e.target.closest('.btn-eliminar')) {
    if (!confirm(`¿Eliminar la zona "${nombreOriginal}"?`)) return;
    try {
      let zonas = await apiGet(API_ZONAS);
      zonas = zonas.filter(x => x.nombre !== nombreOriginal);
      await apiPut(API_ZONAS, zonas);
      await cargarZonasEnTabla();
      mostrarToast('Zona eliminada');
    } catch (err) {
      console.error(err);
      mostrarToast('Error al eliminar zona');
    }
  }
});

// ================== Toast ==================
function mostrarToast(msg = 'Guardado correctamente.') {
  if (!toast) return;
  const span = toast.querySelector('span');
  if (span) span.textContent = msg;
  toast.style.display = 'flex';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (toast.style.display = 'none'), 1800);
}
toastClose?.addEventListener('click', () => (toast.style.display = 'none'));

// ================== Tecla ESC ==================
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (modalEditarZona && !modalEditarZona.classList.contains('oculto')) return cerrarModal(modalEditarZona);
  if (modalZonas && !modalZonas.classList.contains('oculto'))         return cerrarModal(modalZonas);
  if (modalAgregar && !modalAgregar.classList.contains('oculto'))     return cerrarModal(modalAgregar);
  if (menuOverlay && menuOverlay.classList.contains('activo'))        return cerrarMenu();
});