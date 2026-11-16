async function downloadBackup(){
  syncToast('Generando backup…','loading');
  try{
    const out={fecha:new Date().toISOString()};
    for(const t of['Perfumes','Pedidos','PedidosItems','Configuracion']){
      out[t]=[];
      for(let off=0;;off+=1000){
        const rows=await(await sbOk(await fetch(`${SB_URL}/rest/v1/${t}?select=*${t==='Configuracion'?'':'&order=id.asc'}&limit=1000&offset=${off}`,{headers:SB_HDR}))).json();
        out[t].push(...rows);if(rows.length<1000)break;
      }
    }
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(out,null,1)],{type:'application/json'}));
    a.download=`vico-backup-${today()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),5000);
    syncToast(`Backup descargado (${out.Perfumes.length} perfumes, ${out.Pedidos.length} pedidos)`,'ok');
  }catch(e){syncToast('Backup: '+e.message,'err');}
}

let _charts={},_dashItems=null;
const PERIODOS={mes:'Este mes',m3:'Últimos 3 meses',m6:'Últimos 6 meses',m12:'Últimos 12 meses',todo:'Todo'};
function rangoPeriodo(k){
  const now=new Date(),ymd=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const meses={mes:1,m3:3,m6:6,m12:12}[k];
  if(!meses)return{desde:'',hasta:'9999',prevDesde:null,prevHasta:null,meses:0};
  const desde=new Date(now.getFullYear(),now.getMonth()-meses+1,1),prev=new Date(now.getFullYear(),now.getMonth()-2*meses+1,1);
  const finMesPrev=new Date(now.getFullYear(),now.getMonth()-meses+1,0).getDate();
  const corte=new Date(now.getFullYear(),now.getMonth()-meses,Math.min(now.getDate(),finMesPrev)+1);
  return{desde:ymd(desde),hasta:'9999',prevDesde:ymd(prev),prevHasta:ymd(corte),meses};
}
function enRango(fecha,desde,hasta){const d=(fecha||'').slice(0,10);return d>=desde&&d<hasta;}
async function dashItems(){
  if(_dashItems)return _dashItems;
  const out=[];
  for(let off=0;;off+=1000){
    const rows=await(await sbOk(await fetch(`${SB_URL}/rest/v1/PedidosItems?select=pedido_id,perfume_id,perfume_nombre,ml,qty,precio_unit,costo_unit&order=id.asc&limit=1000&offset=${off}`,{headers:SB_HDR}))).json();
    out.push(...rows);if(rows.length<1000)break;
  }
  return _dashItems=out;
}
function dashDelta(el,act,prev){
  if(prev==null){el.textContent='';return;}
  if(!prev){el.textContent=act?'Primer período con ventas':'';el.className='dkpi-s';return;}
  const p=Math.round((act-prev)/prev*100);
  el.textContent=`${p>=0?'▲':'▼'} ${Math.abs(p)}% vs mismos días del período anterior`;
  el.className='dkpi-s '+(p>=0?'up':'down');
}
async function renderDashboard(){
  if(!window.Chart){
    await new Promise((res,rej)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';s.onload=res;s.onerror=rej;document.head.appendChild(s);});
  }
  const per=$('dPeriodo').value,R=rangoPeriodo(per);
  const DONE=PEDIDOS.filter(p=>p.estado==='terminado');
  const act=DONE.filter(p=>enRango(p.fecha,R.desde,R.hasta));
  const prev=R.prevDesde?DONE.filter(p=>enRango(p.fecha,R.prevDesde,R.prevHasta)):null;
  const suma=(l,k)=>l.reduce((s,p)=>s+(p[k]||0),0);
  const venta=suma(act,'total_venta'),costo=suma(act,'total_costo'),gan=venta-costo;
  let items=[];
  try{items=await dashItems();}catch(e){console.warn('Dashboard:',e);}
  const ids=new Set(act.map(p=>p.id));
  const its=items.filter(i=>ids.has(i.pedido_id));
  const unidades=its.reduce((s,i)=>s+(i.qty||1),0),ml=its.reduce((s,i)=>s+(+i.ml||0)*(i.qty||1),0);
  $('dKpiVenta').textContent='$'+f(venta);
  dashDelta($('dKpiVentaDelta'),venta,prev?suma(prev,'total_venta'):null);
  $('dKpiGan').textContent='$'+f(gan);
  $('dKpiMargen').textContent=venta?`Margen ${Math.round(gan/venta*100)}% de la venta`:'';
  $('dKpiTicket').textContent=act.length?'$'+f(venta/act.length):'—';
  $('dKpiTicketSub').textContent=`${act.length} pedido${act.length!==1?'s':''} terminado${act.length!==1?'s':''}`;
  $('dKpiDecants').textContent=unidades;
  $('dKpiMl').textContent=`${fd(ml)} ml vendidos`;
  const pendL=PEDIDOS.filter(p=>p.estado==='pendiente');
  $('dKpiPend').textContent=pendL.length;
  $('dKpiPendMonto').textContent=pendL.length?`$${f(suma(pendL,'total_venta'))} a cobrar`:'Todo al día';
  $('dKpiPend').className='dkpi-v '+(pendL.length?'gold':'grn');
  const porCliente={};
  act.forEach(p=>{const n=(p.cliente_nombre||'').trim().replace(/\s+/g,' ');if(!n)return;const k=n.toLowerCase();porCliente[k]=porCliente[k]||{n,v:0,c:0};porCliente[k].v+=p.total_venta||0;porCliente[k].c++;});
  const clientes=Object.values(porCliente);
  $('dKpiClientes').textContent=clientes.length;
  const rep=clientes.filter(c=>c.c>1).length;
  $('dKpiClientesSub').textContent=`${rep} ${rep===1?'repitió':'repitieron'} compra`;
  $('dPerLbl').textContent=PERIODOS[per];

  const now=new Date(),nMeses=Math.max(6,R.meses||(()=>{const f0=DONE.map(p=>p.fecha).filter(Boolean).sort()[0];if(!f0)return 6;const d=new Date(f0+'T00:00:00');return Math.min(24,(now.getFullYear()-d.getFullYear())*12+now.getMonth()-d.getMonth()+1);})());
  const months=[];
  for(let i=nMeses-1;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1);months.push({label:d.toLocaleDateString('es-AR',{month:'short',year:'2-digit'}),key:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`});}
  const delMes=m=>DONE.filter(p=>p.fecha&&p.fecha.startsWith(m.key));
  const mV=months.map(m=>suma(delMes(m),'total_venta'));
  const mG=months.map(m=>suma(delMes(m),'total_venta')-suma(delMes(m),'total_costo'));

  Object.values(_charts).forEach(c=>{try{c.destroy();}catch{}});_charts={};
  const CO={responsive:true,maintainAspectRatio:false};
  const tickC={color:'#7a7268',font:{size:10,family:'Inter'}};
  const gridC={color:'rgba(30,27,24,.06)'};
  const leg={labels:{color:'#7a7268',font:{size:10,family:'Inter'},boxWidth:12}};
  const C1='rgba(184,147,90,.8)',C2='rgba(59,107,72,.75)',C3='rgba(90,120,184,.72)';
  _charts.m=new Chart($('chMensual'),{type:'line',data:{labels:months.map(m=>m.label),datasets:[{label:'Ventas',data:mV,borderColor:C1,backgroundColor:'rgba(184,147,90,.08)',tension:.35,fill:true,pointRadius:3,pointBackgroundColor:C1},{label:'Ganancia',data:mG,borderColor:C2,backgroundColor:'rgba(59,107,72,.06)',tension:.35,fill:true,pointRadius:3,pointBackgroundColor:C2}]},options:{...CO,plugins:{legend:leg,tooltip:{callbacks:{label:c=>`${c.dataset.label}: $${f(c.parsed.y)}`}}},scales:{x:{ticks:tickC,grid:gridC},y:{ticks:{...tickC,callback:v=>'$'+f(v)},grid:gridC}}}});

  const porTam={2.5:0,5:0,10:0};
  its.forEach(i=>{const k=+i.ml;if(k in porTam)porTam[k]+=i.qty||1;});
  _charts.tam=new Chart($('chTamanos'),{type:'doughnut',data:{labels:['2,5 ml','5 ml','10 ml'],datasets:[{data:[porTam[2.5],porTam[5],porTam[10]],backgroundColor:[C1,C2,C3],borderWidth:0,hoverOffset:4}]},options:{...CO,cutout:'62%',plugins:{legend:{...leg,position:'bottom'}}}});

  const porPerf={};
  its.forEach(i=>{const k=i.perfume_nombre||'?';const t=porPerf[k]=porPerf[k]||{q:0,v:0,s:{2.5:0,5:0,10:0}};t.q+=i.qty||1;t.v+=(i.precio_unit||0)*(i.qty||1);const m=+i.ml;if(m in t.s)t.s[m]+=i.qty||1;});
  const corto=n=>n.length>20?n.slice(0,18)+'…':n;
  const top=Object.entries(porPerf).sort((a,b)=>b[1].q-a[1].q||b[1].v-a[1].v).slice(0,5);
  _charts.t=new Chart($('chTop'),{type:'bar',data:{labels:top.map(([n])=>corto(n)),datasets:[{label:'Unidades',data:top.map(([,t])=>t.q),backgroundColor:C1,borderRadius:4}]},options:{...CO,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>`${c.parsed.y} u. · $${f(top[c.dataIndex][1].v)}`}}},scales:{x:{ticks:tickC,grid:{display:false}},y:{ticks:{...tickC,stepSize:1},grid:gridC}}}});

  const tipos=[{l:'Nicho',v:'Nicho'},{l:'Diseñador',v:'Diseñador'},{l:'Árabe',v:'Arabe'}];
  _charts.tp=new Chart($('chTipo'),{type:'doughnut',data:{labels:tipos.map(t=>t.l),datasets:[{data:tipos.map(t=>CAT.filter(p=>p.tipo===t.v).length),backgroundColor:[C1,C2,C3],borderWidth:0,hoverOffset:4}]},options:{...CO,cutout:'62%',plugins:{legend:{...leg,position:'bottom'}}}});

  const dec=Object.entries(porPerf).map(([n,t])=>({n,t})).sort((a,b)=>b.t.q-a.t.q).slice(0,10);
  _charts.d=new Chart($('chDecants'),{type:'bar',data:{labels:dec.map(d=>corto(d.n)),datasets:[{label:'2,5 ml',data:dec.map(d=>d.t.s[2.5]),backgroundColor:C1,borderRadius:3},{label:'5 ml',data:dec.map(d=>d.t.s[5]),backgroundColor:C2,borderRadius:3},{label:'10 ml',data:dec.map(d=>d.t.s[10]),backgroundColor:C3,borderRadius:3}]},options:{...CO,plugins:{legend:leg},scales:{x:{ticks:{...tickC,font:{size:9,family:'Inter'}},grid:{display:false}},y:{ticks:{...tickC,stepSize:1},grid:gridC}}}});

  const topC=clientes.sort((a,b)=>b.v-a.v).slice(0,5);
  $('dClientes').innerHTML=topC.length?topC.map((c,i)=>`<li><span class="drk">${i+1}</span><span class="dnm">${esc(c.n)}</span><span class="dvl">$${f(c.v)}<small>${c.c} pedido${c.c!==1?'s':''}</small></span></li>`).join(''):'<li class="dempty">Sin ventas en el período</li>';
  const vendidos=new Set(its.map(i=>i.perfume_id));
  const sinV=CAT.filter(p=>p.stock==='in'&&!vendidos.has(p.dbId)).sort((a,b)=>(a.nombre||'').localeCompare(b.nombre||'','es'));
  $('dSinVentasN').textContent=sinV.length;
  $('dSinVentas').innerHTML=sinV.length?sinV.map(p=>`<li><span class="dnm">${esc(p.nombre)}</span><span class="dvl">${esc(p.marca||'')}</span></li>`).join(''):'<li class="dempty">Todos los perfumes en stock se vendieron</li>';
}
