# 🗄️ MongoDB Atlas 設定指南

本指南將幫助您設定免費的 MongoDB Atlas 資料庫，實現資料持久化。

## 為什麼需要資料庫？

**沒有資料庫：**
- ❌ 伺服器重啟後，所有玩家資料會清空
- ✅ 玩家重新整理頁面可以恢復（使用 localStorage）

**有資料庫：**
- ✅ 伺服器重啟後，玩家資料仍然保留
- ✅ 玩家關閉網頁後再次進入，資料完整恢復
- ✅ 可以進行多場次活動

---

## 📋 MongoDB Atlas 免費方案

- **容量**: 512MB
- **價格**: 完全免費
- **足夠**: 可容納數百場遊戲記錄
- **適合**: 尾牙活動、年會等短期使用

---

## 🚀 設定步驟（10 分鐘）

### 步驟 1: 註冊 MongoDB Atlas

1. 前往 [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
2. 填寫註冊資訊：
   - Email
   - Password
   - 選擇 **「I'm learning MongoDB」**（學習使用）

3. 點擊 **「Create your Atlas account」**

### 步驟 2: 建立免費叢集

1. 登入後會看到 **「Create a cluster」** 畫面
2. 選擇 **「Shared」**（免費方案）
3. 配置選項：
   - **Cloud Provider**: 選擇 **AWS**
   - **Region**: 選擇 **Singapore** 或 **Hong Kong**（最接近台灣）
   - **Cluster Tier**: **M0 Sandbox** (Free)
   - **Cluster Name**: `city-builder`（或任意名稱）

4. 點擊 **「Create Cluster」**
5. 等待 1-3 分鐘建立完成

### 步驟 3: 設定資料庫存取

#### 3.1 建立資料庫使用者

1. 左側選單點擊 **「Database Access」**
2. 點擊 **「Add New Database User」**
3. 填寫資訊：
   - **Authentication Method**: **Password**
   - **Username**: `citybuilder`（或任意名稱）
   - **Password**: 點擊 **「Autogenerate Secure Password」** 並**複製密碼**
   - **Database User Privileges**: **Read and write to any database**

4. 點擊 **「Add User」**

> 💡 **重要**: 請把密碼複製保存好，稍後會用到

#### 3.2 設定網路存取

1. 左側選單點擊 **「Network Access」**
2. 點擊 **「Add IP Address」**
3. 選擇 **「Allow Access from Anywhere」**
   - 會自動填入 `0.0.0.0/0`
4. 點擊 **「Confirm」**

> ⚠️ 注意：這樣設定任何 IP 都可以連線，但需要帳號密碼才能存取，對於活動使用是安全的

### 步驟 4: 取得連線字串

1. 回到 **「Database」** 頁面
2. 點擊您的 cluster 的 **「Connect」** 按鈕
3. 選擇 **「Connect your application」**
4. 選擇：
   - **Driver**: **Node.js**
   - **Version**: **5.5 or later**

5. 複製連線字串，格式如下：
   ```
   mongodb+srv://citybuilder:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

6. **重要修改**：
   - 將 `<password>` 替換為您剛才複製的密碼
   - 在 `/` 後加入資料庫名稱：`city-builder`

   最終格式：
   ```
   mongodb+srv://citybuilder:你的密碼@cluster0.xxxxx.mongodb.net/city-builder?retryWrites=true&w=majority
   ```

---

## 🔧 設定到專案

### 本地開發

1. 建立 `.env` 檔案（如果還沒有）：
   ```bash
   cp .env.example .env
   ```

2. 編輯 `.env`，加入連線字串：
   ```env
   MONGODB_URI=mongodb+srv://citybuilder:你的密碼@cluster0.xxxxx.mongodb.net/city-builder?retryWrites=true&w=majority
   ```

3. 重新啟動伺服器：
   ```bash
   npm start
   ```

4. 看到以下訊息表示連接成功：
   ```
   🔌 Connecting to MongoDB...
   ✅ Connected to MongoDB
   ```

### Render 部署

1. 登入 [Render Dashboard](https://dashboard.render.com)
2. 進入您的 Web Service
3. 點擊 **「Environment」** 標籤
4. 點擊 **「Add Environment Variable」**
5. 加入：
   - **Key**: `MONGODB_URI`
   - **Value**: 您的完整連線字串

6. 點擊 **「Save Changes」**
7. Render 會自動重新部署

---

## ✅ 驗證資料庫連線

### 方法 1: 查看伺服器日誌

啟動伺服器後，應該看到：
```
🔌 Connecting to MongoDB...
✅ Connected to MongoDB
```

### 方法 2: 測試遊戲功能

1. 加入遊戲並購買一些建築
2. 重新整理頁面 → 資料應該恢復
3. 關閉瀏覽器並重新開啟 → 資料應該恢復
4. 重啟伺服器 → 資料應該恢復

### 方法 3: 查看 MongoDB Atlas 資料

1. 登入 [MongoDB Atlas](https://cloud.mongodb.com)
2. 進入您的 cluster
3. 點擊 **「Collections」**
4. 應該可以看到：
   - `players` - 玩家資料
   - `gamestate` - 遊戲狀態

---

## 🔍 常見問題

### Q1: 連線失敗怎麼辦？

**檢查清單**：
- ✅ 連線字串中的密碼是否正確
- ✅ 是否已設定網路存取 (0.0.0.0/0)
- ✅ 是否已建立資料庫使用者
- ✅ 連線字串格式是否正確

**解決方案**：
```bash
# 檢查環境變數
echo $MONGODB_URI

# 測試連線
node -e "require('mongoose').connect(process.env.MONGODB_URI).then(() => console.log('OK')).catch(e => console.error(e))"
```

### Q2: 沒有連線字串遊戲能運行嗎？

**可以！** 遊戲仍然可以正常運行，只是資料不會持久化。

啟動時會看到：
```
⚠️  MONGODB_URI not set, running without database persistence
```

### Q3: 免費方案有什麼限制？

- **儲存空間**: 512MB（足夠數百場遊戲）
- **連線數**: 500 個並發連線
- **備份**: 不提供自動備份
- **效能**: 適合小型應用

對於尾牙活動來說，完全足夠！

### Q4: 資料會保留多久？

- **免費方案**: 只要您的帳號活躍，資料會一直保留
- **非活躍**: 60 天沒有連線，cluster 可能被暫停（可重新啟動）

### Q5: 如何清空資料？

有三種方式：

**方式 1: 透過主持人介面**
- 點擊「重置遊戲」按鈕

**方式 2: 透過 MongoDB Atlas**
1. 進入 Collections
2. 刪除 `players` 和 `gamestate` collection

**方式 3: 透過程式**
```javascript
// 在伺服器端執行
await clearAllPlayers();
await resetGameStateInDB();
```

### Q6: 可以用其他資料庫嗎？

可以！但需要修改程式碼。目前支援：
- ✅ MongoDB Atlas (推薦)
- ⚠️ 本地 MongoDB (需自行安裝)
- ❌ MySQL/PostgreSQL (需修改程式碼)

---

## 📊 資料結構

### Players Collection

```javascript
{
  playerId: "player_1234567890_abc123",
  name: "玩家名字",
  coins: 500,
  score: 150,
  buildings: {
    "RESTAURANT": 2,
    "SHOP": 1
  },
  achievements: ["FIRST_BUILDING", "RICH"],
  items: ["BOOST_CARD"],
  connected: true,
  joinedAt: ISODate("2024-01-15T10:00:00Z")
}
```

### GameState Collection

```javascript
{
  _id: "current_game",
  state: "BUILDING",
  cityBuildings: {
    "RESTAURANT": 5,
    "SHOP": 3
  },
  totalPlayers: 10,
  connectedPlayers: 8,
  startedAt: ISODate("2024-01-15T10:00:00Z")
}
```

---

## 🎯 下一步

資料庫設定完成後：

1. ✅ 測試重新連線功能
2. ✅ 測試伺服器重啟後資料恢復
3. ✅ 部署到 Render
4. ✅ 準備活動流程

---

## 📞 需要幫助？

- 📖 [MongoDB Atlas 官方文件](https://docs.atlas.mongodb.com/)
- 💬 [MongoDB 社群論壇](https://www.mongodb.com/community/forums/)
- 🐛 回報問題到專案 GitHub Issues

---

🎉 **設定完成！現在您的遊戲已經具備完整的資料持久化功能！**
