import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, serverTimestamp, query, orderBy } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { firebaseConfig, announcementFirebaseConfig, activityFirebaseConfig, serviceRecordFirebaseConfig } from "./firebase-config.js";

const app=initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app),provider=new GoogleAuthProvider();
const announcementApp=initializeApp(announcementFirebaseConfig,"announcementPermissionSync");
const announcementAuth=getAuth(announcementApp), announcementDb=getFirestore(announcementApp), announcementProvider=new GoogleAuthProvider();
announcementProvider.setCustomParameters({prompt:"select_account"});
const activityApp=initializeApp(activityFirebaseConfig,"activityPermissionSync");
const activityAuth=getAuth(activityApp), activityDb=getFirestore(activityApp), activityProvider=new GoogleAuthProvider();
activityProvider.setCustomParameters({prompt:"select_account"});
const serviceApp=initializeApp(serviceRecordFirebaseConfig,"servicePermissionSync");
const serviceAuth=getAuth(serviceApp), serviceDb=getFirestore(serviceApp), serviceProvider=new GoogleAuthProvider();
serviceProvider.setCustomParameters({prompt:"select_account"});
provider.setCustomParameters({prompt:"select_account"});
let currentUser=null,profile=null,systems=[],users=[];
const $=id=>document.getElementById(id); const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const defaultSystems=[
{id:"announcement",name:"資源教室公告欄",description:"查看重要公告、修課通知、獎助學金與活動訊息。",icon:"📢",url:"https://f00931must-hash.github.io/must-resource-platform/",enabled:true,order:1,type:"shared",accent:"#8b5cf6",accentSoft:"#f3e8ff"},
{id:"activity",name:"資源教室活動報名平台",description:"查看活動資訊、線上報名與填寫活動回饋。",icon:"🎉",url:"https://f00931must-hash.github.io/must-activity-system/frontend/",enabled:true,order:2,type:"shared",accent:"#0ea5e9",accentSoft:"#e0f2fe"},
{id:"serviceRecord",name:"資源教室服務紀錄系統",description:"管理學生基本資料、服務紀錄、AI 內容潤飾與紀錄表匯出。",icon:"📋",url:"https://f00931must-hash.github.io/must-service-record-system/",enabled:true,order:3,type:"private",accent:"#14b8a6",accentSoft:"#ccfbf1"}
];
const manuals={portal:`<h2>入口平台</h2><p>入口平台會依照登入帳號，自動顯示可使用的系統。</p><ol class="steps"><li>點選「使用 Google 登入」。</li><li>選擇已由管理者加入的 Google 帳號。</li><li>從首頁卡片進入需要的系統。</li></ol><div class="note">入口卡片由管理中心維護，日後修改網址或新增系統，不必再更改首頁程式。</div>`,users:`<h2>老師與權限</h2><h3>新增老師</h3><ol class="steps"><li>進入「管理中心」。</li><li>在老師管理按「新增老師」。</li><li>輸入姓名、Email、身分並勾選可使用的系統。</li><li>按儲存。老師即可用該 Google 帳號登入。</li></ol><h3>停用帳號</h3><p>編輯老師後關閉「啟用帳號」。停用後仍保留原設定，但無法登入。</p>`,systems:`<h2>系統管理</h2><ol class="steps"><li>進入「管理中心」的「系統管理」。</li><li>按「新增系統」，填寫名稱、網址、圖示及排序。</li><li>儲存後首頁會自動出現，不需修改 GitHub 程式。</li></ol><div class="note">停用系統只會讓入口暫時隱藏，不會刪除該系統的資料。</div>`,faq:`<h2>常見問題</h2><h3>新增老師後仍無法登入？</h3><p>請確認 Email 完全相同、帳號為啟用狀態，並已在 Firebase Authentication 加入 GitHub Pages 網域。</p><h3>為什麼老師看不到某套系統？</h3><p>請在老師管理中勾選該系統的權限。管理員預設可查看所有啟用中的系統。</p><h3>子系統裡原本的老師管理呢？</h3><p>目前先保留，等下一階段將各子系統改為讀取 Portal 權限後，再移除重複功能。</p>`};

