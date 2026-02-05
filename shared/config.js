/**
 * 遊戲核心設定
 * 創智動能 2026 城市建設 - 尾牙互動遊戲
 */

export const GAME_CONFIG = {
  // 遊戲資訊
  game: {
    title: '創智動能 2026',
    subtitle: '齊心協力・共創未來城市',
    year: 2026
  },

  // 主持人密碼設定
  host: {
    password: 'nimo111'  // 修改此密碼以保護主持人控制台
  },

  // 玩家初始資源
  player: {
    initial: {
      coins: 500,        // 初始金幣
      score: 0           // 貢獻分（最終排名用）
    }
  },

  // 建築類型 - 大富翁風格
  buildings: {
    // === 住宅區 ===
    HOUSE: {
      id: 'HOUSE',
      name: '溫馨小屋',
      emoji: '🏠',
      category: 'residential',
      cost: 100,
      income: 15,
      description: '基礎住宅，穩定收入'
    },
    APARTMENT: {
      id: 'APARTMENT',
      name: '公寓大樓',
      emoji: '🏢',
      category: 'residential',
      cost: 300,
      income: 40,
      description: '中型住宅，容納更多居民'
    },
    MANSION: {
      id: 'MANSION',
      name: '豪華別墅',
      emoji: '🏰',
      category: 'residential',
      cost: 800,
      income: 100,
      description: '高級住宅，帶來優質居民'
    },

    // === 商業區 ===
    SHOP: {
      id: 'SHOP',
      name: '便利商店',
      emoji: '🏪',
      category: 'commercial',
      cost: 150,
      income: 25,
      description: '小型商店，服務社區'
    },
    RESTAURANT: {
      id: 'RESTAURANT',
      name: '美食餐廳',
      emoji: '🍽️',
      category: 'commercial',
      cost: 250,
      income: 35,
      description: '餐飲服務，提升生活品質'
    },
    HOTEL: {
      id: 'HOTEL',
      name: '觀光飯店',
      emoji: '🏨',
      category: 'commercial',
      cost: 600,
      income: 80,
      description: '吸引觀光客，帶動經濟'
    },
    MALL: {
      id: 'MALL',
      name: '購物中心',
      emoji: '🛒',
      category: 'commercial',
      cost: 1000,
      income: 130,
      description: '大型商場，商業核心'
    },

    // === 工業區 ===
    FACTORY: {
      id: 'FACTORY',
      name: '智慧工廠',
      emoji: '🏭',
      category: 'industrial',
      cost: 400,
      income: 60,
      description: '生產製造，創造就業'
    },
    WAREHOUSE: {
      id: 'WAREHOUSE',
      name: '物流倉儲',
      emoji: '📦',
      category: 'industrial',
      cost: 200,
      income: 30,
      description: '倉儲物流，支援商業'
    },
    TECHPARK: {
      id: 'TECHPARK',
      name: '科技園區',
      emoji: '🔬',
      category: 'industrial',
      cost: 1200,
      income: 150,
      description: '高科技產業，城市驕傲'
    },

    // === 公共設施 ===
    PARK: {
      id: 'PARK',
      name: '城市公園',
      emoji: '🌳',
      category: 'public',
      cost: 200,
      income: 20,
      description: '綠地休憩，提升幸福感',
      bonus: { happiness: 5 }
    },
    SCHOOL: {
      id: 'SCHOOL',
      name: '學校',
      emoji: '🏫',
      category: 'public',
      cost: 350,
      income: 25,
      description: '教育機構，培育人才',
      bonus: { education: 5 }
    },
    HOSPITAL: {
      id: 'HOSPITAL',
      name: '醫院',
      emoji: '🏥',
      category: 'public',
      cost: 500,
      income: 40,
      description: '醫療服務，守護健康',
      bonus: { health: 5 }
    },
    STADIUM: {
      id: 'STADIUM',
      name: '體育館',
      emoji: '🏟️',
      category: 'public',
      cost: 700,
      income: 50,
      description: '運動場館，凝聚市民',
      bonus: { happiness: 10 }
    },

    // === 特殊建築 ===
    LANDMARK: {
      id: 'LANDMARK',
      name: '城市地標',
      emoji: '🗼',
      category: 'special',
      cost: 1500,
      income: 200,
      description: '城市象徵，吸引全球目光'
    },
    SPACEPORT: {
      id: 'SPACEPORT',
      name: '太空站',
      emoji: '🚀',
      category: 'special',
      cost: 2000,
      income: 250,
      description: '未來科技，邁向星際'
    }
  },

  // 建築分類
  categories: {
    residential: { name: '住宅區', emoji: '🏘️', color: '#4ade80' },
    commercial: { name: '商業區', emoji: '🏬', color: '#fbbf24' },
    industrial: { name: '工業區', emoji: '⚙️', color: '#94a3b8' },
    public: { name: '公共設施', emoji: '🏛️', color: '#60a5fa' },
    special: { name: '特殊建築', emoji: '⭐', color: '#f472b6' }
  },

  // 城市狀態
  city: {
    name: '創智城',
    initial: {
      population: 0,
      happiness: 50,
      economy: 50,
      education: 50,
      health: 50
    }
  },

  // AI 設定
  ai: {
    timeout: 2000,
    model: 'gpt-4o-mini',
    maxTokens: 400
  },

  // 抽獎設定
  lottery: {
    tiers: {
      TOP: { percent: 10, label: '大獎池', multiplier: 5 },
      MID: { percent: 60, label: '中獎池', multiplier: 2 },
      BOTTOM: { percent: 30, label: '普獎池', multiplier: 1 }
    },
    guaranteedDraws: 1
  }
};

