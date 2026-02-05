# ⚡ 快速部署指南

這份指南將幫助您在 10 分鐘內將遊戲部署到雲端。

## 🎯 最快路徑：Render 免費部署

### 前置準備（3 分鐘）

1. **GitHub 帳號**
   - 如果沒有，前往 [GitHub](https://github.com) 註冊

2. **Fork 專案**
   - 將本專案 Fork 到您的 GitHub 帳號

3. **Render 帳號**
   - 前往 [Render.com](https://render.com)
   - 使用 GitHub 帳號登入

### 部署步驟（5 分鐘）

#### 步驟 1: 建立 Web Service

1. 登入 Render 後，點擊 **「New +」** → **「Web Service」**
2. 選擇您剛 Fork 的倉庫
3. 點擊 **「Connect」**

#### 步驟 2: 配置服務

填入以下資訊：

| 欄位 | 值 |
|------|---|
| **Name** | `city-builder-game`（或任意名稱） |
| **Region** | `Singapore`（最接近台灣） |
| **Branch** | `main` |
| **Runtime** | `Node` |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm start` |
| **Instance Type** | `Free` |

#### 步驟 3: 設定環境變數

在 **「Environment」** 區塊，點擊 **「Add Environment Variable」**，加入：

```
NODE_ENV=production
HOST=0.0.0.0
PORT=10000
```

> 💡 如果要使用 AI 功能，再加入 `OPENAI_API_KEY`

#### 步驟 4: 部署

1. 點擊 **「Create Web Service」**
2. 等待 3-5 分鐘（可以看到部署日誌）
3. 看到 ✅ **「Live」** 表示部署成功

#### 步驟 5: 獲取網址

部署完成後，Render 會提供一個網址，例如：
```
https://city-builder-game-xxxx.onrender.com
```

### 測試部署（2 分鐘）

1. **打開玩家介面**
   ```
   https://你的網址.onrender.com/
   ```
   - 輸入名字加入遊戲

2. **打開主持人介面**
   ```
   https://你的網址.onrender.com/host
   ```
   - 點擊「開始遊戲」

3. **打開投影畫面**
   ```
   https://你的網址.onrender.com/display
   ```
   - 全螢幕顯示在大螢幕上

### 🎉 完成！

現在您可以：
- 📱 生成 QR Code 讓玩家掃描加入
- 🎮 透過主持人介面控制遊戲
- 📺 在投影幕上展示遊戲狀態

---

## 📱 生成 QR Code

### 方法 1: 線上工具

前往 [QR Code Generator](https://www.qr-code-generator.com/)：
1. 輸入您的遊戲網址
2. 下載 QR Code 圖片
3. 投影給玩家掃描

### 方法 2: Chrome 內建

1. 在 Chrome 打開遊戲網址
2. 點擊網址列右側的「分享」圖示
3. 選擇「建立 QR Code」
4. 掃描或下載

---

## ⚠️ 重要提醒

### 暖機時間

Render 免費方案會在閒置 15 分鐘後休眠，首次訪問需要 30 秒暖機：

**解決方案**：
- 🕐 活動前 10 分鐘先開啟一次
- 🔄 使用 [UptimeRobot](https://uptimerobot.com) 定時 ping

### 資料持久化

目前資料存在伺服器記憶體：
- ✅ 玩家重新整理頁面：資料不會丟失
- ✅ 短時間網路斷線：可以重新連接
- ❌ 伺服器重啟：所有資料會清空

**建議**：
- 活動期間不要重啟伺服器
- 活動時間控制在 2-4 小時內

---

## 🔧 故障排除

### 問題 1: 部署失敗

**檢查**：
- Build Command 是否正確
- `package.json` 是否完整
- 查看部署日誌的錯誤訊息

**解決**：
- 確認本地可以正常運行 `npm install && npm start`
- 檢查 Node.js 版本（需要 18+）

### 問題 2: 無法連線 WebSocket

**檢查**：
- 是否使用 HTTPS（Render 自動提供）
- 瀏覽器主控台是否有錯誤
- 防火牆是否阻擋

**解決**：
- 使用最新版 Chrome 或 Safari
- 檢查企業網路設定

### 問題 3: 畫面空白

**檢查**：
- 網址是否正確
- 是否在暖機中（等待 30 秒）
- 瀏覽器主控台錯誤訊息

**解決**：
- 重新整理頁面
- 清除瀏覽器快取
- 換個瀏覽器試試

---

## 📞 需要幫助？

- 📖 [完整部署文件](DEPLOYMENT.md)
- 🐛 [回報問題](https://github.com/你的倉庫/issues)
- 💬 聯絡開發者

---

## ✅ 部署檢查清單

在活動開始前，確認以下項目：

- [ ] 伺服器部署成功，狀態為「Live」
- [ ] 玩家介面可以正常開啟
- [ ] 主持人介面可以正常登入
- [ ] 投影畫面可以全螢幕顯示
- [ ] 手機可以掃描 QR Code 並加入遊戲
- [ ] 測試購買建築功能正常
- [ ] Socket.IO 即時同步正常
- [ ] 已暖機（避免首次訪問延遲）
- [ ] 準備好投影設備和音響
- [ ] 主持人熟悉操作流程

---

🎊 **準備就緒，祝您的活動圓滿成功！**
