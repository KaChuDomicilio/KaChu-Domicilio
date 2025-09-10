// === KaChu Panel (ADMIN) – main.js ===
// Estructura: 0) Helpers/UI refs  1) Servicio  2) Productos  3) Zonas
// 4) Categorías/Subcategorías  5) Modales (open/close + fondo)
// 6) Vaciar subcategoría + Toast + ESC

/* ────────────────────────────────────────────────────────────────────────── */
/* 0) HELPERS Y REFERENCIAS                                                   */
/* ────────────────────────────────────────────────────────────────────────── */

let srvInitialActive = true; // recuerda estado al abrir el modal Servicio

// Helpers DOM
const $  = (s, ctx = document) => ctx.querySelector(s);
const $$ = (s, ctx = document) => Array.from(ctx.querySelectorAll(s));

// Helpers datos
function numeroDesdeTexto(v){ return parseFloat(String(v||'').replace(',', '.')); }
function normalizeStr(s){ return (s||'').toString().trim(); }
function stripDiacritics(s){
  return (s || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
}
function normalize(s){ return stripDiacritics((s||'').toLowerCase().trim()); }

// API helpers (fetch GET/PUT normalizados)
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

/* ────────────────────────────────────────────────────────────────────────── */
/* 0.1) UI REFS                                                               */
/* ────────────────────────────────────────────────────────────────────────── */

// Menú lateral
const menuBtn        = $('.menu-btn');
const menuLateral    = $('#menuLateral');
const menuOverlay    = $('#menuOverlay');

// (+) principal
const btnAgregar     = $('#btnAgregar');
const modalAgregar   = $('#modalAgregar');
const menuOpciones   = $('#menuOpciones');

// Zonas (alta dentro del modal +)
const formZona       = $('#formZona');
const btnZona        = $('#btnZona');
const btnCancelarZona= $('#btnCancelarZona');
const btnGuardarZona = $('#btnGuardarZona');
const inputNombreZona= $('#inputNombreZona');
const inputCostoZona = $('#inputCostoZona');

// Zonas (tabla)
const btnAbrirZonas  = $('#btnAbrirZonas');
const modalZonas     = $('#modalZonas');
const btnCerrarZonas = $('#btnCerrarZonas');
const tablaZonasBody = $('#tablaZonasBody');

// Zonas (editar)
const modalEditarZona      = $('#modalEditarZona');
const btnCerrarEditarZona  = $('#btnCerrarEditarZona');
const editNombreZona       = $('#editNombreZona');
const editCostoZona        = $('#editCostoZona');
const btnGuardarZonaEditada= $('#btnGuardarZonaEditada');
const btnCancelarEditarZona= $('#btnCancelarEditarZona');

// Cat/Sub (alta dentro del modal +)
const btnCatSub = $('#btnCatSub');
const formCatSub = $('#formCatSub');
const selCategoriaExistente = $('#selCategoriaExistente');
const inputNuevaCategoria   = $('#inputNuevaCategoria');
const selSubcategoriaExistente = $('#selSubcategoriaExistente');
const inputNuevaSubcategoria   = $('#inputNuevaSubcategoria');
const btnGuardarCatSub = $('#btnGuardarCatSub');
const btnCancelarCatSub = $('#btnCancelarCatSub');

// Categorías/Subcategorías (modal de edición)
const btnCats        = $('#btnCats');
const modalCats      = $('#modalCats');
const btnCerrarCats  = $('#btnCerrarCats');
const tablaCatsBody  = $('#tablaCatsBody');
const catTitle       = $('#catTitle');
const subcatList     = $('#subcatList');
const inputNuevaSubcat = $('#inputNuevaSubcat');
const btnAgregarSubcat = $('#btnAgregarSubcat');

// Productos – filtros/tabla
const API_PRODUCTOS   = '/api/data/productos';
const filterCategory     = $('#filterCategory');
const filterSubcategory  = $('#filterSubcategory');
const filterSearch       = $('#filterSearch');
const tablaProductosBody = $('#tablaProductosBody');
const productosEmpty     = $('#productosEmpty');

// Productos – alta (dentro del modal +)
const btnProducto          = $('#btnProducto');
const formProducto         = $('#formProducto');
const inputProdName        = $('#inputProdName');
const inputProdPrice       = $('#inputProdPrice');
const selProdCategory      = $('#selProdCategory');
const selProdSubcategory   = $('#selProdSubcategory');
const inputProdImage       = $('#inputProdImage');
const chkProdActive        = $('#chkProdActive');
const btnGuardarProducto   = $('#btnGuardarProducto');
const btnCancelarProducto  = $('#btnCancelarProducto');

// Productos – unidad/cantidades (alta)
const inputProdUnit  = $('#inputProdUnit');
const kgOptions      = $('#kgOptions');
const inputProdStep  = $('#inputProdStep');
const inputProdMinQty= $('#inputProdMinQty');

// Productos – combos (alta)
const inputPricingMode = $('#inputPricingMode');
const combosWrap       = $('#combosWrap');
const combosBody       = $('#combosBody');
const btnAddCombo      = $('#btnAddCombo');
const combosUnitLabel  = $('#combosUnitLabel');
let   comboRows        = []; // [{qty, price}]

// Productos – edición
const modalEditProd       = $('#modalEditProd');
const btnCerrarEditarProd = $('#btnCerrarEditarProd');
const editProdName        = $('#editProdName');
const editProdPrice       = $('#editProdPrice');
const editProdCategory    = $('#editProdCategory');
const editProdSubcategory = $('#editProdSubcategory');
const editProdImage       = $('#editProdImage');
const btnCancelEditProd   = $('#btnCancelEditProd');
const btnSaveEditProd     = $('#btnSaveEditProd');
const editProdUnit        = $('#editProdUnit');
const editKgOptions       = $('#editKgOptions');
const editProdStep        = $('#editProdStep');
const editProdMinQty      = $('#editProdMinQty');
// Combos (edición)
const editHasCombos    = $('#editHasCombos');
const editCombosSection= $('#editCombosSection');
const editCombosHelp   = $('#editCombosHelp');
const editCombosTable  = $('#editCombosTable');
const btnAddComboRow   = $('#btnAddComboRow');
let   editCombos       = []; // [{qty, price}]
let   editingProdId    = null;

// Servicio (modal)
const API_SERVICIO = '/api/data/servicio';
const optServicio   = $('#optServicio');
const modalServicio = $('#modalServicio');
const srvActive     = $('#srvActive');
const srvMessage    = $('#srvMessage');
const srvImage      = $('#srvImage');
const btnSrvCancel  = $('#btnSrvCancel');
const btnSrvSave    = $('#btnSrvSave');

// Zonas / Categorías endpoints
const API_ZONAS = '/api/data/zonas';
const API_CATEGORIAS = '/api/data/categorias';

// Estado en memoria
let productsCache   = []; // {id,name,price,category,subcategory,image,active,soldBy,step,minQty,kgPricing?,bundlePricing?}
let categoriesCache = []; // {name, subcategories[]}
let selectedCat     = '';
let toastTimer      = null;

// Toast
const toast      = $('#mensajeGuardado');
const toastClose = $('#cerrarMensaje');

/* ────────────────────────────────────────────────────────────────────────── */
/* 1) SERVICIO (activar/desactivar)                                           */
/* ────────────────────────────────────────────────────────────────────────── */

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
  srvInitialActive   = !!data.active;
  setServicioFormState(srvActive.checked);
  abrirModal(modalServicio);
}
optServicio?.addEventListener('click', () => {
  cerrarMenu?.();
  openServicioModal().catch(err => {
    console.error(err); mostrarToast?.('Error cargando estado del servicio');
  });
});
srvActive?.addEventListener('change', () => setServicioFormState(srvActive.checked));
btnSrvCancel?.addEventListener('click', () => cerrarModal(modalServicio));
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

