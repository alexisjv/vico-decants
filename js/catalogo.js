function ubadge(){const n=CAT.length,e=$('cn');e.textContent=n||'';e.style.display=n?'inline-flex':'none';}
function umf(){const sel=$('fm'),cur=sel.value;const ms=[...new Set(CAT.map(p=>p.marca||'').filter(Boolean))].sort();sel.innerHTML='<option value="">Todas las marcas</option>'+ms.map(m=>`<option value="${esc(m)}"${m===cur?' selected':''}>${esc(m)}</option>`).join('');}
function sortFx(arr,ord){const a=[...arr];if(ord==='name')return a.sort((x,y)=>(x.nombre||'').localeCompare(y.nombre||'','es'));if(ord==='price-asc')return a.sort((x,y)=>x.p25-y.p25);if(ord==='price-desc')return a.sort((x,y)=>y.p25-x.p25);if(ord==='sales')return a.sort((x,y)=>(y.sales||0)-(x.sales||0));return a;}
function rcat(q=''){
  updFilterBadge();
  const sf=$('fs').value,mf=$('fm').value,tf=$('ft').value,ord=$('fo').value,ql=q.toLowerCase();
  let fx=CAT;
  if(sf)fx=fx.filter(p=>p.stock===sf);if(mf)fx=fx.filter(p=>(p.marca||'')===mf);if(tf)fx=fx.filter(p=>(p.tipo||'')===tf);
  if(ql)fx=fx.filter(p=>(p.nombre+p.marca+(p.tipo||'')).toLowerCase().includes(ql));
  fx=sortFx(fx,ord);
  $('csub').textContent=CAT.length+' perfume'+(CAT.length!==1?'s':'')+(fx.length!==CAT.length?` · ${fx.length} visibles`:'');
  const cc=$('cc');cc.className=vm_==='g'?'cgrid':'clist';
  if(!fx.length){cc.innerHTML=`<div class="cempty">${!CAT.length?'Sin perfumes.':'Sin resultados.'}</div>`;return;}
  const mob=window.innerWidth<900;
  if(vm_==='g'){
    cc.innerHTML=fx.map((p,i)=>`
<div class="card" style="animation-delay:${Math.min(i*.04,.5)}s">
  <div class="cimg${p.stock==='out'?' out-img':''}">
    ${p.img?`<img class="mi" src="${esc(p.img)}">`:''}<div class="ph"${p.img?' style="display:none"':''}>◈</div>
    ${p.inspo?`<div class="ipip"><img src="${esc(p.inspo)}"></div>`:''}
  </div>
  <div class="cbody">
    <div class="cd-row1"><span class="cd-name">${esc(p.nombre)}</span><button class="stk ${p.stock}" onclick="toggleStock('${p.key}')" title="Tocá para cambiar" aria-pressed="${p.stock==='in'}" aria-label="${esc(p.nombre)}: ${p.stock==='in'?'en stock':'sin stock'}. Tocá para cambiar">${p.stock==='in'?'En stock':'Sin stock'}</button></div>
    <div class="cd-row2">${p.tipo?`<span class="ctipo">${esc(p.tipo)}</span>`:''}${p.marca?`<span class="cbrand">${esc(p.marca)}</span>`:''}</div>
    <div class="cprices">
      <div class="cp"><div class="cp-l">2.5ml</div><div class="cp-v">$${f(p.p25)}</div></div>
      <div class="cp"><div class="cp-l">5ml</div><div class="cp-v">$${f(p.p5)}</div></div>
      <div class="cp"><div class="cp-l">10ml</div><div class="cp-v">$${f(p.p10)}</div></div>
    </div>
  </div>
  <div class="cacts"><button class="ba" onclick="ltc('${p.key}')">Editar</button><button class="ba del" onclick="cdel('${p.key}')">Eliminar</button></div>
</div>`).join('');
  } else if(mob){
    cc.innerHTML=fx.map((p,i)=>`
<div class="mob-card" style="animation-delay:${Math.min(i*.025,.35)}s">
  <div class="mob-thumb-wrap">
    ${p.img?`<img class="${p.stock==='out'?'out-th':''}" src="${esc(p.img)}" style="width:58px;height:58px;object-fit:contain;padding:4px">`:`<div style="opacity:.15;font-size:1.1rem">◈</div>`}
  </div>
  <div class="mob-content">
    <div class="mob-r1"><span class="mob-name">${esc(p.nombre)}</span><span class="mob-cod2">#${String(p.dbId||'').padStart(5,'0')}</span><button class="stk ${p.stock}" onclick="toggleStock('${p.key}')" title="Tocá para cambiar" aria-pressed="${p.stock==='in'}" aria-label="${esc(p.nombre)}: ${p.stock==='in'?'en stock':'sin stock'}. Tocá para cambiar">${p.stock==='in'?'En stock':'Sin stock'}</button></div>
    <div class="mob-r2">${p.tipo?`<span class="ctipo">${esc(p.tipo)}</span>`:''}${p.marca?`<span class="cbrand">${esc(p.marca)}</span>`:''}</div>
    <div class="mob-r3">
      <div class="mob-prices-row">
        <div class="mob-pr"><span class="mob-prl">2.5ml</span><span class="mob-prv">$${f(p.p25)}</span></div>
        <div class="mob-pr"><span class="mob-prl">5ml</span><span class="mob-prv">$${f(p.p5)}</span></div>
        <div class="mob-pr"><span class="mob-prl">10ml</span><span class="mob-prv">$${f(p.p10)}</span></div>
      </div>
      <div class="mob-acts-row"><button class="mob-bi" onclick="ltc('${p.key}')">✎</button><button class="mob-bi del" onclick="cdel('${p.key}')">✕</button></div>
    </div>
  </div>
</div>`).join('');
  } else {
    cc.innerHTML=`<div class="lh"><div class="lc"></div><div class="lc">Nombre</div><div class="lc">Cód.</div><div class="lc">Tipo</div><div class="lc">Marca</div><div class="lc"></div><div class="lc" style="text-align:right">2.5ml</div><div class="lc" style="text-align:right">5ml</div><div class="lc" style="text-align:right">10ml</div><div class="lc" style="text-align:center">Acciones</div></div>`+fx.map((p,i)=>`
<div class="lr" style="animation-delay:${Math.min(i*.025,.35)}s">
  <div class="lc">${p.img?`<img class="lr-th${p.stock==='out'?' out-th':''}" src="${esc(p.img)}">`:`<div class="lr-ph">◈</div>`}</div>
  <div class="lc"><div class="lr-n">${esc(p.nombre)}</div></div>
  <div class="lc"><span class="lr-sm">#${String(p.dbId||'').padStart(5,'0')}</span></div>
  <div class="lc">${p.tipo?`<span class="ctipo" style="font-size:.53rem">${esc(p.tipo)}</span>`:''}</div>
  <div class="lc"><span class="lr-sm">${esc(p.marca||'—')}</span></div>
  <div class="lc"><button class="stk ${p.stock}" onclick="toggleStock('${p.key}')" title="Tocá para cambiar" aria-pressed="${p.stock==='in'}" aria-label="${esc(p.nombre)}: ${p.stock==='in'?'en stock':'sin stock'}. Tocá para cambiar">${p.stock==='in'?'En stock':'Sin stock'}</button></div>
  <div class="lc"><span class="lr-p">$${f(p.p25)}</span></div>
  <div class="lc"><span class="lr-p">$${f(p.p5)}</span></div>
  <div class="lc"><span class="lr-p">$${f(p.p10)}</span></div>
  <div class="lc"><div class="lr-acts"><button class="bi" onclick="ltc('${p.key}')">✎ Editar</button><button class="bi del" onclick="cdel('${p.key}')">✕</button></div></div>
</div>`).join('');
  }
}
let _dk=null;
function cdel(k){const n=(CAT.find(x=>x.key===k)||{}).nombre||'';_dk=k;$('dm').textContent=`¿Eliminar "${n}"?`;$('ovD').classList.add('on');}
$('bdk').onclick=async()=>{
  if(!_dk)return;syncToast('Eliminando…','loading');
  try{const p=CAT.find(x=>x.key===_dk);
    const used=await(await sbOk(await fetch(`${SB_URL}/rest/v1/PedidosItems?perfume_id=eq.${p?p.dbId:_dk}&select=id&limit=1`,{headers:SB_HDR}))).json();
    if(used.length){cov('ovD');syncToast('Tiene pedidos: marcalo "sin stock" en lugar de borrarlo','err');return;}
    await sbDeletePerf(p?p.dbId:_dk);CAT=CAT.filter(x=>x.key!==_dk);_dk=null;ubadge();umf();cov('ovD');rcat($('catq').value||'');syncToast('Eliminado','ok');}
  catch(e){syncToast(e.message,'err');}
};

