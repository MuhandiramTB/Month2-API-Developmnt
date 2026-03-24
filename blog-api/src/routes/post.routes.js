const { Router } = require('express');
const {
  createPost, getAllPosts, getPostById, getPostBySlug,
  updatePost, deletePost, getPostsByUser,
} = require('../controllers/post.controller');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createPostValidation, updatePostValidation } = require('../validators/post.validator');
const { cacheMiddleware, invalidateCache } = require('../middleware/cache');

const router = Router();
const postCache = cacheMiddleware();
const clearPostsCache = invalidateCache('cache:/api/v1/posts*');

/**
 * @swagger
 * /api/v1/posts:
 *   get:
 *     summary: Get all posts (with pagination & filtering)
 *     tags: [Posts]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [draft, published, archived] }
 *       - in: query
 *         name: author_id
 *         schema: { type: integer }
 *       - in: query
 *         name: tag
 *         schema: { type: string }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: sort
 *         schema: { type: string, enum: [created_at, updated_at, title], default: created_at }
 *       - in: query
 *         name: order
 *         schema: { type: string, enum: [ASC, DESC], default: DESC }
 *     responses:
 *       200:
 *         description: Paginated list of posts
 */
router.get('/', postCache, getAllPosts);

/**
 * @swagger
 * /api/v1/posts/slug/{slug}:
 *   get:
 *     summary: Get post by slug
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Post details
 *       404:
 *         description: Post not found
 */
router.get('/slug/:slug', postCache, getPostBySlug);

/**
 * @swagger
 * /api/v1/posts/user/{userId}:
 *   get:
 *     summary: Get posts by user
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: User's posts
 */
router.get('/user/:userId', postCache, getPostsByUser);

/**
 * @swagger
 * /api/v1/posts/{id}:
 *   get:
 *     summary: Get post by ID
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Post details
 *       404:
 *         description: Post not found
 */
router.get('/:id', postCache, getPostById);

/**
 * @swagger
 * /api/v1/posts:
 *   post:
 *     summary: Create a new post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, content]
 *             properties:
 *               title:
 *                 type: string
 *                 example: My New Blog Post
 *               content:
 *                 type: string
 *                 example: This is the full content of the post...
 *               excerpt:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [draft, published, archived]
 *               tags:
 *                 type: array
 *                 items: { type: string }
 *     responses:
 *       201:
 *         description: Post created
 *       401:
 *         description: Not authenticated
 */
router.post('/', authenticate, validate(createPostValidation), clearPostsCache, createPost);

/**
 * @swagger
 * /api/v1/posts/{id}:
 *   put:
 *     summary: Update a post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string }
 *               content: { type: string }
 *               excerpt: { type: string }
 *               status: { type: string }
 *               tags: { type: array, items: { type: string } }
 *     responses:
 *       200:
 *         description: Post updated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Post not found
 */
router.put('/:id', authenticate, validate(updatePostValidation), clearPostsCache, updatePost);

/**
 * @swagger
 * /api/v1/posts/{id}:
 *   delete:
 *     summary: Delete a post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Post deleted
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Post not found
 */
router.delete('/:id', authenticate, clearPostsCache, deletePost);

module.exports = router;
