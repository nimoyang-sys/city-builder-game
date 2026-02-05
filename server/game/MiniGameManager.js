/**
 * 小遊戲管理器
 * 處理快問快答、喝啤酒比賽、比大小三個小遊戲
 */

import { EventEmitter } from 'events';
import { MINI_GAMES } from '../../shared/config.js';

export class MiniGameManager extends EventEmitter {
  constructor() {
    super();

    // 快問快答狀態
    this.quizState = {
      active: false,
      currentQuestion: null,
      questionIndex: 0,
      questions: [], // 隨機抽取的10題
      playerAnswers: new Map(), // playerId -> { correct, total, answers: [] }
      timer: null
    };

    // 喝啤酒比賽狀態
    this.beerState = {
      active: false,
      waiting: false, // 等待玩家加入
      participants: [], // 參與的玩家ID
      rankings: [], // 主持人設定的排名
      timer: null
    };

    // 比大小狀態
    this.pokerState = {
      active: false,        // 整個遊戲是否進行中
      roundActive: false,   // 當前局是否進行中（下注階段）
      card: null, // 1-13
      betTime: MINI_GAMES.POKER_GAME.betTime,
      playerBets: new Map(), // playerId -> { playerId, playerName, bet }
      result: null, // 'big' | 'small' | 'tie'
      winners: [],
      losers: [],
      tied: [],
      timer: null,
      endTime: null,
      roundNumber: 0       // 當前局數
    };

    // 猜歌曲前奏狀態
    this.songGuessState = {
      active: false,
      roundActive: false, // 當前局是否進行中
      currentRound: 0,
      totalRounds: 0,
      playerAnswers: new Map(), // playerId -> { playerName, answer, timestamp }
      correctAnswer: null,
      roundResults: [] // 每局的結果記錄
    };
  }

  // ========== 快問快答 ==========

  startQuiz() {
    if (this.quizState.active) {
      return { success: false, error: '快問快答已在進行中' };
    }

    // 隨機抽取10題
    const allQuestions = [...MINI_GAMES.QUIZ_QUESTIONS];
    const selected = [];
    for (let i = 0; i < 10 && allQuestions.length > 0; i++) {
      const index = Math.floor(Math.random() * allQuestions.length);
      selected.push(allQuestions.splice(index, 1)[0]);
    }

    this.quizState = {
      active: true,
      currentQuestion: null,
      questionIndex: 0,
      questions: selected,
      playerAnswers: new Map(),
      timer: null
    };

    this.emit('quiz:started', { questionCount: selected.length });

    // 開始第一題
    setTimeout(() => this.nextQuizQuestion(), 1000);

    return { success: true };
  }

  nextQuizQuestion() {
    try {
      console.log(`[Quiz] nextQuizQuestion called, questionIndex: ${this.quizState.questionIndex}, total: ${this.quizState.questions.length}, active: ${this.quizState.active}`);

      if (!this.quizState.active) {
        console.log('[Quiz] Quiz not active, returning');
        return;
      }

      if (this.quizState.questionIndex >= this.quizState.questions.length) {
        // 所有題目結束
        console.log('[Quiz] All questions completed, ending quiz');
        this.endQuiz();
        return;
      }

      const question = this.quizState.questions[this.quizState.questionIndex];
      if (!question) {
        console.error('[Quiz] Question not found at index:', this.quizState.questionIndex);
        this.endQuiz();
        return;
      }

      this.quizState.currentQuestion = question;
      this.quizState.currentQuestionAnswered = new Set(); // 記錄這題已回答的玩家

      console.log(`[Quiz] Emitting question ${this.quizState.questionIndex + 1}/${this.quizState.questions.length}`);

      this.emit('quiz:question', {
        questionIndex: this.quizState.questionIndex,
        totalQuestions: this.quizState.questions.length,
        question: question.question,
        options: question.options,
        timeLimit: 5
      });

      // 5秒後自動跳到下一題
      if (this.quizState.timer) {
        clearTimeout(this.quizState.timer);
      }

      this.quizState.timer = setTimeout(() => {
        try {
          this.quizState.questionIndex++;
          console.log(`[Quiz] Timer fired, moving to question index ${this.quizState.questionIndex}`);
          this.nextQuizQuestion();
        } catch (error) {
          console.error('[Quiz] Error in timer callback:', error);
          this.endQuiz();
        }
      }, 5000);
    } catch (error) {
      console.error('[Quiz] Error in nextQuizQuestion:', error);
      this.endQuiz();
    }
  }

