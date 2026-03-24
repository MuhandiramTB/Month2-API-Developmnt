const jwt = require('jsonwebtoken');
const config = require('../config');
const ApiError = require('../utils/ApiError');
const { query } = require('../database/connection');

/**
 * Middleware: Require valid JWT token
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw ApiError.unauthorized('Access token is required');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret);

    // Verify user still exists in database
    const result = await query(
      'SELECT id, username, email, role FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      throw ApiError.unauthorized('User no longer exists');
    }

    req.user = result.rows[0];
    next();
  } catch (err) {
    if (err instanceof ApiError) return next(err);
    if (err.name === 'JsonWebTokenError') return next(ApiError.unauthorized('Invalid token'));
    if (err.name === 'TokenExpiredError') return next(ApiError.unauthorized('Token expired'));
    next(err);
  }
};

/**
 * Middleware: Optionally attach user if token present (does not block request)
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, config.jwt.secret);
      const result = await query(
        'SELECT id, username, email, role FROM users WHERE id = $1',
        [decoded.userId]
      );
      if (result.rows.length > 0) {
        req.user = result.rows[0];
      }
    }
  } catch (_) {
    // Ignore token errors — user simply won't be set
  }
  next();
};

/**
 * Middleware: Require admin role
 */
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return next(ApiError.forbidden('Admin access required'));
  }
  next();
};

module.exports = { authenticate, optionalAuth, requireAdmin };
