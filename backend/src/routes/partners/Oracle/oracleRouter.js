const express = require("express");
const scrapeData = require("./oracleScraper");
const exportToExcel = require("./oracleExcel");
const fs = require('fs').promises;
const router = express.Router();
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const Oracle_File = path.join(DATA_DIR, 'oracle_partners.json');

// API to Scrape Data and Store in Database
router.get("/scrape", async (req, res) => {
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
// router.get("/fetch", async (req, res) => {
//     try {
//         // Step 1: Read the JSON file
//         const jsonData = await fs.readFile(Oracle_File, 'utf8');

//         // Step 2: Parse the JSON data
//         const data = JSON.parse(jsonData);

//         // Step 3: Send it to the frontend
//         res.json({ success: true, data });
//     } catch (error) {
//         console.error("❌ Error reading JSON file:", error.message);
//         res.status(500).json({ success: false, error: "Failed to fetch data." });
//     }
// });

// // Download Excel
// router.get("/downloadExcel", async (req, res) => {
//     try {
//         const fileContent = await fs.readFile(Oracle_File, "utf-8");
//         const jsonData = JSON.parse(fileContent);

//         if (!Array.isArray(jsonData) || jsonData.length === 0) {
//             return res.status(404).json({ success: false, error: "No data available to export." });
//         }

//         const excelPath = exportToExcel(jsonData); // Use the JSON array directly

//         res.download(excelPath, "oracle_partners.xlsx", (err) => {
//             if (err) {
//                 console.error("❌ File Download Error:", err.message);
//                 res.status(500).json({ success: false, error: "Failed to send Excel file." });
//             }
//         });
//     } catch (error) {
//         console.error("❌ JSON Read/Export Error:", error.message);
//         res.status(500).json({ success: false, error: "Failed to generate Excel file from JSON." });
//     }
// });


module.exports = router;