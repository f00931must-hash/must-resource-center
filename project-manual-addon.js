const PROJECT_MANUAL_HTML = `
<h2>專案對照表</h2>
<p>此頁用於系統維護與交接，整理目前各服務的專案名稱與用途。僅記錄專案名稱與功能，不放 API Key、密碼或其他機密。</p>

<h3>GitHub 專案</h3>
<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;min-width:720px">
<thead><tr><th style="text-align:left;padding:10px;border-bottom:1px solid #dbe3ee">Repository</th><th style="text-align:left;padding:10px;border-bottom:1px solid #dbe3ee">對應系統／用途</th></tr></thead>
<tbody>
<tr><td style="padding:10px;border-bottom:1px solid #edf2f7"><code>must-resource-center</code></td><td style="padding:10px;border-bottom:1px solid #edf2f7">資源教室行政平台入口、權限同步、操作手冊、系統監控。</td></tr>
<tr><td style="padding:10px;border-bottom:1px solid #edf2f7"><code>must-resource-platform</code></td><td style="padding:10px;border-bottom:1px solid #edf2f7">資源教室公告欄。</td></tr>
<tr><td style="padding:10px;border-bottom:1px solid #edf2f7"><code>must-activity-system</code></td><td style="padding:10px;border-bottom:1px solid #edf2f7">活動公告、學生報名、活動回饋與成果報告。</td></tr>
<tr><td style="padding:10px;border-bottom:1px solid #edf2f7"><code>must-service-record-system</code></td><td style="padding:10px;border-bottom:1px solid #edf2f7">學生服務紀錄、AI 潤飾、紀錄匯出。</td></tr>
<tr><td style="padding:10px;border-bottom:1px solid #edf2f7"><code>must-admin-document-system</code></td><td style="padding:10px;border-bottom:1px solid #edf2f7">行政文書／新生 ISP 總表。</td></tr>
<tr><td style="padding:10px;border-bottom:1px solid #edf2f7"><code>must-credit-checker</code></td><td style="padding:10px;border-bottom:1px solid #edf2f7">學分檢核、時序表、歷史成績與畢業學分計算。</td></tr>
<tr><td style="padding:10px;border-bottom:1px solid #edf2f7"><code>must-resource-budget-system</code></td><td style="padding:10px;border-bottom:1px solid #edf2f7">資教經費／預算與支出管理。</td></tr>
<tr><td style="padding:10px;border-bottom:1px solid #edf2f7"><code>must-resource-assets</code></td><td style="padding:10px;border-bottom:1px solid #edf2f7">公告與活動使用的公開圖片、附件資產庫。</td></tr>
<tr><td style="padding:10px;border-bottom:1px solid #edf2f7"><code>must-resource-private-assets</code></td><td style="padding:10px;border-bottom:1px solid #edf2f7">需限制存取的私人資產／附件存放區。</td></tr>
<tr><td style="padding:10px"><code>must-isp-ai-cloudrun</code></td><td style="padding:10px">新生 ISP AI 的 Google Cloud Run 後端程式與部署來源。</td></tr>
</tbody></table></div>

<h3>Firebase 專案</h3>
<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;min-width:720px">
<thead><tr><th style="text-align:left;padding:10px;border-bottom:1px solid #dbe3ee">Firebase Project ID</th><th style="text-align:left;padding:10px;border-bottom:1px solid #dbe3ee">對應系統／用途</th></tr></thead>
<tbody>
<tr><td style="padding:10px;border-bottom:1px solid #edf2f7"><code>must-resource-center-portal</code></td><td style="padding:10px;border-bottom:1px solid #edf2f7">入口平台帳號、權限與系統入口資料。</td></tr>
<tr><td style="padding:10px;border-bottom:1px solid #edf2f7"><code>must-resource-platform</code></td><td style="padding:10px;border-bottom:1px solid #edf2f7">公告系統資料與公告後台權限。</td></tr>
<tr><td style="padding:10px;border-bottom:1px solid #edf2f7"><code>must-activity-form</code></td><td style="padding:10px;border-bottom:1px solid #edf2f7">活動資料、報名資料、回饋資料與活動後台權限。</td></tr>
<tr><td style="padding:10px;border-bottom:1px solid #edf2f7"><code>must-service-record-system</code></td><td style="padding:10px;border-bottom:1px solid #edf2f7">服務紀錄系統學生資料、紀錄與權限。</td></tr>
<tr><td style="padding:10px;border-bottom:1px solid #edf2f7"><code>must-administrative-document</code></td><td style="padding:10px;border-bottom:1px solid #edf2f7">行政文書／新生 ISP 資料與權限。</td></tr>
<tr><td style="padding:10px;border-bottom:1px solid #edf2f7"><code>must-credit-checker</code></td><td style="padding:10px;border-bottom:1px solid #edf2f7">學分檢核學生資料、時序表與權限。</td></tr>
<tr><td style="padding:10px"><code>must-resource-budget-system</code></td><td style="padding:10px">經費系統預算、支出與相關資料。</td></tr>
</tbody></table></div>

<h3>AI、Cloud Run 與 Cloudflare</h3>
<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;min-width:720px">
<thead><tr><th style="text-align:left;padding:10px;border-bottom:1px solid #dbe3ee">專案／服務名稱</th><th style="text-align:left;padding:10px;border-bottom:1px solid #dbe3ee">用途</th></tr></thead>
<tbody>
<tr><td style="padding:10px;border-bottom:1px solid #edf2f7"><code>must-isp-ai</code>（Cloud Run）</td><td style="padding:10px;border-bottom:1px solid #edf2f7">新生 ISP AI 潤飾與摘要 API，目前部署於 <code>asia-east1（台灣）</code>。</td></tr>
<tr><td style="padding:10px;border-bottom:1px solid #edf2f7"><code>My First Project</code>（Google Cloud 顯示名稱）</td><td style="padding:10px;border-bottom:1px solid #edf2f7">目前承載 <code>must-isp-ai</code> Cloud Run 服務。</td></tr>
<tr><td style="padding:10px;border-bottom:1px solid #edf2f7"><code>MUST Service Record AI</code>（Google AI Studio）</td><td style="padding:10px;border-bottom:1px solid #edf2f7">目前可用的 Gemini API 專案；服務紀錄 AI 與 ISP Cloud Run 使用的 Gemini 金鑰來源。</td></tr>
<tr><td style="padding:10px;border-bottom:1px solid #edf2f7"><code>must-resource-ai</code>（Cloudflare Worker）</td><td style="padding:10px;border-bottom:1px solid #edf2f7">服務紀錄 AI；並保留舊版 ISP AI 路徑供必要時回復。</td></tr>
<tr><td style="padding:10px;border-bottom:1px solid #edf2f7"><code>must-free-upload-service</code>（Cloudflare Worker）</td><td style="padding:10px;border-bottom:1px solid #edf2f7">公告／活動共用圖片與附件上傳服務。</td></tr>
<tr><td style="padding:10px"><code>must-resource-budget-notify</code>（Google Cloud）</td><td style="padding:10px">經費系統通知／寄信相關專案。</td></tr>
</tbody></table></div>

<div class="note"><strong>維護原則：</strong>正式使用中的 Firebase 資料不可因改版任意刪除、改名、搬移或批次覆寫。若日後新增、改名或停用專案，請同步更新此對照表。</div>
`;

function showProjectsManual(event){
  if(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
  const content = document.getElementById("manualContent");
  if(!content) return;
  content.innerHTML = PROJECT_MANUAL_HTML;
  document.querySelectorAll(".manual-link").forEach(btn => btn.classList.toggle("active", btn.dataset.manual === "projects"));
}

document.addEventListener("click", event => {
  const button = event.target.closest('.manual-link[data-manual="projects"]');
  if(button) showProjectsManual(event);
}, true);
