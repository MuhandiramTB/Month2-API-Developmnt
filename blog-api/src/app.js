const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');

const config = require('./config');
const swaggerSpec = require('./docs/swagger');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const postRoutes = require('./routes/post.routes');
const commentRoutes = require('./routes/comment.routes');

const app = express();

// ========================
// GLOBAL MIDDLEWARE
// ========================

// Security headers
app.use(helmet());

// CORS
app.use(cors());

// Request logging
if (config.nodeEnv !== 'test') {
  app.use(morgan('dev'));
}

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: {
    success: false,
    message: 'Too many requests, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// ========================
// API DOCUMENTATION
// ========================
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Blog API Documentation',
}));

// ========================
// ROUTES
// ========================

// Health check
app.get('/api/v1/health', (req, res) => {
  res.json({
    success: true,
    message: 'Blog API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// API v1 routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/posts', postRoutes);
app.use('/api/v1', commentRoutes);   // /api/v1/posts/:postId/comments & /api/v1/comments/:id

// ========================
// ERROR HANDLING
// ========================
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
