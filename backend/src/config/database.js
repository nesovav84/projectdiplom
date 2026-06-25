const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ittech_supp',
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
  queueLimit: 0,
  timezone: 'Z'
});

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForDatabase(retries = 20, interval = 5000) {
  let lastError;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const connection = await pool.getConnection();
      await connection.ping();
      connection.release();
      console.log('Database connection established');
      return;
    } catch (error) {
      lastError = error;
      console.warn(`Database unavailable (attempt ${attempt}/${retries}): ${error.message}`);
      if (attempt < retries) {
        await delay(interval);
      }
    }
  }

  throw lastError;
}

module.exports = {
  pool,
  waitForDatabase
};
