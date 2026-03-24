const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/database/connection');

// ================================================================
// Integration Tests — require a running PostgreSQL with seeded data
// Run: npm run seed && npm test
// ================================================================

// Shared state across test suites
let userAToken;   // john_doe (seeded user, id=2)
let userAId;
let userBToken;   // jane_smith (seeded user, id=3)
let userBId;
let newUserToken;  // freshly registered user
let newUserId;

let createdPostId;
let createdPostSlug;
let createdCommentId;

afterAll(async () => {
  // Clean up test artifacts created during the run
  // Delete the test user we registered (cascades to their posts/comments)
  if (newUserId) {
    await pool.query('DELETE FROM comments WHERE author_id = $1', [newUserId]);
    await pool.query('DELETE FROM posts WHERE author_id = $1', [newUserId]);
    await pool.query('DELETE FROM users WHERE id = $1', [newUserId]);
  }
  await pool.end();
});

// ================================================================
// 1. AUTH — Register & Login
// ================================================================
describe('Auth — Register & Login', () => {
  const uniqueSuffix = Date.now();

  it('POST /api/v1/auth/register — should register a new user', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        username: `testuser_${uniqueSuffix}`,
        email: `testuser_${uniqueSuffix}@test.com`,
        password: 'securePass123',
        full_name: 'Integration Tester',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.username).toBe(`testuser_${uniqueSuffix}`);
    expect(res.body.data.user.email).toBe(`testuser_${uniqueSuffix}@test.com`);
    // Should not expose password
    expect(res.body.data.user.password_hash).toBeUndefined();

    newUserToken = res.body.data.token;
    newUserId = res.body.data.user.id;
  });

  it('POST /api/v1/auth/register — should reject duplicate email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        username: 'another_user',
        email: `testuser_${uniqueSuffix}@test.com`, // same email as above
        password: 'securePass123',
      });

    // The app should return an error for duplicate
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('POST /api/v1/auth/login — should login seeded user john_doe', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'john@example.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe('john@example.com');

    userAToken = res.body.data.token;
    userAId = res.body.data.user.id;
  });

  it('POST /api/v1/auth/login — should login seeded user jane_smith', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'jane@example.com', password: 'password123' });

    expect(res.status).toBe(200);
    userBToken = res.body.data.token;
    userBId = res.body.data.user.id;
  });

  it('POST /api/v1/auth/login — should reject wrong password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'john@example.com', password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/v1/auth/login — should reject non-existent email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'noone@nowhere.com', password: 'password123' });

    expect(res.status).toBe(401);
  });
});

