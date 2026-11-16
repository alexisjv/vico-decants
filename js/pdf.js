async function imgParaPdf(src){
  if(!src)return null;
  try{
    const b=await(await fetch(src)).blob();
    const d=await new Promise((res,rej)=>{const fr=new FileReader();fr.onload=e=>res(e.target.result);fr.onerror=rej;fr.readAsDataURL(b);});
    if(/^data:image\/(png|jpe?g);/.test(d))return d;
    const img=new Image();img.src=d;await img.decode();
    const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;
    c.getContext('2d').drawImage(img,0,0);
    return c.toDataURL('image/png');
  }catch(e){console.warn('PDF imagen:',src.slice(0,80),e);return null;}
}
function pdfImg(doc,d,x,y,w,h){
  if(!d)return;
  try{doc.addImage(d,d.startsWith('data:image/png')?'PNG':'JPEG',x,y,w,h,'','FAST');}
  catch(e){console.warn('PDF imagen no agregada:',e);}
}
async function xpdf(_returnBlob=false){
  if(!CAT.length){alert('No hay perfumes.');return;}
  if(!_returnBlob)$('pl').classList.add('on');
  try{
    if(!window.jspdf)await new Promise((res,rej)=>{const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';s.onload=res;s.onerror=rej;document.head.appendChild(s);});
    const{jsPDF}=window.jspdf;
    const doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
    const PW=210,PH=297;
    const now=new Date();
    const ds=now.toLocaleDateString('es-AR',{day:'2-digit',month:'long',year:'numeric'});
    const ai=(d,x,y,w,h)=>pdfImg(doc,d,x,y,w,h);
    const fi=imgParaPdf;

    const M=4;
    const TW=PW-M*2;
    const cW={perf:22,nom:60,p25:24,p5:24,p10:24,inspo:22,info:26};
    let xPos=M;
    const cX={};
    for(const k of['perf','nom','p25','p5','p10','inspo','info']){cX[k]=xPos;xPos+=cW[k];}
    const cx=k=>cX[k]+cW[k]/2;

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
      for(const k of['nom','p25','p5','p10','inspo','info']){doc.line(cX[k],y,cX[k],y+h);}
      doc.line(M+TW,y,M+TW,y+h);
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
    function tipoRank(t){const n=(t||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();if(n==='nicho')return 0;if(n==='disenador')return 1;if(n==='arabe')return 2;return 3;}
    const catSorted=[...CAT].sort((a,b)=>tipoRank(a.tipo)-tipoRank(b.tipo));
    const brandsSeen=new Set();const brandList=[];
    for(const p of catSorted){const m=p.marca||'Sin marca';if(!brandsSeen.has(m)){brandsSeen.add(m);brandList.push(m);}}

    const IMG={};
    await Promise.all([...new Set(CAT.flatMap(p=>[p.img,p.inspo]).filter(Boolean))].map(async u=>{IMG[u]=await fi(u);}));
    for(const brand of brandList){
      const items=catSorted.filter(p=>(p.marca||'Sin marca')===brand);
      if(curY+7>PAGE_BOT)curY=newpage();
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
        doc.setDrawColor(185,180,174);doc.setLineWidth(.18);doc.line(M,ry+ROW_H,M+TW,ry+ROW_H);
        drawSeps(ry,ROW_H,185,180,174,.18);
        const ink=io?[158,154,149]:[28,25,22];
        const midY=ry+ROW_H/2+1.4;

        const imgD=IMG[p.img]||null;
        if(imgD){
          const ix=cx('perf')-IMG_W/2, iy=ry+(ROW_H-IMG_H)/2;
          if(io){
            ai(imgD,ix,iy,IMG_W,IMG_H);
            try{doc.saveGraphicsState();if(doc.setGState)doc.setGState(doc.GState({opacity:.45}));doc.setFillColor(rr,rg,rb);doc.rect(ix,iy,IMG_W,IMG_H,'F');doc.restoreGraphicsState();}catch{doc.setFillColor(rr,rg,rb);doc.rect(ix,iy,IMG_W,IMG_H,'F');}
          }else{ai(imgD,ix,iy,IMG_W,IMG_H);}
        }

        doc.setFont('helvetica','bold');doc.setFontSize(9.5);doc.setTextColor(...ink);
        const nl=doc.splitTextToSize(p.nombre||'—',cW.nom-3),nc=Math.min(nl.length,2),lh=5;
        const ny=ry+ROW_H/2-(nc*lh)/2+lh*.85;
        nl.slice(0,2).forEach((l,i)=>doc.text(l,cx('nom'),ny+i*lh,{align:'center'}));

        doc.setFont('helvetica','bold');doc.setFontSize(10.5);doc.setTextColor(...ink);
        [['p25',p.p25],['p5',p.p5],['p10',p.p10]].forEach(([k,v])=>doc.text('$'+f(v),cx(k),midY,{align:'center'}));

        const insD=IMG[p.inspo]||null;
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
    doc.save('vico-catalogo-'+today()+'.pdf');
  }catch(err){console.error(err);alert('Error: '+err.message);}
  finally{if(!_returnBlob)$('pl').classList.remove('on');}
}

function openFolModal(){
  const list=CAT.filter(p=>p.stock==='in');
  const pre=new Set(list.slice(0,4).map(p=>p.key));
  $('folList').innerHTML=list.map(p=>`<label class="fol-row"><input type="checkbox" value="${p.key}" ${pre.has(p.key)?'checked':''} onchange="updFolCount()"><span>${esc(p.nombre)}</span><small>${esc(p.marca)}</small></label>`).join('')||'<p class="aj-info">No hay perfumes en stock.</p>';
  updFolCount();$('ovFol').classList.add('on');
}
function updFolCount(){
  const sel=[...document.querySelectorAll('#folList input:checked')];
  document.querySelectorAll('#folList input').forEach(c=>{c.disabled=!c.checked&&sel.length>=4;});
  $('folN').textContent=`${sel.length} de 4`;$('folGo').disabled=!sel.length;
}
function goFolleto(){const keys=[...document.querySelectorAll('#folList input:checked')].map(c=>c.value);cov('ovFol');xFolleto(keys);}
async function xFolleto(keys) {
  if (!CAT.length) { alert('No hay perfumes en el catálogo.'); return; }
  let items = keys ? keys.map(k => CAT.find(p => p.key === k)).filter(Boolean).slice(0, 4) : CAT.filter(p => p.stock === 'in').slice(0, 4);
  if (!items.length) items = CAT.slice(0, 4);
  $('pl').classList.add('on');
  $('plMsg').textContent = 'Generando folleto…';
  try {
    if (!window.jspdf) await new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      s.onload = res; s.onerror = rej; document.head.appendChild(s);
    });
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const PW = 210, PH = 297;

    const fi = imgParaPdf;
    const ai = (d, x, y, w, h) => pdfImg(doc, d, x, y, w, h);
    const tri = (x1, y1, x2, y2, x3, y3) =>
      doc.lines([[x2 - x1, y2 - y1], [x3 - x2, y3 - y2]], x1, y1, [1, 1], 'F', true);

    const now = new Date();
    const ds = now.toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });

    const loaded = await Promise.all([fi(LOGO), fi(IG), fi(WA), fi(TT), ...items.map(p => fi(p.img))]);
    const [logoD, igD, waD, ttD] = loaded;
    const perfImgs = loaded.slice(4);

    doc.setFillColor(237, 234, 227);
    doc.rect(0, 0, PW, PH, 'F');

    doc.setFillColor(228, 222, 208);
    tri(PW * 0.38, 0, PW, 0, PW, PH * 0.52);
    doc.setFillColor(232, 227, 215);
    tri(PW * 0.55, 0, PW, 0, PW, PH * 0.3);

    const HDR = 52;
    doc.setFillColor(28, 25, 22);
    doc.rect(0, 0, PW, HDR, 'F');

    doc.setFillColor(184, 147, 90);
    tri(PW * 0.58, 0, PW, 0, PW, HDR);
    doc.setFillColor(28, 25, 22);
    tri(PW * 0.74, 0, PW, 0, PW, HDR * 0.5);

    if (logoD) ai(logoD, 12, (HDR - 22) / 2, 22, 22);

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

    doc.setDrawColor(184, 147, 90); doc.setLineWidth(1.1);
    doc.line(0, HDR, PW, HDR);

    const layout = [
      { x: 10,  y: 60,  imgW: 72, imgH: 92, textAlign: 'left'   },
      { x: 116, y: 57,  imgW: 56, imgH: 72, textAlign: 'right'  },
      { x: 14,  y: 174, imgW: 56, imgH: 72, textAlign: 'left'   },
      { x: 112, y: 170, imgW: 72, imgH: 92, textAlign: 'right'  },
    ];

    const DIV_Y = 160;
    doc.setDrawColor(184, 147, 90); doc.setLineWidth(0.5);
    doc.line(12, DIV_Y, PW - 12, DIV_Y);
    const rX = PW / 2, rY = DIV_Y;
    doc.setFillColor(184, 147, 90);
    doc.lines([[4, -4], [4, 4], [-4, 4], [-4, -4]], rX - 4, rY, [1, 1], 'F', true);
    doc.setFillColor(237, 234, 227);
    doc.lines([[2.2, -2.2], [2.2, 2.2], [-2.2, 2.2], [-2.2, -2.2]], rX - 2.2, rY, [1, 1], 'F', true);

    for (let i = 0; i < 4; i++) {
      const p = items[i];
      if (!p) continue;
      const { x, y, imgW, imgH, textAlign } = layout[i];
      const cx = x + imgW / 2;

      doc.setFillColor(200, 196, 188);
      doc.roundedRect(x + 3, y + 4, imgW, imgH, 5, 5, 'F');

      doc.setFillColor(250, 248, 243);
      doc.roundedRect(x, y, imgW, imgH, 5, 5, 'F');

      if (perfImgs[i]) {
        const pad = 6;
        ai(perfImgs[i], x + pad, y + pad, imgW - pad * 2, imgH - pad * 2);
      } else {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(28);
        doc.setTextColor(210, 205, 195);
        doc.text('◈', cx, y + imgH / 2 + 7, { align: 'center' });
      }

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

      const textX = textAlign === 'left' ? x : x + imgW;
      const tAlign = textAlign === 'left' ? 'left' : 'right';
      let tY = y + imgH + 7;

      doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
      doc.setTextColor(28, 25, 22);
      const maxW = imgW;
      const nl = doc.splitTextToSize(p.nombre || '—', maxW);
      nl.slice(0, 2).forEach((l, li) => doc.text(l, textX, tY + li * 6, { align: tAlign }));
      tY += Math.min(nl.length, 2) * 6 + 1.5;

      if (p.marca) {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
        doc.setTextColor(122, 114, 104);
        doc.text(p.marca, textX, tY, { align: tAlign });
        tY += 5.5;
      }

      doc.setDrawColor(184, 147, 90); doc.setLineWidth(0.4);
      if (textAlign === 'left') doc.line(x, tY, x + imgW * 0.6, tY);
      else doc.line(x + imgW * 0.4, tY, x + imgW, tY);
      tY += 5;

      doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5);
      doc.setTextColor(28, 25, 22);
      const pLine = `$${f(p.p25)}  ·  $${f(p.p5)}  ·  $${f(p.p10)}`;
      doc.text(pLine, textX, tY, { align: tAlign });
      tY += 4.5;

      doc.setFont('helvetica', 'normal'); doc.setFontSize(5.5);
      doc.setTextColor(150, 143, 134);
      const mlLine = '2.5 ml              5 ml             10 ml';
      doc.text(mlLine, textX, tY, { align: tAlign });
    }

    const FTR_H = 22;
    const FY = PH - FTR_H;
    doc.setFillColor(28, 25, 22);
    doc.rect(0, FY, PW, FTR_H, 'F');

    doc.setFillColor(184, 147, 90);
    tri(0, FY, PW * 0.42, FY, 0, PH);
    doc.setFillColor(28, 25, 22);
    tri(0, FY + FTR_H * 0.5, PW * 0.26, FY, 0, PH);

    doc.setDrawColor(184, 147, 90); doc.setLineWidth(0.9);
    doc.line(0, FY, PW, FY);

    const SZF = 8, fsx = PW / 2 - (3 * SZF + 2 * 5) / 2;
    [igD, waD, ttD].forEach((d, i) => { if (d) ai(d, fsx + i * (SZF + 5), FY + (FTR_H - SZF) / 2, SZF, SZF); });

    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setCharSpace(2);
    doc.setTextColor(232, 228, 220);
    doc.text('@VICO.DECANTS', PW / 2, FY + 9, { align: 'center' });
    doc.setCharSpace(0);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6);
    doc.setTextColor(110, 104, 96);
    doc.text('Decants a medida  ·  Precios al ' + ds, PW / 2, FY + 16, { align: 'center' });

    doc.save('vico-folleto-' + today() + '.pdf');
  } catch (err) {
    console.error(err); alert('Error generando folleto: ' + err.message);
  } finally {
    $('pl').classList.remove('on');
    $('plMsg').textContent = 'Generando PDF…';
  }
}
