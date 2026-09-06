import { getApps } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { getFirestore, doc, getDoc, getDocs, collection } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const FOLDER_MIME = "application/vnd.google-apps.folder";
const APP_MARK = "mustResourceExchange";
const CHUNK_SIZE = 8 * 1024 * 1024;
const $ = id => document.getElementById(id);
const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const norm = v => String(v || "").trim().toLowerCase();

let portalApp = null, auth = null, db = null, currentUser = null, profile = null;
let driveToken = "", partnerFolders = [], portalUsers = [], busy = false;

function injectUi(){
  if($("fileExchangeNavBtn")) return;
  const nav = $("mainNav");
  const home = nav?.querySelector('[data-page="home"]');
  if(nav){
    const btn = document.createElement("button");
    btn.id = "fileExchangeNavBtn";
    btn.className = "nav-btn";
    btn.dataset.page = "fileExchange";
    btn.textContent = "📁 檔案交換";
    btn.addEventListener("click", showFileExchange);
    home?.after(btn);
  }
  const main = document.querySelector("main");
  if(main){
    const section = document.createElement("section");
    section.id = "fileExchangePage";
    section.className = "page hidden";
    section.innerHTML = `
      <div class="section-heading"><div><span class="welcome-label">FILE EXCHANGE</span><h2>檔案交換</h2><p>老師與自己的小幫手直接透過 Google Drive 交換檔案，不需要 USB，也不需要安裝 Google Drive 桌面程式。</p></div></div>
      <div class="fx-status-grid">
        <article class="fx-status-card"><span>Google Drive</span><strong id="fxDriveStatus">尚未連線</strong><small id="fxDriveHint">首次使用請授權檔案交換功能。</small></article>
        <article class="fx-status-card"><span>交換對象</span><strong id="fxPartnerCount">—</strong><small id="fxPartnerHint">依入口平台的小幫手關係自動判斷。</small></article>
        <article class="fx-status-card"><span>傳輸方式</span><strong>8 MB 分段續傳</strong><small>網路短暫中斷時會自動重試，不必整份重傳。</small></article>
      </div>
      <div class="fx-toolbar">
        <button id="fxConnectBtn" class="btn primary">🔗 連接 Google Drive</button>
        <button id="fxSyncBtn" class="btn secondary" disabled>🔄 同步小幫手資料夾</button>
        <button id="fxRefreshBtn" class="btn ghost" disabled>↻ 重新整理</button>
      </div>
      <div id="fxError" class="fx-error hidden"></div>
      <div class="fx-layout">
        <section class="tab-panel fx-upload-panel">
          <div class="panel-toolbar"><div><h3>📤 上傳檔案</h3><p id="fxUploadDescription">連接 Google Drive 後即可使用。</p></div></div>
          <form id="fxUploadForm">
            <div id="fxRecipientField" class="field hidden"><label>傳送給</label><select id="fxRecipient"></select></div>
            <div class="field"><label>選擇檔案</label><input id="fxFileInput" type="file" multiple disabled></div>
            <div class="field"><label>備註（選填）</label><textarea id="fxNote" rows="3" maxlength="500" placeholder="例如：請協助整理後回傳"></textarea></div>
            <button id="fxUploadBtn" class="btn primary" disabled>開始上傳</button>
          </form>
          <div id="fxProgress" class="fx-progress-list"></div>
        </section>
        <section class="tab-panel fx-files-panel">
          <div class="panel-toolbar"><div><h3>📥 交換檔案</h3><p>只會顯示你有權限看到的交換資料夾。</p></div></div>
          <div id="fxFileList" class="fx-file-list"><div class="empty-state">尚未連接 Google Drive。</div></div>
        </section>
      </div>`;
    main.appendChild(section);
  }
  const style = document.createElement("style");
  style.textContent = `
    .fx-status-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin:16px 0}.fx-status-card{border:1px solid #dbeafe;border-radius:18px;background:#fff;padding:16px;display:flex;flex-direction:column;gap:5px}.fx-status-card span{font-size:13px;color:#64748b}.fx-status-card strong{font-size:18px;color:#0f172a}.fx-status-card small{color:#64748b;line-height:1.5}.fx-toolbar{display:flex;gap:10px;flex-wrap:wrap;margin:0 0 16px}.fx-layout{display:grid;grid-template-columns:minmax(300px,.9fr) minmax(420px,1.4fr);gap:16px}.fx-progress-list{display:grid;gap:8px;margin-top:12px}.fx-progress-item{padding:10px 12px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc}.fx-progress-top{display:flex;justify-content:space-between;gap:10px}.fx-bar{height:7px;background:#e2e8f0;border-radius:999px;overflow:hidden;margin-top:8px}.fx-bar>span{display:block;height:100%;background:#2563eb;width:0}.fx-file-list{display:grid;gap:10px}.fx-group{border:1px solid #e2e8f0;border-radius:16px;overflow:hidden}.fx-group-head{padding:12px 14px;background:#f8fafc;font-weight:700}.fx-file-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;padding:12px 14px;border-top:1px solid #eef2f7;align-items:center}.fx-file-name{font-weight:700;word-break:break-word}.fx-file-meta{font-size:12px;color:#64748b;margin-top:4px}.fx-file-note{font-size:13px;color:#475569;margin-top:5px;white-space:pre-wrap}.fx-file-actions{display:flex;gap:8px;align-items:center}.fx-direction{display:inline-block;font-size:11px;padding:2px 8px;border-radius:999px;background:#eef2ff;color:#4338ca;margin-right:6px}.fx-error{padding:12px 14px;border-radius:12px;background:#fff1f2;color:#be123c;border:1px solid #fecdd3;margin-bottom:14px}.fx-error.hidden{display:none}.fx-upload-panel textarea{resize:vertical}@media(max-width:900px){.fx-status-grid,.fx-layout{grid-template-columns:1fr}.fx-file-row{grid-template-columns:1fr}.fx-file-actions{justify-content:flex-start}}`;
  document.head.appendChild(style);
  $("fxConnectBtn")?.addEventListener("click", connectDrive);
  $("fxSyncBtn")?.addEventListener("click", syncFolders);
  $("fxRefreshBtn")?.addEventListener("click", refreshFiles);
  $("fxUploadForm")?.addEventListener("submit", uploadSelectedFiles);
}

