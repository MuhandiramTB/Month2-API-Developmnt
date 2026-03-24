const { Pool } = require('pg');
const config = require('../config');

// Connection pool for efficient database access
const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  database: config.db.database,
  user: config.db.user,
  password: config.db.password,
  max: 20,               // Maximum connections in pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Log pool connection events in development
pool.on('connect', () => {
  if (config.nodeEnv === 'development') {
    console.log('📦 New client connected to PostgreSQL pool');
  }
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client:', err);
  process.exit(-1);
});

// Helper: run a single query
const query = (text, params) => pool.query(text, params);

// Helper: get a client for transactions
const getClient = () => pool.connect();

module.exports = { pool, query, getClient };
