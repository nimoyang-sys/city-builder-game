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
      active: false,
      card: null, // 1-13
      betTime: MINI_GAMES.POKER_GAME.betTime,
      playerBets: new Map(), // playerId -> 'big' | 'small'
      result: null, // 'big' | 'small'
      winners: [],
      losers: [],
      timer: null,
      endTime: null
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
    if (!this.quizState.active) return;

    if (this.quizState.questionIndex >= this.quizState.questions.length) {
      // 所有題目結束
      this.endQuiz();
      return;
    }

    const question = this.quizState.questions[this.quizState.questionIndex];
    this.quizState.currentQuestion = question;
    this.quizState.currentQuestionAnswered = new Set(); // 記錄這題已回答的玩家

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
      this.quizState.questionIndex++;
      this.nextQuizQuestion();
    }, 5000);
  }

  submitQuizAnswer(playerId, playerName, answerIndex) {
    if (!this.quizState.active || !this.quizState.currentQuestion) {
      return { success: false, error: '目前沒有進行中的問題' };
    }

    const question = this.quizState.currentQuestion;
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

    // 檢查是否已經回答過這題（使用當前題目的 Set 追蹤）
    if (this.quizState.currentQuestionAnswered && this.quizState.currentQuestionAnswered.has(playerId)) {
      return { success: false, error: '已經回答過這題了' };
    }

    // 標記這位玩家已回答當前題目
    if (this.quizState.currentQuestionAnswered) {
      this.quizState.currentQuestionAnswered.add(playerId);
    }

    playerData.answers.push({
      questionIndex: this.quizState.questionIndex,
      questionId: question.id,
      answerIndex,
      isCorrect
    });
    playerData.total++;
    if (isCorrect) {
      playerData.correct++;
    }

    return { success: true, isCorrect };
  }

  endQuiz() {
    if (!this.quizState.active) return { success: false };

    if (this.quizState.timer) {
      clearTimeout(this.quizState.timer);
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

    this.quizState.active = false;

    // 發送結果，包含所有題目資訊
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
    if (!this.beerState.waiting) {
      return { success: false, error: '目前不在等待加入階段' };
    }

    if (this.beerState.participants.length >= MINI_GAMES.BEER_GAME.maxPlayers) {
      return { success: false, error: '人數已滿' };
    }

    if (this.beerState.participants.some(p => p.playerId === playerId)) {
      return { success: false, error: '已經加入了' };
    }

    this.beerState.participants.push({ playerId, playerName });

    this.emit('beer:playerJoined', {
      playerId,
      playerName,
      currentCount: this.beerState.participants.length,
      maxPlayers: MINI_GAMES.BEER_GAME.maxPlayers,
      canStart: this.beerState.participants.length >= MINI_GAMES.BEER_GAME.minPlayers
    });

    return {
      success: true,
      canStart: this.beerState.participants.length >= MINI_GAMES.BEER_GAME.minPlayers
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

  startPokerGame() {
    if (this.pokerState.active) {
      return { success: false, error: '比大小遊戲已在進行中' };
    }

    // 抽一張牌 (1-13)
    const card = Math.floor(Math.random() * 13) + 1;
    const endTime = Date.now() + (MINI_GAMES.POKER_GAME.betTime * 1000);

    this.pokerState = {
      active: true,
      card,
      betTime: MINI_GAMES.POKER_GAME.betTime,
      playerBets: new Map(),
      result: null,
      winners: [],
      losers: [],
      endTime,
      timer: null
    };

    this.emit('poker:started', {
      betTime: this.pokerState.betTime,
      endTime: this.pokerState.endTime
    });

    // 時間到自動結算
    this.pokerState.timer = setTimeout(() => {
      this.endPokerGame();
    }, this.pokerState.betTime * 1000);

    return { success: true };
  }

  placeBet(playerId, playerName, bet) {
    if (!this.pokerState.active) {
      return { success: false, error: '比大小遊戲未開始' };
    }

    if (bet !== 'big' && bet !== 'small') {
      return { success: false, error: '無效的選擇' };
    }

    this.pokerState.playerBets.set(playerId, { playerId, playerName, bet });

    return { success: true };
  }

  endPokerGame() {
    if (!this.pokerState.active) {
      return { success: false };
    }

    if (this.pokerState.timer) {
      clearTimeout(this.pokerState.timer);
    }

    const card = this.pokerState.card;
    const result = card >= 7 ? 'big' : 'small'; // 7以上是大，6以下是小

    this.pokerState.result = result;

    // 計算贏家和輸家
    const winners = [];
    const losers = [];

    for (const [playerId, betData] of this.pokerState.playerBets) {
      if (betData.bet === result) {
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

    this.emit('poker:ended', {
      card,
      result,
      winners,
      losers
    });

    return { success: true, card, result, winners, losers };
  }

  nextPokerRound() {
    this.pokerState = {
      active: false,
      card: null,
      betTime: MINI_GAMES.POKER_GAME.betTime,
      playerBets: new Map(),
      result: null,
      winners: [],
      losers: [],
      timer: null,
      endTime: null
    };

    this.emit('poker:roundEnd');

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
      betTime: this.pokerState.betTime,
      endTime: this.pokerState.endTime,
      result: this.pokerState.result,
      card: this.pokerState.card,
      hasResult: this.pokerState.result !== null
    };
  }
}

export default MiniGameManager;