/* ────────────────────────────────────────────────────────────────────────── */
/* 2) PRODUCTOS (Alta, Edición, Tabla)                                        */
/* ────────────────────────────────────────────────────────────────────────── */

// ====== Cantidad: UI (alta) ======
function applyQtyUIForAdd() {
  const isWeight = inputProdUnit.value === 'weight';
  if (isWeight) {
    inputProdStep.min = '0.01'; inputProdStep.step = '0.01';
    inputProdStep.placeholder = 'Ej. 0.25';
    if (!inputProdStep.value) inputProdStep.value = '0.25';
    inputProdMinQty.min = '0.01'; inputProdMinQty.step = '0.01';
    inputProdMinQty.placeholder = 'Ej. 0.25';
    if (!inputProdMinQty.value) inputProdMinQty.value = '0.25';
  } else {
    inputProdStep.min = '1'; inputProdStep.step = '1';
    inputProdStep.placeholder = 'Ej. 1';
    if (!inputProdStep.value || Number(inputProdStep.value) < 1) inputProdStep.value = '1';
    inputProdMinQty.min = '1'; inputProdMinQty.step = '1';
    inputProdMinQty.placeholder = 'Ej. 1';
    if (!inputProdMinQty.value || Number(inputProdMinQty.value) < 1) inputProdMinQty.value = '1';
  }
}
inputProdUnit?.addEventListener('change', () => { applyQtyUIForAdd(); updateCombosUnitUI(); });

// ====== Cantidad: UI (edición) ======
function applyQtyUIForEdit() {
  const isWeight = editProdUnit.value === 'weight';
  if (isWeight) {
    editProdStep.min = '0.01'; editProdStep.step = '0.01';
    editProdStep.placeholder = 'Ej. 0.25';
    if (!editProdStep.value) editProdStep.value = '0.25';
    editProdMinQty.min = '0.01'; editProdMinQty.step = '0.01';
    editProdMinQty.placeholder = 'Ej. 0.25';
    if (!editProdMinQty.value) editProdMinQty.value = '0.25';
  } else {
    editProdStep.min = '1'; editProdStep.step = '1';
    editProdStep.placeholder = 'Ej. 1';
    if (!editProdStep.value || Number(editProdStep.value) < 1) editProdStep.value = '1';
    editProdMinQty.min = '1'; editProdMinQty.step = '1';
    editProdMinQty.placeholder = 'Ej. 1';
    if (!editProdMinQty.value || Number(editProdMinQty.value) < 1) editProdMinQty.value = '1';
  }
}
editProdUnit?.addEventListener('change', () => {
  applyQtyUIForEdit();
  if (editHasCombos?.checked) { editCombos = []; renderCombosRows(); }
  showCombosUI(editHasCombos?.checked);
  validateEditProdForm();
});

// ====== Combos (alta) ======
function renderCombos(){
  combosBody.innerHTML = '';
  const stepQty = (inputProdUnit.value === 'weight')
    ? (parseFloat(inputProdStep.value) || 0.01) : 1;
  comboRows.forEach((c, idx) => {
    const tr = document.createElement('tr'); tr.className = 'combo-row';
    tr.innerHTML = `
      <td><input type="number" class="modal-input combo-qty" min="${stepQty}" step="${stepQty}" value="${(c.qty ?? '').toString()}" placeholder="${inputProdUnit.value === 'weight' ? 'kg' : 'pz'}"></td>
      <td><input type="number" class="modal-input combo-price" min="0.01" step="0.01" value="${(c.price ?? '').toString()}" placeholder="$0.00"></td>
      <td><button type="button" class="btn-accion btn-del-combo" data-idx="${idx}" style="background:#ef4444">Eliminar</button></td>`;
    combosBody.appendChild(tr);
  });
}
function validateCombos(){
  const unit    = inputProdUnit.value;
  const stepVal = (unit === 'weight') ? (parseFloat(inputProdStep.value) || 0) : 1;
  let ok = true; const seen = new Set();
  $$('.combo-row', combosBody).forEach(row => {
    const qtyInput   = $('.combo-qty', row);
    const priceInput = $('.combo-price', row);
    const qty   = parseFloat(String(qtyInput.value).replace(',', '.'));
    const price = parseFloat(String(priceInput.value).replace(',', '.'));
    const validQty   = Number.isFinite(qty) && qty > 0;
    const validPrice = Number.isFinite(price) && price > 0;
    let validStep = true;
    if (unit === 'weight' && stepVal > 0) {
      const mult = Math.round(qty / stepVal);
      validStep = Math.abs(qty - mult * stepVal) < 1e-6;
    } else if (unit === 'unit') validStep = Math.abs(qty - Math.round(qty)) < 1e-6;
    let unique = true;
    if (validQty) { if (seen.has(qty)) unique = false; else seen.add(qty); }
    qtyInput.style.borderColor   = (validQty && validStep && unique) ? '#cbd5e1' : '#ef4444';
    priceInput.style.borderColor = validPrice ? '#cbd5e1' : '#ef4444';
    ok = ok && validQty && validPrice && validStep && unique;
  });
  return ok && combosBody.children.length > 0;
}
function readCombosFromDOM(){
  const rows = $$('.combo-row', combosBody);
  const combos = rows.map(row => {
    const qty   = parseFloat(String($('.combo-qty', row).value).replace(',', '.'));
    const price = parseFloat(String($('.combo-price', row).value).replace(',', '.'));
    return { qty, price: +Number(price).toFixed(2) };
  }).filter(x => Number.isFinite(x.qty) && x.qty > 0 && Number.isFinite(x.price) && x.price > 0);
  combos.sort((a,b) => b.qty - a.qty); // DESC
  return combos;
}
function updateCombosUnitUI(){
  if (combosUnitLabel) combosUnitLabel.textContent = (inputProdUnit.value === 'weight') ? 'kg' : 'pz';
  renderCombos();
  validarFormProducto();
}
inputPricingMode?.addEventListener('change', () => {
  const isCombos = inputPricingMode.value === 'combos';
  combosWrap.style.display = isCombos ? 'block' : 'none';
  validarFormProducto();
});
btnAddCombo?.addEventListener('click', () => {
  const defQty = (inputProdUnit.value === 'weight')
    ? (parseFloat(inputProdStep.value) || 0.5) : 1;
  comboRows.push({ qty: defQty, price: 0 });
  renderCombos(); validarFormProducto();
});
combosBody?.addEventListener('input', (e) => {
  if (e.target.classList.contains('combo-qty') || e.target.classList.contains('combo-price')) validarFormProducto();
});
combosBody?.addEventListener('click', (e) => {
  const btn = e.target.closest('.btn-del-combo');
  if (!btn) return; const idx = +btn.dataset.idx;
  comboRows.splice(idx, 1); renderCombos(); validarFormProducto();
});
inputProdStep?.addEventListener('input', () => { renderCombos(); validarFormProducto(); });
inputProdMinQty?.addEventListener('input', validarFormProducto);

