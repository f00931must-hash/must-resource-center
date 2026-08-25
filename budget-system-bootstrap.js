import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const SYSTEM_ID = "budgetSystem";
const SYSTEM_DATA = {
  id: SYSTEM_ID,
  name: "經費管理系統",
  description: "計畫經費編列、使用登錄與核銷管理。",
  icon: "💰",
  url: "https://f00931must-hash.github.io/must-resource-budget-system/",
  enabled: true,
  order: 6,
  type: "private",
  accent: "#7c3aed",
  accentSoft: "#ede9fe"
};

const budgetFirebaseConfig = {
  apiKey: "AIzaSyCsApWkpnJiwCsQsiPK14pgFQdqb88UJjQ",
  authDomain: "must-resource-budget-system.firebaseapp.com",
  projectId: "must-resource-budget-system",
  storageBucket: "must-resource-budget-system.firebasestorage.app",
  messagingSenderId: "1044795970310",
  appId: "1:1044795970310:web:3939115211f2890c280487"
};

const normalizedEmail = value => String(value || "").trim().toLowerCase();
let portalDbRef=null;

async function waitForPortalApp(){
  for(let i=0;i<100;i++){
    const apps=getApps();
    const portalApp=apps.find(a=>a.options?.projectId==="must-resource-center-portal");
    if(portalApp) return portalApp;
    await new Promise(r=>setTimeout(r,50));
  }
  return null;
}

function getBudgetApp(){
  return getApps().find(a=>a.name==="budgetPermissionSync") || initializeApp(budgetFirebaseConfig,"budgetPermissionSync");
}

function setBudgetSyncStatus(text,cls=""){
  const el=document.getElementById("budgetSyncStatus");
  if(!el) return;
  el.textContent=text;
  el.className=`sync-status ${cls}`.trim();
}

function installBudgetSyncPanel(){
  if(document.getElementById("budgetSyncBtn")) return;
  const grid=document.querySelector("#usersTab .sync-grid");
  if(!grid) return;
  const panel=document.createElement("div");
  panel.className="sync-panel";
  panel.innerHTML=`<div><h3>💰 經費系統</h3><p>正式老師依「經費角色」同步；小幫手不同步。</p><div id="budgetSyncStatus" class="sync-status">尚未同步</div></div><button id="budgetSyncBtn" class="btn ghost">同步經費</button>`;
  grid.appendChild(panel);
}

async function ensurePortalBudgetAccess(portalDb,adminEmail){
  const systemRef=doc(portalDb,"systems",SYSTEM_ID);
  const systemSnap=await getDoc(systemRef);
  if(!systemSnap.exists()){
    await setDoc(systemRef,{...SYSTEM_DATA,createdAt:serverTimestamp(),createdBy:adminEmail});
  }

  const usersSnap=await getDocs(collection(portalDb,"portalUsers"));
  for(const userDoc of usersSnap.docs){
    const data=userDoc.data();
    if(data.enabled===false || data.role==="assistant") continue;
    if(data?.permissions?.[SYSTEM_ID]===true || (data.allowedSystems||[]).includes(SYSTEM_ID)) continue;
    await updateDoc(userDoc.ref,{[`permissions.${SYSTEM_ID}`]:true});
  }
  return usersSnap;
}

async function syncBudgetPermissions(portalDb,portalUser){
  const btn=document.getElementById("budgetSyncBtn");
  if(!btn) return;
  const adminEmail=normalizedEmail(portalUser.email);
  try{
    btn.disabled=true;
    btn.textContent="同步中…";
    setBudgetSyncStatus("請登入經費系統 Firebase","warn");

    const budgetApp=getBudgetApp();
    const budgetAuth=getAuth(budgetApp);
    const budgetDb=getFirestore(budgetApp);
    const provider=new GoogleAuthProvider();
    provider.setCustomParameters({prompt:"select_account"});

    let childUser=budgetAuth.currentUser;
    if(!childUser) childUser=(await signInWithPopup(budgetAuth,provider)).user;
    if(normalizedEmail(childUser.email)!==adminEmail){
      await signOut(budgetAuth);
      throw new Error("Portal 與經費系統登入帳號不同，請使用同一個經費管理員帳號。");
    }

    const managerSnap=await getDoc(doc(budgetDb,"users",adminEmail));
    if(!managerSnap.exists() || managerSnap.data().enabled!==true || managerSnap.data().role!=="manager"){
      throw new Error("此帳號目前不是經費系統的經費管理員，無法執行同步。");
    }

    const portalUsersSnap=await ensurePortalBudgetAccess(portalDb,adminEmail);
    const permitted=portalUsersSnap.docs
      .map(d=>({id:d.id,...d.data()}))
      .filter(u=>u.enabled!==false && u.role!=="assistant");
    const expected=new Set(permitted.map(u=>normalizedEmail(u.email||u.id)));

    const oldBudgetUsers=await getDocs(collection(budgetDb,"users"));
    const existingMap=new Map(oldBudgetUsers.docs.map(d=>[normalizedEmail(d.id),{ref:d.ref,...d.data()}]));

    let managerCount=0;
    for(const u of permitted){
      const email=normalizedEmail(u.email||u.id);
      const existing=existingMap.get(email);
      const explicitRole=u.budgetRole==="manager"||u.budgetRole==="user" ? u.budgetRole : "";
      const role=explicitRole || (existing?.role==="manager" ? "manager" : "user");
      if(role==="manager") managerCount++;

      await setDoc(doc(budgetDb,"users",email),{
        email,
        name:u.displayName||u.name||email,
        enabled:true,
        role,
        source:"portal-admin-sync",
        updatedAt:serverTimestamp(),
        updatedBy:adminEmail
      },{merge:true});

      // 第一次導入時，把既有經費角色回寫到 Portal，之後交接者可直接從入口維護。
      if(!explicitRole){
        await updateDoc(doc(portalDb,"portalUsers",email),{budgetRole:role,budgetRoleUpdatedAt:serverTimestamp()});
      }
    }

    for(const d of oldBudgetUsers.docs){
      const data=d.data();
      const email=normalizedEmail(d.id);
      if(data.source!=="portal-admin-sync" || data.role==="manager" || expected.has(email)) continue;
      await setDoc(d.ref,{enabled:false,updatedAt:serverTimestamp(),updatedBy:adminEmail},{merge:true});
    }

    setBudgetSyncStatus(`同步完成：${permitted.length} 位正式老師，其中 ${managerCount} 位經費管理員`,"ok");
    alert(`經費系統權限同步完成。\n\n正式老師：${permitted.length} 位\n經費管理員：${managerCount} 位\n\n小幫手未同步。`);
  }catch(err){
    console.error("Budget permission sync failed:",err);
    setBudgetSyncStatus("同步失敗："+(err?.message||"請稍後再試"),"error");
    alert("經費系統同步失敗："+(err?.message||"請稍後再試"));
  }finally{
    btn.disabled=false;
    btn.textContent="同步經費";
  }
}