function fmtDate(iso){if(!iso)return'—';try{return new Date(iso).toLocaleDateString('es-AR',{day:'2-digit',month:'short',year:'numeric'});}catch{return iso;}}
function openInflModal(){
  $('inflVal').value=CFG.inflacion||'';
  $('cfVal').value=CFG.costo_fijo||'';
  $('inflChips').innerHTML=[
    {l:'Última inflación',v:CFG.inflacion!=null?CFG.inflacion+'%':'—'},
    {l:'Costo fijo actual',v:CFG.costo_fijo!=null?'$'+f(CFG.costo_fijo):'—'},
    {l:'Perfumes',v:String(CAT.length)},
  ].map(({l,v})=>`<div class="infl-chip"><div class="infl-chip-lbl">${l}</div><div class="infl-chip-val">${v}</div></div>`).join('');
  $('ovInfl').classList.add('on');
}
function inflCf(mult,oldCf,cfInput){return cfInput==null?Math.round((+oldCf||0)*mult):cfInput;}
function inflRow(p,mult,oldCf,cfInput){
  const ce0=+p.ce||0;
  const ce=cfInput!=null&&Math.abs(ce0-(+oldCf||0))<0.01?cfInput:Math.round(ce0*mult);
  const aj=Math.round((p.aj||1)*mult*1e6)/1e6;
  const pl=p.pl?Math.round(p.pl*mult):0;
  let prices;
  const cur=priceCalc(p).map(x=>x.v),same=p.pc&&[p.p25,p.p5,p.p10].every((v,i)=>Math.abs(v-cur[i])<=2);
  if(same){const[a,b,c]=priceCalc({...p,aj,ce}).map(x=>x.v);prices={p25:a,p5:b,p10:c};}
  else prices={p25:Math.round(p.p25*mult),p5:Math.round(p.p5*mult),p10:Math.round(p.p10*mult)};
  return{id:p.dbId,body:{...prices,ajuste:aj,pl,extra_cost:ce}};
}
let _inflBusy=false;
async function applyInflacion(){
  if(_inflBusy)return;
  const pct=parseFloat($('inflVal').value);
  const cfRaw=$('cfVal').value;
  const cfIn=cfRaw===''?null:Math.max(0,parseFloat(cfRaw)||0);
  if(isNaN(pct)){toast('Ingresá un % válido','err');return;}
  if(pct<=-100||pct>100){toast('El % debe estar entre -99 y 100','err');return;}
  const mult=1+pct/100;
  const cfInput=cfIn!=null&&Math.abs(cfIn-(+CFG.costo_fijo||0))>=0.01?cfIn:null;
  const cf=inflCf(mult,CFG.costo_fijo,cfInput);
  const rows=CAT.map(p=>inflRow(p,mult,CFG.costo_fijo,cfInput));
  const last=CFG.infl_fecha?new Date(CFG.infl_fecha):null,now=new Date();
  const sameMonth=last&&last.getFullYear()===now.getFullYear()&&last.getMonth()===now.getMonth();
  if(!confirm((sameMonth?`⚠ Este mes ya aplicaste ${CFG.inflacion}% el ${fmtDate(CFG.infl_fecha)}.\n\n`:'')+`Se van a actualizar los precios de ${CAT.length} perfumes un ${pct}%. El precio de compra no cambia: se guarda el ajuste por inflación.\n\n¿Continuar?`))return;
  _inflBusy=true;cov('ovInfl');
  $('pl').classList.add('on');$('plMsg').textContent='Actualizando precios…';
  syncToast('Aplicando '+pct+'%…','loading');
  const fails=[];
  try{
    for(let i=0;i<rows.length;i++){
      const{id,body}=rows[i];
      $('plMsg').textContent=`Actualizando precios… ${i+1}/${rows.length}`;
      try{
        const r=await fetch(`${SB_URL}/rest/v1/${TABLE}?id=eq.${id}`,{method:'PATCH',headers:SB_HDR,body:JSON.stringify(body)});
        if(!r.ok)throw new Error(await r.text());
      }catch(e){fails.push(CAT[i].nombre+' ('+e.message+')');}
    }
    const now1=await saveConfigVal('inflacion',pct);const now2=await saveConfigVal('costo_fijo',cf);
    CFG.inflacion=pct;CFG.infl_fecha=now1;CFG.costo_fijo=cf;CFG.cf_fecha=now2;
    CAT=await sbGet();await loadSales();ubadge();umf();rcat($('catq').value||'');
    $('ce').value=cf;
    if(fails.length){
      syncToast(`${fails.length} perfume(s) no se actualizaron`,'err');
      alert('Estos perfumes NO se actualizaron (no vuelvas a aplicar la inflación a todos; editá estos a mano):\n\n'+fails.join('\n'));
    }else syncToast('Precios actualizados — '+CAT.length+' perfumes','ok');
  }catch(e){syncToast(e.message,'err');}
  finally{_inflBusy=false;$('pl').classList.remove('on');$('plMsg').textContent='Generando PDF…';}
}

async function toggleStock(key){
  const p=CAT.find(x=>x.key===key);if(!p||p._busy)return;
  const nuevo=p.stock==='in'?'out':'in';p._busy=true;
  try{
    await sbOk(await fetch(`${SB_URL}/rest/v1/${TABLE}?id=eq.${p.dbId}`,{method:'PATCH',headers:SB_HDR,body:JSON.stringify({stock:nuevo==='in'})}));
    p.stock=nuevo;rcat($('catq').value||'');toast(`${p.nombre}: ${nuevo==='in'?'en stock':'sin stock'}`);
  }catch(e){syncToast(e.message,'err');}
  finally{delete p._busy;}
}
function toggleFilters(){$('vcat').querySelector('.toolbar').classList.toggle('show-f');}
function updFilterBadge(){
  const n=['fm','ft','fs','fo'].filter(id=>$(id).value).length;
  $('bflt').textContent=n?`Filtros (${n})`:'Filtros';
}
