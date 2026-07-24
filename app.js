import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore, doc, getDoc, getDocs, collection, setDoc, deleteDoc, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

const $ = id => document.getElementById(id);
const state = { authUser:null, profile:null, systems:[], users:[] };
const roleLabel = { admin:"最高管理者", teacher:"一般老師", assistant:"協作者" };
const typeLabel = { shared:"共同管理型", private:"個別資料型", workspace:"工作空間型" };

$("loginBtn").addEventListener("click", login);
$("loginPanelBtn").addEventListener("click", login);
$("logoutBtn").addEventListener("click", () => signOut(auth));
$("addUserBtn").addEventListener("click", () => openUserDialog());
$("addSystemBtn").addEventListener("click", () => openSystemDialog());
$("userForm").addEventListener("submit", saveUser);
$("systemForm").addEventListener("submit", saveSystem);
document.querySelectorAll("[data-close]").forEach(btn => btn.addEventListener("click", () => $(btn.dataset.close).close()));
document.querySelectorAll(".tab").forEach(btn => btn.addEventListener("click", () => showPage(btn.dataset.page)));
document.querySelectorAll("[data-manual]").forEach(btn => btn.addEventListener("click", () => renderManual(btn.dataset.manual)));

async function login(){
  try { await signInWithPopup(auth, provider); }
  catch (error) { showMessage(firebaseError(error), "error"); }
}

onAuthStateChanged(auth, async user => {
  resetMessage();
  state.authUser = user;
  if(!user){ showLoggedOut(); return; }
  try{
    const email = normalizeEmail(user.email);
    const snap = await getDoc(doc(db, "portalUsers", email));
    if(!snap.exists()) throw new Error("此 Google 帳號尚未加入 Portal 使用者名單。");
    const profile = snap.data();
    if(profile.enabled !== true) throw new Error("此帳號目前已停用，請洽系統管理者。");
    state.profile = { ...profile, email };
    await loadSystems();
    showLoggedIn();
  }catch(error){
    showMessage(error.message || "登入驗證失敗。", "error");
    await signOut(auth);
  }
});

function showLoggedOut(){
  state.profile = null; state.systems = []; state.users = [];
  $("loginPanel").classList.remove("hidden"); $("appContent").classList.add("hidden");
  $("loginBtn").classList.remove("hidden"); $("logoutBtn").classList.add("hidden"); $("userInfo").classList.add("hidden");
}
function showLoggedIn(){
  $("loginPanel").classList.add("hidden"); $("appContent").classList.remove("hidden");
  $("loginBtn").classList.add("hidden"); $("logoutBtn").classList.remove("hidden");
  $("userInfo").classList.remove("hidden");
  $("userInfo").innerHTML = `<strong>${escapeHtml(state.profile.displayName || state.authUser.displayName || "使用者")}</strong><span>${escapeHtml(roleLabel[state.profile.role] || state.profile.role || "使用者")}</span>`;
  const isAdmin = state.profile.role === "admin";
  $("adminTab").classList.toggle("hidden", !isAdmin);
  renderHome(); renderManual("start"); showPage("home");
}

async function loadSystems(){
  const snap = await getDocs(query(collection(db, "systems"), orderBy("order", "asc")));
  state.systems = snap.docs.map(d => ({ id:d.id, ...d.data() }));
}

function accessibleSystems(){
  const admin = state.profile?.role === "admin";
  const permissions = state.profile?.permissions || {};
  return state.systems.filter(s => s.enabled === true && (admin || permissions[s.id] === true));
}
function renderHome(){
  const systems = accessibleSystems();
  $("systemCount").textContent = `${systems.length} 個系統可使用`;
  $("emptySystems").classList.toggle("hidden", systems.length > 0);
  $("systemGrid").innerHTML = systems.map(s => {
    const usable = Boolean(s.url);
    const tag = usable ? "a" : "div";
    return `<${tag} class="system-card ${usable ? "" : "disabled"}" ${usable ? `href="${escapeAttr(s.url)}" target="_blank" rel="noopener"` : ""}>
      <div class="card-top"><div class="icon">${escapeHtml(s.icon || "🔗")}</div><span class="status ${usable ? "" : "soon"}">${usable ? "使用中" : "尚未設定網址"}</span></div>
      <h2>${escapeHtml(s.name || s.id)}</h2><p>${escapeHtml(s.description || typeLabel[s.type] || "")}</p><div class="enter">${usable ? "進入系統 →" : "請管理者設定"}</div>
    </${tag}>`;
  }).join("");
}

