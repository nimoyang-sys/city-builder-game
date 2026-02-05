/**
 * 玩家端 JavaScript
 * 創智動能 2026 城市建設 - 尾牙互動遊戲
 */

// 遊戲設定（從伺服器取得）
let gameConfig = null;

// Socket 連線
let socket = null;

// 玩家狀態
let playerState = {
  id: null,
  name: null,
  coins: 500,
  score: 0,
  buildings: {},
  totalIncome: 0,
  role: null,
  achievements: [],
  items: [],
  activeEffects: []
};

// 遊戲狀態
let gameState = {
  state: 'WAITING',
  playerCount: 0,
  leaderboard: []
};

// 目前選擇的建築（待購買）
let selectedBuildingId = null;

// 目前選擇的分類
let selectedCategory = 'all';

// ===== 初始化 =====

document.addEventListener('DOMContentLoaded', async () => {
  // 取得遊戲設定
  try {
    const response = await fetch('/api/config');
    gameConfig = await response.json();
    renderCategoryTabs();
    renderBuildingCards();
  } catch (error) {
    console.error('Failed to load config:', error);
  }

  // 建立 Socket 連線
  initSocket();

  // 綁定事件
  bindEvents();
});

// ===== Socket 連線 =====

function initSocket() {
  socket = io();

  socket.on('connect', () => {
    console.log('Connected to server');
    hideLoading();

    // 檢查是否有儲存的玩家資料
    const savedPlayerId = localStorage.getItem('playerId');
    const savedPlayerName = localStorage.getItem('playerName');
    if (savedPlayerId && savedPlayerName) {
      console.log('Attempting to reconnect as:', savedPlayerName);
      socket.emit('player:reconnect', { playerId: savedPlayerId });
    } else {
      showJoinScreen();
    }
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from server');
    showLoading('連線中斷，重新連線中...');
  });

  // 玩家事件
  socket.on('player:joined', handlePlayerJoined);
  socket.on('player:reconnected', handlePlayerJoined);
  socket.on('player:notFound', () => {
    localStorage.removeItem('playerId');
    localStorage.removeItem('playerName');
    showJoinScreen();
  });
  socket.on('player:buyResult', handleBuyResult);
  socket.on('player:stateUpdate', handlePlayerStateUpdate);

  // 遊戲事件
  socket.on('game:started', handleGameStarted);
  socket.on('game:buildingPhase', handleBuildingPhase);
  socket.on('game:eventTriggered', handleEventTriggered);
  socket.on('game:ended', handleGameEnded);
  socket.on('game:playerJoined', handleOtherPlayerJoined);
  socket.on('game:playerLeft', handlePlayerLeft);
  socket.on('game:reset', handleGameReset);
  socket.on('game:buildingPurchased', handleBuildingPurchased);
  socket.on('game:scoreAdded', handleScoreAdded);

  // 角色事件
  socket.on('player:roleAssigned', handleRoleAssigned);
  socket.on('game:rolesAssigned', handleRolesAssigned);

  // 成就事件
  socket.on('player:achievementUnlocked', handleAchievementUnlocked);
  socket.on('player:achievements', handleAchievementsList);
  socket.on('game:achievementUnlocked', handleGlobalAchievement);

  // 道具事件
  socket.on('player:buyItemResult', handleBuyItemResult);
  socket.on('player:useItemResult', handleUseItemResult);
  socket.on('player:items', handleItemsList);
  socket.on('player:itemDropped', handleItemDropped);
  socket.on('player:itemReceived', handleItemReceived);

  // 小事件
  socket.on('player:miniEvent', handleMiniEvent);

  // 建築升級
  socket.on('player:upgradeable', handleUpgradeableBuildings);
  socket.on('player:upgradeResult', handleUpgradeResult);

  // 限時搶購
  socket.on('player:flashSaleStatus', handleFlashSaleStatus);
  socket.on('player:flashSaleResult', handleFlashSaleResult);
  socket.on('game:flashSaleStarted', handleFlashSaleStarted);
  socket.on('game:flashSalePurchased', handleFlashSalePurchased);
  socket.on('game:flashSaleEnded', handleFlashSaleEnded);
}

// ===== 事件處理 =====

function handlePlayerJoined(data) {
  playerState = {
    id: data.player.id,
    name: data.player.name,
    coins: data.player.coins,
    score: data.player.score,
    buildings: data.player.buildings || {},
    totalIncome: data.player.totalIncome || 0,
    role: data.player.role || null,
    roleId: data.player.roleId || null,
    items: data.player.items || [],
    achievements: data.player.achievements || [],
    achievementProgress: data.player.achievementProgress || {},
    activeEffects: data.player.activeEffects || []
  };

  gameState = data.gameState;

  // 儲存玩家資訊到 localStorage
  localStorage.setItem('playerId', playerState.id);
  localStorage.setItem('playerName', playerState.name);

  updateResourceDisplay();
  updatePlayerNameDisplay();
  updateGameStateDisplay();
  updateMyBuildings();
  updateRoleDisplay();
  updateItemsDisplay();
  updateAchievementsDisplay();
  showGameScreen();

  if (gameState.state === 'WAITING') {
    showWaitingScreen();
  } else if (gameState.state === 'ENDED') {
    showResultScreen(gameState);
  } else {
    showGameContent();
  }

  // 更新排行榜
  if (gameState.leaderboard) {
    updateLeaderboard(gameState.leaderboard);
  }
}

