const { createClient } = require('redis');

let client = null;
let isConnected = false;
let connectionAttempted = false;

const getRedisClient = async () => {
  if (isConnected && client) return client;
  if (connectionAttempted) return null; // Don't retry if already failed

  connectionAttempted = true;

  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    client = createClient({
      url: redisUrl,
      socket: {
        connectTimeout: 3000,
        reconnectStrategy: false, // Don't auto-reconnect if unavailable
      },
    });

    client.on('error', () => {
      isConnected = false;
    });

    await client.connect();
    isConnected = true;
    console.log('✅ Connected to Redis (caching enabled)');
    return client;
  } catch (err) {
    console.log('ℹ️  Redis unavailable — caching disabled (this is OK)');
    client = null;
    isConnected = false;
    return null;
  }
};

const isRedisConnected = () => isConnected;

// Attempt connection on startup (non-blocking)
getRedisClient().catch(() => {});

module.exports = { getRedisClient, isRedisConnected };