// ================================================================
// 2. USERS
// ================================================================
describe('Users', () => {
  it('GET /api/v1/users — should list all users', async () => {
    const res = await request(app).get('/api/v1/users');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    // Seeded 5 + 1 we registered
    expect(res.body.data.length).toBeGreaterThanOrEqual(5);
    // Public fields only
    expect(res.body.data[0]).toHaveProperty('username');
    expect(res.body.data[0]).not.toHaveProperty('password_hash');
    expect(res.body.data[0]).not.toHaveProperty('email');
  });

  it('GET /api/v1/users/:id — should return a specific user', async () => {
    const res = await request(app).get(`/api/v1/users/${userAId}`);

    expect(res.status).toBe(200);
    expect(res.body.data.username).toBe('john_doe');
  });

  it('GET /api/v1/users/:id — should return 404 for non-existent user', async () => {
    const res = await request(app).get('/api/v1/users/99999');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/v1/users/profile — should return own profile', async () => {
    const res = await request(app)
      .get('/api/v1/users/profile')
      .set('Authorization', `Bearer ${userAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe('john@example.com');
    expect(res.body.data).toHaveProperty('bio');
  });

  it('PUT /api/v1/users/profile — should update own profile', async () => {
    const res = await request(app)
      .put('/api/v1/users/profile')
      .set('Authorization', `Bearer ${newUserToken}`)
      .send({ full_name: 'Updated Tester', bio: 'I write integration tests' });

    expect(res.status).toBe(200);
    expect(res.body.data.full_name).toBe('Updated Tester');
    expect(res.body.data.bio).toBe('I write integration tests');
  });
});

// ================================================================
// 3. POSTS — Full CRUD
// ================================================================
describe('Posts — CRUD', () => {
  // ---- CREATE ----
  it('POST /api/v1/posts — should create a post', async () => {
    const res = await request(app)
      .post('/api/v1/posts')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        title: 'Integration Test Post',
        content: 'This post was created by an integration test to verify the full lifecycle.',
        excerpt: 'Integration test excerpt',
        status: 'published',
        tags: ['testing', 'integration'],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('Integration Test Post');
    expect(res.body.data.slug).toBe('integration-test-post');
    expect(res.body.data.status).toBe('published');
    expect(res.body.data.tags).toEqual(['testing', 'integration']);
    expect(res.body.data.author_id).toBe(userAId);

    createdPostId = res.body.data.id;
    createdPostSlug = res.body.data.slug;
  });

  it('POST /api/v1/posts — should default status to draft', async () => {
    const res = await request(app)
      .post('/api/v1/posts')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        title: 'Draft Post By Default',
        content: 'This should be a draft since no status was provided.',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('draft');

    // Clean up: delete this post right away
    await request(app)
      .delete(`/api/v1/posts/${res.body.data.id}`)
      .set('Authorization', `Bearer ${userAToken}`);
  });

  // ---- READ by ID ----
  it('GET /api/v1/posts/:id — should fetch the created post', async () => {
    const res = await request(app).get(`/api/v1/posts/${createdPostId}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(createdPostId);
    expect(res.body.data.title).toBe('Integration Test Post');
    expect(res.body.data.author_username).toBe('john_doe');
  });

  // ---- READ by slug ----
  it('GET /api/v1/posts/slug/:slug — should fetch post by slug', async () => {
    const res = await request(app).get(`/api/v1/posts/slug/${createdPostSlug}`);

    expect(res.status).toBe(200);
    expect(res.body.data.slug).toBe(createdPostSlug);
    expect(res.body.data.id).toBe(createdPostId);
  });

  // ---- READ by user ----
  it('GET /api/v1/posts/user/:userId — should list posts by user', async () => {
    const res = await request(app).get(`/api/v1/posts/user/${userAId}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.pagination).toBeDefined();
    // Every post should belong to userA
    res.body.data.forEach((post) => {
      expect(post.author_id).toBe(userAId);
    });
  });

  // ---- UPDATE ----
  it('PUT /api/v1/posts/:id — should update own post', async () => {
    const res = await request(app)
      .put(`/api/v1/posts/${createdPostId}`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        title: 'Updated Integration Test Post',
        content: 'Updated content for the integration test post with enough length.',
        status: 'archived',
        tags: ['testing', 'updated'],
      });

    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Updated Integration Test Post');
    expect(res.body.data.slug).toBe('updated-integration-test-post');
    expect(res.body.data.status).toBe('archived');
    expect(res.body.data.tags).toEqual(['testing', 'updated']);
  });

  // ---- READ all ----
  it('GET /api/v1/posts — should list posts', async () => {
    const res = await request(app).get('/api/v1/posts');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.total).toBeGreaterThanOrEqual(1);
  });

  // ---- DELETE ----
  // (tested later, after comments, so we can verify cascade-like behavior)
});

// ================================================================
// 4. COMMENTS — Create, list, get, delete
// ================================================================
describe('Comments', () => {
  it('POST /api/v1/posts/:postId/comments — should create a comment', async () => {
    // Comment on the first seeded post (id=1)
    const res = await request(app)
      .post('/api/v1/posts/1/comments')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ content: 'Comment from integration test' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.content).toBe('Comment from integration test');
    expect(res.body.data.post_id).toBe(1);
    expect(res.body.data.author_id).toBe(userAId);
    expect(res.body.data.author_username).toBe('john_doe');

    createdCommentId = res.body.data.id;
  });

  it('POST /api/v1/posts/:postId/comments — should create a reply (parent_id)', async () => {
    const res = await request(app)
      .post('/api/v1/posts/1/comments')
      .set('Authorization', `Bearer ${userBToken}`)
      .send({ content: 'Reply to the integration test comment', parent_id: createdCommentId });

    expect(res.status).toBe(201);
    expect(res.body.data.parent_id).toBe(createdCommentId);

    // Clean up reply
    await request(app)
      .delete(`/api/v1/comments/${res.body.data.id}`)
      .set('Authorization', `Bearer ${userBToken}`);
  });

  it('GET /api/v1/posts/:postId/comments — should list comments for a post', async () => {
    const res = await request(app).get('/api/v1/posts/1/comments');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.pagination).toBeDefined();
    // All comments belong to post 1
    res.body.data.forEach((c) => {
      expect(c.post_id).toBe(1);
    });
  });

  it('GET /api/v1/comments/:id — should fetch a single comment', async () => {
    const res = await request(app).get(`/api/v1/comments/${createdCommentId}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(createdCommentId);
    expect(res.body.data.author_username).toBeDefined();
  });

  it('DELETE /api/v1/comments/:id — owner should delete own comment', async () => {
    const res = await request(app)
      .delete(`/api/v1/comments/${createdCommentId}`)
      .set('Authorization', `Bearer ${userAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify it is gone
    const check = await request(app).get(`/api/v1/comments/${createdCommentId}`);
    expect(check.status).toBe(404);
  });

  it('POST /api/v1/posts/:postId/comments — should 404 for non-existent post', async () => {
    const res = await request(app)
      .post('/api/v1/posts/99999/comments')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ content: 'Comment on ghost post' });

    expect(res.status).toBe(404);
  });
});

// ================================================================
// 5. PAGINATION
// ================================================================
describe('Pagination', () => {
  it('GET /api/v1/posts?page=1&limit=2 — should paginate correctly', async () => {
    const res = await request(app).get('/api/v1/posts?page=1&limit=2');

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(2);
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.limit).toBe(2);
    expect(res.body.pagination.total).toBeGreaterThanOrEqual(3); // at least seeded posts
    expect(res.body.pagination.totalPages).toBeGreaterThanOrEqual(2);
    expect(res.body.pagination.hasNext).toBe(true);
    expect(res.body.pagination.hasPrev).toBe(false);
  });

  it('GET /api/v1/posts?page=2&limit=2 — should return page 2', async () => {
    const res = await request(app).get('/api/v1/posts?page=2&limit=2');

    expect(res.status).toBe(200);
    expect(res.body.pagination.page).toBe(2);
    expect(res.body.pagination.hasPrev).toBe(true);
  });

  it('GET /api/v1/posts/1/comments?page=1&limit=1 — should paginate comments', async () => {
    const res = await request(app).get('/api/v1/posts/1/comments?page=1&limit=1');

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(1);
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.limit).toBe(1);
  });
});

// ================================================================
// 6. FILTERING & SEARCH
// ================================================================
describe('Filtering & Search', () => {
  it('GET /api/v1/posts?status=published — should only return published posts', async () => {
    const res = await request(app).get('/api/v1/posts?status=published');

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    res.body.data.forEach((post) => {
      expect(post.status).toBe('published');
    });
  });

  it('GET /api/v1/posts?status=draft — should only return draft posts', async () => {
    const res = await request(app).get('/api/v1/posts?status=draft');

    expect(res.status).toBe(200);
    // The seed has 1 draft post ("Docker for Node.js Apps")
    res.body.data.forEach((post) => {
      expect(post.status).toBe('draft');
    });
  });

  it('GET /api/v1/posts?tag=nodejs — should filter by tag', async () => {
    const res = await request(app).get('/api/v1/posts?tag=nodejs');

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    res.body.data.forEach((post) => {
      expect(post.tags).toContain('nodejs');
    });
  });

  it('GET /api/v1/posts?tag=postgresql — should filter by specific tag', async () => {
    const res = await request(app).get('/api/v1/posts?tag=postgresql');

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    res.body.data.forEach((post) => {
      expect(post.tags).toContain('postgresql');
    });
  });

  it('GET /api/v1/posts?search=Node.js — should search in title/content', async () => {
    const res = await request(app).get('/api/v1/posts?search=Node.js');

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/v1/posts?search=xyznonexistent — should return empty for no match', async () => {
    const res = await request(app).get('/api/v1/posts?search=xyznonexistent');

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(0);
    expect(res.body.pagination.total).toBe(0);
  });

  it('GET /api/v1/posts?author_id=X — should filter by author', async () => {
    const res = await request(app).get(`/api/v1/posts?author_id=${userAId}`);

    expect(res.status).toBe(200);
    res.body.data.forEach((post) => {
      expect(post.author_id).toBe(userAId);
    });
  });

  it('GET /api/v1/posts?status=published&tag=nodejs — combined filters', async () => {
    const res = await request(app).get('/api/v1/posts?status=published&tag=nodejs');

    expect(res.status).toBe(200);
    res.body.data.forEach((post) => {
      expect(post.status).toBe('published');
      expect(post.tags).toContain('nodejs');
    });
  });

  it('GET /api/v1/posts?sort=title&order=ASC — should sort by title ascending', async () => {
    const res = await request(app).get('/api/v1/posts?sort=title&order=ASC');

    expect(res.status).toBe(200);
    const titles = res.body.data.map((p) => p.title);
    const sorted = [...titles].sort((a, b) => a.localeCompare(b));
    expect(titles).toEqual(sorted);
  });
});

// ================================================================
// 7. AUTHORIZATION — cannot modify another user's resources
// ================================================================
describe('Authorization', () => {
  it('PUT /api/v1/posts/:id — should 403 when updating another user\'s post', async () => {
    // createdPostId belongs to userA; try to update with userB's token
    const res = await request(app)
      .put(`/api/v1/posts/${createdPostId}`)
      .set('Authorization', `Bearer ${userBToken}`)
      .send({ title: 'Hijacked Title That Should Fail' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('DELETE /api/v1/posts/:id — should 403 when deleting another user\'s post', async () => {
    const res = await request(app)
      .delete(`/api/v1/posts/${createdPostId}`)
      .set('Authorization', `Bearer ${userBToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('DELETE /api/v1/comments/:id — should 403 when deleting another user\'s comment', async () => {
    // Create a comment as userA on post 1
    const createRes = await request(app)
      .post('/api/v1/posts/1/comments')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ content: 'Temporary comment for auth test' });

    const commentId = createRes.body.data.id;

    // Try to delete as userB
    const res = await request(app)
      .delete(`/api/v1/comments/${commentId}`)
      .set('Authorization', `Bearer ${userBToken}`);

    expect(res.status).toBe(403);

    // Clean up: delete as the owner
    await request(app)
      .delete(`/api/v1/comments/${commentId}`)
      .set('Authorization', `Bearer ${userAToken}`);
  });
});

// ================================================================
// 8. VALIDATION ERRORS (400)
// ================================================================
describe('Validation Errors', () => {
  it('POST /api/v1/posts — should 400 with missing title', async () => {
    const res = await request(app)
      .post('/api/v1/posts')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ content: 'Content without a title, this has enough length.' });

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });

  it('POST /api/v1/posts — should 400 with too-short content', async () => {
    const res = await request(app)
      .post('/api/v1/posts')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ title: 'Valid Title', content: 'Short' });

    expect(res.status).toBe(400);
  });

  it('POST /api/v1/posts — should 400 with invalid status', async () => {
    const res = await request(app)
      .post('/api/v1/posts')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ title: 'Valid Title', content: 'Valid long enough content here', status: 'invalid_status' });

    expect(res.status).toBe(400);
  });

  it('POST /api/v1/posts — should 400 when tags is not an array', async () => {
    const res = await request(app)
      .post('/api/v1/posts')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ title: 'Valid Title', content: 'Valid long enough content here', tags: 'not-an-array' });

    expect(res.status).toBe(400);
  });

  it('POST /api/v1/posts/:postId/comments — should 400 with empty content', async () => {
    const res = await request(app)
      .post('/api/v1/posts/1/comments')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ content: '' });

    expect(res.status).toBe(400);
  });

  it('POST /api/v1/auth/register — should 400 with missing fields', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.errors.length).toBeGreaterThan(0);
  });

  it('POST /api/v1/auth/login — should 400 with missing fields', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({});

    expect(res.status).toBe(400);
  });
});

