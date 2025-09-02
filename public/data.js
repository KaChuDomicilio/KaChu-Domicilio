// ===== data.js =====

// Topbar fija: empujar contenido según altura real
(function fixTopbarOffset(){
  const topbar = document.querySelector('.topbar');
  if (!topbar) return;
  const applyOffset = () => {
    const h = topbar.offsetHeight || 0;
    document.body.classList.add('has-fixed-topbar');
    document.body.style.setProperty('--topbar-h', h + 'px');
  };
  window.addEventListener('load', applyOffset);
  window.addEventListener('resize', applyOffset);
  if (document.readyState !== 'loading') applyOffset();
})();

async function loadServiceStatus(){
  try{
    const { json } = await fetchFirstOk(API.servicio);
    const data = Array.isArray(json) ? {} : (json || {});
    return { active: data.active !== false, message: data.message || '', image: data.image || '' };
  }catch(_){
    return { active: true, message: '', image: '' };
  }
}

async function loadCategories() {
  try {
    const { json } = await fetchFirstOk(API.categorias);
    const list = Array.isArray(json) ? json : (Array.isArray(json.categories) ? json.categories : []);
    if (!list.length) throw new Error('categorias vacío o formato inesperado');
    categoriesMap = new Map();
    list.forEach(item => {
      const name = item.name || item.category || '';
      const subs = Array.isArray(item.subcategories) ? item.subcategories
                : Array.isArray(item.subs) ? item.subs
                : [];
      if (name) categoriesMap.set(name, subs);
    });
    // Llenado de selects (si existen)
    const categorySelect = document.getElementById('category');
    const subcategorySelect = document.getElementById('subcategory');
    if (categorySelect){
      const cats = Array.from(categoriesMap.keys()).sort();
      categorySelect.innerHTML = `<option value="">Todas</option>` + cats.map(c=>`<option>${c}</option>`).join('');
    }
    if (subcategorySelect){
      subcategorySelect.innerHTML = `<option value="">Todas</option>`;
      subcategorySelect.disabled = true;
    }
    console.info('Categorías cargadas:', categoriesMap.size);
  } catch (e) {
    categoriesMap = null;
    console.warn('No se cargó categorias.json. Usaremos categorías derivadas de productos.');
  }
}

async function loadZones() {
  const zone = document.getElementById('zone');
  if (!zone) return;
  try {
    const { url, json } = await fetchFirstOk(API.zonas);
    let zonas = [];
    if (Array.isArray(json)) zonas = json;
    else if (json && typeof json === 'object') {
      const keys = ['zonas','zones','items','data','records','rows'];
      for (const k of keys) { if (Array.isArray(json[k])) { zonas = json[k]; break; } }
      if (!zonas.length && Object.values(json).every(v => typeof v === 'number')) {
        zonas = Object.entries(json).map(([nombre, costo]) => ({ nombre, costo }));
      }
    }
    if (!Array.isArray(zonas) || !zonas.length) throw new Error('zonas vacío o formato inesperado');

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

// Exponer
window.loadServiceStatus = loadServiceStatus;
window.loadCategories = loadCategories;
window.loadZones = loadZones;