async function waitPortal(){
  for(let i=0;i<100;i++){
    portalApp = getApps().find(a => a.options?.projectId === "must-resource-center-portal");
    if(portalApp) break;
    await new Promise(r=>setTimeout(r,50));
  }
  if(!portalApp) return;
  auth = getAuth(portalApp); db = getFirestore(portalApp);
  onAuthStateChanged(auth, async user => {
    currentUser = user; driveToken = ""; partnerFolders = [];
    if(!user){ profile = null; return; }
    const snap = await getDoc(doc(db,"portalUsers",norm(user.email))).catch(()=>null);
    profile = snap?.exists() ? {id:norm(user.email),...snap.data()} : null;
    if(profile) await loadPortalUsers();
    updateBasicUi();
  });
}

async function loadPortalUsers(){
  const snap = await getDocs(collection(db,"portalUsers"));
  portalUsers = snap.docs.map(d=>({id:d.id,...d.data()}));
}

function ownerEmail(){ return profile?.role === "assistant" ? norm(profile.ownerEmail) : norm(profile?.email || currentUser?.email); }
function myEmail(){ return norm(profile?.email || currentUser?.email); }
function myAssistants(){ const me = myEmail(); return portalUsers.filter(u=>u.role==="assistant" && u.enabled!==false && norm(u.ownerEmail)===me); }
function ownerProfile(){ const oe=ownerEmail(); return portalUsers.find(u=>norm(u.email||u.id)===oe); }
function displayName(u,email){ return u?.displayName || u?.name || email; }

function updateBasicUi(){
  if(!profile) return;
  if(profile.role==="assistant"){
    $("fxPartnerCount").textContent = displayName(ownerProfile(),ownerEmail());
    $("fxPartnerHint").textContent = "你只能與自己的個管老師交換檔案。";
    $("fxRecipientField").classList.add("hidden");
    $("fxUploadDescription").textContent = `上傳後會直接放入你與 ${displayName(ownerProfile(),ownerEmail())} 的交換資料夾。`;
  }else{
    const assistants=myAssistants();
    $("fxPartnerCount").textContent = `${assistants.length} 位小幫手`;
    $("fxPartnerHint").textContent = assistants.length ? "每位小幫手都有獨立資料夾，彼此看不到其他人的檔案。" : "目前沒有啟用中的小幫手。";
    $("fxRecipientField").classList.remove("hidden");
    $("fxRecipient").innerHTML = assistants.map(a=>`<option value="${esc(norm(a.email||a.id))}">${esc(displayName(a,norm(a.email||a.id)))}</option>`).join("");
    $("fxUploadDescription").textContent = "選擇一位小幫手後上傳；不同小幫手的檔案會分開存放。";
  }
}

