/**
 * AI 服務模組
 * 負責生成事件旁白，不改變任何遊戲數值
 */

import OpenAI from 'openai';
import { GAME_CONFIG } from '../../shared/config.js';
import { FALLBACK_COMMENTS, FALLBACK_TEMPLATES } from '../data/fallbacks.js';

// 初始化 OpenAI 客戶端
let openai = null;

export function initAI(apiKey) {
  if (apiKey) {
    openai = new OpenAI({ apiKey });
  }
}

/**
 * AI Prompt 模板
 * 嚴格限制 AI 只能做旁白，不能改變任何數值或規則
 */
const SYSTEM_PROMPT = `你是尾牙活動的「AI 市長播報員」。你只負責講故事與公告，不得新增或修改任何規則、數值或懲罰。

請根據我提供的事件資料，輸出以下三段，使用繁體中文：
1) 【市長公告】1～2 句，氣氛感要足，語氣要符合事件類型
2) 【影響摘要】務必逐條引用我給的數字，不要自己發明任何數值
3) 【一句吐槽】幽默但不冒犯，不涉及政治、性別、身材、宗教、職場霸凌

重要規則：
- 你只能引用我提供的 display_numbers 中的數值
- 不可以自己編造任何數字、百分比或倍率
- 不可以新增任何遊戲規則或懲罰機制
- 保持輕鬆愉快的尾牙氣氛
- 每段文字要簡短有力，適合投影顯示`;

/**
 * 生成事件旁白
 * @param {object} request - 旁白請求
 * @returns {object} 旁白結果
 */
export async function generateNarration(request) {
  const { event, cityState, top3, round, totalRounds } = request;

  if (!openai) {
    console.log('AI not initialized, using fallback');
    return getFallbackNarration(event);
  }

  const userPrompt = `事件資料：
- 事件名稱：${event.title_key}
- 事件類型：${event.type}
- 數值（只能用這些）：${JSON.stringify(event.display_numbers, null, 2)}
- 建議語氣標籤：${event.tone_tags.join('、')}
- 城市狀態摘要：${cityState}
- 排行榜 Top3：${top3.join('、')}
- 目前回合：第 ${round} 回合（共 ${totalRounds} 回合）`;

  try {
    const response = await openai.chat.completions.create({
      model: GAME_CONFIG.ai.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: GAME_CONFIG.ai.maxTokens,
      temperature: 0.8
    });

    const content = response.choices[0]?.message?.content || '';

    // 解析 AI 回應
    const parsed = parseNarration(content);

    // 安全檢查
    if (!validateNarration(parsed, event)) {
      console.log('AI response failed validation, using fallback');
      return getFallbackNarration(event);
    }

    return parsed;

  } catch (error) {
    console.error('AI generation error:', error.message);
    return getFallbackNarration(event);
  }
}

/**
 * 解析 AI 回應
 */
function parseNarration(content) {
  const result = {
    announcement: '',
    summary: '',
    comment: '',
    raw: content
  };

  // 嘗試解析各段落
  const announcementMatch = content.match(/【市長公告】(.+?)(?=【|$)/s);
  const summaryMatch = content.match(/【影響摘要】(.+?)(?=【|$)/s);
  const commentMatch = content.match(/【一句吐槽】(.+?)(?=【|$)/s);

  if (announcementMatch) {
    result.announcement = announcementMatch[1].trim();
  }
  if (summaryMatch) {
    result.summary = summaryMatch[1].trim();
  }
  if (commentMatch) {
    result.comment = commentMatch[1].trim();
  }

  // 如果解析失敗，嘗試簡單分段
  if (!result.announcement && !result.summary) {
    const lines = content.split('\n').filter(l => l.trim());
    if (lines.length >= 1) result.announcement = lines[0];
    if (lines.length >= 2) result.summary = lines[1];
    if (lines.length >= 3) result.comment = lines[2];
  }

  return result;
}

/**
 * 驗證 AI 回應（安全檢查）
 */
