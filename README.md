# MUST Resource Center Portal v3.0.0

## 本版新增
- 服務紀錄權限同步：同步個管老師與協作者到 `settings/serviceAccess`。
- 一鍵同步公告、活動、服務紀錄三套系統。
- 系統監控中心：即時讀取公開 GitHub Repository 容量、版本及最後更新時間。
- 權限代碼相容：`campaign/announcement`、`event/activity`、`folder_shared/serviceRecord`。
- 身分顯示改為系統管理員、個管老師、協作者。

## 上線前必要步驟
1. 上傳 Portal 全部檔案。
2. 發布 Portal 的 `firestore.rules`（本版規則與 v2.2 相同）。
3. 服務紀錄系統需使用隨附的 v1.0.4 規則，並在目前管理者的 `authorizedTeachers/{uid}` 增加 `role: admin`。
4. 回 Portal 按「同步服務」，第一次會要求登入服務紀錄 Firebase。

## 容量說明
GitHub 容量可透過公開 API 讀取。Firestore 跨專案精準儲存容量無法由純前端安全取得，因此畫面明確標示「需後端串接」，不使用假數字。
