/**
 * 密碼加密工具
 */

import crypto from 'crypto';

/**
 * 將密碼加密為 hash
 * @param {string} password - 原始密碼
 * @returns {string} - SHA256 hash
 */
export function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * 驗證密碼
 * @param {string} password - 輸入的密碼
 * @param {string} hash - 儲存的 hash
 * @returns {boolean} - 是否匹配
 */
export function verifyPassword(password, hash) {
  const inputHash = hashPassword(password);
  return inputHash === hash;
}

/**
 * 標準化名字（統一小寫、去空白）
 * @param {string} name - 玩家名字
 * @returns {string} - 標準化後的名字
 */
export function normalizeName(name) {
  return name.trim().toLowerCase();
}

/**
 * 根據名字和密碼生成唯一 playerId
 * @param {string} name - 玩家名字
 * @param {string} passwordHash - 密碼 hash
 * @returns {string} - 唯一 playerId
 */
export function generatePlayerId(name, passwordHash) {
  // 將名字標準化為小寫，確保 "Nimo" 和 "nimo" 是同一個人
  const normalizedName = normalizeName(name);
  const combined = `${normalizedName}:${passwordHash}`;
  return crypto.createHash('sha256').update(combined).digest('hex').substring(0, 16);
}
