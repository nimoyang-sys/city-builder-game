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
