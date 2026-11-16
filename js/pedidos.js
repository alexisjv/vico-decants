function priceFor(p,ml){if(ml===2.5)return p.p25||0;if(ml===5)return p.p5||0;if(ml===10)return p.p10||0;return 0;}
function costFor(p,ml){if(!p.pc||!p.tam)return 0;return(p.pc/p.tam)*ml+(p.ce||0);}
const szPrice=(o,s)=>s.price!=null?s.price:priceFor(o.perf,s.ml);
const szCost=(o,s)=>s.cost!=null?s.cost:costFor(o.perf,s.ml);

function pdSearch(q){
  const drop=$('pddrop');
  if(!q.trim()){drop.classList.remove('on');drop.innerHTML='';return;}
  const res=CAT.filter(p=>p.stock==='in'&&(p.nombre+p.marca).toLowerCase().includes(q.toLowerCase())).slice(0,8);
  if(!res.length){drop.innerHTML='<div class="pdopt" style="cursor:default;opacity:.45;font-size:.74rem">Sin resultados en stock</div>';drop.classList.add('on');return;}
  drop.innerHTML=res.map(p=>`<div class="pdopt" onclick="pdAdd('${p.key}')">
    ${p.img?`<img class="pdopt-img" src="${esc(p.img)}">`:`<div class="pdopt-noph">◈</div>`}
    <div class="pdopt-info"><div class="pdopt-name">${esc(p.nombre)}</div><div class="pdopt-sub">${esc([p.marca,p.tipo].filter(Boolean).join(' · '))}</div></div>
    <div class="pdopt-price">$${f(p.p25)}</div>
  </div>`).join('');
  drop.classList.add('on');
}
function pdAdd(key){
  const p=CAT.find(x=>x.key===key);if(!p)return;
  $('pddrop').classList.remove('on');$('pdq').value='';
  const ex=ORDER.find(o=>o.perf.key===key);
  if(ex)ex.sizes.push({ml:2.5,qty:1});else ORDER.push({perf:p,sizes:[{ml:2.5,qty:1}]});
  renderOrder();
}
function renderOrder(){
  const el=$('olist');
  if(!ORDER.length){el.innerHTML='<div class="oi-empty">Ningún perfume agregado.</div>';updOrd();return;}
  el.innerHTML=ORDER.map((o,oi)=>`
<div class="oi">
  <div class="oi-img">
    ${o.perf.img?`<img src="${esc(o.perf.img)}">`:`<div class="oi-noph">◈</div>`}
  </div>
  <div class="oi-body">
    <div class="oi-top">
      <span class="oi-name">${esc(o.perf.nombre)}</span>
      <span class="oi-brand">${esc(o.perf.marca||'')}</span>
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
        <span class="oi-sz-price">$${f(szPrice(o,s)*s.qty)}</span>
        <button class="oi-sz-rm" onclick="rmSz(${oi},${si})">✕</button>
      </div>`).join('')}
      <button class="oi-add-sz" onclick="addSz(${oi})">＋ tamaño</button>
    </div>
  </div>
  <button class="oi-rm" onclick="rmOi(${oi})">✕</button>
