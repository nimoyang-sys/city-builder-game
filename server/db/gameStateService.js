/**
 * 遊戲狀態資料庫服務層
 */

import { GameStateModel } from './models/GameState.model.js';
import { isDBConnected } from './mongodb.js';

const GAME_STATE_ID = 'current_game';

/**
 * 儲存或更新遊戲狀態
 */
export async function saveGameState(gameStateData) {
  if (!isDBConnected()) {
    return null;
  }

  try {
    const result = await GameStateModel.findByIdAndUpdate(
      GAME_STATE_ID,
      {
        state: gameStateData.state,
        currentRound: gameStateData.currentRound,
        totalRounds: gameStateData.totalRounds,
        currentPhase: gameStateData.currentPhase,
        phaseStartTime: gameStateData.phaseStartTime,
        phaseDuration: gameStateData.phaseDuration,
        currentEvent: gameStateData.currentEvent,
        cityPopulation: gameStateData.cityPopulation,
        cityHappiness: gameStateData.cityHappiness,
        cityPollution: gameStateData.cityPollution,
        cityTech: gameStateData.cityTech,
        cityBuildings: gameStateData.cityBuildings,
        startedAt: gameStateData.startedAt,
        endedAt: gameStateData.endedAt,
        totalPlayers: gameStateData.totalPlayers,
        connectedPlayers: gameStateData.connectedPlayers
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    );

    return result;
  } catch (error) {
    console.error('Error saving game state:', error);
    return null;
  }
}

/**
 * 取得遊戲狀態
 */
export async function getGameState() {
  if (!isDBConnected()) {
    return null;
  }

  try {
    const gameState = await GameStateModel.findById(GAME_STATE_ID);
    return gameState;
  } catch (error) {
    console.error('Error getting game state:', error);
    return null;
  }
}

/**
 * 重置遊戲狀態
 */
export async function resetGameState() {
  if (!isDBConnected()) {
    return false;
  }

  try {
    await GameStateModel.findByIdAndUpdate(
      GAME_STATE_ID,
      {
        state: 'WAITING',
        currentRound: 0,
        totalRounds: 10,
        currentPhase: 'WAITING',
        phaseStartTime: null,
        phaseDuration: null,
        currentEvent: null,
        cityPopulation: 0,
        cityHappiness: 50,
        cityPollution: 0,
        cityTech: 0,
        cityBuildings: new Map(),
        startedAt: null,
        endedAt: null,
        totalPlayers: 0,
        connectedPlayers: 0
      },
      {
        upsert: true,
        new: true
      }
    );

    console.log('✅ Game state reset in database');
    return true;
  } catch (error) {
    console.error('Error resetting game state:', error);
    return false;
  }
}

/**
 * 刪除遊戲狀態
 */
export async function deleteGameState() {
  if (!isDBConnected()) {
    return false;
  }

  try {
    await GameStateModel.findByIdAndDelete(GAME_STATE_ID);
    console.log('✅ Game state deleted from database');
    return true;
  } catch (error) {
    console.error('Error deleting game state:', error);
    return false;
  }
}