  submitQuizAnswer(playerId, playerName, answerIndex) {
    console.log(`[Quiz] Player ${playerName} (${playerId}) submitting answer for question ${this.quizState.questionIndex}`);

    if (!this.quizState.active || !this.quizState.currentQuestion) {
      console.log('[Quiz] Cannot submit - quiz not active or no current question');
      return { success: false, error: '目前沒有進行中的問題' };
    }

    const question = this.quizState.currentQuestion;
    const currentQuestionIndex = this.quizState.questionIndex;
    const isCorrect = answerIndex === question.correct;

    // 記錄答案
    if (!this.quizState.playerAnswers.has(playerId)) {
      this.quizState.playerAnswers.set(playerId, {
        playerId,
        playerName,
        correct: 0,
        total: 0,
        answers: []
      });
    }

    const playerData = this.quizState.playerAnswers.get(playerId);

    // 檢查這位玩家是否已經回答過這一題（使用題目索引檢查）
    const alreadyAnswered = playerData.answers.some(ans => ans.questionIndex === currentQuestionIndex);
    if (alreadyAnswered) {
      console.log(`[Quiz] Player ${playerName} already answered question ${currentQuestionIndex}`);
      return { success: false, error: '已經回答過這題了' };
    }

    // 標記這位玩家已回答當前題目
    if (this.quizState.currentQuestionAnswered) {
      this.quizState.currentQuestionAnswered.add(playerId);
    }

    playerData.answers.push({
      questionIndex: currentQuestionIndex,
      questionId: question.id,
      answerIndex,
      isCorrect
    });
    playerData.total++;
    if (isCorrect) {
      playerData.correct++;
    }

    console.log(`[Quiz] Answer recorded - correct: ${isCorrect}, total: ${playerData.total}`);

    return { success: true, isCorrect };
  }

  endQuiz() {
    console.log('[Quiz] endQuiz called, active:', this.quizState.active);

    if (!this.quizState.active) {
      console.log('[Quiz] Quiz already ended, returning');
      return { success: false };
    }

    if (this.quizState.timer) {
      clearTimeout(this.quizState.timer);
      this.quizState.timer = null;
    }

    // 計算結果
    const results = Array.from(this.quizState.playerAnswers.values()).map(data => ({
      playerId: data.playerId,
      playerName: data.playerName,
      correct: data.correct,
      total: data.total,
      accuracy: data.total > 0 ? (data.correct / data.total * 100).toFixed(1) : '0.0',
      reward: data.correct * 50,
      answers: data.answers // 包含玩家的答案
    }));

    // 按正確率排序
    results.sort((a, b) => b.correct - a.correct);

    console.log(`[Quiz] Ending quiz with ${results.length} participants`);

    this.quizState.active = false;
    this.quizState.currentQuestion = null;

    // 發送結果，包含所有題目資訊
    console.log('[Quiz] Emitting quiz:ended event');
    this.emit('quiz:ended', {
      results,
      questions: this.quizState.questions // 包含所有題目和正確答案
    });

    return { success: true, results };
  }

  // ========== 喝啤酒比賽 ==========

  startBeerWaiting() {
    if (this.beerState.active || this.beerState.waiting) {
      return { success: false, error: '啤酒比賽已在進行中或等待中' };
    }

    this.beerState = {
      active: false,
      waiting: true,
      participants: [],
      rankings: [],
      timer: null
    };

    this.emit('beer:waitingStart');

    return { success: true };
  }

