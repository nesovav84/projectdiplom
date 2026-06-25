const express = require('express');
const fs = require('fs');
const path = require('path');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { authenticate, requireAdmin } = require('../middleware/auth');
const commentsRouter = require('./comments');
const attachmentsRouter = require('./attachments');

const router = express.Router();

const categories = ['hardware', 'software', 'network', 'access', 'other'];
const priorities = ['low', 'medium', 'high', 'urgent'];
const statuses = ['new', 'accepted', 'in_progress', 'waiting', 'resolved', 'closed', 'cancelled'];
const sortableColumns = new Set(['id', 'title', 'priority', 'status', 'category', 'created_at', 'updated_at']);

async function getTicketById(ticketId, user, withExtras = false) {
  const conditions = ['t.id = ?'];
  const params = [ticketId];

  if (user.role !== 'admin') {
    conditions.push('t.created_by = ?');
    params.push(user.id);
  }

  const [rows] = await pool.query(
    `SELECT
       t.*,
       creator.full_name AS created_by_name,
       creator.username AS created_by_username,
       assignee.full_name AS assigned_to_name,
       assignee.username AS assigned_to_username
     FROM tickets t
     JOIN users creator ON creator.id = t.created_by
     LEFT JOIN users assignee ON assignee.id = t.assigned_to
     WHERE ${conditions.join(' AND ')}
     LIMIT 1`,
    params
  );

  const ticket = rows[0];
  if (!ticket || !withExtras) {
    return ticket;
  }

  const [comments] = await pool.query(
    `SELECT c.*, u.full_name, u.username, u.role
     FROM comments c
     JOIN users u ON u.id = c.user_id
     WHERE c.ticket_id = ? ${user.role === 'admin' ? '' : 'AND c.is_internal = FALSE'}
     ORDER BY c.created_at ASC`,
    [ticketId]
  );

  const [attachments] = await pool.query(
    `SELECT a.*, u.full_name, u.username
     FROM attachments a
     JOIN users u ON u.id = a.user_id
     WHERE a.ticket_id = ?
     ORDER BY a.created_at DESC`,
    [ticketId]
  );

  const [history] = await pool.query(
    `SELECT h.*, u.full_name, u.username
     FROM ticket_history h
     JOIN users u ON u.id = h.user_id
     WHERE h.ticket_id = ?
     ORDER BY h.created_at DESC`,
    [ticketId]
  );

  return { ...ticket, comments, attachments, history };
}

async function logHistory(ticketId, userId, action, oldValue, newValue) {
  await pool.query(
    `INSERT INTO ticket_history (ticket_id, user_id, action, old_value, new_value)
     VALUES (?, ?, ?, ?, ?)`,
    [ticketId, userId, action, oldValue ?? null, newValue ?? null]
  );
}

router.use('/:ticketId/comments', commentsRouter);
router.use('/:ticketId/attachments', attachmentsRouter);

router.get('/', authenticate, async (req, res) => {
  try {
    const where = [];
    const params = [];

    if (req.user.role !== 'admin') {
      where.push('t.created_by = ?');
      params.push(req.user.id);
    }

    if (req.query.status && statuses.includes(req.query.status)) {
      where.push('t.status = ?');
      params.push(req.query.status);
    }

    if (req.query.priority && priorities.includes(req.query.priority)) {
      where.push('t.priority = ?');
      params.push(req.query.priority);
    }

    if (req.query.category && categories.includes(req.query.category)) {
      where.push('t.category = ?');
      params.push(req.query.category);
    }

    if (req.query.dateFrom) {
      where.push('DATE(t.created_at) >= ?');
      params.push(req.query.dateFrom);
    }

    if (req.query.dateTo) {
      where.push('DATE(t.created_at) <= ?');
      params.push(req.query.dateTo);
    }

    if (req.query.search) {
      where.push('(t.title LIKE ? OR t.description LIKE ?)');
      params.push(`%${req.query.search}%`, `%${req.query.search}%`);
    }

    const sortBy = sortableColumns.has(req.query.sortBy) ? req.query.sortBy : 'created_at';
    const sortOrder = req.query.sortOrder === 'asc' ? 'ASC' : 'DESC';

    const [rows] = await pool.query(
      `SELECT
         t.*,
         creator.full_name AS created_by_name,
         assignee.full_name AS assigned_to_name
       FROM tickets t
       JOIN users creator ON creator.id = t.created_by
       LEFT JOIN users assignee ON assignee.id = t.assigned_to
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY t.${sortBy} ${sortOrder}`,
      params
    );

    return res.json({ tickets: rows });
  } catch (error) {
    console.error('Tickets list error:', error);
    return res.status(500).json({ message: 'Не удалось получить список заявок.' });
  }
});

