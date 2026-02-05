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
 * 根據名字和密碼生成唯一 playerId
 * @param {string} name - 玩家名字
 * @param {string} passwordHash - 密碼 hash
 * @returns {string} - 唯一 playerId
 */
export function generatePlayerId(name, passwordHash) {
  const combined = `${name}:${passwordHash}`;
  return crypto.createHash('sha256').update(combined).digest('hex').substring(0, 16);
}