export const GAME_STATES = ['WAITING', 'BUILDING', 'EVENT', 'MINIGAME', 'ENDED'];

// 角色/職業系統 - 平衡設計，每個角色專精一個領域
// 成就/任務系統
export const ACHIEVEMENTS = {
  // === 建設類成就 ===
  FIRST_BUILDING: {
    id: 'FIRST_BUILDING',
    name: '初出茅廬',
    emoji: '🎉',
    description: '建造第一棟建築',
    category: 'building',
    condition: { type: 'building_count', count: 1 },
    reward: { coins: 50, score: 10 }
  },
  BUILDER_5: {
    id: 'BUILDER_5',
    name: '小小建設者',
    emoji: '🏗️',
    description: '累計建造 5 棟建築',
    category: 'building',
    condition: { type: 'building_count', count: 5 },
    reward: { coins: 100, score: 30 }
  },
  BUILDER_10: {
    id: 'BUILDER_10',
    name: '建設達人',
    emoji: '🏆',
    description: '累計建造 10 棟建築',
    category: 'building',
    condition: { type: 'building_count', count: 10 },
    reward: { coins: 200, score: 50 }
  },
  BUILDER_20: {
    id: 'BUILDER_20',
    name: '建築大亨',
    emoji: '👑',
    description: '累計建造 20 棟建築',
    category: 'building',
    condition: { type: 'building_count', count: 20 },
    reward: { coins: 500, score: 100 }
  },

  // === 分類專精成就 ===
  RESIDENTIAL_MASTER: {
    id: 'RESIDENTIAL_MASTER',
    name: '居住專家',
    emoji: '🏘️',
    description: '建造 5 棟住宅類建築',
    category: 'specialization',
    condition: { type: 'category_count', targetCategory: 'residential', count: 5 },
    reward: { coins: 150, score: 40 }
  },
  COMMERCIAL_MASTER: {
    id: 'COMMERCIAL_MASTER',
    name: '商業鉅子',
    emoji: '🏬',
    description: '建造 5 棟商業類建築',
    category: 'specialization',
    condition: { type: 'category_count', targetCategory: 'commercial', count: 5 },
    reward: { coins: 150, score: 40 }
  },
  INDUSTRIAL_MASTER: {
    id: 'INDUSTRIAL_MASTER',
    name: '工業先驅',
    emoji: '⚙️',
    description: '建造 5 棟工業類建築',
    category: 'specialization',
    condition: { type: 'category_count', targetCategory: 'industrial', count: 5 },
    reward: { coins: 150, score: 40 }
  },
  PUBLIC_MASTER: {
    id: 'PUBLIC_MASTER',
    name: '市民楷模',
    emoji: '🏛️',
    description: '建造 5 棟公共設施',
    category: 'specialization',
    condition: { type: 'category_count', targetCategory: 'public', count: 5 },
    reward: { coins: 150, score: 40 }
  },

  // === 收入類成就 ===
  FIRST_INCOME: {
    id: 'FIRST_INCOME',
    name: '首次收租',
    emoji: '💰',
    description: '獲得第一筆事件收入',
    category: 'income',
    condition: { type: 'total_income', amount: 1 },
    reward: { coins: 30, score: 5 }
  },
  INCOME_500: {
    id: 'INCOME_500',
    name: '小富即安',
    emoji: '💵',
    description: '累計收入達 500 金幣',
    category: 'income',
    condition: { type: 'total_income', amount: 500 },
    reward: { coins: 100, score: 30 }
  },
  INCOME_1000: {
    id: 'INCOME_1000',
    name: '財源廣進',
    emoji: '💎',
    description: '累計收入達 1000 金幣',
    category: 'income',
    condition: { type: 'total_income', amount: 1000 },
    reward: { coins: 200, score: 50 }
  },
  INCOME_2000: {
    id: 'INCOME_2000',
    name: '富甲一方',
    emoji: '🤑',
    description: '累計收入達 2000 金幣',
    category: 'income',
    condition: { type: 'total_income', amount: 2000 },
    reward: { coins: 300, score: 80 }
  },

  // === 特殊成就 ===
  DIVERSE_BUILDER: {
    id: 'DIVERSE_BUILDER',
    name: '多元發展',
    emoji: '🌈',
    description: '擁有至少 3 種不同分類的建築',
    category: 'special',
    condition: { type: 'category_diversity', count: 3 },
    reward: { coins: 200, score: 50 }
  },
  ALL_CATEGORY: {
    id: 'ALL_CATEGORY',
    name: '全能市長',
    emoji: '⭐',
    description: '擁有全部 5 種分類的建築',
    category: 'special',
    condition: { type: 'category_diversity', count: 5 },
    reward: { coins: 500, score: 100 }
  },
  HIGH_ROLLER: {
    id: 'HIGH_ROLLER',
    name: '一擲千金',
    emoji: '🎰',
    description: '單次購買花費超過 1000 金幣',
    category: 'special',
    condition: { type: 'single_purchase', amount: 1000 },
    reward: { coins: 200, score: 50 }
  },
  LANDMARK_OWNER: {
    id: 'LANDMARK_OWNER',
    name: '城市象徵',
    emoji: '🗼',
    description: '建造城市地標',
    category: 'special',
    condition: { type: 'specific_building', buildingId: 'LANDMARK' },
    reward: { coins: 300, score: 80 }
  },
  SPACE_PIONEER: {
    id: 'SPACE_PIONEER',
    name: '太空先驅',
    emoji: '🚀',
    description: '建造太空站',
    category: 'special',
    condition: { type: 'specific_building', buildingId: 'SPACEPORT' },
    reward: { coins: 500, score: 100 }
  },

  // === 全場唯一成就（先達成者獨享）===
  FIRST_LANDMARK: {
    id: 'FIRST_LANDMARK',
    name: '地標先驅',
    emoji: '🥇',
    description: '全場第一個建造城市地標',
    category: 'global_first',
    globalUnique: true,
    condition: { type: 'first_building', buildingId: 'LANDMARK' },
    reward: { coins: 500, score: 150 }
  },
  FIRST_SPACEPORT: {
    id: 'FIRST_SPACEPORT',
    name: '星際先鋒',
    emoji: '🥇',
    description: '全場第一個建造太空站',
    category: 'global_first',
    globalUnique: true,
    condition: { type: 'first_building', buildingId: 'SPACEPORT' },
    reward: { coins: 800, score: 200 }
  },
  FIRST_TECHPARK: {
    id: 'FIRST_TECHPARK',
    name: '科技領袖',
    emoji: '🥇',
    description: '全場第一個建造科技園區',
    category: 'global_first',
    globalUnique: true,
    condition: { type: 'first_building', buildingId: 'TECHPARK' },
    reward: { coins: 400, score: 120 }
  }
};

