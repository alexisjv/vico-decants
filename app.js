const SB_URL=CONFIG.SB_URL;
const SB_KEY=CONFIG.SB_KEY;
const SB_HDR={'Content-Type':'application/json','apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY};

// STORAGE
const STO_PUB=`${SB_URL}/storage/v1/object/public/Imagenes`;
async function sbUploadImage(file,codigo='',slot=''){
  const ext=file.name.split('.').pop()||'png';
  const path=codigo?(codigo+(slot?'_'+slot:'')+'.'+ext):(Date.now()+'_'+Math.random().toString(36).slice(2)+'.'+ext);
  const STO_HDR={'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY};
  const up=await fetch(`${SB_URL}/storage/v1/object/Imagenes/${path}`,{method:'POST',headers:{...STO_HDR,'Content-Type':file.type||'image/png','x-upsert':'true'},body:file});
  if(!up.ok)throw new Error('Upload error: '+(await up.text()));
  return `${STO_PUB}/${path}`;
}
function initLogos(){
  const pub=name=>`${STO_PUB}/${name}`;
  LOGO=pub('vico.png');IG=pub('instagram.png');WA=pub('whatsapp.png');TT=pub('tiktok.png');
  const el=document.getElementById('login-logo');if(el)el.src=LOGO;
}
let LOGO='',IG='',WA='',TT='';
const TABLE='Perfumes';

// CONFIG
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
  await fetch(`${SB_URL}/rest/v1/Configuracion?descripcion=eq.${encodeURIComponent(desc)}`,{method:'PATCH',headers:{...SB_HDR,'Prefer':'return=representation'},body:JSON.stringify({valor:String(val),fecha_modificacion:now})});
  return now;
}
async function saveDriveId(fileId){
  CFG.drive_pdf_id=fileId;
  localStorage.setItem('vico_drive_pdf_id',fileId);
  // PATCH la fila existente drive_pdf_id en Supabase (cross-device)
  try{
    const r=await fetch(`${SB_URL}/rest/v1/Configuracion?descripcion=eq.drive_pdf_id`,{
      method:'PATCH',
      headers:{...SB_HDR,'Prefer':'return=minimal'},
      body:JSON.stringify({valor:fileId})
    });
    if(!r.ok)console.warn('Supabase drive_pdf_id PATCH falló:',r.status,await r.text());
  }catch(e){console.warn('drive_file_id no guardado en Supabase:',e);}
}

// LOGIN
async function doLogin(){
  const v=document.getElementById('lpwd').value;
  const e=document.getElementById('lerr');
  if(v===CONFIG.PASSWORD){
    document.getElementById('login-screen').style.display='none';
    document.getElementById('nav').style.display='flex';
    sv('vc'); loadDB(); loadPedidos(); e.style.display='none'; initGIS();
  }else{
    e.style.display='block';
    document.getElementById('lpwd').style.borderColor='var(--red)';
    setTimeout(()=>document.getElementById('lpwd').style.borderColor='',1800);
  }
}
document.getElementById('lpwd').addEventListener('keydown',e=>{if(e.key==='Enter')doLogin();});

// SUPABASE
async function sbGet(){
  const r=await fetch(`${SB_URL}/rest/v1/${TABLE}?select=*&order=id.asc`,{headers:SB_HDR});
  if(!r.ok)throw new Error(await r.text());
  return(await r.json()).map(row=>({
    key:String(row.id),dbId:row.id,tipo:row.type||'',marca:row.brand||'',nombre:row.name||'',
    img:row.img||'',inspo:row.img_insp||'',link:row.info||'',stock:row.stock===false?'out':'in',
    p25:row.p25||0,p5:row.p5||0,p10:row.p10||0,pl:row.pl||0,pc:row.pc||0,tam:row.size||100,
    ce:row.extra_cost!=null?row.extra_cost:0,margin:row.margin!=null?row.margin:60,
    disc5:row.disc5!=null?row.disc5:10,disc10:row.disc10!=null?row.disc10:20,
    roundTo:row.round_to!=null?String(row.round_to):null,sales:row.sales||0,
  }));
}
async function sbUpsert(p){
  const row={type:p.tipo||'',brand:p.marca||'',name:p.nombre||'',img:p.img||'',img_insp:p.inspo||'',info:p.link||'',stock:p.stock!=='out',size:p.tam||100,margin:p.margin,disc5:p.disc5,disc10:p.disc10,round_to:p.roundTo!=null?parseInt(p.roundTo):null,extra_cost:p.ce||0,pl:p.pl||0,pc:p.pc||0,p25:p.p25||0,p5:p.p5||0,p10:p.p10||0};
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
    if(!ri.ok)throw new Error(await ri.text());
  }
  return pid;
}
async function sbUpdatePedido(id,pedido,items){
  await fetch(`${SB_URL}/rest/v1/Pedidos?id=eq.${id}`,{method:'PATCH',headers:SB_HDR,body:JSON.stringify(pedido)});
  await fetch(`${SB_URL}/rest/v1/PedidosItems?pedido_id=eq.${id}`,{method:'DELETE',headers:SB_HDR});
  if(items.length)await fetch(`${SB_URL}/rest/v1/PedidosItems`,{method:'POST',headers:{...SB_HDR,'Prefer':'return=representation'},body:JSON.stringify(items.map(i=>({...i,pedido_id:id})))});
}
async function sbDeletePedido(id){
  await fetch(`${SB_URL}/rest/v1/PedidosItems?pedido_id=eq.${id}`,{method:'DELETE',headers:SB_HDR});
  await fetch(`${SB_URL}/rest/v1/Pedidos?id=eq.${id}`,{method:'DELETE',headers:SB_HDR});
}
async function sbGetPedidos(){
  const r=await fetch(`${SB_URL}/rest/v1/Pedidos?select=*&order=id.desc`,{headers:SB_HDR});
  if(!r.ok)throw new Error(await r.text());return await r.json();
}
async function sbUpdateEstado(id,estado){
  await fetch(`${SB_URL}/rest/v1/Pedidos?id=eq.${id}`,{method:'PATCH',headers:SB_HDR,body:JSON.stringify({estado})});
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
async function setNextCode(){document.getElementById('fCod').value=await fetchNextCode();}

// STATE
let CAT=[],lp=null,vm_='g';
const ib={m:'',i:''};
const pf={m:null,i:null};
let ORDER=[],PEDIDOS=[],editingPedidoId=null;

// TOAST
let _tt=null;
function toast(msg,type='ok',dur=3500){const el=document.getElementById('toast');el.textContent=msg;el.className='toast '+type+' show';if(_tt)clearTimeout(_tt);_tt=setTimeout(()=>el.classList.remove('show'),dur);}
function syncToast(msg,type){if(type==='loading')toast('⟳  '+msg,'info',60000);else if(type==='ok')toast('✓  '+msg,'ok');else toast('✕  '+msg,'err');}

async function loadDB(){
  syncToast('Cargando catálogo…','loading');
  try{CAT=await sbGet();syncToast(CAT.length+' perfumes cargados','ok');ubadge();umf();document.getElementById('ce').value=CFG.costo_fijo||0;setNextCode();}
  catch(e){syncToast(e.message,'err');CAT=[];}
}
async function loadPedidos(){
  try{PEDIDOS=await sbGetPedidos();renderPedidos();}catch(e){console.warn(e);}
}

// VIEW
function sv(id){
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('on'));
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('on'));
  document.getElementById(id).classList.add('on');
  const idx={vc:0,vcat:1,vpd:2,vdash:3}[id]||0;
  document.querySelectorAll('.tab')[idx].classList.add('on');
  if(id==='vcat')rcat(document.getElementById('catq').value||'');
  if(id==='vpd'){const d=document.getElementById('vFecha');if(!d.value)d.value=new Date().toISOString().slice(0,10);renderPedidos();}
  if(id==='vdash')renderDashboard();
}
function vm(m){vm_=m;document.getElementById('vg').classList.toggle('on',m==='g');document.getElementById('vl').classList.toggle('on',m==='l');rcat(document.getElementById('catq').value||'');}

// HELPERS
const f=n=>Math.round(n).toLocaleString('es-AR');
const fd=n=>n.toLocaleString('es-AR',{minimumFractionDigits:0,maximumFractionDigits:1});
function rp(v){if(!document.getElementById('rnd').checked)return v;const t=+document.getElementById('rto').value;return Math.ceil(v/t)*t;}
function usl(el){el.style.setProperty('--p',((+el.value-+el.min)/(+el.max-+el.min)*100)+'%');}
function onF(slot,inp){const file=inp.files[0];if(!file)return;const m=slot==='m';const th=document.getElementById(m?'iT':'sT');th.src=URL.createObjectURL(file);th.style.display='block';document.getElementById(m?'iI':'sI').style.display='none';document.getElementById(m?'iH':'sH').textContent=file.name.slice(0,16);pf[slot]=file;}
function stk(v){document.getElementById('fStk').value=v;document.getElementById('pI').className='pill'+(v==='in'?' in':'');document.getElementById('pO').className='pill'+(v==='out'?' out':'');}
function cov(id){document.getElementById(id).classList.remove('on');}
document.querySelectorAll('.ov').forEach(ov=>ov.addEventListener('click',e=>{if(e.target===ov)ov.classList.remove('on');}));

