//shopifyRouter.js
const express = require("express");
const fs = require("fs");
const path = require("path");
const scrapeData = require("./shopifyScraper");
const exportToExcel = require("./shopifyExcel");

const router = express.Router();
const jsonFilePath = path.join(__dirname, "data", "shopify_partners.json");

// Scrape and save to JSON
router.get("/scrape", async (req, res) => {
    try {
        console.log("🔄 Scraping fresh data from shopify");
        const data = await scrapeData();
        res.json({ success: true, data });
    } catch (error) {
        console.error("❌ Scraping Error:", error.message);
        res.status(500).json({ success: false, error: "Failed to scrape data." });
    }
});

// Read from JSON file
// router.get("/fetch", (req, res) => {
//     try {
//         const jsonData = fs.readFileSync(jsonFilePath, "utf-8");
//         const data = JSON.parse(jsonData);
//         res.json({ success: true, data });
//     } catch (error) {
//         console.error("❌ JSON Fetch Error:", error.message);
//         res.status(500).json({ success: false, error: "Failed to read JSON file." });
//     }
// });

// // Export JSON data to Excel
// router.get("/downloadExcel", (req, res) => {
//     try {
//         const jsonData = fs.readFileSync(jsonFilePath, "utf-8");
//         const data = JSON.parse(jsonData);

//         if (!data || data.length === 0) {
//             return res.status(404).json({ success: false, error: "No data available to export." });
//         }

//         const filePath = exportToExcel(data); // Excel file path

//         res.download(filePath, "shopify_partners.xlsx", (err) => {
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
