# 🚀 完整部署流程（一頁搞定）

這份文件整合了所有部署步驟，讓您快速上線。

---

## 📋 準備清單

- [ ] GitHub 帳號
- [ ] Render 帳號（用 GitHub 登入）
- [ ] MongoDB Atlas 帳號（選填，但推薦）

---

## 🎯 部署流程（30 分鐘）

### Part 1: 設定資料庫（10 分鐘）- 可選

> 💡 如果不設定資料庫，遊戲仍可運行，但伺服器重啟後資料會清空

#### 快速步驟：

1. **註冊 MongoDB Atlas**: https://www.mongodb.com/cloud/atlas/register
2. **建立免費 Cluster**（選 Singapore）
3. **建立使用者** → 複製密碼
4. **設定網路** → 允許 `0.0.0.0/0`
5. **取得連線字串**：
   ```
   mongodb+srv://user:password@cluster.mongodb.net/city-builder?retryWrites=true&w=majority
   ```

詳細步驟：[MONGODB_SIMPLE.md](MONGODB_SIMPLE.md)

---

### Part 2: 推送到 GitHub（5 分鐘）

1. 在 GitHub 建立新倉庫

2. 推送程式碼：
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/你的用戶名/倉庫名.git
   git push -u origin main
   ```

---

### Part 3: 部署到 Render（15 分鐘）

#### 3.1 建立 Web Service

1. 登入 https://render.com（用 GitHub 登入）
2. 點 **「New +」** → **「Web Service」**
3. 選擇您的 GitHub 倉庫
4. 填寫資訊：

| 欄位 | 值 |
|------|---|
| Name | `city-builder-game` |
| Region | `Singapore` |
| Branch | `main` |
| Runtime | `Node` |
| Build Command | `npm install && npm run build` |
| Start Command | `npm start` |
| Instance Type | `Free` |

#### 3.2 設定環境變數

點 **「Environment」** → **「Add Environment Variable」**

**必填**：
```
NODE_ENV=production
HOST=0.0.0.0
PORT=10000
```

**如果有設定資料庫（推薦）**：
```
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/city-builder?retryWrites=true&w=majority
```

**如果要用 AI 功能（選填）**：
```
OPENAI_API_KEY=sk-xxx...
```

#### 3.3 部署

1. 點 **「Create Web Service」**
2. 等待 3-5 分鐘
3. 看到 ✅ **「Live」** 表示成功

---

## 🎮 測試部署

您的遊戲網址：`https://city-builder-game-xxxx.onrender.com`

### 測試項目：

- [ ] **玩家介面** `/` - 可以加入遊戲
- [ ] **主持人介面** `/host` - 可以控制遊戲
- [ ] **投影畫面** `/display` - 可以全螢幕展示
- [ ] **重新進入** - 關閉後可以重新連線
- [ ] **手機訪問** - 手機可以正常使用

---

## 📱 生成 QR Code

讓玩家掃描加入：

**線上工具**：
- https://www.qr-code-generator.com/
- 輸入您的網址
- 下載 QR Code

**Chrome 內建**：
1. 用 Chrome 開啟遊戲網址
2. 點網址列右邊「分享」圖示
3. 選「建立 QR Code」

---

## ⚠️ 重要提醒

### 暖機時間
Render 免費方案閒置 15 分鐘會休眠，首次訪問需等 30 秒。

**解決方案**：
- 活動前 10 分鐘先開啟一次
- 或使用 UptimeRobot 定時 ping

### 資料持久化
- ✅ **有資料庫**：伺服器重啟後資料不會丟失
- ❌ **沒資料庫**：伺服器重啟後資料會清空

建議活動期間不要重啟伺服器。

---

## 🔧 故障排除

### 問題：部署失敗

**檢查**：
- Build Command 是否正確
- package.json 是否完整
- 查看 Render 的部署日誌

### 問題：無法連線

**檢查**：
- 網址是否正確
- 是否在暖機中（等 30 秒）
- 防火牆是否阻擋

### 問題：資料庫連線失敗

**檢查**：
- MONGODB_URI 格式是否正確
- 密碼是否正確（沒有多餘空格）
- MongoDB Atlas 是否允許 0.0.0.0/0

---

## 📖 相關文件

- [快速部署指南](QUICK_START.md) - 10 分鐘極速部署
- [MongoDB 簡單設定](MONGODB_SIMPLE.md) - 5 步驟設定資料庫
- [MongoDB 詳細文件](MONGODB_SETUP.md) - 完整說明
- [部署詳細指南](DEPLOYMENT.md) - 多平台部署

---

## ✅ 部署完成檢查清單

活動開始前確認：

- [ ] 伺服器狀態為「Live」
- [ ] 玩家介面可以開啟
- [ ] 主持人介面可以登入
- [ ] 投影畫面可以全螢幕
- [ ] 手機可以正常訪問
- [ ] 測試加入遊戲功能
- [ ] 測試購買建築功能
- [ ] 測試重新進入功能
- [ ] 已暖機（避免首次延遲）
- [ ] QR Code 已準備好
- [ ] 投影設備已連接
- [ ] 主持人熟悉操作

---

## 🎊 準備就緒

所有設定完成！現在可以：

1. 📱 分享 QR Code 給玩家
2. 💻 主持人打開控制介面
3. 📺 投影畫面全螢幕展示
4. 🎮 開始您的尾牙活動！

祝活動圓滿成功！🎉
