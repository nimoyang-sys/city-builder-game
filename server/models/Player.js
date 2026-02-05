/**
 * 玩家系統
 * 管理玩家資源、行動與計分
 */

import { GAME_CONFIG } from '../../shared/config.js';

export class Player {
  constructor(id, name, tableNumber = null) {
    this.id = id;
    this.name = name;
    this.tableNumber = tableNumber;

    // 資源初始化
    this.score = GAME_CONFIG.player.initial.score;
    this.coin = GAME_CONFIG.player.initial.coin;
    this.energy = GAME_CONFIG.player.initial.energy;
    this.fame = GAME_CONFIG.player.initial.fame;

    // 本回合選擇
    this.currentAction = null;      // INVEST, REPAIR, RESEARCH, CHARITY, OBSERVE
    this.currentBuilding = null;    // 如果選投資，選哪個建築

    // 歷史記錄
    this.actionHistory = [];
    this.scoreHistory = [];

    // 連線狀態
    this.connected = true;
    this.lastActiveTime = Date.now();
  }

  /**
   * 設定本回合行動
   */
  setAction(actionId, buildingId = null) {
    const action = GAME_CONFIG.actions[actionId];
    if (!action) {
      return { success: false, error: '無效的行動' };
    }

    // 檢查資源是否足夠
    if (action.cost.coin > this.coin) {
      return { success: false, error: '金幣不足' };
    }
    if (action.cost.energy > this.energy) {
      return { success: false, error: '能源不足' };
    }

    // 如果是投資，需要選擇建築
    if (actionId === 'INVEST' && buildingId) {
      if (!GAME_CONFIG.buildings[buildingId]) {
        return { success: false, error: '無效的建築' };
      }
      this.currentBuilding = buildingId;
    }

    this.currentAction = actionId;
    this.lastActiveTime = Date.now();

    return { success: true };
  }

  /**
   * 結算本回合
   * @param {object} event - 本回合事件
   * @param {object} context - 遊戲上下文（用於判斷排名等）
   * @returns {object} 結算結果
   */
  resolveRound(event, context) {
    const action = GAME_CONFIG.actions[this.currentAction] || GAME_CONFIG.actions.OBSERVE;
    const result = {
      baseScore: action.baseScore,
      modifiers: [],
      finalScore: 0,
      coinChange: 0,
      energyChange: 0,
      fameChange: 0
    };

    // 1. 扣除行動成本
    this.coin -= action.cost.coin;
    this.energy -= action.cost.energy;
    result.coinChange -= action.cost.coin;
    result.energyChange -= action.cost.energy;

    // 2. 基礎分數
    let scoreMultiplier = 1.0;
    let scoreBonus = 0;

    // 3. 應用事件效果
    if (event && event.effects) {
      for (const effect of event.effects) {
        if (this.matchesTarget(effect.target, context)) {
          const applied = this.applyEffect(effect, result, context);
          if (applied) {
            result.modifiers.push({
              source: event.title_key,
              target: effect.target,
              metric: effect.metric,
              op: effect.op,
              value: effect.value
            });

            // 累積倍率和加成
            if (effect.metric === 'score') {
              if (effect.op === 'mul') {
                scoreMultiplier *= effect.value;
              } else if (effect.op === 'add') {
                scoreBonus += effect.value;
              }
            }
          }
        }
      }
    }

    // 4. 行動特殊效果
    if (this.currentAction === 'CHARITY') {
      const fameBonus = action.fameBonus || 0;
      this.fame += fameBonus;
      result.fameChange += fameBonus;
    }

    // 5. 計算最終分數
    result.finalScore = Math.round((result.baseScore * scoreMultiplier) + scoreBonus);
    this.score += result.finalScore;

    // 6. 能源回復
    const energyRegen = GAME_CONFIG.player.energyRegenPerRound;
    this.energy = Math.min(
      this.energy + energyRegen,
      GAME_CONFIG.player.maxEnergy
    );
    result.energyChange += energyRegen;

    // 7. 記錄歷史
    this.actionHistory.push({
      round: context.round,
      action: this.currentAction,
      building: this.currentBuilding,
      result: { ...result }
    });
    this.scoreHistory.push(this.score);

    // 8. 重置本回合選擇
    this.currentAction = null;
    this.currentBuilding = null;

    return result;
  }

