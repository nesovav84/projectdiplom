const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate, requireAdmin);

router.get('/', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.full_name, u.username, u.email, u.role, u.position, u.created_at, u.updated_at,
              COUNT(DISTINCT t.id) AS tickets_created,
              COUNT(DISTINCT assigned.id) AS tickets_assigned
       FROM users u
       LEFT JOIN tickets t ON t.created_by = u.id
       LEFT JOIN tickets assigned ON assigned.assigned_to = u.id
       GROUP BY u.id
       ORDER BY u.created_at DESC`
    );

    return res.json({ users: rows });
  } catch (error) {
    console.error('Users list error:', error);
    return res.status(500).json({ message: 'Не удалось получить список пользователей.' });
  }
});

router.post(
  '/',
  [
    body('full_name').trim().notEmpty().withMessage('Укажите ФИО.'),
    body('username').trim().isLength({ min: 3 }).withMessage('Логин должен содержать минимум 3 символа.'),
    body('email').isEmail().withMessage('Укажите корректный email.'),
    body('password').isLength({ min: 6 }).withMessage('Пароль должен содержать минимум 6 символов.'),
    body('role').isIn(['teacher', 'admin']).withMessage('Укажите корректную роль.')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Ошибка валидации.', errors: errors.array() });
    }

    try {
      const { full_name, username, email, password, role, position } = req.body;
      const [existing] = await pool.query('SELECT id FROM users WHERE username = ? OR email = ? LIMIT 1', [username, email]);

      if (existing.length) {
        return res.status(409).json({ message: 'Пользователь с таким логином или email уже существует.' });
      }

      const password_hash = await bcrypt.hash(password, 10);
      const [result] = await pool.query(
        `INSERT INTO users (full_name, username, password_hash, email, role, position)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [full_name, username, password_hash, email, role, position || null]
      );

      const [rows] = await pool.query(
        'SELECT id, full_name, username, email, role, position, created_at, updated_at FROM users WHERE id = ?',
        [result.insertId]
      );

      return res.status(201).json({ user: rows[0] });
    } catch (error) {
      console.error('User create error:', error);
      return res.status(500).json({ message: 'Не удалось создать пользователя.' });
    }
  }
);

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, full_name, username, email, role, position, created_at, updated_at FROM users WHERE id = ? LIMIT 1',
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: 'Пользователь не найден.' });
    }

    return res.json({ user: rows[0] });
  } catch (error) {
    console.error('User detail error:', error);
    return res.status(500).json({ message: 'Не удалось получить пользователя.' });
  }
});

router.put(
  '/:id',
  [
    body('full_name').optional().trim().notEmpty().withMessage('Укажите ФИО.'),
    body('username').optional().trim().isLength({ min: 3 }).withMessage('Логин должен содержать минимум 3 символа.'),
    body('email').optional().isEmail().withMessage('Укажите корректный email.'),
    body('role').optional().isIn(['teacher', 'admin']).withMessage('Укажите корректную роль.')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Ошибка валидации.', errors: errors.array() });
    }

    try {
      const [rows] = await pool.query('SELECT * FROM users WHERE id = ? LIMIT 1', [req.params.id]);
      const currentUser = rows[0];

      if (!currentUser) {
        return res.status(404).json({ message: 'Пользователь не найден.' });
      }

      const nextValues = {
        full_name: req.body.full_name ?? currentUser.full_name,
        username: req.body.username ?? currentUser.username,
        email: req.body.email ?? currentUser.email,
        role: req.body.role ?? currentUser.role,
        position: req.body.position ?? currentUser.position
      };

      const [duplicateRows] = await pool.query(
        'SELECT id FROM users WHERE (username = ? OR email = ?) AND id <> ? LIMIT 1',
        [nextValues.username, nextValues.email, req.params.id]
      );

      if (duplicateRows.length) {
        return res.status(409).json({ message: 'Логин или email уже заняты.' });
      }

      await pool.query(
        `UPDATE users
         SET full_name = ?, username = ?, email = ?, role = ?, position = ?
         WHERE id = ?`,
        [
          nextValues.full_name,
          nextValues.username,
          nextValues.email,
          nextValues.role,
          nextValues.position || null,
          req.params.id
        ]
      );

      const [updatedRows] = await pool.query(
        'SELECT id, full_name, username, email, role, position, created_at, updated_at FROM users WHERE id = ?',
        [req.params.id]
      );

      return res.json({ user: updatedRows[0], message: 'Пользователь обновлён.' });
    } catch (error) {
      console.error('User update error:', error);
      return res.status(500).json({ message: 'Не удалось обновить пользователя.' });
    }
  }
);

router.delete('/:id', async (req, res) => {
  try {
    if (Number(req.params.id) === req.user.id) {
      return res.status(400).json({ message: 'Нельзя удалить свою учётную запись.' });
    }

    const [ticketRows] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM tickets
       WHERE created_by = ? OR assigned_to = ?`,
      [req.params.id, req.params.id]
    );

    const [commentRows] = await pool.query('SELECT COUNT(*) AS total FROM comments WHERE user_id = ?', [req.params.id]);

    if (ticketRows[0].total > 0 || commentRows[0].total > 0) {
      return res.status(400).json({
        message: 'Невозможно удалить пользователя, связанного с заявками или комментариями.'
      });
    }

    const [result] = await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    if (!result.affectedRows) {
      return res.status(404).json({ message: 'Пользователь не найден.' });
    }

    return res.json({ message: 'Пользователь удалён.' });
  } catch (error) {
    console.error('User delete error:', error);
    return res.status(500).json({ message: 'Не удалось удалить пользователя.' });
  }
});

router.post('/:id/reset-password', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id FROM users WHERE id = ? LIMIT 1', [req.params.id]);
    if (!rows.length) {
      return res.status(404).json({ message: 'Пользователь не найден.' });
    }

    const nextPassword = req.body.password?.trim() || 'Temp1234!';
    if (nextPassword.length < 6) {
      return res.status(400).json({ message: 'Пароль должен содержать минимум 6 символов.' });
    }

    const password_hash = await bcrypt.hash(nextPassword, 10);
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash, req.params.id]);

    return res.json({ message: 'Пароль сброшен.', password: nextPassword });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ message: 'Не удалось сбросить пароль.' });
  }
});

module.exports = router;