function showPage(page){
  if(page === "admin" && state.profile?.role !== "admin") return;
  document.querySelectorAll(".page").forEach(p => p.classList.toggle("active", p.id === `page-${page}`));
  document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t.dataset.page === page));
  if(page === "admin") loadAdminData();
}
async function loadAdminData(){
  try{
    const usersSnap = await getDocs(collection(db, "portalUsers"));
    state.users = usersSnap.docs.map(d => ({ id:d.id, ...d.data() })).sort((a,b)=>(a.displayName||a.email).localeCompare(b.displayName||b.email,"zh-Hant"));
    await loadSystems(); renderUsersTable(); renderSystemsTable(); renderHome();
  }catch(error){ showMessage(firebaseError(error), "error"); }
}
function renderUsersTable(){
  $("usersTable").innerHTML = state.users.map(u => {
    const labels = state.systems.filter(s => u.permissions?.[s.id]).map(s => s.name || s.id);
    return `<tr><td>${escapeHtml(u.displayName||"")}</td><td>${escapeHtml(u.email||u.id)}</td><td>${escapeHtml(roleLabel[u.role]||u.role||"")}</td><td><span class="pill ${u.enabled===true?"on":"off"}">${u.enabled===true?"啟用":"停用"}</span></td><td>${escapeHtml(labels.join("、") || (u.role==="admin"?"全部系統":"尚未設定"))}</td><td><button class="link-btn" data-edit-user="${escapeAttr(u.id)}">修改</button></td></tr>`;
  }).join("");
  document.querySelectorAll("[data-edit-user]").forEach(b => b.addEventListener("click", () => openUserDialog(state.users.find(u=>u.id===b.dataset.editUser))));
}
function renderSystemsTable(){
  $("systemsTable").innerHTML = state.systems.map(s => `<tr><td>${Number(s.order ?? 99)}</td><td><strong>${escapeHtml(s.icon||"🔗")} ${escapeHtml(s.name||s.id)}</strong><br><small>${escapeHtml(s.id)}</small></td><td>${escapeHtml(typeLabel[s.type]||s.type||"")}</td><td><span class="pill ${s.enabled===true?"on":"off"}">${s.enabled===true?"啟用":"停用"}</span></td><td class="url-cell">${escapeHtml(s.url||"未設定")}</td><td><button class="link-btn" data-edit-system="${escapeAttr(s.id)}">修改</button></td></tr>`).join("");
  document.querySelectorAll("[data-edit-system]").forEach(b => b.addEventListener("click", () => openSystemDialog(state.systems.find(s=>s.id===b.dataset.editSystem))));
}

function openUserDialog(user=null){
  $("userForm").reset(); $("originalUserEmail").value = user?.id || "";
  $("userDialogTitle").textContent = user ? "修改使用者" : "新增使用者";
  $("userName").value = user?.displayName || ""; $("userEmail").value = user?.email || user?.id || ""; $("userEmail").disabled = Boolean(user);
  $("userRole").value = user?.role || "teacher"; $("userEnabled").checked = user ? user.enabled===true : true;
  $("permissionChecks").innerHTML = state.systems.map(s => `<label class="check-line"><input type="checkbox" value="${escapeAttr(s.id)}" ${user?.permissions?.[s.id] ? "checked" : ""}> ${escapeHtml(s.name||s.id)}</label>`).join("");
  $("userDialog").showModal();
}
async function saveUser(event){
  event.preventDefault();
  const original = $("originalUserEmail").value;
  const email = normalizeEmail(original || $("userEmail").value);
  if(!email) return;
  const permissions = {};
  $("permissionChecks").querySelectorAll("input[type=checkbox]").forEach(c => permissions[c.value] = c.checked);
  try{
    await setDoc(doc(db,"portalUsers",email), { displayName:$("userName").value.trim(), email, role:$("userRole").value, enabled:$("userEnabled").checked, permissions, updatedAt:serverTimestamp(), updatedBy:state.profile.email }, { merge:true });
    $("userDialog").close(); showMessage("使用者資料已儲存。", "success"); await loadAdminData();
  }catch(error){ showMessage(firebaseError(error), "error"); }
}

