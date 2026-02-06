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
  purchasedItems: [],  // 本局已購買過的道具
  activeEffects: []
};

// 角色彈窗是否已經顯示過（使用 localStorage 記錄當前遊戲會話）
function isRoleModalShown() {
  const playerId = localStorage.getItem('playerId');
  if (!playerId) return false;
  return localStorage.getItem(`roleModalShown_${playerId}`) === 'true';
}

function setRoleModalShown() {
  const playerId = localStorage.getItem('playerId');
  if (playerId) {
    localStorage.setItem(`roleModalShown_${playerId}`, 'true');
  }
}

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
  socket.on('player:coinsUpdated', handleCoinsUpdated);

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

  // 互動事件
  socket.on('game:interactiveEventSettled', handleInteractiveEventSettled);

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

  // 小遊戲事件
  socket.on('minigame:quizStarted', handleQuizStarted);
  socket.on('minigame:quizQuestion', handleQuizQuestion);
  socket.on('minigame:quizEnded', handleQuizEnded);
  socket.on('player:quizAnswerResult', handleQuizAnswerResult);

  socket.on('minigame:beerWaitingStart', handleBeerWaitingStart);
  socket.on('minigame:beerPlayerJoined', handleBeerPlayerJoined);
  socket.on('minigame:beerGameStarted', handleBeerGameStarted);
  socket.on('player:joinBeerResult', handleJoinBeerResult);

  socket.on('minigame:pokerGameStarted', handlePokerGameStarted);
  socket.on('minigame:pokerRoundStarted', handlePokerRoundStarted);
  socket.on('minigame:pokerRevealing', handlePokerRevealing);
  socket.on('minigame:pokerRoundEnded', handlePokerRoundEnded);
  socket.on('minigame:pokerGameEnded', handlePokerGameEnded);
  socket.on('player:placeBetResult', handlePlaceBetResult);

  socket.on('minigame:songGuessRoundStarted', handleSongGuessRoundStarted);
  socket.on('minigame:songGuessRoundEnded', handleSongGuessRoundEnded);
  socket.on('minigame:songGuessGameEnded', handleSongGuessGameEnded);
  socket.on('player:songAnswerResult', handleSongAnswerResult);

  // 抽獎事件
  socket.on('award:reveal', handleAwardReveal);
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
    // 確保按鈕在等待畫面被隱藏
    hideGameButtons();
  } else if (gameState.state === 'ENDED') {
    showResultScreen(gameState);
    // 遊戲結束時隱藏按鈕
    hideGameButtons();
  } else {
    showGameContent();
    // 遊戲進行中時顯示按鈕
    showGameButtons();

    // 如果遊戲已經開始（中途加入），且有角色，自動彈出角色彈窗
    console.log('🎮 中途加入檢查:', {
      hasRole: !!playerState.role,
      role: playerState.role,
      roleModalShown: isRoleModalShown(),
      gameState: gameState.state
    });

    if (playerState.role && !isRoleModalShown()) {
      console.log('✅ 準備彈出角色彈窗（中途加入）');
      setTimeout(() => {
        console.log('🎯 執行彈出角色彈窗');
        openRoleModal();
      }, 800); // 延遲 0.8 秒讓畫面完全轉換後再彈出
    }
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

    // 小事件由服務器通過 player:miniEvent 事件發送，不在這裡處理
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
  if (state.purchasedItems !== undefined) playerState.purchasedItems = state.purchasedItems;
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

  // 玩家第一次登入時顯示角色彈窗
  setTimeout(() => {
    openRoleModal();
  }, 1000);
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
    playerState.purchasedItems.push(result.item.id);  // 記錄已購買
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

  // 顯示成就和道具按鈕
  showGameButtons();

  // 如果玩家有角色且角色彈窗還沒顯示過，自動彈出角色彈窗
  console.log('🎮 遊戲開始檢查:', {
    hasRole: !!playerState.role,
    role: playerState.role,
    roleModalShown: isRoleModalShown()
  });

  if (playerState.role && !isRoleModalShown()) {
    console.log('✅ 準備彈出角色彈窗（遊戲開始）');
    setTimeout(() => {
      console.log('🎯 執行彈出角色彈窗');
      openRoleModal();
    }, 500); // 延遲 0.5 秒讓畫面轉換更流暢
  }
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
  // 遊戲結束時隱藏按鈕
  hideGameButtons();
}

