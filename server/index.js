/**
 * 創智動能 2026 城市建設 - 尾牙互動遊戲
 * 後端伺服器主程式
 */

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { GameEngine } from './game/GameEngine.js';
import { LotteryManager, DEFAULT_PRIZES } from './services/lotteryService.js';
import { MiniGameManager } from './game/MiniGameManager.js';
import { GAME_CONFIG, ROLES, ACHIEVEMENTS, ACHIEVEMENT_CATEGORIES, ITEM_CARDS, ITEM_CATEGORIES, CITY_GOALS, BUILDING_UPGRADES, MINI_GAMES } from '../shared/config.js';
import { connectDB } from './db/mongodb.js';
import { hashPassword, verifyPassword, generatePlayerId, normalizeName } from './utils/crypto.js';

// 載入環境變數
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 初始化 Express
const app = express();
const httpServer = createServer(app);

// 初始化 Socket.IO（優化高並發設定）
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  // 效能優化設定（支援 30+ 玩家）
  pingTimeout: 60000,           // Ping 超時時間
  pingInterval: 25000,          // Ping 間隔
  maxHttpBufferSize: 1e6,       // 1MB 緩衝區
  transports: ['websocket', 'polling'],  // 優先使用 WebSocket
  allowUpgrades: true,          // 允許升級到 WebSocket
  perMessageDeflate: {          // 壓縮設定
    threshold: 1024             // 超過 1KB 才壓縮
  }
});

// 中介軟體
app.use(cors());
app.use(express.json());

// 靜態檔案服務
app.use(express.static(path.join(__dirname, '..')));
app.use('/client', express.static(path.join(__dirname, '../client')));

// 頁面路由
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'));
});

app.get('/host', (req, res) => {
  res.sendFile(path.join(__dirname, '../host.html'));
});

app.get('/display', (req, res) => {
  res.sendFile(path.join(__dirname, '../display.html'));
});

// 遊戲實例
const gameEngine = new GameEngine();
const lotteryManager = new LotteryManager();
const miniGameManager = new MiniGameManager();

// 設定預設獎品
lotteryManager.setPrizes('TOP', DEFAULT_PRIZES.TOP);
lotteryManager.setPrizes('MID', DEFAULT_PRIZES.MID);
lotteryManager.setPrizes('BOTTOM', DEFAULT_PRIZES.BOTTOM);

// 主持人 Socket ID
let hostSocketId = null;

// 全域錯誤處理（防止未捕獲的異常導致伺服器崩潰）
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  console.error('Stack:', error.stack);
  // 不要退出進程，繼續運行
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise);
  console.error('Reason:', reason);
  // 不要退出進程，繼續運行
});

// 連接資料庫並載入遊戲狀態
connectDB().then(async () => {
  await gameEngine.loadFromDatabase();
}).catch((error) => {
  console.error('❌ Failed to connect to database:', error);
});

// ========== REST API ==========

// 健康檢查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// 伺服器狀態監控（新增）
app.get('/api/server/status', (req, res) => {
  const mongoose = require('mongoose');

  res.json({
    server: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      nodeVersion: process.version
    },
    socketIO: {
      connectedClients: io.engine.clientsCount,
      rooms: io.sockets.adapter.rooms.size
    },
    database: {
      connected: mongoose.connection.readyState === 1,
      poolSize: mongoose.connection.client?.s?.options?.maxPoolSize || 'N/A'
    },
    game: {
      state: gameEngine.state,
      players: gameEngine.players.size,
      buildings: Object.keys(gameEngine.cityBuildings).length
    },
    timestamp: Date.now()
  });
});

// 取得遊戲設定
app.get('/api/config', (req, res) => {
  res.json({
    game: GAME_CONFIG.game,
    buildings: GAME_CONFIG.buildings,
    categories: GAME_CONFIG.categories,
    lottery: GAME_CONFIG.lottery,
    roles: ROLES,
    achievements: ACHIEVEMENTS,
    achievementCategories: ACHIEVEMENT_CATEGORIES,
    items: ITEM_CARDS,
    itemCategories: ITEM_CATEGORIES,
    cityGoals: CITY_GOALS,
    buildingUpgrades: BUILDING_UPGRADES,
    miniGames: MINI_GAMES
  });
});

// 取得遊戲狀態
app.get('/api/game/state', (req, res) => {
  res.json(gameEngine.getGameState());
});

// 取得所有事件（主持人用）
app.get('/api/events', (req, res) => {
  res.json(gameEngine.getAllEventsForHost());
});

// 取得獎品列表
app.get('/api/lottery/prizes', (req, res) => {
  res.json(lotteryManager.getPrizeList());
});

