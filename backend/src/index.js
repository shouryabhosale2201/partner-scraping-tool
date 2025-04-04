const express = require("express");
const cors = require("cors");
const db = require("./db"); 
const scrapeData = require("./scraper");
const XLSX = require("xlsx");

const app = express();
const PORT = 5000;

app.use(express.json());
app.use(cors()); // Enable CORS for all origins

// API to Scrape Data and Store in Database
app.post("/scrape", async (req, res) => {
  try {
    console.log("🔄 Scraping fresh data...");
    const data = await scrapeData();
    res.json({ success: true, data });
  } catch (error) {
    console.error("❌ Scraping Error:", error.message);
    res.status(500).json({ success: false, error: "Failed to scrape data." });
  }
});

// API to Fetch Data from Database
app.get("/fetch", async (req, res) => {
  try {
    const [rows] = await db.execute("SELECT * FROM partners");
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("❌ Database Fetch Error:", error.message);
    res.status(500).json({ success: false, error: "Failed to fetch data." });
  }
});

// Download Excel
app.get("/downloadExcel", async (req, res) => {
  try {
    const [rows] = await db.execute("SELECT * FROM partners");
    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, error: "No data available to export." });
    }

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Partners");

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Disposition", "attachment; filename=partners.xlsx");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

    res.send(buffer);
  } catch (error) {
    console.error("❌ Excel Export Error:", error.message);
    res.status(500).json({ success: false, error: "Failed to generate Excel file." });
  }
});

app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
