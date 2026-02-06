/**
 * AI是真是假 遊戲紀錄 Model
 * 儲存每場遊戲的完整紀錄
 */

export class AIGameResult {
  constructor() {
    this.id = Date.now().toString(36) + Math.random().toString(36).substr(2);
    this.gameName = 'aiGame';
    this.startedAt = new Date();
    this.endedAt = null;
    this.rounds = [];           // 每題紀錄
    this.finalSurvivors = [];   // 最終存活玩家
  }

  /**
   * 記錄一題的結果
   */
  addRoundResult(questionIndex, correctPlayers, eliminatedPlayers, revivedPlayers = []) {
    this.rounds.push({
      questionIndex,
      correctPlayers: correctPlayers.map(p => ({ playerId: p.playerId, playerName: p.playerName })),
      eliminatedPlayers: eliminatedPlayers.map(p => ({ playerId: p.playerId, playerName: p.playerName })),
      revivedPlayers: revivedPlayers.map(p => ({ playerId: p.playerId, playerName: p.playerName })),
      timestamp: new Date()
    });
  }

  /**
   * 設定最終存活玩家
   */
  setFinalSurvivors(survivors) {
    this.finalSurvivors = survivors.map(p => ({ playerId: p.playerId, playerName: p.playerName }));
  }

  /**
   * 結束遊戲
   */
  endGame() {
    this.endedAt = new Date();
  }

  /**
   * 取得遊戲紀錄
   */
  toJSON() {
    return {
      id: this.id,
      gameName: this.gameName,
      startedAt: this.startedAt,
      endedAt: this.endedAt,
      rounds: this.rounds,
      finalSurvivors: this.finalSurvivors
    };
  }
}

export default AIGameResult;
