import { getApps } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

function portalAuth(){
  const app=getApps().find(a=>a.options?.projectId==="must-resource-center-portal");
  return app?getAuth(app):null;
}

function withGoogleAccount(url,email){
  try{
    const u=new URL(url,location.href);
    if(!/\bgoogle\.com$|\.google\.com$|googleusercontent\.com$/.test(u.hostname)) return url;
    if(email) u.searchParams.set("authuser",email);
    return u.toString();
  }catch{return url;}
}

document.addEventListener("click",e=>{
  const btn=e.target.closest?.('#fileExchangePage [data-open]');
  if(!btn) return;
  const raw=btn.dataset.open||"";
  if(!raw) return;
  const email=String(portalAuth()?.currentUser?.email||"").trim().toLowerCase();
  e.preventDefault();
  e.stopImmediatePropagation();
  window.open(withGoogleAccount(raw,email),"_blank","noopener");
},true);
