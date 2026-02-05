# 🚀 部署指南

## 📋 目錄
- [方案選擇](#方案選擇)
- [Render 部署（推薦）](#render-部署推薦)
- [其他平台部署](#其他平台部署)
- [環境變數設定](#環境變數設定)
- [常見問題](#常見問題)

---

## 方案選擇

### 🎯 推薦：Render（免費方案）

**優點：**
- ✅ 完全免費，無需信用卡
- ✅ 自動部署，連接 GitHub 即可
- ✅ 支援 Node.js + Socket.IO
- ✅ 自動提供 HTTPS 憑證
- ✅ 簡單易用

**缺點：**
- ⚠️ 閒置 15 分鐘後休眠（首次訪問需等 30 秒暖機）

**適合場景：**
- 尾牙活動、年會活動
- 短期使用（幾小時到幾天）
- 預算有限

---

## Render 部署（推薦）

### 步驟 1：準備 GitHub 倉庫

1. 在 GitHub 建立一個新倉庫
2. 將專案推送到 GitHub：

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/你的用戶名/你的倉庫名.git
git push -u origin main
```

### 步驟 2：註冊 Render

1. 前往 [Render.com](https://render.com)
2. 使用 GitHub 帳號註冊/登入

### 步驟 3：建立 Web Service

1. 點擊「New +」→「Web Service」
2. 選擇您的 GitHub 倉庫
3. 配置如下：

   - **Name**: `city-builder-game`（或您喜歡的名稱）
   - **Region**: `Singapore`（最接近台灣）
   - **Branch**: `main`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`

### 步驟 4：設定環境變數

在 Render 的「Environment」頁面加入以下環境變數：

| Key | Value | 說明 |
|-----|-------|------|
| `NODE_ENV` | `production` | 生產環境 |
| `HOST` | `0.0.0.0` | 監聽所有介面 |
| `PORT` | `10000` | Render 預設 Port |
| `OPENAI_API_KEY` | `你的 API Key` | OpenAI API Key（可選） |

> 💡 提示：如果不使用 AI 功能，可以不設定 `OPENAI_API_KEY`

### 步驟 5：部署

1. 點擊「Create Web Service」
2. 等待 3-5 分鐘部署完成
3. 部署成功後，Render 會提供一個網址，例如：
   ```
   https://city-builder-game.onrender.com
   ```

### 步驟 6：訪問遊戲

- **玩家介面**: `https://你的網址.onrender.com/`
- **主持人**: `https://你的網址.onrender.com/host`
- **投影畫面**: `https://你的網址.onrender.com/display`

---

## 其他平台部署

### Railway

1. 前往 [Railway.app](https://railway.app)
2. 連接 GitHub 倉庫
3. 選擇「Deploy from GitHub repo」
4. 設定環境變數（同 Render）
5. 部署完成

**費用**: $5 免費額度/月

### Fly.io

```bash
# 安裝 Fly CLI
curl -L https://fly.io/install.sh | sh

# 登入
fly auth login

# 部署
fly launch
fly deploy
```

**費用**: 有限免費額度

### Heroku

```bash
# 安裝 Heroku CLI
npm install -g heroku

# 登入
heroku login

# 建立應用
heroku create city-builder-game

# 部署
git push heroku main
```

**費用**: 免費方案已取消，最低 $5/月

---

## 環境變數設定

### 必要變數

```env
NODE_ENV=production
HOST=0.0.0.0
PORT=10000
```

### 可選變數

```env
# OpenAI API（使用 AI 功能時需要）
OPENAI_API_KEY=sk-xxx

# 遊戲設定（使用預設值即可）
GAME_ROUNDS=10
ROUND_DURATION_OPEN=45000
ROUND_DURATION_LOCK=5000
ROUND_DURATION_RESOLVE=10000
ROUND_DURATION_NARRATE=10000
ROUND_DURATION_PUBLISH=5000
```

---

## 常見問題

### Q1: 首次訪問很慢怎麼辦？

**A**: Render 免費方案會在閒置 15 分鐘後休眠。首次訪問需要等待 30 秒暖機。

**解決方案**：
- 活動前 10 分鐘先打開一次網站
- 或使用 [UptimeRobot](https://uptimerobot.com) 每 15 分鐘自動 ping 一次

### Q2: 玩家資料會丟失嗎？

**A**: 目前資料存在伺服器記憶體中。

**情況分析**：
- ✅ 玩家重新整理頁面：不會丟失（使用 localStorage）
- ✅ 伺服器運行中：不會丟失
- ❌ 伺服器重啟：會丟失

**建議**：
- 活動期間避免重啟伺服器
- 或加入 MongoDB 資料庫持久化

### Q3: 如何加入資料庫持久化？

**A**: 可以使用 MongoDB Atlas（免費 512MB）

1. 註冊 [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. 建立免費叢集
3. 取得連線字串
4. 加入環境變數：
   ```env
   MONGODB_URI=mongodb+srv://...
   ```
5. 修改程式碼使用 MongoDB（需額外開發）

### Q4: 如何設定自訂網域？

**A**: Render 免費方案不支援自訂網域。

**替代方案**：
- 使用 Render 提供的 `.onrender.com` 網域
- 或升級到付費方案（$7/月）

### Q5: 遊戲支援多少人同時在線？

**A**:
- Render 免費方案：約 50-100 人
- Railway：約 100-200 人
- 如需更多：建議使用 VPS 或專用伺服器

### Q6: WebSocket 連線失敗怎麼辦？

**A**:
1. 確認防火牆沒有阻擋
2. 檢查 CORS 設定
3. 使用 HTTPS（Render 自動提供）
4. 檢查 Socket.IO 版本相容性

---

## 📞 技術支援

如有問題，請參考：
- [Render 官方文件](https://render.com/docs)
- [Socket.IO 部署指南](https://socket.io/docs/v4/deployment/)
- 本專案 GitHub Issues

---

## 🎉 部署成功檢查清單

- [ ] 伺服器成功啟動
- [ ] 健康檢查通過 (`/api/health`)
- [ ] 玩家介面可訪問
- [ ] 主持人介面可訪問
- [ ] 投影畫面可訪問
- [ ] Socket.IO 連線正常
- [ ] 可以建立遊戲並加入玩家
- [ ] 手機可以正常訪問

完成以上檢查後，就可以開始您的尾牙活動了！🎊
