function calc(){
  const pl=+$('pL').value||0,tam=+$('tam').value||100,pc=+$('pC').value||0,ce=+$('ce').value||0,mg=+$('mg').value,d5=+$('d5').value||0,d10=+$('d10').value||0;
  ['mg','d5','d10'].forEach(id=>usl($(id)));
  $('mgV').textContent=mg+'%';$('d5V').textContent=d5?'−'+d5+'%':'0%';$('d10V').textContent=d10?'−'+d10+'%':'0%';
  const aj=+$('fAj').value||1;
  updAjInfo(pc,aj);
  if(!pc){rst();return;}
  const cml=pc*aj/tam;
  const roundTo=$('rnd').checked?$('rto').value:null;
  const dat=priceCalc({pc,aj,tam,ce,margin:mg,disc5:d5,disc10:d10,roundTo});
  lp={p25:dat[0].v,p5:dat[1].v,p10:dat[2].v};
  dat.forEach((x,i)=>{const card=$('rc'+x.id);card.classList.add('on');card.classList.toggle('best',i===2);$('p'+x.id).textContent=f(x.v);$('c'+x.id).textContent='$'+f(x.ct);$('g'+x.id).textContent='$'+f(x.gan);$('m'+x.id).textContent='$'+fd(x.pml)+'/ml';});
  let h=`<table class="rt"><thead><tr><th>Concepto</th><th>2.5ml</th><th>5ml</th><th>10ml</th></tr></thead><tbody>`;
  h+=`<tr><td>Costo total</td>${dat.map(x=>`<td>$${f(x.ct)}</td>`).join('')}</tr>`;
  h+=`<tr class="tot"><td>Precio de venta</td>${dat.map(x=>`<td>$${f(x.v)}</td>`).join('')}</tr>`;
  if(pl>0){h+=`<tr class="chk"><td>Total al vender ${tam}ml</td>${dat.map(x=>`<td>$${f(x.v*(tam/x.ml))}</td>`).join('')}</tr>`;h+=`<tr class="chks"><td>vs lista ($${f(pl)})</td>${dat.map(x=>{const t=x.v*(tam/x.ml),pct=(t/pl*100).toFixed(0),c=t>pl*1.5?'color:#d48a8a':t>pl*1.1?'color:rgba(184,147,90,.7)':'color:#7ab896';return`<td style="${c}">${pct}%</td>`;}).join('')}</tr>`;}
  h+=`</tbody></table><div class="stag">Compra: <strong>$${f(pc)}</strong>${aj!==1?` · Actualizado: <strong>$${f(pc*aj)}</strong>`:''} · Costo/ml: <strong>$${fd(cml)}</strong> · Margen: <strong>${mg}%</strong></div>`;
  $('det').innerHTML=h;
  const b=$('bsv');b.classList.add('ok');b.textContent='Guardar en catálogo →';
}
function rst(){lp=null;['25','5','10'].forEach(id=>{['p','c','g','m'].forEach(p=>{const el=$(p+id);if(el)el.textContent='—';});$('rc'+id).classList.remove('on','best');});$('det').innerHTML='<div class="ei">Ingresá los datos para ver el resumen.</div>';$('bsv').classList.remove('ok');$('bsv').textContent='Guardar en catálogo';}
function rfm(editing=false){
  ['fMarca','fNom','fLink'].forEach(id=>$(id).value='');
  $('fDbId').value='';$('fTipo').value='';stk('in');ib.m='';ib.i='';pf.m=null;pf.i=null;
  ['iT','sT'].forEach(id=>{const e=$(id);e.style.display='none';e.src='';});
  ['iI','sI'].forEach(id=>$(id).style.display='');
  ['iH','sH'].forEach(id=>$(id).textContent='Subir foto');
  $('fIF').value='';$('fIS').value='';
  ['pL','pC'].forEach(id=>$(id).value='');
  $('ce').value=CFG.costo_fijo||0;$('tam').value='100';
  $('fAj').value='1';
  Object.assign($('pC').dataset,{orig:'',aj:'1'});
  setRange('mg',60,10,500);setRange('d5',10,0,30);setRange('d10',20,0,40);
  [...$('rto').options].forEach(o=>{if(!['100','500','1000'].includes(o.value))o.remove();});
  $('rnd').checked=false;$('rto').value='100';
  ['mg','d5','d10'].forEach(id=>usl($(id)));
  $('mgV').textContent='60%';$('d5V').textContent='−10%';$('d10V').textContent='−20%';
  rst();if(!editing)setNextCode();
}
async function save(){
  if(!lp)return;
  const n=$('fNom').value.trim();
  if(!n){const e=$('fNom');e.style.borderColor='var(--red)';e.focus();setTimeout(()=>e.style.borderColor='',1800);return;}
  const rawDbId=$('fDbId').value;
  const rawCod=$('fCod').value;
  const resolvedId=rawDbId?parseInt(rawDbId):(rawCod?parseInt(rawCod):null);
  const p={dbId:resolvedId,tipo:$('fTipo').value,marca:$('fMarca').value.trim(),nombre:n,img:ib.m,inspo:ib.i,link:$('fLink').value.trim(),stock:$('fStk').value,p25:lp.p25,p5:lp.p5,p10:lp.p10,pl:+$('pL').value||0,pc:+$('pC').value||0,tam:+$('tam').value||100,ce:+$('ce').value||0,aj:+$('fAj').value||1,margin:+$('mg').value,disc5:+$('d5').value||0,disc10:+$('d10').value||0,roundTo:$('rnd').checked?$('rto').value:null};
  const b=$('bsv');b.textContent='Guardando…';b.style.opacity='.5';b.style.pointerEvents='none';
  syncToast('Guardando…','loading');
  try{
    const cod=$('fCod').value||'';
    if(pf.m){p.img=await sbUploadImage(pf.m,cod,'m');ib.m=p.img;}
    if(pf.i){p.inspo=await sbUploadImage(pf.i,cod,'i');ib.i=p.inspo;}
    const saved=await sbUpsert(p);p.dbId=saved.id;p.key=String(saved.id);
    const idx=CAT.findIndex(x=>x.dbId===p.dbId);if(idx>=0){p.sales=CAT[idx].sales||0;CAT[idx]=p;}else{p.sales=0;CAT.push(p);}
    ubadge();umf();syncToast(idx>=0?'Actualizado':'Guardado','ok');
    b.textContent='✓ Guardado';b.style.background='var(--grn)';b.style.opacity='1';
    setTimeout(()=>{b.style.background='';b.style.pointerEvents='';rfm();},1300);
  }catch(e){syncToast(e.message,'err');b.textContent='Error';b.style.background='var(--red)';b.style.opacity='1';setTimeout(()=>{b.style.background='';b.style.pointerEvents='';b.classList.add('ok');b.textContent='Guardar →';},2500);}
}
function updAjInfo(pc,aj){
  const el=$('ajInfo');
  el.style.display=pc&&aj!==1?'block':'none';
  if(pc&&aj!==1)el.textContent=`Inflación acumulada ×${aj.toFixed(4).replace('.',',')} → costo actualizado $${f(pc*aj)}. Si cargás un precio de compra nuevo, se reinicia.`;
}
function onPcInput(){const e=$('pC');$('fAj').value=e.dataset.orig&&+e.value===+e.dataset.orig?e.dataset.aj:'1';calc();}
function setRange(id,val,defMin,defMax){const el=$(id);el.min=Math.min(defMin,Math.floor(val));el.max=Math.max(defMax,Math.ceil(val));el.step=Number.isInteger(+val)?1:Number.isInteger(+val*10)?0.1:"any";el.value=val;}
function ltc(key){
  const p=CAT.find(x=>x.key===key);if(!p)return;
  rfm(true);
  $('fAj').value=p.aj||1;
  Object.assign($('pC').dataset,{orig:p.pc||'',aj:p.aj||1});
  $('fDbId').value=p.dbId||'';$('fCod').value=String(p.dbId||'').padStart(5,'0');
  $('fMarca').value=p.marca||'';$('fNom').value=p.nombre||'';
  $('fTipo').value=p.tipo||'';$('fLink').value=p.link||'';stk(p.stock||'in');
  $('pL').value=p.pl||'';$('pC').value=p.pc||'';
  $('tam').value=p.tam||100;$('ce').value=p.ce!=null?p.ce:0;
  setRange('mg',p.margin!=null?p.margin:60,10,500);setRange('d5',p.disc5!=null?p.disc5:10,0,30);setRange('d10',p.disc10!=null?p.disc10:20,0,40);
  if(p.roundTo!=null){const sel=$('rto');if(![...sel.options].some(o=>o.value===String(p.roundTo)))sel.add(new Option('al '+p.roundTo,p.roundTo));$('rnd').checked=true;sel.value=p.roundTo;}else{$('rnd').checked=false;$('rto').value='100';}
  ['mg','d5','d10'].forEach(id=>usl($(id)));
  ib.m=p.img||'';ib.i=p.inspo||'';
  [{t:'iT',i:'iI',h:'iH',src:p.img},{t:'sT',i:'sI',h:'sH',src:p.inspo}].forEach(({t,i,h,src})=>{const th=$(t);if(src){th.src=src;th.style.display='block';$(i).style.display='none';$(h).textContent='Imagen cargada';}else{th.style.display='none';$(i).style.display='';$(h).textContent='Subir foto';}});
  calc();sv('vc');window.scrollTo({top:0,behavior:'smooth'});
  $('bsv').textContent='Actualizar en catálogo →';
}
