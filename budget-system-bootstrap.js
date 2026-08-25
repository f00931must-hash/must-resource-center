import { getApps } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
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

async function waitForPortalApp(){
  for(let i=0;i<100;i++){
    const apps=getApps();
    if(apps.length) return apps[0];
    await new Promise(r=>setTimeout(r,50));
  }
  return null;
}

async function bootstrapBudgetSystem(){
  const app=await waitForPortalApp();
  if(!app) return;
  const auth=getAuth(app);
  const db=getFirestore(app);

  onAuthStateChanged(auth,async user=>{
    if(!user?.email) return;
    try{
      const email=user.email.toLowerCase();
      const profileSnap=await getDoc(doc(db,"portalUsers",email));
      if(!profileSnap.exists() || profileSnap.data().role!=="admin") return;

      const systemRef=doc(db,"systems",SYSTEM_ID);
      const systemSnap=await getDoc(systemRef);
      if(!systemSnap.exists()){
        await setDoc(systemRef,{...SYSTEM_DATA,createdAt:serverTimestamp(),createdBy:email});
      }

      const usersSnap=await getDocs(collection(db,"portalUsers"));
      for(const userDoc of usersSnap.docs){
        const data=userDoc.data();
        if(data.enabled===false || data.role==="assistant") continue;
        if(data?.permissions?.[SYSTEM_ID]===true || (data.allowedSystems||[]).includes(SYSTEM_ID)) continue;
        await updateDoc(userDoc.ref,{[`permissions.${SYSTEM_ID}`]:true});
      }
    }catch(e){
      console.warn("Budget system bootstrap skipped:",e);
    }
  });
}

bootstrapBudgetSystem();
