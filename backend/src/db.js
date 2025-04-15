require('dotenv').config();
const mysql = require('mysql2');

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONN_LIMIT || "10"),
  queueLimit: 0,
}).promise();

db.getConnection()
  .then((conn) => {
    console.log("✅ Connected to MySQL database.");
    conn.release();
  })
  .catch((error) => {
    console.error("❌ MySQL Connection Error:", error.message);
    process.exit(1);
  });

module.exports = db;