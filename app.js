const grid = document.getElementById("systemGrid");
const systems = Array.isArray(window.PORTAL_SYSTEMS) ? window.PORTAL_SYSTEMS : [];

document.getElementById("systemCount").textContent =
  `${systems.filter(item => item.enabled).length} 個系統可使用`;

grid.innerHTML = systems.map(item => {
  const enabled = item.enabled && item.url && !item.url.includes("請把");
  const tag = enabled ? "a" : "div";
  const href = enabled ? `href="${escapeHtml(item.url)}"` : "";
  const target = enabled ? `target="_blank" rel="noopener"` : "";
  return `
    <${tag} class="system-card ${enabled ? "" : "disabled"}"
      ${href} ${target}
      style="--accent:${escapeHtml(item.accent || "#3b82f6")};--accent-soft:${escapeHtml(item.accentSoft || "#eff6ff")}">
      <div class="card-top">
        <div class="icon">${escapeHtml(item.icon || "🔗")}</div>
        <span class="status ${enabled ? "" : "soon"}">${escapeHtml(item.status || (enabled ? "使用中" : "建置中"))}</span>
      </div>
      <h2>${escapeHtml(item.title || "未命名系統")}</h2>
      <p>${escapeHtml(item.description || "")}</p>
      <div class="enter">${enabled ? "進入系統 →" : "建置中"}</div>
    </${tag}>`;
}).join("");

function escapeHtml(value){
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#039;"
  }[char]));
}