  joinBeer(playerId, playerName) {
    console.log(`[Beer] Player ${playerName} (${playerId}) attempting to join`);
    console.log(`[Beer] Current state - waiting: ${this.beerState.waiting}, participants: ${this.beerState.participants.length}`);

    if (!this.beerState.waiting) {
      console.log('[Beer] Join failed - not in waiting phase');
      return { success: false, error: '目前不在等待加入階段' };
    }

    if (this.beerState.participants.length >= MINI_GAMES.BEER_GAME.maxPlayers) {
      console.log('[Beer] Join failed - max players reached');
      return { success: false, error: '人數已滿' };
    }

    if (this.beerState.participants.some(p => p.playerId === playerId)) {
      console.log('[Beer] Join failed - player already joined');
      return { success: false, error: '已經加入了' };
    }

    this.beerState.participants.push({ playerId, playerName });
    const currentCount = this.beerState.participants.length;
    const canStart = currentCount >= MINI_GAMES.BEER_GAME.minPlayers;

    console.log(`[Beer] Player joined successfully! Total: ${currentCount}/${MINI_GAMES.BEER_GAME.maxPlayers}, canStart: ${canStart}`);
    console.log(`[Beer] Emitting beer:playerJoined event`);

    this.emit('beer:playerJoined', {
      playerId,
      playerName,
      currentCount,
      maxPlayers: MINI_GAMES.BEER_GAME.maxPlayers,
      canStart
    });

    return {
      success: true,
      canStart
    };
  }

  startBeerGame() {
    if (!this.beerState.waiting) {
      return { success: false, error: '目前不在等待階段' };
    }

    if (this.beerState.participants.length < MINI_GAMES.BEER_GAME.minPlayers) {
      return { success: false, error: `至少需要 ${MINI_GAMES.BEER_GAME.minPlayers} 人` };
    }

    this.beerState.waiting = false;
    this.beerState.active = true;

    this.emit('beer:gameStarted', {
      participants: this.beerState.participants
    });

    return { success: true };
  }

  setBeerRankings(rankings) {
    if (!this.beerState.active) {
      return { success: false, error: '啤酒比賽未開始' };
    }

    // rankings 格式: [{ playerId, rank: 1-5 }]
    this.beerState.rankings = rankings;

    // 計算獎勵
    const results = rankings.map(r => {
      const participant = this.beerState.participants.find(p => p.playerId === r.playerId);
      let reward = MINI_GAMES.BEER_GAME.rewards.others;

      if (r.rank === 1) {
        reward = MINI_GAMES.BEER_GAME.rewards.first;
      } else if (r.rank === 2) {
        reward = MINI_GAMES.BEER_GAME.rewards.second;
      }

      return {
        playerId: r.playerId,
        playerName: participant?.playerName || '未知',
        rank: r.rank,
        reward
      };
    });

    this.emit('beer:resultsSet', { results });

    return { success: true, results };
  }

  endBeerGame() {
    if (!this.beerState.active && !this.beerState.waiting) {
      return { success: false };
    }

    const results = this.beerState.rankings.map(r => {
      const participant = this.beerState.participants.find(p => p.playerId === r.playerId);
      let reward = MINI_GAMES.BEER_GAME.rewards.others;

      if (r.rank === 1) {
        reward = MINI_GAMES.BEER_GAME.rewards.first;
      } else if (r.rank === 2) {
        reward = MINI_GAMES.BEER_GAME.rewards.second;
      }

      return {
        playerId: r.playerId,
        playerName: participant?.playerName || '未知',
        rank: r.rank,
        reward
      };
    });

    this.beerState = {
      active: false,
      waiting: false,
      participants: [],
      rankings: [],
      timer: null
    };

    this.emit('beer:ended', { results });

    return { success: true, results };
  }

  // ========== 比大小 ==========