// 成就分類
export const ACHIEVEMENT_CATEGORIES = {
  building: { name: '建設成就', emoji: '🏗️', color: '#4ade80' },
  specialization: { name: '專精成就', emoji: '🎯', color: '#fbbf24' },
  income: { name: '收入成就', emoji: '💰', color: '#f59e0b' },
  special: { name: '特殊成就', emoji: '⭐', color: '#a855f7' },
  global_first: { name: '全場首位', emoji: '🥇', color: '#ef4444' }
};

// 道具卡系統
export const ITEM_CARDS = {
  // === 購買折扣類 ===
  DISCOUNT_30: {
    id: 'DISCOUNT_30',
    name: '七折券',
    emoji: '🏷️',
    description: '下次購買建築享 7 折優惠',
    cost: 100,
    category: 'discount',
    effect: { type: 'purchase_discount', value: 0.3 }
  },
  DISCOUNT_50: {
    id: 'DISCOUNT_50',
    name: '半價券',
    emoji: '💳',
    description: '下次購買建築享 5 折優惠',
    cost: 200,
    category: 'discount',
    effect: { type: 'purchase_discount', value: 0.5 }
  },

  // === 收入加成類 ===
  DOUBLE_INCOME: {
    id: 'DOUBLE_INCOME',
    name: '雙倍收入卡',
    emoji: '💎',
    description: '下次事件結算時收入翻倍',
    cost: 300,
    category: 'income',
    effect: { type: 'income_multiplier', value: 2 }
  },
  BONUS_100: {
    id: 'BONUS_100',
    name: '紅包',
    emoji: '🧧',
    description: '立即獲得 100 金幣',
    cost: 80,
    category: 'instant',
    effect: { type: 'instant_coins', value: 100 }
  },

  // === 建築相關 ===
  COPY_CARD: {
    id: 'COPY_CARD',
    name: '複製卡',
    emoji: '📋',
    description: '免費複製你上一棟建造的建築',
    cost: 250,
    category: 'building',
    effect: { type: 'copy_last_building' }
  },
  FREE_HOUSE: {
    id: 'FREE_HOUSE',
    name: '安居卡',
    emoji: '🏠',
    description: '免費獲得一棟溫馨小屋',
    cost: 80,
    category: 'building',
    effect: { type: 'free_building', buildingId: 'HOUSE' }
  },
  FREE_SHOP: {
    id: 'FREE_SHOP',
    name: '開店卡',
    emoji: '🏪',
    description: '免費獲得一間便利商店',
    cost: 120,
    category: 'building',
    effect: { type: 'free_building', buildingId: 'SHOP' }
  },

  // === 防護類 ===
  SHIELD_CARD: {
    id: 'SHIELD_CARD',
    name: '保護罩',
    emoji: '🛡️',
    description: '下次負面事件對你無效',
    cost: 200,
    category: 'defense',
    effect: { type: 'event_shield' }
  },

  // === 特殊類 ===
  LUCKY_DRAW: {
    id: 'LUCKY_DRAW',
    name: '幸運抽獎',
    emoji: '🎰',
    description: '隨機獲得 0~300 金幣',
    cost: 100,
    category: 'special',
    effect: { type: 'random_coins', min: 0, max: 300 }
  },
  SCORE_BOOST: {
    id: 'SCORE_BOOST',
    name: '積分加倍卡',
    emoji: '⭐',
    description: '立即獲得 50 貢獻分',
    cost: 150,
    category: 'instant',
    effect: { type: 'instant_score', value: 50 }
  }
};