function bind(){[$("loginBtn"),$("loginBtnLarge")].forEach(b=>b.onclick=login);$("logoutBtn").onclick=logout;$("deniedLogoutBtn").onclick=logout;document.querySelectorAll(".nav-btn").forEach(b=>b.onclick=()=>showPage(b.dataset.page));document.querySelectorAll(".tab-btn").forEach(b=>b.onclick=()=>showTab(b.dataset.tab));document.querySelectorAll(".manual-link").forEach(b=>b.onclick=()=>showManual(b.dataset.manual));$("addUserBtn").onclick=()=>openUserModal();$("addSystemBtn").onclick=()=>openSystemModal();$("syncAnnouncementBtn").onclick=syncAnnouncementPermissions;$("syncActivityBtn").onclick=syncActivityPermissions;$("syncServiceBtn").onclick=syncServicePermissions;$("syncAllBtn").onclick=syncAllPermissions;$("refreshMonitorBtn").onclick=renderMonitor;$("addAssistantBtn").onclick=()=>openAssistantModal();$("closeModalBtn").onclick=closeModal;$("modal").onclick=e=>{if(e.target===$("modal"))closeModal()};}
async function login(){try{await signInWithPopup(auth,provider)}catch(e){toast("登入失敗："+friendly(e))}} async function logout(){await signOut(auth)}
function friendly(e){if(e?.code==="auth/popup-closed-by-user")return "登入視窗已關閉";return e?.message||"請稍後再試"}