function handleBuyResult(result) {
  closeBuyModal();

  if (result.success) {
    // 更新本地狀態
    playerState.coins = result.remainingCoins;

    const building = result.building;
    playerState.buildings[building.id] = (playerState.buildings[building.id] || 0) + 1;

    updateResourceDisplay();
    updateMyBuildings();
    updateBuildingCards();

    // 顯示折扣資訊
    let message = `成功建造 ${building.emoji} ${building.name}！`;
    if (result.discount > 0 && result.discountReason) {
      const discountPercent = Math.round(result.discount * 100);
      message = `${result.discountReason} ${building.emoji} ${building.name} 省了 ${discountPercent}%！(${result.actualCost} 金幣)`;
    }
    showToast(message, 'success');

    // 顯示道具掉落
    if (result.droppedItem) {
      setTimeout(() => {
        showItemDropPopup(result.droppedItem);
      }, 500);
    }

    // 顯示小事件
    if (result.miniEvent) {
      setTimeout(() => {
        showMiniEventPopup(result.miniEvent.event, result.miniEvent.effectResult);
      }, result.droppedItem ? 3000 : 500);
    }
  } else {
    showToast(result.error, 'error');
  }
}

function handlePlayerStateUpdate(state) {
  // 可能只是部分更新
  if (state.coins !== undefined) playerState.coins = state.coins;
  if (state.score !== undefined) playerState.score = state.score;
  if (state.buildings !== undefined) playerState.buildings = state.buildings;
  if (state.totalIncome !== undefined) playerState.totalIncome = state.totalIncome;
  if (state.role !== undefined) playerState.role = state.role;
  if (state.roleId !== undefined) playerState.roleId = state.roleId;
  if (state.items !== undefined) playerState.items = state.items;
  if (state.achievements !== undefined) playerState.achievements = state.achievements;
  if (state.achievementProgress !== undefined) playerState.achievementProgress = state.achievementProgress;
  if (state.activeEffects !== undefined) playerState.activeEffects = state.activeEffects;

  updateResourceDisplay();
  updateMyBuildings();
  updateBuildingCards();
  updateRoleDisplay();
  updateItemsDisplay();
  updateAchievementsDisplay();
}

function handleRoleAssigned(data) {
  playerState.role = data.role;
  updateRoleDisplay();
  showToast(`你的角色是 ${data.role.emoji} ${data.role.name}！`, 'success');
}

function handleRolesAssigned(data) {
  // 全場角色分配完成，更新排行榜
  showToast('角色分配完成！', 'info');
}

// 成就解鎖處理
function handleAchievementUnlocked(data) {
  const achievement = data.achievement;
  playerState.achievements.push(achievement.id);

  // 顯示成就解鎖動畫
  showAchievementPopup(achievement, data.isGlobalFirst);

  // 播放音效（如果有）
  // playSound('achievement');
}

function handleAchievementsList(data) {
  // 收到完整成就列表（用於顯示成就頁面）
  console.log('Received achievements:', data);
  if (data && data.achievements) {
    renderAchievementsModal(data.achievements);
  } else {
    console.error('No achievements data received');
  }
}

function handleGlobalAchievement(data) {
  // 其他玩家解鎖全場唯一成就
  if (data.playerId !== playerState.id && data.isGlobalFirst) {
    showToast(`${data.playerName} 獲得了 ${data.achievement.emoji} ${data.achievement.name}！`, 'info');
  }
}

// 道具處理
function handleBuyItemResult(result) {
  closeItemShopModal();

  if (result.success) {
    playerState.coins = result.remainingCoins;
    playerState.items.push(result.item.id);
    updateResourceDisplay();
    showToast(`購買了 ${result.item.emoji} ${result.item.name}！`, 'success');
  } else {
    showToast(result.error, 'error');
  }
}

function handleUseItemResult(result) {
  if (result.success) {
    showToast(result.message, 'success');
    // 請求更新玩家狀態
    socket.emit('player:getState');
  } else {
    showToast(result.error, 'error');
  }
}

function handleItemsList(data) {
  playerState.items = data.items;
  playerState.activeEffects = data.activeEffects;
  renderItemsModal();
}

function handleItemDropped(data) {
  playerState.items.push(data.item.id);
  showItemDropPopup(data.item);
}

function handleItemReceived(data) {
  playerState.items.push(data.item.id);
  showToast(`獲得道具 ${data.item.emoji} ${data.item.name}！(${data.reason})`, 'success');
}

// 小事件處理
function handleMiniEvent(data) {
  showMiniEventPopup(data.event, data.effectResult);
}

// 建築升級處理
function handleUpgradeableBuildings(data) {
  renderUpgradeModal(data.upgradeable);
}

function handleUpgradeResult(result) {
  closeUpgradeModal();

  if (result.success) {
    playerState.score = result.newScore;
    updateResourceDisplay();
    updateMyBuildings();
    updateBuildingCards();

    showToast(`成功升級！${result.fromBuilding.emoji} x3 → ${result.toBuilding.emoji} +${result.bonusScore}分`, 'success');

    // 顯示升級動畫
    showUpgradeAnimation(result.fromBuilding, result.toBuilding, result.bonusScore);
  } else {
    showToast(result.error, 'error');
  }
}