// 城市協力目標
export const CITY_GOALS = {
  // === 建築數量目標 ===
  HOUSING_10: {
    id: 'HOUSING_10',
    name: '安居計畫',
    emoji: '🏘️',
    description: '全城共同建造 10 棟住宅類建築',
    category: 'building',
    target: { type: 'category_count', category: 'residential', count: 10 },
    reward: { type: 'all_coins', amount: 50 }
  },
  HOUSING_20: {
    id: 'HOUSING_20',
    name: '安居樂業',
    emoji: '🏡',
    description: '全城共同建造 20 棟住宅類建築',
    category: 'building',
    target: { type: 'category_count', category: 'residential', count: 20 },
    reward: { type: 'all_coins', amount: 100 }
  },
  COMMERCIAL_10: {
    id: 'COMMERCIAL_10',
    name: '商業發展',
    emoji: '🏪',
    description: '全城共同建造 10 棟商業類建築',
    category: 'building',
    target: { type: 'category_count', category: 'commercial', count: 10 },
    reward: { type: 'all_coins', amount: 50 }
  },
  INDUSTRIAL_5: {
    id: 'INDUSTRIAL_5',
    name: '工業起步',
    emoji: '🏭',
    description: '全城共同建造 5 棟工業類建築',
    category: 'building',
    target: { type: 'category_count', category: 'industrial', count: 5 },
    reward: { type: 'all_coins', amount: 60 }
  },
  PUBLIC_5: {
    id: 'PUBLIC_5',
    name: '公共建設',
    emoji: '🏛️',
    description: '全城共同建造 5 棟公共設施',
    category: 'building',
    target: { type: 'category_count', category: 'public', count: 5 },
    reward: { type: 'all_coins', amount: 60 }
  },

  // === 總數目標 ===
  TOTAL_30: {
    id: 'TOTAL_30',
    name: '小城初成',
    emoji: '🏙️',
    description: '全城共同建造 30 棟建築',
    category: 'milestone',
    target: { type: 'total_count', count: 30 },
    reward: { type: 'all_coins', amount: 80 }
  },
  TOTAL_50: {
    id: 'TOTAL_50',
    name: '城市興盛',
    emoji: '🌆',
    description: '全城共同建造 50 棟建築',
    category: 'milestone',
    target: { type: 'total_count', count: 50 },
    reward: { type: 'all_coins', amount: 100 }
  },
  TOTAL_100: {
    id: 'TOTAL_100',
    name: '百樓林立',
    emoji: '🌃',
    description: '全城共同建造 100 棟建築',
    category: 'milestone',
    target: { type: 'total_count', count: 100 },
    reward: { type: 'all_coins', amount: 150 }
  },

  // === 特殊建築目標 ===
  FIRST_LANDMARK: {
    id: 'FIRST_LANDMARK',
    name: '城市象徵',
    emoji: '🗼',
    description: '有人建造城市地標',
    category: 'special',
    target: { type: 'specific_building', buildingId: 'LANDMARK', count: 1 },
    reward: { type: 'all_score', amount: 30 }
  },
  FIRST_SPACEPORT: {
    id: 'FIRST_SPACEPORT',
    name: '太空時代',
    emoji: '🚀',
    description: '有人建造太空站',
    category: 'special',
    target: { type: 'specific_building', buildingId: 'SPACEPORT', count: 1 },
    reward: { type: 'all_score', amount: 50 }
  },

  // === 多元發展目標 ===
  BALANCED_CITY: {
    id: 'BALANCED_CITY',
    name: '均衡發展',
    emoji: '⚖️',
    description: '五種分類各至少有 3 棟建築',
    category: 'diversity',
    target: { type: 'all_categories_min', count: 3 },
    reward: { type: 'all_coins', amount: 100 }
  }
};