onAuthStateChanged(auth,async user=>{currentUser=user;try{if(!user){profile=null;showLoggedOut();return}const email=user.email.toLowerCase();const snap=await getDoc(doc(db,"portalUsers",email));if(!snap.exists()||snap.data().enabled===false){showDenied(email);return}profile={id:email,...snap.data()};await Promise.all([loadSystems(),loadUsers()]);showLoggedIn();await updateDoc(doc(db,"portalUsers",email),{lastLoginAt:serverTimestamp()}).catch(()=>{});}catch(e){showDenied(user?.email||"",`讀取權限失敗：${friendly(e)}`)}finally{$("loadingScreen").classList.add("hidden")}});
function showLoggedOut(){$("loginPage").classList.remove("hidden");$("deniedPage").classList.add("hidden");document.querySelectorAll(".page").forEach(x=>x.classList.add("hidden"));$("mainNav").classList.add("hidden");$("loginBtn").classList.remove("hidden");$("logoutBtn").classList.add("hidden");$("userChip").classList.add("hidden")}
function showDenied(email,msg){showLoggedOut();$("loginPage").classList.add("hidden");$("deniedPage").classList.remove("hidden");$("deniedMessage").textContent=msg||`帳號 ${email} 尚未加入或已停用，請洽管理者協助。`;$("loginBtn").classList.add("hidden");$("logoutBtn").classList.remove("hidden")}
function showLoggedIn(){$("loginPage").classList.add("hidden");$("deniedPage").classList.add("hidden");$("mainNav").classList.remove("hidden");$("loginBtn").classList.add("hidden");$("logoutBtn").classList.remove("hidden");$("userChip").classList.remove("hidden");const name=profile.displayName||currentUser.displayName||profile.email;$("userName").textContent=name;$("userRole").textContent=profile.role==="admin"?"系統管理員":profile.role==="assistant"?"協作者":"個管老師";$("userAvatar").textContent=name.slice(0,1);$("welcomeTitle").textContent=`${name}${profile.role==="assistant"?"協作者":"老師"}，您好！`;$("adminNavBtn").classList.toggle("hidden",profile.role!=="admin");$("manualNavBtn").classList.toggle("hidden",profile.role!=="admin");$("assistantNavBtn").classList.toggle("hidden",profile.role==="assistant");renderSystems();renderAdmin();renderAssistants();showPage("home")}
function showPage(page){document.querySelectorAll(".page").forEach(x=>x.classList.add("hidden"));$(page+"Page")?.classList.remove("hidden");document.querySelectorAll(".nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.page===page));if(page==="manual")showManual("portal");if(page==="assistants")renderAssistants()}
function showTab(tab){$("usersTab").classList.toggle("hidden",tab!=="users");$("systemsTab").classList.toggle("hidden",tab!=="systems");$("monitorTab").classList.toggle("hidden",tab!=="monitor");document.querySelectorAll(".tab-btn").forEach(b=>b.classList.toggle("active",b.dataset.tab===tab));if(tab==="monitor")renderMonitor()}
function showManual(key){$("manualContent").innerHTML=manuals[key]||manuals.portal;document.querySelectorAll(".manual-link").forEach(b=>b.classList.toggle("active",b.dataset.manual===key))}

async function loadSystems(){let snap=await getDocs(query(collection(db,"systems"),orderBy("order"))).catch(()=>null);systems=snap?.docs.map(d=>({id:d.id,...d.data()}))||[];if(!systems.length&&profile?.role==="admin"){for(const s of defaultSystems)await setDoc(doc(db,"systems",s.id),{...s,createdAt:serverTimestamp()});systems=[...defaultSystems]}}
async function loadUsers(){const snap=await getDocs(collection(db,"portalUsers"));users=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(a.displayName||a.id).localeCompare(b.displayName||b.id,"zh-Hant"))}
function permissionAliases(id){const map={campaign:["campaign","announcement"],announcement:["campaign","announcement"],event:["event","activity"],activity:["event","activity"],folder_shared:["folder_shared","serviceRecord","service_record"],serviceRecord:["folder_shared","serviceRecord","service_record"]};return map[id]||[id]}
function hasPermission(u,id){const p=u?.permissions||{},a=u?.allowedSystems||[];return permissionAliases(id).some(k=>p[k]===true||a.includes(k))}
function canUse(s){if(!s.enabled)return false;if(profile.role==="admin")return true;return hasPermission(profile,s.id)||s.type==="shared"&&profile.allShared===true}
function renderSystems(){const list=systems.filter(canUse);$("systemCount").textContent=`可使用 ${list.length} 套系統`;$("systemGrid").innerHTML=list.map(s=>`<a class="system-card" href="${esc(s.url)}" target="_blank" rel="noopener" style="--accent:${esc(s.accent||"#3b82f6")};--accent-soft:${esc(s.accentSoft||"#eff6ff")}"><div class="card-top"><div class="icon">${esc(s.icon||"🔗")}</div><span class="status">使用中</span></div><h2>${esc(s.name||s.title||"未命名系統")}</h2><p>${esc(s.description||"")}</p><div class="enter">進入系統 →</div></a>`).join("");$("emptySystems").classList.toggle("hidden",list.length>0)}
function renderAdmin(){if(profile?.role!=="admin")return;$("usersList").innerHTML=users.filter(u=>u.role!=="assistant").map(u=>{const allowed=systems.filter(s=>hasPermission(u,s.id)||u.role==="admin").map(s=>s.name);return `<div class="admin-row"><div><h4>${esc(u.displayName||u.id)} ${u.role==="admin"?"👑":""}</h4><p>${esc(u.email||u.id)}｜${u.enabled===false?"已停用":"使用中"}</p><div class="row-tags">${allowed.slice(0,5).map(x=>`<span class="tag">${esc(x)}</span>`).join("")||'<span class="tag off">未設定系統</span>'}</div></div><div class="row-actions"><button class="mini-btn" data-edit-user="${esc(u.id)}">編輯</button></div></div>`}).join("");$("systemsList").innerHTML=systems.map(s=>`<div class="admin-row"><div><h4>${esc(s.icon||"🔗")} ${esc(s.name)}</h4><p>${esc(s.url||"尚未設定網址")}｜排序 ${esc(s.order??0)}｜${s.enabled===false?"已停用":"使用中"}</p></div><div class="row-actions"><button class="mini-btn" data-edit-system="${esc(s.id)}">編輯</button></div></div>`).join("");document.querySelectorAll("[data-edit-user]").forEach(b=>b.onclick=()=>openUserModal(users.find(x=>x.id===b.dataset.editUser)));document.querySelectorAll("[data-edit-system]").forEach(b=>b.onclick=()=>openSystemModal(systems.find(x=>x.id===b.dataset.editSystem)))}
function openUserModal(u=null){$("modalTitle").textContent=u?"編輯老師":"新增老師";$("modalForm").innerHTML=`<div class="field"><label>姓名</label><input name="displayName" required value="${esc(u?.displayName||"")}"></div><div class="field"><label>Email</label><input name="email" type="email" required ${u?"readonly":""} value="${esc(u?.email||u?.id||"")}"></div><div class="field"><label>身分</label><select name="role"><option value="teacher" ${u?.role!=="admin"?"selected":""}>一般老師</option><option value="admin" ${u?.role==="admin"?"selected":""}>最高管理者</option></select></div><div class="field"><label>可使用的系統</label><div class="system-option-grid">${systems.map(sys=>`<label class="system-option"><input type="checkbox" name="perm" value="${esc(sys.id)}" ${hasPermission(u,sys.id)||u?.role==="admin"?"checked":""}><span class="system-label"><span class="system-icon">${esc(sys.icon||"🔗")}</span><span>${esc(sys.name)}</span></span></label>`).join("")}</div></div><label class="check-card"><input type="checkbox" name="enabled" ${u?.enabled!==false?"checked":""}> 啟用帳號</label><div class="form-actions"><button type="button" class="btn ghost" id="cancelForm">取消</button><button class="btn primary">儲存</button></div>`;$("modalForm").onsubmit=e=>saveUser(e,u);$("cancelForm").onclick=closeModal;$("modal").classList.remove("hidden")}
async function saveUser(e,u){e.preventDefault();const f=new FormData(e.target),email=String(f.get("email")).trim().toLowerCase(),perms={};f.getAll("perm").forEach(id=>perms[id]=true);try{await setDoc(doc(db,"portalUsers",email),{displayName:String(f.get("displayName")).trim(),email,role:f.get("role"),enabled:f.get("enabled")==="on",permissions:perms,updatedAt:serverTimestamp(),...(u?{}:{createdAt:serverTimestamp()})},{merge:true});await loadUsers();renderAdmin();closeModal();setAnnouncementSyncStatus("Portal 已儲存，請重新同步公告權限","warn");setActivitySyncStatus("Portal 已儲存，請重新同步活動權限","warn");setServiceSyncStatus("Portal 已儲存，請重新同步服務權限","warn");toast("老師資料已儲存")}catch(err){toast("儲存失敗："+friendly(err))}}
function openSystemModal(s=null){$("modalTitle").textContent=s?"編輯系統":"新增系統";$("modalForm").innerHTML=`<div class="field"><label>系統代碼（英文，不可重複）</label><input name="id" required ${s?"readonly":""} value="${esc(s?.id||"")}" placeholder="例如 isp"></div><div class="field"><label>系統名稱</label><input name="name" required value="${esc(s?.name||"")}"></div><div class="field"><label>說明</label><textarea name="description">${esc(s?.description||"")}</textarea></div><div class="field"><label>網址</label><input name="url" type="url" required value="${esc(s?.url||"")}"></div><div class="checkbox-grid"><div class="field"><label>圖示</label><input name="icon" value="${esc(s?.icon||"🔗")}"></div><div class="field"><label>排序</label><input name="order" type="number" value="${esc(s?.order??systems.length+1)}"></div></div><div class="field"><label>類型</label><select name="type"><option value="shared" ${s?.type==="shared"?"selected":""}>共同系統</option><option value="private" ${s?.type!=="shared"?"selected":""}>個別權限系統</option></select></div><label class="check-card"><input type="checkbox" name="enabled" ${s?.enabled!==false?"checked":""}> 啟用系統</label><div class="form-actions"><button type="button" class="btn ghost" id="cancelForm">取消</button><button class="btn primary">儲存</button></div>`;$("modalForm").onsubmit=e=>saveSystem(e,s);$("cancelForm").onclick=closeModal;$("modal").classList.remove("hidden")}
async function saveSystem(e,s){e.preventDefault();const f=new FormData(e.target),id=String(f.get("id")).trim();try{await setDoc(doc(db,"systems",id),{name:String(f.get("name")).trim(),description:String(f.get("description")).trim(),url:String(f.get("url")).trim(),icon:String(f.get("icon")).trim()||"🔗",order:Number(f.get("order"))||0,type:f.get("type"),enabled:f.get("enabled")==="on",updatedAt:serverTimestamp(),...(s?{}:{createdAt:serverTimestamp()})},{merge:true});await loadSystems();renderSystems();renderAdmin();closeModal();toast("系統資料已儲存")}catch(err){toast("儲存失敗："+friendly(err))}}

function announcementAllowed(u){
  if(u.enabled===false) return false;
  if(u.role==="admin") return true;
  const p=u.permissions||{};
  return p.campaign===true || p.announcement===true;
}
function setAnnouncementSyncStatus(text,cls=""){
  const el=$("announcementSyncStatus"); if(!el)return;
  el.textContent=text; el.className=`sync-status ${cls}`.trim();
}
async function syncAnnouncementPermissions({silent=false}={}){
  if(profile?.role!=="admin") return toast("只有最高管理者可以同步權限");
  const btn=$("syncAnnouncementBtn");
  try{
    btn.disabled=true; btn.textContent="同步中…";
    setAnnouncementSyncStatus("請登入公告平台 Firebase 進行同步","warn");
    let childUser=announcementAuth.currentUser;
    if(!childUser) childUser=(await signInWithPopup(announcementAuth,announcementProvider)).user;
    if(String(childUser.email||"").toLowerCase()!==String(currentUser.email||"").toLowerCase()){
      await signOut(announcementAuth);
      throw new Error("Portal 與公告平台登入的 Google 帳號不同，請使用同一個最高管理者帳號。");
    }
    await loadUsers();
    const permitted=users.filter(announcementAllowed);
    const superAdmins=permitted.filter(u=>u.role==="admin").map(u=>String(u.email||u.id).toLowerCase());
    const teachers=permitted.filter(u=>u.role!=="admin").map(u=>String(u.email||u.id).toLowerCase());
    const mapped=permitted.map(u=>({name:u.displayName||u.email||u.id,email:String(u.email||u.id).toLowerCase(),role:u.role==="admin"?"superAdmin":"teacher",source:"portal"}));
    await setDoc(doc(announcementDb,"settings","admins"),{
      users:mapped,superAdmins,teachers,assistants:[],updatedAt:serverTimestamp(),syncedFrom:"must-resource-center-portal"
    },{merge:true});
    setAnnouncementSyncStatus(`同步完成：${permitted.length} 位可使用公告平台`,"ok");
    if(!silent)toast("公告平台權限已同步");return true;
  }catch(err){
    console.error(err); setAnnouncementSyncStatus("同步失敗："+friendly(err),"error"); if(!silent)toast("同步失敗："+friendly(err));throw err;
  }finally{btn.disabled=false;btn.textContent="🔄 同步公告權限";}
}


function myAllowedSystemIds(){
  if(profile?.role==="admin") return systems.map(s=>s.id);
  return systems.filter(s=>hasPermission(profile,s.id)).map(s=>s.id);
}
function renderAssistants(){
  if(!profile)return; const mine=users.filter(u=>u.role==="assistant"&&u.ownerEmail===profile.email);
  const box=$("assistantsList"); if(!box)return;
  box.innerHTML=mine.length?mine.map(u=>{const allowed=systems.filter(s=>hasPermission(u,s.id)).map(s=>s.name);return `<div class="admin-row"><div><h4>${esc(u.displayName||u.id)} 🧑‍💼</h4><p>${esc(u.email||u.id)}｜${u.enabled===false?"已停用":"使用中"}</p><div class="row-tags">${allowed.map(x=>`<span class="tag">${esc(x)}</span>`).join("")||'<span class="tag off">未設定系統</span>'}</div></div><div class="row-actions"><button class="mini-btn" data-edit-assistant="${esc(u.id)}">編輯</button></div></div>`}).join(""):'<div class="empty-state">目前尚未新增小幫手。</div>';
  document.querySelectorAll("[data-edit-assistant]").forEach(b=>b.onclick=()=>openAssistantModal(users.find(x=>x.id===b.dataset.editAssistant)));
}
function openAssistantModal(u=null){
  const allowedIds=myAllowedSystemIds(); const allowedSystems=systems.filter(s=>allowedIds.includes(s.id));
  $("modalTitle").textContent=u?"編輯小幫手":"新增小幫手";
  $("modalForm").innerHTML=`<div class="field"><label>姓名</label><input name="displayName" required value="${esc(u?.displayName||"")}"></div><div class="field"><label>Email</label><input name="email" type="email" required ${u?"readonly":""} value="${esc(u?.email||u?.id||"")}"></div><div class="owner-note">隸屬老師：${esc(profile.displayName||profile.email)}</div><div class="field"><label>可使用的系統</label><div class="system-option-grid">${allowedSystems.map(sys=>`<label class="system-option"><input type="checkbox" name="perm" value="${esc(sys.id)}" ${hasPermission(u,sys.id)?"checked":""}><span class="system-label"><span class="system-icon">${esc(sys.icon||"🔗")}</span><span>${esc(sys.name)}</span></span></label>`).join("")}</div></div><label class="check-card"><input type="checkbox" name="enabled" ${u?.enabled!==false?"checked":""}> 啟用帳號</label><div class="form-actions"><button type="button" class="btn ghost" id="cancelForm">取消</button><button class="btn primary">儲存</button></div>`;
  $("modalForm").onsubmit=e=>saveAssistant(e,u);$("cancelForm").onclick=closeModal;$("modal").classList.remove("hidden");
}
async function saveAssistant(e,u){
  e.preventDefault();const f=new FormData(e.target),email=String(f.get("email")).trim().toLowerCase(),perms={},allowed=new Set(myAllowedSystemIds());f.getAll("perm").forEach(id=>{if(allowed.has(id))perms[id]=true});
  try{await setDoc(doc(db,"portalUsers",email),{displayName:String(f.get("displayName")).trim(),email,role:"assistant",ownerEmail:profile.email,enabled:f.get("enabled")==="on",permissions:perms,updatedAt:serverTimestamp(),...(u?{}:{createdAt:serverTimestamp()})},{merge:true});await loadUsers();renderAssistants();if(profile.role==="admin")renderAdmin();closeModal();setAnnouncementSyncStatus("小幫手已更新，請重新同步公告權限","warn");setActivitySyncStatus("小幫手已更新，請重新同步活動權限","warn");setServiceSyncStatus("小幫手已更新，請重新同步服務權限","warn");toast("小幫手資料已儲存")}catch(err){toast("儲存失敗："+friendly(err))}
}
function activityAllowed(u){if(u.enabled===false)return false;if(u.role==="admin")return true;const p=u.permissions||{};return p.event===true||p.activity===true;}
function setActivitySyncStatus(text,cls=""){const el=$("activitySyncStatus");if(!el)return;el.textContent=text;el.className=`sync-status ${cls}`.trim();}
async function syncActivityPermissions({silent=false}={}){
  if(profile?.role!=="admin")return toast("只有最高管理者可以同步權限");const btn=$("syncActivityBtn");
  try{btn.disabled=true;btn.textContent="同步中…";setActivitySyncStatus("請登入活動平台 Firebase 進行同步","warn");let childUser=activityAuth.currentUser;if(!childUser)childUser=(await signInWithPopup(activityAuth,activityProvider)).user;if(String(childUser.email||"").toLowerCase()!==String(currentUser.email||"").toLowerCase()){await signOut(activityAuth);throw new Error("Portal 與活動平台登入的 Google 帳號不同，請使用同一個最高管理者帳號。");}await loadUsers();const permitted=users.filter(activityAllowed);const emails=permitted.map(u=>String(u.email||u.id).toLowerCase());await setDoc(doc(activityDb,"settings","admins"),{emails,users:permitted.map(u=>({name:u.displayName||u.email||u.id,email:String(u.email||u.id).toLowerCase(),role:u.role,ownerEmail:u.ownerEmail||"",source:"portal"})),updatedAt:serverTimestamp(),syncedFrom:"must-resource-center-portal"},{merge:true});setActivitySyncStatus(`同步完成：${permitted.length} 位可使用活動平台`,"ok");if(!silent)toast("活動平台權限已同步");return true}catch(err){console.error(err);setActivitySyncStatus("同步失敗："+friendly(err),"error");if(!silent)toast("同步失敗："+friendly(err));throw err}finally{btn.disabled=false;btn.textContent="🔄 同步活動權限";}
}


function serviceAllowed(u){if(u.enabled===false)return false;if(u.role==="admin")return true;return hasPermission(u,"folder_shared")||hasPermission(u,"serviceRecord")}
function setServiceSyncStatus(text,cls=""){const el=$("serviceSyncStatus");if(!el)return;el.textContent=text;el.className=`sync-status ${cls}`.trim();}
async function syncServicePermissions({silent=false}={}){
  if(profile?.role!=="admin")throw new Error("只有系統管理員可以同步權限");const btn=$("syncServiceBtn");
  try{btn.disabled=true;btn.textContent="同步中…";setServiceSyncStatus("請登入服務紀錄 Firebase","warn");let childUser=serviceAuth.currentUser;if(!childUser)childUser=(await signInWithPopup(serviceAuth,serviceProvider)).user;if(String(childUser.email||"").toLowerCase()!==String(currentUser.email||"").toLowerCase()){await signOut(serviceAuth);throw new Error("Portal 與服務紀錄登入帳號不同，請使用同一個系統管理員帳號。");}await loadUsers();const permitted=users.filter(serviceAllowed);const userMap={};permitted.forEach(u=>{const email=String(u.email||u.id).toLowerCase();userMap[email]={email,displayName:u.displayName||email,name:u.displayName||email,enabled:u.enabled!==false,role:u.role==="assistant"?"assistant":u.role==="admin"?"admin":"teacher",ownerEmail:u.role==="assistant"?String(u.ownerEmail||"").toLowerCase():email,source:"portal"};});await setDoc(doc(serviceDb,"settings","serviceAccess"),{users:userMap,updatedAt:serverTimestamp(),syncedFrom:"must-resource-center-portal"},{merge:false});setServiceSyncStatus(`同步完成：${permitted.length} 位可使用服務紀錄`,'ok');if(!silent)toast("服務紀錄權限已同步");return true;}catch(err){console.error(err);setServiceSyncStatus("同步失敗："+friendly(err),"error");if(!silent)toast("同步失敗："+friendly(err));throw err;}finally{btn.disabled=false;btn.textContent="同步服務";}
}
async function syncAllPermissions(){const btn=$("syncAllBtn");btn.disabled=true;btn.textContent="同步中…";let ok=0;for(const fn of [syncAnnouncementPermissions,syncActivityPermissions,syncServicePermissions]){try{await fn({silent:true});ok++}catch(e){console.error(e)}}btn.disabled=false;btn.textContent="🔄 全部同步";toast(ok===3?"三套系統權限已全部同步":`已完成 ${ok}/3 套，請查看失敗提示`)}

const monitorDefinitions=[
 {key:"campaign",title:"公告系統",icon:"📢",repo:"must-resource-platform",version:"v4.2.1"},
 {key:"event",title:"活動系統",icon:"🎉",repo:"must-activity-system",version:"v3.1.0"},
 {key:"folder_shared",title:"服務紀錄",icon:"📋",repo:"must-service-record-system",version:"v1.0.3"}
];
function formatMB(kb){return Math.max(0,Number(kb||0)/1024)}
async function renderMonitor(){const box=$("monitorGrid");if(!box||profile?.role!=="admin")return;box.innerHTML=monitorDefinitions.map(x=>`<article class="monitor-card loading"><div class="monitor-head"><span>${x.icon}</span><div><h4>${x.title}</h4><small>${x.version}</small></div></div><p>正在讀取 GitHub…</p></article>`).join("");const cards=await Promise.all(monitorDefinitions.map(async x=>{try{const r=await fetch(`https://api.github.com/repos/f00931must-hash/${x.repo}`,{headers:{Accept:"application/vnd.github+json"}});if(!r.ok)throw new Error(`HTTP ${r.status}`);const d=await r.json(),mb=formatMB(d.size),pct=Math.min(100,mb/1000*100);return {...x,ok:true,mb,pct,updated:d.pushed_at,branch:d.default_branch||"main"}}catch(e){return {...x,ok:false,error:e.message}}}));box.innerHTML=cards.map(x=>x.ok?`<article class="monitor-card"><div class="monitor-head"><span>${x.icon}</span><div><h4>${x.title}</h4><small>${x.version}・${x.branch}</small></div><span class="health ok">正常</span></div><div class="usage-row"><span>GitHub Repository</span><strong>${x.mb.toFixed(1)} / 1000 MB</strong></div><div class="progress"><i style="width:${x.pct.toFixed(1)}%"></i></div><div class="monitor-meta"><span>Firestore：需後端串接</span><span>更新：${new Date(x.updated).toLocaleString("zh-TW")}</span></div></article>`:`<article class="monitor-card"><div class="monitor-head"><span>${x.icon}</span><div><h4>${x.title}</h4><small>${x.version}</small></div><span class="health error">無法讀取</span></div><p>${esc(x.error)}</p></article>`).join("")}

function closeModal(){$("modal").classList.add("hidden");$("modalForm").innerHTML=""}function toast(msg){$("toast").textContent=msg;$("toast").classList.remove("hidden");clearTimeout(window.__toast);window.__toast=setTimeout(()=>$("toast").classList.add("hidden"),3000)}
bind();
