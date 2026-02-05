/**
 * 玩家資料模型
 */

import mongoose from 'mongoose';

const playerSchema = new mongoose.Schema({
  // 玩家識別
  playerId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  socketId: {
    type: String,
    default: null
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 20
  },
  tableNumber: {
    type: String,
    default: null
  },

  // 遊戲資源
  coins: {
    type: Number,
    default: 500
  },
  score: {
    type: Number,
    default: 0
  },
  totalIncome: {
    type: Number,
    default: 0
  },

  // 建築物 { buildingId: count }
  buildings: {
    type: Map,
    of: Number,
    default: () => new Map()
  },

  // 連線狀態
  connected: {
    type: Boolean,
    default: true
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  lastActiveAt: {
    type: Date,
    default: Date.now
  },

  // 角色系統
  role: {
    type: String,
    default: null
  },
  roleId: {
    type: String,
    default: null
  },
  lastBuiltBuilding: {
    type: String,
    default: null
  },

  // 成就系統
  achievements: {
    type: [String],
    default: []
  },
  achievementProgress: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: () => new Map()
  },

  // 道具系統
  items: {
    type: [String],
    default: []
  },
  activeEffects: {
    type: [{
      effectId: String,
      effect: mongoose.Schema.Types.Mixed,
      expiresAt: Number
    }],
    default: []
  }
}, {
  timestamps: true,
  collection: 'players'
});

// 索引
playerSchema.index({ playerId: 1 });
playerSchema.index({ connected: 1 });
playerSchema.index({ score: -1 });

// 轉換為 JSON 時移除 MongoDB 特定欄位
playerSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

// 更新最後活動時間
playerSchema.methods.updateLastActive = function() {
  this.lastActiveAt = new Date();
  return this.save();
};

// 清理過期效果
playerSchema.methods.cleanExpiredEffects = function() {
  const now = Date.now();
  this.activeEffects = this.activeEffects.filter(effect => effect.expiresAt > now);
  return this;
};

export const PlayerModel = mongoose.model('Player', playerSchema);
