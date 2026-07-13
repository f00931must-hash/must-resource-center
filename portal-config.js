/*
  之後新增、刪除或修改入口，只要改這個檔案即可。
  url 請填完整網址。
  enabled: false 會顯示「建置中」，無法點擊。
*/
window.PORTAL_SYSTEMS = [
  {
    title: "資源教室公告欄",
    description: "查看重要公告、活動資訊、修課通知與獎助學金。",
    icon: "📢",
    url: "請把公告欄網址貼在這裡",
    enabled: false,
    status: "請設定網址",
    accent: "#8b5cf6",
    accentSoft: "#f3e8ff"
  },
  {
    title: "活動報名系統",
    description: "活動報名、回饋填寫、名單管理與成果統計。",
    icon: "🎉",
    url: "https://f00931must-hash.github.io/must-activity-system/",
    enabled: true,
    status: "使用中",
    accent: "#0ea5e9",
    accentSoft: "#e0f2fe"
  },
  {
    title: "資產借用系統",
    description: "設備借用、歸還與庫存查詢。",
    icon: "📦",
    url: "",
    enabled: false,
    status: "未來新增",
    accent: "#f59e0b",
    accentSoft: "#fef3c7"
  },
  {
    title: "文件與行政工具",
    description: "未來整合 ISP、ITP、合理調整與文件產生功能。",
    icon: "📝",
    url: "",
    enabled: false,
    status: "未來新增",
    accent: "#10b981",
    accentSoft: "#d1fae5"
  }
];
