const express = require('express');
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/upload');

const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');

function safeFilePath(filename) {
  // path.basename strips any directory components, preventing path traversal
  return path.join(UPLOADS_DIR, path.basename(filename));
}

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

    const [rows] = await pool.query(
      `SELECT a.*, u.full_name, u.username
       FROM attachments a
       JOIN users u ON u.id = a.user_id
       WHERE a.ticket_id = ?
       ORDER BY a.created_at DESC`,
      [req.params.ticketId]
    );

    return res.json({ attachments: rows });
  } catch (error) {
    console.error('Attachments list error:', error);
    return res.status(500).json({ message: 'Не удалось получить вложения.' });
  }
});

router.post('/', authenticate, upload.single('file'), async (req, res) => {
  try {
    const ticket = await getAccessibleTicket(req.params.ticketId, req.user);
    if (!ticket) {
      if (req.file) {
        try { fs.unlinkSync(safeFilePath(req.file.filename)); } catch (_) { /* ignore */ }
      }
      return res.status(404).json({ message: 'Заявка не найдена.' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Файл не был загружен.' });
    }

    const [result] = await pool.query(
      `INSERT INTO attachments (ticket_id, user_id, filename, original_name, file_size, mime_type)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        req.params.ticketId,
        req.user.id,
        req.file.filename,
        req.file.originalname,
        req.file.size,
        req.file.mimetype
      ]
    );

    await pool.query(
      `INSERT INTO ticket_history (ticket_id, user_id, action, old_value, new_value)
       VALUES (?, ?, 'attachment_uploaded', NULL, ?)`,
      [req.params.ticketId, req.user.id, req.file.originalname]
    );

    const [rows] = await pool.query('SELECT * FROM attachments WHERE id = ? LIMIT 1', [result.insertId]);
    return res.status(201).json({ attachment: rows[0] });
  } catch (error) {
    console.error('Attachment upload error:', error);
    return res.status(500).json({ message: error.message || 'Не удалось загрузить файл.' });
  }
});

router.get('/download/:attachmentId', authenticate, async (req, res) => {
  try {
    const ticket = await getAccessibleTicket(req.params.ticketId, req.user);
    if (!ticket) {
      return res.status(404).json({ message: 'Заявка не найдена.' });
    }

    const [rows] = await pool.query(
      'SELECT * FROM attachments WHERE id = ? AND ticket_id = ? LIMIT 1',
      [req.params.attachmentId, req.params.ticketId]
    );

    const attachment = rows[0];
    if (!attachment) {
      return res.status(404).json({ message: 'Файл не найден.' });
    }

    const filePath = safeFilePath(attachment.filename);
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Файл отсутствует на сервере.' });
    }

    return res.download(filePath, attachment.original_name);
  } catch (error) {
    console.error('Attachment download error:', error);
    return res.status(500).json({ message: 'Не удалось скачать файл.' });
  }
});

module.exports = router;
