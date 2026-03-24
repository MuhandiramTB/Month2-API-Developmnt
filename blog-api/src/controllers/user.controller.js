const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const { query } = require('../database/connection');
const ApiError = require('../utils/ApiError');
const { apiResponse } = require('../utils/helpers');

/**
 * POST /api/v1/auth/register
 */
const register = async (req, res, next) => {
  try {
    const { username, email, password, full_name } = req.body;

    // Hash password
    const password_hash = await bcrypt.hash(password, 12);

    const result = await query(
      `INSERT INTO users (username, email, password_hash, full_name)
       VALUES ($1, $2, $3, $4)
       RETURNING id, username, email, full_name, role, created_at`,
      [username, email, password_hash, full_name || null]
    );

    const user = result.rows[0];

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    apiResponse(res, 201, { user, token }, 'User registered successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const result = await query(
      'SELECT id, username, email, password_hash, full_name, role FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    const user = result.rows[0];

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    // Remove password_hash from response
    const { password_hash, ...userData } = user;

    apiResponse(res, 200, { user: userData, token }, 'Login successful');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/users/profile
 */
const getProfile = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, username, email, full_name, bio, avatar_url, role, created_at, updated_at
       FROM users WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      throw ApiError.notFound('User not found');
    }

    apiResponse(res, 200, result.rows[0]);
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/v1/users/profile
 */
const updateProfile = async (req, res, next) => {
  try {
    const { full_name, bio, avatar_url } = req.body;

    const result = await query(
      `UPDATE users
       SET full_name  = COALESCE($1, full_name),
           bio        = COALESCE($2, bio),
           avatar_url = COALESCE($3, avatar_url)
       WHERE id = $4
       RETURNING id, username, email, full_name, bio, avatar_url, role, updated_at`,
      [full_name, bio, avatar_url, req.user.id]
    );

    apiResponse(res, 200, result.rows[0], 'Profile updated');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/users/:id
 */
const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT id, username, full_name, bio, avatar_url, created_at
       FROM users WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      throw ApiError.notFound('User not found');
    }

    apiResponse(res, 200, result.rows[0]);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/users
 */
const getAllUsers = async (req, res, next) => {
  try {
    const result = await query(
      'SELECT id, username, full_name, avatar_url, created_at FROM users ORDER BY created_at DESC'
    );

    apiResponse(res, 200, result.rows);
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, getProfile, updateProfile, getUserById, getAllUsers };