// 限時搶購處理
let flashSaleTimer = null;

function handleFlashSaleStatus(data) {
  if (data.active) {
    showFlashSaleBanner(data);
  } else {
    hideFlashSaleBanner();
  }
}

function handleFlashSaleStarted(data) {
  showFlashSaleBanner(data);
  showToast(`⚡ 限時搶購開始！${data.building.emoji} ${data.building.name} 只要 ${data.salePrice} 金幣！`, 'success');
}

function handleFlashSalePurchased(data) {
  // 更新剩餘數量
  updateFlashSaleRemaining(data.remaining);

  // 如果售罄，隱藏彈窗
  if (data.remaining <= 0) {
    setTimeout(() => {
      hideFlashSaleBanner();
      showToast('限時搶購已售罄！', 'info');
    }, 1000);
  } else if (data.playerId !== playerState.id) {
    showToast(`${data.playerName} 搶購成功！剩餘 ${data.remaining} 個`, 'info');
  }
}

function handleFlashSaleEnded(data) {
  hideFlashSaleBanner();
  if (data) {
    showToast(`限時搶購結束！共售出 ${data.totalSold}/${data.totalQuantity} 個`, 'info');
  }
}

function handleFlashSaleResult(result) {
  if (result.success) {
    showToast(`搶購成功！${result.building.emoji} ${result.building.name} 省了 ${result.savedAmount} 金幣！`, 'success');
    // 搶購成功後立即隱藏彈窗
    hideFlashSaleBanner();
  } else {
    showToast(result.error, 'error');
  }
}

function handleGameStarted(data) {
  gameState.state = 'BUILDING';
  gameState.playerCount = data.playerCount;

  updateGameStateDisplay();
  showGameContent();
  showToast('遊戲開始！開始建設你的城市吧！', 'success');
}

function handleBuildingPhase(data) {
  gameState.state = 'BUILDING';
  updateGameStateDisplay();
  hideEventDisplay();
  showToast('建設階段開始！', 'info');
}

function handleEventTriggered(data) {
  gameState.state = 'EVENT';
  updateGameStateDisplay();

  // 顯示事件
  showEventDisplay(data.event, data.results);

  // 更新排行榜
  if (data.leaderboard) {
    updateLeaderboard(data.leaderboard);
  }
}

function handleGameEnded(data) {
  gameState.state = 'ENDED';
  updateGameStateDisplay();
  showResultScreen(data);
  showToast('遊戲結束！', 'info');
}

function handleOtherPlayerJoined(player) {
  gameState.playerCount = (gameState.playerCount || 0) + 1;
  updatePlayerCount();
}

function handlePlayerLeft(data) {
  // 玩家離開
}

function handleGameReset() {
  // 遊戲重置
  localStorage.removeItem('playerId');
  localStorage.removeItem('playerName');
  location.reload();
}

function handleBuildingPurchased(data) {
  // 其他玩家建造了建築（可選擇是否顯示）
}

function handleScoreAdded(data) {
  // 如果是自己獲得分數
  if (data.playerId === playerState.id) {
    playerState.score = data.newScore;
    playerState.coins = data.newCoins;
    updateResourceDisplay();
    showToast(`獲得 +${data.amount} 分！（${data.reason}）`, 'success');
  }
}

// ===== UI 更新 =====

function updateResourceDisplay() {
  document.getElementById('res-coins').textContent = playerState.coins;
  document.getElementById('res-score').textContent = playerState.score;
}

function updatePlayerNameDisplay() {
  document.getElementById('player-name-display').textContent = playerState.name || '玩家';
}

function updateRoleDisplay() {
  const roleContainer = document.getElementById('role-display');
  if (!roleContainer) return;

  if (playerState.role) {
    roleContainer.innerHTML = `
      <div class="role-badge" style="background-color: ${playerState.role.color}20; border-color: ${playerState.role.color}">
        <span class="role-emoji">${playerState.role.emoji}</span>
        <span class="role-name">${playerState.role.name}</span>
      </div>
      <div class="role-skill">${playerState.role.description}</div>
    `;
    roleContainer.style.display = 'block';
  } else {
    roleContainer.style.display = 'none';
  }
}

function updateGameStateDisplay() {
  const stateEl = document.getElementById('game-state');
  const stateNames = {
    'WAITING': '等待開始',
    'BUILDING': '建設中',
    'EVENT': '事件結算',
    'ENDED': '遊戲結束'
  };

  stateEl.textContent = stateNames[gameState.state] || gameState.state;
  stateEl.className = `game-state ${gameState.state}`;
}

function updatePlayerCount() {
  fetch('/api/game/state')
    .then(res => res.json())
    .then(data => {
      document.getElementById('player-count').textContent = data.playerCount || 0;
    })
    .catch(() => {});
}

function renderCategoryTabs() {
  if (!gameConfig || !gameConfig.categories) return;

  const container = document.getElementById('category-tabs');
  container.innerHTML = '';

  // 全部標籤
  const allTab = document.createElement('div');
  allTab.className = 'category-tab active';
  allTab.dataset.category = 'all';
  allTab.textContent = '全部';
  allTab.addEventListener('click', () => selectCategory('all'));
  container.appendChild(allTab);

  // 各分類標籤
  for (const [id, category] of Object.entries(gameConfig.categories)) {
    const tab = document.createElement('div');
    tab.className = 'category-tab';
    tab.dataset.category = id;
    tab.textContent = `${category.emoji} ${category.name}`;
    tab.addEventListener('click', () => selectCategory(id));
    container.appendChild(tab);
  }
}

