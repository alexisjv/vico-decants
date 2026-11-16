document.addEventListener('keydown',e=>{if(e.key==='Escape')document.querySelectorAll('.ov.on').forEach(o=>o.classList.remove('on'));});
document.querySelectorAll('input[type=range]').forEach(usl);
initLogos();
(async()=>{
  let s=null;try{s=JSON.parse(localStorage.getItem('vico_session')||'null');}catch{}
  if(!s||!s.refresh_token)return;
  SESSION=s;
  if(await refreshSession())enterApp();
})();