function openSystemDialog(system=null){
  $("systemForm").reset(); $("originalSystemId").value = system?.id || "";
  $("systemDialogTitle").textContent = system ? "修改系統" : "新增系統"; $("systemId").disabled = Boolean(system);
  $("systemId").value=system?.id||""; $("systemName").value=system?.name||""; $("systemDescription").value=system?.description||""; $("systemIcon").value=system?.icon||""; $("systemOrder").value=system?.order??99; $("systemType").value=system?.type||"shared"; $("systemUrl").value=system?.url||""; $("systemEnabled").checked=system?system.enabled===true:true;
  $("systemDialog").showModal();
}
async function saveSystem(event){
  event.preventDefault();
  const id = ($("originalSystemId").value || $("systemId").value).trim();
  try{
    await setDoc(doc(db,"systems",id), { name:$("systemName").value.trim(), description:$("systemDescription").value.trim(), icon:$("systemIcon").value.trim()||"🔗", order:Number($("systemOrder").value||99), type:$("systemType").value, url:$("systemUrl").value.trim(), enabled:$("systemEnabled").checked, updatedAt:serverTimestamp(), updatedBy:state.profile.email }, { merge:true });
    $("systemDialog").close(); showMessage("系統資料已儲存。", "success"); await loadAdminData();
  }catch(error){ showMessage(firebaseError(error), "error"); }
}

const manuals = {
  start:`<h2>開始使用</h2><p>使用學校或已授權的 Google 帳號登入。登入後，首頁只會顯示你可使用的系統；最高管理者會多看到「系統管理中心」。</p><div class="manual-note">日常管理都在 Portal 完成。除非首次建立 Firebase、修改安全規則或處理故障，平常不需要進 Firebase 或 GitHub。</div>`,
  users:`<h2>新增與停用老師</h2><ol><li>進入「系統管理中心」。</li><li>在「老師與使用者管理」按「新增使用者」。</li><li>填寫姓名、Email、角色與系統權限後儲存。</li><li>老師離職或暫停使用時，按「修改」並取消「啟用帳號」，不必刪除紀錄。</li></ol>`,
  permissions:`<h2>設定系統權限</h2><p>新增或修改使用者時，勾選他可以進入的系統。最高管理者預設可管理與進入全部系統；一般老師與協作者只會看到已勾選的系統。</p><p>這裡管理的是「能不能進入系統」。進去後能看到哪些資料，仍由各系統自己的資料模式與安全規則決定。</p>`,
  systems:`<h2>新增或修改系統</h2><ol><li>在「系統模組管理」按「新增系統」。</li><li>填寫英文系統代碼、名稱、首頁網址、排序與資料類型。</li><li>儲存後，新系統會自動出現在權限勾選清單與首頁。</li><li>系統維修或尚未完成時，可取消「顯示並允許進入」。</li></ol>`,
  types:`<h2>共同型與個別型</h2><p><strong>共同管理型（shared）</strong>：公告、活動等，授權老師進入後共同看到與管理全部資料。</p><p><strong>個別資料型（private）</strong>：服務紀錄等，每位老師只看到自己的資料。</p><p><strong>工作空間型（workspace）</strong>：主要老師可指定小幫手或其他老師共同處理特定工作空間。</p><div class="manual-note">Portal 的類型欄位是管理標示；真正的資料隔離仍必須在各系統的 Firestore Security Rules 實作。</div>`,
  trouble:`<h2>常見問題</h2><h3>登入後顯示未授權</h3><p>確認該 Google Email 已加入 portalUsers，且「啟用帳號」為開啟。</p><h3>新增系統後沒有出現在首頁</h3><p>確認系統為啟用，並且該使用者已被勾選此系統權限；最高管理者則會直接看到所有啟用系統。</p><h3>出現 Missing or insufficient permissions</h3><p>通常代表 Firestore 安全規則尚未更新，請依 README 上傳本版 firestore.rules。</p>`
};
function renderManual(key){ document.querySelectorAll("[data-manual]").forEach(b=>b.classList.toggle("active",b.dataset.manual===key)); $("manualContent").innerHTML=manuals[key]||manuals.start; }
function showMessage(text,type="info"){ const m=$("message"); m.textContent=text; m.className=`message ${type}`; m.classList.remove("hidden"); window.scrollTo({top:0,behavior:"smooth"}); }
function resetMessage(){ $("message").classList.add("hidden"); }
function normalizeEmail(v){ return String(v||"").trim().toLowerCase(); }
function escapeHtml(v){ return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c])); }
function escapeAttr(v){ return escapeHtml(v).replace(/`/g,"&#096;"); }
function firebaseError(error){ console.error(error); if(error?.code==="auth/popup-blocked") return "瀏覽器阻擋了登入視窗，請允許彈出式視窗後重試。"; if(error?.code==="auth/unauthorized-domain") return "Firebase 尚未授權此網站網域，請將 GitHub Pages 網域加入 Authentication 的 Authorized domains。"; if(error?.code==="permission-denied"||String(error?.message).includes("permissions")) return "Firestore 權限不足，請確認已套用本版安全規則。"; return error?.message||"操作失敗，請稍後再試。"; }
