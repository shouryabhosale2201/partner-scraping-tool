const express = require("express");
const scrapeData = require("./oracleScraper");
// const exportToExcel = require("./oracleExcel");
const db = require("../../../db");
const router = express.Router();

// API to Scrape Data and Store in Database
router.get("/scrape", async (req, res) => {
    // const { url } = req.body;
    try {
        console.log("🔄 Scraping fresh data from oracle");
        const data = await scrapeData();
        res.json({ success: true, data });
    } catch (error) {
        console.error("❌ Scraping Error:", error.message);
        res.status(500).json({ success: false, error: "Failed to scrape data." });
    }
});

// API to Fetch Data from Database
router.get("/fetch", async (req, res) => {
    try {
        const [rows] = await db.execute("SELECT * FROM oracle");
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error("❌ Database Fetch Error:", error.message);
        res.status(500).json({ success: false, error: "Failed to fetch data." });
    }
});

// Download Excel
// router.get("/downloadExcel", async (req, res) => {
//     try {
//         const [rows] = await db.execute("SELECT * FROM oracle");

//         if (!rows || rows.length === 0) {
//             return res.status(404).json({ success: false, error: "No data available to export." });
//         }

//         const filePath = exportToExcel(rows); // Excel file path

//         res.download(filePath, "partners.xlsx", (err) => {
//             if (err) {
//                 console.error("❌ File Download Error:", err.message);
//                 res.status(500).json({ success: false, error: "Failed to send Excel file." });
//             }
//         });
//     } catch (error) {
//         console.error("❌ Excel Export Error:", error.message);
//         res.status(500).json({ success: false, error: "Failed to generate Excel file." });
//     }
// });

module.exports = router;