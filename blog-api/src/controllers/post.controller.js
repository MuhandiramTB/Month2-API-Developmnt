const { query } = require('../database/connection');
const ApiError = require('../utils/ApiError');
const { apiResponse, paginatedResponse, slugify } = require('../utils/helpers');

/**
 * POST /api/v1/posts
 */
const createPost = async (req, res, next) => {
  try {
    const { title, content, excerpt, status, tags } = req.body;

    // Generate unique slug
    let slug = slugify(title);
    const slugCheck = await query('SELECT id FROM posts WHERE slug = $1', [slug]);
    if (slugCheck.rows.length > 0) {
      slug = `${slug}-${Date.now()}`;
    }

    const result = await query(
      `INSERT INTO posts (title, slug, content, excerpt, status, author_id, tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [title, slug, content, excerpt || null, status || 'draft', req.user.id, tags || []]
    );

    apiResponse(res, 201, result.rows[0], 'Post created');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/posts
 * Supports: ?page=1&limit=10&status=published&author_id=1&tag=nodejs&search=keyword&sort=created_at&order=desc
 */
const getAllPosts = async (req, res, next) => {
  try {
    let {
      page = 1,
      limit = 10,
      status,
      author_id,
      tag,
      search,
      sort = 'created_at',
      order = 'DESC',
    } = req.query;

    page = Math.max(1, parseInt(page, 10));
    limit = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const offset = (page - 1) * limit;

    // Whitelist sort columns to prevent SQL injection
    const allowedSorts = ['created_at', 'updated_at', 'title'];
    if (!allowedSorts.includes(sort)) sort = 'created_at';
    order = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Build dynamic WHERE clause
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (status) {
      conditions.push(`p.status = $${paramIndex++}`);
      params.push(status);
    }
    if (author_id) {
      conditions.push(`p.author_id = $${paramIndex++}`);
      params.push(author_id);
    }
    if (tag) {
      conditions.push(`$${paramIndex++} = ANY(p.tags)`);
      params.push(tag);
    }
    if (search) {
      conditions.push(`(p.title ILIKE $${paramIndex} OR p.content ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count total
    const countResult = await query(
      `SELECT COUNT(*) FROM posts p ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Fetch posts with author info
    const postsResult = await query(
      `SELECT p.*, u.username AS author_username, u.full_name AS author_name
       FROM posts p
       JOIN users u ON p.author_id = u.id
       ${whereClause}
       ORDER BY p.${sort} ${order}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    paginatedResponse(res, { rows: postsResult.rows, total, page, limit });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/posts/:id
 */
const getPostById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT p.*, u.username AS author_username, u.full_name AS author_name
       FROM posts p
       JOIN users u ON p.author_id = u.id
       WHERE p.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      throw ApiError.notFound('Post not found');
    }

    apiResponse(res, 200, result.rows[0]);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/posts/slug/:slug
 */
const getPostBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;

    const result = await query(
      `SELECT p.*, u.username AS author_username, u.full_name AS author_name
       FROM posts p
       JOIN users u ON p.author_id = u.id
       WHERE p.slug = $1`,
      [slug]
    );

    if (result.rows.length === 0) {
      throw ApiError.notFound('Post not found');
    }

    apiResponse(res, 200, result.rows[0]);
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/v1/posts/:id
 */
const updatePost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, content, excerpt, status, tags } = req.body;

    // Check ownership
    const existing = await query('SELECT author_id FROM posts WHERE id = $1', [id]);
    if (existing.rows.length === 0) throw ApiError.notFound('Post not found');
    if (existing.rows[0].author_id !== req.user.id && req.user.role !== 'admin') {
      throw ApiError.forbidden('You can only edit your own posts');
    }

    // Re-slug if title changed
    let slug;
    if (title) {
      slug = slugify(title);
      const slugCheck = await query('SELECT id FROM posts WHERE slug = $1 AND id != $2', [slug, id]);
      if (slugCheck.rows.length > 0) slug = `${slug}-${Date.now()}`;
    }

    const result = await query(
      `UPDATE posts
       SET title   = COALESCE($1, title),
           slug    = COALESCE($2, slug),
           content = COALESCE($3, content),
           excerpt = COALESCE($4, excerpt),
           status  = COALESCE($5, status),
           tags    = COALESCE($6, tags)
       WHERE id = $7
       RETURNING *`,
      [title || null, slug || null, content || null, excerpt, status || null, tags || null, id]
    );

    apiResponse(res, 200, result.rows[0], 'Post updated');
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/v1/posts/:id
 */
const deletePost = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await query('SELECT author_id FROM posts WHERE id = $1', [id]);
    if (existing.rows.length === 0) throw ApiError.notFound('Post not found');
    if (existing.rows[0].author_id !== req.user.id && req.user.role !== 'admin') {
      throw ApiError.forbidden('You can only delete your own posts');
    }

    await query('DELETE FROM posts WHERE id = $1', [id]);

    apiResponse(res, 200, null, 'Post deleted');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/posts/user/:userId
 */
const getPostsByUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    let { page = 1, limit = 10 } = req.query;
    page = Math.max(1, parseInt(page, 10));
    limit = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const offset = (page - 1) * limit;

    const countResult = await query(
      'SELECT COUNT(*) FROM posts WHERE author_id = $1',
      [userId]
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const result = await query(
      `SELECT p.*, u.username AS author_username
       FROM posts p JOIN users u ON p.author_id = u.id
       WHERE p.author_id = $1
       ORDER BY p.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    paginatedResponse(res, { rows: result.rows, total, page, limit });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createPost, getAllPosts, getPostById, getPostBySlug,
  updatePost, deletePost, getPostsByUser,
};
