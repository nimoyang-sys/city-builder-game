# 🚀 MongoDB 超簡單設定（5 步驟，10 分鐘）

## 為什麼需要？
✅ 伺服器重啟後資料不會丟失
✅ 玩家可以隨時重新進入遊戲

---

## 步驟 1: 註冊 MongoDB Atlas（2 分鐘）

1. 打開 https://www.mongodb.com/cloud/atlas/register
2. 填寫資訊：
   - Email
   - 密碼
   - 選 **「I'm learning MongoDB」**
3. 點 **「Create your Atlas account」**

---

## 步驟 2: 建立免費資料庫（3 分鐘）

登入後會自動進入建立畫面：

1. 選擇 **「M0 FREE」**（免費方案）
2. **Cloud Provider**: 選 **AWS**
3. **Region**: 選 **Singapore** 或 **Hong Kong**
4. **Cluster Name**: 隨便取（例如：`city-builder`）
5. 點 **「Create」** 按鈕
6. 等待 1-2 分鐘建立完成

---

## 步驟 3: 建立使用者（2 分鐘）

畫面會跳出設定視窗：

### 3.1 建立資料庫使用者
1. **Username**: 輸入 `gameuser`（或任意名稱）
2. **Password**: 點 **「Autogenerate Secure Password」**
3. ⚠️ **複製密碼並保存**（待會要用）
4. 點 **「Create User」**

### 3.2 設定網路
1. 選擇 **「My Local Environment」**
2. 點 **「Add My Current IP Address」**
3. 再點 **「Add Entry」** 輸入：
   - IP: `0.0.0.0/0`
   - Description: `Allow all`
4. 點 **「Finish and Close」**

---

## 步驟 4: 取得連線字串（2 分鐘）

1. 回到主畫面，點 **「Connect」** 按鈕
2. 選 **「Drivers」**
3. 選擇：
   - Driver: **Node.js**
   - Version: **5.5 or later**
4. 複製連線字串（長這樣）：
   ```
   mongodb+srv://gameuser:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

5. **修改連線字串**：
   - 把 `<password>` 換成步驟 3 的密碼
   - 在 `.net/` 後面加上 `city-builder`

   最終結果：
   ```
   mongodb+srv://gameuser:你的密碼@cluster0.xxxxx.mongodb.net/city-builder?retryWrites=true&w=majority
   ```

---

## 步驟 5: 設定到專案（1 分鐘）

### 本地測試

建立 `.env` 檔案：
```bash
cp .env.example .env
```

編輯 `.env`，加入連線字串：
```env
MONGODB_URI=mongodb+srv://gameuser:你的密碼@cluster0.xxxxx.mongodb.net/city-builder?retryWrites=true&w=majority
```

啟動伺服器：
```bash
npm install
npm start
```

看到這個訊息就成功了：
```
✅ Connected to MongoDB
```

### Render 部署

1. 登入 Render Dashboard
2. 進入您的 Web Service
3. 點 **「Environment」**
4. 點 **「Add Environment Variable」**
5. 填入：
   - Key: `MONGODB_URI`
   - Value: `mongodb+srv://gameuser:你的密碼@cluster0.xxxxx.mongodb.net/city-builder?retryWrites=true&w=majority`
6. 點 **「Save Changes」**

Render 會自動重新部署，完成！

---

## ✅ 驗證是否成功

### 本地測試
啟動後看到：
```
🔌 Connecting to MongoDB...
✅ Connected to MongoDB
```

### 功能測試
1. 加入遊戲
2. 購買一些建築
3. 關閉瀏覽器
4. 重新開啟 → 資料應該還在 ✅
5. 重啟伺服器 → 資料應該還在 ✅

---

## 🔥 常見問題

### Q: 忘記密碼怎麼辦？
A:
1. 進入 MongoDB Atlas
2. 左邊選單點 **「Database Access」**
3. 編輯使用者 → 重設密碼

### Q: 連線失敗？
A: 檢查：
1. 密碼是否正確（沒有多餘空格）
2. 連線字串格式是否正確
3. 是否設定 `0.0.0.0/0` 允許所有 IP

### Q: 沒設定資料庫可以用嗎？
A: 可以！遊戲仍能運行，但伺服器重啟後資料會清空。

---

## 🎯 下一步

資料庫設定完成後：

1. ✅ 本地測試遊戲
2. ✅ 推送到 GitHub
3. ✅ 部署到 Render
4. ✅ 開始活動！

---

**就這麼簡單！🎉**

詳細文件請參考：[MONGODB_SETUP.md](MONGODB_SETUP.md)