function showFileExchange(){
  document.querySelectorAll(".page").forEach(x=>x.classList.add("hidden"));
  $("fileExchangePage")?.classList.remove("hidden");
  document.querySelectorAll(".nav-btn").forEach(b=>b.classList.toggle("active",b.id==="fileExchangeNavBtn"));
  if(profile) updateBasicUi();
}

async function connectDrive(){
  if(!auth?.currentUser) return showError("請先登入入口平台。");
  const btn=$("fxConnectBtn");
  try{
    btn.disabled=true; btn.textContent="連接中…"; hideError();
    const provider=new GoogleAuthProvider(); provider.setCustomParameters({prompt:"consent",login_hint:auth.currentUser.email}); provider.addScope(DRIVE_SCOPE);
    const result=await signInWithPopup(auth,provider);
    const cred=GoogleAuthProvider.credentialFromResult(result);
    driveToken=cred?.accessToken||"";
    if(!driveToken) throw new Error("沒有取得 Google Drive 授權權杖，請重新連線。");
    $("fxDriveStatus").textContent="已連線"; $("fxDriveHint").textContent="授權只保留在目前這個瀏覽器頁面，不會寫入資料庫。";
    $("fxSyncBtn").disabled=false; $("fxRefreshBtn").disabled=false;
    await syncFolders({silent:true}); await refreshFiles();
  }catch(e){
    console.error(e); showError(formatDriveError(e));
  }finally{ btn.disabled=false; btn.textContent="🔗 重新連接 Google Drive"; }
}

async function driveApi(path,options={}){
  if(!driveToken) throw new Error("請先連接 Google Drive。");
  const res=await fetch(`https://www.googleapis.com${path}`,{...options,headers:{Authorization:`Bearer ${driveToken}`,...(options.headers||{})}});
  const data=await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(data?.error?.message||`Google Drive API 錯誤（${res.status}）`);
  return data;
}

async function findExchangeFolders(){
  const q = `mimeType='${FOLDER_MIME}' and trashed=false and appProperties has { key='${APP_MARK}' and value='1' }`;
  const fields=encodeURIComponent("files(id,name,appProperties,permissions(id,emailAddress,role,type))");
  const data=await driveApi(`/drive/v3/files?q=${encodeURIComponent(q)}&spaces=drive&pageSize=1000&fields=${fields}`);
  return data.files||[];
}

async function createFolderForAssistant(assistant){
  const assistantEmail=norm(assistant.email||assistant.id), teacherEmail=myEmail();
  const metadata={name:`資源教室檔案交換｜${displayName(profile,teacherEmail)} ⇄ ${displayName(assistant,assistantEmail)}`,mimeType:FOLDER_MIME,appProperties:{[APP_MARK]:"1",ownerEmail:teacherEmail,assistantEmail}};
  const folder=await driveApi("/drive/v3/files?fields=id,name,appProperties",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(metadata)});
  await driveApi(`/drive/v3/files/${encodeURIComponent(folder.id)}/permissions?sendNotificationEmail=false&fields=id,emailAddress,role,type`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({type:"user",role:"writer",emailAddress:assistantEmail})});
  return folder;
}

async function ensureAssistantPermission(folder,assistantEmail){
  const exists=(folder.permissions||[]).some(p=>norm(p.emailAddress)===assistantEmail && ["writer","owner"].includes(p.role));
  if(exists) return;
  await driveApi(`/drive/v3/files/${encodeURIComponent(folder.id)}/permissions?sendNotificationEmail=false&fields=id,emailAddress,role,type`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({type:"user",role:"writer",emailAddress:assistantEmail})});
}

async function syncFolders({silent=false}={}){
  if(!driveToken) return showError("請先連接 Google Drive。");
  if(busy) return; busy=true;
  const btn=$("fxSyncBtn"); if(btn){btn.disabled=true;btn.textContent="同步中…";}
  try{
    hideError(); await loadPortalUsers(); updateBasicUi();
    const folders=await findExchangeFolders();
    if(profile.role==="assistant"){
      const mine=folders.filter(f=>norm(f.appProperties?.ownerEmail)===ownerEmail() && norm(f.appProperties?.assistantEmail)===myEmail());
      partnerFolders=mine.slice(0,1);
      if(!partnerFolders.length) throw new Error("尚未找到你的交換資料夾。請先請個管老師開啟「檔案交換」並按一次「同步小幫手資料夾」。");
    }else{
      const assistants=myAssistants(); partnerFolders=[];
      for(const a of assistants){
        const ae=norm(a.email||a.id);
        let folder=folders.find(f=>norm(f.appProperties?.ownerEmail)===myEmail()&&norm(f.appProperties?.assistantEmail)===ae);
        if(!folder) folder=await createFolderForAssistant(a); else await ensureAssistantPermission(folder,ae);
        partnerFolders.push({...folder,assistantEmail:ae,assistant:a});
      }
    }
    if(!silent) showToast(`檔案交換資料夾已同步（${partnerFolders.length} 個）`);
    enableUpload();
  }catch(e){console.error(e);showError(formatDriveError(e));}
  finally{busy=false;if(btn){btn.disabled=false;btn.textContent="🔄 同步小幫手資料夾";}}
}

