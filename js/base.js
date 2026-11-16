const $=id=>document.getElementById(id);
const SB_URL=CONFIG.SB_URL;
const SB_KEY=CONFIG.SB_KEY;
const SB_HDR={'Content-Type':'application/json','apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY};

let SESSION=null,_rt=null;
function setSession(s){
  SESSION=s;clearTimeout(_rt);
  if(!s){localStorage.removeItem('vico_session');SB_HDR.Authorization='Bearer '+SB_KEY;return;}
  s.expires_at=s.expires_at||Math.floor(Date.now()/1000)+(s.expires_in||3600);
  localStorage.setItem('vico_session',JSON.stringify({access_token:s.access_token,refresh_token:s.refresh_token,expires_at:s.expires_at}));
  SB_HDR.Authorization='Bearer '+s.access_token;
  _rt=setTimeout(refreshSession,Math.max(5000,(s.expires_at-120)*1000-Date.now()));
}
async function authToken(grant,body){
  const r=await fetch(`${SB_URL}/auth/v1/token?grant_type=${grant}`,{method:'POST',headers:{'Content-Type':'application/json','apikey':SB_KEY},body:JSON.stringify(body)});
  const j=await r.json().catch(()=>({}));
  if(!r.ok){const err=new Error(j.error_description||j.msg||j.message||('Auth '+r.status));err.auth=r.status>=400&&r.status<500;throw err;}
  return j;
}
async function refreshSession(){
  if(!SESSION)return false;
  try{setSession(await authToken('refresh_token',{refresh_token:SESSION.refresh_token}));return true;}
  catch(e){
    console.warn('Auth:',e);
    if(!e.auth){clearTimeout(_rt);_rt=setTimeout(refreshSession,30000);return true;}
    setSession(null);showLogin('La sesión expiró. Ingresá de nuevo.');return false;
  }
}
window.addEventListener('storage',e=>{
  if(e.key!=='vico_session')return;
  let s=null;try{s=JSON.parse(e.newValue||'null');}catch{}
  clearTimeout(_rt);SESSION=s;
  if(!s){SB_HDR.Authorization='Bearer '+SB_KEY;showLogin();return;}
  SB_HDR.Authorization='Bearer '+s.access_token;
  _rt=setTimeout(refreshSession,Math.max(5000,(s.expires_at-120)*1000-Date.now()+Math.random()*20000));
});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&SESSION&&SESSION.expires_at-120<Date.now()/1000)refreshSession();});

const STO_PUB=`${SB_URL}/storage/v1/object/public/Imagenes`;
async function shrinkImage(file,max=1200){
  if(!/^image\/(png|jpeg)$/.test(file.type)||file.size<300*1024)return file;
  try{
    const bmp=await createImageBitmap(file),k=Math.min(1,max/Math.max(bmp.width,bmp.height));
    const c=document.createElement('canvas');c.width=Math.round(bmp.width*k);c.height=Math.round(bmp.height*k);
    c.getContext('2d').drawImage(bmp,0,0,c.width,c.height);
    const b=await new Promise(r=>c.toBlob(r,file.type,0.85));
    return b&&b.size<file.size?b:file;
  }catch(e){console.warn('Imagen:',e);return file;}
}
async function sbUploadImage(file,codigo='',slot=''){
  const ext=file.name.split('.').pop()||'png';
  const body=await shrinkImage(file);
  const path=codigo?(codigo+(slot?'_'+slot:'')+'.'+ext):(Date.now()+'_'+Math.random().toString(36).slice(2)+'.'+ext);
  const STO_HDR={'apikey':SB_KEY,'Authorization':SB_HDR.Authorization};
  const up=await fetch(`${SB_URL}/storage/v1/object/Imagenes/${path}`,{method:'POST',headers:{...STO_HDR,'Content-Type':file.type||'image/png','x-upsert':'true'},body});
  if(!up.ok)throw new Error('Upload error: '+(await up.text()));
  return `${STO_PUB}/${path}?v=${Date.now()}`;
}
function initLogos(){
  const pub=name=>`${STO_PUB}/${name}`;
  LOGO=pub('vico.png');IG=pub('instagram.png');WA=pub('whatsapp.png');TT=pub('tiktok.png');
  const el=$('login-logo');if(el)el.src=LOGO;
}
let LOGO='',IG='',WA='',TT='';
const TABLE='Perfumes';