function selectCategory(categoryId) {
  selectedCategory = categoryId;

  // 更新標籤樣式
  document.querySelectorAll('.category-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.category === categoryId);
  });

  // 重新渲染建築
  renderBuildingCards();
}

function renderBuildingCards() {
  if (!gameConfig || !gameConfig.buildings) return;

  const grid = document.getElementById('building-grid');
  grid.innerHTML = '';

  for (const [id, building] of Object.entries(gameConfig.buildings)) {
    // 過濾分類
    if (selectedCategory !== 'all' && building.category !== selectedCategory) {
      continue;
    }

    const canAfford = playerState.coins >= building.cost;
    const category = gameConfig.categories[building.category];

    const card = document.createElement('div');
    card.className = `building-card ${canAfford ? '' : 'disabled'}`;
    card.dataset.buildingId = id;
    card.innerHTML = `
      <div class="building-header">
        <div class="building-emoji">${building.emoji}</div>
        <div class="building-info">
          <div class="building-name">${building.name}</div>
          <div class="building-category">${category ? category.name : ''}</div>
        </div>
      </div>
      <div class="building-stats">
        <span class="building-cost">💰 ${building.cost} 金幣</span>
        <span class="building-income" style="color: #4FC3F7;">📈 每回合 +${building.income}</span>
      </div>
    `;

    if (canAfford) {
      card.addEventListener('click', () => openBuyModal(id));
    }

    grid.appendChild(card);
  }
}

function updateBuildingCards() {
  // 更新是否能負擔
  document.querySelectorAll('.building-card').forEach(card => {
    const buildingId = card.dataset.buildingId;
    const building = gameConfig.buildings[buildingId];
    if (building) {
      const canAfford = playerState.coins >= building.cost;
      card.classList.toggle('disabled', !canAfford);
    }
  });
}

function updateMyBuildings() {
  const container = document.getElementById('my-buildings-grid');

  const buildingEntries = Object.entries(playerState.buildings || {}).filter(([_, count]) => count > 0);

  if (buildingEntries.length === 0) {
    container.innerHTML = '<div class="no-buildings">尚未建造任何建築</div>';
    return;
  }

  container.innerHTML = buildingEntries.map(([buildingId, count]) => {
    const building = gameConfig.buildings[buildingId];
    if (!building) return '';
    return `
      <div class="my-building-item">
        <span>${building.emoji}</span>
        <span>${building.name}</span>
        <span class="my-building-count">${count}</span>
      </div>
    `;
  }).join('');
}

function updateLeaderboard(leaderboard) {
  const list = document.getElementById('leaderboard-list');
  list.innerHTML = '';

  leaderboard.slice(0, 10).forEach((player, index) => {
    const item = document.createElement('li');
    const isMe = player.id === playerState.id;

    const rankClass = index < 3 ? `top-${index + 1}` : '';

    item.className = `leaderboard-item ${isMe ? 'is-me' : ''}`;
    item.innerHTML = `
      <span class="leaderboard-rank ${rankClass}">${index + 1}</span>
      <span class="leaderboard-name">${player.name}${isMe ? ' (你)' : ''}</span>
      <div class="leaderboard-info">
        <span class="leaderboard-buildings">🏠 ${player.buildingCount || 0}</span>
        <span class="leaderboard-score">${player.score} 分</span>
      </div>
    `;

    list.appendChild(item);
  });
}

// ===== 事件顯示 =====

function showEventDisplay(event, results) {
  const display = document.getElementById('event-display');

  document.getElementById('event-emoji').textContent = event.emoji || '📢';
  document.getElementById('event-title').textContent = event.title;
  document.getElementById('event-description').textContent = event.description;

  // 顯示效果標籤（營收會同時加金幣和貢獻分）
  const effectsContainer = document.getElementById('event-effects');
  if (event.display) {
    effectsContainer.innerHTML = `
      <span class="effect-tag ${event.display.mood === 'positive' ? 'positive' : 'negative'}">
        ${event.display.affected}
      </span>
      <div class="effect-hint">營收 = 金幣 + 貢獻分</div>
    `;
  } else {
    effectsContainer.innerHTML = '';
  }

  // 找到自己的結果
  const myResult = results.find(r => r.playerId === playerState.id);
  if (myResult) {
    document.getElementById('income-amount').textContent = `+${myResult.income}`;
    document.getElementById('income-result').style.display = 'block';
  } else {
    document.getElementById('income-result').style.display = 'none';
  }

  display.classList.add('show');

  // 5秒後自動隱藏事件，玩家也可以點擊關閉
  setTimeout(() => {
    hideEventDisplay();
  }, 5000);
}

function hideEventDisplay() {
  document.getElementById('event-display').classList.remove('show');
}

// 讓關閉事件函數可以在 HTML 中被調用
window.hideEventDisplay = hideEventDisplay;

// ===== 購買彈窗 =====

