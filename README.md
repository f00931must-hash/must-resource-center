# MUST Resource Center Portal v2.0.0

本版包含：

- Google 登入
- `portalUsers` 使用者驗證
- 依權限動態顯示 `systems`
- 最高管理者專用系統管理中心
- 新增／修改／停用使用者
- 設定每位使用者可進入哪些系統
- 新增／修改／停用未來系統與表單
- 內建操作手冊
- Firestore 安全規則

## 第一次部署步驟

### 1. Firebase Authentication 授權 GitHub Pages 網域

Firebase Console → Authentication → Settings → Authorized domains → Add domain

加入：

`f00931must-hash.github.io`

### 2. 套用 Firestore 安全規則

Firebase Console → Firestore Database → Rules

將專案內 `firestore.rules` 的全部內容貼上並按「Publish」。

> 請先確認 `portalUsers/master004400@gmail.com` 已存在，且 `enabled=true`、`role=admin`。

### 3. 上傳 GitHub

將本資料夾內所有檔案上傳到 `must-resource-center` Repository 最外層，覆蓋同名檔案：

- index.html
- style.css
- app.js
- firebase-config.js
- firestore.rules
- README.md

舊的 `portal-config.js` 本版已不再使用，可以保留也可以刪除。

### 4. 測試

開啟 GitHub Pages 網址並以 `master004400@gmail.com` 登入。

登入後應看到：

- 系統首頁
- 系統管理中心
- 操作手冊

## 現有 Firestore 資料

`systems` 內現有文件至少需要：

- `name`：string
- `enabled`：boolean
- `type`：string（shared / private / workspace）
- `icon`：string
- `order`：number
- `url`：string

`description` 可以之後直接在 Portal 管理中心補上。
