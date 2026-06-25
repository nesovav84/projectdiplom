const express = require('express');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const { pool } = require('../config/database');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate, requireAdmin);

async function getStats() {
  const [[totals]] = await pool.query(
    `SELECT
       COUNT(*) AS total_tickets,
       SUM(status = 'new') AS new_tickets,
       SUM(status = 'in_progress') AS in_progress_tickets,
       SUM(status = 'closed') AS closed_tickets,
       SUM(priority = 'urgent') AS urgent_tickets,
       ROUND(AVG(CASE WHEN closed_at IS NOT NULL THEN TIMESTAMPDIFF(HOUR, created_at, closed_at) END), 1) AS avg_processing_time_hours
     FROM tickets`
  );

  return {
    total_tickets: Number(totals.total_tickets || 0),
    new_tickets: Number(totals.new_tickets || 0),
    in_progress_tickets: Number(totals.in_progress_tickets || 0),
    closed_tickets: Number(totals.closed_tickets || 0),
    urgent_tickets: Number(totals.urgent_tickets || 0),
    avg_processing_time_hours: Number(totals.avg_processing_time_hours || 0)
  };
}

router.get('/stats', async (_req, res) => {
  try {
    const stats = await getStats();
    return res.json({ stats });
  } catch (error) {
    console.error('Stats error:', error);
    return res.status(500).json({ message: 'Не удалось получить статистику.' });
  }
});

router.get('/monthly', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COUNT(*) AS total
       FROM tickets
       WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 11 MONTH)
       GROUP BY DATE_FORMAT(created_at, '%Y-%m')
       ORDER BY month ASC`
    );

    return res.json({ months: rows.map((row) => ({ month: row.month, total: Number(row.total) })) });
  } catch (error) {
    console.error('Monthly report error:', error);
    return res.status(500).json({ message: 'Не удалось получить помесячный отчёт.' });
  }
});

router.get('/by-category', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT category, COUNT(*) AS total
       FROM tickets
       GROUP BY category
       ORDER BY total DESC`
    );

    return res.json({ categories: rows.map((row) => ({ category: row.category, total: Number(row.total) })) });
  } catch (error) {
    console.error('Category report error:', error);
    return res.status(500).json({ message: 'Не удалось получить отчёт по категориям.' });
  }
});

router.get('/export/pdf', async (_req, res) => {
  try {
    const stats = await getStats();
    const [tickets] = await pool.query(
      `SELECT t.id, t.title, t.category, t.priority, t.status, t.created_at,
              creator.full_name AS created_by_name,
              assignee.full_name AS assigned_to_name
       FROM tickets t
       JOIN users creator ON creator.id = t.created_by
       LEFT JOIN users assignee ON assignee.id = t.assigned_to
       ORDER BY t.created_at DESC
       LIMIT 50`
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="it-tech-supp-report.pdf"');

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    doc.pipe(res);

    doc.fontSize(20).text('IT.TECH.SUPP — Сводный отчёт', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Всего заявок: ${stats.total_tickets}`);
    doc.text(`Новые: ${stats.new_tickets}`);
    doc.text(`В работе: ${stats.in_progress_tickets}`);
    doc.text(`Закрытые: ${stats.closed_tickets}`);
    doc.text(`Срочные: ${stats.urgent_tickets}`);
    doc.text(`Среднее время обработки (ч): ${stats.avg_processing_time_hours}`);
    doc.moveDown();
    doc.fontSize(14).text('Последние заявки');
    doc.moveDown(0.5);

    tickets.forEach((ticket) => {
      doc.fontSize(11).text(`#${ticket.id} ${ticket.title}`);
      doc.fontSize(10).fillColor('#555555').text(
        `Категория: ${ticket.category} | Приоритет: ${ticket.priority} | Статус: ${ticket.status} | Автор: ${ticket.created_by_name} | Исполнитель: ${ticket.assigned_to_name || '—'}`
      );
      doc.fillColor('#000000').moveDown(0.5);
    });

    doc.end();
  } catch (error) {
    console.error('PDF export error:', error);
    return res.status(500).json({ message: 'Не удалось экспортировать PDF.' });
  }
});

router.get('/export/excel', async (_req, res) => {
  try {
    const [tickets] = await pool.query(
      `SELECT t.id, t.title, t.category, t.priority, t.status, t.created_at, t.updated_at,
              creator.full_name AS created_by_name,
              assignee.full_name AS assigned_to_name
       FROM tickets t
       JOIN users creator ON creator.id = t.created_by
       LEFT JOIN users assignee ON assignee.id = t.assigned_to
       ORDER BY t.created_at DESC`
    );

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Tickets');
    sheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Заголовок', key: 'title', width: 35 },
      { header: 'Категория', key: 'category', width: 20 },
      { header: 'Приоритет', key: 'priority', width: 15 },
      { header: 'Статус', key: 'status', width: 18 },
      { header: 'Автор', key: 'created_by_name', width: 30 },
      { header: 'Исполнитель', key: 'assigned_to_name', width: 30 },
      { header: 'Создана', key: 'created_at', width: 22 },
      { header: 'Обновлена', key: 'updated_at', width: 22 }
    ];

    tickets.forEach((ticket) => sheet.addRow(ticket));
    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="it-tech-supp-report.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Excel export error:', error);
    return res.status(500).json({ message: 'Не удалось экспортировать Excel.' });
  }
});

module.exports = router;