let CFG={inflacion:0,costo_fijo:0,infl_fecha:'',cf_fecha:'',drive_pdf_id:''};
async function loadConfig(){
  try{
    const r=await fetch(`${SB_URL}/rest/v1/Configuracion?select=*`,{headers:SB_HDR});
    if(!r.ok)throw 0;
    (await r.json()).forEach(row=>{
      if(row.descripcion==='inflacion') {CFG.inflacion=parseFloat(row.valor)||0;CFG.infl_fecha=row.fecha_modificacion||'';}
      if(row.descripcion==='costo_fijo'){CFG.costo_fijo=parseFloat(row.valor)||0;CFG.cf_fecha=row.fecha_modificacion||'';}
      if(row.descripcion==='drive_pdf_id'){CFG.drive_pdf_id=row.valor||'';}
    });
    if(!CFG.drive_pdf_id)CFG.drive_pdf_id=localStorage.getItem('vico_drive_pdf_id')||'';
  }catch(e){console.warn('Config:',e);}
}
async function saveConfigVal(desc,val){
  const now=new Date().toISOString();
  const r=await fetch(`${SB_URL}/rest/v1/Configuracion?descripcion=eq.${encodeURIComponent(desc)}`,{method:'PATCH',headers:{...SB_HDR,'Prefer':'return=representation'},body:JSON.stringify({valor:String(val),fecha_modificacion:now})});
  if(!r.ok)console.warn('Config '+desc+' no guardada:',r.status,await r.text());
  else if(!(await r.json()).length){
    const ri=await fetch(`${SB_URL}/rest/v1/Configuracion`,{method:'POST',headers:SB_HDR,body:JSON.stringify({descripcion:desc,valor:String(val),fecha_modificacion:now})});
    if(!ri.ok)console.warn('Config '+desc+' no creada:',ri.status,await ri.text());
  }
  return now;
}
async function saveDriveId(fileId){
  CFG.drive_pdf_id=fileId;
  localStorage.setItem('vico_drive_pdf_id',fileId);
  try{
    const r=await fetch(`${SB_URL}/rest/v1/Configuracion?descripcion=eq.drive_pdf_id`,{
      method:'PATCH',
      headers:{...SB_HDR,'Prefer':'return=representation'},
      body:JSON.stringify({valor:fileId})
    });
    if(!r.ok)console.warn('Supabase drive_pdf_id PATCH falló:',r.status,await r.text());
    else if(!(await r.json()).length){
      const ri=await fetch(`${SB_URL}/rest/v1/Configuracion`,{method:'POST',headers:SB_HDR,body:JSON.stringify({descripcion:'drive_pdf_id',valor:fileId})});
      if(!ri.ok)console.warn('Supabase drive_pdf_id INSERT falló:',ri.status,await ri.text());
    }
  }catch(e){console.warn('drive_file_id no guardado en Supabase:',e);}
}

