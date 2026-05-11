// ============================================================
// AUTH CONTROLLER
// Handles user registration, login, and profile retrieval.
// ============================================================
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../config/db');
const emailService = require('../services/emailService');

const SALT_ROUNDS = 12;

/**
 * POST /api/auth/register
 * Register a new user (creator or admin via invite).
 */
const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required.'
      });
    }

    // Check if email already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.'
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Only allow 'creator' role via public registration
    // Admin accounts must be created manually or via a separate admin endpoint
    const userRole = role === 'admin' ? 'creator' : (role || 'creator');

    // Insert user
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role, kyc_status, created_at`,
      [name, email.toLowerCase(), passwordHash, userRole]
    );

    const user = result.rows[0];

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Send Welcome Email (async, don't await so it doesn't block response)
    emailService.sendWelcomeEmail(user.email, user.name);

    res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      data: { user, token }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

/**
 * POST /api/auth/login
 * Authenticate a user and return a JWT token.
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.'
      });
    }

    // Find user by email
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const user = result.rows[0];

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Remove password_hash from response
    const { password_hash, ...safeUser } = user;

    res.json({
      success: true,
      message: 'Login successful.',
      data: { user: safeUser, token }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

/**
 * GET /api/auth/me
 * Get the currently authenticated user's profile.
 */
const getMe = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, role, kyc_status, avatar_url, created_at, updated_at
       FROM users WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (err) {
    console.error('GetMe error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

/**
 * POST /api/auth/forgot-password
 */
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required.' });

    const user = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (user.rows.length === 0) {
      // Return success even if not found to prevent email enumeration
      return res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000); // 1 hour

    await pool.query(
      `UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE email = $3`,
      [resetToken, expires, email.toLowerCase()]
    );

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
    await emailService.sendPasswordResetEmail(email, resetUrl);

    res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

/**
 * POST /api/auth/reset-password
 */
const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ success: false, message: 'Token and new password are required.' });

    const user = await pool.query(
      `SELECT id FROM users WHERE reset_token = $1 AND reset_token_expires > NOW()`,
      [token]
    );

    if (user.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token.' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    await pool.query(
      `UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2`,
      [passwordHash, user.rows[0].id]
    );

    res.json({ success: true, message: 'Password has been successfully reset.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = { register, login, getMe, forgotPassword, resetPassword };
