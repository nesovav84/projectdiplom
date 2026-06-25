const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const signToken = (user) => jwt.sign(
  {
    id: user.id,
    username: user.username,
    role: user.role,
    full_name: user.full_name,
    email: user.email
  },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);

const sanitizeUser = (user) => ({
  id: user.id,
  full_name: user.full_name,
  username: user.username,
  email: user.email,
  role: user.role,
  position: user.position,
  created_at: user.created_at,
  updated_at: user.updated_at
});

router.post(
  '/register',
  [
    body('full_name').trim().notEmpty().withMessage('Укажите ФИО.'),
    body('username').trim().isLength({ min: 3 }).withMessage('Логин должен содержать минимум 3 символа.'),
    body('password').isLength({ min: 6 }).withMessage('Пароль должен содержать минимум 6 символов.'),
    body('email').isEmail().withMessage('Укажите корректный email.'),
    body('position').optional({ checkFalsy: true }).trim().isLength({ max: 255 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Ошибка валидации.', errors: errors.array() });
    }

    const { full_name, username, password, email, position } = req.body;

    try {
      const [existing] = await pool.query(
        'SELECT id FROM users WHERE username = ? OR email = ? LIMIT 1',
        [username, email]
      );

      if (existing.length) {
        return res.status(409).json({ message: 'Пользователь с таким логином или email уже существует.' });
      }

      const password_hash = await bcrypt.hash(password, 10);
      const [result] = await pool.query(
        `INSERT INTO users (full_name, username, password_hash, email, role, position)
         VALUES (?, ?, ?, ?, 'teacher', ?)`,
        [full_name, username, password_hash, email, position || null]
      );

      const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
      const user = sanitizeUser(rows[0]);
      const token = signToken(user);

      return res.status(201).json({ token, user });
    } catch (error) {
      console.error('Register error:', error);
      return res.status(500).json({ message: 'Не удалось зарегистрировать пользователя.' });
    }
  }
);

router.post(
  '/login',
  [
    body('username').trim().notEmpty().withMessage('Укажите логин.'),
    body('password').notEmpty().withMessage('Укажите пароль.')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Ошибка валидации.', errors: errors.array() });
    }

    const { username, password } = req.body;

    try {
      const [rows] = await pool.query('SELECT * FROM users WHERE username = ? LIMIT 1', [username]);
      const user = rows[0];

      if (!user) {
        return res.status(401).json({ message: 'Неверный логин или пароль.' });
      }

      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({ message: 'Неверный логин или пароль.' });
      }

      const safeUser = sanitizeUser(user);
      const token = signToken(safeUser);
      return res.json({ token, user: safeUser });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ message: 'Не удалось выполнить вход.' });
    }
  }
);

router.get('/me', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ? LIMIT 1', [req.user.id]);
    const user = rows[0];

    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден.' });
    }

    return res.json({ user: sanitizeUser(user) });
  } catch (error) {
    console.error('Me error:', error);
    return res.status(500).json({ message: 'Не удалось получить данные пользователя.' });
  }
});

module.exports = router;