function validateNarration(parsed, event) {
  // 檢查是否有內容
  if (!parsed.announcement && !parsed.summary) {
    return false;
  }

  // 檢查長度（避免太長）
  const totalLength = (parsed.announcement + parsed.summary + parsed.comment).length;
  if (totalLength > 500) {
    return false;
  }

  // 檢查是否包含禁止詞彙
  const forbidden = [
    '新規則', '額外扣', '額外加', '我決定', '我宣布新的',
    '從現在起', '規則改變', '懲罰', '處罰'
  ];

  const fullText = (parsed.announcement + parsed.summary + parsed.comment).toLowerCase();
  for (const word of forbidden) {
    if (fullText.includes(word)) {
      return false;
    }
  }

  return true;
}

/**
 * 備援旁白生成
 * 當 AI 超時或失敗時使用
 */
export function getFallbackNarration(event) {
  // 從模板生成公告
  const template = FALLBACK_TEMPLATES[event.type] || FALLBACK_TEMPLATES.DEFAULT;
  const announcement = template.replace('{title}', event.title_key);

  // 從 display_numbers 生成摘要
  const summaryLines = [];
  for (const [key, value] of Object.entries(event.display_numbers)) {
    const label = formatDisplayKey(key);
    summaryLines.push(`• ${label}：${value}`);
  }
  const summary = summaryLines.join('\n');

  // 隨機選取吐槽
  const comments = FALLBACK_COMMENTS[event.type] || FALLBACK_COMMENTS.DEFAULT;
  const comment = comments[Math.floor(Math.random() * comments.length)];

  return {
    announcement,
    summary,
    comment,
    raw: null,
    isFallback: true
  };
}

/**
 * 格式化 display_numbers 的 key
 */
function formatDisplayKey(key) {
  const keyMap = {
    'energy_delta': '能源變化',
    'research_score_mult': '研究分數倍率',
    'repair_score_mult': '修復分數倍率',
    'factory_score_mult': '工廠投資分數倍率',
    'park_score_mult': '公園投資分數倍率',
    'invest_score_mult': '投資分數倍率',
    'finance_score_mult': '金融區分數倍率',
    'observe_score_mult': '觀察分數倍率',
    'charity_score_mult': '公益分數倍率',
    'all_score_mult': '全體分數倍率',
    'all_score_bonus': '全體分數加成',
    'coin_bonus': '金幣加成',
    'coin_delta': '金幣變化',
    'all_coin_bonus': '全體金幣加成',
    'all_coin_mult': '全體金幣倍率',
    'all_coin_penalty': '全體金幣扣除',
    'all_energy_bonus': '全體能源加成',
    'all_energy_cost': '全體能源消耗',
    'all_fame_bonus': '全體民心加成',
    'all_fame_mult': '全體民心倍率',
    'high_fame_bonus': '高民心玩家加成',
    'high_fame_coin_bonus': '高民心玩家金幣加成',
    'high_fame_score_bonus': '高民心玩家分數加成',
    'high_fame_extra': '高民心玩家額外獎勵',
    'bottom_score_bonus': '後段玩家分數加成',
    'bottom_extra_coin': '後段玩家金幣加成',
    'top_score_penalty': '前段玩家分數調整',
    'repair_bonus': '修復加成',
    'repair_fame_bonus': '修復民心加成',
    'charity_fame_bonus': '公益民心加成',
    'factory_coin_delta': '工廠金幣變化',
    'factory_coin_bonus': '工廠金幣加成',
    'school_score_mult': '學校分數倍率',
    'entertainment_score_mult': '娛樂區分數倍率',
    'invest_coin_bonus': '投資金幣加成',
    'observe_fame_bonus': '觀察民心加成',
    'lucky_player_coin': '幸運玩家金幣',
    'lucky_fame_bonus': '幸運玩家民心',
    'jackpot_winner': '大獎得主'
  };

  return keyMap[key] || key.replace(/_/g, ' ');
}

export default {
  initAI,
  generateNarration,
  getFallbackNarration
};
