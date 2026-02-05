/**
 * 隨機小事件定義
 * 購買建築時有機率觸發
 */

export const MINI_EVENTS = {
  // === 正面事件 ===
  DISCOUNT_NEXT: {
    id: 'DISCOUNT_NEXT',
    name: '建材打折',
    emoji: '🏷️',
    description: '廠商大促銷！下次購買建築享 5 折優惠',
    type: 'positive',
    effect: {
      type: 'next_purchase_discount',
      discount: 0.5
    }
  },
  BONUS_COINS_SMALL: {
    id: 'BONUS_COINS_SMALL',
    name: '地下發現金幣',
    emoji: '💰',
    description: '挖地基時發現了埋藏的金幣！獲得 50 金幣',
    type: 'positive',
    effect: {
      type: 'instant_coins',
      amount: 50
    }
  },
  BONUS_COINS_MEDIUM: {
    id: 'BONUS_COINS_MEDIUM',
    name: '政府補助',
    emoji: '🏛️',
    description: '獲得城市建設補助金！獲得 100 金幣',
    type: 'positive',
    effect: {
      type: 'instant_coins',
      amount: 100
    }
  },
  LUCKY_DOUBLE: {
    id: 'LUCKY_DOUBLE',
    name: '好運加持',
    emoji: '🍀',
    description: '運勢大開！下次事件結算收入翻倍',
    type: 'positive',
    effect: {
      type: 'next_income_multiplier',
      multiplier: 2
    }
  },
  FREE_UPGRADE: {
    id: 'FREE_UPGRADE',
    name: '鄰居幫忙',
    emoji: '🤝',
    description: '熱心鄰居協助！下次購買建築免費升級',
    type: 'positive',
    effect: {
      type: 'free_upgrade',
      description: '下次購買時自動獲得該建築的升級版（如有）'
    }
  },
  SCORE_BONUS: {
    id: 'SCORE_BONUS',
    name: '市民讚賞',
    emoji: '⭐',
    description: '你的建設獲得市民好評！獲得 30 貢獻分',
    type: 'positive',
    effect: {
      type: 'instant_score',
      amount: 30
    }
  },
  ITEM_DROP: {
    id: 'ITEM_DROP',
    name: '神秘寶箱',
    emoji: '🎁',
    description: '發現一個神秘寶箱！獲得隨機道具一個',
    type: 'positive',
    effect: {
      type: 'random_item'
    }
  },

  // === 中性事件 ===
  VISITOR: {
    id: 'VISITOR',
    name: '訪客到來',
    emoji: '👥',
    description: '有訪客來參觀你的建設！（無特殊效果）',
    type: 'neutral',
    effect: {
      type: 'none'
    }
  },
  WEATHER_REPORT: {
    id: 'WEATHER_REPORT',
    name: '天氣預報',
    emoji: '☀️',
    description: '今天天氣晴朗，適合建設！（無特殊效果）',
    type: 'neutral',
    effect: {
      type: 'none'
    }
  },

  // === 負面事件 ===
  TAX_COLLECTOR: {
    id: 'TAX_COLLECTOR',
    name: '稅務稽查',
    emoji: '📋',
    description: '稅務人員來訪，繳交建設稅 30 金幣',
    type: 'negative',
    effect: {
      type: 'lose_coins',
      amount: 30
    }
  },
  MATERIAL_SHORTAGE: {
    id: 'MATERIAL_SHORTAGE',
    name: '建材短缺',
    emoji: '📦',
    description: '建材漲價！下次購買建築成本 +20%',
    type: 'negative',
    effect: {
      type: 'next_purchase_increase',
      increase: 0.2
    }
  },
  MINOR_ACCIDENT: {
    id: 'MINOR_ACCIDENT',
    name: '小意外',
    emoji: '⚠️',
    description: '施工時發生小意外，支出 50 金幣處理',
    type: 'negative',
    effect: {
      type: 'lose_coins',
      amount: 50
    }
  }
};

// 事件權重設定（數字越大越容易出現）
export const EVENT_WEIGHTS = {
  // 正面事件總權重 50%
  DISCOUNT_NEXT: 8,
  BONUS_COINS_SMALL: 12,
  BONUS_COINS_MEDIUM: 5,
  LUCKY_DOUBLE: 5,
  FREE_UPGRADE: 3,
  SCORE_BONUS: 10,
  ITEM_DROP: 7,

  // 中性事件總權重 20%
  VISITOR: 10,
  WEATHER_REPORT: 10,

  // 負面事件總權重 30%
  TAX_COLLECTOR: 10,
  MATERIAL_SHORTAGE: 10,
  MINOR_ACCIDENT: 10
};

/**
 * 根據權重隨機抽取一個小事件
 */
export function drawMiniEvent() {
  const entries = Object.entries(EVENT_WEIGHTS);
  const totalWeight = entries.reduce((sum, [, weight]) => sum + weight, 0);

  let random = Math.random() * totalWeight;

  for (const [eventId, weight] of entries) {
    random -= weight;
    if (random <= 0) {
      return MINI_EVENTS[eventId];
    }
  }

  // 保底返回第一個
  return MINI_EVENTS[entries[0][0]];
}

export default MINI_EVENTS;
