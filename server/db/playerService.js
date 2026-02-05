/**
 * 玩家資料庫服務層
 */

import { PlayerModel } from './models/Player.model.js';
import { isDBConnected } from './mongodb.js';

/**
 * 儲存或更新玩家資料
 */
export async function savePlayer(playerData) {
  if (!isDBConnected()) {
    return null;
  }

  try {
    const updateData = {
      playerId: playerData.id,
      socketId: playerData.socketId,
      name: playerData.name,
      tableNumber: playerData.tableNumber,
      coins: playerData.coins,
      score: playerData.score,
      totalIncome: playerData.totalIncome,
      buildings: playerData.buildings,
      connected: playerData.connected,
      lastActiveAt: new Date(),
      role: playerData.role,
      roleId: playerData.roleId,
      lastBuiltBuilding: playerData.lastBuiltBuilding,
      achievements: playerData.achievements || [],
      achievementProgress: playerData.achievementProgress || {},
      items: playerData.items || [],
      activeEffects: playerData.activeEffects || []
    };

    // 如果有 passwordHash，也要儲存
    if (playerData.passwordHash) {
      updateData.passwordHash = playerData.passwordHash;
    }

    const result = await PlayerModel.findOneAndUpdate(
      { playerId: playerData.id },
      updateData,
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    );

    return result;
  } catch (error) {
    console.error('Error saving player:', error);
    return null;
  }
}

/**
 * 根據 playerId 取得玩家
 */
export async function getPlayerById(playerId) {
  if (!isDBConnected()) {
    return null;
  }

  try {
    const player = await PlayerModel.findOne({ playerId });
    return player;
  } catch (error) {
    console.error('Error getting player:', error);
    return null;
  }
}

/**
 * 根據名字和密碼 hash 取得玩家
 * 用於名字+密碼登入機制
 */
export async function getPlayerByNameAndPassword(name, passwordHash) {
  if (!isDBConnected()) {
    return null;
  }

  try {
    const player = await PlayerModel.findOne({ name, passwordHash });
    return player;
  } catch (error) {
    console.error('Error getting player by name and password:', error);
    return null;
  }
}

/**
 * 取得所有玩家
 */
export async function getAllPlayers() {
  if (!isDBConnected()) {
    return [];
  }

  try {
    const players = await PlayerModel.find({});
    return players;
  } catch (error) {
    console.error('Error getting all players:', error);
    return [];
  }
}

/**
 * 更新玩家連線狀態
 */
export async function updatePlayerConnection(playerId, socketId, connected) {
  if (!isDBConnected()) {
    return null;
  }

  try {
    const result = await PlayerModel.findOneAndUpdate(
      { playerId },
      {
        socketId,
        connected,
        lastActiveAt: new Date()
      },
      { new: true }
    );

    return result;
  } catch (error) {
    console.error('Error updating player connection:', error);
    return null;
  }
}

/**
 * 刪除玩家
 */
export async function deletePlayer(playerId) {
  if (!isDBConnected()) {
    return false;
  }

  try {
    await PlayerModel.deleteOne({ playerId });
    return true;
  } catch (error) {
    console.error('Error deleting player:', error);
    return false;
  }
}

/**
 * 清除所有玩家（重置遊戲時使用）
 */
export async function clearAllPlayers() {
  if (!isDBConnected()) {
    return false;
  }

  try {
    await PlayerModel.deleteMany({});
    console.log('✅ All players cleared from database');
    return true;
  } catch (error) {
    console.error('Error clearing all players:', error);
    return false;
  }
}

/**
 * 取得已連線玩家數量
 */
export async function getConnectedPlayersCount() {
  if (!isDBConnected()) {
    return 0;
  }

  try {
    const count = await PlayerModel.countDocuments({ connected: true });
    return count;
  } catch (error) {
    console.error('Error counting connected players:', error);
    return 0;
  }
}

/**
 * 批次儲存玩家（效能優化）
 */
export async function bulkSavePlayers(playersData) {
  if (!isDBConnected()) {
    return false;
  }

  try {
    const operations = playersData.map(playerData => ({
      updateOne: {
        filter: { playerId: playerData.id },
        update: {
          $set: {
            playerId: playerData.id,
            socketId: playerData.socketId,
            name: playerData.name,
            tableNumber: playerData.tableNumber,
            coins: playerData.coins,
            score: playerData.score,
            totalIncome: playerData.totalIncome,
            buildings: playerData.buildings,
            connected: playerData.connected,
            lastActiveAt: new Date(),
            role: playerData.role,
            roleId: playerData.roleId,
            lastBuiltBuilding: playerData.lastBuiltBuilding,
            achievements: playerData.achievements || [],
            achievementProgress: playerData.achievementProgress || {},
            items: playerData.items || [],
            activeEffects: playerData.activeEffects || []
          }
        },
        upsert: true
      }
    }));

    await PlayerModel.bulkWrite(operations);
    return true;
  } catch (error) {
    console.error('Error bulk saving players:', error);
    return false;
  }
}
