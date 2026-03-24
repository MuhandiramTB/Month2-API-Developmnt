const { Router } = require('express');
const {
  createComment, getCommentsByPost, getCommentById, deleteComment,
} = require('../controllers/comment.controller');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createCommentValidation } = require('../validators/comment.validator');

const router = Router();

/**
 * @swagger
 * /api/v1/posts/{postId}/comments:
 *   get:
 *     summary: Get all comments for a post
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: List of comments
 *       404:
 *         description: Post not found
 */
router.get('/posts/:postId/comments', getCommentsByPost);

/**
 * @swagger
 * /api/v1/posts/{postId}/comments:
 *   post:
 *     summary: Add a comment to a post
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content:
 *                 type: string
 *                 example: Great post!
 *               parent_id:
 *                 type: integer
 *                 description: ID of parent comment for replies
 *     responses:
 *       201:
 *         description: Comment created
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Post not found
 */
router.post('/posts/:postId/comments', authenticate, validate(createCommentValidation), createComment);

/**
 * @swagger
 * /api/v1/comments/{id}:
 *   get:
 *     summary: Get a comment by ID
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Comment details
 *       404:
 *         description: Comment not found
 */
router.get('/comments/:id', getCommentById);

/**
 * @swagger
 * /api/v1/comments/{id}:
 *   delete:
 *     summary: Delete a comment
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Comment deleted
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Comment not found
 */
router.delete('/comments/:id', authenticate, deleteComment);

module.exports = router;
