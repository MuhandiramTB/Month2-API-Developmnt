const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

/**
 * Middleware: run express-validator checks and return 400 on failure
 */
const validate = (validations) => {
  return async (req, res, next) => {
    // Run all validations
    await Promise.all(validations.map((v) => v.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) return next();

    const extractedErrors = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
    }));

    next(ApiError.badRequest('Validation failed', extractedErrors));
  };
};

module.exports = validate;
