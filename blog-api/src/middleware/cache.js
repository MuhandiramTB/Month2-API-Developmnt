const { getRedisClient, isRedisConnected } = require('../config/redis');

/**
 * Cache middleware for GET requests.
 * If Redis is unavailable, requests pass through without caching.
 * @param {number} ttl - Time to live in seconds (default: CACHE_TTL env or 60)
 */
const cacheMiddleware = (ttl) => {
  const cacheTTL = ttl || parseInt(process.env.CACHE_TTL, 10) || 60;

  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') return next();

    // Skip if Redis is not connected
    if (!isRedisConnected()) return next();

    try {
      const client = await getRedisClient();
      if (!client) return next();

      const key = `cache:${req.originalUrl || req.url}`;
      const cached = await client.get(key);

      if (cached) {
        const parsed = JSON.parse(cached);
        return res.status(200).json(parsed);
      }

      // Store original json method to intercept the response
      const originalJson = res.json.bind(res);
      res.json = (body) => {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          client.setEx(key, cacheTTL, JSON.stringify(body)).catch((err) => {
            console.warn('Redis cache write error:', err.message);
          });
        }
        return originalJson(body);
      };

      next();
    } catch (err) {
      console.warn('Cache middleware error:', err.message);
      next();
    }
  };
};

/**
 * Clear cached entries matching a pattern.
 * @param {string} pattern - Redis key pattern (e.g., 'cache:/api/v1/posts*')
 */
const clearCache = async (pattern) => {
  if (!isRedisConnected()) return;

  try {
    const client = await getRedisClient();
    if (!client) return;

    const keys = [];
    for await (const key of client.scanIterator({ MATCH: pattern, COUNT: 100 })) {
      keys.push(key);
    }

    if (keys.length > 0) {
      await client.del(keys);
    }
  } catch (err) {
    console.warn('Cache clear error:', err.message);
  }
};

/**
 * Middleware that clears related cache entries after mutating operations.
 * Attach to POST, PUT, DELETE routes.
 * @param  {...string} patterns - Cache key patterns to clear
 */
const invalidateCache = (...patterns) => {
  return async (req, res, next) => {
    // Store original json method to clear cache after successful mutation
    const originalJson = res.json.bind(res);
    res.json = async (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        for (const pattern of patterns) {
          await clearCache(pattern);
        }
      }
      return originalJson(body);
    };
    next();
  };
};

module.exports = { cacheMiddleware, clearCache, invalidateCache };
