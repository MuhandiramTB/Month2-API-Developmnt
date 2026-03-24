const { query } = require('../database/connection');
const ApiError = require('../utils/ApiError');
const { apiResponse, paginatedResponse } = require('../utils/helpers');

/**
 * POST /api/v1/posts/:postId/comments
 */
const createComment = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const { content, parent_id } = req.body;

    // Verify post exists
    const postCheck = await query('SELECT id FROM posts WHERE id = $1', [postId]);
    if (postCheck.rows.length === 0) throw ApiError.notFound('Post not found');

    // Verify parent comment exists (if provided)
    if (parent_id) {
      const parentCheck = await query(
        'SELECT id FROM comments WHERE id = $1 AND post_id = $2',
        [parent_id, postId]
      );
      if (parentCheck.rows.length === 0) {
        throw ApiError.badRequest('Parent comment not found in this post');
      }
    }

    const result = await query(
      `INSERT INTO comments (content, post_id, author_id, parent_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [content, postId, req.user.id, parent_id || null]
    );

    // Fetch with author info
    const comment = await query(
      `SELECT c.*, u.username AS author_username
       FROM comments c JOIN users u ON c.author_id = u.id
       WHERE c.id = $1`,
      [result.rows[0].id]
    );

    apiResponse(res, 201, comment.rows[0], 'Comment created');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/posts/:postId/comments
 */
const getCommentsByPost = async (req, res, next) => {
  try {
    const { postId } = req.params;
    let { page = 1, limit = 20 } = req.query;
    page = Math.max(1, parseInt(page, 10));
    limit = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const offset = (page - 1) * limit;

    // Verify post exists
    const postCheck = await query('SELECT id FROM posts WHERE id = $1', [postId]);
    if (postCheck.rows.length === 0) throw ApiError.notFound('Post not found');

    const countResult = await query(
      'SELECT COUNT(*) FROM comments WHERE post_id = $1',
      [postId]
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const result = await query(
      `SELECT c.*, u.username AS author_username, u.full_name AS author_name
       FROM comments c
       JOIN users u ON c.author_id = u.id
       WHERE c.post_id = $1
       ORDER BY c.created_at ASC
       LIMIT $2 OFFSET $3`,
      [postId, limit, offset]
    );

    paginatedResponse(res, { rows: result.rows, total, page, limit });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/comments/:id
 */
const getCommentById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT c.*, u.username AS author_username, u.full_name AS author_name
       FROM comments c
       JOIN users u ON c.author_id = u.id
       WHERE c.id = $1`,
      [id]
    );

    if (result.rows.length === 0) throw ApiError.notFound('Comment not found');

    apiResponse(res, 200, result.rows[0]);
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/v1/comments/:id
 */
const deleteComment = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await query('SELECT author_id FROM comments WHERE id = $1', [id]);
    if (existing.rows.length === 0) throw ApiError.notFound('Comment not found');
    if (existing.rows[0].author_id !== req.user.id && req.user.role !== 'admin') {
      throw ApiError.forbidden('You can only delete your own comments');
    }

    await query('DELETE FROM comments WHERE id = $1', [id]);

    apiResponse(res, 200, null, 'Comment deleted');
  } catch (err) {
    next(err);
  }
};

module.exports = { createComment, getCommentsByPost, getCommentById, deleteComment };
