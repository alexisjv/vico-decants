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
  const btn=$('bDrive');
  btn.disabled=true;btn.textContent='…';
  $('pl').classList.add('on');
  $('plMsg').textContent='Generando PDF…';
  try{
    const[blob,token]=await Promise.all([xpdf(true),tokenPromise]);
    if(!blob)throw new Error('No se pudo generar el PDF');
    $('plMsg').textContent='Subiendo a Drive…';
    let fileId=CFG.drive_pdf_id;
    if(fileId){
      const r=await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,{
        method:'PATCH',headers:{'Authorization':'Bearer '+token,'Content-Type':'application/pdf'},body:blob
      });
      if(!r.ok){
        if(r.status===404){fileId='';}
        else throw new Error('Error actualizando archivo ('+r.status+')');
      }
    }
    if(!fileId){
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
      const rp=await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`,{
        method:'POST',headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'},
        body:JSON.stringify({role:'reader',type:'anyone'})
      });
      if(!rp.ok)throw new Error('PDF subido pero no se pudo hacer público ('+rp.status+')');
      await saveDriveId(fileId);
    }
    const link=`https://drive.google.com/file/d/${fileId}/view`;
    let copied=false;try{await navigator.clipboard.writeText(link);copied=true;}catch{}
    toast('¡PDF subido a Drive!'+(copied?' Link copiado: ':' Link: ')+link,'ok',8000);
  }catch(err){
    console.error(err);
    if(err.message?.includes('401')||err.message?.includes('invalid_token'))_gToken=null;
    alert('Error: '+err.message);
  }finally{
    btn.disabled=false;btn.textContent='↑ Drive';
    $('pl').classList.remove('on');
    $('plMsg').textContent='Generando PDF…';
  }
}
