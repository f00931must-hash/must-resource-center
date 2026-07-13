# MUST Resource Center Portal v1.0

明新科技大學資源教室行政平台入口網站。

## 上傳位置

請建立新的 GitHub Repository，例如：

`must-resource-center`

把這個壓縮檔內的全部檔案上傳到 Repository 最外層：

- index.html
- style.css
- portal-config.js
- app.js
- README.md

接著到 GitHub：

Settings → Pages → Deploy from a branch → main / root → Save

網址會是：

`https://f00931must-hash.github.io/must-resource-center/`

## 加入公告欄網址

打開 `portal-config.js`，找到：

```js
url: "請把公告欄網址貼在這裡",
enabled: false,
```

改成：

```js
url: "你的公告欄完整網址",
enabled: true,
```

## 未來新增系統

只需要在 `portal-config.js` 的陣列中複製一個項目並修改內容，不需要修改 index.html。
