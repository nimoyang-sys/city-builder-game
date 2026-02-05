/**
 * 效能測試腳本
 * 模擬 30 個玩家同時連線
 */

import { io as ioClient } from 'socket.io-client';

const SERVER_URL = 'http://localhost:3000';
const PLAYER_COUNT = 30;
const clients = [];

console.log(`🚀 開始效能測試：模擬 ${PLAYER_COUNT} 個玩家同時連線\n`);

// 創建多個玩家連線
for (let i = 1; i <= PLAYER_COUNT; i++) {
  const client = ioClient(SERVER_URL, {
    transports: ['websocket'],
    reconnection: true
  });

  client.on('connect', () => {
    console.log(`✅ 玩家 ${i} 已連線 (${client.id})`);

    // 加入遊戲
    client.emit('player:join', {
      name: `測試玩家${i}`,
      password: `test${i}`,
      tableNumber: `${Math.floor((i - 1) / 10) + 1}`
    });
  });

  client.on('player:joined', (data) => {
    console.log(`🎮 玩家 ${i} 加入成功`);
  });

  client.on('player:error', (error) => {
    console.error(`❌ 玩家 ${i} 錯誤:`, error.message);
  });

  client.on('disconnect', () => {
    console.log(`⚠️  玩家 ${i} 斷線`);
  });

  client.on('connect_error', (error) => {
    console.error(`❌ 玩家 ${i} 連線錯誤:`, error.message);
  });

  clients.push(client);

  // 延遲 100ms 避免同時大量連線
  await new Promise(resolve => setTimeout(resolve, 100));
}

console.log(`\n✅ 已發送 ${PLAYER_COUNT} 個連線請求`);
console.log('📊 等待 10 秒後查看伺服器狀態...\n');

// 10 秒後查詢伺服器狀態
setTimeout(async () => {
  try {
    const response = await fetch(`${SERVER_URL}/api/server/status`);
    const status = await response.json();

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 伺服器狀態報告');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`⏱️  運行時間: ${Math.floor(status.server.uptime)}秒`);
    console.log(`💾 記憶體使用: ${Math.round(status.server.memory.heapUsed / 1024 / 1024)}MB / ${Math.round(status.server.memory.heapTotal / 1024 / 1024)}MB`);
    console.log(`🔌 Socket 連線數: ${status.socketIO.connectedClients}`);
    console.log(`🗄️  資料庫狀態: ${status.database.connected ? '✅ 已連線' : '❌ 未連線'}`);
    console.log(`🎮 遊戲玩家數: ${status.game.players}`);
    console.log(`🏗️  城市建築數: ${status.game.buildings}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 測試建築購買（隨機選 5 個玩家）
    console.log('🏗️  測試建築購買功能...\n');
    const testClients = clients.slice(0, 5);

    testClients.forEach((client, idx) => {
      client.emit('player:buyBuilding', { buildingId: 'HOUSE' });
      console.log(`📦 玩家 ${idx + 1} 購買建築`);
    });

    console.log('\n✅ 效能測試完成！');
    console.log('💡 提示: 查看伺服器終端的日誌輸出\n');

    // 20 秒後斷開所有連線
    setTimeout(() => {
      console.log('🔌 關閉所有測試連線...\n');
      clients.forEach(client => client.disconnect());
      process.exit(0);
    }, 10000);

  } catch (error) {
    console.error('❌ 無法取得伺服器狀態:', error.message);
    clients.forEach(client => client.disconnect());
    process.exit(1);
  }
}, 10000);
