const mysql = require("mysql2/promise");

const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "Dopegamer@1769",
  database: "partners",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

db.getConnection()
  .then(() => console.log("✅ Connected to MySQL database."))
  .catch((error) => {
    console.error("❌ MySQL Connection Error:", error.message);
    process.exit(1);
  });

module.exports = db;

