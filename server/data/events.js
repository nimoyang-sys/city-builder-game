/**
 * 事件牌庫系統
 * 創智動能 2026 城市建設 - 產業相關事件
 */

// 事件類型
export const EVENT_TYPES = {
  BOOM: 'BOOM',           // 景氣繁榮
  RECESSION: 'RECESSION', // 景氣衰退
  DISASTER: 'DISASTER',   // 災難事件
  POLICY: 'POLICY',       // 政策利多
  SPECIAL: 'SPECIAL'      // 特殊事件
};

/**
 * 事件牌庫
 * 每張牌影響特定建築類型的營收
 */
export const EVENT_DECK = [
  // ========== 景氣繁榮 ==========
  {
    id: 'BOOM_TOURISM',
    type: EVENT_TYPES.BOOM,
    title: '觀光旺季來臨',
    description: '國際旅遊解封，觀光客湧入城市！',
    icon: '✈️',
    effects: [
      { building: 'HOTEL', multiplier: 2.0 },
      { building: 'RESTAURANT', multiplier: 1.5 },
      { building: 'MALL', multiplier: 1.3 }
    ],
    display: {
      affected: '飯店 x2、餐廳 x1.5、購物中心 x1.3',
      mood: 'positive'
    }
  },
  {
    id: 'BOOM_TECH',
    type: EVENT_TYPES.BOOM,
    title: 'AI 產業大爆發',
    description: '人工智慧需求暴增，科技業訂單滿載！',
    icon: '🤖',
    effects: [
      { building: 'TECHPARK', multiplier: 2.5 },
      { building: 'FACTORY', multiplier: 1.5 },
      { building: 'SCHOOL', multiplier: 1.3 }
    ],
    display: {
      affected: '科技園區 x2.5、工廠 x1.5、學校 x1.3',
      mood: 'positive'
    }
  },
  {
    id: 'BOOM_HOUSING',
    type: EVENT_TYPES.BOOM,
    title: '房市熱絡',
    description: '低利率政策帶動房市，住宅需求上升！',
    icon: '📈',
    effects: [
      { building: 'MANSION', multiplier: 2.0 },
      { building: 'APARTMENT', multiplier: 1.8 },
      { building: 'HOUSE', multiplier: 1.5 }
    ],
    display: {
      affected: '豪華別墅 x2、公寓 x1.8、小屋 x1.5',
      mood: 'positive'
    }
  },
  {
    id: 'BOOM_ECOMMERCE',
    type: EVENT_TYPES.BOOM,
    title: '電商購物節',
    description: '雙11購物節來襲，物流業務爆量！',
    icon: '🛍️',
    effects: [
      { building: 'WAREHOUSE', multiplier: 2.5 },
      { building: 'MALL', multiplier: 1.8 },
      { building: 'SHOP', multiplier: 1.5 }
    ],
    display: {
      affected: '物流倉儲 x2.5、購物中心 x1.8、便利商店 x1.5',
      mood: 'positive'
    }
  },
  {
    id: 'BOOM_HEALTH',
    type: EVENT_TYPES.BOOM,
    title: '健康意識抬頭',
    description: '市民注重健康，醫療與運動產業興盛！',
    icon: '💪',
    effects: [
      { building: 'HOSPITAL', multiplier: 2.0 },
      { building: 'STADIUM', multiplier: 1.8 },
      { building: 'PARK', multiplier: 1.5 }
    ],
    display: {
      affected: '醫院 x2、體育館 x1.8、公園 x1.5',
      mood: 'positive'
    }
  },

  // ========== 景氣衰退 ==========
  {
    id: 'RECESSION_TOURISM',
    type: EVENT_TYPES.RECESSION,
    title: '旅遊業蕭條',
    description: '國際情勢緊張，觀光客銳減...',
    icon: '📉',
    effects: [
      { building: 'HOTEL', multiplier: 0.3 },
      { building: 'RESTAURANT', multiplier: 0.6 },
      { building: 'MALL', multiplier: 0.8 }
    ],
    display: {
      affected: '飯店營收 -70%、餐廳 -40%、購物中心 -20%',
      mood: 'negative'
    }
  },
  {
    id: 'RECESSION_INDUSTRY',
    type: EVENT_TYPES.RECESSION,
    title: '製造業寒冬',
    description: '全球供應鏈中斷，工廠訂單減少...',
    icon: '❄️',
    effects: [
      { building: 'FACTORY', multiplier: 0.4 },
      { building: 'WAREHOUSE', multiplier: 0.5 },
      { building: 'TECHPARK', multiplier: 0.7 }
    ],
    display: {
      affected: '工廠營收 -60%、倉儲 -50%、科技園區 -30%',
      mood: 'negative'
    }
  },
  {
    id: 'RECESSION_RETAIL',
    type: EVENT_TYPES.RECESSION,
    title: '消費緊縮',
    description: '通膨壓力下，民眾減少消費支出...',
    icon: '💸',
    effects: [
      { building: 'MALL', multiplier: 0.5 },
      { building: 'SHOP', multiplier: 0.6 },
      { building: 'RESTAURANT', multiplier: 0.7 }
    ],
    display: {
      affected: '購物中心 -50%、商店 -40%、餐廳 -30%',
      mood: 'negative'
    }
  },

  // ========== 災難事件 ==========
  {
    id: 'DISASTER_TYPHOON',
    type: EVENT_TYPES.DISASTER,
    title: '颱風來襲',
    description: '強颱過境，戶外設施暫停營業！',
    icon: '🌀',
    effects: [
      { building: 'PARK', multiplier: 0 },
      { building: 'STADIUM', multiplier: 0 },
      { building: 'HOTEL', multiplier: 0.5 }
    ],
    display: {
      affected: '公園、體育館暫停營業，飯店 -50%',
      mood: 'negative'
    }
  },
  {
    id: 'DISASTER_BLACKOUT',
    type: EVENT_TYPES.DISASTER,
    title: '大停電',
    description: '電網故障，全城大停電！',
    icon: '🔌',
    effects: [
      { building: 'FACTORY', multiplier: 0.2 },
      { building: 'TECHPARK', multiplier: 0.3 },
      { building: 'MALL', multiplier: 0.4 }
    ],
    display: {
      affected: '工廠 -80%、科技園區 -70%、購物中心 -60%',
      mood: 'negative'
    }
  },
  {
    id: 'DISASTER_PANDEMIC',
    type: EVENT_TYPES.DISASTER,
    title: '疫情爆發',
    description: '新型病毒擴散，部分設施管制中...',
    icon: '🦠',
    effects: [
      { building: 'RESTAURANT', multiplier: 0.3 },
      { building: 'HOTEL', multiplier: 0.2 },
      { building: 'HOSPITAL', multiplier: 2.0 }
    ],
    display: {
      affected: '餐廳 -70%、飯店 -80%，但醫院 x2！',
      mood: 'mixed'
    }
  },

  // ========== 政策利多 ==========
  {
    id: 'POLICY_SUBSIDY',
    type: EVENT_TYPES.POLICY,
    title: '政府補助',
    description: '市長宣布：全體市民發放建設補助金！',
    icon: '💰',
    effects: [
      { type: 'bonus_coins', amount: 100 }
    ],
    display: {
      affected: '全體玩家 +100 金幣',
      mood: 'positive'
    }
  },
  {
    id: 'POLICY_GREEN',
    type: EVENT_TYPES.POLICY,
    title: '綠能政策',
    description: '推動永續發展，環保建設獲得獎勵！',
    icon: '🌱',
    effects: [
      { building: 'PARK', multiplier: 2.0 },
      { building: 'TECHPARK', multiplier: 1.5 }
    ],
    display: {
      affected: '公園 x2、科技園區 x1.5',
      mood: 'positive'
    }
  },
  {
    id: 'POLICY_EDUCATION',
    type: EVENT_TYPES.POLICY,
    title: '教育改革',
    description: '加碼教育預算，學校收益增加！',
    icon: '📚',
    effects: [
      { building: 'SCHOOL', multiplier: 2.5 }
    ],
    display: {
      affected: '學校 x2.5',
      mood: 'positive'
    }
  },
  {
    id: 'POLICY_INFRASTRUCTURE',
    type: EVENT_TYPES.POLICY,
    title: '基礎建設計畫',
    description: '大型公共建設啟動，帶動整體經濟！',
    icon: '🏗️',
    effects: [
      { type: 'all_multiplier', multiplier: 1.3 }
    ],
    display: {
      affected: '全部建築營收 x1.3',
      mood: 'positive'
    }
  },

  // ========== 特殊事件 ==========
  {
    id: 'SPECIAL_LANDMARK',
    type: EVENT_TYPES.SPECIAL,
    title: '城市獲獎',
    description: '創智城榮獲「最佳宜居城市」！地標建築受矚目！',
    icon: '🏆',
    effects: [
      { building: 'LANDMARK', multiplier: 3.0 },
      { building: 'HOTEL', multiplier: 1.5 }
    ],
    display: {
      affected: '城市地標 x3、飯店 x1.5',
      mood: 'positive'
    }
  },
  {
    id: 'SPECIAL_SPACE',
    type: EVENT_TYPES.SPECIAL,
    title: '太空任務成功',
    description: '創智城太空站完成首次發射任務！',
    icon: '🛸',
    effects: [
      { building: 'SPACEPORT', multiplier: 5.0 },
      { building: 'TECHPARK', multiplier: 2.0 }
    ],
    display: {
      affected: '太空站 x5、科技園區 x2',
      mood: 'positive'
    }
  },
  {
    id: 'SPECIAL_FESTIVAL',
    type: EVENT_TYPES.SPECIAL,
    title: '城市嘉年華',
    description: '尾牙特別活動！全城歡慶，營收加倍！',
    icon: '🎉',
    effects: [
      { type: 'all_multiplier', multiplier: 1.5 }
    ],
    display: {
      affected: '全部建築營收 x1.5',
      mood: 'positive'
    }
  },
  {
    id: 'SPECIAL_BONUS',
    type: EVENT_TYPES.SPECIAL,
    title: '年終獎金',
    description: '公司大方發獎金，全體員工有福了！',
    icon: '🧧',
    effects: [
      { type: 'bonus_score', amount: 50 }
    ],
    display: {
      affected: '全體玩家 +50 積分',
      mood: 'positive'
    }
  }
];

/**
 * 隨機抽取事件
 */
export function drawRandomEvent() {
  const index = Math.floor(Math.random() * EVENT_DECK.length);
  return { ...EVENT_DECK[index] };
}

/**
 * 依類型抽取事件
 */
export function drawEventByType(type) {
  const filtered = EVENT_DECK.filter(e => e.type === type);
  if (filtered.length === 0) return null;
  const index = Math.floor(Math.random() * filtered.length);
  return { ...filtered[index] };
}

/**
 * 依 ID 取得事件
 */
export function getEventById(id) {
  return EVENT_DECK.find(e => e.id === id) || null;
}

/**
 * 取得所有事件（主持人用）
 */
export function getAllEvents() {
  return EVENT_DECK.map(e => ({
    id: e.id,
    type: e.type,
    title: e.title,
    icon: e.icon,
    display: e.display
  }));
}

export default EVENT_DECK;
