let srvInitialActive = true; // Recordará el estado con que se abre el modal

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
const API_CATEGORIAS = '/api/data/categorias';
const API_PRODUCTOS   = '/api/data/productos';

// Refs admin productos
const filterCategory     = document.getElementById('filterCategory');
const filterSubcategory  = document.getElementById('filterSubcategory');
const filterSearch       = document.getElementById('filterSearch');
const tablaProductosBody = document.getElementById('tablaProductosBody');
const productosEmpty     = document.getElementById('productosEmpty');

// Estado en memoria
let productsCache   = [];
let categoriesCache = [];

// ====== [PRODUCTOS] Modal edición ======
const modalEditProd       = document.getElementById('modalEditProd');
const editProdName        = document.getElementById('editProdName');
const editProdPrice       = document.getElementById('editProdPrice');
const editProdCategory    = document.getElementById('editProdCategory');
const editProdSubcategory = document.getElementById('editProdSubcategory');
const editProdImage       = document.getElementById('editProdImage');
const btnCancelEditProd   = document.getElementById('btnCancelEditProd');
const btnSaveEditProd     = document.getElementById('btnSaveEditProd');
let editingProdId = null;

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

// ====== Cargar datos desde API ======
async function loadData() {
  try {
    const [zonas, categorias, productos] = await Promise.all([
      apiGet(API_ZONAS),
      apiGet(API_CATEGORIAS),
      apiGet(API_PRODUCTOS),
    ]);
    // Cargar zonas
    renderZonas(zonas);
    // Cargar categorías
    categoriesCache = categorias;
    renderCategorias(categorias);
    // Cargar productos
    productsCache = productos;
    renderProductos(productos);
  } catch (err) {
    console.error("Error al cargar los datos:", err);
  }
}

