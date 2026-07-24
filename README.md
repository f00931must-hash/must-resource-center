# 明新科技大學資源教室行政平台 Portal v2.0.0

## 已完成
- Google 登入
- 依 portalUsers 判斷帳號與權限
- 從 Firestore systems 動態建立首頁卡片
- 管理中心：老師新增、停用、權限設定
- 管理中心：系統新增、修改、排序、啟停
- 內建操作手冊
- 保留原版淺藍、圓角卡片風格並加強版面

## 第一次部署
1. Firebase Authentication → Settings → Authorized domains，加入 GitHub Pages 網域。
2. Firestore Database → Rules，貼上 `firestore.rules` 全部內容並 Publish。
3. 將本資料夾所有檔案上傳到原本 `must-resource-center` GitHub Repository。

## Firestore 必要資料
`portalUsers/master004400@gmail.com`
- displayName: 文志
- email: master004400@gmail.com
- enabled: true
- role: admin

`systems` 若為空，最高管理者第一次登入時會自動建立公告、活動、服務紀錄三個入口。

## 注意
子系統目前尚未改為讀取 Portal 權限，因此公告、活動、服務紀錄內原本的「老師管理」暫時仍有效。下一階段會逐一改造後再移除。
