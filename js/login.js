function showLogin(msg){
  $('login-screen').style.display='';
  $('nav').style.display='none';
  const e=$('lerr');e.textContent=msg||'';e.style.display=msg?'block':'none';
}
async function enterApp(){
  $('login-screen').style.display='none';
  $('nav').style.display='flex';
  await loadConfig();
  sv('vc');loadDB();loadPedidos();initGIS();
}
async function doLogin(){
  const email=$('lemail').value.trim(),pwd=$('lpwd').value;
  if(!email||!pwd){showLogin('Completá email y contraseña');return;}
  try{setSession(await authToken('password',{email,password:pwd}));$('lpwd').value='';await enterApp();}
  catch(e){
    showLogin(/invalid/i.test(e.message)?'Email o contraseña incorrectos':e.message);
    $('lpwd').style.borderColor='var(--red)';
    setTimeout(()=>$('lpwd').style.borderColor='',1800);
  }
}
async function doLogout(){
  try{await fetch(`${SB_URL}/auth/v1/logout`,{method:'POST',headers:SB_HDR});}catch{}
  setSession(null);location.reload();
}
['lemail','lpwd'].forEach(id=>$(id).addEventListener('keydown',e=>{if(e.key==='Enter')doLogin();}));
