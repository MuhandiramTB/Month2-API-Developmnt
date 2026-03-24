const app = require('./app');
const config = require('./config');
const { pool } = require('./database/connection');
const { getRedisClient } = require('./config/redis');

const startServer = async () => {
  try {
    // Test database connection
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL database');
    client.release();

    // Attempt Redis connection (optional - won't block startup)
    await getRedisClient();

    // Start server
    app.listen(config.port, () => {
      console.log(`
╔══════════════════════════════════════════════╗
║           🚀 Blog API Server                 ║
╠══════════════════════════════════════════════╣
║  Environment : ${config.nodeEnv.padEnd(29)}║
║  Port        : ${String(config.port).padEnd(29)}║
║  API         : http://localhost:${config.port}/api/v1     ║
║  Docs        : http://localhost:${config.port}/api-docs   ║
║  Health      : http://localhost:${config.port}/api/v1/health ║
╚══════════════════════════════════════════════╝
      `);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('\n🛑 SIGTERM received. Shutting down gracefully...');
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\n🛑 SIGINT received. Shutting down gracefully...');
  await pool.end();
  process.exit(0);
});

startServer();