// 道具分類
export const ITEM_CATEGORIES = {
  discount: { name: '折扣類', emoji: '🏷️', color: '#fbbf24' },
  income: { name: '收入類', emoji: '💰', color: '#10b981' },
  building: { name: '建築類', emoji: '🏗️', color: '#6366f1' },
  defense: { name: '防護類', emoji: '🛡️', color: '#60a5fa' },
  instant: { name: '即時類', emoji: '⚡', color: '#f59e0b' },
  special: { name: '特殊類', emoji: '✨', color: '#a855f7' }
};

// 建築升級系統 - 3 棟合併升級為 1 棟高級建築
export const BUILDING_UPGRADES = {
  // 住宅升級路線：小屋 -> 公寓 -> 別墅
  HOUSE: {
    upgradeTo: 'APARTMENT',
    mergeCount: 3,
    bonusScore: 30,
    description: '3 棟溫馨小屋 → 1 棟公寓大樓'
  },
  APARTMENT: {
    upgradeTo: 'MANSION',
    mergeCount: 3,
    bonusScore: 50,
    description: '3 棟公寓大樓 → 1 棟豪華別墅'
  },

  // 商業升級路線：便利商店 -> 餐廳 -> 飯店 -> 購物中心
  SHOP: {
    upgradeTo: 'RESTAURANT',
    mergeCount: 3,
    bonusScore: 30,
    description: '3 間便利商店 → 1 間美食餐廳'
  },
  RESTAURANT: {
    upgradeTo: 'HOTEL',
    mergeCount: 3,
    bonusScore: 40,
    description: '3 間美食餐廳 → 1 間觀光飯店'
  },
  HOTEL: {
    upgradeTo: 'MALL',
    mergeCount: 3,
    bonusScore: 60,
    description: '3 間觀光飯店 → 1 座購物中心'
  },

  // 工業升級路線：倉儲 -> 工廠 -> 科技園區
  WAREHOUSE: {
    upgradeTo: 'FACTORY',
    mergeCount: 3,
    bonusScore: 35,
    description: '3 座物流倉儲 → 1 座智慧工廠'
  },
  FACTORY: {
    upgradeTo: 'TECHPARK',
    mergeCount: 3,
    bonusScore: 70,
    description: '3 座智慧工廠 → 1 座科技園區'
  },

  // 公共設施升級路線：公園 -> 學校 -> 醫院 -> 體育館
  PARK: {
    upgradeTo: 'SCHOOL',
    mergeCount: 3,
    bonusScore: 35,
    description: '3 座城市公園 → 1 間學校'
  },
  SCHOOL: {
    upgradeTo: 'HOSPITAL',
    mergeCount: 3,
    bonusScore: 45,
    description: '3 間學校 → 1 間醫院'
  },
  HOSPITAL: {
    upgradeTo: 'STADIUM',
    mergeCount: 3,
    bonusScore: 55,
    description: '3 間醫院 → 1 座體育館'
  },

  // 特殊建築升級：地標 -> 太空站
  LANDMARK: {
    upgradeTo: 'SPACEPORT',
    mergeCount: 2,  // 只需要 2 棟
    bonusScore: 150,
    description: '2 座城市地標 → 1 座太空站'
  }
};

