/**
 * Generate a URL-safe slug from a string
 */
const slugify = (text) =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

/**
 * Build a standardized API response
 */
const apiResponse = (res, statusCode, data, message = 'Success') => {
  return res.status(statusCode).json({
    success: statusCode < 400,
    message,
    data,
  });
};

/**
 * Build a paginated response
 */
const paginatedResponse = (res, { rows, total, page, limit }) => {
  const totalPages = Math.ceil(total / limit);
  return res.status(200).json({
    success: true,
    message: 'Success',
    data: rows,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  });
};

module.exports = { slugify, apiResponse, paginatedResponse };