router.post(
  '/',
  authenticate,
  [
    body('title').trim().notEmpty().withMessage('Укажите заголовок.'),
    body('category').isIn(categories).withMessage('Укажите корректную категорию.'),
    body('priority').optional().isIn(priorities).withMessage('Укажите корректный приоритет.'),
    body('description').trim().notEmpty().withMessage('Опишите проблему.')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Ошибка валидации.', errors: errors.array() });
    }

    try {
      const { title, category, priority = 'medium', description } = req.body;
      const [result] = await pool.query(
        `INSERT INTO tickets (title, category, priority, description, created_by)
         VALUES (?, ?, ?, ?, ?)`,
        [title, category, priority, description, req.user.id]
      );

      await logHistory(result.insertId, req.user.id, 'created', null, `Создана заявка: ${title}`);
      const ticket = await getTicketById(result.insertId, req.user, true);
      return res.status(201).json({ ticket });
    } catch (error) {
      console.error('Ticket create error:', error);
      return res.status(500).json({ message: 'Не удалось создать заявку.' });
    }
  }
);

router.get('/:id', authenticate, async (req, res) => {
  try {
    const ticket = await getTicketById(req.params.id, req.user, true);
    if (!ticket) {
      return res.status(404).json({ message: 'Заявка не найдена.' });
    }

    return res.json({ ticket });
  } catch (error) {
    console.error('Ticket detail error:', error);
    return res.status(500).json({ message: 'Не удалось получить заявку.' });
  }
});

router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM tickets WHERE id = ? LIMIT 1', [req.params.id]);
    const currentTicket = rows[0];

    if (!currentTicket) {
      return res.status(404).json({ message: 'Заявка не найдена.' });
    }

    const updates = {
      title: req.body.title ?? currentTicket.title,
      category: req.body.category ?? currentTicket.category,
      priority: req.body.priority ?? currentTicket.priority,
      status: req.body.status ?? currentTicket.status,
      description: req.body.description ?? currentTicket.description,
      assigned_to: req.body.assigned_to === '' ? null : (req.body.assigned_to ?? currentTicket.assigned_to)
    };

    if (!categories.includes(updates.category) || !priorities.includes(updates.priority) || !statuses.includes(updates.status)) {
      return res.status(400).json({ message: 'Переданы некорректные значения заявки.' });
    }

    if (updates.assigned_to) {
      const [assigneeRows] = await pool.query('SELECT id FROM users WHERE id = ? LIMIT 1', [updates.assigned_to]);
      if (!assigneeRows.length) {
        return res.status(400).json({ message: 'Назначенный пользователь не найден.' });
      }
    }

    const closedAt = ['resolved', 'closed', 'cancelled'].includes(updates.status)
      ? currentTicket.closed_at || new Date()
      : null;

    await pool.query(
      `UPDATE tickets
       SET title = ?, category = ?, priority = ?, status = ?, description = ?, assigned_to = ?, closed_at = ?
       WHERE id = ?`,
      [
        updates.title,
        updates.category,
        updates.priority,
        updates.status,
        updates.description,
        updates.assigned_to,
        closedAt,
        req.params.id
      ]
    );

    const fieldsToCheck = [
      ['title', 'updated_title'],
      ['category', 'updated_category'],
      ['priority', 'updated_priority'],
      ['status', 'updated_status'],
      ['description', 'updated_description'],
      ['assigned_to', 'updated_assignee']
    ];

    for (const [field, action] of fieldsToCheck) {
      const oldValue = currentTicket[field] === null ? null : String(currentTicket[field]);
      const newValue = updates[field] === null ? null : String(updates[field]);
      if (oldValue !== newValue) {
        await logHistory(req.params.id, req.user.id, action, oldValue, newValue);
      }
    }

    const ticket = await getTicketById(req.params.id, req.user, true);
    return res.json({ ticket, message: 'Заявка обновлена.' });
  } catch (error) {
    console.error('Ticket update error:', error);
    return res.status(500).json({ message: 'Не удалось обновить заявку.' });
  }
});

router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const [attachmentRows] = await pool.query('SELECT filename FROM attachments WHERE ticket_id = ?', [req.params.id]);
    await pool.query('DELETE FROM tickets WHERE id = ?', [req.params.id]);

    for (const attachment of attachmentRows) {
      const filePath = path.join(__dirname, '../../uploads', attachment.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    return res.json({ message: 'Заявка удалена.' });
  } catch (error) {
    console.error('Ticket delete error:', error);
    return res.status(500).json({ message: 'Не удалось удалить заявку.' });
  }
});

module.exports = router;
