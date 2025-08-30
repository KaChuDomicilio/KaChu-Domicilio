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