  // 開始比大小遊戲（整個遊戲，不是單局）
  startPokerGame() {
    if (this.pokerState.active) {
      return { success: false, error: '比大小遊戲已在進行中' };
    }

    this.pokerState = {
      active: true,
      roundActive: false,
      card: null,
      betTime: MINI_GAMES.POKER_GAME.betTime,
      playerBets: new Map(),
      result: null,
      winners: [],
      losers: [],
      tied: [],
      endTime: null,
      timer: null,
      roundNumber: 0
    };

    // 通知遊戲開始
    this.emit('poker:gameStarted');

    // 自動開始第一局
    return this.startPokerRound();
  }

  // 開始新的一局
  startPokerRound() {
    if (!this.pokerState.active) {
      return { success: false, error: '比大小遊戲尚未開始' };
    }

    if (this.pokerState.roundActive) {
      return { success: false, error: '當前局還在進行中' };
    }

    // 抽一張牌 (1-13)
    const card = Math.floor(Math.random() * 13) + 1;
    const endTime = Date.now() + (MINI_GAMES.POKER_GAME.betTime * 1000);

    this.pokerState.roundNumber++;
    this.pokerState.roundActive = true;
    this.pokerState.card = card;
    this.pokerState.playerBets = new Map();
    this.pokerState.result = null;
    this.pokerState.winners = [];
    this.pokerState.losers = [];
    this.pokerState.tied = [];
    this.pokerState.endTime = endTime;

    this.emit('poker:roundStarted', {
      roundNumber: this.pokerState.roundNumber,
      betTime: this.pokerState.betTime,
      endTime: this.pokerState.endTime
    });

    // 時間到自動結算
    if (this.pokerState.timer) {
      clearTimeout(this.pokerState.timer);
    }
    this.pokerState.timer = setTimeout(() => {
      this.endPokerRound();
    }, this.pokerState.betTime * 1000);

    return { success: true, roundNumber: this.pokerState.roundNumber };
  }

  placeBet(playerId, playerName, bet) {
    if (!this.pokerState.active || !this.pokerState.roundActive) {
      return { success: false, error: '目前不在下注階段' };
    }

    if (bet !== 'big' && bet !== 'small') {
      return { success: false, error: '無效的選擇' };
    }

    // 如果已經下注過，允許改變選擇
    this.pokerState.playerBets.set(playerId, { playerId, playerName, bet });

    // 發送下注事件（用於投影畫面顯示）
    this.emit('poker:betPlaced', {
      playerId,
      playerName,
      bet,
      totalBets: this.pokerState.playerBets.size
    });

    return { success: true };
  }

  // 結束當前局（結算）
  endPokerRound() {
    if (!this.pokerState.active || !this.pokerState.roundActive) {
      return { success: false, error: '沒有進行中的局' };
    }

    if (this.pokerState.timer) {
      clearTimeout(this.pokerState.timer);
      this.pokerState.timer = null;
    }

    const card = this.pokerState.card;
    // A~6 小(1-6)，7 和局(7)，8~K 大(8-13)
    let result;
    if (card >= 8) {
      result = 'big';
    } else if (card <= 6) {
      result = 'small';
    } else {
      result = 'tie'; // 7 是和局
    }

    this.pokerState.result = result;
    this.pokerState.roundActive = false; // 結束下注階段

    // 計算贏家和輸家
    const winners = [];
    const losers = [];
    const tied = []; // 和局玩家

    for (const [playerId, betData] of this.pokerState.playerBets) {
      if (result === 'tie') {
        // 和局，所有人都算平手，不加分也不喝酒
        tied.push({
          playerId: betData.playerId,
          playerName: betData.playerName,
          bet: betData.bet
        });
      } else if (betData.bet === result) {
        winners.push({
          playerId: betData.playerId,
          playerName: betData.playerName,
          bet: betData.bet,
          reward: MINI_GAMES.POKER_GAME.bigReward
        });
      } else {
        losers.push({
          playerId: betData.playerId,
          playerName: betData.playerName,
          bet: betData.bet
        });
      }
    }

    this.pokerState.winners = winners;
    this.pokerState.losers = losers;
    this.pokerState.tied = tied;

    this.emit('poker:roundEnded', {
      roundNumber: this.pokerState.roundNumber,
      card,
      result,
      winners,
      losers,
      tied
    });

    return { success: true, card, result, winners, losers, tied };
  }

