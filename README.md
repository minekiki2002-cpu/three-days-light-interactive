# 《假如給我三天光明》互動學習網站

四年級國語文互動教材，包含六關連續的閱讀與寫作主線、兩座語文工具站、全班文字雲／想法牆，以及十題成效檢核。

## 直接使用

雙擊專案根目錄的 `index.html` 即可離線開啟。為避免 iPad 或本機瀏覽器因單一檔案過大而顯示空白，請保留 `index.html` 與旁邊的 `public` 資料夾，不要只移動 HTML。

離線模式可以使用所有學習關卡、PNG／PDF 下載與同一瀏覽器分頁間的示範同步。不同 iPad 若要把答案即時送到教師大螢幕，必須完成下方 Firebase 設定。

## 課程結構

主線依序為：

1. 同一個地方，兩次發現
2. 讀懂海倫的提醒
3. 第一人稱與第三人稱
4. 困難、方法、支持與影響
5. 工作、環境與合理調整
6. 把觀察寫成讀者能感受的文字

語文工具站為：

- 毛字偵探所：部件判讀、查證、造詞與同音詞語境
- 句子診療院：圈出病灶、自行改詞、需要時再看提示

學生可下載閱讀標註 PNG 與個人成效檢核 PDF；教師端可下載文字雲 PNG 及包含觀察、心得的課堂紀錄 PDF。

## 啟用跨 iPad 即時收件

1. 在 Firebase 建立 Web App。
2. 開啟 Authentication 的「匿名」登入方式。
3. 建立 Cloud Firestore。
4. 將 `.env.example` 複製為 `.env`，填入 Firebase Web App 提供的六項設定值。
5. 部署 `firestore.rules`。
6. 重新執行建置，再把線上版發布至 HTTPS 網址。

未填 Firebase 設定時，畫面會明確顯示「本機練習模式」，不會誤導學生以為教師已收到答案。

## 開發與驗證

需要 Node.js 22.13 以上。

```bash
npm install
npm run dev
npm run lint
npm test
npm run build:pages
```

- `npm test`：重建真正單檔版並檢查八站、十題、探索流程、匯出功能與插圖是否完整。
- `npm run build:offline`：產生離線單檔，輸出在 `offline-dist/offline-src/index.html`。
- `npm run build:pages`：產生可部署的網站版本，輸出在 `pages-dist/`。

寫作教練是依本課規準在瀏覽器本機執行的檢查，不是生成式 AI，也不會把學生作文傳到外部服務。