function openBuyModal(buildingId) {
  // 只有遊戲結束時不能建造，其他時間（包括事件中）都可以
  if (gameState.state === 'ENDED') {
    showToast('遊戲已結束', 'error');
    return;
  }

  const building = gameConfig.buildings[buildingId];
  if (!building) return;

  if (playerState.coins < building.cost) {
    showToast('金幣不足！', 'error');
    return;
  }

  selectedBuildingId = buildingId;

  document.getElementById('modal-emoji').textContent = building.emoji;
  document.getElementById('modal-title').textContent = `建造 ${building.name}`;
  document.getElementById('modal-cost').textContent = `💰 ${building.cost}`;
  document.getElementById('modal-income').textContent = `+${building.income}`;
  document.getElementById('modal-remaining').textContent = `💰 ${playerState.coins - building.cost}`;

  document.getElementById('buy-modal').classList.add('show');
}

function closeBuyModal() {
  document.getElementById('buy-modal').classList.remove('show');
  selectedBuildingId = null;
}

function confirmBuy() {
  if (!selectedBuildingId) return;

  socket.emit('player:buyBuilding', { buildingId: selectedBuildingId });
}

// 讓這些函數可以在 HTML 中被調用
window.closeBuyModal = closeBuyModal;
window.confirmBuy = confirmBuy;

// ===== 畫面切換 =====

function showLoading(text = '連線中...') {
  document.getElementById('loading-screen').style.display = 'flex';
  document.getElementById('loading-screen').querySelector('p').textContent = text;
}

function hideLoading() {
  document.getElementById('loading-screen').style.display = 'none';
}

function showJoinScreen() {
  document.getElementById('join-screen').style.display = 'flex';
  document.getElementById('game-screen').style.display = 'none';
  document.body.classList.remove('game-active');
}

function showGameScreen() {
  document.getElementById('join-screen').style.display = 'none';
  document.getElementById('game-screen').style.display = 'block';
  document.body.classList.add('game-active');
}

function showWaitingScreen() {
  document.getElementById('waiting-screen').classList.add('show');
  document.getElementById('game-content').style.display = 'none';
  document.getElementById('result-screen').classList.remove('show');
  updatePlayerCount();
}

function showGameContent() {
  document.getElementById('waiting-screen').classList.remove('show');
  document.getElementById('game-content').style.display = 'block';
  document.getElementById('result-screen').classList.remove('show');
}

function showResultScreen(data) {
  document.getElementById('waiting-screen').classList.remove('show');
  document.getElementById('game-content').style.display = 'none';
  document.getElementById('result-screen').classList.add('show');

  document.getElementById('final-score').textContent = playerState.score;

  if (data && data.lotteryInfo) {
    const myInfo = data.lotteryInfo.find(p => p.id === playerState.id);
    if (myInfo) {
      const tierNames = {
        'TOP': '🥇 大獎池',
        'MID': '🥈 中獎池',
        'BOTTOM': '🥉 普獎池'
      };
      document.getElementById('lottery-tier').textContent = tierNames[myInfo.tier] || myInfo.tier;
    }
  }

  if (data && data.leaderboard) {
    const list = document.getElementById('final-leaderboard');
    list.innerHTML = '';

    data.leaderboard.forEach((player, index) => {
      const item = document.createElement('li');
      const isMe = player.id === playerState.id;
      const rankClass = index < 3 ? `top-${index + 1}` : '';

      item.className = `leaderboard-item ${isMe ? 'is-me' : ''}`;
      item.innerHTML = `
        <span class="leaderboard-rank ${rankClass}">${index + 1}</span>
        <span class="leaderboard-name">${player.name}${isMe ? ' (你)' : ''}</span>
        <span class="leaderboard-score">${player.score}</span>
      `;

      list.appendChild(item);
    });
  }
}

// ===== Toast 提示 =====