async function sbGet(){
  const r=await fetch(`${SB_URL}/rest/v1/${TABLE}?select=*&order=id.asc`,{headers:SB_HDR});
  if(!r.ok)throw new Error(await r.text());
  return(await r.json()).map(row=>({
    key:String(row.id),dbId:row.id,tipo:row.type||'',marca:row.brand||'',nombre:row.name||'',
    img:row.img||'',inspo:row.img_insp||'',link:row.info||'',stock:row.stock===false?'out':'in',
    p25:row.p25||0,p5:row.p5||0,p10:row.p10||0,pl:row.pl||0,pc:row.pc||0,tam:row.size||100,
    ce:row.extra_cost!=null?row.extra_cost:0,margin:row.margin!=null?row.margin:60,
    disc5:row.disc5!=null?row.disc5:10,disc10:row.disc10!=null?row.disc10:20,
    roundTo:row.round_to!=null?String(row.round_to):null,aj:row.ajuste!=null?+row.ajuste:1,sales:row.sales||0,
  }));
}
async function sbUpsert(p){
  const row={type:p.tipo||'',brand:p.marca||'',name:p.nombre||'',img:p.img||'',img_insp:p.inspo||'',info:p.link||'',stock:p.stock!=='out',size:p.tam||100,margin:p.margin,disc5:p.disc5,disc10:p.disc10,round_to:p.roundTo!=null?parseInt(p.roundTo):null,extra_cost:p.ce||0,ajuste:p.aj||1,pl:p.pl||0,pc:p.pc||0,p25:p.p25||0,p5:p.p5||0,p10:p.p10||0};
  if(p.dbId)row.id=p.dbId;
  const r=await fetch(`${SB_URL}/rest/v1/${TABLE}`,{method:'POST',headers:{...SB_HDR,'Prefer':'resolution=merge-duplicates,return=representation'},body:JSON.stringify(row)});
  if(!r.ok)throw new Error(await r.text());
  const s=await r.json();return Array.isArray(s)?s[0]:s;
}
async function sbDeletePerf(dbId){
  const r=await fetch(`${SB_URL}/rest/v1/${TABLE}?id=eq.${dbId}`,{method:'DELETE',headers:SB_HDR});
  if(!r.ok)throw new Error(await r.text());
}
async function sbSavePedido(data){
  const rp=await fetch(`${SB_URL}/rest/v1/Pedidos`,{method:'POST',headers:{...SB_HDR,'Prefer':'return=representation'},body:JSON.stringify(data.pedido)});
  if(!rp.ok)throw new Error(await rp.text());
  const saved=await rp.json();const pid=(Array.isArray(saved)?saved[0]:saved).id;
  if(data.items.length){
    const ri=await fetch(`${SB_URL}/rest/v1/PedidosItems`,{method:'POST',headers:{...SB_HDR,'Prefer':'return=representation'},body:JSON.stringify(data.items.map(i=>({...i,pedido_id:pid})))});
    if(!ri.ok){const msg=await ri.text();await fetch(`${SB_URL}/rest/v1/Pedidos?id=eq.${pid}`,{method:'DELETE',headers:SB_HDR}).catch(()=>{});throw new Error(msg);}
  }
  return pid;
}
async function sbOk(r){if(!r.ok)throw new Error(await r.text());return r;}
async function sbUpdatePedido(id,pedido,items){
  const old=await(await sbOk(await fetch(`${SB_URL}/rest/v1/PedidosItems?pedido_id=eq.${id}&select=id`,{headers:SB_HDR}))).json();
  if(items.length)await sbOk(await fetch(`${SB_URL}/rest/v1/PedidosItems`,{method:'POST',headers:{...SB_HDR,'Prefer':'return=minimal'},body:JSON.stringify(items.map(i=>({...i,pedido_id:id})))}));
  if(old.length)await sbOk(await fetch(`${SB_URL}/rest/v1/PedidosItems?id=in.(${old.map(x=>x.id).join(',')})`,{method:'DELETE',headers:SB_HDR}));
  await sbOk(await fetch(`${SB_URL}/rest/v1/Pedidos?id=eq.${id}`,{method:'PATCH',headers:SB_HDR,body:JSON.stringify(pedido)}));
}
async function sbDeletePedido(id){
  await sbOk(await fetch(`${SB_URL}/rest/v1/PedidosItems?pedido_id=eq.${id}`,{method:'DELETE',headers:SB_HDR}));
  await sbOk(await fetch(`${SB_URL}/rest/v1/Pedidos?id=eq.${id}`,{method:'DELETE',headers:SB_HDR}));
}
async function sbGetPedidos(){
  const r=await fetch(`${SB_URL}/rest/v1/Pedidos?select=*&order=id.desc`,{headers:SB_HDR});
  if(!r.ok)throw new Error(await r.text());return await r.json();
}
async function sbUpdateEstado(id,estado){
  await sbOk(await fetch(`${SB_URL}/rest/v1/Pedidos?id=eq.${id}`,{method:'PATCH',headers:SB_HDR,body:JSON.stringify({estado})}));
}
async function sbGetPedidoItems(id){
  const r=await fetch(`${SB_URL}/rest/v1/PedidosItems?pedido_id=eq.${id}&select=*`,{headers:SB_HDR});
  if(!r.ok)throw new Error(await r.text());
  return await r.json();
}
async function fetchNextCode(){
  try{const r=await fetch(`${SB_URL}/rest/v1/${TABLE}?select=id&order=id.desc&limit=1`,{headers:SB_HDR});const rows=await r.json();return String(rows.length?rows[0].id+1:1).padStart(5,'0');}
  catch{return String(CAT.length?Math.max(...CAT.map(p=>p.dbId||0))+1:1).padStart(5,'0');}
}
async function setNextCode(){$('fCod').value=await fetchNextCode();}

