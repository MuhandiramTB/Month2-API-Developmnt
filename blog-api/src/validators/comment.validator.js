const { body } = require('express-validator');

const createCommentValidation = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Comment must be 1-2000 characters'),
  body('parent_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Parent ID must be a positive integer'),
];

module.exports = { createCommentValidation };
