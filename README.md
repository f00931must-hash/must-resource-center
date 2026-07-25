# Portal v3.1.0 穩定修正版

## 修正
- 修正新增協作者時 `ownerEmail: undefined`。
- 協作者與老師權限卡片只顯示友善系統名稱。
- 老師與協作者新增刪除按鈕。
- 刪除老師時會提醒先完成學生轉移，並同步移除其 Portal 協作者帳號。
- 服務紀錄同步錯誤訊息更明確。
- Firestore 容量文字改為「目前無法由純前端讀取」，避免誤認為系統故障。

## 服務紀錄同步必要步驟
請到「服務紀錄 Firebase → Firestore → Rules」，貼上本包內：

`SERVICE-RECORD-firestore-v1.0.5.rules`

並按 Publish。這版允許既有 `authorizedTeachers/{uid}` 啟用帳號完成第一次建立 `settings/serviceAccess`；建立後仍由 serviceAccess 管理員控制更新。

## Portal Firebase
Portal 自己的 Rules 請貼上本包內 `firestore.rules` 並發布。