let CAT=[],lp=null,vm_='g';
const ib={m:'',i:''};
const pf={m:null,i:null};
let ORDER=[],PEDIDOS=[],editingPedidoId=null;

let _tt=null;
function toast(msg,type='ok',dur=3500){const el=$('toast');el.textContent=msg;el.className='toast '+type+' show';if(_tt)clearTimeout(_tt);_tt=setTimeout(()=>el.classList.remove('show'),dur);}
function syncToast(msg,type){if(type==='loading')toast('⟳  '+msg,'info',60000);else if(type==='ok')toast('✓  '+msg,'ok');else toast('✕  '+msg,'err');}

async function loadDB(){
  syncToast('Cargando catálogo…','loading');
  try{CAT=await sbGet();await loadSales();syncToast(CAT.length+' perfumes cargados','ok');ubadge();umf();$('ce').value=CFG.costo_fijo||0;setNextCode();}
  catch(e){syncToast(e.message,'err');CAT=[];}
}
async function loadSales(){
  try{
    const agg={};
    for(let off=0;;off+=1000){
      const r=await fetch(`${SB_URL}/rest/v1/PedidosItems?select=perfume_id,qty&order=id.asc&limit=1000&offset=${off}`,{headers:SB_HDR});if(!r.ok)return;
      const rows=await r.json();rows.forEach(it=>{agg[it.perfume_id]=(agg[it.perfume_id]||0)+(it.qty||1);});
      if(rows.length<1000)break;
    }
    CAT.forEach(p=>p.sales=agg[p.dbId]||0);
  }catch(e){console.warn('Ventas:',e);}
}
async function loadPedidos(){
  try{PEDIDOS=await sbGetPedidos();renderPedidos();}catch(e){console.warn(e);}
}

function sv(id){
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('on'));
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('on'));
  $(id).classList.add('on');
  const idx={vc:0,vcat:1,vpd:2,vdash:3}[id]||0;
  document.querySelectorAll('.tab')[idx].classList.add('on');
  if(id==='vcat')rcat($('catq').value||'');
  if(id==='vpd'){const d=$('vFecha');if(!d.value)d.value=today();renderPedidos();}
  if(id==='vdash')renderDashboard();
}
function vm(m){vm_=m;$('vg').classList.toggle('on',m==='g');$('vl').classList.toggle('on',m==='l');rcat($('catq').value||'');}

const f=n=>Math.round(n).toLocaleString('es-AR');
const fd=n=>n.toLocaleString('es-AR',{minimumFractionDigits:0,maximumFractionDigits:1});
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const today=()=>{const d=new Date();return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
function roundPrice(v,roundTo){const t=+roundTo;return t>0?Math.ceil(v/t)*t:Math.round(v);}
function priceCalc({pc,aj,tam,ce,margin,disc5,disc10,roundTo}){
  const cml=(+pc||0)*((+aj)||1)/((+tam)||100),mg=+margin||0,extra=+ce||0;
  return[{ml:2.5,id:'25',d:0},{ml:5,id:'5',d:+disc5||0},{ml:10,id:'10',d:+disc10||0}].map(({ml,id,d})=>{
    const ct=cml*ml+extra,v=roundPrice((ct*(1+mg/100)/ml)*(1-d/100)*ml,roundTo);
    return{ml,id,d,ct,v,gan:v-ct,pml:v/ml};
  });
}
function usl(el){el.style.setProperty('--p',((+el.value-+el.min)/(+el.max-+el.min)*100)+'%');}
function onF(slot,inp){const file=inp.files[0];if(!file)return;const m=slot==='m';const th=$(m?'iT':'sT');th.src=URL.createObjectURL(file);th.style.display='block';$(m?'iI':'sI').style.display='none';$(m?'iH':'sH').textContent=file.name.slice(0,16);pf[slot]=file;}
function stk(v){$('fStk').value=v;$('pI').className='pill'+(v==='in'?' in':'');$('pO').className='pill'+(v==='out'?' out':'');}
function cov(id){$(id).classList.remove('on');}
document.querySelectorAll('.ov').forEach(ov=>ov.addEventListener('click',e=>{if(e.target===ov)ov.classList.remove('on');}));
