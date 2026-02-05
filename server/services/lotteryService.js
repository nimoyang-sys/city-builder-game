/**
 * 抽獎系統
 * 分段獎池 + 保底機制
 */

import { GAME_CONFIG } from '../../shared/config.js';

/**
 * 抽獎管理器
 */
export class LotteryManager {
  constructor() {
    // 獎池設定
    this.prizePools = {
      TOP: [],      // 大獎池（前 10%）
      MID: [],      // 中獎池（中間 60%）
      BOTTOM: []    // 普獎池（後 30%）
    };

    // 已抽出的獎品
    this.drawnPrizes = [];

    // 抽獎記錄
    this.lotteryHistory = [];
  }

  /**
   * 設定獎品
   * @param {string} tier - 獎池層級 (TOP, MID, BOTTOM)
   * @param {array} prizes - 獎品列表
   */
  setPrizes(tier, prizes) {
    if (!this.prizePools[tier]) {
      throw new Error(`Invalid tier: ${tier}`);
    }
    this.prizePools[tier] = prizes.map((prize, index) => ({
      id: `${tier}_${index}`,
      ...prize,
      tier,
      drawn: false
    }));
  }

  /**
   * 計算玩家的抽獎權重與層級
   * @param {array} players - 玩家列表（需包含 score, fame）
   * @returns {array} 玩家抽獎資訊
   */
  calculatePlayerLotteryInfo(players) {
    // 計算權重
    const playersWithWeight = players.map(player => ({
      ...player,
      weight: this.calculateWeight(player)
    }));

    // 依權重排序
    playersWithWeight.sort((a, b) => b.weight - a.weight);

    // 分配層級
    const total = playersWithWeight.length;
    const topThreshold = Math.ceil(total * (GAME_CONFIG.lottery.tiers.TOP.percent / 100));
    const midThreshold = Math.ceil(total * ((GAME_CONFIG.lottery.tiers.TOP.percent + GAME_CONFIG.lottery.tiers.MID.percent) / 100));

    return playersWithWeight.map((player, index) => {
      let tier;
      let extraDraws = 0;

      if (index < topThreshold) {
        tier = 'TOP';
        extraDraws = GAME_CONFIG.lottery.tiers.TOP.multiplier - 1;
      } else if (index < midThreshold) {
        tier = 'MID';
        extraDraws = GAME_CONFIG.lottery.tiers.MID.multiplier - 1;
      } else {
        tier = 'BOTTOM';
        extraDraws = GAME_CONFIG.lottery.tiers.BOTTOM.multiplier - 1;
      }

      return {
        ...player,
        tier,
        rank: index + 1,
        guaranteedDraws: GAME_CONFIG.lottery.guaranteedDraws,
        extraDraws,
        totalDraws: GAME_CONFIG.lottery.guaranteedDraws + extraDraws
      };
    });
  }

  /**
   * 計算單一玩家的權重
   */
  calculateWeight(player) {
    // 基礎權重 = 分數
    let weight = Math.max(1, player.score);

    // 民心加成：每 10 點 +5%
    const fameBonus = Math.floor((player.fame || 0) / 10) * 0.05;
    weight = Math.round(weight * (1 + fameBonus));

    return Math.max(1, weight);
  }

  /**
   * 執行一次抽獎
   * @param {object} player - 抽獎玩家
   * @param {string} targetTier - 目標獎池（可選，不指定則依玩家層級）
   * @returns {object} 抽獎結果
   */
  draw(player, targetTier = null) {
    const tier = targetTier || player.tier || 'BOTTOM';
    const pool = this.prizePools[tier];

    // 過濾未抽出的獎品
    const availablePrizes = pool.filter(p => !p.drawn);

    if (availablePrizes.length === 0) {
      // 該層級沒有獎品了，往下一層找
      const fallbackTiers = {
        TOP: ['MID', 'BOTTOM'],
        MID: ['BOTTOM', 'TOP'],
        BOTTOM: ['MID', 'TOP']
      };

      for (const fallbackTier of fallbackTiers[tier]) {
        const fallbackPool = this.prizePools[fallbackTier].filter(p => !p.drawn);
        if (fallbackPool.length > 0) {
          return this.drawFromPool(player, fallbackPool, fallbackTier);
        }
      }

      // 完全沒有獎品了
      return {
        success: false,
        reason: 'no_prizes_left',
        player: player
      };
    }

    return this.drawFromPool(player, availablePrizes, tier);
  }

