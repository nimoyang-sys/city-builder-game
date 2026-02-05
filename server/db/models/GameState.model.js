/**
 * 遊戲狀態模型
 */

import mongoose from 'mongoose';

const gameStateSchema = new mongoose.Schema({
  // 遊戲識別（單一文件，使用固定 ID）
  _id: {
    type: String,
    default: 'current_game'
  },

  // 遊戲狀態
  state: {
    type: String,
    enum: ['WAITING', 'BUILDING', 'EVENT', 'ENDED'],
    default: 'WAITING'
  },

  // 回合資訊
  currentRound: {
    type: Number,
    default: 0
  },
  totalRounds: {
    type: Number,
    default: 10
  },

  // 階段資訊
  currentPhase: {
    type: String,
    enum: ['WAITING', 'OPEN', 'LOCK', 'RESOLVE', 'NARRATE', 'PUBLISH'],
    default: 'WAITING'
  },
  phaseStartTime: {
    type: Number,
    default: null
  },
  phaseDuration: {
    type: Number,
    default: null
  },

  // 當前事件
  currentEvent: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },

  // 城市狀態
  cityPopulation: {
    type: Number,
    default: 0
  },
  cityHappiness: {
    type: Number,
    default: 50
  },
  cityPollution: {
    type: Number,
    default: 0
  },
  cityTech: {
    type: Number,
    default: 0
  },

  // 城市建築統計
  cityBuildings: {
    type: Map,
    of: Number,
    default: () => new Map()
  },

  // 城市建築列表（包含擁有者資訊）
  cityBuildingList: {
    type: [
      {
        id: String,
        buildingId: String,
        playerName: String,
        playerId: String,
        timestamp: Number,
        isUpgrade: Boolean,
        upgradedFrom: String,
        isFlashSale: Boolean
      }
    ],
    default: []
  },

  // 遊戲開始時間
  startedAt: {
    type: Date,
    default: null
  },
  endedAt: {
    type: Date,
    default: null
  },

  // 玩家數量統計
  totalPlayers: {
    type: Number,
    default: 0
  },
  connectedPlayers: {
    type: Number,
    default: 0
  },

  // 事件歷史
  eventHistory: {
    type: [mongoose.Schema.Types.Mixed],
    default: []
  },

  // 角色分配狀態
  rolesAssigned: {
    type: Boolean,
    default: false
  },

  // 全域成就
  globalAchievements: {
    type: Map,
    of: String, // { achievementId: playerId }
    default: () => new Map()
  },

  // 城市協力目標
  cityGoals: {
    active: {
      type: [String],
      default: []
    },
    completed: {
      type: [String],
      default: []
    }
  },

  // 限時搶購
  flashSale: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },

  // 抽獎狀態
  lotteryState: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  }
}, {
  timestamps: true,
  collection: 'gamestate'
});

// 轉換為 JSON 時移除 MongoDB 特定欄位
gameStateSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret._id;
    delete ret.__v;
    delete ret.createdAt;
    delete ret.updatedAt;
    return ret;
  }
});

export const GameStateModel = mongoose.model('GameState', gameStateSchema);