// CALC
function calc(){
  const pl=+document.getElementById('pL').value||0,tam=+document.getElementById('tam').value||100,pc=+document.getElementById('pC').value||0,ce=+document.getElementById('ce').value||0,mg=+document.getElementById('mg').value||60,d5=+document.getElementById('d5').value||0,d10=+document.getElementById('d10').value||0;
  ['mg','d5','d10'].forEach(id=>usl(document.getElementById(id)));
  document.getElementById('mgV').textContent=mg+'%';document.getElementById('d5V').textContent=d5?'−'+d5+'%':'0%';document.getElementById('d10V').textContent=d10?'−'+d10+'%':'0%';
  if(!pc){rst();return;}
  const cml=pc/tam;
  const dat=[{ml:2.5,id:'25',d:0},{ml:5,id:'5',d:d5},{ml:10,id:'10',d:d10}].map(({ml,id,d})=>{const ct=cml*ml+ce,v=rp((ct*(1+mg/100)/ml)*(1-d/100)*ml);return{ml,id,d,ct,v,gan:v-ct,pml:v/ml};});
  lp={p25:dat[0].v,p5:dat[1].v,p10:dat[2].v};
  dat.forEach((x,i)=>{const card=document.getElementById('rc'+x.id);card.classList.add('on');card.classList.toggle('best',i===2);document.getElementById('p'+x.id).textContent=f(x.v);document.getElementById('c'+x.id).textContent='$'+f(x.ct);document.getElementById('g'+x.id).textContent='$'+f(x.gan);document.getElementById('m'+x.id).textContent='$'+fd(x.pml)+'/ml';});
  let h=`<table class="rt"><thead><tr><th>Concepto</th><th>2.5ml</th><th>5ml</th><th>10ml</th></tr></thead><tbody>`;
  h+=`<tr><td>Costo total</td>${dat.map(x=>`<td>$${f(x.ct)}</td>`).join('')}</tr>`;
  h+=`<tr class="tot"><td>Precio de venta</td>${dat.map(x=>`<td>$${f(x.v)}</td>`).join('')}</tr>`;
  if(pl>0){h+=`<tr class="chk"><td>Total al vender ${tam}ml</td>${dat.map(x=>`<td>$${f(x.v*(tam/x.ml))}</td>`).join('')}</tr>`;h+=`<tr class="chks"><td>vs lista ($${f(pl)})</td>${dat.map(x=>{const t=x.v*(tam/x.ml),pct=(t/pl*100).toFixed(0),c=t>pl*1.5?'color:#d48a8a':t>pl*1.1?'color:rgba(184,147,90,.7)':'color:#7ab896';return`<td style="${c}">${pct}%</td>`;}).join('')}</tr>`;}
  h+=`</tbody></table><div class="stag">Compra: <strong>$${f(pc)}</strong> · Costo/ml: <strong>$${fd(cml)}</strong> · Margen: <strong>${mg}%</strong></div>`;
  document.getElementById('det').innerHTML=h;
  const b=document.getElementById('bsv');b.classList.add('ok');b.textContent='Guardar en catálogo →';
}
function rst(){lp=null;['25','5','10'].forEach(id=>{['p','c','g','m'].forEach(p=>{const el=document.getElementById(p+id);if(el)el.textContent='—';});document.getElementById('rc'+id).classList.remove('on','best');});document.getElementById('det').innerHTML='<div class="ei">Ingresá los datos para ver el resumen.</div>';document.getElementById('bsv').classList.remove('ok');document.getElementById('bsv').textContent='Guardar en catálogo';}
function rfm(){
  ['fMarca','fNom','fLink'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('fDbId').value='';document.getElementById('fTipo').value='';stk('in');ib.m='';ib.i='';pf.m=null;pf.i=null;
  ['iT','sT'].forEach(id=>{const e=document.getElementById(id);e.style.display='none';e.src='';});
  ['iI','sI'].forEach(id=>document.getElementById(id).style.display='');
  ['iH','sH'].forEach(id=>document.getElementById(id).textContent='Subir foto');
  document.getElementById('fIF').value='';document.getElementById('fIS').value='';
  ['pL','pC'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('ce').value=CFG.costo_fijo||0;document.getElementById('tam').value='100';
  document.getElementById('mg').value='60';document.getElementById('d5').value='10';document.getElementById('d10').value='20';
  document.getElementById('rnd').checked=false;
  ['mg','d5','d10'].forEach(id=>usl(document.getElementById(id)));
  document.getElementById('mgV').textContent='60%';document.getElementById('d5V').textContent='−10%';document.getElementById('d10V').textContent='−20%';
  rst();setNextCode();
}
async function save(){
  if(!lp)return;
  const n=document.getElementById('fNom').value.trim();
  if(!n){const e=document.getElementById('fNom');e.style.borderColor='var(--red)';e.focus();setTimeout(()=>e.style.borderColor='',1800);return;}
  const rawDbId=document.getElementById('fDbId').value;
  const rawCod=document.getElementById('fCod').value;
  const resolvedId=rawDbId?parseInt(rawDbId):(rawCod?parseInt(rawCod):null);
  const p={dbId:resolvedId,tipo:document.getElementById('fTipo').value,marca:document.getElementById('fMarca').value.trim(),nombre:n,img:ib.m,inspo:ib.i,link:document.getElementById('fLink').value.trim(),stock:document.getElementById('fStk').value,p25:lp.p25,p5:lp.p5,p10:lp.p10,pl:+document.getElementById('pL').value||0,pc:+document.getElementById('pC').value||0,tam:+document.getElementById('tam').value||100,ce:+document.getElementById('ce').value||0,margin:+document.getElementById('mg').value||60,disc5:+document.getElementById('d5').value||0,disc10:+document.getElementById('d10').value||0,roundTo:document.getElementById('rnd').checked?document.getElementById('rto').value:null};
  const b=document.getElementById('bsv');b.textContent='Guardando…';b.style.opacity='.5';b.style.pointerEvents='none';
  syncToast('Guardando…','loading');
  try{
    const cod=document.getElementById('fCod').value||'';
    if(pf.m){p.img=await sbUploadImage(pf.m,cod,'m');ib.m=p.img;}
    if(pf.i){p.inspo=await sbUploadImage(pf.i,cod,'i');ib.i=p.inspo;}
    const saved=await sbUpsert(p);p.dbId=saved.id;p.key=String(saved.id);
    const idx=CAT.findIndex(x=>x.dbId===p.dbId);if(idx>=0)CAT[idx]=p;else CAT.push(p);
    ubadge();umf();syncToast(idx>=0?'Actualizado':'Guardado','ok');
    b.textContent='✓ Guardado';b.style.background='var(--grn)';b.style.opacity='1';
    setTimeout(()=>{b.style.background='';b.style.pointerEvents='';rfm();},1300);
  }catch(e){syncToast(e.message,'err');b.textContent='Error';b.style.background='var(--red)';b.style.opacity='1';setTimeout(()=>{b.style.background='';b.style.pointerEvents='';b.classList.add('ok');b.textContent='Guardar →';},2500);}
}
function ltc(key){
  const p=CAT.find(x=>x.key===key);if(!p)return;
  document.getElementById('fDbId').value=p.dbId||'';document.getElementById('fCod').value=String(p.dbId||'').padStart(5,'0');
  document.getElementById('fMarca').value=p.marca||'';document.getElementById('fNom').value=p.nombre||'';
  document.getElementById('fTipo').value=p.tipo||'';document.getElementById('fLink').value=p.link||'';stk(p.stock||'in');
  if(p.pl)document.getElementById('pL').value=p.pl;if(p.pc)document.getElementById('pC').value=p.pc;
  document.getElementById('tam').value=p.tam||100;document.getElementById('ce').value=p.ce!=null?p.ce:0;
  document.getElementById('mg').value=p.margin||60;document.getElementById('d5').value=p.disc5!=null?p.disc5:10;document.getElementById('d10').value=p.disc10!=null?p.disc10:20;
  if(p.roundTo!=null){document.getElementById('rnd').checked=true;document.getElementById('rto').value=p.roundTo;}else document.getElementById('rnd').checked=false;
  ['mg','d5','d10'].forEach(id=>usl(document.getElementById(id)));
  ib.m=p.img||'';ib.i=p.inspo||'';
  [{t:'iT',i:'iI',h:'iH',src:p.img},{t:'sT',i:'sI',h:'sH',src:p.inspo}].forEach(({t,i,h,src})=>{const th=document.getElementById(t);if(src){th.src=src;th.style.display='block';document.getElementById(i).style.display='none';document.getElementById(h).textContent='Imagen cargada';}else{th.style.display='none';document.getElementById(i).style.display='';document.getElementById(h).textContent='Subir foto';}});
  calc();sv('vc');window.scrollTo({top:0,behavior:'smooth'});
  document.getElementById('bsv').textContent='Actualizar en catálogo →';
}

// CATALOG
function ubadge(){const n=CAT.length,e=document.getElementById('cn');e.textContent=n||'';e.style.display=n?'inline-flex':'none';}
function umf(){const sel=document.getElementById('fm'),cur=sel.value;const ms=[...new Set(CAT.map(p=>p.marca||'').filter(Boolean))].sort();sel.innerHTML='<option value="">Todas las marcas</option>'+ms.map(m=>`<option value="${m}"${m===cur?' selected':''}>${m}</option>`).join('');}
function sortFx(arr,ord){const a=[...arr];if(ord==='name')return a.sort((x,y)=>(x.nombre||'').localeCompare(y.nombre||'','es'));if(ord==='price-asc')return a.sort((x,y)=>x.p25-y.p25);if(ord==='price-desc')return a.sort((x,y)=>y.p25-x.p25);if(ord==='sales')return a.sort((x,y)=>(y.sales||0)-(x.sales||0));return a;}
function rcat(q=''){
  const sf=document.getElementById('fs').value,mf=document.getElementById('fm').value,tf=document.getElementById('ft').value,ord=document.getElementById('fo').value,ql=q.toLowerCase();
  let fx=CAT;
  if(sf)fx=fx.filter(p=>p.stock===sf);if(mf)fx=fx.filter(p=>(p.marca||'')===mf);if(tf)fx=fx.filter(p=>(p.tipo||'')===tf);
  if(ql)fx=fx.filter(p=>(p.nombre+p.marca+(p.tipo||'')).toLowerCase().includes(ql));
  fx=sortFx(fx,ord);
  document.getElementById('csub').textContent=CAT.length+' perfume'+(CAT.length!==1?'s':'')+(fx.length!==CAT.length?` · ${fx.length} visibles`:'');
  const cc=document.getElementById('cc');cc.className=vm_==='g'?'cgrid':'clist';
  if(!fx.length){cc.innerHTML=`<div class="cempty">${!CAT.length?'Sin perfumes.':'Sin resultados.'}</div>`;return;}
  const mob=window.innerWidth<640;
  if(vm_==='g'){
    cc.innerHTML=fx.map((p,i)=>`
<div class="card" style="animation-delay:${Math.min(i*.04,.5)}s">
  <div class="cimg${p.stock==='out'?' out-img':''}">
    ${p.img?`<img class="mi" src="${p.img}">`:''}<div class="ph"${p.img?' style="display:none"':''}>◈</div>
    ${p.inspo?`<div class="ipip"><img src="${p.inspo}"></div>`:''}
  </div>
  <div class="cbody">
    <div class="cd-row1"><span class="cd-name">${p.nombre}</span><div class="cd-dot ${p.stock}"></div></div>
    <div class="cd-row2">${p.tipo?`<span class="ctipo">${p.tipo}</span>`:''}${p.marca?`<span class="cbrand">${p.marca}</span>`:''}</div>
    <div class="cprices">
      <div class="cp"><div class="cp-l">2.5ml</div><div class="cp-v">$${f(p.p25)}</div></div>
      <div class="cp"><div class="cp-l">5ml</div><div class="cp-v">$${f(p.p5)}</div></div>
      <div class="cp"><div class="cp-l">10ml</div><div class="cp-v">$${f(p.p10)}</div></div>
    </div>
  </div>
  <div class="cacts"><button class="ba" onclick="ltc('${p.key}')">Editar</button><button class="ba del" onclick="cdel('${p.key}','${p.nombre.replace(/'/g,"\\'")}')">Eliminar</button></div>
</div>`).join('');
  } else if(mob){
    cc.innerHTML=fx.map((p,i)=>`
<div class="mob-card" style="animation-delay:${Math.min(i*.025,.35)}s">
  <div class="mob-thumb-wrap">
    ${p.img?`<img class="${p.stock==='out'?'out-th':''}" src="${p.img}" style="width:58px;height:58px;object-fit:contain;padding:4px">`:`<div style="opacity:.15;font-size:1.1rem">◈</div>`}
  </div>
  <div class="mob-content">
    <div class="mob-r1"><span class="mob-name">${p.nombre}</span><span class="mob-cod2">#${String(p.dbId||'').padStart(5,'0')}</span><div class="mob-dot ${p.stock}"></div></div>
    <div class="mob-r2">${p.tipo?`<span class="ctipo">${p.tipo}</span>`:''}${p.marca?`<span class="cbrand">${p.marca}</span>`:''}</div>
    <div class="mob-r3">
      <div class="mob-prices-row">
        <div class="mob-pr"><span class="mob-prl">2.5ml</span><span class="mob-prv">$${f(p.p25)}</span></div>
        <div class="mob-pr"><span class="mob-prl">5ml</span><span class="mob-prv">$${f(p.p5)}</span></div>
        <div class="mob-pr"><span class="mob-prl">10ml</span><span class="mob-prv">$${f(p.p10)}</span></div>
      </div>
      <div class="mob-acts-row"><button class="mob-bi" onclick="ltc('${p.key}')">✎</button><button class="mob-bi del" onclick="cdel('${p.key}','${p.nombre.replace(/'/g,"\\'")}')">✕</button></div>
    </div>
  </div>
</div>`).join('');
  } else {
    cc.innerHTML=`<div class="lh"><div class="lc"></div><div class="lc">Nombre</div><div class="lc">Cód.</div><div class="lc">Tipo</div><div class="lc">Marca</div><div class="lc"></div><div class="lc" style="text-align:right">2.5ml</div><div class="lc" style="text-align:right">5ml</div><div class="lc" style="text-align:right">10ml</div><div class="lc" style="text-align:center">Acciones</div></div>`+fx.map((p,i)=>`
<div class="lr" style="animation-delay:${Math.min(i*.025,.35)}s">
  <div class="lc">${p.img?`<img class="lr-th${p.stock==='out'?' out-th':''}" src="${p.img}">`:`<div class="lr-ph">◈</div>`}</div>
  <div class="lc"><div class="lr-n">${p.nombre}</div></div>
  <div class="lc"><span class="lr-sm">#${String(p.dbId||'').padStart(5,'0')}</span></div>
  <div class="lc">${p.tipo?`<span class="ctipo" style="font-size:.53rem">${p.tipo}</span>`:''}</div>
  <div class="lc"><span class="lr-sm">${p.marca||'—'}</span></div>
  <div class="lc"><div class="cd-dot ${p.stock}" style="margin:auto"></div></div>
  <div class="lc"><span class="lr-p">$${f(p.p25)}</span></div>
  <div class="lc"><span class="lr-p">$${f(p.p5)}</span></div>
  <div class="lc"><span class="lr-p">$${f(p.p10)}</span></div>
  <div class="lc"><div class="lr-acts"><button class="bi" onclick="ltc('${p.key}')">✎ Editar</button><button class="bi del" onclick="cdel('${p.key}','${p.nombre.replace(/'/g,"\\'")}')">✕</button></div></div>
</div>`).join('');
  }
}
let _dk=null;
function cdel(k,n){_dk=k;document.getElementById('dm').textContent=`¿Eliminar "${n}"?`;document.getElementById('ovD').classList.add('on');}
document.getElementById('bdk').onclick=async()=>{
  if(!_dk)return;syncToast('Eliminando…','loading');
  try{const p=CAT.find(x=>x.key===_dk);await sbDeletePerf(p?p.dbId:_dk);CAT=CAT.filter(x=>x.key!==_dk);_dk=null;ubadge();umf();cov('ovD');rcat(document.getElementById('catq').value||'');syncToast('Eliminado','ok');}
  catch(e){syncToast(e.message,'err');}
};

// INFLACION
function fmtDate(iso){if(!iso)return'—';try{return new Date(iso).toLocaleDateString('es-AR',{day:'2-digit',month:'short',year:'numeric'});}catch{return iso;}}
function openInflModal(){
  document.getElementById('inflVal').value=CFG.inflacion||'';
  document.getElementById('cfVal').value=CFG.costo_fijo||'';
  document.getElementById('inflChips').innerHTML=[
    {l:'Última inflación',v:CFG.inflacion!=null?CFG.inflacion+'%':'—'},
    {l:'Costo fijo actual',v:CFG.costo_fijo!=null?'$'+f(CFG.costo_fijo):'—'},
    {l:'Perfumes',v:String(CAT.length)},
  ].map(({l,v})=>`<div class="infl-chip"><div class="infl-chip-lbl">${l}</div><div class="infl-chip-val">${v}</div></div>`).join('');
  document.getElementById('ovInfl').classList.add('on');
}
async function applyInflacion(){
  const pct=parseFloat(document.getElementById('inflVal').value);
  const cf=parseFloat(document.getElementById('cfVal').value)||0;
  if(isNaN(pct)){toast('Ingresá un % válido','err');return;}
  cov('ovInfl');
  document.getElementById('pl').classList.add('on');document.getElementById('plMsg').textContent='Actualizando precios…';
  const mult=1+pct/100;
  syncToast('Aplicando '+pct+'%…','loading');
  try{
    for(const p of CAT){
      await fetch(`${SB_URL}/rest/v1/${TABLE}?id=eq.${p.dbId}`,{method:'PATCH',headers:SB_HDR,body:JSON.stringify({p25:Math.round(p.p25*mult),p5:Math.round(p.p5*mult),p10:Math.round(p.p10*mult),extra_cost:cf})});
    }
    const now1=await saveConfigVal('inflacion',pct);const now2=await saveConfigVal('costo_fijo',cf);
    CFG.inflacion=pct;CFG.infl_fecha=now1;CFG.costo_fijo=cf;CFG.cf_fecha=now2;
    CAT=await sbGet();ubadge();umf();rcat(document.getElementById('catq').value||'');
    document.getElementById('ce').value=cf;
    syncToast('Precios actualizados — '+CAT.length+' perfumes','ok');
  }catch(e){syncToast(e.message,'err');}
  finally{document.getElementById('pl').classList.remove('on');document.getElementById('plMsg').textContent='Generando PDF…';}
}

// PEDIDO helpers
function priceFor(p,ml){if(ml===2.5)return p.p25||0;if(ml===5)return p.p5||0;if(ml===10)return p.p10||0;return 0;}
function costFor(p,ml){if(!p.pc||!p.tam)return 0;return(p.pc/p.tam)*ml+(p.ce||0);}

function pdSearch(q){
  const drop=document.getElementById('pddrop');
  if(!q.trim()){drop.classList.remove('on');drop.innerHTML='';return;}
  const res=CAT.filter(p=>p.stock==='in'&&(p.nombre+p.marca).toLowerCase().includes(q.toLowerCase())).slice(0,8);
  if(!res.length){drop.innerHTML='<div class="pdopt" style="cursor:default;opacity:.45;font-size:.74rem">Sin resultados en stock</div>';drop.classList.add('on');return;}
  drop.innerHTML=res.map(p=>`<div class="pdopt" onclick="pdAdd('${p.key}')">
    ${p.img?`<img class="pdopt-img" src="${p.img}">`:`<div class="pdopt-noph">◈</div>`}
    <div class="pdopt-info"><div class="pdopt-name">${p.nombre}</div><div class="pdopt-sub">${[p.marca,p.tipo].filter(Boolean).join(' · ')}</div></div>
    <div class="pdopt-price">$${f(p.p25)}</div>
  </div>`).join('');
  drop.classList.add('on');
}
function pdAdd(key){
  const p=CAT.find(x=>x.key===key);if(!p)return;
  document.getElementById('pddrop').classList.remove('on');document.getElementById('pdq').value='';
  const ex=ORDER.find(o=>o.perf.key===key);
  if(ex)ex.sizes.push({ml:2.5,qty:1});else ORDER.push({perf:p,sizes:[{ml:2.5,qty:1}]});
  renderOrder();
}
function renderOrder(){
  const el=document.getElementById('olist');
  if(!ORDER.length){el.innerHTML='<div class="oi-empty">Ningún perfume agregado.</div>';updOrd();return;}
  el.innerHTML=ORDER.map((o,oi)=>`
<div class="oi">
  <div class="oi-img">
    ${o.perf.img?`<img src="${o.perf.img}">`:`<div class="oi-noph">◈</div>`}
  </div>
  <div class="oi-body">
    <div class="oi-top">
      <span class="oi-name">${o.perf.nombre}</span>
      <span class="oi-brand">${o.perf.marca||''}</span>
    </div>
    <div class="oi-rows">
      ${o.sizes.map((s,si)=>`<div class="oi-sz-row">
        <select class="oi-sz-sel" onchange="chSz(${oi},${si},this.value)">
          <option value="2.5"${s.ml===2.5?' selected':''}>2.5 ml</option>
          <option value="5"${s.ml===5?' selected':''}>5 ml</option>
          <option value="10"${s.ml===10?' selected':''}>10 ml</option>
        </select>
        <span style="font-size:.68rem;color:var(--fog)">×</span>
        <input type="number" class="oi-sz-qty" min="1" value="${s.qty}" onchange="chQty(${oi},${si},this.value)">
        <span class="oi-sz-price">$${f(priceFor(o.perf,s.ml)*s.qty)}</span>
        <button class="oi-sz-rm" onclick="rmSz(${oi},${si})">✕</button>
      </div>`).join('')}
      <button class="oi-add-sz" onclick="addSz(${oi})">＋ tamaño</button>
    </div>
  </div>
  <button class="oi-rm" onclick="rmOi(${oi})">✕</button>
</div>`).join('');
  updOrd();
}
function chSz(oi,si,v){ORDER[oi].sizes[si].ml=parseFloat(v);renderOrder();}
function chQty(oi,si,v){ORDER[oi].sizes[si].qty=Math.max(1,parseInt(v)||1);updOrd();}
function addSz(oi){ORDER[oi].sizes.push({ml:2.5,qty:1});renderOrder();}
function rmSz(oi,si){ORDER[oi].sizes.splice(si,1);if(!ORDER[oi].sizes.length)ORDER.splice(oi,1);renderOrder();}
function rmOi(oi){ORDER.splice(oi,1);renderOrder();}
function updOrd(){
  let tCost=0,tSale=0;
  ORDER.forEach(o=>o.sizes.forEach(s=>{tCost+=costFor(o.perf,s.ml)*s.qty;tSale+=priceFor(o.perf,s.ml)*s.qty;}));
  const units=ORDER.reduce((a,o)=>a+o.sizes.reduce((b,s)=>b+s.qty,0),0);
  const el=document.getElementById('psum');
  if(!ORDER.length){el.innerHTML='<div class="sum-empty">Agregá perfumes para ver el resumen.</div>';}
  else{
    let rows='';ORDER.forEach(o=>o.sizes.forEach(s=>{rows+=`<div class="sum-row"><span>${o.perf.nombre} · ${s.ml}ml × ${s.qty}</span><span>$${f(priceFor(o.perf,s.ml)*s.qty)}</span></div>`;}));
    const gan=tSale-tCost;
    el.innerHTML=rows+`<div class="sum-row tot"><span>${units} decant${units!==1?'s':''}</span><span>$${f(tSale)}</span></div><div class="sum-row gan"><span>Ganancia estimada</span><span>$${f(gan)} (${tCost>0?(gan/tCost*100).toFixed(0):0}%)</span></div>`;
  }
  const pbn=document.getElementById('pbn');
  if(units>0){pbn.textContent=units;pbn.style.display='inline-flex';}else pbn.style.display='none';
  document.getElementById('bordSv').classList.toggle('ok',ORDER.length>0);
}

function resetPedidoForm(){
  ORDER=[];renderOrder();
  ['vNom','vTel','vEmail','vDir','vNota'].forEach(x=>document.getElementById(x).value='');
  document.getElementById('vFecha').value=new Date().toISOString().slice(0,10);
  editingPedidoId=null;
  const btn=document.getElementById('bordSv');btn.textContent='Guardar pedido';btn.style.background='';btn.style.color='';
  document.getElementById('bordCancel').style.display='none';
  renderPedidos();
}
function cancelEdit(){resetPedidoForm();}

async function savePedido(){
  if(!ORDER.length)return;
  let tCost=0,tSale=0;
  ORDER.forEach(o=>o.sizes.forEach(s=>{tCost+=costFor(o.perf,s.ml)*s.qty;tSale+=priceFor(o.perf,s.ml)*s.qty;}));
  const pedData={fecha:document.getElementById('vFecha').value||new Date().toISOString().slice(0,10),cliente_nombre:document.getElementById('vNom').value.trim(),cliente_tel:document.getElementById('vTel').value.trim(),cliente_email:document.getElementById('vEmail').value.trim(),cliente_dir:document.getElementById('vDir').value.trim(),notas:document.getElementById('vNota').value.trim(),total_costo:Math.round(tCost),total_venta:Math.round(tSale),estado:'pendiente'};
  const items=[];ORDER.forEach(o=>o.sizes.forEach(s=>{items.push({perfume_id:o.perf.dbId,perfume_nombre:o.perf.nombre,ml:s.ml,qty:s.qty,precio_unit:priceFor(o.perf,s.ml),costo_unit:Math.round(costFor(o.perf,s.ml))});}));
  const btn=document.getElementById('bordSv');btn.textContent='Guardando…';btn.classList.remove('ok');
  syncToast('Guardando pedido…','loading');
  try{
    if(editingPedidoId){
      await sbUpdatePedido(editingPedidoId,pedData,items);
      const idx=PEDIDOS.findIndex(x=>x.id===editingPedidoId);
      if(idx>=0)PEDIDOS[idx]={...PEDIDOS[idx],...pedData};
      syncToast('Pedido actualizado','ok');
    }else{
      const id=await sbSavePedido({pedido:pedData,items});
      syncToast('Pedido #'+String(id).padStart(5,'0')+' guardado','ok');
      PEDIDOS=await sbGetPedidos();
    }
    resetPedidoForm();
  }catch(e){
    syncToast(e.message,'err');btn.textContent='Error al guardar';btn.style.background='var(--red)';btn.style.color='#fff';
    setTimeout(()=>{btn.style.background='';btn.style.color='';btn.classList.add('ok');btn.textContent=editingPedidoId?'Actualizar pedido':'Guardar pedido';},2500);
  }
}

async function startEditPedido(ped,ev){
  ev.stopPropagation();
  editingPedidoId=ped.id;
  document.getElementById('vNom').value=ped.cliente_nombre||'';
  document.getElementById('vTel').value=ped.cliente_tel||'';
  document.getElementById('vEmail').value=ped.cliente_email||'';
  document.getElementById('vDir').value=ped.cliente_dir||'';
  document.getElementById('vNota').value=ped.notas||'';
  document.getElementById('vFecha').value=ped.fecha||new Date().toISOString().slice(0,10);
  ORDER=[];
  syncToast('Cargando items…','loading');
  try{
    const items=await sbGetPedidoItems(ped.id);
    for(const it of items){
      const p=CAT.find(x=>x.dbId===it.perfume_id)||{key:String(it.perfume_id),dbId:it.perfume_id,nombre:it.perfume_nombre||'?',marca:'',img:'',p25:it.ml===2.5?it.precio_unit:0,p5:it.ml===5?it.precio_unit:0,p10:it.ml===10?it.precio_unit:0,pc:0,tam:100,ce:0};
      const ex=ORDER.find(o=>o.perf.dbId===it.perfume_id);
      if(ex)ex.sizes.push({ml:it.ml,qty:it.qty});
      else ORDER.push({perf:p,sizes:[{ml:it.ml,qty:it.qty}]});
    }
    syncToast('Editando #'+String(ped.id).padStart(5,'0'),'info',3500);
  }catch(e){syncToast('Error al cargar items','err');}
  renderOrder();
  const btn=document.getElementById('bordSv');btn.classList.add('ok');btn.textContent='Actualizar pedido →';
  document.getElementById('bordCancel').style.display='block';
  renderPedidos();
  if(!document.getElementById('vpd').classList.contains('on'))sv('vpd');
  setTimeout(()=>{document.querySelector('.pd-items-col').scrollTop=0;},120);
}

let _delPedId=null;
function deletePedido(id,ev){
  ev.stopPropagation();_delPedId=id;
  document.getElementById('dmP').textContent=`¿Eliminar pedido #${String(id).padStart(5,'0')}?`;
  document.getElementById('ovDP').classList.add('on');
}
document.getElementById('bdkP').onclick=async()=>{
  if(!_delPedId)return;syncToast('Eliminando pedido…','loading');
  try{
    await sbDeletePedido(_delPedId);PEDIDOS=PEDIDOS.filter(p=>p.id!==_delPedId);
    if(editingPedidoId===_delPedId)resetPedidoForm();
    _delPedId=null;cov('ovDP');renderPedidos();syncToast('Pedido eliminado','ok');
  }catch(e){syncToast(e.message,'err');}
};

async function toggleEstado(id,current,ev){
  ev.stopPropagation();
  const nuevo=current==='pendiente'?'terminado':'pendiente';
  try{await sbUpdateEstado(id,nuevo);const p=PEDIDOS.find(x=>x.id===id);if(p)p.estado=nuevo;renderPedidos();}
  catch(e){syncToast(e.message,'err');}
}

function renderPedidos(){
  const filt=document.getElementById('plEst').value;
  let list=PEDIDOS;if(filt)list=list.filter(p=>p.estado===filt);
  const pending=PEDIDOS.filter(p=>p.estado==='pendiente').length;
  const pbn=document.getElementById('pbn');pbn.textContent=pending||'';pbn.style.display=pending?'inline-flex':'none';
  const el=document.getElementById('pedGrid');
  if(!list.length){el.innerHTML='<div class="ped-empty">'+(!PEDIDOS.length?'Aún no hay pedidos.':'Sin pedidos para este filtro.')+'</div>';return;}
  el.innerHTML=list.map(p=>{
    const gan=(p.total_venta||0)-(p.total_costo||0);
    const fecha=p.fecha?new Date(p.fecha+'T00:00:00').toLocaleDateString('es-AR',{day:'2-digit',month:'short'}):'';
    const isEditing=editingPedidoId===p.id;
    const pedJSON=JSON.stringify(p).replace(/"/g,'&quot;');
    const est=p.estado||'pendiente';
    const estIcon=est==='terminado'?'✓ Listo':'◌ Pendiente';
    return`<div class="ped-card${isEditing?' editing':''}">
  <div class="ped-head">
    <span class="ped-id">#${String(p.id).padStart(5,'0')}</span>
    <span class="ped-client">${p.cliente_nombre||'Sin nombre'}</span>
    <button class="est-pill ${est}" onclick="toggleEstado(${p.id},'${est}',event)">${estIcon}</button>
  </div>
  ${(p.cliente_tel||fecha)?`<div class="ped-meta">${[p.cliente_tel,fecha].filter(Boolean).join(' · ')}</div>`:''}
  ${p.notas?`<div class="ped-nota">${p.notas}</div>`:''}
  <div class="ped-foot">
    <div class="ped-pricing">
      <span class="ped-total">$${f(p.total_venta||0)}</span>
      ${gan>0?`<span class="ped-gan">+$${f(gan)} gan.</span>`:''}
    </div>
    <div class="ped-acts-row">
      <button class="ped-btn" onclick="startEditPedido(JSON.parse(this.dataset.ped),event)" data-ped="${pedJSON}">✎ Editar</button>
      <button class="ped-btn del" onclick="deletePedido(${p.id},event)">✕</button>
    </div>
  </div>
</div>`;}).join('');
}

document.addEventListener('click',e=>{if(!document.getElementById('pddrop').contains(e.target)&&e.target!==document.getElementById('pdq'))document.getElementById('pddrop').classList.remove('on');});

// ── PDF ──
async function xpdf(_returnBlob=false){
  if(!CAT.length){alert('No hay perfumes.');return;}
  if(!_returnBlob)document.getElementById('pl').classList.add('on');
  try{
    if(!window.jspdf)await new Promise((res,rej)=>{const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';s.onload=res;s.onerror=rej;document.head.appendChild(s);});
    const{jsPDF}=window.jspdf;
    const doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
    const PW=210,PH=297;
    const now=new Date();
    const ds=now.toLocaleDateString('es-AR',{day:'2-digit',month:'long',year:'numeric'});
    const ai=(d,x,y,w,h)=>{if(!d)return;try{doc.addImage(d,d.startsWith('data:image/png')?'PNG':'JPEG',x,y,w,h,'','FAST');}catch{}};
    const fi=async src=>{if(!src)return null;if(src.startsWith('data:'))return src;try{const r=await fetch(src);const b=await r.blob();return await new Promise(res=>{const fr=new FileReader();fr.onload=e=>res(e.target.result);fr.readAsDataURL(b)});}catch{return null;}};

    // Layout: full width with small margin (4mm each side)
    // Columns: perf | nom | p25 | p5 | p10 | inspo | info
    // perf and inspo same width; info narrow
    const M=4; // margin
    const TW=PW-M*2; // total table width = 202mm
    // col widths
    const cW={perf:22,nom:60,p25:24,p5:24,p10:24,inspo:22,info:26};
    // total = 22+60+24+24+24+22+26 = 202 ✓
    // x positions
    let xPos=M;
    const cX={};
    for(const k of['perf','nom','p25','p5','p10','inspo','info']){cX[k]=xPos;xPos+=cW[k];}
    const cx=k=>cX[k]+cW[k]/2; // center of each col

    const IMG_W=16,IMG_H=22;
    const ROW_H=IMG_H+8;
    const TH_H=9;
    const HDR_H=22;
    const TBL_TOP=HDR_H+3;
    const PAGE_BOT=PH-8;
    let curY=TBL_TOP,pg=1;

    const soc=[{d:IG,u:'https://www.instagram.com/vico.decants'},{d:WA,u:'https://wa.me/'},{d:TT,u:'https://www.tiktok.com/@vico.decants'}];
    const SZ=10,SX0=PW-M-soc.length*SZ-(soc.length-1)*3;

    function hdr(){
      doc.setFillColor(28,25,22);doc.rect(0,0,PW,HDR_H,'F');
      ai(LOGO,M,(HDR_H-16)/2,16,16);
      doc.setFont('helvetica','bold');doc.setFontSize(11);doc.setCharSpace(2);doc.setTextColor(232,228,220);
      doc.text('CATÁLOGO DE DECANTS',M+20,HDR_H/2+0.5);
      doc.setCharSpace(0);doc.setFont('helvetica','normal');doc.setFontSize(7.5);doc.setTextColor(140,132,122);
      doc.text('Precios al '+ds,M+20,HDR_H/2+5.5);
      soc.forEach((s,i)=>{const sx=SX0+i*(SZ+3),sy=(HDR_H-SZ)/2;ai(s.d,sx,sy,SZ,SZ);doc.link(sx,sy,SZ,SZ,{url:s.u});});
    }

    function drawSeps(y,h,r,g,b,lw){
      doc.setDrawColor(r,g,b);doc.setLineWidth(lw||.2);
      // vertical: between each column
      for(const k of['nom','p25','p5','p10','inspo','info']){doc.line(cX[k],y,cX[k],y+h);}
      // outer right border
      doc.line(M+TW,y,M+TW,y+h);
      // outer left
      doc.line(M,y,M,y+h);
    }

    function thead(y){
      doc.setFillColor(40,37,33);doc.rect(M,y,TW,TH_H,'F');
      doc.setFont('helvetica','bold');doc.setFontSize(7);doc.setCharSpace(.5);doc.setTextColor(172,165,155);
      const ty=y+TH_H/2+1.2;
      [{k:'perf',l:'IMG'},{k:'nom',l:'NOMBRE'},{k:'p25',l:'2.5 ML'},{k:'p5',l:'5 ML'},{k:'p10',l:'10 ML'},{k:'inspo',l:'INSPIR.'},{k:'info',l:'+ INFO'}]
        .forEach(({k,l})=>doc.text(l,cx(k),ty,{align:'center'}));
      drawSeps(y,TH_H,60,57,52,.25);
      doc.setCharSpace(0);
      return y+TH_H;
    }

    function foot(n){doc.setFont('helvetica','normal');doc.setFontSize(7.5);doc.setTextColor(160,155,150);doc.text(String(n),PW/2,PH-2.5,{align:'center'});}
    function newpage(){foot(pg++);doc.addPage();return thead(8);}

    hdr();curY=thead(TBL_TOP);
    const BG=[250,248,244];
    const BG_OUT=[205,202,198];
    // Sort catalog: Nicho → Diseñador → Árabe → rest, then by brand
    function tipoRank(t){const n=(t||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();if(n==='nicho')return 0;if(n==='disenador')return 1;if(n==='arabe')return 2;return 3;}
    const catSorted=[...CAT].sort((a,b)=>tipoRank(a.tipo)-tipoRank(b.tipo));
    const brandsSeen=new Set();const brandList=[];
    for(const p of catSorted){const m=p.marca||'Sin marca';if(!brandsSeen.has(m)){brandsSeen.add(m);brandList.push(m);}}

    for(const brand of brandList){
      const items=catSorted.filter(p=>(p.marca||'Sin marca')===brand);
      if(curY+7>PAGE_BOT)curY=newpage();
      // brand header row with left/right borders
      doc.setFillColor(232,221,198);doc.rect(M,curY,TW,7,'F');
      doc.setDrawColor(185,180,174);doc.setLineWidth(.25);
      doc.line(M,curY,M,curY+7);doc.line(M+TW,curY,M+TW,curY+7);
      doc.setFont('helvetica','bold');doc.setFontSize(9);doc.setCharSpace(.5);doc.setTextColor(55,44,28);
      doc.text(brand.toUpperCase(),M+3,curY+5.2,{align:'left'});
      doc.setCharSpace(0);curY+=7;

      for(const p of items){
        if(curY+ROW_H>PAGE_BOT)curY=newpage();
        const ry=curY;
        const io=p.stock!=='in';
        const[rr,rg,rb]=io?BG_OUT:BG;
        doc.setFillColor(rr,rg,rb);doc.rect(M,ry,TW,ROW_H,'F');
        // horizontal bottom
        doc.setDrawColor(185,180,174);doc.setLineWidth(.18);doc.line(M,ry+ROW_H,M+TW,ry+ROW_H);
        // vertical separators
        drawSeps(ry,ROW_H,185,180,174,.18);
        const ink=io?[158,154,149]:[28,25,22];
        const midY=ry+ROW_H/2+1.4;

        // perf image — centered in cell
        const imgD=await fi(p.img);
        if(imgD){
          const ix=cx('perf')-IMG_W/2, iy=ry+(ROW_H-IMG_H)/2;
          if(io){
            // draw grayscale-ish overlay effect
            ai(imgD,ix,iy,IMG_W,IMG_H);
            try{doc.saveGraphicsState();if(doc.setGState)doc.setGState(doc.GState({opacity:.45}));doc.setFillColor(rr,rg,rb);doc.rect(ix,iy,IMG_W,IMG_H,'F');doc.restoreGraphicsState();}catch{doc.setFillColor(rr,rg,rb);doc.rect(ix,iy,IMG_W,IMG_H,'F');}
          }else{ai(imgD,ix,iy,IMG_W,IMG_H);}
        }

        // nombre — wrapped, vertically centered
        doc.setFont('helvetica','bold');doc.setFontSize(9.5);doc.setTextColor(...ink);
        const nl=doc.splitTextToSize(p.nombre||'—',cW.nom-3),nc=Math.min(nl.length,2),lh=5;
        const ny=ry+ROW_H/2-(nc*lh)/2+lh*.85;
        nl.slice(0,2).forEach((l,i)=>doc.text(l,cx('nom'),ny+i*lh,{align:'center'}));

        // prices — centered
        doc.setFont('helvetica','bold');doc.setFontSize(10.5);doc.setTextColor(...ink);
        [['p25',p.p25],['p5',p.p5],['p10',p.p10]].forEach(([k,v])=>doc.text('$'+f(v),cx(k),midY,{align:'center'}));

        // inspo — centered in cell
        const insD=await fi(p.inspo);
        if(insD){
          const inx=cx('inspo')-IMG_W/2, iny=ry+(ROW_H-IMG_H)/2;
          if(io){
            ai(insD,inx,iny,IMG_W,IMG_H);
            try{doc.saveGraphicsState();if(doc.setGState)doc.setGState(doc.GState({opacity:.45}));doc.setFillColor(rr,rg,rb);doc.rect(inx,iny,IMG_W,IMG_H,'F');doc.restoreGraphicsState();}catch{doc.setFillColor(rr,rg,rb);doc.rect(inx,iny,IMG_W,IMG_H,'F');}
          }else{ai(insD,inx,iny,IMG_W,IMG_H);}
        }else{
          doc.setFont('helvetica','normal');doc.setFontSize(10);doc.setTextColor(180,175,170);
          doc.text('—',cx('inspo'),midY,{align:'center'});
        }

        // link — centered, narrow col
        if(p.link){
          doc.setFont('helvetica','normal');doc.setFontSize(8);
          doc.setTextColor(io?150:62,io?147:102,io?143:172);
          doc.textWithLink('Ver más',cx('info'),midY,{url:p.link,align:'center'});
        }else{
          doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(180,175,170);
          doc.text('—',cx('info'),midY,{align:'center'});
        }

        curY+=ROW_H;
      }
    }
    foot(pg);
    if(_returnBlob)return doc.output('blob');
    doc.save('vico-catalogo-'+now.toISOString().slice(0,10)+'.pdf');
  }catch(err){console.error(err);alert('Error: '+err.message);}
  finally{if(!_returnBlob)document.getElementById('pl').classList.remove('on');}
}

// ── GOOGLE DRIVE ──
let _gToken=null,_gTokenExpiry=0,_gisClient=null;
function initGIS(){
  if(!CONFIG.GOOGLE_CLIENT_ID)return;
  const s=document.createElement('script');s.src='https://accounts.google.com/gsi/client';
  s.onload=()=>{
    _gisClient=google.accounts.oauth2.initTokenClient({
      client_id:CONFIG.GOOGLE_CLIENT_ID,
      scope:'https://www.googleapis.com/auth/drive.file',
      callback:()=>{},
    });
  };
  document.head.appendChild(s);
}
async function uploadToDrive(){
  if(!CAT.length){alert('No hay perfumes.');return;}
  // Solicitar token SINCRÓNICAMENTE antes de cualquier await (evita bloqueo de popup)
  let tokenPromise;
  if(_gToken&&Date.now()<_gTokenExpiry){
    tokenPromise=Promise.resolve(_gToken);
  }else{
    if(!_gisClient){alert('Google no cargó todavía. Reintentá en unos segundos.');return;}
    tokenPromise=new Promise((resolve,reject)=>{
      _gisClient.callback=(resp)=>{
        if(resp.error){reject(new Error(resp.error));return;}
        _gToken=resp.access_token;
        _gTokenExpiry=Date.now()+(resp.expires_in-60)*1000;
        resolve(_gToken);
      };
      _gisClient.requestAccessToken();
    });
  }
  const btn=document.getElementById('bDrive');
  btn.disabled=true;btn.textContent='…';
  document.getElementById('pl').classList.add('on');
  document.getElementById('plMsg').textContent='Generando PDF…';
  try{
    // PDF y autenticación en paralelo
    const[blob,token]=await Promise.all([xpdf(true),tokenPromise]);
    if(!blob)throw new Error('No se pudo generar el PDF');
    document.getElementById('plMsg').textContent='Subiendo a Drive…';
    let fileId=CFG.drive_pdf_id;
    if(fileId){
      // Reemplazar contenido del archivo (mismo ID, mismo link)
      const r=await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,{
        method:'PATCH',headers:{'Authorization':'Bearer '+token,'Content-Type':'application/pdf'},body:blob
      });
      if(!r.ok){
        // Si el archivo fue borrado de Drive, crear uno nuevo
        if(r.status===404){fileId='';}
        else throw new Error('Error actualizando archivo ('+r.status+')');
      }
    }
    if(!fileId){
      // Crear archivo nuevo
      const meta=JSON.stringify({name:'Vico Decants - Catálogo.pdf',mimeType:'application/pdf'});
      const form=new FormData();
      form.append('metadata',new Blob([meta],{type:'application/json'}));
      form.append('file',blob,'vico-catalogo.pdf');
      const r=await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',{
        method:'POST',headers:{'Authorization':'Bearer '+token},body:form
      });
      if(!r.ok)throw new Error('Error subiendo archivo ('+r.status+')');
      const data=await r.json();
      fileId=data.id;
      // Hacer el archivo público (cualquiera con el link puede verlo)
      await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`,{
        method:'POST',headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'},
        body:JSON.stringify({role:'reader',type:'anyone'})
      });
      await saveDriveId(fileId);
    }
    const link=`https://drive.google.com/file/d/${fileId}/view`;
    try{await navigator.clipboard.writeText(link);}catch{}
    toast('¡PDF subido a Drive! Link copiado: '+link);
  }catch(err){
    console.error(err);
    if(err.message?.includes('401')||err.message?.includes('invalid_token'))_gToken=null;
    alert('Error: '+err.message);
  }finally{
    btn.disabled=false;btn.textContent='↑ Drive';
    document.getElementById('pl').classList.remove('on');
    document.getElementById('plMsg').textContent='Generando PDF…';
  }
}


// ── DASHBOARD ──
let _charts={};
async function renderDashboard(){
  if(!window.Chart){
    await new Promise((res,rej)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';s.onload=res;s.onerror=rej;document.head.appendChild(s);});
  }
  // KPIs
  const totalV=PEDIDOS.reduce((s,p)=>s+(p.total_venta||0),0);
  const totalC=PEDIDOS.reduce((s,p)=>s+(p.total_costo||0),0);
  const pend=PEDIDOS.filter(p=>p.estado==='pendiente').length;
  const term=PEDIDOS.filter(p=>p.estado==='terminado').length;
  document.getElementById('dKpiPedidos').textContent=PEDIDOS.length;
  document.getElementById('dKpiVenta').textContent='$'+f(totalV);
  document.getElementById('dKpiGan').textContent='$'+f(totalV-totalC);
  document.getElementById('dKpiPend').textContent=pend;
  document.getElementById('dKpiTerm').textContent=term;
  // Estado KPI card
  const pct=PEDIDOS.length?Math.round(pend/PEDIDOS.length*100):0;
  const estKpi=document.getElementById('dKpiEstado');
  if(pend===0){estKpi.innerHTML=`<div class="est-dot-badge ok"></div><div class="dkpi-l" style="margin-bottom:6px">Estado</div><div class="est-kpi-status ok">Todo al día</div>`;}
  else if(pct<40){estKpi.innerHTML=`<div class="est-dot-badge warn"></div><div class="dkpi-l" style="margin-bottom:6px">Estado</div><div class="est-kpi-status warn">${pend} pendiente${pend!==1?'s':''}</div>`;}
  else{estKpi.innerHTML=`<div class="est-dot-badge alert"></div><div class="dkpi-l" style="margin-bottom:6px">Estado</div><div class="est-kpi-status alert">¡${pend} pendientes!</div>`;};
  // Monthly data (last 6 months)
  const months=[];const now=new Date();
  for(let i=5;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1);months.push({label:d.toLocaleDateString('es-AR',{month:'short',year:'2-digit'}),key:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`});}
  const mV=months.map(m=>PEDIDOS.filter(p=>p.fecha&&p.fecha.startsWith(m.key)).reduce((s,p)=>s+(p.total_venta||0),0));
  const mG=months.map(m=>PEDIDOS.filter(p=>p.fecha&&p.fecha.startsWith(m.key)).reduce((s,p)=>s+(p.total_venta||0)-(p.total_costo||0),0));
  // Destroy old charts
  Object.values(_charts).forEach(c=>{try{c.destroy();}catch{}});_charts={};
  const CO={responsive:true,maintainAspectRatio:true};
  const tickC={color:'#7a7268',font:{size:10,family:'Inter'}};
  const gridC={color:'rgba(30,27,24,.06)'};
  // Chart 1: Monthly line (ventas y ganancias)
  _charts.m=new Chart(document.getElementById('chMensual'),{type:'line',data:{labels:months.map(m=>m.label),datasets:[{label:'Ventas',data:mV,borderColor:'rgba(184,147,90,.9)',backgroundColor:'rgba(184,147,90,.08)',tension:.35,fill:true,pointRadius:4,pointBackgroundColor:'rgba(184,147,90,.9)'},{label:'Ganancia',data:mG,borderColor:'rgba(59,107,72,.85)',backgroundColor:'rgba(59,107,72,.06)',tension:.35,fill:true,pointRadius:4,pointBackgroundColor:'rgba(59,107,72,.85)'}]},options:{...CO,plugins:{legend:{labels:{color:'#7a7268',font:{size:10,family:'Inter'},boxWidth:12}}},scales:{x:{ticks:tickC,grid:gridC},y:{ticks:{...tickC,callback:v=>'$'+f(v)},grid:gridC}}}});
  // Fetch PedidosItems for top charts
  const allIds=PEDIDOS.map(p=>p.id);
  let top=[],decantPerf={};
  if(allIds.length){
    try{
      const r=await fetch(`${SB_URL}/rest/v1/PedidosItems?pedido_id=in.(${allIds.join(',')})&select=perfume_nombre,ml,qty`,{headers:SB_HDR});
      if(r.ok){
        const rows=await r.json();
        const aggTop={};
        rows.forEach(it=>{
          const k=it.perfume_nombre||'?';
          aggTop[k]=(aggTop[k]||0)+(it.qty||1);
          if(!decantPerf[k])decantPerf[k]={2.5:0,5:0,10:0};
          const ml=parseFloat(it.ml)||2.5;
          if([2.5,5,10].includes(ml))decantPerf[k][ml]+=(it.qty||1);
        });
        top=Object.entries(aggTop).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([n,q])=>({nombre:n,qty:q}));
      }
    }catch{}
  }
  // Chart 2: Top 5 perfumes — vertical bars
  _charts.t=new Chart(document.getElementById('chTop'),{type:'bar',data:{labels:top.map(p=>p.nombre.length>20?p.nombre.slice(0,18)+'…':p.nombre),datasets:[{label:'Unidades vendidas',data:top.map(p=>p.qty),backgroundColor:'rgba(184,147,90,.72)',borderRadius:4}]},options:{...CO,plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>`${ctx.parsed.y} unidad${ctx.parsed.y!==1?'es':''}`}}},scales:{x:{ticks:tickC,grid:{display:false}},y:{ticks:{...tickC,stepSize:1},grid:gridC}}}});
  // Chart 3: Catálogo por tipo — doughnut
  const tipos=[{l:'Nicho',v:'Nicho'},{l:'Diseñador',v:'Diseñador'},{l:'Árabe',v:'Arabe'}];
  const tData=tipos.map(t=>CAT.filter(p=>p.tipo===t.v).length);
  _charts.tp=new Chart(document.getElementById('chTipo'),{type:'doughnut',data:{labels:tipos.map(t=>t.l),datasets:[{data:tData,backgroundColor:['rgba(184,147,90,.72)','rgba(59,107,72,.65)','rgba(90,120,184,.65)'],borderWidth:0,hoverOffset:4}]},options:{...CO,cutout:'62%',plugins:{legend:{position:'bottom',labels:{color:'#7a7268',font:{size:10,family:'Inter'},boxWidth:12,padding:10}}}}});
  // Chart 4: Decants por perfume y tamaño — grouped vertical bars, top 10 by total
  const decantSorted=Object.entries(decantPerf).map(([n,s])=>({n,total:s[2.5]+s[5]+s[10],s})).sort((a,b)=>b.total-a.total).slice(0,10);
  const dLabels=decantSorted.map(d=>d.n.length>18?d.n.slice(0,16)+'…':d.n);
  _charts.d=new Chart(document.getElementById('chDecants'),{type:'bar',data:{labels:dLabels,datasets:[{label:'2.5ml',data:decantSorted.map(d=>d.s[2.5]),backgroundColor:'rgba(184,147,90,.75)',borderRadius:3},{label:'5ml',data:decantSorted.map(d=>d.s[5]),backgroundColor:'rgba(59,107,72,.70)',borderRadius:3},{label:'10ml',data:decantSorted.map(d=>d.s[10]),backgroundColor:'rgba(90,120,184,.70)',borderRadius:3}]},options:{...CO,plugins:{legend:{labels:{color:'#7a7268',font:{size:10,family:'Inter'},boxWidth:12}}},scales:{x:{ticks:{...tickC,font:{size:9,family:'Inter'}},grid:{display:false}},y:{ticks:{...tickC,stepSize:1},grid:gridC}}}});
}

// ── FOLLETO (4 perfumes, cara al público) ──
async function xFolleto() {
  if (!CAT.length) { alert('No hay perfumes en el catálogo.'); return; }
  let items = CAT.filter(p => p.stock === 'in').slice(0, 4);
  if (!items.length) items = CAT.slice(0, 4);
  document.getElementById('pl').classList.add('on');
  document.getElementById('plMsg').textContent = 'Generando folleto…';
  try {
    if (!window.jspdf) await new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      s.onload = res; s.onerror = rej; document.head.appendChild(s);
    });
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const PW = 210, PH = 297;

    const fi = async src => {
      if (!src) return null;
      if (src.startsWith('data:')) return src;
      try {
        const r = await fetch(src); const b = await r.blob();
        return await new Promise(res => { const fr = new FileReader(); fr.onload = e => res(e.target.result); fr.readAsDataURL(b); });
      } catch { return null; }
    };
    const ai = (d, x, y, w, h) => {
      if (!d) return;
      try { doc.addImage(d, d.startsWith('data:image/png') ? 'PNG' : 'JPEG', x, y, w, h, '', 'FAST'); } catch {}
    };
    // Filled triangle helper using jsPDF lines API
    const tri = (x1, y1, x2, y2, x3, y3) =>
      doc.lines([[x2 - x1, y2 - y1], [x3 - x2, y3 - y2]], x1, y1, [1, 1], 'F', true);

    const now = new Date();
    const ds = now.toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });

    // Pre-load all images in parallel
    const loaded = await Promise.all([fi(LOGO), fi(IG), fi(WA), fi(TT), ...items.map(p => fi(p.img))]);
    const [logoD, igD, waD, ttD] = loaded;
    const perfImgs = loaded.slice(4);

    // ── FONDO ──
    doc.setFillColor(237, 234, 227);
    doc.rect(0, 0, PW, PH, 'F');

    // Decoración de fondo: franja diagonal dorada suave (top-right)
    doc.setFillColor(228, 222, 208);
    tri(PW * 0.38, 0, PW, 0, PW, PH * 0.52);
    doc.setFillColor(232, 227, 215);
    tri(PW * 0.55, 0, PW, 0, PW, PH * 0.3);

    // ── HEADER (52mm) ──
    const HDR = 52;
    doc.setFillColor(28, 25, 22);
    doc.rect(0, 0, PW, HDR, 'F');

    // Triángulo dorado top-right del header
    doc.setFillColor(184, 147, 90);
    tri(PW * 0.58, 0, PW, 0, PW, HDR);
    // Corte oscuro encima (escalón)
    doc.setFillColor(28, 25, 22);
    tri(PW * 0.74, 0, PW, 0, PW, HDR * 0.5);

    // Logo
    if (logoD) ai(logoD, 12, (HDR - 22) / 2, 22, 22);

    // VICO DECANTS (grande, protagonista)
    const tx = logoD ? 40 : 12;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(20); doc.setCharSpace(4);
    doc.setTextColor(232, 228, 220);
    doc.text('VICO', tx, HDR / 2 - 2);
    doc.setCharSpace(0);
    doc.setFontSize(8.5); doc.setFont('helvetica', 'normal');
    doc.setTextColor(184, 147, 90);
    doc.text('D E C A N T S', tx, HDR / 2 + 7);
    doc.setFontSize(6.5);
    doc.setTextColor(90, 84, 77);
    doc.text('Selección de decants · ' + ds, tx, HDR / 2 + 14.5);

    // Línea dorada base del header
    doc.setDrawColor(184, 147, 90); doc.setLineWidth(1.1);
    doc.line(0, HDR, PW, HDR);

    // ── LAYOUT FLOTANTE: 4 productos asimétricos ──
    // Producto 0: top-left, grande  → col izq, fila alta
    // Producto 1: top-right, medio  → col der, fila alta (elevado)
    // Producto 2: bottom-left, medio→ col izq, fila baja
    // Producto 3: bottom-right, grande→ col der, fila baja
    const layout = [
      { x: 10,  y: 60,  imgW: 72, imgH: 92, textAlign: 'left'   }, // P0 grande izq
      { x: 116, y: 57,  imgW: 56, imgH: 72, textAlign: 'right'  }, // P1 medio der
      { x: 14,  y: 174, imgW: 56, imgH: 72, textAlign: 'left'   }, // P2 medio izq
      { x: 112, y: 170, imgW: 72, imgH: 92, textAlign: 'right'  }, // P3 grande der
    ];

    // Divisor central dorado (entre filas superior e inferior)
    const DIV_Y = 160;
    doc.setDrawColor(184, 147, 90); doc.setLineWidth(0.5);
    doc.line(12, DIV_Y, PW - 12, DIV_Y);
    // Pequeño rombo dorado centrado en el divisor
    const rX = PW / 2, rY = DIV_Y;
    doc.setFillColor(184, 147, 90);
    doc.lines([[4, -4], [4, 4], [-4, 4], [-4, -4]], rX - 4, rY, [1, 1], 'F', true);
    // Cubrir centro del rombo con BG (efecto hueco)
    doc.setFillColor(237, 234, 227);
    doc.lines([[2.2, -2.2], [2.2, 2.2], [-2.2, 2.2], [-2.2, -2.2]], rX - 2.2, rY, [1, 1], 'F', true);

    for (let i = 0; i < 4; i++) {
      const p = items[i];
      if (!p) continue;
      const { x, y, imgW, imgH, textAlign } = layout[i];
      const cx = x + imgW / 2; // centro horizontal de la imagen

      // --- Sombra simulada (rect desplazado) ---
      doc.setFillColor(200, 196, 188);
      doc.roundedRect(x + 3, y + 4, imgW, imgH, 5, 5, 'F');

      // --- Fondo blanco de imagen (flotante) ---
      doc.setFillColor(250, 248, 243);
      doc.roundedRect(x, y, imgW, imgH, 5, 5, 'F');

      // --- Imagen del perfume ---
      if (perfImgs[i]) {
        const pad = 6;
        ai(perfImgs[i], x + pad, y + pad, imgW - pad * 2, imgH - pad * 2);
      } else {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(28);
        doc.setTextColor(210, 205, 195);
        doc.text('◈', cx, y + imgH / 2 + 7, { align: 'center' });
      }

      // --- Badge de tipo (esquina sup de la imagen) ---
      if (p.tipo) {
        const bW = 22, bH = 6;
        const bX = textAlign === 'left' ? x + 5 : x + imgW - bW - 5;
        doc.setFillColor(28, 25, 22);
        doc.roundedRect(bX, y + 5, bW, bH, 2, 2, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(5); doc.setCharSpace(0.5);
        doc.setTextColor(184, 147, 90);
        doc.text(p.tipo.toUpperCase(), bX + bW / 2, y + 9.7, { align: 'center' });
        doc.setCharSpace(0);
      }

      // --- Texto debajo de la imagen ---
      const textX = textAlign === 'left' ? x : x + imgW;
      const tAlign = textAlign === 'left' ? 'left' : 'right';
      let tY = y + imgH + 7;

      // Nombre
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
      doc.setTextColor(28, 25, 22);
      const maxW = imgW;
      const nl = doc.splitTextToSize(p.nombre || '—', maxW);
      nl.slice(0, 2).forEach((l, li) => doc.text(l, textX, tY + li * 6, { align: tAlign }));
      tY += Math.min(nl.length, 2) * 6 + 1.5;

      // Marca
      if (p.marca) {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
        doc.setTextColor(122, 114, 104);
        doc.text(p.marca, textX, tY, { align: tAlign });
        tY += 5.5;
      }

      // Línea dorada bajo marca
      doc.setDrawColor(184, 147, 90); doc.setLineWidth(0.4);
      if (textAlign === 'left') doc.line(x, tY, x + imgW * 0.6, tY);
      else doc.line(x + imgW * 0.4, tY, x + imgW, tY);
      tY += 5;

      // Precios compactos en una sola línea
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5);
      doc.setTextColor(28, 25, 22);
      const pLine = `$${f(p.p25)}  ·  $${f(p.p5)}  ·  $${f(p.p10)}`;
      doc.text(pLine, textX, tY, { align: tAlign });
      tY += 4.5;

      // Labels de ml bajo los precios
      doc.setFont('helvetica', 'normal'); doc.setFontSize(5.5);
      doc.setTextColor(150, 143, 134);
      const mlLine = '2.5 ml              5 ml             10 ml';
      doc.text(mlLine, textX, tY, { align: tAlign });
    }

    // ── FOOTER (22mm) ──
    const FTR_H = 22;
    const FY = PH - FTR_H;
    doc.setFillColor(28, 25, 22);
    doc.rect(0, FY, PW, FTR_H, 'F');

    // Triángulo dorado footer left (espejo del header)
    doc.setFillColor(184, 147, 90);
    tri(0, FY, PW * 0.42, FY, 0, PH);
    doc.setFillColor(28, 25, 22);
    tri(0, FY + FTR_H * 0.5, PW * 0.26, FY, 0, PH);

    // Línea dorada top del footer
    doc.setDrawColor(184, 147, 90); doc.setLineWidth(0.9);
    doc.line(0, FY, PW, FY);

    // Íconos sociales footer
    const SZF = 8, fsx = PW / 2 - (3 * SZF + 2 * 5) / 2;
    [igD, waD, ttD].forEach((d, i) => { if (d) ai(d, fsx + i * (SZF + 5), FY + (FTR_H - SZF) / 2, SZF, SZF); });

    // Handle y tagline
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setCharSpace(2);
    doc.setTextColor(232, 228, 220);
    doc.text('@VICO.DECANTS', PW / 2, FY + 9, { align: 'center' });
    doc.setCharSpace(0);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6);
    doc.setTextColor(110, 104, 96);
    doc.text('Decants a medida  ·  Precios al ' + ds, PW / 2, FY + 16, { align: 'center' });

    doc.save('vico-folleto-' + now.toISOString().slice(0, 10) + '.pdf');
  } catch (err) {
    console.error(err); alert('Error generando folleto: ' + err.message);
  } finally {
    document.getElementById('pl').classList.remove('on');
    document.getElementById('plMsg').textContent = 'Generando PDF…';
  }
}

// INIT
document.querySelectorAll('input[type=range]').forEach(usl);
loadConfig();
initLogos();