function enableUpload(){
  const can = driveToken && partnerFolders.length>0;
  $("fxFileInput").disabled=!can; $("fxUploadBtn").disabled=!can;
}

async function refreshFiles(){
  if(!driveToken) return showError("請先連接 Google Drive。");
  const list=$("fxFileList"); list.innerHTML='<div class="empty-state">讀取中…</div>';
  try{
    if(!partnerFolders.length) await syncFolders({silent:true});
    const groups=[];
    for(const f of partnerFolders){
      const q=`'${f.id}' in parents and trashed=false`;
      const fields=encodeURIComponent("files(id,name,mimeType,size,createdTime,modifiedTime,description,webContentLink,appProperties)");
      const data=await driveApi(`/drive/v3/files?q=${encodeURIComponent(q)}&orderBy=modifiedTime%20desc&pageSize=200&fields=${fields}`);
      const partnerEmail = profile.role==="assistant" ? myEmail() : norm(f.assistantEmail||f.appProperties?.assistantEmail);
      const partner = profile.role==="assistant" ? profile : (f.assistant||portalUsers.find(u=>norm(u.email||u.id)===partnerEmail));
      groups.push({folder:f,partnerEmail,partnerName:displayName(partner,partnerEmail),files:data.files||[]});
    }
    renderFiles(groups);
  }catch(e){console.error(e);list.innerHTML='<div class="empty-state">讀取失敗。</div>';showError(formatDriveError(e));}
}

function renderFiles(groups){
  const box=$("fxFileList");
  const total=groups.reduce((n,g)=>n+g.files.length,0);
  if(!total){box.innerHTML='<div class="empty-state">目前還沒有交換檔案。</div>';return;}
  box.innerHTML=groups.map(g=>`<div class="fx-group"><div class="fx-group-head">${profile.role==="assistant"?`與 ${esc(displayName(ownerProfile(),ownerEmail()))} 的交換區`:`與 ${esc(g.partnerName)} 的交換區`}</div>${g.files.length?g.files.map(file=>fileRow(file,g.partnerEmail)).join(""):'<div class="fx-file-row"><div class="fx-file-meta">目前沒有檔案</div></div>'}</div>`).join("");
  box.querySelectorAll("[data-download]").forEach(b=>b.addEventListener("click",()=>downloadFile(b.dataset.download)));
}

function fileRow(file,partnerEmail){
  const sender=norm(file.appProperties?.senderEmail), mine=myEmail();
  const direction = sender===mine ? "我傳出的" : "收到的";
  const size=formatBytes(Number(file.size||0)); const time=file.modifiedTime?new Date(file.modifiedTime).toLocaleString("zh-TW"):"";
  return `<div class="fx-file-row"><div><div class="fx-file-name"><span class="fx-direction">${direction}</span>${esc(file.name)}</div><div class="fx-file-meta">${esc(size)}${time?`　${esc(time)}`:""}</div>${file.description?`<div class="fx-file-note">${esc(file.description)}</div>`:""}</div><div class="fx-file-actions"><button class="mini-btn" data-download="${esc(file.id)}">下載</button></div></div>`;
}