  /**
   * 從指定獎池抽獎
   */
  drawFromPool(player, pool, tier) {
    // 隨機選取
    const randomIndex = Math.floor(Math.random() * pool.length);
    const prize = pool[randomIndex];

    // 標記已抽出
    prize.drawn = true;
    prize.winner = {
      id: player.id,
      name: player.name
    };

    // 記錄
    const record = {
      timestamp: Date.now(),
      player: {
        id: player.id,
        name: player.name,
        tier: player.tier,
        rank: player.rank
      },
      prize: {
        id: prize.id,
        name: prize.name,
        tier: tier
      }
    };

    this.drawnPrizes.push(prize);
    this.lotteryHistory.push(record);

    return {
      success: true,
      prize: prize,
      record: record
    };
  }

  /**
   * 執行保底抽獎（全員都有）
   * @param {array} players - 玩家列表
   * @returns {array} 抽獎結果列表
   */
  executeGuaranteedDraw(players) {
    const results = [];

    // 打亂順序（增加公平感）
    const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);

    for (const player of shuffledPlayers) {
      // 保底抽獎從普獎池開始
      const result = this.draw(player, 'BOTTOM');
      results.push(result);
    }

    return results;
  }

  /**
   * 執行階層抽獎（依排名）
   * @param {array} playersWithLotteryInfo - 包含抽獎資訊的玩家列表
   * @returns {array} 抽獎結果列表
   */
  executeTieredDraw(playersWithLotteryInfo) {
    const results = [];

    // 依排名順序抽獎
    for (const player of playersWithLotteryInfo) {
      // 依層級從對應獎池抽
      const result = this.draw(player, player.tier);
      results.push({
        ...result,
        drawType: 'tiered'
      });
    }

    return results;
  }

  /**
   * 取得抽獎狀態
   */
  getStatus() {
    return {
      prizePools: {
        TOP: {
          total: this.prizePools.TOP.length,
          remaining: this.prizePools.TOP.filter(p => !p.drawn).length
        },
        MID: {
          total: this.prizePools.MID.length,
          remaining: this.prizePools.MID.filter(p => !p.drawn).length
        },
        BOTTOM: {
          total: this.prizePools.BOTTOM.length,
          remaining: this.prizePools.BOTTOM.filter(p => !p.drawn).length
        }
      },
      drawnCount: this.drawnPrizes.length,
      history: this.lotteryHistory
    };
  }

  /**
   * 取得獎品列表（用於顯示）
   */
  getPrizeList() {
    return {
      TOP: this.prizePools.TOP.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        drawn: p.drawn,
        winner: p.winner
      })),
      MID: this.prizePools.MID.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        drawn: p.drawn,
        winner: p.winner
      })),
      BOTTOM: this.prizePools.BOTTOM.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        drawn: p.drawn,
        winner: p.winner
      }))
    };
  }

  /**
   * 重置抽獎狀態
   */
  reset() {
    for (const pool of Object.values(this.prizePools)) {
      for (const prize of pool) {
        prize.drawn = false;
        prize.winner = null;
      }
    }
    this.drawnPrizes = [];
    this.lotteryHistory = [];
  }
}

/**
 * 預設獎品範本（可自訂）
 */
export const DEFAULT_PRIZES = {
  TOP: [
    { name: '頭獎 - iPhone 15 Pro', description: '最新款智慧手機' },
    { name: '貳獎 - PlayStation 5', description: '次世代遊戲主機' },
    { name: '參獎 - iPad Air', description: '輕薄平板電腦' }
  ],
  MID: [
    { name: 'AirPods Pro', description: '無線降噪耳機' },
    { name: '任天堂 Switch Lite', description: '掌上遊戲機' },
    { name: '百貨禮券 3000 元', description: '消費無限制' },
    { name: '百貨禮券 2000 元', description: '消費無限制' },
    { name: '超商禮券 1500 元', description: '全台通用' },
    { name: '超商禮券 1000 元', description: '全台通用' }
  ],
  BOTTOM: [
    { name: '超商禮券 500 元', description: '小確幸' },
    { name: '超商禮券 300 元', description: '小確幸' },
    { name: '超商禮券 200 元', description: '小確幸' },
    { name: '環保購物袋', description: '公司紀念品' },
    { name: '精美筆記本', description: '公司紀念品' },
    { name: '保溫杯', description: '公司紀念品' }
  ]
};

export default LotteryManager;