// 小遊戲設定
export const MINI_GAMES = {
  // 快問快答題庫
  QUIZ_QUESTIONS: [
    { id: 1, question: '為什麼冰可樂比常溫可樂喝起來更甜？', options: ['低溫增強甜味感受', '糖分在低溫下更活躍', '廠商故意調配', '錯覺'], correct: 0 },
    { id: 2, question: '飛機窗戶上的小孔作用是？', options: ['透氣', '平衡內外氣壓', '防止結霧', '裝飾'], correct: 1 },
    { id: 3, question: '橡皮擦為什麼能擦掉鉛筆字？', options: ['化學溶解', '物理摩擦帶走石墨', '靜電吸附', '熱力溶解'], correct: 1 },
    { id: 4, question: '保鮮膜「保鮮」主要靠？', options: ['完全密封', '減緩水分流失', '釋放保鮮劑', '降溫'], correct: 1 },
    { id: 5, question: '手機充電到100%後繼續插著，主要傷害的是？', options: ['手機電池', '你的強迫症', '電費帳單', '充電線'], correct: 1 },
    { id: 6, question: '「請重啟電腦以更新軟體」通知出現時，多數人會？', options: ['立即重啟', '忽略直到關機', '焦慮要不要更新', '問同事'], correct: 1 },
    { id: 7, question: '電腦當機時，我們反覆按同一個鍵是為了？', options: ['測試鍵盤', '表達情緒', '增加修復機率', '喚醒電腦'], correct: 1 },
    { id: 8, question: '手機只剩1%電量時，人類潛能會？', options: ['大幅提升', '維持不變', '完全喪失', '隨機變化'], correct: 0 },
    { id: 9, question: '當AI回覆「作為一個AI模型，我……」時，它最可能接下來要？', options: ['給出完美答案', '禮貌地拒絕你', '開始胡說八道', '結束對話'], correct: 1 },
    { id: 10, question: '你對AI說「請用幽默的方式回答」，結果通常會？', options: ['真的很好笑', '它努力了但不好笑', '它假裝沒看到這句', '生成笑話'], correct: 1 },
    { id: 11, question: 'AI生成一張「手」的圖片時，最容易出現？', options: ['完美的手', '六根手指', '沒有手', '透明的手'], correct: 1 },
    { id: 12, question: '當你問AI「你怎麼評價自己？」，它的回答本質上是？', options: ['真實想法', '訓練資料的統計結果', '隨機生成的', 'AI的自我意識'], correct: 1 },
    { id: 13, question: 'AI說「我理解你的感受」，實際上它？', options: ['真的理解', '在模仿人類對話模式', '在安慰你', '在分析情緒'], correct: 1 },
    { id: 14, question: '當AI說「我理解你的感受」，實際上它正在？', options: ['真的在分析你的情緒', '隨機選擇一句安慰模板', '偷偷搜索「人類情感模擬指南」', '表達同理心'], correct: 1 },
    { id: 15, question: '讓AI畫「一個人在喝咖啡」，最容易出現什麼bug？', options: ['咖啡杯長在臉上', '手裡拿著空氣', '背景出現外星人', '人物扭曲'], correct: 0 },
    { id: 16, question: 'AI生成圖片時，文字部分通常會？', options: ['完美呈現', '變成亂碼', '用其他語言顯示', '消失'], correct: 1 },
    { id: 17, question: '當AI說「我無法回答這個問題，因為……」時，真正原因是？', options: ['問題太深奧', '觸發了安全限制', '它要去吃虛擬午餐了', '不想回答'], correct: 1 },
    { id: 18, question: 'AI講笑話不好笑的原因是？', options: ['笑點太冷', '根本沒理解「好笑」的定義', '說完還會自己解釋笑點', '缺乏幽默感'], correct: 1 },
    { id: 19, question: 'AI說「這取決於多種因素」時，其實是？', options: ['真的在分析', '不知道答案的標準回答', '在爭取思考時間', '要你自己判斷'], correct: 1 }
  ],

  // 喝啤酒比賽設定
  BEER_GAME: {
    minPlayers: 3,
    maxPlayers: 5,
    rewards: {
      first: 500,
      second: 300,
      others: 100
    }
  },

  // 比大小設定
  POKER_GAME: {
    betTime: 20, // 下注時間（秒）
    bigReward: 100, // 押對的獎勵
    penalty: 0  // 押錯不扣分，只是要喝酒
  },

  // 猜歌曲前奏設定
  SONG_GUESS_GAME: {
    songList: [
      '大海',
      '姐妹',
      '七里香',
      '癡心絕對',
      '修練愛情',
      'Sugar',
      '青蘋果樂園',
      '特務J',
      '幹大事',
      '愛人錯過',
      '月亮惹的禍',
      '派對動物'
    ],
    correctReward: 100, // 答對獎勵
    maxRounds: 10 // 最多局數
  }
};