// ====== Alta de producto ======
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
  selProdCategory.value = '';
  selProdSubcategory.innerHTML = `<option value="">Selecciona…</option>`;
  selProdSubcategory.disabled = true;
  chkProdActive.checked = true;
  // Unidad por defecto + opciones
  inputProdUnit.value = 'unit';
  inputProdStep.value = '';
  inputProdMinQty.value = '';
  applyQtyUIForAdd();
  // Combos (reset)
  inputPricingMode.value = 'base';
  combosWrap.style.display = 'none';
  comboRows = []; combosBody.innerHTML = '';
  updateCombosUnitUI();
  validarFormProducto();
}
btnProducto?.addEventListener('click', async () => {
  menuOpciones.style.display = 'none';
  formZona.style.display     = 'none';
  formCatSub.style.display   = 'none';
  formProducto.style.display = 'block';
  if (!categoriesCache.length){
    const payload = await apiGet(API_CATEGORIAS).catch(()=>({categories:[]}));
    categoriesCache = Array.isArray(payload) ? payload : (payload.categories || []);
  }
  fillProdSelectorsFromCategories(); prepararFormProducto();
});
selProdCategory?.addEventListener('change', () => {
  const selected = normalizeStr(selProdCategory.value);
  if (!selected){
    selProdSubcategory.innerHTML = `<option value="">Selecciona…</option>`;
    selProdSubcategory.disabled = true; validarFormProducto(); return;
  }
  const found = categoriesCache.find(c => c.name === selected);
  const subs = Array.isArray(found?.subcategories) ? found.subcategories : [];
  selProdSubcategory.innerHTML =
    `<option value="">Selecciona…</option>` + subs.sort().map(s => `<option value="${s}">${s}</option>`).join('');
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

// VALIDACIÓN (alta) – subcategoría opcional si el select está deshabilitado
function validarFormProducto(){
  const nameOk = normalizeStr(inputProdName.value).length > 0;
  const isCombos = (inputPricingMode?.value === 'combos');
  const priceRaw = numeroDesdeTexto(inputProdPrice.value);
  const priceOk  = isCombos ? true : (Number.isFinite(priceRaw) && priceRaw > 0);
  const catOk  = normalizeStr(selProdCategory.value).length > 0;
  const subOk  = selProdSubcategory.disabled ? true : (normalizeStr(selProdSubcategory.value).length > 0);

  const isWeight = inputProdUnit.value === 'weight';
  const stepVal = numeroDesdeTexto(inputProdStep.value);
  const minVal  = numeroDesdeTexto(inputProdMinQty.value);
  let qtyOk = true;
  if (isWeight) {
    qtyOk = Number.isFinite(stepVal) && stepVal > 0 && Number.isFinite(minVal) && minVal > 0;
  } else {
    qtyOk = Number.isFinite(stepVal) && stepVal >= 1 && Math.round(stepVal) === stepVal &&
            Number.isFinite(minVal) && minVal >= 1 && Math.round(minVal) === minVal;
  }

  let combosOk = true;
  if (isCombos) combosOk = validateCombos();

  const ok = nameOk && priceOk && catOk && subOk && qtyOk && combosOk;
  btnGuardarProducto.disabled = !ok;
  btnGuardarProducto.setAttribute('aria-disabled', String(!ok));
}

btnGuardarProducto?.addEventListener('click', async (e) => {
  e.preventDefault();
  if (btnGuardarProducto.disabled) return;

  const name  = normalizeStr(inputProdName.value);
  const basePrice = +(numeroDesdeTexto(inputProdPrice.value) || 0).toFixed(2);
  const image = normalizeStr(inputProdImage.value);
  const active = !!chkProdActive.checked;
  const cat = normalizeStr(selProdCategory.value);
  const sub = selProdSubcategory.disabled ? '' : normalizeStr(selProdSubcategory.value);

  const unit = inputProdUnit.value;
  const step = parseFloat(inputProdStep.value);
  const minQty = parseFloat(inputProdMinQty.value);

  const pricingMode = inputPricingMode.value || 'base';
  let priceCombos = [];
  let priceForDisplay = basePrice;

  if (pricingMode === 'combos') {
    priceCombos = readCombosFromDOM();
    const asc = priceCombos.slice().sort((a,b) => a.qty - b.qty);
    priceForDisplay = asc[0]?.price ?? 0;
  }

  try {
    const id = `p_${Date.now()}`;
    const producto = {
      id, name,
      price: +Number(priceForDisplay || 0).toFixed(2),
      category: cat, subcategory: sub, image, active,
      soldBy: unit,
      step: Number.isFinite(step) && step > 0 ? step : (unit === 'weight' ? 0.25 : 1),
      minQty: Number.isFinite(minQty) && minQty > 0 ? minQty : (unit === 'weight' ? 0.25 : 1),
    };

    // Persistimos combos modernos
    if (pricingMode === 'combos') {
      const tiersSorted = priceCombos
        .map(t => ({ qty: +t.qty, price: +Number(t.price).toFixed(2) }))
        .filter(t => t.qty > 0 && t.price > 0)
        .sort((a,b) => a.qty - b.qty);

      if (unit === 'weight') producto.kgPricing = { tiers: tiersSorted };
      else                   producto.bundlePricing = { tiers: tiersSorted };

      producto.pricingMode = 'combos';
      producto.priceCombos = tiersSorted; // opcional (legacy)
    } else {
      producto.pricingMode = 'base';
      producto.priceCombos = [];
      delete producto.kgPricing;
      delete producto.bundlePricing;
    }

    if (!productsCache.length) {
      const payload = await apiGet(API_PRODUCTOS).catch(() => ({ products: [] }));
      productsCache = Array.isArray(payload) ? payload : (payload.products || []);
    }
    productsCache.push(producto);
    await apiPut(API_PRODUCTOS, { products: productsCache });

    mostrarToast('Producto agregado');
    prepararFormProducto();
    fillFilterSelectors(); applyProductosFilters(); updateVaciarToggleUI();
  } catch (err) {
    console.error(err);
    mostrarToast('Error al guardar producto');
  }
});

btnCancelarProducto?.addEventListener('click', (e) => {
  e.preventDefault();
  formProducto.style.display = 'none';
  menuOpciones.style.display = 'block';
  prepararFormProducto();
});

// ====== Tabla / filtros ======
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
  if (!list.length){ productosEmpty.classList.remove('hidden'); return; }
  productosEmpty.classList.add('hidden');
  list.forEach(p=>{
    const tr = document.createElement('tr');
    tr.dataset.id = p.id || '';
    tr.innerHTML = `
      <td><img src="${p.image || ''}" alt="" class="table-thumb" onerror="this.style.visibility='hidden'"></td>
      <td>${p.name || ''}</td>
      <td>$${Number(p.price||0).toFixed(2)}</td>
      <td>${p.category || ''}</td>
      <td>${p.subcategory || ''}</td>
      <td style="white-space:nowrap">
        <button class="btn-accion btn-edit-prod">Editar</button>
        <button class="btn-accion btn-del-prod" style="background:#ef4444">Eliminar</button>
        <label class="switch" style="vertical-align:middle; margin-left:8px;">
          <input type="checkbox" class="prod-active" ${p.active === false ? '' : 'checked'}>
          <span class="track"><span class="thumb"></span></span>
        </label>
      </td>`;
    tablaProductosBody.appendChild(tr);
  });
}

// Filtros (listeners)
function attachProductosFilterListeners(){
  filterCategory?.addEventListener('change', () => {
    updateSubcategoryFilter(); applyProductosFilters(); updateVaciarToggleUI();
  });
  filterSubcategory?.addEventListener('change', () => {
    applyProductosFilters(); updateVaciarToggleUI();
  });
  let searchTimer = null;
  filterSearch?.addEventListener('input', () => {
    clearTimeout(searchTimer);
    if (filterCategory) filterCategory.value = '';
    if (filterSubcategory) {
      filterSubcategory.innerHTML = `<option value="">Selecciona subcategoría</option>`;
      filterSubcategory.disabled = true;
    }
    searchTimer = setTimeout(() => { applyProductosFilters(); updateVaciarToggleUI(); }, 120);
  });
}

// Activar/desactivar (por producto)
tablaProductosBody?.addEventListener('change', async (e) => {
  const chk = e.target.closest('.prod-active');
  if (!chk) return;
  const tr = e.target.closest('tr'); const id = tr?.dataset?.id || '';
  if (!id) return;
  try {
    const idx = productsCache.findIndex(x => (x.id||'') === id);
    if (idx === -1) return;
    productsCache[idx].active = chk.checked;
    await apiPut(API_PRODUCTOS, { products: productsCache });
    mostrarToast(chk.checked ? 'Producto activado' : 'Producto desactivado');
    updateVaciarToggleUI();
  } catch (err) {
    console.error(err);
    mostrarToast('Error al actualizar estado');
    chk.checked = !chk.checked;
  }
});

// Editar / Eliminar
tablaProductosBody?.addEventListener('click', async (e) => {
  const tr = e.target.closest('tr'); if (!tr) return;
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
    if (!prod) return mostrarToast('No se encontró el producto');
    openProductEditModal(prod); return;
  }
  if (e.target.closest('.btn-del-prod')) {
    if (!confirm('¿Eliminar este producto?')) return;
    try{
      const newList = productsCache.filter(p => (p.id || '') !== id);
      productsCache = newList;
      await apiPut(API_PRODUCTOS, { products: productsCache });
      mostrarToast('Producto eliminado');
      applyProductosFilters(); updateVaciarToggleUI();
    } catch (err) {
      console.error(err);
      mostrarToast('Error al eliminar');
    }
  }
});