</div>`).join('');
  updOrd();
}
function chSz(oi,si,v){const s=ORDER[oi].sizes[si];s.ml=parseFloat(v);delete s.price;delete s.cost;renderOrder();}
function chQty(oi,si,v){ORDER[oi].sizes[si].qty=Math.max(1,parseInt(v)||1);updOrd();}
function addSz(oi){ORDER[oi].sizes.push({ml:2.5,qty:1});renderOrder();}
function rmSz(oi,si){ORDER[oi].sizes.splice(si,1);if(!ORDER[oi].sizes.length)ORDER.splice(oi,1);renderOrder();}
function rmOi(oi){ORDER.splice(oi,1);renderOrder();}
function updOrd(){
  let tCost=0,tSale=0;
  ORDER.forEach(o=>o.sizes.forEach(s=>{tCost+=szCost(o,s)*s.qty;tSale+=szPrice(o,s)*s.qty;}));
  const units=ORDER.reduce((a,o)=>a+o.sizes.reduce((b,s)=>b+s.qty,0),0);
  const el=$('psum');
  if(!ORDER.length){el.innerHTML='<div class="sum-empty">Agregá perfumes para ver el resumen.</div>';}
  else{
    let rows='';ORDER.forEach(o=>o.sizes.forEach(s=>{rows+=`<div class="sum-row"><span>${esc(o.perf.nombre)} · ${s.ml}ml × ${s.qty}</span><span>$${f(szPrice(o,s)*s.qty)}</span></div>`;}));
    const gan=tSale-tCost;
    el.innerHTML=rows+`<div class="sum-row tot"><span>${units} decant${units!==1?'s':''}</span><span>$${f(tSale)}</span></div><div class="sum-row gan"><span>Ganancia estimada</span><span>$${f(gan)} (${tCost>0?(gan/tCost*100).toFixed(0):0}%)</span></div>`;
  }
  $('bordSv').classList.toggle('ok',ORDER.length>0);
}

function resetPedidoForm(){
  ORDER=[];renderOrder();
  ['vNom','vTel','vEmail','vDir','vNota'].forEach(x=>$(x).value='');
  $('vFecha').value=today();
  editingPedidoId=null;
  const btn=$('bordSv');btn.textContent='Guardar pedido';btn.style.background='';btn.style.color='';
  $('bordCancel').style.display='none';
  renderPedidos();
}
function cancelEdit(){resetPedidoForm();}

async function savePedido(){
  if(!ORDER.length)return;
  let tCost=0,tSale=0;
  ORDER.forEach(o=>o.sizes.forEach(s=>{tCost+=szCost(o,s)*s.qty;tSale+=szPrice(o,s)*s.qty;}));
  const pedData={fecha:$('vFecha').value||today(),cliente_nombre:$('vNom').value.trim(),cliente_tel:$('vTel').value.trim(),cliente_email:$('vEmail').value.trim(),cliente_dir:$('vDir').value.trim(),notas:$('vNota').value.trim(),total_costo:Math.round(tCost),total_venta:Math.round(tSale)};
  if(!editingPedidoId)pedData.estado='pendiente';
  const items=[];ORDER.forEach(o=>o.sizes.forEach(s=>{items.push({perfume_id:o.perf.dbId,perfume_nombre:o.perf.nombre,ml:s.ml,qty:s.qty,precio_unit:szPrice(o,s),costo_unit:Math.round(szCost(o,s))});}));
  const btn=$('bordSv');btn.textContent='Guardando…';btn.classList.remove('ok');
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
  $('vNom').value=ped.cliente_nombre||'';
  $('vTel').value=ped.cliente_tel||'';
  $('vEmail').value=ped.cliente_email||'';
  $('vDir').value=ped.cliente_dir||'';
  $('vNota').value=ped.notas||'';
  $('vFecha').value=ped.fecha||today();
  ORDER=[];
  syncToast('Cargando items…','loading');
  try{
    const items=await sbGetPedidoItems(ped.id);
    for(const it of items){
      const p=CAT.find(x=>x.dbId===it.perfume_id)||{key:String(it.perfume_id),dbId:it.perfume_id,nombre:it.perfume_nombre||'?',marca:'',img:'',p25:it.ml===2.5?it.precio_unit:0,p5:it.ml===5?it.precio_unit:0,p10:it.ml===10?it.precio_unit:0,pc:0,tam:100,ce:0};
      const ex=ORDER.find(o=>o.perf.dbId===it.perfume_id);
      const sz={ml:+it.ml,qty:it.qty,price:it.precio_unit,cost:it.costo_unit};
      if(ex)ex.sizes.push(sz);
      else ORDER.push({perf:p,sizes:[sz]});
    }
    syncToast('Editando #'+String(ped.id).padStart(5,'0'),'info',3500);
  }catch(e){syncToast('Error al cargar items','err');}
  renderOrder();
  const btn=$('bordSv');btn.classList.add('ok');btn.textContent='Actualizar pedido →';
  $('bordCancel').style.display='block';
  renderPedidos();
  if(!$('vpd').classList.contains('on'))sv('vpd');
  setTimeout(()=>{document.querySelector('.pd-items-col').scrollTop=0;},120);
}

function waPhone(t){const d=String(t||'').replace(/\D/g,'');return d.length===10?'549'+d:d;}
async function waPedido(id,ev){
  ev.stopPropagation();
  const ped=PEDIDOS.find(x=>x.id===id);if(!ped)return;
  const w=window.open('','_blank');
  try{
    const items=await sbGetPedidoItems(id);
    const lines=items.map(i=>`• ${i.perfume_nombre} ${String(i.ml).replace('.',',')} ml × ${i.qty} — $${f((i.precio_unit||0)*i.qty)}`);
    const txt=`Hola${ped.cliente_nombre?' '+ped.cliente_nombre:''}! Te paso el detalle de tu pedido #${String(id).padStart(5,'0')}:\n${lines.join('\n')}\nTotal: $${f(ped.total_venta||0)}`;
    const url=`https://wa.me/${waPhone(ped.cliente_tel)}?text=${encodeURIComponent(txt)}`;
    if(w)w.location.href=url;else location.href=url;
  }catch(e){if(w)w.close();syncToast(e.message,'err');}
}
let _delPedId=null;
function deletePedido(id,ev){
  ev.stopPropagation();_delPedId=id;
  $('dmP').textContent=`¿Eliminar pedido #${String(id).padStart(5,'0')}?`;
  $('ovDP').classList.add('on');
}
$('bdkP').onclick=async()=>{
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
  updClientList();
  const filt=$('plEst').value;
  let list=PEDIDOS;if(filt)list=list.filter(p=>p.estado===filt);
  const pending=PEDIDOS.filter(p=>p.estado==='pendiente').length;
  const pbn=$('pbn');pbn.textContent=pending||'';pbn.style.display=pending?'inline-flex':'none';
  const el=$('pedGrid');
  if(!list.length){el.innerHTML='<div class="ped-empty">'+(!PEDIDOS.length?'Aún no hay pedidos.':'Sin pedidos para este filtro.')+'</div>';return;}
  el.innerHTML=list.map(p=>{
    const gan=(p.total_venta||0)-(p.total_costo||0);
    const fecha=p.fecha?new Date(p.fecha+'T00:00:00').toLocaleDateString('es-AR',{day:'2-digit',month:'short'}):'';
    const isEditing=editingPedidoId===p.id;
    const pedJSON=esc(JSON.stringify(p));
    const est=p.estado||'pendiente';
    const estIcon=est==='terminado'?'✓ Listo':'◌ Pendiente';
    return`<div class="ped-card${isEditing?' editing':''}">
  <div class="ped-head">
    <span class="ped-id">#${String(p.id).padStart(5,'0')}</span>
    <span class="ped-client">${esc(p.cliente_nombre||'Sin nombre')}</span>
    <button class="est-pill ${est}" onclick="toggleEstado(${p.id},'${est}',event)">${estIcon}</button>
  </div>
  ${(p.cliente_tel||fecha)?`<div class="ped-meta">${esc([p.cliente_tel,fecha].filter(Boolean).join(' · '))}</div>`:''}
  ${p.notas?`<div class="ped-nota">${esc(p.notas)}</div>`:''}
  <div class="ped-foot">
    <div class="ped-pricing">
      <span class="ped-total">$${f(p.total_venta||0)}</span>
      ${gan>0?`<span class="ped-gan">+$${f(gan)} gan.</span>`:''}
    </div>
    <div class="ped-acts-row">
      <button class="ped-btn" onclick="waPedido(${p.id},event)" title="Enviar resumen por WhatsApp">WhatsApp</button>
      <button class="ped-btn" onclick="startEditPedido(JSON.parse(this.dataset.ped),event)" data-ped="${pedJSON}">✎ Editar</button>
      <button class="ped-btn del" onclick="deletePedido(${p.id},event)">✕</button>
    </div>
  </div>
</div>`;}).join('');
}

document.addEventListener('click',e=>{if(!$('pddrop').contains(e.target)&&e.target!==$('pdq'))$('pddrop').classList.remove('on');});

function clientes(){
  const m=new Map();
  PEDIDOS.forEach(p=>{
    const n=(p.cliente_nombre||'').trim().replace(/\s+/g,' ');if(!n)return;
    const c=m.get(n.toLowerCase())||{cliente_nombre:n};
    ['cliente_tel','cliente_email','cliente_dir'].forEach(k=>{if(!c[k]&&p[k])c[k]=p[k];});
    m.set(n.toLowerCase(),c);
  });
  return m;
}
function updClientList(){$('vClientes').innerHTML=[...clientes().values()].map(p=>`<option value="${esc(p.cliente_nombre)}">`).join('');}
function fillCliente(){
  const p=clientes().get($('vNom').value.trim().replace(/\s+/g,' ').toLowerCase());if(!p)return;
  [['vTel','cliente_tel'],['vEmail','cliente_email'],['vDir','cliente_dir']].forEach(([id,k])=>{if(!$(id).value&&p[k])$(id).value=p[k];});
}