  /**
   * 檢查是否匹配效果目標
   */
  matchesTarget(target, context) {
    switch (target) {
      case 'ALL':
        return true;

      case 'ACTION:INVEST':
        return this.currentAction === 'INVEST';
      case 'ACTION:REPAIR':
        return this.currentAction === 'REPAIR';
      case 'ACTION:RESEARCH':
        return this.currentAction === 'RESEARCH';
      case 'ACTION:CHARITY':
        return this.currentAction === 'CHARITY';
      case 'ACTION:OBSERVE':
        return this.currentAction === 'OBSERVE' || !this.currentAction;

      case 'BUILDING:FACTORY':
        return this.currentBuilding === 'FACTORY';
      case 'BUILDING:SCHOOL':
        return this.currentBuilding === 'SCHOOL';
      case 'BUILDING:PARK':
        return this.currentBuilding === 'PARK';
      case 'BUILDING:FINANCE':
        return this.currentBuilding === 'FINANCE';
      case 'BUILDING:ENTERTAINMENT':
        return this.currentBuilding === 'ENTERTAINMENT';

      case 'TOP_PLAYERS':
        return context.playerRank <= Math.ceil(context.totalPlayers * 0.2);
      case 'BOTTOM_PLAYERS':
        return context.playerRank > Math.ceil(context.totalPlayers * 0.7);
      case 'HIGH_FAME':
        return this.fame >= context.averageFame * 1.2;

      case 'RANDOM':
        // 隨機效果在外部處理
        return false;

      default:
        return false;
    }
  }

  /**
   * 應用效果
   */
  applyEffect(effect, result, context) {
    const { metric, op, value } = effect;

    switch (metric) {
      case 'score':
        // 分數效果會在 resolveRound 中累積計算
        return true;

      case 'coin':
        if (op === 'add') {
          this.coin += value;
          result.coinChange += value;
        } else if (op === 'mul') {
          const change = Math.round(this.coin * (value - 1));
          this.coin = Math.round(this.coin * value);
          result.coinChange += change;
        }
        return true;

      case 'energy':
        if (op === 'add') {
          this.energy = Math.max(0, Math.min(
            this.energy + value,
            GAME_CONFIG.player.maxEnergy
          ));
          result.energyChange += value;
        }
        return true;

      case 'fame':
        if (op === 'add') {
          this.fame += value;
          result.fameChange += value;
        } else if (op === 'mul') {
          const change = Math.round(this.fame * (value - 1));
          this.fame = Math.round(this.fame * value);
          result.fameChange += change;
        }
        return true;

      default:
        return false;
    }
  }

  /**
   * 取得玩家狀態（用於傳送給前端）
   */
  getState() {
    return {
      id: this.id,
      name: this.name,
      tableNumber: this.tableNumber,
      score: this.score,
      coin: this.coin,
      energy: this.energy,
      fame: this.fame,
      currentAction: this.currentAction,
      currentBuilding: this.currentBuilding,
      connected: this.connected
    };
  }

  /**
   * 取得公開資訊（用於排行榜）
   */
  getPublicInfo() {
    return {
      id: this.id,
      name: this.name,
      tableNumber: this.tableNumber,
      score: this.score,
      fame: this.fame
    };
  }

  /**
   * 計算抽獎權重
   */
  getLotteryWeight() {
    // 基礎權重 = 分數
    // 加成：民心每 10 點 +5% 權重
    const fameBonus = Math.floor(this.fame / 10) * 0.05;
    return Math.max(1, Math.round(this.score * (1 + fameBonus)));
  }
}

export default Player;