// ================================================================
// 9. 404 — Non-existent resources
// ================================================================
describe('404 — Non-existent resources', () => {
  it('GET /api/v1/posts/99999 — should 404', async () => {
    const res = await request(app).get('/api/v1/posts/99999');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/v1/posts/slug/nonexistent-slug-xyz — should 404', async () => {
    const res = await request(app).get('/api/v1/posts/slug/nonexistent-slug-xyz');
    expect(res.status).toBe(404);
  });

  it('GET /api/v1/comments/99999 — should 404', async () => {
    const res = await request(app).get('/api/v1/comments/99999');
    expect(res.status).toBe(404);
  });

  it('GET /api/v1/users/99999 — should 404', async () => {
    const res = await request(app).get('/api/v1/users/99999');
    expect(res.status).toBe(404);
  });

  it('PUT /api/v1/posts/99999 — should 404', async () => {
    const res = await request(app)
      .put('/api/v1/posts/99999')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ title: 'Ghost post update' });

    expect(res.status).toBe(404);
  });

  it('DELETE /api/v1/posts/99999 — should 404', async () => {
    const res = await request(app)
      .delete('/api/v1/posts/99999')
      .set('Authorization', `Bearer ${userAToken}`);

    expect(res.status).toBe(404);
  });

  it('DELETE /api/v1/comments/99999 — should 404', async () => {
    const res = await request(app)
      .delete('/api/v1/comments/99999')
      .set('Authorization', `Bearer ${userAToken}`);

    expect(res.status).toBe(404);
  });

  it('GET /api/v1/posts/99999/comments — should 404 for comments of non-existent post', async () => {
    const res = await request(app).get('/api/v1/posts/99999/comments');
    expect(res.status).toBe(404);
  });
});

// ================================================================
// 10. POST DELETION — clean up the post we created (owner can delete)
// ================================================================
describe('Post Deletion', () => {
  it('DELETE /api/v1/posts/:id — owner should delete own post', async () => {
    const res = await request(app)
      .delete(`/api/v1/posts/${createdPostId}`)
      .set('Authorization', `Bearer ${userAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Confirm it is gone
    const check = await request(app).get(`/api/v1/posts/${createdPostId}`);
    expect(check.status).toBe(404);
  });
});
