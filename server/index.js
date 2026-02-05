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
import { GAME_CONFIG, ROLES, ACHIEVEMENTS, ACHIEVEMENT_CATEGORIES, ITEM_CARDS, ITEM_CATEGORIES, CITY_GOALS, BUILDING_UPGRADES } from '../shared/config.js';
import { connectDB } from './db/mongodb.js';
import { hashPassword, verifyPassword, generatePlayerId } from './utils/crypto.js';

// 載入環境變數
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 初始化 Express
const app = express();
const httpServer = createServer(app);

// 初始化 Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
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

// 設定預設獎品
lotteryManager.setPrizes('TOP', DEFAULT_PRIZES.TOP);
lotteryManager.setPrizes('MID', DEFAULT_PRIZES.MID);
lotteryManager.setPrizes('BOTTOM', DEFAULT_PRIZES.BOTTOM);

// 主持人 Socket ID
let hostSocketId = null;

// 連接資料庫並載入遊戲狀態
connectDB().then(async () => {
  await gameEngine.loadFromDatabase();
});

// ========== REST API ==========

// 健康檢查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
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
    buildingUpgrades: BUILDING_UPGRADES
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
  console.log('Client connected:', socket.id);

  // ===== 玩家事件 =====

  // 加入遊戲
  socket.on('player:join', async ({ name, password, tableNumber }) => {
    if (!password) {
      socket.emit('player:error', { message: '請輸入密碼' });
      return;
    }

    // 加密密碼
    const passwordHash = hashPassword(password);

    // 根據名字+密碼生成固定的 playerId
    const playerId = generatePlayerId(name, passwordHash);

    // 嘗試用 playerId 添加或恢復玩家
    const player = await gameEngine.addPlayerWithPassword(socket.id, playerId, name, passwordHash, tableNumber);

    if (!player) {
      socket.emit('player:error', { message: '密碼錯誤！請確認您的密碼' });
      return;
    }

    socket.emit('player:joined', {
      player: gameEngine.getPlayerState(player),
      gameState: gameEngine.getGameState()
    });

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
    if (password === process.env.HOST_PASSWORD || password === 'banquet2024') {
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

    io.emit('award:reveal', { rank, winner });
    console.log(`Award #${rank}: ${winner.name}`);
  });

  // 關閉頒獎
  socket.on('host:awardClose', () => {
    if (socket.id !== hostSocketId) {
      socket.emit('host:error', { error: '無權限' });
      return;
    }

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
    console.log('Client disconnected:', socket.id);

    if (socket.id === hostSocketId) {
      hostSocketId = null;
      console.log('Host disconnected');
    }

    gameEngine.removePlayer(socket.id);
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