// Modal edición – abrir con datos
function fillEditCatAndSub(catSel, subSel, selectedCat = '', selectedSub = ''){
  const cats = categoriesCache.map(c => c.name);
  catSel.innerHTML = cats.map(c => `<option value="${c}">${c}</option>`).join('');
  catSel.value = (selectedCat && cats.includes(selectedCat)) ? selectedCat : (cats[0] || '');
  const subs = (categoriesCache.find(c => c.name === catSel.value)?.subcategories) || [];
  subSel.innerHTML = subs.map(s => `<option value="${s}">${s}</option>`).join('');
  subSel.disabled = subs.length === 0;
  subSel.value = (selectedSub && subs.includes(selectedSub)) ? selectedSub : (subs[0] || '');
}
function loadCombosFromProduct(producto) {
  // Fuente según unidad
  let tiers = [];
  if (editProdUnit.value === 'weight') {
    tiers = producto?.kgPricing?.tiers || [];
  } else {
    tiers = producto?.bundlePricing?.tiers || [];
  }
  // Fallback legacy
  if ((!tiers || tiers.length === 0) && Array.isArray(producto?.priceCombos)) {
    tiers = producto.priceCombos;
  }
  editCombos = Array.isArray(tiers)
    ? tiers.map(t => ({ qty: +t.qty, price: +t.price }))
    : [];
  editHasCombos.checked = editCombos.length > 0;
  showCombosUI(editHasCombos.checked);
  renderCombosRows();
}
function combosHelpText() {
  if (editProdUnit.value === 'weight') {
    return 'Ejemplo por <strong>kg</strong>: 0.5 kg = $13.00, 1 kg = $24.00. Para 1.5 kg: 1 kg + 0.5 kg.';
  }
  return 'Ejemplo por <strong>piezas</strong>: 1 pza = $45, 2 pzas = $85, 3 pzas = $130, etc.';
}
function currentQtyStepForUnit() {
  if (editProdUnit.value === 'weight') {
    const s = parseFloat(editProdStep.value);
    return Number.isFinite(s) && s > 0 ? s : 0.25;
  }
  return 1;
}
function showCombosUI(show) {
  if (!editCombosSection) return;
  editCombosSection.style.display = show ? 'block' : 'none';
  if (editCombosHelp) editCombosHelp.innerHTML = combosHelpText();
}
function renderCombosRows() {
  if (!editCombosTable) return;
  const tbody = editCombosTable.querySelector('tbody');
  tbody.innerHTML = '';
  const qtyStep = currentQtyStepForUnit();
  const isWeight = editProdUnit.value === 'weight';
  editCombos.forEach((row, idx) => {
    const tr = document.createElement('tr');
    const tdQty = document.createElement('td');
    const qtyInput = document.createElement('input');
    qtyInput.type = 'number';
    qtyInput.min = isWeight ? String(qtyStep) : '1';
    qtyInput.step = isWeight ? String(qtyStep) : '1';
    qtyInput.placeholder = isWeight ? 'Ej. 0.5' : 'Ej. 2';
    qtyInput.value = row.qty ?? '';
    qtyInput.className = 'modal-input';
    tdQty.appendChild(qtyInput);
    const tdPrice = document.createElement('td');
    const priceInput = document.createElement('input');
    priceInput.type = 'number';
    priceInput.min = '0.01'; priceInput.step = '0.01';
    priceInput.placeholder = 'Ej. 24.00';
    priceInput.value = (row.price ?? '') === '' ? '' : Number(row.price).toFixed(2);
    priceInput.className = 'modal-input';
    tdPrice.appendChild(priceInput);
    const tdActions = document.createElement('td');
    const btnDel = document.createElement('button');
    btnDel.type = 'button'; btnDel.className = 'btn-accion';
    btnDel.style.background = '#ef4444'; btnDel.textContent = 'Eliminar';
    tdActions.appendChild(btnDel);
    tr.appendChild(tdQty); tr.appendChild(tdPrice); tr.appendChild(tdActions);
    tbody.appendChild(tr);
    // listeners
    qtyInput.addEventListener('input', () => { const v = parseFloat(qtyInput.value); editCombos[idx].qty = Number.isFinite(v) ? v : ''; validateEditProdForm(); });
    priceInput.addEventListener('input', () => { const v = parseFloat(priceInput.value); editCombos[idx].price = Number.isFinite(v) ? v : ''; validateEditProdForm(); });
    btnDel.addEventListener('click', () => { editCombos.splice(idx, 1); renderCombosRows(); validateEditProdForm(); });
  });
}
function combosAreValid() {
  if (!editHasCombos?.checked) return true;
  if (!Array.isArray(editCombos) || editCombos.length === 0) return false;
  const isWeight = editProdUnit.value === 'weight';
  return editCombos.every(r => {
    const qtyOk   = Number.isFinite(+r.qty)   && +r.qty > 0 && (isWeight ? true : Number.isInteger(+r.qty));
    const priceOk = Number.isFinite(+r.price) && +r.price > 0;
    return qtyOk && priceOk;
  });
}
editHasCombos?.addEventListener('change', () => {
  showCombosUI(editHasCombos.checked);
  if (!editHasCombos.checked) { editCombos = []; renderCombosRows(); }
  validateEditProdForm();
});
btnAddComboRow?.addEventListener('click', () => {
  const def = editProdUnit.value === 'weight'
    ? (parseFloat(editProdStep.value) || 0.5)
    : 1;
  editCombos.push({ qty: def, price: '' });
  renderCombosRows(); validateEditProdForm();
});

