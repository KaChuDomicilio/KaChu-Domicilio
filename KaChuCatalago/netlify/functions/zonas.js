// CRUD de zonas usando Netlify Blobs
// GET    /.netlify/functions/zonas
// POST   /.netlify/functions/zonas            (X-Admin-Key)
// PUT    /.netlify/functions/zonas/:id        (X-Admin-Key)
// DELETE /.netlify/functions/zonas/:id        (X-Admin-Key)

const JSON_KEY   = 'kachu/zonas.json';
const STORE_NAME = 'kachu';

let blobsMod = null;
async function getStore() {
  if (!blobsMod) blobsMod = await import('@netlify/blobs');
  return blobsMod.blobs.getStore(STORE_NAME);
}

const ok  = (b, s=200) => ({ statusCode:s, headers:{'Content-Type':'application/json; charset=utf-8'}, body:JSON.stringify({ok:true, ...b}) });
const err = (m, s=400) => ({ statusCode:s, headers:{'Content-Type':'application/json; charset=utf-8'}, body:JSON.stringify({ok:false, error:m}) });

const uid = ()=>'z_'+Math.random().toString(36).slice(2,9)+Date.now().toString(36);
const norm= s=>(s??'').normalize('NFKC').trim().replace(/\s+/g,' ');

async function readZones(store){
  const data = await store.get(JSON_KEY,{type:'json'});
  if (data?.items) return data;
  return { version:1, updatedAt:new Date().toISOString(), items:[] };
}
async function writeZones(store, obj){
  const payload = { version:(obj.version||1)+1, updatedAt:new Date().toISOString(), items:obj.items||[] };
  await store.set(JSON_KEY, JSON.stringify(payload), { contentType:'application/json' });
  return payload;
}
function authorized(event){
  const h = event.headers['x-admin-key'] || event.headers['X-Admin-Key'];
  return !!h && h === (process.env.ADMIN_KEY || '');
}

exports.handler = async (event) => {
  try{
    const store  = await getStore();
    const method = event.httpMethod.toUpperCase();
    const tail   = (event.path||'').split('/.netlify/functions/zonas')[1] || '';
    const id     = tail.startsWith('/') ? tail.slice(1) : '';

    if (method==='GET'){
      const data = await readZones(store);
      return ok({ items:data.items, version:data.version, updatedAt:data.updatedAt });
    }
    if (!authorized(event)) return err('No autorizado', 401);

    let body={}; if(event.body){ try{ body=JSON.parse(event.body);}catch{ return err('JSON inválido',400); } }
    const data = await readZones(store);
    const items= data.items;

    if (method==='POST'){
      let {nombre, costo} = body;
      nombre = norm(nombre);
      const c = Number(costo);
      if (!nombre) return err('El nombre es obligatorio',422);
      if (!Number.isFinite(c) || c<0) return err('Costo inválido',422);
      if (items.some(z=>z.nombre.toLowerCase()===nombre.toLowerCase())) return err('Ya existe una zona con ese nombre',409);
      items.push({ id:uid(), nombre, costo:Number(c) });
      const out = await writeZones(store, {...data, items});
      return ok({ items:out.items, version:out.version, updatedAt:out.updatedAt }, 201);
    }

    if (method==='PUT'){
      if (!id) return err('Falta id',400);
      const i = items.findIndex(z=>z.id===id);
      if (i===-1) return err('Zona no encontrada',404);
      if (typeof body.nombre==='string'){
        const n = norm(body.nombre);
        if (!n) return err('Nombre inválido',422);
        if (items.some(z=>z.id!==id && z.nombre.toLowerCase()===n.toLowerCase())) return err('Ya existe una zona con ese nombre',409);
        items[i].nombre = n;
      }
      if (body.costo!==undefined){
        const c = Number(body.costo);
        if (!Number.isFinite(c) || c<0) return err('Costo inválido',422);
        items[i].costo = Number(c);
      }
      const out = await writeZones(store, {...data, items});
      return ok({ items:out.items, version:out.version, updatedAt:out.updatedAt });
    }

    if (method==='DELETE'){
      if (!id) return err('Falta id',400);
      const i = items.findIndex(z=>z.id===id);
      if (i===-1) return err('Zona no encontrada',404);
      items.splice(i,1);
      const out = await writeZones(store, {...data, items});
      return ok({ items:out.items, version:out.version, updatedAt:out.updatedAt });
    }

    return err('Método no permitido',405);
  }catch(e){
    return err('Error interno: '+(e?.message||e),500);
  }
};
