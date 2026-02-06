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
  SPECIAL: 'SPECIAL',     // 特殊事件
  INTERACTIVE: 'INTERACTIVE' // 互動事件（需要現場執行與手動結算）
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
  },

  // ========== 互動事件（需要現場執行與手動結算）==========
  {
    id: 'INTERACTIVE_CLIENT_DINNER',
    type: EVENT_TYPES.INTERACTIVE,
    title: '客戶應酬大作戰',
    description: '重要客戶來訪！需要有人陪同應酬喝酒，表現好的員工有獎勵！',
    icon: '🍺',
    interactive: true,
    participantCount: { min: 3, max: 5 },
    gameType: 'drinking',
    instructions: '抽選 3-5 位玩家，每人與主管喝一杯啤酒。喝完獲得 +100元，未完成 +50元參與獎。',
    rewards: {
      winner: { coins: 100, description: '喝完 +100元' },
      participant: { coins: 50, description: '參與獎 +50元' }
    },
    display: {
      affected: '喝酒挑戰：喝完 +100元，參與 +50元',
      mood: 'positive'
    }
  },
  {
    id: 'INTERACTIVE_BUG_EMERGENCY',
    type: EVENT_TYPES.INTERACTIVE,
    title: '緊急 Bug 修復挑戰',
    description: '生產環境出現重大 Bug！需要工程師緊急處理，成功修復有高額獎金！',
    icon: '🐛',
    interactive: true,
    participantCount: { min: 2, max: 4 },
    gameType: 'rock_paper_scissors',
    instructions: '抽選 2-4 位玩家進行猜拳淘汰賽。最後勝出者獲得 +300元，淘汰者喝一杯。',
    rewards: {
      winner: { coins: 300, description: '成功修復 +300元' },
      loser: { coins: 0, description: '修復失敗' }
    },
    display: {
      affected: '猜拳對決：贏家 +300元',
      mood: 'positive'
    }
  },
  {
    id: 'INTERACTIVE_SALES_PITCH',
    type: EVENT_TYPES.INTERACTIVE,
    title: '商業提案競賽',
    description: '大型專案招標！業務部門需要進行提案簡報，表現最佳者拿下訂單！',
    icon: '📊',
    interactive: true,
    participantCount: { min: 3, max: 5 },
    gameType: 'black_white_guess',
    instructions: '抽選 3-5 位玩家進行黑白猜淘汰賽。主持人出題，最後勝出者獲得 +400元。',
    rewards: {
      winner: { coins: 400, description: '拿下訂單 +400元' },
      loser: { coins: 0, description: '提案失敗' }
    },
    display: {
      affected: '黑白猜對決：贏家 +400元',
      mood: 'positive'
    }
  },
  {
    id: 'INTERACTIVE_TEAM_BUILDING',
    type: EVENT_TYPES.INTERACTIVE,
    title: '跨部門協作任務',
    description: '執行長指派特殊專案，需要不同部門通力合作！',
    icon: '🤝',
    interactive: true,
    participantCount: { min: 4, max: 6 },
    gameType: 'team_challenge',
    instructions: '抽選 4-6 位玩家組成團隊，進行猜拳接力賽（每人輪流猜拳）。成功完成獲得每人 +200元，失敗每人 +50元參與獎。',
    rewards: {
      winner: { coins: 200, description: '任務成功 +200元' },
      loser: { coins: 50, description: '參與獎 +50元' }
    },
    display: {
      affected: '團隊挑戰：成功 +200元/人，參與 +50元/人',
      mood: 'positive'
    }
  },
  {
    id: 'INTERACTIVE_CEO_BONUS',
    type: EVENT_TYPES.INTERACTIVE,
    title: '執行長發紅包',
    description: '執行長心情大好，決定現場發放紅包給表現優秀的員工！',
    icon: '🎁',
    interactive: true,
    participantCount: { min: 1, max: 3 },
    gameType: 'lucky_draw',
    instructions: '抽選 1-3 位幸運玩家，每人直接獲得 +500元紅包獎勵！',
    rewards: {
      winner: { coins: 500, description: '紅包 +500元' }
    },
    display: {
      affected: '幸運紅包：每人 +500元',
      mood: 'positive'
    }
  },
  {
    id: 'INTERACTIVE_QA_SHOWDOWN',
    type: EVENT_TYPES.INTERACTIVE,
    title: '品質保證大對決',
    description: '產品即將上線，QA 團隊需要進行最後檢查，找出最多問題的人有獎勵！',
    icon: '🔍',
    interactive: true,
    participantCount: { min: 2, max: 4 },
    gameType: 'rock_paper_scissors',
    instructions: '抽選 2-4 位玩家進行猜拳對決。勝出者獲得 +250元，其他玩家獲得 +100元參與獎。',
    rewards: {
      winner: { coins: 250, description: '找到 Bug +250元' },
      loser: { coins: 100, description: '參與獎 +100元' }
    },
    display: {
      affected: '猜拳對決：贏家 +250元，其他 +100元',
      mood: 'positive'
    }
  },
  {
    id: 'INTERACTIVE_PM_CRISIS',
    type: EVENT_TYPES.INTERACTIVE,
    title: 'PM 危機處理',
    description: '專案出現重大變更！PM 需要緊急協調資源，處理得當有獎金！',
    icon: '⚡',
    interactive: true,
    participantCount: { min: 2, max: 3 },
    gameType: 'black_white_guess',
    instructions: '抽選 2-3 位玩家進行黑白猜對決。勝出者獲得 +350元，失敗者喝一杯反省。',
    rewards: {
      winner: { coins: 350, description: '危機化解 +350元' },
      loser: { coins: 0, description: '處理失敗' }
    },
    display: {
      affected: '黑白猜對決：贏家 +350元',
      mood: 'positive'
    }
  },
  {
    id: 'INTERACTIVE_MARKETING_VIRAL',
    type: EVENT_TYPES.INTERACTIVE,
    title: '行銷創意大賽',
    description: '行銷活動需要創意發想！最有創意的提案將獲得高額獎金！',
    icon: '🚀',
    interactive: true,
    participantCount: { min: 2, max: 4 },
    gameType: 'creative_battle',
    instructions: '抽選 2-4 位玩家進行猜拳創意對決。勝出者創意被採用獲得 +400元，其他玩家獲得 +100元參考獎。',
    rewards: {
      winner: { coins: 400, description: '創意採用 +400元' },
      loser: { coins: 100, description: '參考獎 +100元' }
    },
    display: {
      affected: '猜拳對決：贏家 +400元，其他 +100元',
      mood: 'positive'
    }
  },
  {
    id: 'INTERACTIVE_FINANCE_AUDIT',
    type: EVENT_TYPES.INTERACTIVE,
    title: '財務快速結算',
    description: '季度結算時間到！財務部門需要快速完成核對，準確者有獎勵！',
    icon: '💼',
    interactive: true,
    participantCount: { min: 1, max: 2 },
    gameType: 'challenge',
    instructions: '抽選 1-2 位玩家進行快速挑戰（喝酒速度賽或猜拳三戰兩勝）。勝出者獲得 +300元，完成者獲得 +150元。',
    rewards: {
      winner: { coins: 300, description: '快速完成 +300元' },
      participant: { coins: 150, description: '完成獎 +150元' }
    },
    display: {
      affected: '速度挑戰：勝出 +300元，完成 +150元',
      mood: 'positive'
    }
  },
  {
    id: 'INTERACTIVE_ALLHANDS_TOAST',
    type: EVENT_TYPES.INTERACTIVE,
    title: '全員慶功宴',
    description: '公司達成重要里程碑！執行長號召員工一起舉杯慶祝！',
    icon: '🥂',
    interactive: true,
    participantCount: { min: 5, max: 10 },
    gameType: 'mass_drinking',
    instructions: '抽選 5-10 位玩家與執行長一起舉杯乾杯。每位參與者獲得 +150元慶功獎勵！',
    rewards: {
      participant: { coins: 150, description: '慶功獎 +150元' }
    },
    display: {
      affected: '乾杯慶祝：每人 +150元',
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