function openProductEditModal(producto) {
  editingProdId = producto.id;
  editProdName.value = producto.name;
  const price = Number(producto.price);
  editProdPrice.value = !isNaN(price) ? price.toFixed(2) : '';
  fillEditCatAndSub(editProdCategory, editProdSubcategory, producto.category, producto.subcategory);
  editProdImage.value = producto.image || '';
  editProdUnit.value = producto.soldBy || 'unit';
  editProdStep.value = (Number.isFinite(producto.step) ? producto.step : (producto.soldBy === 'weight' ? 0.25 : 1));
  editProdMinQty.value = (Number.isFinite(producto.minQty) ? producto.minQty : (producto.soldBy === 'weight' ? 0.25 : 1));
  applyQtyUIForEdit();
  loadCombosFromProduct(producto);
  validateEditProdForm();
  abrirModal(modalEditProd);
}

function validateEditProdForm() {
  const nameOk = (editProdName.value || '').trim().length > 0;
  const priceVal = parseFloat(editProdPrice.value);
  const priceOk = Number.isFinite(priceVal) && priceVal > 0;
  const catOk = (editProdCategory.value || '').trim().length > 0;
  const subOk = editProdSubcategory.disabled ? true : (editProdSubcategory.value || '').trim().length > 0;
  const unitOk = editProdUnit.value !== '';
  const isWeight = editProdUnit.value === 'weight';
  const eStep = parseFloat(editProdStep.value);
  const eMin  = parseFloat(editProdMinQty.value);
  let qtyOk = true;
  if (isWeight) { qtyOk = Number.isFinite(eStep) && eStep > 0 && Number.isFinite(eMin) && eMin > 0; }
  else          { qtyOk = Number.isFinite(eStep) && eStep >= 1 && Math.round(eStep) === eStep &&
                         Number.isFinite(eMin) && eMin >= 1 && Math.round(eMin) === eMin; }
  const combosOk = combosAreValid();
  const ok = nameOk && priceOk && catOk && subOk && unitOk && qtyOk && combosOk;
  btnSaveEditProd.disabled = !ok;
  btnSaveEditProd.setAttribute('aria-disabled', String(!ok));
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

// Guardar edición
btnSaveEditProd?.addEventListener('click', async () => {
  if (btnSaveEditProd.disabled) return;
  const name = editProdName.value.trim();
  const price = parseFloat(editProdPrice.value);
  const cat = editProdCategory.value.trim();
  const sub = editProdSubcategory.disabled ? '' : editProdSubcategory.value.trim();
  const image = editProdImage.value.trim();
  const unit = editProdUnit.value;
  const step = parseFloat(editProdStep.value);
  const minQty = parseFloat(editProdMinQty.value);

  try {
    let idx = productsCache.findIndex(p => (p.id || '') === (editingProdId || ''));
    if (idx === -1) return mostrarToast('Producto no encontrado');

    productsCache[idx] = {
      ...productsCache[idx],
      name,
      price: +price.toFixed(2),
      category: cat,
      subcategory: sub,
      image,
      soldBy: unit,
      step: Number.isFinite(step) && step > 0 ? step : (unit === 'weight' ? 0.25 : 1),
      minQty: Number.isFinite(minQty) && minQty > 0 ? minQty : (unit === 'weight' ? 0.25 : 1)
    };

    // Combos
    if (editHasCombos.checked && combosAreValid() && editCombos.length > 0) {
      const sorted = editCombos
        .map(r => ({ qty: +r.qty, price: +Number(r.price).toFixed(2) }))
        .filter(r => r.qty > 0 && r.price > 0)
        .sort((a,b) => a.qty - b.qty);
      if (unit === 'weight') { productsCache[idx].kgPricing = { tiers: sorted }; delete productsCache[idx].bundlePricing; }
      else { productsCache[idx].bundlePricing = { tiers: sorted }; delete productsCache[idx].kgPricing; }
    } else { delete productsCache[idx].kgPricing; delete productsCache[idx].bundlePricing; }

    await apiPut(API_PRODUCTOS, { products: productsCache });
    cerrarModal(modalEditProd); editingProdId = null;
    mostrarToast('Producto actualizado');
    applyProductosFilters();
  } catch (err) {
    console.error(err);
    mostrarToast('Error al guardar cambios');
  }
});

// Cerrar edición
btnCerrarEditarProd?.addEventListener('click', () => cerrarModal(modalEditProd));
btnCancelEditProd?.addEventListener('click', (e) => {
  e.preventDefault();
  cerrarModal(modalEditProd);
});

// INIT productos
async function loadCategoriasAdmin(){
  const payload = await apiGet(API_CATEGORIAS).catch(()=>({categories:[]}));
  categoriesCache = Array.isArray(payload) ? payload : (payload.categories || []);
}
async function loadProductosAdmin(){
  const payload = await apiGet(API_PRODUCTOS).catch(()=>({products:[]}));
  productsCache = Array.isArray(payload) ? payload : (payload.products || []);
  let touched = false;
  productsCache.forEach((p, i) => {
    if (!p.id) { p.id = `p_${Date.now()}_${i}`; touched = true; }
    if (!Number.isFinite(p.step))   p.step   = (p.soldBy === 'weight' ? 0.25 : 1);
    if (!Number.isFinite(p.minQty)) p.minQty = (p.soldBy === 'weight' ? 0.25 : 1);
  });
  if (touched) { try { await apiPut(API_PRODUCTOS, { products: productsCache }); } catch {} }
}
async function initProductosPanel(){
  try{ await Promise.all([ loadCategoriasAdmin(), loadProductosAdmin() ]);
    fillFilterSelectors(); applyProductosFilters(); updateVaciarToggleUI();
  } catch (err){ console.error(err); mostrarToast('Error al cargar productos'); }
}
function bootProductosPanel(){
  attachProductosFilterListeners();
  initProductosPanel().catch(err => { console.error(err); mostrarToast('Error al iniciar productos'); });
}
if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', bootProductosPanel);
else bootProductosPanel();

/* ────────────────────────────────────────────────────────────────────────── */
/* 3) ZONAS                                                                   */
/* ────────────────────────────────────────────────────────────────────────── */

function numeroDesdeTextoZona(v) { if (typeof v !== 'string') return NaN; return parseFloat(v.replace(',', '.')); }

// (Unificada) Validación de zona con campos de envío gratis
function validarFormZona() {
  const nombreOk = !!(inputNombreZona && inputNombreZona.value.trim().length > 0);
  const costoVal = numeroDesdeTextoZona(inputCostoZona ? inputCostoZona.value.trim() : '');
  const costoOk  = Number.isFinite(costoVal) && costoVal >= 0;
  let freeOk = true;
  if (chkZonaFree?.checked) {
    const minVal = numeroDesdeTextoZona(inputFreeMin?.value.trim() || '');
    freeOk = Number.isFinite(minVal) && minVal > 0;
  }
  const habilitar = nombreOk && costoOk && freeOk;
  btnGuardarZona.disabled = !habilitar;
  btnGuardarZona.setAttribute('aria-disabled', String(!habilitar));
}
function prepararFormZona() { inputNombreZona.value = ''; inputCostoZona.value  = ''; inputFreeMin.value=''; chkZonaFree.checked=false; inputFreeMin.disabled = true; validarFormZona(); }
inputNombreZona?.addEventListener('input', validarFormZona);
inputCostoZona?.addEventListener('input', validarFormZona);

// Abrir modal (+)
btnAgregar?.addEventListener('click', () => {
  menuOpciones.style.display = 'block';
  formZona.style.display     = 'none';
  formCatSub.style.display   = 'none';
  formProducto.style.display = 'none';
  abrirModal(modalAgregar);
});
btnZona?.addEventListener('click', () => { menuOpciones.style.display = 'none'; formZona.style.display = 'block'; prepararFormZona(); });
btnCancelarZona?.addEventListener('click', (e) => { e.preventDefault(); menuOpciones.style.display = 'block'; formZona.style.display = 'none'; prepararFormZona(); });

btnGuardarZona?.addEventListener('click', async (e) => {
  e.preventDefault();
  if (btnGuardarZona.disabled) return;
  const nombre = inputNombreZona.value.trim();
  const costo  = numeroDesdeTextoZona(inputCostoZona.value.trim());
  const freeShipping = !!chkZonaFree.checked;
  const freeMin = freeShipping ? +(numeroDesdeTextoZona(inputFreeMin.value.trim()) || 0).toFixed(2) : null;
  try {
    const zonas = await apiGet(API_ZONAS).catch(() => []);
    if (zonas.some(z => z.nombre.toLowerCase() === nombre.toLowerCase()))
      return mostrarToast('Esa zona ya existe');
    zonas.push({ nombre, costo: +Number(costo).toFixed(2), freeShipping, freeMin });
    await apiPut(API_ZONAS, zonas);
    mostrarToast('Zona guardada');
    prepararFormZona();
    if (modalZonas && !modalZonas.classList.contains('oculto')) await cargarZonasEnTabla();
  } catch (err) { console.error(err); mostrarToast('Error al guardar zona'); }
});

btnAbrirZonas?.addEventListener('click', async () => { cerrarMenu(); await cargarZonasEnTabla(); abrirModal(modalZonas); });
btnCerrarZonas?.addEventListener('click', () => cerrarModal(modalZonas));
btnCerrarEditarZona?.addEventListener('click', () => cerrarModal(modalEditarZona));
btnCancelarEditarZona?.addEventListener('click', (e) => { e.preventDefault(); cerrarModal(modalEditarZona); if (modalZonas && modalZonas.classList.contains('oculto')) abrirModal(modalZonas); });

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
      </td>`;
    tablaZonasBody.appendChild(tr);
  });
  return zonas;
}

// Clicks en tabla de zonas (unificado: editar + eliminar)
tablaZonasBody?.addEventListener('click', async (e) => {
  const tr = e.target.closest('tr'); if (!tr) return;
  const nombreOriginal = tr.dataset.nombre;

  if (e.target.closest('.btn-edit')) {
    try {
      const zonas = await apiGet(API_ZONAS);
      const z = zonas.find(x => x.nombre === nombreOriginal);
      if (!z) return;
      editNombreZona.value = z.nombre;
      editCostoZona.value = Number(z.costo).toFixed(2);
      // Campos de envío gratis
      editChkZonaFree.checked = !!z.freeShipping;
      editFreeMin.disabled = !editChkZonaFree.checked;
      editFreeMin.value = z.freeMin ? Number(z.freeMin).toFixed(2) : '';
      modalEditarZona.dataset.original = nombreOriginal;
      abrirModal(modalEditarZona);
    } catch (err) { console.error(err); mostrarToast('Error al cargar zona'); }
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
    } catch (err) { console.error(err); mostrarToast('Error al eliminar zona'); }
  }
});

// Guardar cambios de zona (editar)
btnGuardarZonaEditada?.addEventListener('click', async (e) => {
  e.preventDefault();
  const original = modalEditarZona.dataset.original || '';
  const nuevoNombre = editNombreZona.value.trim();
  const nuevoCosto  = numeroDesdeTextoZona(editCostoZona.value.trim());
  const freeShipping = !!editChkZonaFree.checked;
  const freeMin = freeShipping ? +(numeroDesdeTextoZona(editFreeMin.value.trim()) || 0).toFixed(2) : null;
  try {
    const zonas = await apiGet(API_ZONAS);
    const idx = zonas.findIndex(z => z.nombre === original);
    if (idx === -1) return mostrarToast('No se encontró la zona');
    if (nuevoNombre.toLowerCase() !== original.toLowerCase() && zonas.some(z => z.nombre.toLowerCase() === nuevoNombre.toLowerCase())) {
      return mostrarToast('Ya existe una zona con ese nombre');
    }
    zonas[idx] = {
      ...zonas[idx],
      nombre: nuevoNombre,
      costo: +Number(nuevoCosto).toFixed(2),
      freeShipping,
      freeMin
    };
    await apiPut(API_ZONAS, zonas);
    cerrarModal(modalEditarZona);
    await cargarZonasEnTabla();
    mostrarToast('Zona actualizada');
  } catch (err) { console.error(err); mostrarToast('Error al actualizar zona'); }
});

// Refs nuevos (ya usados arriba)
const chkZonaFree   = $('#chkZonaFree');
const inputFreeMin  = $('#inputFreeMin');
const editChkZonaFree = $('#editChkZonaFree');
const editFreeMin     = $('#editFreeMin');

// Habilitar/deshabilitar input según checkbox (alta/editar)
chkZonaFree?.addEventListener('change', () => {
  inputFreeMin.disabled = !chkZonaFree.checked;
  validarFormZona();
});
editChkZonaFree?.addEventListener('change', () => {
  editFreeMin.disabled = !editChkZonaFree.checked;
});

/* ────────────────────────────────────────────────────────────────────────── */
/* 4) CATEGORÍAS / SUBCATEGORÍAS                                             */
/* ────────────────────────────────────────────────────────────────────────── */

async function cargarCategorias() {
  const payload = await apiGet(API_CATEGORIAS).catch(()=>({categories:[]}));
  const categories = Array.isArray(payload) ? payload : (payload.categories || []);
  selCategoriaExistente.innerHTML =
    `<option value="">(ninguna)</option>` + categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
  selSubcategoriaExistente.innerHTML = `<option value="">(ninguna)</option>`;
  selSubcategoriaExistente.disabled = true;
  categoriesCache = categories;
  return categories;
}
function validarFormCatSub(){
  const cat = normalizeStr(inputNuevaCategoria?.value) || normalizeStr(selCategoriaExistente?.value);
  const sub = normalizeStr(inputNuevaSubcategoria?.value) || normalizeStr(selSubcategoriaExistente?.value);
  const ok = !!cat && !!sub;
  btnGuardarCatSub.disabled = !ok;
  btnGuardarCatSub.setAttribute('aria-disabled', String(!ok));
}
function prepararFormCatSub(){
  inputNuevaCategoria.value = '';
  inputNuevaSubcategoria.value = '';
  selCategoriaExistente.value = '';
  selSubcategoriaExistente.innerHTML = `<option value="">(ninguna)</option>`;
  selSubcategoriaExistente.disabled = true;
  validarFormCatSub();
}
btnCatSub?.addEventListener('click', async () => {
  menuOpciones.style.display = 'none';
  formZona.style.display     = 'none';
  formCatSub.style.display   = 'block';
  await cargarCategorias(); prepararFormCatSub();
});
selCategoriaExistente?.addEventListener('change', () => {
  const selected = (selCategoriaExistente.value || '').trim();
  const newCatTyped = (inputNuevaCategoria.value || '').trim().length > 0;
  if (newCatTyped) {
    selSubcategoriaExistente.innerHTML = `<option value="">(ninguna)</option>`;
    selSubcategoriaExistente.disabled = true; validarFormCatSub(); return;
  }
  if (!selected) {
    selSubcategoriaExistente.innerHTML = `<option value="">(ninguna)</option>`;
    selSubcategoriaExistente.disabled = true; validarFormCatSub(); return;
  }
  const found = categoriesCache.find(c => c.name === selected);
  const subs = Array.isArray(found?.subcategories) ? found.subcategories : [];
  selSubcategoriaExistente.innerHTML = `<option value="">(ninguna)</option>` + subs.map(s => `<option value="${s}">${s}</option>`).join('');
  selSubcategoriaExistente.disabled = subs.length === 0;
  validarFormCatSub();
});
inputNuevaCategoria?.addEventListener('input', () => {
  const typed = normalizeStr(inputNuevaCategoria.value).length > 0;
  if (typed) {
    selCategoriaExistente.value = '';
    selSubcategoriaExistente.innerHTML = `<option value="">(ninguna)</option>`;
    selSubcategoriaExistente.disabled = true;
  } else selCategoriaExistente.dispatchEvent(new Event('change'));
  validarFormCatSub();
});
inputNuevaSubcategoria?.addEventListener('input', validarFormCatSub);
selSubcategoriaExistente?.addEventListener('change', validarFormCatSub);

btnGuardarCatSub?.addEventListener('click', async (e) => {
  e.preventDefault();
  const cat = normalizeStr(inputNuevaCategoria.value) || normalizeStr(selCategoriaExistente.value);
  const sub = normalizeStr(inputNuevaSubcategoria.value) || normalizeStr(selSubcategoriaExistente.value);
  if (!cat || !sub) return mostrarToast('Indica categoría y subcategoría');
  try {
    const payload = await apiGet(API_CATEGORIAS).catch(()=>({categories:[]}));
    const categories = Array.isArray(payload) ? payload : (payload.categories || []);
    let entry = categories.find(c => c.name.toLowerCase() === cat.toLowerCase());
    if (!entry) { entry = { name: cat, subcategories: [] }; categories.push(entry); }
    const existsSub = entry.subcategories.some(s => s.toLowerCase() === sub.toLowerCase());
    if (!existsSub) entry.subcategories.push(sub);
    else return mostrarToast('Esa subcategoría ya existe en esa categoría');
    await apiPut(API_CATEGORIAS, { categories });
    mostrarToast('Categoría/Subcategoría guardadas');
    prepararFormCatSub();
  } catch (err) { console.error(err); mostrarToast('Error al guardar'); }
});
btnCancelarCatSub?.addEventListener('click', (e) => { e.preventDefault(); formCatSub.style.display = 'none'; menuOpciones.style.display = 'block'; prepararFormCatSub(); });

// Modal de edición de categorías
function renderCategoriasTabla() {
  tablaCatsBody.innerHTML = '';
  categoriesCache.forEach(c => {
    const tr = document.createElement('tr');
    tr.dataset.cat = c.name;
    tr.innerHTML = `
      <td><button class="btn-link select-cat">${c.name}</button></td>
      <td>
        <button class="btn-accion btn-edit-cat">Editar</button>
        <button class="btn-accion btn-del-cat" style="background:#ef4444">Eliminar</button>
      </td>`;
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
    li.dataset.sub = s; li.style.display = 'flex'; li.style.alignItems = 'center'; li.style.gap = '8px';
    li.innerHTML = `
      <span style="flex:1 1 auto">${s}</span>
      <button class="btn-accion btn-edit-sub">Editar</button>
      <button class="btn-accion btn-del-sub" style="background:#ef4444">Eliminar</button>`;
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
    abrirModal(modalCats);
  } catch (err) { console.error(err); mostrarToast('Error al cargar categorías'); }
});
btnCerrarCats?.addEventListener('click', () => cerrarModal(modalCats));
modalCats?.addEventListener('click', (e) => { if (e.target === modalCats) cerrarModal(modalCats); });

tablaCatsBody?.addEventListener('click', async (e) => {
  const tr = e.target.closest('tr'); if (!tr) return; const catName = tr.dataset.cat;
  if (e.target.closest('.select-cat')) { renderSubcats(catName); return; }
  if (e.target.closest('.btn-edit-cat')) {
    const nuevo = prompt('Nuevo nombre para la categoría:', catName); if (!nuevo) return;
    if (categoriesCache.some(c => c.name.toLowerCase() === nuevo.toLowerCase() && c.name !== catName)) return mostrarToast('Ya existe una categoría con ese nombre');
    const idx = categoriesCache.findIndex(c => c.name === catName); if (idx === -1) return;
    const old = categoriesCache[idx].name; categoriesCache[idx].name = nuevo;
    try { await apiPut(API_CATEGORIAS, { categories: categoriesCache }); renderCategoriasTabla(); if (selectedCat === old) renderSubcats(nuevo); mostrarToast('Categoría actualizada'); }
    catch (err) { console.error(err); mostrarToast('Error al actualizar categoría'); }
    return;
  }
  if (e.target.closest('.btn-del-cat')) {
    if (!confirm(`¿Eliminar la categoría "${catName}" y todas sus subcategorías?`)) return;
    const nuevas = categoriesCache.filter(c => c.name !== catName);
    try { await apiPut(API_CATEGORIAS, { categories: nuevas }); categoriesCache = nuevas; renderCategoriasTabla(); if (selectedCat === catName) renderSubcats(nuevas[0]?.name || ''); mostrarToast('Categoría eliminada'); }
    catch (err) { console.error(err); mostrarToast('Error al eliminar categoría'); }
  }
});
btnAgregarSubcat?.addEventListener('click', async () => {
  const s = (inputNuevaSubcat?.value || '').trim();
  if (!selectedCat) return mostrarToast('Selecciona una categoría');
  if (!s) return;
  const cat = categoriesCache.find(c => c.name === selectedCat); if (!cat) return;
  if (cat.subcategories.some(x => x.toLowerCase() === s.toLowerCase())) return mostrarToast('Esa subcategoría ya existe');
  cat.subcategories.push(s);
  try { await apiPut(API_CATEGORIAS, { categories: categoriesCache }); inputNuevaSubcat.value = ''; renderSubcats(selectedCat); mostrarToast('Subcategoría agregada'); }
  catch (err) { console.error(err); mostrarToast('Error al agregar subcategoría'); }
});
subcatList?.addEventListener('click', async (e) => {
  const li = e.target.closest('li'); if (!li) return;
  const subName = li.dataset.sub; const cat = categoriesCache.find(c => c.name === selectedCat); if (!cat) return;
  if (e.target.closest('.btn-edit-sub')) {
    const nuevo = prompt('Nuevo nombre para la subcategoría:', subName); if (!nuevo) return;
    if (cat.subcategories.some(x => x.toLowerCase() === nuevo.toLowerCase() && x !== subName)) return mostrarToast('Ya existe una subcategoría con ese nombre');
    const idx = cat.subcategories.findIndex(x => x === subName); if (idx === -1) return;
    cat.subcategories[idx] = nuevo;
    try { await apiPut(API_CATEGORIAS, { categories: categoriesCache }); renderSubcats(selectedCat); mostrarToast('Subcategoría actualizada'); }
    catch (err) { console.error(err); mostrarToast('Error al actualizar subcategoría'); }
    return;
  }
  if (e.target.closest('.btn-del-sub')) {
    if (!confirm(`¿Eliminar la subcategoría "${subName}"?`)) return;
    cat.subcategories = cat.subcategories.filter(x => x !== subName);
    try { await apiPut(API_CATEGORIAS, { categories: categoriesCache }); renderSubcats(selectedCat); mostrarToast('Subcategoría eliminada'); }
    catch (err) { console.error(err); mostrarToast('Error al eliminar subcategoría'); }
  }
});

/* ────────────────────────────────────────────────────────────────────────── */
/* 5) MODALES: abrir/cerrar + click en fondo + menú lateral                   */
/* ────────────────────────────────────────────────────────────────────────── */

function abrirMenu()  { menuLateral.classList.add('activo');  menuOverlay.classList.add('activo'); }
function cerrarMenu() { menuLateral.classList.remove('activo'); menuOverlay.classList.remove('activo'); }
menuBtn?.addEventListener('click', abrirMenu);
menuOverlay?.addEventListener('click', cerrarMenu);

// genéricos modal
function abrirModal(modalEl) { if (!modalEl) return; modalEl.classList.remove('oculto'); }
function cerrarModal(modalEl){ if (!modalEl) return; modalEl.classList.add('oculto'); }

// Click afuera para cerrar (aplicado a TODOS los modales con fondo)
function habilitarCierreExterior(modalEl, contentSelector = '.modal-contenido') {
  if (!modalEl) return;
  modalEl.addEventListener('click', (e) => {
    const cont = modalEl.querySelector(contentSelector);
    if (!cont) return;
    if (e.target === modalEl) cerrarModal(modalEl);
  });
}
habilitarCierreExterior(modalAgregar,   '.modal-contenido');
habilitarCierreExterior(modalEditarZona,'.modal-contenido');
habilitarCierreExterior(modalServicio,  '.modal-contenido');
habilitarCierreExterior(modalEditProd,  '.modal-contenido');
modalZonas?.addEventListener('click', (e) => {
  const cont = modalZonas.querySelector('.contenido-zonas');
  if (e.target === modalZonas) cerrarModal(modalZonas);
});

/* ────────────────────────────────────────────────────────────────────────── */
/* 6) VACÍAR SUBCATEGORÍA (switch global) + TOAST + ESC                       */
/* ────────────────────────────────────────────────────────────────────────── */

const toggleVaciarCatalogo = $('#toggleVaciarCatalogo');
function countTotalInScope(cat, sub){ return productsCache.reduce((a,p)=> a + ((p.category===cat && p.subcategory===sub) ? 1 : 0), 0); }
function countActiveProductsInScope(cat, sub){ return productsCache.reduce((a,p)=> a + ((p.category===cat && p.subcategory===sub && p.active !== false) ? 1 : 0), 0); }
function getCurrentScope(){ const cat=(filterCategory?.value||'').trim(); const sub=(filterSubcategory?.value||'').trim(); return {cat, sub, isValid: !!cat && !!sub}; }

function updateVaciarToggleUI(){
  if (!toggleVaciarCatalogo) return;
  const { cat, sub, isValid } = getCurrentScope();

  if (!isValid) {
    toggleVaciarCatalogo.checked=false;
    toggleVaciarCatalogo.disabled=true;
    toggleVaciarCatalogo.title='Selecciona categoría y subcategoría para usar este switch';
    return;
  }

  const totalInScope  = countTotalInScope(cat, sub);
  const activeInScope = countActiveProductsInScope(cat, sub);

  // Permitir usar el switch siempre que haya productos en el scope
  toggleVaciarCatalogo.checked  = activeInScope > 0;
  toggleVaciarCatalogo.disabled = (totalInScope === 0);

  if (totalInScope === 0) toggleVaciarCatalogo.title = 'No hay productos en esta categoría/subcategoría';
  else if (activeInScope === 0) toggleVaciarCatalogo.title = 'Todos los productos están desactivados en esta subcategoría';
  else toggleVaciarCatalogo.title = `Apaga para desactivar todos los productos de "${cat} / ${sub}"`;
}

toggleVaciarCatalogo?.addEventListener('change', async () => {
  const { cat, sub, isValid } = getCurrentScope();
  if (!isValid) return updateVaciarToggleUI();

  // Si el usuario intenta encenderlo manualmente, recalculamos estado (se enciende solo si hay activos)
  if (toggleVaciarCatalogo.checked) return updateVaciarToggleUI();

  // Confirmación para desactivar todo
  if (!confirm(`¿Desactivar TODOS los productos de "${cat} / ${sub}"?`)) {
    return updateVaciarToggleUI();
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
    if (touched) await apiPut(API_PRODUCTOS, { products: productsCache });
    applyProductosFilters(); updateVaciarToggleUI(); mostrarToast(`Subcategoría "${cat} / ${sub}" desactivada`);
  }catch(err){
    console.error(err);
    mostrarToast('Error al desactivar productos');
    updateVaciarToggleUI();
  }
});

function mostrarToast(msg = 'Guardado correctamente.') {
  if (!toast) return;
  const span = toast.querySelector('span'); if (span) span.textContent = msg;
  toast.style.display = 'flex';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (toast.style.display = 'none'), 1800);
}
toastClose?.addEventListener('click', () => (toast.style.display = 'none'));

// ESC para cerrar modales/menú
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (modalEditarZona && !modalEditarZona.classList.contains('oculto')) return cerrarModal(modalEditarZona);
  if (modalEditProd  && !modalEditProd.classList.contains('oculto'))  return cerrarModal(modalEditProd);
  if (modalServicio  && !modalServicio.classList.contains('oculto'))  return cerrarModal(modalServicio);
  if (modalZonas     && !modalZonas.classList.contains('oculto'))     return cerrarModal(modalZonas);
  if (modalAgregar   && !modalAgregar.classList.contains('oculto'))   return cerrarModal(modalAgregar);
  if (menuOverlay    && menuOverlay.classList.contains('activo'))     return cerrarMenu();
});