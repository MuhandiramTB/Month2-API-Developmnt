const config = require('../config');
const ApiError = require('../utils/ApiError');

/**
 * Central error-handling middleware
 * Express recognises this as an error handler because it has 4 parameters.
 */
const errorHandler = (err, req, res, _next) => {
  // Default values
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errors = err.errors || [];

  // PostgreSQL unique-violation → 409 Conflict
  if (err.code === '23505') {
    statusCode = 409;
    message = 'Resource already exists';
    const detail = err.detail || '';
    if (detail.includes('username')) message = 'Username already taken';
    if (detail.includes('email')) message = 'Email already registered';
    if (detail.includes('slug')) message = 'Post slug already exists';
  }

  // PostgreSQL foreign-key violation
  if (err.code === '23503') {
    statusCode = 400;
    message = 'Referenced resource does not exist';
  }

  // Log in development
  if (config.nodeEnv === 'development') {
    console.error('❌ Error:', {
      statusCode,
      message,
      stack: err.stack,
    });
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors,
    ...(config.nodeEnv === 'development' && { stack: err.stack }),
  });
};

/**
 * 404 handler for unmatched routes
 */
const notFoundHandler = (req, res, next) => {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
};

module.exports = { errorHandler, notFoundHandler };
