require('dotenv').config();
const mysql = require('mysql2/promise'); // Use the promise wrapper

const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_CONN_LIMIT } = process.env;

// --- 1. Create and Export the Pool Immediately ---
// Note: The pool needs the database name to connect directly to it.
// We'll handle the DB creation check separately.
const db = mysql.createPool({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME, // Assume DB will exist when pool is actively used
  waitForConnections: true,
  connectionLimit: parseInt(DB_CONN_LIMIT || "10"),
  queueLimit: 0,
});

console.log('ℹ️ MySQL Pool created (connection pending setup).'); // Log pool creation

// --- 2. Define Asynchronous Initialization Function ---
async function initializeDatabase() {
  let initConnection;
  try {
    // Create a temporary connection *without* specifying the database
    // to check/create the database itself.
    initConnection = await mysql.createConnection({
      host: DB_HOST,
      user: DB_USER,
      password: DB_PASSWORD,
    });

    // Create database if it doesn't exist
    await initConnection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``);
    console.log(`✅ Database "${DB_NAME}" check/creation complete.`);
    await initConnection.end(); // Close the temporary connection

    // Test the main pool connection (optional but good practice)
    const connection = await db.getConnection();
    console.log('✅ Connected to MySQL database via pool.');
    connection.release();

    // Create tables using the main pool
    await createTables(db); // Pass the pool to the function

  } catch (error) {
    console.error('❌ Database Initialization Error:', error.message);
    if (initConnection) {
      try {
        await initConnection.end();
      } catch (endError) {
        console.error('❌ Error closing init connection:', endError.message);
      }
    }
    // Critical error during setup, exiting might be appropriate
    process.exit(1);
  }
}

// --- 3. Update createTables to be Async ---
async function createTables(pool) { // Accept the pool as argument
  const createTableQueries = [
    // Salesforce
    `CREATE TABLE IF NOT EXISTS salesforce (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS salesforce_details (
      id INT PRIMARY KEY,
      link TEXT,
      tagline TEXT,
      description TEXT,
      expertise TEXT,
      industries TEXT,
      services TEXT,
      extendedDescription TEXT,
      FOREIGN KEY (id) REFERENCES salesforce(id) ON DELETE CASCADE
    )`, // Added ON DELETE CASCADE
    `CREATE TABLE IF NOT EXISTS salesforce_filters (
      id INT PRIMARY KEY,
      filters JSON,
      FOREIGN KEY (id) REFERENCES salesforce(id) ON DELETE CASCADE
    )`,

    // Oracle
    `CREATE TABLE IF NOT EXISTS oracle (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS oracle_details (
      id INT PRIMARY KEY,
      oracle_expertise_description TEXT,
      oracle_expertise_areas TEXT,
      company_overview TEXT,
      solution_titles TEXT,
      solution_links TEXT,
      FOREIGN KEY (id) REFERENCES oracle(id) ON DELETE CASCADE
    )`,
    // Added ON DELETE CASCADE
    // Shopify
    `CREATE TABLE IF NOT EXISTS shopify (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS shopify_details (
      id INT PRIMARY KEY,
      link TEXT,
      business_description TEXT,
      specialized_services JSON,
      featured_work JSON,
      FOREIGN KEY (id) REFERENCES shopify(id) ON DELETE CASCADE
    )`, 

    `CREATE TABLE IF NOT EXISTS shopify_filters (
     id INT PRIMARY KEY,
     filters JSON,
     FOREIGN KEY (id) REFERENCES shopify(id) ON DELETE CASCADE
      )`,
    
    // Added ON DELETE CASCADE

    //Microsoft
    `CREATE TABLE IF NOT EXISTS microsoft (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS microsoft_details (
      id INT PRIMARY KEY,
      description TEXT,
      product JSON,
      solutions JSON,
      serviceType JSON,
      FOREIGN KEY (id) REFERENCES microsoft(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS microsoft_filters (
      id INT PRIMARY KEY,
      industry JSON,
      FOREIGN KEY (id) REFERENCES microsoft(id) ON DELETE CASCADE
    )`
  ];

  try {
    // Execute queries sequentially using await
    for (const query of createTableQueries) {
      await pool.query(query);
    }
    console.log('✅ All tables are ensured.');
  } catch (err) {
    console.error('❌ Error creating tables:', err.message);
    throw err; // Re-throw the error to be caught by initializeDatabase
  }
}

// --- 4. Export both the pool and the initialization function ---
module.exports = {
  db, // The pool instance
  initializeDatabase, // The async function to set things up
};