  // 下一局
  nextPokerRound() {
    if (!this.pokerState.active) {
      return { success: false, error: '比大小遊戲尚未開始' };
    }

    if (this.pokerState.roundActive) {
      return { success: false, error: '當前局還在進行中' };
    }

    return this.startPokerRound();
  }

  // 結束整個比大小遊戲
  endPokerGame() {
    if (!this.pokerState.active) {
      return { success: false, error: '比大小遊戲尚未開始' };
    }

    if (this.pokerState.timer) {
      clearTimeout(this.pokerState.timer);
      this.pokerState.timer = null;
    }

    this.pokerState.active = false;
    this.pokerState.roundActive = false;

    this.emit('poker:gameEnded', {
      totalRounds: this.pokerState.roundNumber
    });

    // 重置狀態
    this.pokerState = {
      active: false,
      roundActive: false,
      card: null,
      betTime: MINI_GAMES.POKER_GAME.betTime,
      playerBets: new Map(),
      result: null,
      winners: [],
      losers: [],
      tied: [],
      timer: null,
      endTime: null,
      roundNumber: 0
    };

    return { success: true };
  }

  // ========== 狀態查詢 ==========

  getQuizState() {
    return {
      active: this.quizState.active,
      questionIndex: this.quizState.questionIndex,
      totalQuestions: this.quizState.questions.length,
      currentQuestion: this.quizState.currentQuestion ? {
        question: this.quizState.currentQuestion.question,
        options: this.quizState.currentQuestion.options
      } : null
    };
  }

  getBeerState() {
    return {
      active: this.beerState.active,
      waiting: this.beerState.waiting,
      participants: this.beerState.participants,
      participantCount: this.beerState.participants.length,
      maxPlayers: MINI_GAMES.BEER_GAME.maxPlayers,
      minPlayers: MINI_GAMES.BEER_GAME.minPlayers,
      canStart: this.beerState.participants.length >= MINI_GAMES.BEER_GAME.minPlayers
    };
  }

  getPokerState() {
    return {
      active: this.pokerState.active,
      roundActive: this.pokerState.roundActive,
      roundNumber: this.pokerState.roundNumber,
      betTime: this.pokerState.betTime,
      endTime: this.pokerState.endTime,
      result: this.pokerState.result,
      card: this.pokerState.card,
      hasResult: this.pokerState.result !== null,
      winners: this.pokerState.winners,
      losers: this.pokerState.losers,
      tied: this.pokerState.tied
    };
  }

  /**
   * 獲取當前進行中的小遊戲狀態（用於新玩家加入）
   */
  getActiveGames() {
    const activeGames = [];

    if (this.quizState.active && this.quizState.currentQuestion) {
      activeGames.push({
        type: 'quiz',
        data: {
          questionIndex: this.quizState.questionIndex,
          totalQuestions: this.quizState.questions.length,
          currentQuestion: this.quizState.currentQuestion
        }
      });
    }

    if (this.beerState.waiting) {
      activeGames.push({
        type: 'beerWaiting',
        data: {
          participants: this.beerState.participants
        }
      });
    }

    if (this.beerState.active) {
      activeGames.push({
        type: 'beerActive',
        data: {
          participants: this.beerState.participants
        }
      });
    }

    if (this.pokerState.active) {
      activeGames.push({
        type: 'poker',
        data: {
          roundActive: this.pokerState.roundActive,
          roundNumber: this.pokerState.roundNumber,
          betTime: this.pokerState.betTime,
          endTime: this.pokerState.endTime,
          hasResult: this.pokerState.result !== null,
          result: this.pokerState.result,
          card: this.pokerState.card,
          winners: this.pokerState.winners,
          losers: this.pokerState.losers,
          tied: this.pokerState.tied
        }
      });
    }

    if (this.songGuessState.active) {
      // 獲取所有玩家列表
      const allPlayers = Array.from(this.gameEngine.players.values()).map(p => ({
        id: p.id,
        name: p.name
      }));

      // 獲取已提交答案的玩家列表
      const submittedPlayers = Array.from(this.songGuessState.playerAnswers.keys());

      activeGames.push({
        type: 'songGuess',
        data: {
          roundActive: this.songGuessState.roundActive,
          currentRound: this.songGuessState.currentRound,
          allPlayers,
          submittedPlayers,
          totalSubmitted: this.songGuessState.playerAnswers.size
        }
      });
    }

    return activeGames;
  }