function showToast(message, type = 'info') {
  // 移除現有的 toast
  const existingToast = document.querySelector('.toast');
  if (existingToast) {
    existingToast.remove();
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease-out forwards';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

// ===== 成就系統 UI =====

function showAchievementPopup(achievement, isGlobalFirst = false) {
  // 創建成就彈出動畫
  const popup = document.createElement('div');
  popup.className = 'achievement-popup';
  popup.innerHTML = `
    <div class="achievement-popup-content">
      <div class="achievement-popup-icon">${achievement.emoji}</div>
      <div class="achievement-popup-info">
        <div class="achievement-popup-label">${isGlobalFirst ? '🥇 全場首位！' : '成就解鎖！'}</div>
        <div class="achievement-popup-name">${achievement.name}</div>
        <div class="achievement-popup-desc">${achievement.description}</div>
        ${achievement.reward ? `
          <div class="achievement-popup-reward">
            ${achievement.reward.coins ? `💰 +${achievement.reward.coins}` : ''}
            ${achievement.reward.score ? `⭐ +${achievement.reward.score}` : ''}
          </div>
        ` : ''}
      </div>
    </div>
  `;
  document.body.appendChild(popup);

  // 動畫結束後移除
  setTimeout(() => {
    popup.classList.add('fade-out');
    setTimeout(() => popup.remove(), 500);
  }, 3000);
}

function openAchievementsModal() {
  // 請求成就列表
  socket.emit('player:getAchievements');

  // 顯示 modal
  const modal = document.getElementById('achievements-modal');
  if (modal) {
    modal.classList.add('show');
  }
}

function closeAchievementsModal() {
  const modal = document.getElementById('achievements-modal');
  if (modal) {
    modal.classList.remove('show');
  }
}

function renderAchievementsModal(achievements) {
  const container = document.getElementById('achievements-list');
  if (!container) return;

  // 按分類分組
  const categorized = {};
  for (const achievement of achievements) {
    const cat = achievement.category || 'other';
    if (!categorized[cat]) categorized[cat] = [];
    categorized[cat].push(achievement);
  }

  let html = '';
  const categoryNames = gameConfig?.achievementCategories || {
    building: { name: '建設成就', emoji: '🏗️' },
    specialization: { name: '專精成就', emoji: '🎯' },
    income: { name: '收入成就', emoji: '💰' },
    special: { name: '特殊成就', emoji: '⭐' },
    global_first: { name: '全場首位', emoji: '🥇' }
  };

  for (const [catId, items] of Object.entries(categorized)) {
    const catInfo = categoryNames[catId] || { name: catId, emoji: '📋' };
    html += `
      <div class="achievement-category">
        <h4>${catInfo.emoji} ${catInfo.name}</h4>
        <div class="achievement-items">
          ${items.map(a => `
            <div class="achievement-item ${a.unlocked ? 'unlocked' : ''} ${a.globalClaimed && !a.unlocked ? 'claimed' : ''}">
              <div class="achievement-icon">${a.emoji}</div>
              <div class="achievement-info">
                <div class="achievement-name">${a.name}</div>
                <div class="achievement-desc">${a.description}</div>
                ${a.globalClaimed && !a.unlocked ? `<div class="achievement-claimed-by">已被 ${a.claimedBy} 獲得</div>` : ''}
              </div>
              ${a.reward ? `
                <div class="achievement-reward">
                  ${a.reward.coins ? `💰${a.reward.coins}` : ''}
                  ${a.reward.score ? `⭐${a.reward.score}` : ''}
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  container.innerHTML = html;
}

// 讓這些函數可以在 HTML 中被調用
window.openAchievementsModal = openAchievementsModal;
window.closeAchievementsModal = closeAchievementsModal;

// ===== 道具系統 UI =====

function showItemDropPopup(item) {
  const popup = document.createElement('div');
  popup.className = 'item-drop-popup';
  popup.innerHTML = `
    <div class="item-drop-content">
      <div class="item-drop-label">獲得道具！</div>
      <div class="item-drop-icon">${item.emoji}</div>
      <div class="item-drop-name">${item.name}</div>
      <div class="item-drop-desc">${item.description}</div>
    </div>
  `;
  document.body.appendChild(popup);

  setTimeout(() => {
    popup.classList.add('fade-out');
    setTimeout(() => popup.remove(), 500);
  }, 2500);
}

function openItemShopModal() {
  const modal = document.getElementById('item-shop-modal');
  if (modal) {
    // 更新金幣顯示
    const coinsEl = document.getElementById('shop-coins-value');
    if (coinsEl) coinsEl.textContent = playerState.coins;

    renderItemShop();
    modal.classList.add('show');
  }
}

function closeItemShopModal() {
  const modal = document.getElementById('item-shop-modal');
  if (modal) {
    modal.classList.remove('show');
  }
}

function renderItemShop() {
  const container = document.getElementById('item-shop-list');
  if (!container || !gameConfig?.items) return;

  container.innerHTML = Object.entries(gameConfig.items).map(([id, item]) => {
    const canAfford = playerState.coins >= item.cost;
    return `
      <div class="item-shop-card ${canAfford ? '' : 'disabled'}" onclick="${canAfford ? `buyItem('${id}')` : ''}">
        <div class="item-shop-icon">${item.emoji}</div>
        <div class="item-shop-info">
          <div class="item-shop-name">${item.name}</div>
          <div class="item-shop-desc">${item.description}</div>
        </div>
        <div class="item-shop-cost">💰 ${item.cost}</div>
      </div>
    `;
  }).join('');
}

function buyItem(itemId) {
  // 檢查遊戲是否已開始
  if (gameState.state === 'WAITING') {
    showToast('遊戲尚未開始，無法購買道具', 'error');
    return;
  }
  socket.emit('player:buyItem', { itemId });
}

function openMyItemsModal() {
  socket.emit('player:getItems');
  const modal = document.getElementById('my-items-modal');
  if (modal) {
    modal.classList.add('show');
  }
}

function closeMyItemsModal() {
  const modal = document.getElementById('my-items-modal');
  if (modal) {
    modal.classList.remove('show');
  }
}

function renderItemsModal() {
  const container = document.getElementById('my-items-list');
  if (!container || !gameConfig?.items) return;

  if (playerState.items.length === 0) {
    container.innerHTML = '<div class="no-items">你還沒有任何道具</div>';
    return;
  }

  // 統計道具數量
  const itemCounts = {};
  for (const itemId of playerState.items) {
    itemCounts[itemId] = (itemCounts[itemId] || 0) + 1;
  }

  container.innerHTML = Object.entries(itemCounts).map(([id, count]) => {
    const item = gameConfig.items[id];
    if (!item) return '';
    return `
      <div class="my-item-card" onclick="useItem('${id}')">
        <div class="my-item-icon">${item.emoji}</div>
        <div class="my-item-info">
          <div class="my-item-name">${item.name} ${count > 1 ? `x${count}` : ''}</div>
          <div class="my-item-desc">${item.description}</div>
        </div>
        <button class="my-item-use-btn">使用</button>
      </div>
    `;
  }).join('');

  // 顯示生效中的效果
  if (playerState.activeEffects.length > 0) {
    container.innerHTML += `
      <div class="active-effects-section">
        <h4>生效中的效果</h4>
        ${playerState.activeEffects.map(e => `
          <div class="active-effect-item">
            <span class="active-effect-source">${e.source}</span>
            <span class="active-effect-status">待使用</span>
          </div>
        `).join('')}
      </div>
    `;
  }
}

function useItem(itemId) {
  // 檢查遊戲是否已開始
  if (gameState.state === 'WAITING') {
    showToast('遊戲尚未開始，無法使用道具', 'error');
    return;
  }
  socket.emit('player:useItem', { itemId });
}

// 更新道具顯示（在右側面板顯示道具數量）
function updateItemsDisplay() {
  const itemCountEl = document.getElementById('item-count');
  if (itemCountEl) {
    itemCountEl.textContent = playerState.items.length;
  }

  // 如果道具 modal 是開啟的，也更新它
  const modal = document.getElementById('my-items-modal');
  if (modal && modal.classList.contains('show')) {
    renderItemsModal();
  }
}

// 更新成就顯示（顯示已解鎖數量）
function updateAchievementsDisplay() {
  const achievementCountEl = document.getElementById('achievement-count');
  if (achievementCountEl) {
    const total = gameConfig?.achievements ? Object.keys(gameConfig.achievements).length : 0;
    const unlocked = playerState.achievements.length;
    achievementCountEl.textContent = `${unlocked}/${total}`;
  }

  // 如果成就 modal 是開啟的，也更新它
  const modal = document.getElementById('achievements-modal');
  if (modal && modal.classList.contains('show')) {
    socket.emit('player:getAchievements');
  }
}

// ===== 小事件系統 UI =====

function showMiniEventPopup(event, effectResult) {
  const popup = document.createElement('div');
  popup.className = `mini-event-popup ${event.type}`;
  popup.innerHTML = `
    <div class="mini-event-content">
      <div class="mini-event-icon">${event.emoji}</div>
      <div class="mini-event-info">
        <div class="mini-event-name">${event.name}</div>
        <div class="mini-event-desc">${event.description}</div>
        ${effectResult.message ? `<div class="mini-event-result">${effectResult.message}</div>` : ''}
      </div>
    </div>
  `;
  document.body.appendChild(popup);

  setTimeout(() => {
    popup.classList.add('fade-out');
    setTimeout(() => popup.remove(), 500);
  }, 3000);
}

// 讓這些函數可以在 HTML 中被調用
window.openItemShopModal = openItemShopModal;
window.closeItemShopModal = closeItemShopModal;
window.buyItem = buyItem;
window.openMyItemsModal = openMyItemsModal;
window.closeMyItemsModal = closeMyItemsModal;
window.useItem = useItem;

// ===== 建築升級系統 UI =====

function openUpgradeModal() {
  socket.emit('player:getUpgradeable');
  const modal = document.getElementById('upgrade-modal');
  if (modal) {
    modal.classList.add('show');
  }
}

function closeUpgradeModal() {
  const modal = document.getElementById('upgrade-modal');
  if (modal) {
    modal.classList.remove('show');
  }
}

function renderUpgradeModal(upgradeable) {
  const container = document.getElementById('upgrade-list');
  if (!container) return;

  if (!upgradeable || upgradeable.length === 0) {
    container.innerHTML = `
      <div class="no-upgrades">
        <div class="no-upgrades-icon">🏗️</div>
        <div class="no-upgrades-text">目前沒有可升級的建築</div>
        <div class="no-upgrades-hint">累積 3 棟相同建築即可升級</div>
      </div>
    `;
    return;
  }

  container.innerHTML = upgradeable.map(item => `
    <div class="upgrade-card" onclick="upgradeBuilding('${item.fromBuildingId}')">
      <div class="upgrade-from">
        <div class="upgrade-building-icon">${item.fromBuilding.emoji}</div>
        <div class="upgrade-building-name">${item.fromBuilding.name}</div>
        <div class="upgrade-building-count">${item.currentCount} 棟</div>
      </div>
      <div class="upgrade-arrow">
        <span class="upgrade-merge">x${item.requiredCount}</span>
        <span class="upgrade-arrow-icon">➜</span>
      </div>
      <div class="upgrade-to">
        <div class="upgrade-building-icon">${item.toBuilding.emoji}</div>
        <div class="upgrade-building-name">${item.toBuilding.name}</div>
        <div class="upgrade-bonus" style="font-weight: 700; color: #FFD93D;">
          🏆 +${item.bonusScore} 積分
        </div>
        <div class="upgrade-income" style="font-size: 0.8rem; color: #4FC3F7; margin-top: 2px;">
          💰 每回合 +${item.toBuilding.income || 0} 金幣
        </div>
      </div>
      <div class="upgrade-times">可升級 ${item.timesCanUpgrade} 次</div>
    </div>
  `).join('');
}

function upgradeBuilding(buildingId) {
  socket.emit('player:upgradeBuilding', { buildingId });
}

function showUpgradeAnimation(fromBuilding, toBuilding, bonusScore) {
  const popup = document.createElement('div');
  popup.className = 'upgrade-animation-popup';
  popup.innerHTML = `
    <div class="upgrade-animation-content">
      <div class="upgrade-animation-from">
        ${fromBuilding.emoji} ${fromBuilding.emoji} ${fromBuilding.emoji}
      </div>
      <div class="upgrade-animation-arrow">⬇️</div>
      <div class="upgrade-animation-to">${toBuilding.emoji}</div>
      <div class="upgrade-animation-bonus">+${bonusScore} 分！</div>
    </div>
  `;
  document.body.appendChild(popup);

  setTimeout(() => {
    popup.classList.add('fade-out');
    setTimeout(() => popup.remove(), 500);
  }, 2500);
}

window.openUpgradeModal = openUpgradeModal;
window.closeUpgradeModal = closeUpgradeModal;
window.upgradeBuilding = upgradeBuilding;

// ===== 限時搶購系統 UI =====

function showFlashSaleBanner(data) {
  let banner = document.getElementById('flash-sale-banner');

  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'flash-sale-banner';
    banner.className = 'flash-sale-banner';
    document.body.appendChild(banner);
  }

  const canAfford = playerState.coins >= data.salePrice;
  const alreadyBought = data.buyers && data.buyers.includes(playerState.id);

  banner.innerHTML = `
    <div class="flash-sale-content">
      <div class="flash-sale-header">
        <span class="flash-sale-label">⚡ 限時搶購</span>
        <span class="flash-sale-timer" id="flash-sale-countdown"></span>
      </div>
      <div class="flash-sale-item">
        <span class="flash-sale-icon">${data.building.emoji}</span>
        <span class="flash-sale-name">${data.building.name}</span>
      </div>
      <div class="flash-sale-price">
        <span class="flash-sale-original">原價 ${data.originalPrice}</span>
        <span class="flash-sale-discount">${data.salePrice} 金幣</span>
        <span class="flash-sale-off">-${data.discount}%</span>
      </div>
      <div class="flash-sale-remaining">
        剩餘 <span id="flash-sale-remaining-count">${data.remaining}</span> / ${data.quantity}
      </div>
      <button class="flash-sale-btn ${!canAfford || alreadyBought || data.remaining <= 0 ? 'disabled' : ''}"
              onclick="${canAfford && !alreadyBought && data.remaining > 0 ? 'buyFlashSale()' : ''}"
              ${!canAfford || alreadyBought || data.remaining <= 0 ? 'disabled' : ''}>
        ${alreadyBought ? '已搶購' : data.remaining <= 0 ? '已售罄' : !canAfford ? '金幣不足' : '立即搶購！'}
      </button>
    </div>
  `;

  banner.classList.add('show');

  // 開始倒計時
  startFlashSaleCountdown(data.endTime);
}

function hideFlashSaleBanner() {
  const banner = document.getElementById('flash-sale-banner');
  if (banner) {
    banner.classList.remove('show');
    setTimeout(() => banner.remove(), 300);
  }

  if (flashSaleTimer) {
    clearInterval(flashSaleTimer);
    flashSaleTimer = null;
  }
}

function startFlashSaleCountdown(endTime) {
  if (flashSaleTimer) {
    clearInterval(flashSaleTimer);
  }

  const updateCountdown = () => {
    const remaining = Math.max(0, endTime - Date.now());
    const seconds = Math.ceil(remaining / 1000);

    const countdownEl = document.getElementById('flash-sale-countdown');
    if (countdownEl) {
      countdownEl.textContent = `${seconds}s`;

      if (seconds <= 10) {
        countdownEl.classList.add('urgent');
      }
    }

    if (remaining <= 0) {
      clearInterval(flashSaleTimer);
      flashSaleTimer = null;
    }
  };

  updateCountdown();
  flashSaleTimer = setInterval(updateCountdown, 1000);
}

function updateFlashSaleRemaining(remaining) {
  const el = document.getElementById('flash-sale-remaining-count');
  if (el) {
    el.textContent = remaining;

    if (remaining <= 0) {
      const btn = document.querySelector('.flash-sale-btn');
      if (btn) {
        btn.textContent = '已售罄';
        btn.classList.add('disabled');
        btn.disabled = true;
      }
    }
  }
}

function buyFlashSale() {
  socket.emit('player:buyFlashSale');
}

window.buyFlashSale = buyFlashSale;

// ===== 事件綁定 =====

function bindEvents() {
  // 加入遊戲表單
  document.getElementById('join-form').addEventListener('submit', (e) => {
    e.preventDefault();

    const name = document.getElementById('player-name').value.trim();
    const password = document.getElementById('player-password').value.trim();

    if (!name) {
      showToast('請輸入名字！', 'error');
      return;
    }

    if (!password || password.length < 4) {
      showToast('請輸入至少4位數的密碼！', 'error');
      return;
    }

    socket.emit('player:join', { name, password, tableNumber: null });
  });

  // 點擊彈窗外部關閉
  document.getElementById('buy-modal').addEventListener('click', (e) => {
    if (e.target.id === 'buy-modal') {
      closeBuyModal();
    }
  });
}
