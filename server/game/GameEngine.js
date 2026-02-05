/**
 * 遊戲引擎
 * 創智動能 2026 城市建設 - 主持人手動控制版本
 */

import { EventEmitter } from 'events';
import { GAME_CONFIG, ROLES, ACHIEVEMENTS, ITEM_CARDS, CITY_GOALS, BUILDING_UPGRADES } from '../../shared/config.js';
import { drawRandomEvent, getEventById, getAllEvents } from '../data/events.js';
import { drawMiniEvent, MINI_EVENTS } from '../data/miniEvents.js';
import { savePlayer, getPlayerById, getAllPlayers, updatePlayerConnection, clearAllPlayers, getPlayerByNameAndPassword, bulkSavePlayers } from '../db/playerService.js';
import { saveGameState, getGameState as getGameStateFromDB, resetGameState as resetGameStateInDB } from '../db/gameStateService.js';
import { verifyPassword } from '../utils/crypto.js';

export class GameEngine extends EventEmitter {
  constructor() {
    super();

    // 遊戲狀態：WAITING, BUILDING, EVENT, ENDED
    this.state = 'WAITING';

    // 玩家管理 Map<id, Player>
    this.players = new Map();

    // Socket ID 到玩家 ID 的映射
    this.socketToPlayer = new Map();

    // 城市建築統計（全體玩家共同建設）
    this.cityBuildings = {};  // { buildingId: count }

    // 城市建築列表（包含擁有者資訊）
    this.cityBuildingList = [];  // [{ id, buildingId, playerName, timestamp }]

    // 當前事件
    this.currentEvent = null;

    // 事件歷史
    this.eventHistory = [];

    // 遊戲開始時間
    this.startTime = null;

    // 角色系統
    this.rolesAssigned = false;

    // 成就系統
    this.globalAchievements = {}; // 已被獲得的全場唯一成就 { achievementId: playerId }

    // 城市協力目標
    this.cityGoals = {
      active: [],     // 啟用中的目標 ID
      completed: []   // 已完成的目標 ID
    };

    // 限時搶購系統
    this.flashSale = null;  // { item, originalPrice, salePrice, quantity, remaining, endTime, buyers }
    this.flashSaleTimer = null;

    // 自動儲存計時器
    this.autoSaveTimer = null;
    this.startAutoSave();
  }

  /**
   * 從資料庫載入遊戲狀態
   */
  async loadFromDatabase() {
    console.log('🔄 Loading game state from database...');

    try {
      // 載入玩家資料
      const dbPlayers = await getAllPlayers();
      if (dbPlayers && dbPlayers.length > 0) {
        console.log(`📥 Loaded ${dbPlayers.length} players from database`);

        dbPlayers.forEach(dbPlayer => {
          const player = {
            id: dbPlayer.playerId,
            socketId: dbPlayer.socketId,
            name: dbPlayer.name,
            tableNumber: dbPlayer.tableNumber,
            coins: dbPlayer.coins,
            score: dbPlayer.score,
            buildings: dbPlayer.buildings instanceof Map ? Object.fromEntries(dbPlayer.buildings) : (dbPlayer.buildings || {}),
            totalIncome: dbPlayer.totalIncome,
            connected: false, // 預設為未連線，等待重新連線
            joinedAt: dbPlayer.joinedAt ? dbPlayer.joinedAt.getTime() : Date.now(),
            role: dbPlayer.role,
            roleId: dbPlayer.roleId,
            lastBuiltBuilding: dbPlayer.lastBuiltBuilding,
            achievements: dbPlayer.achievements || [],
            achievementProgress: dbPlayer.achievementProgress instanceof Map ? Object.fromEntries(dbPlayer.achievementProgress) : (dbPlayer.achievementProgress || {}),
            items: dbPlayer.items || [],
            activeEffects: dbPlayer.activeEffects || []
          };

          this.players.set(player.id, player);
        });
      }

      // 載入遊戲狀態
      const dbGameState = await getGameStateFromDB();
      if (dbGameState) {
        console.log('📥 Loaded game state from database');
        this.state = dbGameState.state || 'WAITING';
        this.cityBuildings = dbGameState.cityBuildings instanceof Map ? Object.fromEntries(dbGameState.cityBuildings) : (dbGameState.cityBuildings || {});
        this.cityBuildingList = dbGameState.cityBuildingList || [];
        console.log(`📥 Loaded ${this.cityBuildingList.length} buildings from database`);
      }

      console.log('✅ Game state loaded successfully');
    } catch (error) {
      console.error('❌ Error loading from database:', error);
    }
  }

  /**
   * 儲存玩家到資料庫
   */
  async savePlayerToDB(player) {
    try {
      await savePlayer(player);
    } catch (error) {
      console.error('Error saving player to DB:', error);
    }
  }

  /**
   * 儲存遊戲狀態到資料庫
   */
  async saveGameStateToDB() {
    try {
      const gameStateData = {
        state: this.state,
        currentRound: 0,
        totalRounds: 10,
        currentPhase: 'WAITING',
        phaseStartTime: null,
        phaseDuration: null,
        currentEvent: this.currentEvent,
        cityPopulation: 0,
        cityHappiness: 50,
        cityPollution: 0,
        cityTech: 0,
        cityBuildings: this.cityBuildings,
        cityBuildingList: this.cityBuildingList,
        startedAt: this.startTime,
        endedAt: this.state === 'ENDED' ? new Date() : null,
        totalPlayers: this.players.size,
        connectedPlayers: Array.from(this.players.values()).filter(p => p.connected).length
      };

      await saveGameState(gameStateData);
    } catch (error) {
      console.error('Error saving game state to DB:', error);
    }
  }

  /**
   * 啟動自動儲存（每 30 秒）
   */
  startAutoSave() {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }

    this.autoSaveTimer = setInterval(async () => {
      try {
        // 儲存遊戲狀態
        await this.saveGameStateToDB();

        // 批次儲存所有玩家（效能優化：一次性批次寫入）
        const players = Array.from(this.players.values());
        if (players.length > 0) {
          await bulkSavePlayers(players);
          console.log(`💾 Auto-saved ${players.length} players to database`);
        }
      } catch (error) {
        console.error('❌ Auto-save error:', error);
      }
    }, 30000); // 30 秒
  }

  /**
   * 停止自動儲存
   */
  stopAutoSave() {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  // ========== 玩家管理 ==========

  addPlayer(socketId, name, tableNumber = null) {
    // 產生持久化的玩家 ID（不依賴 socket.id）
    const playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 隨機分配角色
    const roleIds = Object.keys(ROLES);
    const randomRoleId = roleIds[Math.floor(Math.random() * roleIds.length)];
    const randomRole = ROLES[randomRoleId];

    const player = {
      id: playerId,
      socketId,
      name,
      tableNumber,
      coins: GAME_CONFIG.player.initial.coins,
      score: GAME_CONFIG.player.initial.score,
      buildings: {},  // { buildingId: count }
      totalIncome: 0,
      connected: true,
      joinedAt: Date.now(),
      // 角色系統 - 自動隨機分配
      role: randomRole,
      roleId: randomRoleId,
      lastBuiltBuilding: null,
      // 成就系統
      achievements: [],  // 已解鎖的成就 ID 列表
      achievementProgress: {},  // 各成就進度追蹤
      // 道具系統
      items: [],  // 擁有的道具 ID 列表
      activeEffects: []  // 生效中的效果 [{ effectId, effect, expiresAt }]
    };

    this.players.set(playerId, player);
    this.socketToPlayer.set(socketId, playerId);
    this.emit('playerJoined', this.getPlayerPublicInfo(player));

    // 儲存到資料庫
    this.savePlayerToDB(player);

    return player;
  }

  /**
   * 使用名字+密碼添加或登入玩家
   * 如果資料庫中已存在該名字+密碼的玩家，則恢復其資料
   * 否則建立新玩家
   */
  async addPlayerWithPassword(socketId, playerId, name, passwordHash, tableNumber = null) {
    // 🔍 先檢查記憶體中是否已經有這個玩家（避免重複登入）
    const existingPlayer = this.players.get(playerId);
    if (existingPlayer) {
      // 更新 socket ID（玩家重新連線）
      const oldSocketId = existingPlayer.socketId;
      if (oldSocketId) {
        this.socketToPlayer.delete(oldSocketId);
      }

      existingPlayer.socketId = socketId;
      existingPlayer.connected = true;
      this.socketToPlayer.set(socketId, playerId);

      await updatePlayerConnection(playerId, socketId, true);

      console.log(`🔄 Player ${existingPlayer.name} reconnected (same session)`);
      return existingPlayer;
    }

    // 先檢查資料庫中是否有同名同密碼的玩家
    const dbPlayer = await getPlayerByNameAndPassword(name, passwordHash);

    if (dbPlayer) {
      // 密碼正確，載入現有玩家資料
      const player = {
        id: playerId,
        socketId,
        name: dbPlayer.name,
        tableNumber: dbPlayer.tableNumber || tableNumber,
        coins: dbPlayer.coins,
        score: dbPlayer.score,
        buildings: dbPlayer.buildings instanceof Map ? Object.fromEntries(dbPlayer.buildings) : (dbPlayer.buildings || {}),
        totalIncome: dbPlayer.totalIncome || 0,
        connected: true,
        joinedAt: dbPlayer.joinedAt ? dbPlayer.joinedAt.getTime() : Date.now(),
        role: dbPlayer.role,
        roleId: dbPlayer.roleId,
        lastBuiltBuilding: dbPlayer.lastBuiltBuilding,
        achievements: dbPlayer.achievements || [],
        achievementProgress: dbPlayer.achievementProgress instanceof Map ? Object.fromEntries(dbPlayer.achievementProgress) : (dbPlayer.achievementProgress || {}),
        items: dbPlayer.items || [],
        activeEffects: dbPlayer.activeEffects || []
      };

      this.players.set(playerId, player);
      this.socketToPlayer.set(socketId, playerId);
      this.emit('playerJoined', this.getPlayerPublicInfo(player));

      // 更新連線狀態到資料庫
      await updatePlayerConnection(playerId, socketId, true);

      console.log(`✅ Player ${player.name} logged in (existing account)`);
      return player;
    } else {
      // 新玩家，建立帳號
      const roleIds = Object.keys(ROLES);
      const randomRoleId = roleIds[Math.floor(Math.random() * roleIds.length)];
      const randomRole = ROLES[randomRoleId];

      const player = {
        id: playerId,
        socketId,
        name,
        tableNumber,
        coins: GAME_CONFIG.player.initial.coins,
        score: GAME_CONFIG.player.initial.score,
        buildings: {},
        totalIncome: 0,
        connected: true,
        joinedAt: Date.now(),
        role: randomRole,
        roleId: randomRoleId,
        lastBuiltBuilding: null,
        achievements: [],
        achievementProgress: {},
        items: [],
        activeEffects: []
      };

      this.players.set(playerId, player);
      this.socketToPlayer.set(socketId, playerId);
      this.emit('playerJoined', this.getPlayerPublicInfo(player));

      // 儲存到資料庫（包含 passwordHash）
      await this.savePlayerToDB({
        ...player,
        passwordHash
      });

      console.log(`✅ New player ${player.name} created`);
      return player;
    }
  }

  /**
   * 玩家重新連線
   */
  async reconnectPlayer(socketId, playerId) {
    let player = this.players.get(playerId);

    // 如果記憶體中沒有，嘗試從資料庫載入
    if (!player) {
      const dbPlayer = await getPlayerById(playerId);
      if (dbPlayer) {
        player = {
          id: dbPlayer.playerId,
          socketId,
          name: dbPlayer.name,
          tableNumber: dbPlayer.tableNumber,
          coins: dbPlayer.coins,
          score: dbPlayer.score,
          buildings: dbPlayer.buildings instanceof Map ? Object.fromEntries(dbPlayer.buildings) : (dbPlayer.buildings || {}),
          totalIncome: dbPlayer.totalIncome,
          connected: true,
          joinedAt: dbPlayer.joinedAt ? dbPlayer.joinedAt.getTime() : Date.now(),
          role: dbPlayer.role,
          roleId: dbPlayer.roleId,
          lastBuiltBuilding: dbPlayer.lastBuiltBuilding,
          achievements: dbPlayer.achievements || [],
          achievementProgress: dbPlayer.achievementProgress instanceof Map ? Object.fromEntries(dbPlayer.achievementProgress) : (dbPlayer.achievementProgress || {}),
          items: dbPlayer.items || [],
          activeEffects: dbPlayer.activeEffects || []
        };

        this.players.set(playerId, player);
        console.log(`✅ Player ${player.name} loaded from database`);
      } else {
        return null;
      }
    }

    // 更新 socket 映射
    if (player.socketId) {
      this.socketToPlayer.delete(player.socketId);
    }
    player.socketId = socketId;
    player.connected = true;
    this.socketToPlayer.set(socketId, playerId);

    // 更新資料庫連線狀態
    await updatePlayerConnection(playerId, socketId, true);

    return player;
  }

  removePlayer(socketId) {
    const playerId = this.socketToPlayer.get(socketId);
    if (playerId) {
      const player = this.players.get(playerId);
      if (player) {
        player.connected = false;
        this.emit('playerLeft', { id: playerId });
      }
      this.socketToPlayer.delete(socketId);
    }
  }

  getPlayer(id) {
    return this.players.get(id);
  }

  getPlayerBySocketId(socketId) {
    const playerId = this.socketToPlayer.get(socketId);
    return playerId ? this.players.get(playerId) : null;
  }

  getPlayerPublicInfo(player) {
    return {
      id: player.id,
      name: player.name,
      tableNumber: player.tableNumber,
      score: player.score,
      buildingCount: Object.values(player.buildings).reduce((a, b) => a + b, 0),
      role: player.roleId ? ROLES[player.roleId] : player.role
    };
  }

  getPlayerState(player) {
    return {
      id: player.id,
      name: player.name,
      tableNumber: player.tableNumber,
      coins: player.coins,
      score: player.score,
      buildings: player.buildings,
      totalIncome: player.totalIncome,
      connected: player.connected,
      role: player.roleId ? ROLES[player.roleId] : player.role,
      roleId: player.roleId,
      items: player.items || [],
      achievements: player.achievements || [],
      achievementProgress: player.achievementProgress || {},
      activeEffects: player.activeEffects || [],
      lastBuiltBuilding: player.lastBuiltBuilding
    };
  }

  // ========== 建築系統 ==========

  /**
   * 玩家購買建築（使用 socket ID）
   */
  buyBuilding(socketId, buildingId) {
    const player = this.getPlayerBySocketId(socketId);
    if (!player) {
      return { success: false, error: '玩家不存在' };
    }

    // 只要遊戲沒結束，隨時可以建築
    if (this.state === 'ENDED') {
      return { success: false, error: '遊戲已結束' };
    }

    const building = GAME_CONFIG.buildings[buildingId];
    if (!building) {
      return { success: false, error: '無效的建築' };
    }

    // 計算實際成本（應用角色技能和道具效果）
    const { finalCost, discount, discountReason, usedItemIndex, increaseIndex } = this.calculateBuildingCost(player, building);

    if (player.coins < finalCost) {
      return { success: false, error: '金幣不足' };
    }

    // 扣除金幣
    player.coins -= finalCost;

    // 消耗道具折扣效果（如果有使用）
    // 需要從大 index 開始刪除，避免 index 偏移
    const indicesToRemove = [usedItemIndex, increaseIndex].filter(i => i >= 0).sort((a, b) => b - a);
    for (const idx of indicesToRemove) {
      player.activeEffects.splice(idx, 1);
    }

    // 增加建築
    player.buildings[buildingId] = (player.buildings[buildingId] || 0) + 1;

    // 記錄最後建造的建築（複製卡用）
    player.lastBuiltBuilding = buildingId;

    // 更新城市統計
    this.cityBuildings[buildingId] = (this.cityBuildings[buildingId] || 0) + 1;

    // 新增到建築列表（包含擁有者）
    this.cityBuildingList.push({
      id: `b_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      buildingId,
      playerName: player.name,
      playerId: player.id,
      timestamp: Date.now()
    });

    this.emit('buildingPurchased', {
      playerId: player.id,
      playerName: player.name,
      buildingId,
      building: building,
      cityBuildings: this.getCityBuildingStats(),
      cityBuildingList: this.cityBuildingList
    });

    // 檢查成就（購買建築相關）
    const unlockedAchievements = this.checkAchievements(player, {
      type: 'building_purchase',
      buildingId,
      building,
      cost: finalCost
    });

    // 嘗試隨機獲得道具
    const droppedItem = this.tryRandomItemDrop(player);

    // 嘗試觸發小事件 (15% 機率)
    const miniEvent = this.tryTriggerMiniEvent(player);

    // 檢查城市目標進度
    const completedGoals = this.checkCityGoals();

    return {
      success: true,
      building,
      remainingCoins: player.coins,
      discount,
      discountReason,
      actualCost: finalCost,
      unlockedAchievements,
      droppedItem,
      miniEvent,
      completedGoals
    };
  }

  /**
   * 計算建築實際成本（應用角色技能和道具效果）
   */
  calculateBuildingCost(player, building) {
    let baseCost = building.cost;
    let finalCost = building.cost;
    let discount = 0;
    let discountReason = null;
    let usedItemIndex = -1;
    let increaseIndex = -1;

    // 0. 檢查是否有漲價效果（小事件負面）
    for (let i = 0; i < player.activeEffects.length; i++) {
      const activeEffect = player.activeEffects[i];
      if (activeEffect.effect.type === 'purchase_increase') {
        baseCost = Math.floor(building.cost * (1 + activeEffect.effect.value));
        finalCost = baseCost;
        increaseIndex = i;
        break;
      }
    }

    // 1. 先檢查道具折扣效果
    for (let i = 0; i < player.activeEffects.length; i++) {
      const activeEffect = player.activeEffects[i];
      if (activeEffect.effect.type === 'purchase_discount') {
        if (activeEffect.effect.value > discount) {
          discount = activeEffect.effect.value;
          finalCost = Math.floor(baseCost * (1 - discount));
          discountReason = activeEffect.source || `道具折扣`;
          usedItemIndex = i;
        }
      }
    }

    // 2. 再檢查角色技能（可能會疊加或覆蓋）
    if (player.role && ROLES[player.role]) {
      const role = ROLES[player.role];

      for (const skill of role.skills) {
        // 成本減免技能
        if (skill.type === 'cost_reduction' && skill.target === 'category') {
          if (building.category === skill.category) {
            // 角色減免與道具減免取最大者
            if (skill.value > discount) {
              discount = skill.value;
              finalCost = Math.floor(baseCost * (1 - skill.value));
              discountReason = `${role.name}技能`;
              usedItemIndex = -1;  // 不消耗道具
            }
          }
        }

        // 隨機半價技能（冒險家）
        if (skill.type === 'random_discount') {
          if (Math.random() < skill.chance) {
            if (skill.discount > discount) {
              discount = skill.discount;
              finalCost = Math.floor(baseCost * (1 - skill.discount));
              discountReason = `${role.name}幸運觸發！`;
              usedItemIndex = -1;
            }
          }
        }
      }
    }

    // 標記要消耗的效果
    return { finalCost, discount, discountReason, usedItemIndex, increaseIndex };
  }

  /**
   * 計算玩家的營收
   */
  calculatePlayerIncome(player, eventMultipliers = {}) {
    let totalIncome = 0;
    const breakdown = [];
    let roleBonus = null;
    let luckyTriggered = false;
    let itemIncomeBonus = false;

    // 取得角色資訊（player.role 可能是角色物件或角色ID）
    const role = player.roleId ? ROLES[player.roleId] : (player.role || null);

    for (const [buildingId, count] of Object.entries(player.buildings)) {
      const building = GAME_CONFIG.buildings[buildingId];
      if (!building) continue;

      let income = building.income * count;
      let multiplier = eventMultipliers[buildingId] || 1;

      // 全體倍率
      if (eventMultipliers._all) {
        multiplier *= eventMultipliers._all;
      }

      // 角色營收加成
      if (role) {
        for (const skill of role.skills) {
          if (skill.type === 'income_bonus' && skill.target === 'category') {
            if (building.category === skill.category) {
              multiplier *= (1 + skill.value);
              roleBonus = { category: skill.category, value: skill.value, roleName: role.name };
            }
          }
        }
      }

      const finalIncome = Math.round(income * multiplier);

      breakdown.push({
        buildingId,
        buildingName: building.name,
        emoji: building.emoji,
        count,
        baseIncome: income,
        multiplier,
        finalIncome
      });

      totalIncome += finalIncome;
    }

    // 道具收入加成（雙倍收入卡）
    let itemBonusIndex = -1;
    for (let i = 0; i < player.activeEffects.length; i++) {
      const activeEffect = player.activeEffects[i];
      if (activeEffect.effect.type === 'income_multiplier') {
        totalIncome = Math.round(totalIncome * activeEffect.effect.value);
        itemIncomeBonus = true;
        itemBonusIndex = i;
        break;  // 只使用一個收入加成效果
      }
    }
    // 消耗道具效果
    if (itemBonusIndex >= 0) {
      player.activeEffects.splice(itemBonusIndex, 1);
    }

    // 幸運兒隨機翻倍
    if (role) {
      for (const skill of role.skills) {
        if (skill.type === 'random_income_bonus') {
          if (Math.random() < skill.chance) {
            totalIncome = Math.round(totalIncome * skill.multiplier);
            luckyTriggered = true;
          }
        }
      }
    }

    return { totalIncome, breakdown, roleBonus, luckyTriggered, itemIncomeBonus };
  }

  // ========== 遊戲流程控制（主持人手動） ==========

  /**
   * 開始遊戲
   */
  startGame() {
    if (this.state !== 'WAITING') {
      return { success: false, error: '遊戲已經開始' };
    }

    this.state = 'BUILDING';
    this.startTime = Date.now();

    this.emit('gameStarted', {
      playerCount: this.players.size,
      startTime: this.startTime
    });

    return { success: true };
  }

  /**
   * 開始建設階段
   */
  startBuildingPhase() {
    this.state = 'BUILDING';
    this.currentEvent = null;

    this.emit('buildingPhaseStarted', {
      cityBuildings: this.getCityBuildingStats()
    });

    return { success: true };
  }

  /**
   * 發布事件（主持人選擇或隨機）
   */
  triggerEvent(eventId = null) {
    // 取得事件
    let event;
    if (eventId) {
      event = getEventById(eventId);
      if (!event) {
        return { success: false, error: '無效的事件 ID' };
      }
    } else {
      event = drawRandomEvent();
    }

    this.state = 'EVENT';
    this.currentEvent = event;
    this.eventHistory.push({
      event,
      timestamp: Date.now()
    });

    // 計算事件倍率
    const eventMultipliers = this.getEventMultipliers(event);

    // 結算所有玩家營收
    const results = [];
    for (const [playerId, player] of this.players) {
      const { totalIncome, breakdown, roleBonus, luckyTriggered, itemIncomeBonus } = this.calculatePlayerIncome(player, eventMultipliers);

      // 處理特殊效果
      let bonusCoins = 0;
      let bonusScore = 0;

      for (const effect of event.effects) {
        if (effect.type === 'bonus_coins') {
          bonusCoins += effect.amount;
        }
        if (effect.type === 'bonus_score') {
          bonusScore += effect.amount;
        }
      }

      // 更新玩家資源
      player.coins += totalIncome + bonusCoins;
      player.score += totalIncome + bonusScore;
      player.totalIncome += totalIncome;

      // 檢查收入相關成就
      const incomeAchievements = this.checkAchievements(player, {
        type: 'income_received',
        amount: totalIncome
      });

      results.push({
        playerId,
        playerName: player.name,
        income: totalIncome,
        bonusCoins,
        bonusScore,
        breakdown,
        newCoins: player.coins,
        newScore: player.score,
        role: player.role ? ROLES[player.role] : null,
        roleBonus,
        luckyTriggered,
        itemIncomeBonus,
        unlockedAchievements: incomeAchievements
      });
    }

    this.emit('eventTriggered', {
      event,
      results,
      cityBuildings: this.getCityBuildingStats(),
      leaderboard: this.getLeaderboard()
    });

    return { success: true, event, results };
  }

  /**
   * 取得事件的營收倍率
   */
  getEventMultipliers(event) {
    const multipliers = {};

    for (const effect of event.effects) {
      if (effect.building) {
        multipliers[effect.building] = effect.multiplier;
      }
      if (effect.type === 'all_multiplier') {
        multipliers._all = effect.multiplier;
      }
    }

    return multipliers;
  }

  /**
   * 手動加分（小遊戲用）
   */
  addScore(playerId, amount, reason = '小遊戲獎勵') {
    const player = this.players.get(playerId);
    if (!player) {
      return { success: false, error: '玩家不存在' };
    }

    player.score += amount;
    player.coins += amount;  // 同時給金幣

    this.emit('scoreAdded', {
      playerId,
      playerName: player.name,
      amount,
      reason,
      newScore: player.score,
      newCoins: player.coins
    });

    return {
      success: true,
      newScore: player.score,
      newCoins: player.coins
    };
  }

  /**
   * 批量加分
   */
  addScoreBatch(playerIds, amount, reason = '小遊戲獎勵') {
    const results = [];
    for (const playerId of playerIds) {
      const result = this.addScore(playerId, amount, reason);
      results.push({ playerId, ...result });
    }

    this.emit('scoreBatchAdded', {
      playerIds,
      amount,
      reason,
      leaderboard: this.getLeaderboard()
    });

    return results;
  }

  /**
   * 批次加金幣
   */
  addCoinsBatch(playerIds, amount, reason = '小遊戲獎勵') {
    const results = [];
    for (const playerId of playerIds) {
      const player = this.players.get(playerId);
      if (player) {
        player.coins += amount;
        results.push({
          playerId,
          playerName: player.name,
          success: true,
          newCoins: player.coins
        });

        // 儲存到資料庫
        this.savePlayerToDB(player);
      } else {
        results.push({
          playerId,
          success: false,
          error: '玩家不存在'
        });
      }
    }

    // 發送事件通知所有客戶端
    this.emit('coinsBatchAdded', {
      playerIds,
      amount,
      reason,
      results
    });

    return results;
  }

  /**
   * 結束遊戲
   */
  endGame() {
    this.state = 'ENDED';

    const finalResults = {
      leaderboard: this.getLeaderboard(),
      cityBuildings: this.getCityBuildingStats(),
      cityBuildingList: this.cityBuildingList,
      eventHistory: this.eventHistory,
      totalBuildings: Object.values(this.cityBuildings).reduce((a, b) => a + b, 0)
    };

    this.emit('gameEnded', finalResults);

    return finalResults;
  }

  /**
   * 重置遊戲
   */
  async resetGame() {
    this.state = 'WAITING';
    this.players.clear();
    this.socketToPlayer.clear();
    this.cityBuildings = {};
    this.cityBuildingList = [];
    this.currentEvent = null;
    this.eventHistory = [];
    this.startTime = null;
    this.rolesAssigned = false;
    this.globalAchievements = {};
    this.cityGoals = { active: [], completed: [] };

    // 重置限時搶購
    if (this.flashSaleTimer) {
      clearTimeout(this.flashSaleTimer);
      this.flashSaleTimer = null;
    }
    this.flashSale = null;

    // 清除資料庫
    await clearAllPlayers();
    await resetGameStateInDB();

    this.emit('gameReset');

    return { success: true };
  }

  // ========== 建築升級系統 ==========

  /**
   * 檢查玩家可升級的建築
   */
  getUpgradeableBuildings(socketId) {
    const player = this.getPlayerBySocketId(socketId);
    if (!player) return [];

    const upgradeable = [];

    for (const [buildingId, count] of Object.entries(player.buildings)) {
      const upgradeInfo = BUILDING_UPGRADES[buildingId];
      if (!upgradeInfo) continue;

      if (count >= upgradeInfo.mergeCount) {
        const fromBuilding = GAME_CONFIG.buildings[buildingId];
        const toBuilding = GAME_CONFIG.buildings[upgradeInfo.upgradeTo];

        upgradeable.push({
          fromBuildingId: buildingId,
          fromBuilding,
          toBuildingId: upgradeInfo.upgradeTo,
          toBuilding,
          currentCount: count,
          requiredCount: upgradeInfo.mergeCount,
          bonusScore: upgradeInfo.bonusScore,
          canUpgrade: count >= upgradeInfo.mergeCount,
          timesCanUpgrade: Math.floor(count / upgradeInfo.mergeCount)
        });
      }
    }

    return upgradeable;
  }

  /**
   * 執行建築升級
   */
  upgradeBuilding(socketId, buildingId) {
    const player = this.getPlayerBySocketId(socketId);
    if (!player) {
      return { success: false, error: '玩家不存在' };
    }

    // 只要遊戲沒結束，隨時可以升級
    if (this.state === 'ENDED') {
      return { success: false, error: '遊戲已結束' };
    }

    const upgradeInfo = BUILDING_UPGRADES[buildingId];
    if (!upgradeInfo) {
      return { success: false, error: '此建築無法升級' };
    }

    const currentCount = player.buildings[buildingId] || 0;
    if (currentCount < upgradeInfo.mergeCount) {
      return { success: false, error: `需要 ${upgradeInfo.mergeCount} 棟才能升級，目前只有 ${currentCount} 棟` };
    }

    const fromBuilding = GAME_CONFIG.buildings[buildingId];
    const toBuilding = GAME_CONFIG.buildings[upgradeInfo.upgradeTo];

    // 扣除舊建築
    player.buildings[buildingId] -= upgradeInfo.mergeCount;
    if (player.buildings[buildingId] <= 0) {
      delete player.buildings[buildingId];
    }

    // 城市統計也要更新
    this.cityBuildings[buildingId] = (this.cityBuildings[buildingId] || 0) - upgradeInfo.mergeCount;
    if (this.cityBuildings[buildingId] <= 0) {
      delete this.cityBuildings[buildingId];
    }

    // 從建築列表中移除被合併的舊建築（移除該玩家的N棟舊建築）
    let removedCount = 0;
    this.cityBuildingList = this.cityBuildingList.filter(building => {
      if (removedCount >= upgradeInfo.mergeCount) return true;
      if (building.playerId === player.id && building.buildingId === buildingId && !building.isUpgrade) {
        removedCount++;
        return false; // 移除這棟建築
      }
      return true; // 保留
    });

    console.log(`🔄 Removed ${removedCount} old buildings (${fromBuilding.name}) from cityBuildingList`);

    // 增加新建築
    player.buildings[upgradeInfo.upgradeTo] = (player.buildings[upgradeInfo.upgradeTo] || 0) + 1;
    this.cityBuildings[upgradeInfo.upgradeTo] = (this.cityBuildings[upgradeInfo.upgradeTo] || 0) + 1;

    // 記錄最後建造的建築
    player.lastBuiltBuilding = upgradeInfo.upgradeTo;

    // 獲得升級獎勵分數
    player.score += upgradeInfo.bonusScore;

    // 新增升級後的建築到列表
    this.cityBuildingList.push({
      id: `b_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      buildingId: upgradeInfo.upgradeTo,
      playerName: player.name,
      playerId: player.id,
      timestamp: Date.now(),
      isUpgrade: true,
      upgradedFrom: buildingId
    });

    this.emit('buildingUpgraded', {
      playerId: player.id,
      playerName: player.name,
      fromBuilding,
      toBuilding,
      mergeCount: upgradeInfo.mergeCount,
      bonusScore: upgradeInfo.bonusScore,
      cityBuildings: this.getCityBuildingStats(),
      cityBuildingList: this.cityBuildingList  // 傳送更新後的建築列表
    });

    // 檢查成就
    const unlockedAchievements = this.checkAchievements(player, {
      type: 'building_upgrade',
      buildingId: upgradeInfo.upgradeTo,
      building: toBuilding
    });

    // 檢查城市目標進度
    const completedGoals = this.checkCityGoals();

    return {
      success: true,
      fromBuilding,
      toBuilding,
      bonusScore: upgradeInfo.bonusScore,
      newScore: player.score,
      unlockedAchievements,
      completedGoals
    };
  }

  /**
   * 取得所有升級路徑
   */
  getAllUpgradePaths() {
    return BUILDING_UPGRADES;
  }

  // ========== 限時搶購系統 ==========

  /**
   * 開始限時搶購（主持人）
   */
  startFlashSale(buildingId, salePrice, quantity, durationSeconds = 60) {
    const building = GAME_CONFIG.buildings[buildingId];
    if (!building) {
      return { success: false, error: '無效的建築' };
    }

    if (this.flashSale && this.flashSale.remaining > 0) {
      return { success: false, error: '已有進行中的搶購活動' };
    }

    this.flashSale = {
      buildingId,
      building,
      originalPrice: building.cost,
      salePrice,
      quantity,
      remaining: quantity,
      startTime: Date.now(),
      endTime: Date.now() + durationSeconds * 1000,
      buyers: []
    };

    // 設定結束計時器
    if (this.flashSaleTimer) {
      clearTimeout(this.flashSaleTimer);
    }
    this.flashSaleTimer = setTimeout(() => {
      this.endFlashSale();
    }, durationSeconds * 1000);

    this.emit('flashSaleStarted', {
      ...this.flashSale,
      discount: Math.round((1 - salePrice / building.cost) * 100)
    });

    return {
      success: true,
      flashSale: this.flashSale
    };
  }

  /**
   * 玩家搶購
   */
  buyFlashSale(socketId) {
    console.log('🛒 buyFlashSale called, socketId:', socketId);
    console.log('📋 socketToPlayer map:', Array.from(this.socketToPlayer.entries()));
    const player = this.getPlayerBySocketId(socketId);
    console.log('👤 Found player:', player ? player.name : 'null');
    if (!player) {
      return { success: false, error: '玩家不存在' };
    }

    if (!this.flashSale || this.flashSale.remaining <= 0) {
      return { success: false, error: '搶購活動已結束或無剩餘數量' };
    }

    if (Date.now() > this.flashSale.endTime) {
      return { success: false, error: '搶購時間已過' };
    }

    // 檢查是否已經搶購過
    if (this.flashSale.buyers.includes(player.id)) {
      return { success: false, error: '你已經搶購過了' };
    }

    if (player.coins < this.flashSale.salePrice) {
      return { success: false, error: '金幣不足' };
    }

    // 扣除金幣
    player.coins -= this.flashSale.salePrice;

    // 增加建築
    const buildingId = this.flashSale.buildingId;
    player.buildings[buildingId] = (player.buildings[buildingId] || 0) + 1;
    player.lastBuiltBuilding = buildingId;

    // 城市統計
    this.cityBuildings[buildingId] = (this.cityBuildings[buildingId] || 0) + 1;

    // 記錄購買者
    this.flashSale.buyers.push(player.id);
    this.flashSale.remaining--;

    // 記錄建築
    this.cityBuildingList.push({
      id: `b_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      buildingId,
      playerName: player.name,
      playerId: player.id,
      timestamp: Date.now(),
      isFlashSale: true
    });

    const buyResult = {
      playerId: player.id,
      playerName: player.name,
      building: this.flashSale.building,
      paidPrice: this.flashSale.salePrice,
      savedAmount: this.flashSale.originalPrice - this.flashSale.salePrice,
      remaining: this.flashSale.remaining
    };

    this.emit('flashSalePurchased', buyResult);

    // 檢查成就
    const unlockedAchievements = this.checkAchievements(player, {
      type: 'building_purchase',
      buildingId,
      building: this.flashSale.building,
      cost: this.flashSale.salePrice
    });

    // 如果賣完了，自動結束
    if (this.flashSale.remaining <= 0) {
      this.endFlashSale();
    }

    return {
      success: true,
      ...buyResult,
      remainingCoins: player.coins,
      unlockedAchievements
    };
  }

  /**
   * 結束限時搶購（手動或自動）
   */
  endFlashSale() {
    if (this.flashSaleTimer) {
      clearTimeout(this.flashSaleTimer);
      this.flashSaleTimer = null;
    }

    const flashSaleResult = this.flashSale ? {
      building: this.flashSale.building,
      totalSold: this.flashSale.quantity - this.flashSale.remaining,
      totalQuantity: this.flashSale.quantity,
      buyers: this.flashSale.buyers.length
    } : null;

    this.flashSale = null;

    this.emit('flashSaleEnded', flashSaleResult);

    return { success: true, result: flashSaleResult };
  }

  /**
   * 取得目前搶購狀態
   */
  getFlashSaleStatus() {
    if (!this.flashSale) {
      return { active: false };
    }

    return {
      active: true,
      ...this.flashSale,
      timeRemaining: Math.max(0, this.flashSale.endTime - Date.now()),
      discount: Math.round((1 - this.flashSale.salePrice / this.flashSale.originalPrice) * 100)
    };
  }

  // ========== 道具系統 ==========

  /**
   * 購買道具
   */
  buyItem(socketId, itemId) {
    const player = this.getPlayerBySocketId(socketId);
    if (!player) {
      return { success: false, error: '玩家不存在' };
    }

    const item = ITEM_CARDS[itemId];
    if (!item) {
      return { success: false, error: '無效的道具' };
    }

    if (player.coins < item.cost) {
      return { success: false, error: '金幣不足' };
    }

    // 扣除金幣
    player.coins -= item.cost;

    // 加入道具
    player.items.push(itemId);

    this.emit('itemPurchased', {
      playerId: player.id,
      playerName: player.name,
      item
    });

    return {
      success: true,
      item,
      remainingCoins: player.coins
    };
  }

  /**
   * 使用道具
   */
  useItem(socketId, itemId) {
    const player = this.getPlayerBySocketId(socketId);
    if (!player) {
      return { success: false, error: '玩家不存在' };
    }

    // 檢查是否擁有該道具
    const itemIndex = player.items.indexOf(itemId);
    if (itemIndex === -1) {
      return { success: false, error: '你沒有這個道具' };
    }

    const item = ITEM_CARDS[itemId];
    if (!item) {
      return { success: false, error: '無效的道具' };
    }

    // 執行道具效果
    const result = this.applyItemEffect(player, item);

    if (result.success) {
      // 從背包移除道具
      player.items.splice(itemIndex, 1);

      this.emit('itemUsed', {
        playerId: player.id,
        playerName: player.name,
        item,
        effectResult: result
      });
    }

    return result;
  }

  /**
   * 應用道具效果
   */
  applyItemEffect(player, item) {
    const effect = item.effect;

    switch (effect.type) {
      case 'purchase_discount':
        // 將折扣效果加入生效列表（下次購買時使用）
        player.activeEffects.push({
          effectId: item.id,
          effect: effect,
          source: item.name
        });
        return { success: true, message: `${item.name} 已啟用，下次購買將享有折扣` };

      case 'income_multiplier':
        // 將收入加成效果加入生效列表
        player.activeEffects.push({
          effectId: item.id,
          effect: effect,
          source: item.name
        });
        return { success: true, message: `${item.name} 已啟用，下次結算將享有雙倍收入` };

      case 'instant_coins':
        player.coins += effect.value;
        return { success: true, message: `獲得 ${effect.value} 金幣！`, coinsGained: effect.value };

      case 'instant_score':
        player.score += effect.value;
        return { success: true, message: `獲得 ${effect.value} 貢獻分！`, scoreGained: effect.value };

      case 'copy_last_building':
        if (!player.lastBuiltBuilding) {
          return { success: false, error: '你還沒有建造過任何建築' };
        }
        const buildingToCopy = GAME_CONFIG.buildings[player.lastBuiltBuilding];
        if (!buildingToCopy) {
          return { success: false, error: '找不到上一棟建築' };
        }
        // 免費複製建築
        player.buildings[player.lastBuiltBuilding] = (player.buildings[player.lastBuiltBuilding] || 0) + 1;
        this.cityBuildings[player.lastBuiltBuilding] = (this.cityBuildings[player.lastBuiltBuilding] || 0) + 1;
        return {
          success: true,
          message: `免費複製了一棟 ${buildingToCopy.emoji} ${buildingToCopy.name}！`,
          buildingCopied: buildingToCopy
        };

      case 'free_building':
        const freeBuilding = GAME_CONFIG.buildings[effect.buildingId];
        if (!freeBuilding) {
          return { success: false, error: '無效的建築' };
        }
        player.buildings[effect.buildingId] = (player.buildings[effect.buildingId] || 0) + 1;
        this.cityBuildings[effect.buildingId] = (this.cityBuildings[effect.buildingId] || 0) + 1;
        player.lastBuiltBuilding = effect.buildingId;
        return {
          success: true,
          message: `免費獲得了一棟 ${freeBuilding.emoji} ${freeBuilding.name}！`,
          buildingGained: freeBuilding
        };

      case 'event_shield':
        player.activeEffects.push({
          effectId: item.id,
          effect: effect,
          source: item.name
        });
        return { success: true, message: `${item.name} 已啟用，下次負面事件對你無效` };

      case 'random_coins':
        const randomAmount = Math.floor(Math.random() * (effect.max - effect.min + 1)) + effect.min;
        player.coins += randomAmount;
        return { success: true, message: `幸運抽獎獲得 ${randomAmount} 金幣！`, coinsGained: randomAmount };

      default:
        return { success: false, error: '未知的道具效果' };
    }
  }

  /**
   * 隨機獲得道具（購買建築時 10% 機率）
   */
  tryRandomItemDrop(player) {
    const dropChance = 0.1;  // 10% 機率

    if (Math.random() < dropChance) {
      // 從較便宜的道具中隨機選擇
      const cheapItems = Object.keys(ITEM_CARDS).filter(id => ITEM_CARDS[id].cost <= 150);
      const randomItemId = cheapItems[Math.floor(Math.random() * cheapItems.length)];

      if (randomItemId) {
        player.items.push(randomItemId);
        const item = ITEM_CARDS[randomItemId];

        this.emit('itemDropped', {
          playerId: player.id,
          playerName: player.name,
          item
        });

        return item;
      }
    }

    return null;
  }

  /**
   * 主持人發放道具
   */
  giveItem(playerId, itemId) {
    const player = this.players.get(playerId);
    if (!player) {
      return { success: false, error: '玩家不存在' };
    }

    const item = ITEM_CARDS[itemId];
    if (!item) {
      return { success: false, error: '無效的道具' };
    }

    player.items.push(itemId);

    this.emit('itemReceived', {
      playerId: player.id,
      playerName: player.name,
      item,
      reason: '主持人發放'
    });

    return { success: true, item };
  }

  /**
   * 取得所有道具
   */
  getAllItems() {
    return ITEM_CARDS;
  }

  // ========== 城市協力目標系統 ==========

  /**
   * 啟用城市目標
   */
  activateCityGoal(goalId) {
    if (!CITY_GOALS[goalId]) {
      return { success: false, error: '無效的目標' };
    }

    if (this.cityGoals.active.includes(goalId)) {
      return { success: false, error: '目標已啟用' };
    }

    if (this.cityGoals.completed.includes(goalId)) {
      return { success: false, error: '目標已完成' };
    }

    this.cityGoals.active.push(goalId);
    const goal = CITY_GOALS[goalId];

    this.emit('cityGoalActivated', {
      goal,
      progress: this.getCityGoalProgress(goalId)
    });

    return { success: true, goal };
  }

  /**
   * 停用城市目標
   */
  deactivateCityGoal(goalId) {
    const index = this.cityGoals.active.indexOf(goalId);
    if (index === -1) {
      return { success: false, error: '目標未啟用' };
    }

    this.cityGoals.active.splice(index, 1);

    this.emit('cityGoalDeactivated', { goalId });

    return { success: true };
  }

  /**
   * 檢查城市目標是否達成
   */
  checkCityGoals() {
    const completedGoals = [];

    for (const goalId of this.cityGoals.active) {
      const goal = CITY_GOALS[goalId];
      if (!goal) continue;

      const progress = this.getCityGoalProgress(goalId);

      if (progress.current >= progress.target) {
        // 目標達成
        this.cityGoals.active = this.cityGoals.active.filter(id => id !== goalId);
        this.cityGoals.completed.push(goalId);

        // 發放獎勵給所有玩家
        this.distributeCityGoalReward(goal);

        completedGoals.push({
          goal,
          progress
        });

        this.emit('cityGoalCompleted', {
          goal,
          progress
        });
      }
    }

    return completedGoals;
  }

  /**
   * 取得城市目標進度
   */
  getCityGoalProgress(goalId) {
    const goal = CITY_GOALS[goalId];
    if (!goal) return { current: 0, target: 0 };

    const target = goal.target;
    let current = 0;

    switch (target.type) {
      case 'category_count':
        // 特定分類建築數
        for (const [buildingId, count] of Object.entries(this.cityBuildings)) {
          const building = GAME_CONFIG.buildings[buildingId];
          if (building && building.category === target.category) {
            current += count;
          }
        }
        return { current, target: target.count };

      case 'total_count':
        // 總建築數
        current = Object.values(this.cityBuildings).reduce((a, b) => a + b, 0);
        return { current, target: target.count };

      case 'specific_building':
        // 特定建築數
        current = this.cityBuildings[target.buildingId] || 0;
        return { current, target: target.count };

      case 'all_categories_min':
        // 每個分類都至少達到指定數量
        const categoryCounts = { residential: 0, commercial: 0, industrial: 0, public: 0, special: 0 };
        for (const [buildingId, count] of Object.entries(this.cityBuildings)) {
          const building = GAME_CONFIG.buildings[buildingId];
          if (building && categoryCounts[building.category] !== undefined) {
            categoryCounts[building.category] += count;
          }
        }
        const minCategory = Math.min(...Object.values(categoryCounts));
        return { current: minCategory, target: target.count, breakdown: categoryCounts };

      default:
        return { current: 0, target: 0 };
    }
  }

  /**
   * 發放城市目標獎勵
   */
  distributeCityGoalReward(goal) {
    const reward = goal.reward;

    for (const [playerId, player] of this.players) {
      if (reward.type === 'all_coins') {
        player.coins += reward.amount;
      } else if (reward.type === 'all_score') {
        player.score += reward.amount;
      }
    }
  }

  /**
   * 取得所有城市目標狀態
   */
  getAllCityGoals() {
    return Object.entries(CITY_GOALS).map(([id, goal]) => ({
      ...goal,
      status: this.cityGoals.completed.includes(id) ? 'completed' :
              this.cityGoals.active.includes(id) ? 'active' : 'inactive',
      progress: this.getCityGoalProgress(id)
    }));
  }

  // ========== 小事件系統 ==========

  /**
   * 嘗試觸發小事件（購買建築時 15% 機率）
   */
  tryTriggerMiniEvent(player) {
    const triggerChance = 0.15;  // 15% 機率

    if (Math.random() >= triggerChance) {
      return null;
    }

    // 抽取事件
    const miniEvent = drawMiniEvent();

    // 應用事件效果
    const effectResult = this.applyMiniEventEffect(player, miniEvent);

    this.emit('miniEventTriggered', {
      playerId: player.id,
      playerName: player.name,
      event: miniEvent,
      effectResult
    });

    return { event: miniEvent, effectResult };
  }

  /**
   * 應用小事件效果
   */
  applyMiniEventEffect(player, miniEvent) {
    const effect = miniEvent.effect;
    const result = { type: effect.type };

    switch (effect.type) {
      case 'next_purchase_discount':
        // 將折扣效果加入生效列表
        player.activeEffects.push({
          effectId: `mini_${miniEvent.id}`,
          effect: { type: 'purchase_discount', value: effect.discount },
          source: miniEvent.name
        });
        result.message = `下次購買享 ${Math.round(effect.discount * 100)}% 折扣`;
        break;

      case 'instant_coins':
        player.coins += effect.amount;
        result.coinsGained = effect.amount;
        result.message = `獲得 ${effect.amount} 金幣`;
        break;

      case 'next_income_multiplier':
        player.activeEffects.push({
          effectId: `mini_${miniEvent.id}`,
          effect: { type: 'income_multiplier', value: effect.multiplier },
          source: miniEvent.name
        });
        result.message = `下次收入 x${effect.multiplier}`;
        break;

      case 'instant_score':
        player.score += effect.amount;
        result.scoreGained = effect.amount;
        result.message = `獲得 ${effect.amount} 貢獻分`;
        break;

      case 'random_item':
        // 隨機給予一個道具
        const itemIds = Object.keys(ITEM_CARDS);
        const randomItemId = itemIds[Math.floor(Math.random() * itemIds.length)];
        player.items.push(randomItemId);
        const item = ITEM_CARDS[randomItemId];
        result.itemGained = item;
        result.message = `獲得道具 ${item.emoji} ${item.name}`;
        break;

      case 'lose_coins':
        const lostAmount = Math.min(effect.amount, player.coins);
        player.coins -= lostAmount;
        result.coinsLost = lostAmount;
        result.message = `損失 ${lostAmount} 金幣`;
        break;

      case 'next_purchase_increase':
        // 將漲價效果加入生效列表
        player.activeEffects.push({
          effectId: `mini_${miniEvent.id}`,
          effect: { type: 'purchase_increase', value: effect.increase },
          source: miniEvent.name
        });
        result.message = `下次購買成本 +${Math.round(effect.increase * 100)}%`;
        break;

      case 'none':
        result.message = '無特殊效果';
        break;

      default:
        result.message = '未知效果';
    }

    return result;
  }

  // ========== 成就系統 ==========

  /**
   * 檢查並解鎖成就
   * @param {Object} player - 玩家物件
   * @param {Object} context - 觸發情境 { type, ... }
   * @returns {Array} 新解鎖的成就列表
   */
  checkAchievements(player, context) {
    const unlockedAchievements = [];

    for (const [achievementId, achievement] of Object.entries(ACHIEVEMENTS)) {
      // 已解鎖則跳過
      if (player.achievements.includes(achievementId)) continue;

      // 全場唯一成就已被他人獲得則跳過
      if (achievement.globalUnique && this.globalAchievements[achievementId]) continue;

      // 檢查是否達成條件
      if (this.checkAchievementCondition(player, achievement, context)) {
        // 解鎖成就
        player.achievements.push(achievementId);

        // 發放獎勵
        if (achievement.reward) {
          if (achievement.reward.coins) player.coins += achievement.reward.coins;
          if (achievement.reward.score) player.score += achievement.reward.score;
        }

        // 記錄全場唯一成就
        if (achievement.globalUnique) {
          this.globalAchievements[achievementId] = player.id;
        }

        unlockedAchievements.push({
          ...achievement,
          playerId: player.id,
          playerName: player.name
        });

        // 發送成就解鎖事件
        this.emit('achievementUnlocked', {
          playerId: player.id,
          playerName: player.name,
          achievement,
          isGlobalFirst: achievement.globalUnique || false
        });
      }
    }

    return unlockedAchievements;
  }

  /**
   * 檢查成就條件是否達成
   */
  checkAchievementCondition(player, achievement, context) {
    const condition = achievement.condition;

    switch (condition.type) {
      case 'building_count': {
        // 建築總數
        const totalBuildings = Object.values(player.buildings).reduce((a, b) => a + b, 0);
        return totalBuildings >= condition.count;
      }

      case 'category_count': {
        // 特定分類建築數
        let categoryCount = 0;
        for (const [buildingId, count] of Object.entries(player.buildings)) {
          const building = GAME_CONFIG.buildings[buildingId];
          if (building && building.category === condition.targetCategory) {
            categoryCount += count;
          }
        }
        return categoryCount >= condition.count;
      }

      case 'total_income': {
        // 累計收入
        return player.totalIncome >= condition.amount;
      }

      case 'category_diversity': {
        // 建築分類多樣性
        const categories = new Set();
        for (const [buildingId] of Object.entries(player.buildings)) {
          const building = GAME_CONFIG.buildings[buildingId];
          if (building) categories.add(building.category);
        }
        return categories.size >= condition.count;
      }

      case 'single_purchase': {
        // 單次購買金額（只在購買時檢查）
        if (context.type === 'building_purchase') {
          return context.cost >= condition.amount;
        }
        return false;
      }

      case 'specific_building': {
        // 擁有特定建築
        return (player.buildings[condition.buildingId] || 0) > 0;
      }

      case 'first_building': {
        // 全場第一個建造特定建築（只在購買時檢查）
        if (context.type === 'building_purchase' && context.buildingId === condition.buildingId) {
          // 檢查城市中該建築數量是否為 1（剛剛建的那一棟）
          return this.cityBuildings[condition.buildingId] === 1;
        }
        return false;
      }

      default:
        return false;
    }
  }

  /**
   * 取得玩家的成就清單
   */
  getPlayerAchievements(playerId) {
    const player = this.players.get(playerId);
    if (!player) return [];

    return player.achievements.map(id => ({
      ...ACHIEVEMENTS[id],
      unlockedAt: true
    }));
  }

  /**
   * 取得所有成就（含解鎖狀態）
   */
  getAllAchievementsForPlayer(playerId) {
    const player = this.players.get(playerId);
    if (!player) return [];

    return Object.entries(ACHIEVEMENTS).map(([id, achievement]) => ({
      ...achievement,
      unlocked: player.achievements.includes(id),
      globalClaimed: achievement.globalUnique ? !!this.globalAchievements[id] : false,
      claimedBy: achievement.globalUnique && this.globalAchievements[id]
        ? this.players.get(this.globalAchievements[id])?.name
        : null
    }));
  }

  // ========== 角色系統 ==========

  /**
   * 隨機分配角色給所有玩家
   */
  assignRoles() {
    const roleIds = Object.keys(ROLES);
    const shuffledRoles = [...roleIds].sort(() => Math.random() - 0.5);
    const assignments = [];

    let roleIndex = 0;
    for (const [playerId, player] of this.players) {
      // 循環分配角色（人數可能超過角色數）
      const roleId = shuffledRoles[roleIndex % shuffledRoles.length];
      player.role = roleId;

      assignments.push({
        playerId: player.id,
        playerName: player.name,
        role: ROLES[roleId]
      });

      roleIndex++;
    }

    this.rolesAssigned = true;
    this.emit('rolesAssigned', { assignments });

    return { success: true, assignments };
  }

  /**
   * 為單一玩家指定角色（主持人用）
   */
  assignRoleToPlayer(playerId, roleId) {
    const player = this.players.get(playerId);
    if (!player) {
      return { success: false, error: '玩家不存在' };
    }

    if (!ROLES[roleId]) {
      return { success: false, error: '無效的角色' };
    }

    player.role = roleId;

    this.emit('roleAssigned', {
      playerId: player.id,
      playerName: player.name,
      role: ROLES[roleId]
    });

    return { success: true, role: ROLES[roleId] };
  }

  /**
   * 取得所有角色資訊
   */
  getAllRoles() {
    return ROLES;
  }

  // ========== 查詢方法 ==========

  getLeaderboard() {
    return Array.from(this.players.values())
      .map(p => this.getPlayerPublicInfo(p))
      .sort((a, b) => b.score - a.score);
  }

  getCityBuildingStats() {
    const stats = {};
    const categories = {};

    for (const [buildingId, count] of Object.entries(this.cityBuildings)) {
      const building = GAME_CONFIG.buildings[buildingId];
      if (!building) continue;

      stats[buildingId] = {
        ...building,
        count
      };

      // 分類統計
      if (!categories[building.category]) {
        categories[building.category] = {
          ...GAME_CONFIG.categories[building.category],
          count: 0,
          buildings: []
        };
      }
      categories[building.category].count += count;
      categories[building.category].buildings.push({
        id: buildingId,
        ...building,
        count
      });
    }

    return { stats, categories };
  }

  getGameState() {
    return {
      state: this.state,
      playerCount: this.players.size,
      cityBuildings: this.getCityBuildingStats(),
      cityBuildingList: this.cityBuildingList,
      currentEvent: this.currentEvent,
      leaderboard: this.getLeaderboard(),
      totalBuildings: Object.values(this.cityBuildings).reduce((a, b) => a + b, 0)
    };
  }

  getAllEventsForHost() {
    return getAllEvents();
  }
}

export default GameEngine;
