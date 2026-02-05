/**
 * 城市系統
 * 管理城市整體狀態與目標達成
 */

import { GAME_CONFIG } from '../../shared/config.js';

export class City {
  constructor() {
    // 城市基礎狀態
    this.population = GAME_CONFIG.city.initial.population;
    this.pollution = GAME_CONFIG.city.initial.pollution;
    this.happiness = GAME_CONFIG.city.initial.happiness;
    this.economy = GAME_CONFIG.city.initial.economy;
    this.technology = GAME_CONFIG.city.initial.technology;

    // 建築計數
    this.buildings = {
      FACTORY: 0,
      SCHOOL: 0,
      PARK: 0,
      FINANCE: 0,
      ENTERTAINMENT: 0
    };

    // 已達成的里程碑
    this.achievedMilestones = [];

    // 歷史記錄
    this.history = [];
  }

  /**
   * 更新城市狀態（每回合結束時）
   * @param {object} roundStats - 本回合統計
   */
  updateFromRound(roundStats) {
    const {
      totalInvestors,
      buildingChoices,
      totalRepairers,
      totalResearchers,
      totalCharityWorkers,
      totalParticipants
    } = roundStats;

    // 根據投資選擇增加建築
    for (const [building, count] of Object.entries(buildingChoices)) {
      this.buildings[building] = (this.buildings[building] || 0) + count;
    }

    // 更新城市狀態
    // 人口：基礎增長 + 建築加成
    const populationGrowth = 50 +
      (this.buildings.FACTORY * 20) +
      (this.buildings.ENTERTAINMENT * 30) +
      (this.buildings.SCHOOL * 10);
    this.population += populationGrowth;

    // 污染：工廠增加，公園減少
    this.pollution = Math.max(0, Math.min(100,
      this.pollution +
      (buildingChoices.FACTORY || 0) * 5 -
      (buildingChoices.PARK || 0) * 3 -
      totalRepairers * 2
    ));

    // 快樂度：娛樂、公園、公益增加
    this.happiness = Math.max(0, Math.min(100,
      this.happiness +
      (buildingChoices.ENTERTAINMENT || 0) * 3 +
      (buildingChoices.PARK || 0) * 2 +
      totalCharityWorkers * 1 -
      Math.floor(this.pollution / 20)
    ));

    // 經濟：工廠、金融增加
    this.economy = Math.max(0, Math.min(100,
      this.economy +
      (buildingChoices.FACTORY || 0) * 2 +
      (buildingChoices.FINANCE || 0) * 4 -
      Math.floor(this.pollution / 25)
    ));

    // 科技：學校、研究增加
    this.technology += (buildingChoices.SCHOOL || 0) * 3 + totalResearchers * 2;

    // 記錄歷史
    this.history.push({
      population: this.population,
      pollution: this.pollution,
      happiness: this.happiness,
      economy: this.economy,
      technology: this.technology,
      buildings: { ...this.buildings }
    });

    // 檢查里程碑
    return this.checkMilestones();
  }

  /**
   * 檢查並返回新達成的里程碑
   */
  checkMilestones() {
    const newMilestones = [];
    const thresholds = GAME_CONFIG.city.thresholds;

    // 人口里程碑
    if (this.population >= thresholds.population.target &&
        !this.achievedMilestones.includes('population')) {
      this.achievedMilestones.push('population');
      newMilestones.push({
        type: 'population',
        title: `人口突破 ${thresholds.population.target}！`,
        bonus: thresholds.population.bonus
      });
    }

    // 快樂度里程碑
    if (this.happiness >= thresholds.happiness.target &&
        !this.achievedMilestones.includes('happiness')) {
      this.achievedMilestones.push('happiness');
      newMilestones.push({
        type: 'happiness',
        title: `快樂度達到 ${thresholds.happiness.target}！`,
        bonus: thresholds.happiness.bonus
      });
    }

    // 科技里程碑
    if (this.technology >= thresholds.technology.target &&
        !this.achievedMilestones.includes('technology')) {
      this.achievedMilestones.push('technology');
      newMilestones.push({
        type: 'technology',
        title: `科技值達到 ${thresholds.technology.target}！`,
        bonus: thresholds.technology.bonus
      });
    }

    return newMilestones;
  }

  /**
   * 應用事件對城市的影響
   */
  applyEvent(event) {
    // 災難事件增加污染
    if (event.type === 'DISASTER') {
      this.pollution = Math.min(100, this.pollution + event.severity * 5);
      this.happiness = Math.max(0, this.happiness - event.severity * 3);
    }

    // 經濟事件影響經濟指數
    if (event.type === 'ECONOMY') {
      if (event.title_key.includes('起飛') || event.title_key.includes('協定')) {
        this.economy = Math.min(100, this.economy + 10);
      } else if (event.title_key.includes('衰退') || event.title_key.includes('膨脹')) {
        this.economy = Math.max(0, this.economy - 10);
      }
    }

    // 科技事件增加科技值
    if (event.type === 'TECH') {
      this.technology += 5;
    }

    // 福利事件增加快樂度
    if (event.type === 'WELFARE') {
      this.happiness = Math.min(100, this.happiness + 5);
    }
  }

  /**
   * 取得城市狀態摘要（給 AI 用）
   */
  getStateSummary() {
    const status = [];

    // 人口狀態
    if (this.population < 2000) {
      status.push('城市還在起步階段');
    } else if (this.population < 4000) {
      status.push('城市正在穩定發展');
    } else {
      status.push('城市已經相當繁榮');
    }

    // 污染狀態
    if (this.pollution > 70) {
      status.push('空氣品質堪憂');
    } else if (this.pollution > 40) {
      status.push('有些許污染');
    }

    // 快樂度
    if (this.happiness > 70) {
      status.push('市民普遍滿意');
    } else if (this.happiness < 30) {
      status.push('民怨四起');
    }

    // 經濟
    if (this.economy > 70) {
      status.push('經濟蓬勃');
    } else if (this.economy < 30) {
      status.push('經濟低迷');
    }

    return status.join('，') || '一切如常';
  }

  /**
   * 取得城市狀態（用於前端顯示）
   */
  getState() {
    return {
      population: this.population,
      pollution: this.pollution,
      happiness: this.happiness,
      economy: this.economy,
      technology: this.technology,
      buildings: { ...this.buildings },
      achievedMilestones: [...this.achievedMilestones]
    };
  }
}

export default City;
