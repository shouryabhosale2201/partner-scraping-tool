const express = require("express");
const cors = require("cors");
const db = require("./db"); 
const scrapeData = require("./scraper");

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

app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
