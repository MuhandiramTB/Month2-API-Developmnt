const request = require('supertest');
const app = require('../src/app');

// ============================================================
// These tests run against the Express app WITHOUT a database.
// They verify routing, validation, middleware, and error handling.
// For full integration tests, start PostgreSQL and use a test DB.
// ============================================================

describe('Blog API — Route & Middleware Tests', () => {
  // ----------------------------------------------------------
  // Health Check
  // ----------------------------------------------------------
  describe('GET /api/v1/health', () => {
    it('should return health status', async () => {
      const res = await request(app).get('/api/v1/health');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/running/i);
    });
  });

  // ----------------------------------------------------------
  // 404 Handler
  // ----------------------------------------------------------
  describe('Unknown route', () => {
    it('should return 404 for unknown routes', async () => {
      const res = await request(app).get('/api/v1/nonexistent');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // ----------------------------------------------------------
  // Auth Validation
  // ----------------------------------------------------------
  describe('POST /api/v1/auth/register — validation', () => {
    it('should reject empty body', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.errors.length).toBeGreaterThan(0);
    });

    it('should reject invalid email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ username: 'test', email: 'not-an-email', password: 'password123' });
      expect(res.status).toBe(400);
      expect(res.body.errors.some(e => e.field === 'email')).toBe(true);
    });

    it('should reject short password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ username: 'test', email: 'test@test.com', password: '12' });
      expect(res.status).toBe(400);
      expect(res.body.errors.some(e => e.field === 'password')).toBe(true);
    });

    it('should reject short username', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ username: 'ab', email: 'test@test.com', password: 'password123' });
      expect(res.status).toBe(400);
      expect(res.body.errors.some(e => e.field === 'username')).toBe(true);
    });
  });

  describe('POST /api/v1/auth/login — validation', () => {
    it('should reject missing fields', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({});
      expect(res.status).toBe(400);
    });
  });

  // ----------------------------------------------------------
  // Post Validation
  // ----------------------------------------------------------
  describe('POST /api/v1/posts — auth & validation', () => {
    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .post('/api/v1/posts')
        .send({ title: 'Test', content: 'Test content here' });
      expect(res.status).toBe(401);
    });

    it('should reject invalid token', async () => {
      const res = await request(app)
        .post('/api/v1/posts')
        .set('Authorization', 'Bearer invalid.token.here')
        .send({ title: 'Test', content: 'Test content here' });
      expect(res.status).toBe(401);
    });
  });

  // ----------------------------------------------------------
  // Comment Routes — auth guard
  // ----------------------------------------------------------
  describe('POST /api/v1/posts/1/comments — auth', () => {
    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .post('/api/v1/posts/1/comments')
        .send({ content: 'Nice post!' });
      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /api/v1/comments/1 — auth', () => {
    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .delete('/api/v1/comments/1');
      expect(res.status).toBe(401);
    });
  });

  // ----------------------------------------------------------
  // Protected User Routes
  // ----------------------------------------------------------
  describe('GET /api/v1/users/profile — auth', () => {
    it('should reject unauthenticated request', async () => {
      const res = await request(app).get('/api/v1/users/profile');
      expect(res.status).toBe(401);
    });
  });

  describe('PUT /api/v1/users/profile — auth', () => {
    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .put('/api/v1/users/profile')
        .send({ full_name: 'New Name' });
      expect(res.status).toBe(401);
    });
  });
});