  // ========== 猜歌曲前奏 ==========

  startSongGuessGame() {
    if (this.songGuessState.active) {
      return { success: false, error: '猜歌遊戲已在進行中' };
    }

    this.songGuessState = {
      active: true,
      roundActive: false,
      currentRound: 0,
      totalRounds: 0,
      playerAnswers: new Map(),
      correctAnswer: null,
      roundResults: []
    };

    this.emit('songGuess:gameStarted');
    return { success: true };
  }

  startSongRound() {
    if (!this.songGuessState.active) {
      return { success: false, error: '猜歌遊戲未開始' };
    }

    if (this.songGuessState.roundActive) {
      return { success: false, error: '當前局已在進行中' };
    }

    this.songGuessState.currentRound++;
    this.songGuessState.roundActive = true;
    this.songGuessState.playerAnswers.clear();
    this.songGuessState.correctAnswer = null;

    // 獲取所有玩家列表
    const allPlayers = Array.from(this.gameEngine.players.values()).map(p => ({
      id: p.id,
      name: p.name
    }));

    this.emit('songGuess:roundStarted', {
      round: this.songGuessState.currentRound,
      allPlayers
    });

    return { success: true, round: this.songGuessState.currentRound };
  }

  submitSongAnswer(playerId, playerName, answer) {
    if (!this.songGuessState.active || !this.songGuessState.roundActive) {
      return { success: false, error: '當前沒有進行中的猜歌局' };
    }

    // 記錄玩家答案
    this.songGuessState.playerAnswers.set(playerId, {
      playerId,
      playerName,
      answer: answer.trim(),
      timestamp: Date.now()
    });

    // 通知所有人該玩家已提交答案（不透露答案內容）
    this.emit('songGuess:playerSubmitted', {
      playerId,
      playerName,
      totalSubmitted: this.songGuessState.playerAnswers.size
    });

    return { success: true };
  }

  endSongRound(correctAnswer, customAnswer = null) {
    if (!this.songGuessState.active || !this.songGuessState.roundActive) {
      return { success: false, error: '當前沒有進行中的猜歌局' };
    }

    // 如果選擇「其他」，使用自定義答案
    const finalAnswer = correctAnswer === '其他' ? customAnswer : correctAnswer;
    this.songGuessState.correctAnswer = finalAnswer;
    this.songGuessState.roundActive = false;

    // 比對答案
    const results = [];
    for (const [playerId, data] of this.songGuessState.playerAnswers) {
      const isCorrect = data.answer.toLowerCase() === finalAnswer.toLowerCase();
      results.push({
        playerId: data.playerId,
        playerName: data.playerName,
        answer: data.answer,
        isCorrect,
        reward: isCorrect ? MINI_GAMES.SONG_GUESS_GAME.correctReward : 0
      });
    }

    // 記錄這一局的結果
    this.songGuessState.roundResults.push({
      round: this.songGuessState.currentRound,
      correctAnswer: finalAnswer,
      results
    });

    this.emit('songGuess:roundEnded', {
      round: this.songGuessState.currentRound,
      correctAnswer: finalAnswer,
      results
    });

    return { success: true, results };
  }

  endSongGuessGame() {
    if (!this.songGuessState.active) {
      return { success: false, error: '猜歌遊戲未開始' };
    }

    const finalResults = {
      totalRounds: this.songGuessState.currentRound,
      roundResults: this.songGuessState.roundResults
    };

    this.songGuessState.active = false;

    this.emit('songGuess:gameEnded', finalResults);

    return { success: true, finalResults };
  }
}

export default MiniGameManager;