async function uploadSelectedFiles(e){
  e.preventDefault(); if(busy) return;
  const files=[...$("fxFileInput").files]; if(!files.length) return showError("請先選擇檔案。");
  let folder=null, recipient="";
  if(profile.role==="assistant"){ folder=partnerFolders[0]; recipient=ownerEmail(); }
  else{ recipient=norm($("fxRecipient").value); folder=partnerFolders.find(f=>norm(f.assistantEmail||f.appProperties?.assistantEmail)===recipient); }
  if(!folder) return showError("找不到交換資料夾，請先按「同步小幫手資料夾」。");
  const note=$("fxNote").value.trim(); busy=true; $("fxUploadBtn").disabled=true; hideError();
  try{
    for(const file of files){
      const progress=createProgress(file.name);
      await resumableUpload(file,folder.id,{senderEmail:myEmail(),recipientEmail:recipient,ownerEmail:ownerEmail(),note},p=>updateProgress(progress,p));
      updateProgress(progress,100,"完成");
    }
    $("fxFileInput").value=""; $("fxNote").value=""; showToast(`已上傳 ${files.length} 個檔案`); await refreshFiles();
  }catch(err){console.error(err);showError(formatDriveError(err));}
  finally{busy=false;enableUpload();}
}

async function resumableUpload(file,parentId,meta,onProgress){
  const metadata={name:file.name,parents:[parentId],description:meta.note||"",appProperties:{[APP_MARK]:"1",senderEmail:meta.senderEmail,recipientEmail:meta.recipientEmail,ownerEmail:meta.ownerEmail}};
  const start=await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,size,modifiedTime,webContentLink,appProperties",{method:"POST",headers:{Authorization:`Bearer ${driveToken}`,"Content-Type":"application/json; charset=UTF-8","X-Upload-Content-Type":file.type||"application/octet-stream","X-Upload-Content-Length":String(file.size)},body:JSON.stringify(metadata)});
  if(!start.ok){const data=await start.json().catch(()=>({}));throw new Error(data?.error?.message||`無法建立上傳工作（${start.status}）`);}
  const session=start.headers.get("Location"); if(!session) throw new Error("Google Drive 沒有回傳續傳位置。");
  let offset=0,retries=0;
  while(offset<file.size){
    const end=Math.min(offset+CHUNK_SIZE,file.size),chunk=file.slice(offset,end); let res;
    try{
      res=await fetch(session,{method:"PUT",headers:{"Content-Length":String(chunk.size),"Content-Range":`bytes ${offset}-${end-1}/${file.size}`},body:chunk});
    }catch(err){
      if(++retries>3) throw err; await new Promise(r=>setTimeout(r,800*retries)); continue;
    }
    if(res.status===308){
      const range=res.headers.get("Range"); offset=range?Number(range.split("-")[1])+1:end; retries=0; onProgress(Math.min(99,Math.round(offset/file.size*100))); continue;
    }
    if(res.ok){onProgress(100);return await res.json().catch(()=>({}));}
    const data=await res.json().catch(()=>({})); throw new Error(data?.error?.message||`上傳失敗（${res.status}）`);
  }
}

async function downloadFile(fileId){
  try{
    const data=await driveApi(`/drive/v3/files/${encodeURIComponent(fileId)}?fields=id,name,webContentLink`);
    if(data.webContentLink) window.open(data.webContentLink,"_blank","noopener");
    else window.open(`https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`,"_blank","noopener");
  }catch(e){showError(formatDriveError(e));}
}

function createProgress(name){
  const el=document.createElement("div"); el.className="fx-progress-item"; el.innerHTML=`<div class="fx-progress-top"><strong>${esc(name)}</strong><span>0%</span></div><div class="fx-bar"><span></span></div>`; $("fxProgress").appendChild(el); return el;
}
function updateProgress(el,pct,label=""){el.querySelector(".fx-progress-top span").textContent=label||`${pct}%`;el.querySelector(".fx-bar span").style.width=`${pct}%`;}
function formatBytes(n){if(!n)return"0 B";const u=["B","KB","MB","GB","TB"],i=Math.min(Math.floor(Math.log(n)/Math.log(1024)),u.length-1);return`${(n/1024**i).toFixed(i?1:0)} ${u[i]}`;}
function formatDriveError(e){const m=String(e?.message||e||"發生錯誤");if(/Drive API has not been used|disabled/i.test(m))return"Google Drive API 尚未在 must-resource-center-portal 專案啟用。程式已完成，啟用 API 後即可使用。";if(/insufficient.*scope|Request had insufficient authentication scopes/i.test(m))return"Google Drive 授權範圍不足，請按「重新連接 Google Drive」並允許檔案存取。";return m;}
function showError(msg){const el=$("fxError");if(!el)return;el.textContent=msg;el.classList.remove("hidden");}
function hideError(){$("fxError")?.classList.add("hidden");}
function showToast(msg){const t=$("toast");if(!t)return alert(msg);t.textContent=msg;t.classList.remove("hidden");clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>t.classList.add("hidden"),2600);}

injectUi();
waitPortal();
