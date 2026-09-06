import { getApps } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const ROOT_EMAIL = "master004400@gmail.com";
const DEFAULT_BUDGET_ROLE_MANAGERS = new Set([
  ROOT_EMAIL,
  "dreamjoy126@gmail.com"
]);
const normalizedEmail = value => String(value || "").trim().toLowerCase();
let portalDb = null;
let currentProfile = null;
let currentEmail = "";

async function waitForPortalApp(){
  for(let i=0;i<100;i++){
    const app=getApps().find(a=>a.options?.projectId==="must-resource-center-portal");
    if(app) return app;
    await new Promise(r=>setTimeout(r,50));
  }
  return null;
}

function isRoot(){ return currentEmail === ROOT_EMAIL; }
function specialAccess(key){ return currentProfile?.specialAccess?.[key] === true; }
function canManageResources(){ return isRoot() || specialAccess("resources"); }
function canManageBudgetRoles(){ return isRoot() || DEFAULT_BUDGET_ROLE_MANAGERS.has(currentEmail) || specialAccess("budgetRoles"); }

function hideElement(el,hidden=true){ if(el) el.classList.toggle("hidden",hidden); }

function applySensitiveUi(){
  const root=isRoot();
  hideElement(document.getElementById("resourcesNavBtn"),!canManageResources());

  document.querySelectorAll('.tab-btn[data-tab="systems"], .tab-btn[data-tab="monitor"]').forEach(btn=>hideElement(btn,!root));
  if(!root){
    hideElement(document.getElementById("systemsTab"),true);
    hideElement(document.getElementById("monitorTab"),true);
    const active=document.querySelector('.tab-btn.active[data-tab="systems"], .tab-btn.active[data-tab="monitor"]');
    if(active){
      document.querySelector('.tab-btn[data-tab="users"]')?.click();
    }
  }

  document.querySelectorAll('[data-budget-role-field="1"]').forEach(field=>hideElement(field,!canManageBudgetRoles()));
  const budgetBtn=document.getElementById("budgetSyncBtn");
  if(budgetBtn) hideElement(budgetBtn,!canManageBudgetRoles());
}

async function injectRootDelegationControls(){
  if(!isRoot() || !portalDb) return;
  const form=document.getElementById("modalForm");
  const modal=document.getElementById("modal");
  if(!form || !modal || modal.classList.contains("hidden")) return;
  if(form.querySelector('[data-sensitive-access-field="1"]')) return;

  const emailInput=form.querySelector('input[name="email"]');
  const roleInput=form.querySelector('select[name="role"]');
  if(!emailInput || !roleInput || !emailInput.readOnly) return;

  const email=normalizedEmail(emailInput.value);
  if(!email || email===ROOT_EMAIL) return;
  const snap=await getDoc(doc(portalDb,"portalUsers",email));
  if(!snap.exists() || snap.data().role==="assistant") return;
  const data=snap.data();
  const access=data.specialAccess||{};

  const block=document.createElement("div");
  block.className="field";
  block.dataset.sensitiveAccessField="1";
  block.innerHTML=`
    <label>進階管理權限（只有文志可設定）</label>
    <div class="system-option-grid">
      <label class="system-option"><input type="checkbox" data-special-access="resources" ${access.resources===true?"checked":""}><span class="system-label"><span class="system-icon">🗂️</span><span>資料管理</span></span></label>
      <label class="system-option"><input type="checkbox" data-special-access="budgetRoles" ${access.budgetRoles===true?"checked":""}><span class="system-label"><span class="system-icon">💰</span><span>可調整經費系統角色</span></span></label>
    </div>
    <small style="display:block;margin-top:6px;color:#64748b">此區權限只有文志帳號可以授權或取消；被授權者不能再授權其他人。</small>`;
  const enabledCard=form.querySelector('.check-card');
  if(enabledCard?.parentNode) enabledCard.parentNode.insertBefore(block,enabledCard);
  else form.appendChild(block);

  block.querySelectorAll('[data-special-access]').forEach(input=>{
    input.addEventListener("change",async()=>{
      const key=input.dataset.specialAccess;
      input.disabled=true;
      try{
        await updateDoc(doc(portalDb,"portalUsers",email),{
          [`specialAccess.${key}`]:input.checked,
          specialAccessUpdatedAt:serverTimestamp(),
          specialAccessUpdatedBy:currentEmail
        });
      }catch(err){
        console.error("Sensitive access save failed:",err);
        input.checked=!input.checked;
        alert("進階管理權限儲存失敗："+(err?.message||"請稍後再試"));
      }finally{
        input.disabled=false;
      }
    });
  });
}

function guardUnauthorizedClicks(){
  document.addEventListener("click",e=>{
    const resource=e.target.closest?.('#resourcesNavBtn');
    if(resource && !canManageResources()){
      e.preventDefault();e.stopImmediatePropagation();
    }
    const sensitiveTab=e.target.closest?.('.tab-btn[data-tab="systems"], .tab-btn[data-tab="monitor"]');
    if(sensitiveTab && !isRoot()){
      e.preventDefault();e.stopImmediatePropagation();
    }
  },true);
}

function watchUi(){
  const observer=new MutationObserver(()=>{
    applySensitiveUi();
    setTimeout(injectRootDelegationControls,0);
  });
  observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:["class"]});
}

async function bootstrap(){
  const app=await waitForPortalApp();
  if(!app) return;
  const auth=getAuth(app);
  portalDb=getFirestore(app);
  guardUnauthorizedClicks();
  watchUi();

  onAuthStateChanged(auth,async user=>{
    currentEmail=normalizedEmail(user?.email);
    currentProfile=null;
    if(!currentEmail){ applySensitiveUi(); return; }
    try{
      const snap=await getDoc(doc(portalDb,"portalUsers",currentEmail));
      currentProfile=snap.exists()?snap.data():null;
    }catch(err){
      console.warn("Sensitive access profile load failed:",err);
    }
    applySensitiveUi();
    setTimeout(injectRootDelegationControls,100);
  });
}

bootstrap();
import("./file-exchange-addon.js?v=0.1.0").catch(err=>console.warn("File exchange module load failed:",err));