// Función para mostrar las zonas en la tabla
function renderZonas(zonas) {
  tablaZonasBody.innerHTML = '';
  zonas.forEach(z => {
    const tr = document.createElement('tr');
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
}

// Función para mostrar las categorías en la tabla
function renderCategorias(categorias) {
  const catSelect = $('#selCategoriaExistente');
  catSelect.innerHTML = `<option value="">(ninguna)</option>` +
    categorias.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
}

// Función para mostrar los productos en la tabla
function renderProductos(productos) {
  tablaProductosBody.innerHTML = '';
  productos.forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><img src="${p.image}" alt="" class="table-thumb" onerror="this.style.visibility='hidden'"></td>
      <td>${p.name}</td>
      <td>$${Number(p.price).toFixed(2)}</td>
      <td>${p.category}</td>
      <td>${p.subcategory}</td>
      <td>
        <button class="btn-accion btn-edit-prod">Editar</button>
        <button class="btn-accion btn-del-prod" style="background:#ef4444">Eliminar</button>
      </td>
    `;
    tablaProductosBody.appendChild(tr);
  });
}

// Cargar los datos al cargar la página
document.addEventListener('DOMContentLoaded', loadData);

// ====== [PRODUCTOS] Agregar y Editar ======

// Agregar producto
btnProducto?.addEventListener('click', () => {
  abrirModal(modalAgregar);
  // Cargar categorías al agregar producto
  fillProdSelectorsFromCategories();
  prepararFormProducto();
});

// Función para llenar los selectores de categorías
function fillProdSelectorsFromCategories() {
  selProdCategory.innerHTML =
    `<option value="">Selecciona...</option>` +
    categoriesCache.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
  selProdSubcategory.innerHTML = `<option value="">Selecciona...</option>`;
  selProdSubcategory.disabled = true;
}

// Limpiar y preparar el formulario para agregar un producto
function prepararFormProducto() {
  inputProdName.value = '';
  inputProdPrice.value = '';
  inputProdImage.value = '';
  if (selProdCategory) selProdCategory.value = '';
  if (selProdSubcategory) {
    selProdSubcategory.innerHTML = `<option value="">Selecciona...</option>`;
    selProdSubcategory.disabled = true;
  }
  chkProdActive.checked = true;
  validarFormProducto();
}

// Validar el formulario de producto
function validarFormProducto() {
  const nameOk = inputProdName.value.trim().length > 0;
  const priceOk = parseFloat(inputProdPrice.value) > 0;
  const catOk = selProdCategory.value.trim().length > 0;
  const subOk = !selProdSubcategory.disabled && selProdSubcategory.value.trim().length > 0;
  btnGuardarProducto.disabled = !(nameOk && priceOk && catOk && subOk);
}

// Guardar producto
btnGuardarProducto?.addEventListener('click', async (e) => {
  e.preventDefault();
  if (btnGuardarProducto.disabled) return;

  const name = inputProdName.value.trim();
  const price = parseFloat(inputProdPrice.value).toFixed(2);
  const image = inputProdImage.value.trim();
  const category = selProdCategory.value;
  const subcategory = selProdSubcategory.value;
  const active = chkProdActive.checked;

  const newProduct = {
    id: `p_${Date.now()}`,
    name,
    price,
    category,
    subcategory,
    image,
    active,
  };

  productsCache.push(newProduct);
  await apiPut(API_PRODUCTOS, { products: productsCache });

  mostrarToast('Producto agregado');
  fillFilterSelectors();
  applyProductosFilters();
  updateVaciarToggleUI();
  cerrarModal(modalAgregar);
});

// ====== Funciones para editar productos ======

// Abrir modal de edición de producto
tablaProductosBody?.addEventListener('click', (e) => {
  const tr = e.target.closest('tr');
  if (!tr) return;

  const id = tr.dataset.id;
  const product = productsCache.find(p => p.id === id);
  if (!product) return;

  openProductEditModal(product);
});

// Abrir el modal con los datos del producto a editar
function openProductEditModal(product) {
  editProdName.value = product.name;
  editProdPrice.value = product.price;
  editProdCategory.value = product.category;
  editProdSubcategory.value = product.subcategory;
  editProdImage.value = product.image;
  editingProdId = product.id;
  abrirModal(modalEditProd);
}

// Guardar cambios en el producto editado
btnSaveEditProd?.addEventListener('click', async () => {
  if (!editingProdId) return;

  const updatedProduct = {
    id: editingProdId,
    name: editProdName.value.trim(),
    price: parseFloat(editProdPrice.value).toFixed(2),
    category: editProdCategory.value,
    subcategory: editProdSubcategory.value,
    image: editProdImage.value.trim(),
  };

  const idx = productsCache.findIndex(p => p.id === editingProdId);
  if (idx === -1) return mostrarToast('No se encontró el producto');

  productsCache[idx] = updatedProduct;
  await apiPut(API_PRODUCTOS, { products: productsCache });

  mostrarToast('Producto actualizado');
  cerrarModal(modalEditProd);
  editingProdId = null;
  applyProductosFilters();
});

// ====== Función para eliminar productos ======
tablaProductosBody?.addEventListener('click', async (e) => {
  if (e.target.closest('.btn-del-prod')) {
    const tr = e.target.closest('tr');
    const id = tr.dataset.id;

    if (!id) return;
    if (!confirm('¿Eliminar este producto?')) return;

    productsCache = productsCache.filter(p => p.id !== id);
    await apiPut(API_PRODUCTOS, { products: productsCache });

    mostrarToast('Producto eliminado');
    applyProductosFilters();
  }
});

// ====== Cargar categorías al iniciar ======
async function loadCategorias() {
  const categories = await apiGet(API_CATEGORIAS);
  categoriesCache = categories;
  renderCategorias(categories);
}

// ====== Mostrar/ocultar formularios y modales ======
function abrirModal(modalEl) {
  modalEl.classList.remove('oculto');
}
function cerrarModal(modalEl) {
  modalEl.classList.add('oculto');
}

// ====== Funciones de Toast ======
function mostrarToast(msg) {
  toast.querySelector('span').textContent = msg;
  toast.style.display = 'flex';
  setTimeout(() => toast.style.display = 'none', 3000);
}

toastClose?.addEventListener('click', () => {
  toast.style.display = 'none';
});

// ====== Funciones de API ======
async function apiGet(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Error al cargar datos');
  return response.json();
}

async function apiPut(url, data) {
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Error al guardar datos');
  return response.json();
}