export const ROLES = {
  // === 成本減免型（前期優勢）===
  ARCHITECT: {
    id: 'ARCHITECT',
    name: '建築師',
    emoji: '🏗️',
    description: '精通住宅設計，住宅類建築成本降低 20%',
    color: '#4ade80',
    skills: [{
      type: 'cost_reduction',
      target: 'category',
      category: 'residential',
      value: 0.2
    }]
  },
  MERCHANT: {
    id: 'MERCHANT',
    name: '商人',
    emoji: '🛍️',
    description: '商業頭腦精明，商業類建築成本降低 20%',
    color: '#fbbf24',
    skills: [{
      type: 'cost_reduction',
      target: 'category',
      category: 'commercial',
      value: 0.2
    }]
  },
  ENGINEER: {
    id: 'ENGINEER',
    name: '工程師',
    emoji: '⚙️',
    description: '技術專家，工業類建築成本降低 20%',
    color: '#94a3b8',
    skills: [{
      type: 'cost_reduction',
      target: 'category',
      category: 'industrial',
      value: 0.2
    }]
  },
  ENVIRONMENTALIST: {
    id: 'ENVIRONMENTALIST',
    name: '環保專家',
    emoji: '🌱',
    description: '熱心公益，公共設施成本降低 20%',
    color: '#60a5fa',
    skills: [{
      type: 'cost_reduction',
      target: 'category',
      category: 'public',
      value: 0.2
    }]
  },
  DREAMER: {
    id: 'DREAMER',
    name: '夢想家',
    emoji: '✨',
    description: '追求卓越，特殊建築成本降低 20%',
    color: '#f472b6',
    skills: [{
      type: 'cost_reduction',
      target: 'category',
      category: 'special',
      value: 0.2
    }]
  },

  // === 營收加成型（後期優勢）===
  LANDLORD: {
    id: 'LANDLORD',
    name: '房東',
    emoji: '🏠',
    description: '收租達人，住宅類建築營收增加 25%',
    color: '#4ade80',
    skills: [{
      type: 'income_bonus',
      target: 'category',
      category: 'residential',
      value: 0.25
    }]
  },
  SHOPKEEPER: {
    id: 'SHOPKEEPER',
    name: '店長',
    emoji: '🏪',
    description: '經營有道，商業類建築營收增加 25%',
    color: '#fbbf24',
    skills: [{
      type: 'income_bonus',
      target: 'category',
      category: 'commercial',
      value: 0.25
    }]
  },
  FACTORY_MANAGER: {
    id: 'FACTORY_MANAGER',
    name: '廠長',
    emoji: '🔧',
    description: '生產效率高，工業類建築營收增加 25%',
    color: '#94a3b8',
    skills: [{
      type: 'income_bonus',
      target: 'category',
      category: 'industrial',
      value: 0.25
    }]
  },
  CIVIC_LEADER: {
    id: 'CIVIC_LEADER',
    name: '市民代表',
    emoji: '🎭',
    description: '深得民心，公共設施營收增加 25%',
    color: '#60a5fa',
    skills: [{
      type: 'income_bonus',
      target: 'category',
      category: 'public',
      value: 0.25
    }]
  },
  EXPLORER: {
    id: 'EXPLORER',
    name: '探險家',
    emoji: '🚀',
    description: '開拓先鋒，特殊建築營收增加 25%',
    color: '#f472b6',
    skills: [{
      type: 'income_bonus',
      target: 'category',
      category: 'special',
      value: 0.25
    }]
  },

  // === 隨機驚喜型 ===
  ADVENTURER: {
    id: 'ADVENTURER',
    name: '冒險家',
    emoji: '🎲',
    description: '運氣不錯，購買建築時 15% 機率半價',
    color: '#a855f7',
    skills: [{
      type: 'random_discount',
      chance: 0.15,
      discount: 0.5
    }]
  },
  LUCKY: {
    id: 'LUCKY',
    name: '幸運兒',
    emoji: '🍀',
    description: '福星高照，事件結算時 15% 機率收入翻倍',
    color: '#22c55e',
    skills: [{
      type: 'random_income_bonus',
      chance: 0.15,
      multiplier: 2
    }]
  }
};

export default GAME_CONFIG;
