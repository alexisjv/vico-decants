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

let _charts={};
async function renderDashboard(){
  if(!window.Chart){
    await new Promise((res,rej)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';s.onload=res;s.onerror=rej;document.head.appendChild(s);});
  }
  const DONE=PEDIDOS.filter(p=>p.estado==='terminado');
  const totalV=DONE.reduce((s,p)=>s+(p.total_venta||0),0);
  const totalC=DONE.reduce((s,p)=>s+(p.total_costo||0),0);
  const pend=PEDIDOS.filter(p=>p.estado==='pendiente').length;
  const term=PEDIDOS.filter(p=>p.estado==='terminado').length;
  $('dKpiPedidos').textContent=PEDIDOS.length;
  $('dKpiVenta').textContent='$'+f(totalV);
  $('dKpiGan').textContent='$'+f(totalV-totalC);
  $('dKpiPend').textContent=pend;
  $('dKpiTerm').textContent=term;
  const pct=PEDIDOS.length?Math.round(pend/PEDIDOS.length*100):0;
  const estKpi=$('dKpiEstado');
  if(pend===0){estKpi.innerHTML=`<div class="est-dot-badge ok"></div><div class="dkpi-l" style="margin-bottom:6px">Estado</div><div class="est-kpi-status ok">Todo al día</div>`;}
  else if(pct<40){estKpi.innerHTML=`<div class="est-dot-badge warn"></div><div class="dkpi-l" style="margin-bottom:6px">Estado</div><div class="est-kpi-status warn">${pend} pendiente${pend!==1?'s':''}</div>`;}
  else{estKpi.innerHTML=`<div class="est-dot-badge alert"></div><div class="dkpi-l" style="margin-bottom:6px">Estado</div><div class="est-kpi-status alert">¡${pend} pendientes!</div>`;};
  const months=[];const now=new Date();
  for(let i=5;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1);months.push({label:d.toLocaleDateString('es-AR',{month:'short',year:'2-digit'}),key:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`});}
  const mV=months.map(m=>DONE.filter(p=>p.fecha&&p.fecha.startsWith(m.key)).reduce((s,p)=>s+(p.total_venta||0),0));
  const mG=months.map(m=>DONE.filter(p=>p.fecha&&p.fecha.startsWith(m.key)).reduce((s,p)=>s+(p.total_venta||0)-(p.total_costo||0),0));
  Object.values(_charts).forEach(c=>{try{c.destroy();}catch{}});_charts={};
  const CO={responsive:true,maintainAspectRatio:true};
  const tickC={color:'#7a7268',font:{size:10,family:'Inter'}};
  const gridC={color:'rgba(30,27,24,.06)'};
  _charts.m=new Chart($('chMensual'),{type:'line',data:{labels:months.map(m=>m.label),datasets:[{label:'Ventas',data:mV,borderColor:'rgba(184,147,90,.9)',backgroundColor:'rgba(184,147,90,.08)',tension:.35,fill:true,pointRadius:4,pointBackgroundColor:'rgba(184,147,90,.9)'},{label:'Ganancia',data:mG,borderColor:'rgba(59,107,72,.85)',backgroundColor:'rgba(59,107,72,.06)',tension:.35,fill:true,pointRadius:4,pointBackgroundColor:'rgba(59,107,72,.85)'}]},options:{...CO,plugins:{legend:{labels:{color:'#7a7268',font:{size:10,family:'Inter'},boxWidth:12}}},scales:{x:{ticks:tickC,grid:gridC},y:{ticks:{...tickC,callback:v=>'$'+f(v)},grid:gridC}}}});
  const allIds=DONE.map(p=>p.id);
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
  _charts.t=new Chart($('chTop'),{type:'bar',data:{labels:top.map(p=>p.nombre.length>20?p.nombre.slice(0,18)+'…':p.nombre),datasets:[{label:'Unidades vendidas',data:top.map(p=>p.qty),backgroundColor:'rgba(184,147,90,.72)',borderRadius:4}]},options:{...CO,plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>`${ctx.parsed.y} unidad${ctx.parsed.y!==1?'es':''}`}}},scales:{x:{ticks:tickC,grid:{display:false}},y:{ticks:{...tickC,stepSize:1},grid:gridC}}}});
  const tipos=[{l:'Nicho',v:'Nicho'},{l:'Diseñador',v:'Diseñador'},{l:'Árabe',v:'Arabe'}];
  const tData=tipos.map(t=>CAT.filter(p=>p.tipo===t.v).length);
  _charts.tp=new Chart($('chTipo'),{type:'doughnut',data:{labels:tipos.map(t=>t.l),datasets:[{data:tData,backgroundColor:['rgba(184,147,90,.72)','rgba(59,107,72,.65)','rgba(90,120,184,.65)'],borderWidth:0,hoverOffset:4}]},options:{...CO,cutout:'62%',plugins:{legend:{position:'bottom',labels:{color:'#7a7268',font:{size:10,family:'Inter'},boxWidth:12,padding:10}}}}});
  const decantSorted=Object.entries(decantPerf).map(([n,s])=>({n,total:s[2.5]+s[5]+s[10],s})).sort((a,b)=>b.total-a.total).slice(0,10);
  const dLabels=decantSorted.map(d=>d.n.length>18?d.n.slice(0,16)+'…':d.n);
  _charts.d=new Chart($('chDecants'),{type:'bar',data:{labels:dLabels,datasets:[{label:'2.5ml',data:decantSorted.map(d=>d.s[2.5]),backgroundColor:'rgba(184,147,90,.75)',borderRadius:3},{label:'5ml',data:decantSorted.map(d=>d.s[5]),backgroundColor:'rgba(59,107,72,.70)',borderRadius:3},{label:'10ml',data:decantSorted.map(d=>d.s[10]),backgroundColor:'rgba(90,120,184,.70)',borderRadius:3}]},options:{...CO,plugins:{legend:{labels:{color:'#7a7268',font:{size:10,family:'Inter'},boxWidth:12}}},scales:{x:{ticks:{...tickC,font:{size:9,family:'Inter'}},grid:{display:false}},y:{ticks:{...tickC,stepSize:1},grid:gridC}}}});
}
