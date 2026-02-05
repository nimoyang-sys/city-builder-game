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
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    isConnected = true;
    console.log('✅ Connected to MongoDB');

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