// 設定獎品（主持人用）
app.post('/api/lottery/prizes', (req, res) => {
  const { tier, prizes } = req.body;
  try {
    lotteryManager.setPrizes(tier, prizes);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ========== Socket.IO 事件 ==========

io.on('connection', (socket) => {
  console.log('✅ Client connected:', socket.id, `(Total: ${io.engine.clientsCount})`);

  // ===== 玩家事件 =====

  // 加入遊戲
  socket.on('player:join', async ({ name, password, tableNumber }) => {
    // 驗證密碼
    if (!password) {
      socket.emit('player:error', { message: '請輸入密碼' });
      return;
    }

    // 驗證名稱
    if (!name || name.trim().length === 0) {
      socket.emit('player:error', { message: '請輸入名稱' });
      return;
    }

    const trimmedName = name.trim();

    // 驗證名稱長度（中文3字、英文8字母）
    const nameLength = [...trimmedName].length; // 正確計算 emoji 和中文字數
    const hasChineseChar = /[\u4e00-\u9fa5]/.test(trimmedName);

    if (hasChineseChar && nameLength > 3) {
      socket.emit('player:error', { message: '名稱過長！中文最多 3 個字' });
      return;
    }

    if (!hasChineseChar && nameLength > 8) {
      socket.emit('player:error', { message: '名稱過長！英文最多 8 個字母' });
      return;
    }

    // 檢查名字是否已被使用（不分大小寫）
    const normalizedInputName = normalizeName(trimmedName);
    const existingPlayerWithSameName = Array.from(gameEngine.players.values()).find(p =>
      normalizeName(p.name) === normalizedInputName
    );

    if (existingPlayerWithSameName) {
      // 如果是同一個人用不同密碼登入，提示密碼錯誤
      socket.emit('player:error', { message: '此名稱已被使用，請使用正確的密碼或更換名稱' });
      return;
    }

    // 加密密碼
    const passwordHash = hashPassword(password);

    // 根據名字+密碼生成固定的 playerId（名字會被標準化為小寫）
    const playerId = generatePlayerId(trimmedName, passwordHash);

    // 嘗試用 playerId 添加或恢復玩家
    const player = await gameEngine.addPlayerWithPassword(socket.id, playerId, trimmedName, passwordHash, tableNumber);

    if (!player) {
      socket.emit('player:error', { message: '密碼錯誤！請確認您的密碼' });
      return;
    }

    socket.emit('player:joined', {
      player: gameEngine.getPlayerState(player),
      gameState: gameEngine.getGameState()
    });

    // 檢查是否有進行中的小遊戲，並通知新玩家
    const activeGames = miniGameManager.getActiveGames();
    for (const game of activeGames) {
      if (game.type === 'quiz') {
        socket.emit('minigame:quizQuestion', game.data);
      } else if (game.type === 'beerWaiting') {
        socket.emit('minigame:beerWaitingStart', game.data);
      } else if (game.type === 'beerActive') {
        socket.emit('minigame:beerGameStarted', game.data);
      } else if (game.type === 'poker') {
        socket.emit('minigame:pokerStarted', game.data);
      } else if (game.type === 'songGuess') {
        socket.emit('minigame:songGuessGameStarted');
        if (game.data.roundActive) {
          socket.emit('minigame:songGuessRoundStarted', {
            round: game.data.currentRound,
            allPlayers: game.data.allPlayers
          });
        }
      }
    }

    // 檢查是否有進行中的限時搶購
    const flashSaleStatus = gameEngine.getFlashSaleStatus();
    if (flashSaleStatus.active) {
      socket.emit('game:flashSaleStarted', flashSaleStatus);
    }

    // 通知其他人
    socket.broadcast.emit('game:playerJoined', gameEngine.getPlayerPublicInfo(player));

    // 通知主持人
    io.to('host').emit('game:playerJoined', gameEngine.getPlayerPublicInfo(player));
  });

  // 重新連線
  socket.on('player:reconnect', async ({ playerId }) => {
    const player = await gameEngine.reconnectPlayer(socket.id, playerId);
    if (player) {
      socket.emit('player:reconnected', {
        player: gameEngine.getPlayerState(player),
        gameState: gameEngine.getGameState()
      });

      // 檢查是否有進行中的小遊戲，並通知重新連線的玩家
      const activeGames = miniGameManager.getActiveGames();
      for (const game of activeGames) {
        if (game.type === 'quiz') {
          socket.emit('minigame:quizQuestion', game.data);
        } else if (game.type === 'beerWaiting') {
          socket.emit('minigame:beerWaitingStart', game.data);
        } else if (game.type === 'beerActive') {
          socket.emit('minigame:beerGameStarted', game.data);
        } else if (game.type === 'poker') {
          socket.emit('minigame:pokerStarted', game.data);
        } else if (game.type === 'songGuess') {
          socket.emit('minigame:songGuessGameStarted');
          if (game.data.roundActive) {
            socket.emit('minigame:songGuessRoundStarted', {
              round: game.data.currentRound,
              allPlayers: game.data.allPlayers
            });
          }
        }
      }

      // 檢查是否有進行中的限時搶購
      const flashSaleStatus = gameEngine.getFlashSaleStatus();
      if (flashSaleStatus.active) {
        socket.emit('game:flashSaleStarted', flashSaleStatus);
      }
    } else {
      socket.emit('player:notFound');
    }
  });

  // 購買建築
  socket.on('player:buyBuilding', ({ buildingId }) => {
    const result = gameEngine.buyBuilding(socket.id, buildingId);
    socket.emit('player:buyResult', result);

    if (result.success) {
      const player = gameEngine.getPlayerBySocketId(socket.id);
      socket.emit('player:stateUpdate', gameEngine.getPlayerState(player));
    }
  });

  // 取得玩家狀態
  socket.on('player:getState', () => {
    const player = gameEngine.getPlayerBySocketId(socket.id);
    if (player) {
      socket.emit('player:stateUpdate', gameEngine.getPlayerState(player));
    }
  });

  // 取得成就列表
  socket.on('player:getAchievements', () => {
    const player = gameEngine.getPlayerBySocketId(socket.id);
    if (player) {
      const achievements = gameEngine.getAllAchievementsForPlayer(player.id);
      console.log(`Sending ${achievements.length} achievements to ${player.name}`);
      socket.emit('player:achievements', { achievements });
    } else {
      console.log('player:getAchievements - player not found for socket', socket.id);
    }
  });

  // 購買道具
  socket.on('player:buyItem', ({ itemId }) => {
    const result = gameEngine.buyItem(socket.id, itemId);
    socket.emit('player:buyItemResult', result);

    if (result.success) {
      const player = gameEngine.getPlayerBySocketId(socket.id);
      socket.emit('player:stateUpdate', gameEngine.getPlayerState(player));
    }
  });

  // 使用道具
  socket.on('player:useItem', ({ itemId }) => {
    const result = gameEngine.useItem(socket.id, itemId);
    socket.emit('player:useItemResult', result);

    if (result.success) {
      const player = gameEngine.getPlayerBySocketId(socket.id);
      socket.emit('player:stateUpdate', gameEngine.getPlayerState(player));

      // 如果道具效果產生了建築，通知投影畫面和主持人更新
      if (result.buildingGained || result.buildingCopied) {
        const gameState = gameEngine.getGameState();

        // 通知投影畫面更新城市建築（包含建築列表）
        io.emit('game:cityBuildingsUpdate', {
          cityBuildings: gameEngine.getCityBuildingStats(),
          cityBuildingList: gameEngine.getCityBuildingList(),
          leaderboard: gameEngine.getLeaderboard()
        });

        // 通知主持人更新
        io.to('host').emit('game:stateUpdate', gameState);
      }
    }
  });

  // 取得玩家道具
  socket.on('player:getItems', () => {
    const player = gameEngine.getPlayerBySocketId(socket.id);
    if (player) {
      socket.emit('player:items', {
        items: player.items,
        activeEffects: player.activeEffects
      });
    }
  });

  // 取得可升級建築
  socket.on('player:getUpgradeable', () => {
    const upgradeable = gameEngine.getUpgradeableBuildings(socket.id);
    socket.emit('player:upgradeable', { upgradeable });
  });

  // 升級建築
  socket.on('player:upgradeBuilding', ({ buildingId }) => {
    const result = gameEngine.upgradeBuilding(socket.id, buildingId);
    socket.emit('player:upgradeResult', result);

    if (result.success) {
      const player = gameEngine.getPlayerBySocketId(socket.id);
      socket.emit('player:stateUpdate', gameEngine.getPlayerState(player));
    }
  });

  // 搶購限時特賣
  socket.on('player:buyFlashSale', () => {
    const result = gameEngine.buyFlashSale(socket.id);
    socket.emit('player:flashSaleResult', result);

    if (result.success) {
      const player = gameEngine.getPlayerBySocketId(socket.id);
      socket.emit('player:stateUpdate', gameEngine.getPlayerState(player));
    }
  });

  // 取得限時搶購狀態
  socket.on('player:getFlashSale', () => {
    const status = gameEngine.getFlashSaleStatus();
    socket.emit('player:flashSaleStatus', status);
  });

  // ===== 主持人事件 =====

  // 註冊為主持人
  socket.on('host:register', ({ password }) => {
    // 優先使用環境變數中的密碼，否則使用配置文件中的密碼
    const correctPassword = process.env.HOST_PASSWORD || GAME_CONFIG.host.password;

    if (password === correctPassword) {
      hostSocketId = socket.id;
      socket.emit('host:registered', {
        success: true,
        events: gameEngine.getAllEventsForHost()
      });
      socket.join('host');
      console.log('Host registered:', socket.id);
    } else {
      socket.emit('host:registered', { success: false, error: '密碼錯誤' });
    }
  });

  // 開始遊戲
  socket.on('host:startGame', () => {
    if (socket.id !== hostSocketId) {
      socket.emit('host:error', { error: '無權限' });
      return;
    }
    const result = gameEngine.startGame();
    socket.emit('host:result', result);
  });

  // 開始建設階段
  socket.on('host:startBuilding', () => {
    if (socket.id !== hostSocketId) {
      socket.emit('host:error', { error: '無權限' });
      return;
    }
    const result = gameEngine.startBuildingPhase();
    socket.emit('host:result', result);
  });

  // 發布事件
  socket.on('host:triggerEvent', ({ eventId }) => {
    if (socket.id !== hostSocketId) {
      socket.emit('host:error', { error: '無權限' });
      return;
    }
    const result = gameEngine.triggerEvent(eventId);
    socket.emit('host:eventResult', result);
  });

  // 結算互動事件
  socket.on('host:settleInteractiveEvent', ({ eventId, winners, losers, participants }) => {
    if (socket.id !== hostSocketId) {
      socket.emit('host:error', { error: '無權限' });
      return;
    }
    const result = gameEngine.settleInteractiveEvent({ eventId, winners, losers, participants });
    socket.emit('host:result', result);
  });

  // 取消互動事件
  socket.on('host:cancelInteractiveEvent', ({ eventId }) => {
    if (socket.id !== hostSocketId) {
      socket.emit('host:error', { error: '無權限' });
      return;
    }
    const result = gameEngine.cancelInteractiveEvent();
    socket.emit('host:result', result);
  });

  // 手動加分
  socket.on('host:addScore', ({ playerId, amount, reason }) => {
    if (socket.id !== hostSocketId) {
      socket.emit('host:error', { error: '無權限' });
      return;
    }
    const result = gameEngine.addScore(playerId, amount, reason);
    socket.emit('host:result', result);
  });

  // 批量加分
  socket.on('host:addScoreBatch', ({ playerIds, amount, reason }) => {
    if (socket.id !== hostSocketId) {
      socket.emit('host:error', { error: '無權限' });
      return;
    }
    const results = gameEngine.addScoreBatch(playerIds, amount, reason);
    socket.emit('host:result', { success: true, results });
  });

  // 批次加金幣
  socket.on('host:addCoinsBatch', ({ playerIds, amount, reason }) => {
    if (socket.id !== hostSocketId) {
      socket.emit('host:error', { error: '無權限' });
      return;
    }
    const results = gameEngine.addCoinsBatch(playerIds, amount, reason);
    socket.emit('host:result', { success: true, results });
  });

  // 結束遊戲
  socket.on('host:endGame', () => {
    if (socket.id !== hostSocketId) {
      socket.emit('host:error', { error: '無權限' });
      return;
    }
    const result = gameEngine.endGame();
    socket.emit('host:result', result);
  });

  // 執行抽獎
  socket.on('host:lottery', ({ type }) => {
    if (socket.id !== hostSocketId) {
      socket.emit('host:error', { error: '無權限' });
      return;
    }

    if (gameEngine.state !== 'ENDED') {
      socket.emit('host:error', { error: '遊戲尚未結束' });
      return;
    }

    const players = gameEngine.getLeaderboard();
    const playersWithLotteryInfo = lotteryManager.calculatePlayerLotteryInfo(players);

    let results;
    if (type === 'guaranteed') {
      results = lotteryManager.executeGuaranteedDraw(playersWithLotteryInfo);
    } else if (type === 'tiered') {
      results = lotteryManager.executeTieredDraw(playersWithLotteryInfo);
    } else if (type === 'single') {
      const player = playersWithLotteryInfo[0];
      results = [lotteryManager.draw(player)];
    }

    io.emit('lottery:results', results);
    socket.emit('lottery:status', lotteryManager.getStatus());
  });

  // ===== 頒獎典禮控制（依排名順序） =====

  // 開始頒獎（顯示投影畫面）
  socket.on('host:awardStart', ({ players, prizeCount }) => {
    if (socket.id !== hostSocketId) {
      socket.emit('host:error', { error: '無權限' });
      return;
    }

    if (gameEngine.state !== 'ENDED') {
      socket.emit('host:error', { error: '遊戲尚未結束' });
      return;
    }

    // 更新 GameEngine 的抽獎狀態
    gameEngine.lotteryState = {
      active: true,
      players: players,
      prizeCount: prizeCount,
      currentRank: 0,
      winners: []
    };

    // 發送給所有客戶端（特別是投影畫面）
    io.emit('award:start', { players, prizeCount });
    console.log('Award ceremony started with', prizeCount, 'prizes');
  });

  // 揭曉下一位得獎者
  socket.on('host:awardReveal', ({ rank, winner }) => {
    if (socket.id !== hostSocketId) {
      socket.emit('host:error', { error: '無權限' });
      return;
    }

    // 更新抽獎狀態
    if (gameEngine.lotteryState.active) {
      gameEngine.lotteryState.currentRank = rank;
      gameEngine.lotteryState.winners.push({ rank, winner });
    }

    io.emit('award:reveal', { rank, winner });
    console.log(`Award #${rank}: ${winner.name}`);
  });

  // 關閉頒獎
  socket.on('host:awardClose', () => {
    if (socket.id !== hostSocketId) {
      socket.emit('host:error', { error: '無權限' });
      return;
    }

    // 重置抽獎狀態
    gameEngine.lotteryState = {
      active: false,
      players: [],
      prizeCount: 0,
      currentRank: 0,
      winners: []
    };

    io.emit('award:close');
    console.log('Award ceremony closed');
  });

  // 保留舊的抽獎事件（相容性）
  socket.on('host:lotteryStart', ({ players }) => {
    io.emit('lottery:start', { players });
  });
  socket.on('host:lotterySpin', () => { io.emit('lottery:spin'); });
  socket.on('host:lotteryStop', () => { io.emit('lottery:stop'); });
  socket.on('host:lotteryNext', () => { io.emit('lottery:next'); });
  socket.on('host:lotteryClose', () => { io.emit('lottery:close'); });
  socket.on('lottery:winner', (data) => {
    io.to('host').emit('lottery:winnerAnnounced', data);
  });

  // 分配角色
  socket.on('host:assignRoles', () => {
    if (socket.id !== hostSocketId) {
      socket.emit('host:error', { error: '無權限' });
      return;
    }
    const result = gameEngine.assignRoles();
    socket.emit('host:result', result);
  });

  // 為單一玩家指定角色
  socket.on('host:assignRoleToPlayer', ({ playerId, roleId }) => {
    if (socket.id !== hostSocketId) {
      socket.emit('host:error', { error: '無權限' });
      return;
    }
    const result = gameEngine.assignRoleToPlayer(playerId, roleId);
    socket.emit('host:result', result);

    // 通知該玩家
    const player = gameEngine.getPlayer(playerId);
    if (player && player.socketId) {
      io.to(player.socketId).emit('player:roleAssigned', { role: ROLES[roleId] });
    }
  });

  // 發放道具給玩家
  socket.on('host:giveItem', ({ playerId, itemId }) => {
    if (socket.id !== hostSocketId) {
      socket.emit('host:error', { error: '無權限' });
      return;
    }
    const result = gameEngine.giveItem(playerId, itemId);
    socket.emit('host:result', result);

    // 通知該玩家
    const player = gameEngine.getPlayer(playerId);
    if (player && player.socketId) {
      io.to(player.socketId).emit('player:itemReceived', {
        item: ITEM_CARDS[itemId],
        reason: '主持人發放'
      });
    }
  });

  // 啟用城市目標
  socket.on('host:activateCityGoal', ({ goalId }) => {
    if (socket.id !== hostSocketId) {
      socket.emit('host:error', { error: '無權限' });
      return;
    }
    const result = gameEngine.activateCityGoal(goalId);
    socket.emit('host:result', result);
  });

  // 停用城市目標
  socket.on('host:deactivateCityGoal', ({ goalId }) => {
    if (socket.id !== hostSocketId) {
      socket.emit('host:error', { error: '無權限' });
      return;
    }
    const result = gameEngine.deactivateCityGoal(goalId);
    socket.emit('host:result', result);
  });

  // 取得城市目標列表
  socket.on('host:getCityGoals', () => {
    if (socket.id !== hostSocketId) {
      socket.emit('host:error', { error: '無權限' });
      return;
    }
    const goals = gameEngine.getAllCityGoals();
    socket.emit('host:cityGoals', { goals });
  });

  // 開始限時搶購
  socket.on('host:startFlashSale', ({ buildingId, salePrice, quantity, duration }) => {
    if (socket.id !== hostSocketId) {
      socket.emit('host:error', { error: '無權限' });
      return;
    }
    const result = gameEngine.startFlashSale(buildingId, salePrice, quantity, duration);
    socket.emit('host:result', result);
  });

  // 結束限時搶購
  socket.on('host:endFlashSale', () => {
    if (socket.id !== hostSocketId) {
      socket.emit('host:error', { error: '無權限' });
      return;
    }
    const result = gameEngine.endFlashSale();
    socket.emit('host:result', result);
  });

  // 取得限時搶購狀態
  socket.on('host:getFlashSale', () => {
    if (socket.id !== hostSocketId) {
      socket.emit('host:error', { error: '無權限' });
      return;
    }
    const status = gameEngine.getFlashSaleStatus();
    socket.emit('host:flashSaleStatus', status);
  });

  // ===== 小遊戲事件 =====

  // 快問快答 - 主持人開始
  socket.on('host:startQuiz', () => {
    if (socket.id !== hostSocketId) {
      socket.emit('host:error', { error: '無權限' });
      return;
    }
    const result = miniGameManager.startQuiz();
    socket.emit('host:result', result);
  });

  // 快問快答 - 主持人結束遊戲
  socket.on('host:endQuiz', () => {
    if (socket.id !== hostSocketId) {
      socket.emit('host:error', { error: '無權限' });
      return;
    }
    const result = miniGameManager.closeQuizGame();
    socket.emit('host:result', result);
  });

  // 快問快答 - 玩家提交答案
  socket.on('player:submitQuizAnswer', ({ answerIndex }) => {
    const player = gameEngine.getPlayerBySocketId(socket.id);
    if (!player) {
      socket.emit('player:error', { message: '玩家不存在' });
      return;
    }

    const result = miniGameManager.submitQuizAnswer(player.id, player.name, answerIndex);
    socket.emit('player:quizAnswerResult', result);
  });

  // 喝啤酒比賽 - 主持人開始等待
  socket.on('host:startBeerWaiting', () => {
    if (socket.id !== hostSocketId) {
      socket.emit('host:error', { error: '無權限' });
      return;
    }
    const result = miniGameManager.startBeerWaiting();
    socket.emit('host:result', result);
  });

  // 喝啤酒比賽 - 玩家加入
  socket.on('player:joinBeer', () => {
    const player = gameEngine.getPlayerBySocketId(socket.id);
    if (!player) {
      console.log('[Server] Player:joinBeer failed - player not found for socket:', socket.id);
      socket.emit('player:error', { message: '玩家不存在' });
      return;
    }

    console.log(`[Server] Player ${player.name} (${player.id}) requesting to join beer game`);
    const result = miniGameManager.joinBeer(player.id, player.name);
    console.log('[Server] Join beer result:', result);
    socket.emit('player:joinBeerResult', result);
  });

  // 喝啤酒比賽 - 主持人開始遊戲
  socket.on('host:startBeerGame', () => {
    if (socket.id !== hostSocketId) {
      socket.emit('host:error', { error: '無權限' });
      return;
    }
    const result = miniGameManager.startBeerGame();
    socket.emit('host:result', result);
  });

  // 喝啤酒比賽 - 主持人設定排名
  socket.on('host:setBeerRankings', ({ rankings }) => {
    if (socket.id !== hostSocketId) {
      socket.emit('host:error', { error: '無權限' });
      return;
    }
    const result = miniGameManager.setBeerRankings(rankings);
    socket.emit('host:result', result);

    // 發放獎勵給玩家
    if (result.success) {
      result.results.forEach(r => {
        gameEngine.addScore(r.playerId, r.reward, `喝啤酒比賽第${r.rank}名`);
      });
    }
  });

  // 喝啤酒比賽 - 主持人結束遊戲
  socket.on('host:endBeerGame', () => {
    if (socket.id !== hostSocketId) {
      socket.emit('host:error', { error: '無權限' });
      return;
    }
    const result = miniGameManager.endBeerGame();
    socket.emit('host:result', result);
  });

  // 比大小 - 主持人開始遊戲
  socket.on('host:startPoker', () => {
    if (socket.id !== hostSocketId) {
      socket.emit('host:error', { error: '無權限' });
      return;
    }
    const result = miniGameManager.startPokerGame();
    socket.emit('host:result', result);
  });

  // 比大小 - 主持人下一局
  socket.on('host:nextPokerRound', () => {
    if (socket.id !== hostSocketId) {
      socket.emit('host:error', { error: '無權限' });
      return;
    }
    const result = miniGameManager.nextPokerRound();
    socket.emit('host:result', result);
  });

  // 比大小 - 主持人結束整個遊戲
  socket.on('host:endPokerGame', () => {
    if (socket.id !== hostSocketId) {
      socket.emit('host:error', { error: '無權限' });
      return;
    }
    const result = miniGameManager.endPokerGame();
    socket.emit('host:result', result);
  });

  // 比大小 - 玩家下注
  socket.on('player:placeBet', ({ bet }) => {
    const player = gameEngine.getPlayerBySocketId(socket.id);
    if (!player) {
      socket.emit('player:error', { message: '玩家不存在' });
      return;
    }

    const result = miniGameManager.placeBet(player.id, player.name, bet);
    socket.emit('player:placeBetResult', result);
  });

  // 猜歌曲前奏 - 主持人開始遊戲
  socket.on('host:startSongGuessGame', () => {
    if (socket.id !== hostSocketId) {
      socket.emit('host:error', { error: '無權限' });
      return;
    }
    const result = miniGameManager.startSongGuessGame();
    socket.emit('host:result', result);
  });

  // 猜歌曲前奏 - 主持人開始新一局
  socket.on('host:startSongRound', () => {
    if (socket.id !== hostSocketId) {
      socket.emit('host:error', { error: '無權限' });
      return;
    }
    const result = miniGameManager.startSongRound();
    socket.emit('host:result', result);
  });

  // 猜歌曲前奏 - 玩家提交答案
  socket.on('player:submitSongAnswer', ({ answer }) => {
    const player = gameEngine.getPlayerBySocketId(socket.id);
    if (!player) {
      socket.emit('player:error', { message: '玩家不存在' });
      return;
    }

    const result = miniGameManager.submitSongAnswer(player.id, player.name, answer);
    socket.emit('player:songAnswerResult', result);
  });

  // 猜歌曲前奏 - 主持人結束本局並公布答案
  socket.on('host:endSongRound', ({ correctAnswer, customAnswer }) => {
    if (socket.id !== hostSocketId) {
      socket.emit('host:error', { error: '無權限' });
      return;
    }

    const result = miniGameManager.endSongRound(correctAnswer, customAnswer);

    if (result.success) {
      // 發放獎勵給答對的玩家
      result.results.forEach(r => {
        if (r.isCorrect && r.reward > 0) {
          gameEngine.addCoins(r.playerId, r.reward);
          gameEngine.addScore(r.playerId, r.reward);
        }
      });
    }

    socket.emit('host:result', result);
  });

  // 猜歌曲前奏 - 主持人結束整個遊戲
  socket.on('host:endSongGuessGame', () => {
    if (socket.id !== hostSocketId) {
      socket.emit('host:error', { error: '無權限' });
      return;
    }
    const result = miniGameManager.endSongGuessGame();
    socket.emit('host:result', result);
  });


  // 重置遊戲
  socket.on('host:reset', () => {
    if (socket.id !== hostSocketId) {
      socket.emit('host:error', { error: '無權限' });
      return;
    }

    gameEngine.resetGame();
    lotteryManager.reset();
    io.emit('game:reset');
  });

  // ===== 斷線處理 =====
  socket.on('disconnect', () => {
    console.log('⚠️  Client disconnected:', socket.id, `(Remaining: ${io.engine.clientsCount - 1})`);

    if (socket.id === hostSocketId) {
      hostSocketId = null;
      console.log('🎤 Host disconnected');
    }

    gameEngine.removePlayer(socket.id);
  });

  // Socket 錯誤處理
  socket.on('error', (error) => {
    console.error('❌ Socket error:', socket.id, error.message);
  });
});

// ========== 遊戲引擎事件轉發 ==========

gameEngine.on('gameStarted', (data) => {
  io.emit('game:started', data);
});

gameEngine.on('buildingPhaseStarted', (data) => {
  io.emit('game:buildingPhase', data);
});

gameEngine.on('buildingPurchased', (data) => {
  io.emit('game:buildingPurchased', data);
});

gameEngine.on('eventTriggered', (data) => {
  io.emit('game:eventTriggered', data);

  // 更新每位玩家狀態（使用 socketId 來發送）
  for (const [playerId, player] of gameEngine.players) {
    if (player.socketId) {
      io.to(player.socketId).emit('player:stateUpdate', gameEngine.getPlayerState(player));
    }
  }
});

gameEngine.on('scoreAdded', (data) => {
  io.emit('game:scoreAdded', data);

  // 更新該玩家（透過 socketId）
  const player = gameEngine.getPlayer(data.playerId);
  if (player && player.socketId) {
    io.to(player.socketId).emit('player:stateUpdate', {
      score: data.newScore,
      coins: data.newCoins
    });
  }
});

gameEngine.on('scoreBatchAdded', (data) => {
  io.emit('game:scoreBatchAdded', data);
});

gameEngine.on('coinsBatchAdded', (data) => {
  // 廣播給所有客戶端
  io.emit('game:coinsBatchAdded', data);

  // 通知每個受影響的玩家金幣更新
  if (data.results) {
    data.results.forEach(result => {
      if (result.success) {
        const player = gameEngine.players.get(result.playerId);
        if (player && player.socketId) {
          io.to(player.socketId).emit('player:coinsUpdated', {
            coins: result.newCoins,
            amount: data.amount,
            reason: data.reason
          });
        }
      }
    });
  }
});

gameEngine.on('gameEnded', (data) => {
  const players = gameEngine.getLeaderboard();
  const lotteryInfo = lotteryManager.calculatePlayerLotteryInfo(players);

  io.emit('game:ended', {
    ...data,
    lotteryInfo
  });
});

gameEngine.on('playerJoined', (data) => {
  io.emit('game:playerJoined', data);
});

gameEngine.on('playerLeft', (data) => {
  io.emit('game:playerLeft', data);
});

gameEngine.on('gameReset', () => {
  io.emit('game:reset');
});

// 角色分配事件
gameEngine.on('rolesAssigned', (data) => {
  io.emit('game:rolesAssigned', data);

  // 個別通知每位玩家他們的角色
  for (const assignment of data.assignments) {
    const player = gameEngine.getPlayer(assignment.playerId);
    if (player && player.socketId) {
      io.to(player.socketId).emit('player:roleAssigned', { role: assignment.role });
    }
  }
});

gameEngine.on('roleAssigned', (data) => {
  io.emit('game:roleAssigned', data);
});

// 成就解鎖事件
gameEngine.on('achievementUnlocked', (data) => {
  // 廣播給所有人（投影畫面顯示）
  io.emit('game:achievementUnlocked', data);

  // 通知解鎖成就的玩家
  const player = gameEngine.getPlayer(data.playerId);
  if (player && player.socketId) {
    io.to(player.socketId).emit('player:achievementUnlocked', {
      achievement: data.achievement,
      isGlobalFirst: data.isGlobalFirst
    });
  }
});

// 道具事件
gameEngine.on('itemPurchased', (data) => {
  io.emit('game:itemPurchased', data);
});

gameEngine.on('itemUsed', (data) => {
  io.emit('game:itemUsed', data);
});

gameEngine.on('itemDropped', (data) => {
  // 廣播給投影畫面
  io.emit('game:itemDropped', data);

  // 通知獲得道具的玩家
  const player = gameEngine.getPlayer(data.playerId);
  if (player && player.socketId) {
    io.to(player.socketId).emit('player:itemDropped', {
      item: data.item
    });
  }
});

gameEngine.on('itemReceived', (data) => {
  io.emit('game:itemReceived', data);
});

// 小事件觸發
gameEngine.on('miniEventTriggered', (data) => {
  // 廣播給投影畫面
  io.emit('game:miniEvent', data);

  // 通知觸發事件的玩家
  const player = gameEngine.getPlayer(data.playerId);
  if (player && player.socketId) {
    io.to(player.socketId).emit('player:miniEvent', {
      event: data.event,
      effectResult: data.effectResult
    });
  }
});

// 城市目標事件
gameEngine.on('cityGoalActivated', (data) => {
  io.emit('game:cityGoalActivated', data);
});

gameEngine.on('cityGoalDeactivated', (data) => {
  io.emit('game:cityGoalDeactivated', data);
});

gameEngine.on('cityGoalCompleted', (data) => {
  // 廣播城市目標達成
  io.emit('game:cityGoalCompleted', data);

  // 更新所有玩家狀態（因為獎勵已發放）
  for (const [playerId, player] of gameEngine.players) {
    if (player.socketId) {
      io.to(player.socketId).emit('player:stateUpdate', gameEngine.getPlayerState(player));
    }
  }
});

// 建築升級事件
gameEngine.on('buildingUpgraded', (data) => {
  io.emit('game:buildingUpgraded', data);
});

// 限時搶購事件
gameEngine.on('flashSaleStarted', (data) => {
  io.emit('game:flashSaleStarted', data);
});

gameEngine.on('flashSalePurchased', (data) => {
  io.emit('game:flashSalePurchased', data);
});

gameEngine.on('flashSaleEnded', (data) => {
  io.emit('game:flashSaleEnded', data);
});

// ========== 小遊戲事件轉發 ==========

// 快問快答事件
miniGameManager.on('quiz:started', (data) => {
  io.emit('minigame:quizStarted', data);
});

miniGameManager.on('quiz:question', (data) => {
  io.emit('minigame:quizQuestion', data);
});

miniGameManager.on('quiz:ended', (data) => {
  console.log('[Server] Quiz ended event received, broadcasting to clients');
  console.log(`[Server] Results: ${data.results.length} participants`);

  try {
    // 發放獎勵給玩家（addScore 會同時增加分數和金幣）
    data.results.forEach(result => {
      const player = gameEngine.getPlayer(result.playerId);
      if (player && result.reward > 0) {
        const addResult = gameEngine.addScore(result.playerId, result.reward, '快問快答獎勵');
        if (addResult.success) {
          console.log(`[Server] Awarded ${result.reward} coins and score to ${result.playerName}`);
          console.log(`[Server] New coins: ${addResult.newCoins}, New score: ${addResult.newScore}`);
        } else {
          console.error(`[Server] Failed to award to ${result.playerName}:`, addResult.error);
        }
      }
    });
  } catch (error) {
    console.error('[Server] Error awarding quiz rewards:', error);
  }

  console.log('[Server] Broadcasting minigame:quizEnded to all clients');
  io.emit('minigame:quizEnded', data);
});

miniGameManager.on('quiz:closed', () => {
  console.log('[Server] Quiz closed event received, broadcasting to close display');
  io.emit('minigame:quizClosed');
});

// 喝啤酒比賽事件
miniGameManager.on('beer:waitingStart', () => {
  io.emit('minigame:beerWaitingStart');
});

miniGameManager.on('beer:playerJoined', (data) => {
  console.log('[Server] Beer player joined event received:', data);
  console.log(`[Server] Broadcasting to all clients - currentCount: ${data.currentCount}, canStart: ${data.canStart}`);
  io.emit('minigame:beerPlayerJoined', data);
});

miniGameManager.on('beer:gameStarted', (data) => {
  io.emit('minigame:beerGameStarted', data);
});

miniGameManager.on('beer:resultsSet', (data) => {
  io.emit('minigame:beerResultsSet', data);
});

miniGameManager.on('beer:ended', (data) => {
  console.log(`[Server] Beer game ended, awarding coins to ${data.results.length} participants`);

  try {
    // 發放獎勵給玩家（addScore 會同時增加分數和金幣）
    data.results.forEach(result => {
      const player = gameEngine.getPlayer(result.playerId);
      if (player && result.reward > 0) {
        const addResult = gameEngine.addScore(result.playerId, result.reward, '喝啤酒比賽獎勵');
        if (addResult.success) {
          console.log(`[Server] Awarded ${result.reward} coins and score to ${result.playerName}`);
          console.log(`[Server] New coins: ${addResult.newCoins}, New score: ${addResult.newScore}`);
        } else {
          console.error(`[Server] Failed to award to ${result.playerName}:`, addResult.error);
        }
      }
    });
  } catch (error) {
    console.error('[Server] Error awarding beer game rewards:', error);
  }

  console.log('[Server] Broadcasting minigame:beerEnded to all clients');
  io.emit('minigame:beerEnded', data);
});

// 比大小事件
miniGameManager.on('poker:gameStarted', () => {
  console.log('[Server] 比大小遊戲開始');
  io.emit('minigame:pokerGameStarted');
});

miniGameManager.on('poker:roundStarted', (data) => {
  console.log('[Server] 比大小第', data.roundNumber, '局開始');
  io.emit('minigame:pokerRoundStarted', data);
});

miniGameManager.on('poker:betPlaced', (data) => {
  io.emit('minigame:pokerBetPlaced', data);
});

miniGameManager.on('poker:revealing', (data) => {
  console.log('[Server] 比大小第', data.roundNumber, '局開牌中...');
  io.emit('minigame:pokerRevealing', data);
});

miniGameManager.on('poker:roundEnded', (data) => {
  // 發放獎勵給贏家
  if (data.winners && data.winners.length > 0) {
    data.winners.forEach(w => {
      gameEngine.addScore(w.playerId, w.reward, '比大小獲勝');
    });
  }
  io.emit('minigame:pokerRoundEnded', data);
});

miniGameManager.on('poker:gameEnded', (data) => {
  io.emit('minigame:pokerGameEnded', data);
});

// 猜歌曲前奏事件
miniGameManager.on('songGuess:gameStarted', () => {
  io.emit('minigame:songGuessGameStarted');
});

miniGameManager.on('songGuess:roundStarted', (data) => {
  io.emit('minigame:songGuessRoundStarted', data);
});

miniGameManager.on('songGuess:playerSubmitted', (data) => {
  io.emit('minigame:songGuessPlayerSubmitted', data);
});

miniGameManager.on('songGuess:roundEnded', (data) => {
  io.emit('minigame:songGuessRoundEnded', data);
});

miniGameManager.on('songGuess:gameEnded', (data) => {
  io.emit('minigame:songGuessGameEnded', data);
});

// ========== 啟動伺服器 ==========

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

httpServer.listen(PORT, HOST, () => {
  console.log(`
╔════════════════════════════════════════════════╗
║  🏙️  創智動能 2026 城市建設 - 尾牙遊戲  🏙️   ║
╠════════════════════════════════════════════════╣
║  Server running at http://${HOST}:${PORT}           ║
║                                                ║
║  玩家介面: http://localhost:${PORT}/               ║
║  主持人:   http://localhost:${PORT}/host           ║
║  投影畫面: http://localhost:${PORT}/display        ║
╚════════════════════════════════════════════════╝
  `);
});

export { app, io, gameEngine, lotteryManager };
