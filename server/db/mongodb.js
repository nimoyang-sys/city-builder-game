/**
 * MongoDB 連線管理
 */

import mongoose from 'mongoose';

let isConnected = false;

/**
 * 連接到 MongoDB
 */
export async function connectDB() {
  if (isConnected) {
    console.log('✅ Already connected to MongoDB');
    return;
  }

  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    console.warn('⚠️  MONGODB_URI not set, running without database persistence');
    return;
  }

  try {
    console.log('🔌 Connecting to MongoDB...');

    await mongoose.connect(MONGODB_URI, {
      // 連線逾時設定（提高以應對高並發）
      serverSelectionTimeoutMS: 10000,  // 5s → 10s
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,

      // 連線池設定（支援 30+ 玩家同時在線）
      maxPoolSize: 50,        // 最大連線數
      minPoolSize: 10,        // 最小連線數
      maxIdleTimeMS: 60000,   // 連線閒置時間

      // 效能優化
      retryWrites: true,      // 自動重試寫入
      w: 'majority',          // 寫入確認級別
    });

    isConnected = true;
    console.log('✅ Connected to MongoDB (Pool: 10-50 connections)');

    // 處理連線錯誤
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
      isConnected = false;
    });

    // 處理連線斷開
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected');
      isConnected = false;
    });

    // 處理應用程式結束
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed through app termination');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error.message);
    console.warn('⚠️  Running without database persistence');
  }
}

/**
 * 檢查是否已連接
 */
export function isDBConnected() {
  return isConnected && mongoose.connection.readyState === 1;
}

/**
 * 關閉連線
 */
export async function closeDB() {
  if (isConnected) {
    await mongoose.connection.close();
    isConnected = false;
    console.log('MongoDB connection closed');
  }
}