function handleInteractiveEventSettled(data) {
  // 檢查當前玩家是否參與此互動事件
  const playerId = localStorage.getItem('playerId');
  const playerResult = data.results.find(r => r.playerId === playerId);

  if (playerResult) {
    // 玩家參與了這個互動事件
    let message = '';
    let type = 'success';

    if (playerResult.result === 'winner') {
      if (playerResult.coins > 0) {
        message = `🏆 恭喜！你在「${data.event.title}」中獲勝！獲得 +${playerResult.coins}元`;
        type = 'success';
      } else {
        message = `🎮 你參與了「${data.event.title}」`;
        type = 'info';
      }
    } else if (playerResult.result === 'loser') {
      if (playerResult.coins < 0) {
        message = `😢 「${data.event.title}」未能成功，${playerResult.coins}元`;
        type = 'warning';
      } else if (playerResult.coins > 0) {
        message = `👍 參與「${data.event.title}」獲得 +${playerResult.coins}元`;
        type = 'info';
      } else {
        message = `🎮 你參與了「${data.event.title}」`;
        type = 'info';
      }
    } else if (playerResult.result === 'participant') {
      if (playerResult.coins > 0) {
        message = `👍 參與「${data.event.title}」獲得 +${playerResult.coins}元`;
        type = 'success';
      } else {
        message = `🎮 你參與了「${data.event.title}」`;
        type = 'info';
      }
    }

    // 顯示提示訊息（較長時間）
    showToast(message, type, 6000);

    // 從伺服器更新玩家狀態
    socket.emit('player:getState');
  }

  // 更新排行榜
  if (data.leaderboard) {
    updateLeaderboard(data.leaderboard);
  }
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
  const playerId = localStorage.getItem('playerId');

  // 清除角色彈窗已顯示的記錄
  if (playerId) {
    localStorage.removeItem(`roleModalShown_${playerId}`);
  }

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

function handleCoinsUpdated(data) {
  // 更新玩家金幣
  playerState.coins = data.coins;
  updateResourceDisplay();
  showToast(`💰 獲得 +${data.amount} 金幣！（${data.reason}）`, 'success');
}

// ===== UI 更新 =====

function updateResourceDisplay() {
  document.getElementById('res-coins').textContent = playerState.coins;
  document.getElementById('res-score').textContent = playerState.score;
  // 更新建築卡片的可購買狀態
  updateBuildingCards();
}

function updatePlayerNameDisplay() {
  document.getElementById('player-name-display').textContent = playerState.name || '玩家';
}

function updateRoleDisplay() {
  const headerBadge = document.getElementById('header-role-badge');
  const headerEmoji = document.getElementById('header-role-emoji');
  const headerName = document.getElementById('header-role-name');

  if (!headerBadge) return;

  // 只有在遊戲已開始且角色彈窗已顯示過後才顯示在右上角
  if (playerState.role && gameState.state !== 'WAITING' && isRoleModalShown()) {
    headerEmoji.textContent = playerState.role.emoji;
    headerName.textContent = playerState.role.name;
    headerBadge.style.backgroundColor = `${playerState.role.color}20`;
    headerBadge.style.borderColor = playerState.role.color;
    headerBadge.style.color = playerState.role.color;
    headerBadge.style.display = 'inline-flex';
  } else {
    headerBadge.style.display = 'none';
  }
}

function updateGameStateDisplay() {
  // 移除遊戲狀態顯示，改由角色顯示取代
  const stateEl = document.getElementById('game-state');
  if (stateEl) {
    stateEl.style.display = 'none';
  }
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
        <span class="building-cost">💰 ${building.cost}元</span>
        <span class="building-income" style="color: #4FC3F7;">💰 每回合 +${building.income}元</span>
      </div>
    `;

    // 總是綁定點擊事件，但在 disabled 時不執行
    card.addEventListener('click', () => {
      if (!card.classList.contains('disabled')) {
        openBuyModal(id);
      }
    });

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

  // 顯示效果標籤
  const effectsContainer = document.getElementById('event-effects');
  if (event.display) {
    effectsContainer.innerHTML = `
      <span class="effect-tag ${event.display.mood === 'positive' ? 'positive' : 'negative'}">
        ${event.display.affected}
      </span>
    `;
  } else {
    effectsContainer.innerHTML = '';
  }

  // 找到自己的結果
  const myResult = results.find(r => r.playerId === playerState.id);
  if (myResult) {
    // 顯示營收（金幣）
    if (myResult.income > 0) {
      document.getElementById('income-amount').textContent = `+${myResult.income} 金幣`;
      document.getElementById('income-result').style.display = 'block';
    } else {
      document.getElementById('income-result').style.display = 'none';
    }

    // 如果有額外積分獎勵，顯示 toast
    if (myResult.bonusScore && myResult.bonusScore > 0) {
      showToast(`🎁 獲得 +${myResult.bonusScore} 積分！`, 'success', 4000);
    }

    // 如果有額外金幣獎勵（事件特殊效果），也顯示 toast
    if (myResult.bonusCoins && myResult.bonusCoins > 0) {
      showToast(`💰 獲得 +${myResult.bonusCoins} 金幣獎勵！`, 'success', 4000);
    }
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
  document.getElementById('modal-cost').textContent = `💰 ${building.cost}元`;
  document.getElementById('modal-income').textContent = `💰 +${building.income}元`;
  document.getElementById('modal-remaining').textContent = `💰 ${playerState.coins - building.cost}元`;

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
  // 確保按鈕在加入畫面被隱藏
  hideGameButtons();
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

function showGameButtons() {
  const achievementsBtn = document.getElementById('achievements-btn');
  const itemButtons = document.getElementById('item-buttons');
  if (achievementsBtn) achievementsBtn.style.display = 'flex';
  if (itemButtons) itemButtons.style.display = 'flex';
}

function hideGameButtons() {
  const achievementsBtn = document.getElementById('achievements-btn');
  const itemButtons = document.getElementById('item-buttons');
  if (achievementsBtn) achievementsBtn.style.display = 'none';
  if (itemButtons) itemButtons.style.display = 'none';
}

function showResultScreen(data) {
  document.getElementById('waiting-screen').classList.remove('show');
  document.getElementById('game-content').style.display = 'none';
  document.getElementById('result-screen').classList.add('show');

  document.getElementById('final-score').textContent = playerState.score;

  // 初始顯示 "???"，等待抽獎通知
  document.getElementById('lottery-tier').textContent = '???';
  document.getElementById('lottery-tier').style.color = 'var(--text-muted)';

  // 儲存抽獎資訊供後續使用，但不顯示
  if (data && data.lotteryInfo) {
    const myInfo = data.lotteryInfo.find(p => p.id === playerState.id);
    if (myInfo) {
      playerState.lotteryInfo = myInfo;
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
    const alreadyPurchased = playerState.purchasedItems && playerState.purchasedItems.includes(id);
    const canAfford = playerState.coins >= item.cost;
    const canBuy = !alreadyPurchased && canAfford;

    if (alreadyPurchased) {
      return `
        <div class="item-shop-card purchased">
          <div class="item-shop-icon">${item.emoji}</div>
          <div class="item-shop-info">
            <div class="item-shop-name">${item.name}</div>
            <div class="item-shop-desc">${item.description}</div>
          </div>
          <div class="item-shop-cost purchased-label">已購買</div>
        </div>
      `;
    }

    return `
      <div class="item-shop-card ${canBuy ? '' : 'disabled'}" onclick="${canBuy ? `buyItem('${id}')` : ''}">
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

// ===== 小遊戲系統 =====

let quizState = {
  active: false,
  currentQuestion: null,
  questionIndex: 0,
  totalQuestions: 0,
  timer: null,
  countdownInterval: null // 倒數計時器
};

let beerState = {
  waiting: false,
  joined: false
};

let pokerState = {
  active: false,
  bet: null,
  timer: null
};

// 快問快答事件處理
function handleQuizStarted(data) {
  quizState = {
    active: true,
    currentQuestion: null,
    questionIndex: 0,
    totalQuestions: data.questionCount,
    timer: null,
    answered: false
  };
  showToast('快問快答開始！', 'info');
}

function handleQuizQuestion(data) {
  quizState.currentQuestion = data;
  quizState.questionIndex = data.questionIndex;
  quizState.answered = false; // 重置作答狀態
  showQuizModal(data);

  // 5秒後自動進入等待狀態
  if (quizState.timer) clearTimeout(quizState.timer);
  quizState.timer = setTimeout(() => {
    if (!quizState.answered) {
      showQuizWaiting(); // 未作答，顯示等待狀態
    }
  }, 5000);
}

function handleQuizEnded(data) {
  console.log('🏁 Quiz ended, data:', data);
  quizState.active = false;
  closeQuizModal();

  // 顯示答題結果彈窗
  showQuizResultModal(data);

  showToast('快問快答結束！', 'success');
}

function handleQuizAnswerResult(result) {
  if (result.success) {
    // 答案已提交
  } else {
    showToast(result.error || '無法提交答案', 'error');
  }
}

function submitQuizAnswer(answerIndex) {
  socket.emit('player:submitQuizAnswer', { answerIndex });
  if (quizState.timer) clearTimeout(quizState.timer);
  quizState.answered = true;
  showQuizWaiting(); // 顯示等待下一題狀態，不關閉彈窗
}

// 喝啤酒比賽事件處理
function handleBeerWaitingStart() {
  beerState = {
    waiting: true,
    joined: false
  };
  showBeerJoinModal();
}

function handleBeerPlayerJoined(data) {
  // 更新參與者列表（在投影畫面顯示）
}

function handleBeerGameStarted(data) {
  beerState.waiting = false;
  closeBeerJoinModal();
  showToast('喝啤酒比賽開始！加油！', 'success');
}

function handleJoinBeerResult(result) {
  if (result.success) {
    beerState.joined = true;
    showToast('成功加入喝啤酒比賽！', 'success');
    closeBeerJoinModal();
  } else {
    showToast(result.error || '無法加入比賽', 'error');
  }
}

function joinBeerGame() {
  socket.emit('player:joinBeer');
}

// 比大小事件處理
function handlePokerGameStarted() {
  pokerState = {
    active: true,
    roundActive: false,
    bet: null,
    endTime: null,
    timer: null,
    result: null
  };
  showToast('🃏 比大小遊戲開始！', 'info');
}

function handlePokerRoundStarted(data) {
  pokerState.roundActive = true;
  pokerState.bet = null;
  pokerState.endTime = data.endTime;
  pokerState.result = null;
  showPokerBetModal(data);
}

// 開牌中狀態 - 顯示等待動畫
function handlePokerRevealing(data) {
  pokerState.roundActive = false;
  showPokerRevealingInModal(data.roundNumber);
}

function handlePokerRoundEnded(data) {
  pokerState.roundActive = false;
  pokerState.result = data;

  const cardNames = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const cardDisplay = cardNames[data.card - 1] || data.card;
  const resultText = data.result === 'big' ? '大' : (data.result === 'small' ? '小' : '和局(7)');

  const isWinner = data.winners.some(w => w.playerId === playerState.id);
  const isLoser = data.losers.some(l => l.playerId === playerState.id);
  const isTied = data.tied && data.tied.some(t => t.playerId === playerState.id);

  // 累計本場遊戲贏得的金幣
  if (isWinner) {
    pokerState.totalWinnings = (pokerState.totalWinnings || 0) + 100;
  }

  // 更新彈窗顯示結果（不關閉彈窗）
  showPokerResultInModal(data, cardDisplay, resultText, isWinner, isLoser, isTied);
}

function handlePokerGameEnded(data) {
  const totalWinnings = pokerState.totalWinnings || 0;
  pokerState.active = false;
  pokerState.roundActive = false;
  pokerState.totalWinnings = 0; // 重置

  closePokerBetModal();

  // 顯示遊戲結束與總金幣
  if (totalWinnings > 0) {
    showToast(`🃏 比大小結束！共 ${data.totalRounds} 局，你贏得 ${totalWinnings} 金幣！`, 'success');
  } else {
    showToast(`🃏 比大小結束！共 ${data.totalRounds} 局`, 'info');
  }
}

function handlePlaceBetResult(result) {
  if (result.success) {
    // 下注成功，更新彈窗顯示等待狀態
    showPokerWaitingInModal();
  } else {
    showToast(result.error || '下注失敗', 'error');
  }
}

function placeBet(bet) {
  pokerState.bet = bet;
  socket.emit('player:placeBet', { bet });
  // 不關閉彈窗，顯示等待狀態
}

// 猜歌曲前奏事件處理
let songGuessState = {
  active: false,
  submitted: false
};

function handleSongGuessRoundStarted(data) {
  songGuessState = {
    active: true,
    submitted: false
  };
  showSongGuessModal();
}

function handleSongGuessRoundEnded(data) {
  songGuessState.submitted = false;
  // 不關閉彈窗，等待新一局或遊戲結束

  // 查找玩家結果
  const playerResult = data.results.find(r => r.playerId === playerState.id);

  if (playerResult) {
    if (playerResult.isCorrect) {
      showSongResult(true, data.correctAnswer, playerResult.reward);
    } else {
      showSongResult(false, data.correctAnswer, 0);
    }
  } else {
    // 玩家未參與
    showToast(`正確答案：${data.correctAnswer}`, 'info');
  }
}

function handleSongGuessGameEnded() {
  songGuessState.active = false;
  songGuessState.submitted = false;
  closeSongGuessModal();
  showToast('🎵 猜歌曲前奏遊戲已結束！', 'info');
}

function handleSongAnswerResult(result) {
  if (result.success) {
    songGuessState.submitted = true;
    // 隱藏輸入框和按鈕，顯示識別中動畫
    document.getElementById('song-guess-input').style.display = 'none';
    document.querySelector('#song-guess-modal .modal-buttons').style.display = 'none';
    document.getElementById('song-identifying').style.display = 'block';
  } else {
    showToast(result.error || '提交失敗', 'error');
  }
}

function submitSongGuess() {
  const input = document.getElementById('song-guess-input');
  const answer = input.value.trim();

  if (!answer) {
    showToast('請輸入歌名', 'error');
    return;
  }

  socket.emit('player:submitSongAnswer', { answer });
}

function showSongGuessModal() {
  const modal = document.getElementById('song-guess-modal');
  const input = document.getElementById('song-guess-input');
  const identifying = document.getElementById('song-identifying');
  const buttons = document.querySelector('#song-guess-modal .modal-buttons');

  if (modal) {
    input.value = '';
    input.style.display = 'block';
    buttons.style.display = 'flex';
    identifying.style.display = 'none';
    modal.classList.add('show');
  }
}

function closeSongGuessModal() {
  const modal = document.getElementById('song-guess-modal');
  if (modal) {
    modal.classList.remove('show');
  }
}

function showSongResult(isCorrect, correctAnswer, reward) {
  const modal = document.getElementById('song-result-modal');
  const emoji = document.getElementById('song-result-emoji');
  const title = document.getElementById('song-result-title');
  const message = document.getElementById('song-result-message');
  const answer = document.getElementById('song-result-answer');

  if (isCorrect) {
    emoji.textContent = '🎉';
    title.textContent = '恭喜答對~';
    title.style.color = 'var(--success)';
    message.textContent = `+${reward}元`;
    message.style.color = 'var(--success)';
    answer.textContent = correctAnswer;
    answer.style.color = 'var(--success)';
  } else {
    emoji.textContent = '😅';
    title.textContent = '喔喔~喝一杯吧~';
    title.style.color = 'var(--danger)';
    message.textContent = '答錯了';
    message.style.color = 'var(--danger)';
    answer.textContent = correctAnswer;
    answer.style.color = 'var(--danger)';
  }

  if (modal) {
    modal.classList.add('show');
  }
}

function closeSongResult() {
  const modal = document.getElementById('song-result-modal');
  if (modal) {
    modal.classList.remove('show');
  }
}

// ===== 抽獎事件 =====

function handleAwardReveal(data) {
  // 檢查是否是自己中獎
  if (data.winner && data.winner.id === playerState.id) {
    // 更新抽獎機會顯示為"中獎!!!"
    const lotteryTierEl = document.getElementById('lottery-tier');
    if (lotteryTierEl) {
      lotteryTierEl.textContent = '🎉 中獎!!!';
      lotteryTierEl.style.color = '#FFD700';
      lotteryTierEl.style.textShadow = '0 0 20px rgba(255, 215, 0, 0.8)';
      lotteryTierEl.style.animation = 'winnerCelebrate 0.8s ease-in-out infinite alternate';
    }

    // 顯示慶祝提示
    showToast('🎊 恭喜中獎！請到舞台領獎！', 'success');

    // 可選：播放慶祝音效或動畫
    // 如果需要更華麗的效果，可以在這裡添加
  }
}

// 小遊戲 Modal UI 控制
function showQuizModal(data) {
  const modal = document.getElementById('quiz-modal');
  if (!modal) return;

  // 清除舊的倒數計時器
  if (quizState.countdownInterval) {
    clearInterval(quizState.countdownInterval);
    quizState.countdownInterval = null;
  }

  // 更新問題
  document.getElementById('quiz-question-text').textContent = data.question;

  // 更新選項
  const optionsContainer = document.getElementById('quiz-options');
  optionsContainer.innerHTML = data.options.map((option, index) => `
    <button class="modal-btn" style="padding: 15px; font-size: 1rem;" onclick="submitQuizAnswer(${index})">
      ${option}
    </button>
  `).join('');

  // 更新進度
  document.getElementById('quiz-progress').textContent =
    `第 ${data.questionIndex + 1} / ${data.totalQuestions} 題`;

  // 倒計時 - 確保使用正確的時間限制
  let timeLeft = data.timeLimit || 5;
  document.getElementById('quiz-timer').textContent = timeLeft + 's';

  quizState.countdownInterval = setInterval(() => {
    timeLeft--;
    const timerEl = document.getElementById('quiz-timer');
    if (timerEl) {
      timerEl.textContent = timeLeft + 's';
      // 時間快結束時改變顏色
      if (timeLeft <= 2) {
        timerEl.style.color = 'red';
      } else if (timeLeft <= 3) {
        timerEl.style.color = 'orange';
      }
    }
    if (timeLeft <= 0) {
      clearInterval(quizState.countdownInterval);
      quizState.countdownInterval = null;
      // 時間結束，顯示等待狀態
      if (!quizState.answered) {
        showQuizWaiting();
      }
    }
  }, 1000);

  modal.classList.add('show');
}

function showQuizWaiting() {
  const modal = document.getElementById('quiz-modal');
  if (!modal) return;

  // 清除倒數計時器
  if (quizState.countdownInterval) {
    clearInterval(quizState.countdownInterval);
    quizState.countdownInterval = null;
  }

  // 判斷是否是最後一題
  const isLastQuestion = quizState.currentQuestion &&
    quizState.currentQuestion.questionIndex + 1 >= quizState.currentQuestion.totalQuestions;

  if (isLastQuestion) {
    // 最後一題，顯示結算中
    document.getElementById('quiz-question-text').textContent = '🎉 恭喜完成答題！';
    const optionsContainer = document.getElementById('quiz-options');
    optionsContainer.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 20px; color: var(--text-secondary);">結算中，請稍候...</div>';
  } else {
    // 不是最後一題，顯示等待下一題
    document.getElementById('quiz-question-text').textContent = '等待下一題...';
    const optionsContainer = document.getElementById('quiz-options');
    optionsContainer.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 20px; color: var(--text-secondary);">準備下一題中...</div>';
  }

  // 清除計時器顯示
  const timerEl = document.getElementById('quiz-timer');
  if (timerEl) {
    timerEl.textContent = '';
    timerEl.style.color = ''; // 重置顏色
  }
}

function closeQuizModal() {
  // 清除倒數計時器
  if (quizState.countdownInterval) {
    clearInterval(quizState.countdownInterval);
    quizState.countdownInterval = null;
  }

  const modal = document.getElementById('quiz-modal');
  if (modal) {
    modal.classList.remove('show');
  }
}

function showQuizResultModal(data) {
  console.log('📊 Showing quiz result modal');
  console.log('Player ID:', playerState.id);
  console.log('Results:', data.results);
  console.log('Questions:', data.questions);

  const modal = document.getElementById('quiz-result-modal');
  if (!modal) {
    console.error('❌ Quiz result modal not found!');
    return;
  }

  // 找到當前玩家的結果
  const myResult = data.results.find(r => r.playerId === playerState.id);

  if (!myResult) {
    console.error('❌ My result not found for player:', playerState.id);
    showToast('未找到您的答題記錄', 'error');
    return;
  }

  console.log('✅ My result:', myResult);

  // 更新統計數據
  document.getElementById('quiz-result-correct').textContent = myResult.correct;
  document.getElementById('quiz-result-total').textContent = myResult.total;
  document.getElementById('quiz-result-reward').textContent = myResult.reward;

  // 生成題目詳情
  const detailsContainer = document.getElementById('quiz-result-details');
  detailsContainer.innerHTML = data.questions.map((question, index) => {
    const myAnswer = myResult.answers.find(a => a.questionIndex === index);
    const myAnswerIndex = myAnswer ? myAnswer.answerIndex : -1;
    const correctIndex = question.correct;

    let resultClass = '';
    if (!myAnswer) {
      resultClass = 'unanswered';
    } else if (myAnswer.isCorrect) {
      resultClass = 'correct';
    } else {
      resultClass = 'incorrect';
    }

    // 生成所有選項，標記玩家選的和正確答案
    const optionsHTML = question.options.map((option, optIndex) => {
      const isMyChoice = optIndex === myAnswerIndex;
      const isCorrect = optIndex === correctIndex;

      let borderStyle = '2px solid transparent';
      let backgroundColor = 'rgba(255, 255, 255, 0.05)';
      let icon = '';

      if (isMyChoice && isCorrect) {
        // 選對了
        borderStyle = '3px solid var(--success)';
        backgroundColor = 'rgba(34, 197, 94, 0.1)';
        icon = '✓ ';
      } else if (isMyChoice && !isCorrect) {
        // 選錯了
        borderStyle = '3px solid var(--danger)';
        backgroundColor = 'rgba(239, 68, 68, 0.1)';
        icon = '✗ ';
      } else if (!isMyChoice && isCorrect) {
        // 正確答案（沒選）
        borderStyle = '2px solid var(--success)';
        backgroundColor = 'rgba(34, 197, 94, 0.05)';
        icon = '✓ ';
      }

      return `
        <div style="
          padding: 10px 12px;
          margin: 5px 0;
          border-radius: 6px;
          border: ${borderStyle};
          background: ${backgroundColor};
          font-size: 0.9rem;
        ">
          ${icon}${option}
        </div>
      `;
    }).join('');

    const statusText = !myAnswer ? '未作答' : myAnswer.isCorrect ? '答對 ✓' : '答錯 ✗';
    const statusColor = !myAnswer ? 'var(--text-muted)' : myAnswer.isCorrect ? 'var(--success)' : 'var(--danger)';

    return `
      <div style="margin-bottom: 20px; padding: 15px; background: var(--bg-secondary); border-radius: 8px; border-left: 4px solid ${resultClass === 'correct' ? 'var(--success)' : resultClass === 'incorrect' ? 'var(--danger)' : 'var(--text-muted)'};">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <div style="font-weight: bold; color: var(--text-primary);">
            第 ${index + 1} 題：${question.question}
          </div>
          <div style="font-size: 0.9rem; font-weight: bold; color: ${statusColor};">
            ${statusText}
          </div>
        </div>
        <div>
          ${optionsHTML}
        </div>
      </div>
    `;
  }).join('');

  modal.classList.add('show');
}

function closeQuizResultModal() {
  const modal = document.getElementById('quiz-result-modal');
  if (modal) {
    modal.classList.remove('show');
  }
}

function showBeerJoinModal() {
  const modal = document.getElementById('beer-join-modal');
  if (modal) {
    modal.classList.add('show');
  }
}

function closeBeerJoinModal() {
  const modal = document.getElementById('beer-join-modal');
  if (modal) {
    modal.classList.remove('show');
  }
}

function showPokerBetModal(data) {
  const modal = document.getElementById('poker-bet-modal');
  if (!modal) return;

  const endTime = data.endTime;

  // 重置彈窗內容為下注狀態
  const modalContent = modal.querySelector('.modal');
  modalContent.innerHTML = `
    <div class="modal-emoji">🃏</div>
    <div class="modal-title">比大小 - 第 ${data.roundNumber} 局</div>
    <div class="modal-info" style="text-align: center;">
      <p style="margin-bottom: 10px;">猜測撲克牌是大還是小？</p>
      <p style="font-size: 0.85rem; color: var(--text-muted);">8~K = 大 | A~6 = 小 | 7 = 和局</p>
      <p style="font-size: 0.85rem; color: var(--success); margin-top: 5px;">猜對 +100分 | 猜錯要喝酒 🍺</p>
    </div>
    <div style="text-align: center; margin: 15px 0; font-size: 0.9rem; color: var(--warning);">
      倒數：<span id="poker-countdown" style="font-weight: bold; font-size: 1.2rem;">20s</span>
    </div>
    <div class="modal-buttons" id="poker-bet-buttons">
      <button class="modal-btn" style="flex: 1; background: var(--danger); color: white;" onclick="placeBet('small')">
        📉 壓小 (A~6)
      </button>
      <button class="modal-btn" style="flex: 1; background: var(--success); color: white;" onclick="placeBet('big')">
        📈 壓大 (8~K)
      </button>
    </div>
  `;

  const updateCountdown = () => {
    const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
    const countdownEl = document.getElementById('poker-countdown');
    if (countdownEl) {
      countdownEl.textContent = remaining + 's';
      if (remaining > 10) {
        countdownEl.style.color = 'var(--warning)';
      } else if (remaining > 5) {
        countdownEl.style.color = 'var(--danger)';
      } else {
        countdownEl.style.color = 'red';
      }
    }

    if (remaining > 0 && pokerState.roundActive) {
      pokerState.timer = setTimeout(updateCountdown, 100);
    }
  };

  updateCountdown();
  modal.classList.add('show');
}

function showPokerWaitingInModal() {
  const buttonsContainer = document.getElementById('poker-bet-buttons');
  if (buttonsContainer) {
    const betText = pokerState.bet === 'big' ? '📈 大' : '📉 小';
    buttonsContainer.innerHTML = `
      <div style="width: 100%; text-align: center; padding: 20px;">
        <div style="font-size: 1.5rem; margin-bottom: 10px;">🎲</div>
        <div style="color: var(--text); font-weight: bold;">已下注：${betText}</div>
        <div style="color: var(--text-muted); font-size: 0.9rem; margin-top: 8px;">
          <span class="waiting-dots">等待開獎中</span>
        </div>
      </div>
    `;
  }
}

// 開牌中狀態 - 搓牌動畫
function showPokerRevealingInModal(roundNumber) {
  const modal = document.getElementById('poker-bet-modal');
  if (!modal) return;

  // 清除倒數計時器
  if (pokerState.timer) {
    clearTimeout(pokerState.timer);
    pokerState.timer = null;
  }

  const betText = pokerState.bet === 'big' ? '📈 大' : (pokerState.bet === 'small' ? '📉 小' : '未下注');

  const modalContent = modal.querySelector('.modal');
  modalContent.innerHTML = `
    <div class="modal-title">第 ${roundNumber} 局</div>
    <div style="text-align: center; margin: 20px 0;">
      <div style="font-size: 4rem; animation: cardShuffle 0.3s ease-in-out infinite;">🃏</div>
    </div>
    <div style="text-align: center; margin-bottom: 15px;">
      <div style="font-size: 1.5rem; font-weight: bold; color: var(--warning); animation: textPulse 0.8s ease-in-out infinite;">
        開牌中...
      </div>
    </div>
    <div style="text-align: center; padding: 12px; background: rgba(0,0,0,0.1); border-radius: 12px;">
      <div style="color: var(--text-muted); font-size: 0.9rem;">你的選擇：${betText}</div>
    </div>
    <style>
      @keyframes cardShuffle {
        0% { transform: translateY(-10px) rotate(-5deg); }
        25% { transform: translateY(8px) rotate(3deg); }
        50% { transform: translateY(-8px) rotate(-3deg); }
        75% { transform: translateY(10px) rotate(5deg); }
        100% { transform: translateY(-10px) rotate(-5deg); }
      }
      @keyframes textPulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.6; transform: scale(1.05); }
      }
    </style>
  `;
}

function showPokerResultInModal(data, cardDisplay, resultText, isWinner, isLoser, isTied) {
  const modal = document.getElementById('poker-bet-modal');
  if (!modal) return;

  // 清除倒數計時器
  if (pokerState.timer) {
    clearTimeout(pokerState.timer);
    pokerState.timer = null;
  }

  // 撲克牌花色（隨機選一個）
  const suits = ['♠', '♥', '♦', '♣'];
  const suit = suits[Math.floor(Math.random() * 4)];
  const isRed = suit === '♥' || suit === '♦';

  let resultEmoji, resultMessage, resultColor;
  if (data.result === 'tie') {
    resultEmoji = '🤝';
    resultMessage = '和局！不輸不贏';
    resultColor = '#95a5a6';
  } else if (isWinner) {
    resultEmoji = '🎉';
    resultMessage = '恭喜猜對！+100分';
    resultColor = 'var(--success)';
  } else if (isLoser) {
    resultEmoji = '🍺';
    resultMessage = '猜錯了！喝一杯吧~';
    resultColor = 'var(--danger)';
  } else {
    resultEmoji = '👀';
    resultMessage = '你沒有下注';
    resultColor = 'var(--text-muted)';
  }

  const modalContent = modal.querySelector('.modal');
  modalContent.innerHTML = `
    <div class="modal-emoji">${resultEmoji}</div>
    <div class="modal-title">第 ${data.roundNumber} 局結果</div>
    <div style="display: flex; justify-content: center; margin: 20px 0;">
      <div class="poker-card-display ${isRed ? 'red' : 'black'}">
        <div class="card-value">${cardDisplay}</div>
        <div class="card-suit">${suit}</div>
      </div>
    </div>
    <div style="text-align: center; margin-bottom: 15px;">
      <div style="font-size: 1.3rem; font-weight: bold; color: ${resultColor};">
        ${resultText === '和局(7)' ? '🎴 7 = 和局' : `${data.result === 'big' ? '📈' : '📉'} ${cardDisplay} = ${resultText}`}
      </div>
    </div>
    <div style="text-align: center; padding: 15px; background: rgba(0,0,0,0.1); border-radius: 12px; margin-bottom: 15px;">
      <div style="font-size: 1.5rem; margin-bottom: 5px;">${resultEmoji}</div>
      <div style="font-size: 1.1rem; font-weight: bold; color: ${resultColor};">${resultMessage}</div>
    </div>
    <div style="text-align: center; color: var(--text-muted); font-size: 0.9rem;">
      等待主持人開始下一局...
    </div>
  `;
}

function closePokerBetModal() {
  const modal = document.getElementById('poker-bet-modal');
  if (modal) {
    modal.classList.remove('show');
  }
  if (pokerState.timer) {
    clearTimeout(pokerState.timer);
    pokerState.timer = null;
  }
}

// 讓這些函數可以在 HTML 中被調用
window.openItemShopModal = openItemShopModal;
window.closeItemShopModal = closeItemShopModal;
window.buyItem = buyItem;
window.openMyItemsModal = openMyItemsModal;
window.closeMyItemsModal = closeMyItemsModal;
window.useItem = useItem;
window.submitQuizAnswer = submitQuizAnswer;
window.closeQuizResultModal = closeQuizResultModal;
window.joinBeerGame = joinBeerGame;
window.placeBet = placeBet;
window.submitSongGuess = submitSongGuess;
window.closeSongResult = closeSongResult;

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

// ===== 角色 Modal =====

function openRoleModal() {
  console.log('📋 openRoleModal 被調用');
  const modal = document.getElementById('role-modal');
  const modalBody = document.getElementById('role-modal-body');

  console.log('📋 modal 元素:', modal);
  console.log('📋 modalBody 元素:', modalBody);
  console.log('📋 playerState.role:', playerState.role);

  if (!playerState.role) {
    console.log('❌ 沒有角色資料，取消彈出');
    return;
  }

  const role = playerState.role;
  modalBody.innerHTML = `
    <div class="role-badge" style="background-color: ${role.color}20; border-color: ${role.color}; color: ${role.color}">
      <span class="role-emoji">${role.emoji}</span>
      <span class="role-name">${role.name}</span>
    </div>
    <div class="role-skill">${role.description}</div>
  `;

  console.log('✅ 顯示角色彈窗');
  modal.classList.add('show');
}

function closeRoleModal() {
  const modal = document.getElementById('role-modal');
  modal.classList.remove('show');

  // 標記角色彈窗已顯示過，並更新右上角顯示
  setRoleModalShown();
  updateRoleDisplay();
}

window.openRoleModal = openRoleModal;
window.closeRoleModal = closeRoleModal;

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

  document.getElementById('role-modal').addEventListener('click', (e) => {
    if (e.target.id === 'role-modal') {
      closeRoleModal();
    }
  });
}
