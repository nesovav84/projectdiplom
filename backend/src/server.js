require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { pool, waitForDatabase } = require('./config/database');

const app = express();
const uploadsDir = path.join(__dirname, '../uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadsDir));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Слишком много запросов. Попробуйте позже.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Слишком много попыток входа. Попробуйте через 15 минут.' }
});

app.use('/api/', apiLimiter);

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    return res.json({ status: 'ok' });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/tickets', require('./routes/tickets'));
app.use('/api/users', require('./routes/users'));
app.use('/api/reports', require('./routes/reports'));

app.use((req, res) => {
  res.status(404).json({ message: 'Маршрут не найден.' });
});

app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: err.message || 'Внутренняя ошибка сервера.' });
});

async function seedDefaultUsers() {
  const defaults = [
    {
      full_name: 'Администратор',
      username: 'admin',
      password: 'admin123',
      email: 'admin@ittech.local',
      role: 'admin',
      position: 'Системный администратор'
    },
    {
      full_name: 'Учитель',
      username: 'teacher',
      password: 'admin123',
      email: 'teacher@ittech.local',
      role: 'teacher',
      position: 'Учитель информатики'
    }
  ];

  for (const user of defaults) {
    const password_hash = await bcrypt.hash(user.password, 10);
    await pool.query(
      `INSERT INTO users (full_name, username, password_hash, email, role, position)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         full_name = VALUES(full_name),
         password_hash = VALUES(password_hash),
         email = VALUES(email),
         role = VALUES(role),
         position = VALUES(position)`,
      [user.full_name, user.username, password_hash, user.email, user.role, user.position]
    );
  }
}

async function startServer() {
  try {
    await waitForDatabase();
    await seedDefaultUsers();

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
