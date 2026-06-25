const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

async function getAccessibleTicket(ticketId, user) {
  const conditions = ['t.id = ?'];
  const params = [ticketId];

  if (user.role !== 'admin') {
    conditions.push('t.created_by = ?');
    params.push(user.id);
  }

  const [rows] = await pool.query(
    `SELECT t.* FROM tickets t WHERE ${conditions.join(' AND ')} LIMIT 1`,
    params
  );

  return rows[0];
}

router.get('/', authenticate, async (req, res) => {
  try {
    const ticket = await getAccessibleTicket(req.params.ticketId, req.user);
    if (!ticket) {
      return res.status(404).json({ message: 'Заявка не найдена.' });
    }

    const conditions = ['c.ticket_id = ?'];
    const params = [req.params.ticketId];

    if (req.user.role !== 'admin') {
      conditions.push('c.is_internal = FALSE');
    }

    const [rows] = await pool.query(
      `SELECT c.*, u.full_name, u.username, u.role
       FROM comments c
       JOIN users u ON u.id = c.user_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY c.created_at ASC`,
      params
    );

    return res.json({ comments: rows });
  } catch (error) {
    console.error('Comments list error:', error);
    return res.status(500).json({ message: 'Не удалось получить комментарии.' });
  }
});

router.post(
  '/',
  authenticate,
  [body('content').trim().notEmpty().withMessage('Введите комментарий.')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Ошибка валидации.', errors: errors.array() });
    }

    try {
      const ticket = await getAccessibleTicket(req.params.ticketId, req.user);
      if (!ticket) {
        return res.status(404).json({ message: 'Заявка не найдена.' });
      }

      const is_internal = req.user.role === 'admin' ? Boolean(req.body.is_internal) : false;
      const [result] = await pool.query(
        `INSERT INTO comments (ticket_id, user_id, content, is_internal)
         VALUES (?, ?, ?, ?)`,
        [req.params.ticketId, req.user.id, req.body.content, is_internal]
      );

      await pool.query(
        `INSERT INTO ticket_history (ticket_id, user_id, action, old_value, new_value)
         VALUES (?, ?, 'comment_added', NULL, ?)`,
        [req.params.ticketId, req.user.id, req.body.content]
      );

      const [rows] = await pool.query(
        `SELECT c.*, u.full_name, u.username, u.role
         FROM comments c
         JOIN users u ON u.id = c.user_id
         WHERE c.id = ? LIMIT 1`,
        [result.insertId]
      );

      return res.status(201).json({ comment: rows[0] });
    } catch (error) {
      console.error('Comment create error:', error);
      return res.status(500).json({ message: 'Не удалось добавить комментарий.' });
    }
  }
);

module.exports = router;