async function injectBudgetRoleEditor(){
  if(!portalDbRef) return;
  const modal=document.getElementById("modal");
  const form=document.getElementById("modalForm");
  if(!modal || !form || modal.classList.contains("hidden")) return;
  if(form.querySelector('[name="budgetRole"]')) return;

  const emailInput=form.querySelector('input[name="email"]');
  const roleInput=form.querySelector('select[name="role"]');
  if(!emailInput || !roleInput || !emailInput.readOnly) return; // 新增老師先正常建立，之後編輯即可指定。

  const email=normalizedEmail(emailInput.value);
  if(!email) return;
  const userSnap=await getDoc(doc(portalDbRef,"portalUsers",email));
  if(!userSnap.exists() || userSnap.data().role==="assistant") return;
  const data=userSnap.data();

  const field=document.createElement("div");
  field.className="field";
  field.dataset.budgetRoleField="1";
  field.innerHTML=`<label>經費系統角色</label><select name="budgetRole"><option value="user" ${data.budgetRole!=="manager"?"selected":""}>一般使用者</option><option value="manager" ${data.budgetRole==="manager"?"selected":""}>經費管理員</option></select><small style="display:block;margin-top:6px;color:#64748b">只影響經費管理系統；變更後請按「同步經費」套用。</small>`;

  const roleField=roleInput.closest(".field");
  if(roleField?.parentNode) roleField.parentNode.insertBefore(field,roleField.nextSibling);
  else form.prepend(field);

  const budgetSelect=field.querySelector('select[name="budgetRole"]');
  budgetSelect.addEventListener("change",async()=>{
    try{
      await updateDoc(doc(portalDbRef,"portalUsers",email),{
        budgetRole:budgetSelect.value,
        budgetRoleUpdatedAt:serverTimestamp()
      });
      setBudgetSyncStatus("經費角色已變更，請按「同步經費」套用","warn");
    }catch(err){
      console.error("Budget role save failed:",err);
      alert("經費角色儲存失敗："+(err?.message||"請稍後再試"));
    }
  });
}

function watchTeacherEditor(){
  const modal=document.getElementById("modal");
  const form=document.getElementById("modalForm");
  if(!modal || !form || modal.dataset.budgetRoleWatcher==="1") return;
  modal.dataset.budgetRoleWatcher="1";
  const observer=new MutationObserver(()=>setTimeout(injectBudgetRoleEditor,0));
  observer.observe(modal,{attributes:true,attributeFilter:["class"],childList:true,subtree:true});
}

async function bootstrapBudgetSystem(){
  const portalApp=await waitForPortalApp();
  if(!portalApp) return;
  const portalAuth=getAuth(portalApp);
  const portalDb=getFirestore(portalApp);
  portalDbRef=portalDb;

  onAuthStateChanged(portalAuth,async user=>{
    if(!user?.email) return;
    try{
      const email=normalizedEmail(user.email);
      const profileSnap=await getDoc(doc(portalDb,"portalUsers",email));
      if(!profileSnap.exists() || profileSnap.data().role!=="admin") return;

      installBudgetSyncPanel();
      watchTeacherEditor();
      await ensurePortalBudgetAccess(portalDb,email);
      const btn=document.getElementById("budgetSyncBtn");
      if(btn && !btn.dataset.bound){
        btn.dataset.bound="1";
        btn.addEventListener("click",()=>syncBudgetPermissions(portalDb,user));
      }
    }catch(e){
      console.warn("Budget system bootstrap skipped:",e);
    }
  });
}

bootstrapBudgetSystem();
