# 🏙️ AI 城市建設戰 - 尾牙互動遊戲

一個適合尾牙場合的互動遊戲系統，玩家共同建設一座虛擬城市，個人貢獻決定抽獎權重。

## 核心概念

- **合作 + 排名**：不是競爭淘汰，全場一起蓋城市
- **個人貢獻 = 抽獎權重**：玩得越好，中獎機率越高
- **AI 市長播報**：AI 負責產生有趣的事件劇情
- **分層抽獎**：前 10% 大獎池、中間 60% 中獎池、後 30% 普獎池 + 全員保底

## 快速開始

### 1. 安裝依賴

```bash
npm install
```

### 2. 設定環境變數

```bash
cp .env.example .env
# 編輯 .env，填入 OpenAI API Key（選填，沒有會用備援文字）
```

### 3. 啟動伺服器

```bash
npm start
```

### 4. 開啟各端介面

- **玩家端**：http://localhost:3000/
- **主持人**：http://localhost:3000/host（密碼：banquet2024）
- **投影畫面**：http://localhost:3000/display

## 遊戲流程

### 回合結構（75 秒/回合）

| 階段 | 時長 | 說明 |
|------|------|------|
| OPEN | 45s | 玩家選擇行動 |
| LOCK | 5s | 封盤 |
| RESOLVE | 10s | 系統結算 |
| NARRATE | ≤10s | AI 生成旁白 |
| PUBLISH | 5s | 顯示結果 |

### 玩家行動

| 行動 | 消耗 | 基礎分 | 說明 |
|------|------|--------|------|
| 💰 投資 | 20金+1能 | 50 | 高風險高報酬 |
| 🔧 修復 | 10金+1能 | 30 | 災難時有加成 |
| 🔬 研究 | 15金+2能 | 25 | 科技事件加成 |
| ❤️ 公益 | 5金+1能 | 15 | 提升民心 |
| 👀 觀察 | 0 | 10 | 保底參與分 |

### 投資建築

- 🏭 工廠：高產能但有污染風險
- 🏫 學校：穩定發展，科技加成
- 🌳 公園：提升民心，抗污染
- 🏦 金融區：高波動，景氣敏感
- 🎡 娛樂區：穩定收益，民心加成

## 事件系統

事件效果完全由系統決定，AI 只負責「講故事」：

### 事件類型

- **DISASTER** 災難：需要修復派上用場
- **ECONOMY** 景氣：投資策略的價值
- **PUBLIC** 民意：民心系統出場
- **MYSTERY** 神秘：彩蛋任務、翻盤
- **TECH** 科技：研究玩家加成
- **WELFARE** 福利：雨露均霑

### AI 安全機制

- AI 只能引用 `display_numbers` 中的數值
- 不能自己編造數字或規則
- 1.2 秒超時自動使用備援文字
- 輸出經過安全檢查

## 抽獎系統

### 權重計算

```
抽獎權重 = 分數 × (1 + 民心加成)
民心加成 = floor(民心 / 10) × 5%
```

### 分層規則

| 層級 | 比例 | 抽獎次數 |
|------|------|----------|
| TOP | 前 10% | 保底 + 4 次 |
| MID | 中 60% | 保底 + 1 次 |
| BOTTOM | 後 30% | 保底 1 次 |

## 專案結構

```
├── index.html          # 玩家端頁面
├── host.html           # 主持人控制台
├── display.html        # 投影畫面
├── client/
│   └── player.js       # 玩家端邏輯
├── server/
│   ├── index.js        # 伺服器主程式
│   ├── game/
│   │   └── GameEngine.js    # 遊戲引擎
│   ├── models/
│   │   ├── Player.js        # 玩家模型
│   │   └── City.js          # 城市模型
│   ├── services/
│   │   ├── aiService.js     # AI 服務
│   │   └── lotteryService.js # 抽獎服務
│   └── data/
│       ├── events.js        # 事件牌庫
│       └── fallbacks.js     # 備援文字
└── shared/
    └── config.js       # 共用設定
```

## API 端點

### REST API

- `GET /api/health` - 健康檢查
- `GET /api/config` - 取得遊戲設定
- `GET /api/game/state` - 取得遊戲狀態
- `GET /api/lottery/prizes` - 取得獎品列表
- `POST /api/lottery/prizes` - 設定獎品

### Socket.IO 事件

#### 玩家端

- `player:join` - 加入遊戲
- `player:action` - 提交行動
- `player:stateUpdate` - 狀態更新

#### 主持人端

- `host:register` - 註冊主持人
- `host:startGame` - 開始遊戲
- `host:skipPhase` - 跳過階段
- `host:lottery` - 執行抽獎
- `host:reset` - 重置遊戲

## 自訂設定

### 修改回合數

編輯 `shared/config.js`：

```javascript
rounds: {
  total: 10,  // 改成你要的回合數
  ...
}
```

### 修改獎品

編輯 `server/services/lotteryService.js` 的 `DEFAULT_PRIZES` 或透過 API 設定。

### 修改事件

編輯 `server/data/events.js` 的 `EVENT_DECK`。

## 注意事項

1. **網路環境**：確保所有玩家在同一個區域網路
2. **AI 備援**：即使沒有 OpenAI API，遊戲也能正常運作
3. **投影畫面**：建議使用全螢幕模式
4. **玩家人數**：建議 10-100 人
5. **回合時間**：可根據現場狀況調整

## License

MIT
