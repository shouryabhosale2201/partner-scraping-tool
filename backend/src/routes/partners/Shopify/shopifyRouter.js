const express = require("express");
const scrapeData = require("./shopifyScraper");
const exportToExcel = require("./shopifyExcel");
const { db, initializeDatabase } = require("../../../db");
const router = express.Router();

// API to Scrape Data and Store in Database
router.get("/scrape", async (req, res) => {
    try {
        console.log("🔄 Scraping fresh data from Shopify");
        const data = await scrapeData();
        res.json({ success: true, data });
    } catch (error) {
        console.error("❌ Scraping Error:", error.message);
        res.status(500).json({ success: false, error: "Failed to scrape data." });
    }
});

// API to Fetch Data from Database
router.get("/fetch", async (req, res) => {
    initializeDatabase();
    try {
        const [rows] = await db.execute(`
            SELECT 
                s.id,
                s.partnerTier,
                s.name,
                s.description,
                s.plusPartner,
                s.specializedServices,
                s.otherServices,
                s.featuredWork,
                s.rating,
                s.profileUrl
            FROM shopify s
        `);

        res.json({ success: true, data: rows });
    } catch (error) {
        console.error("❌ Database Fetch Error:", error.message);
        res.status(500).json({ success: false, error: "Failed to fetch data." });
    }
});

// Download Excel
router.get("/downloadExcel", async (req, res) => {
    initializeDatabase();
    try {
        // Get main data
        const [rows] = await db.execute(`
            SELECT 
                s.id,
                s.partnerTier,
                s.name,
                s.description,
                s.plusPartner,
                s.specializedServices,
                s.otherServices,
                s.featuredWork,
                s.rating,
                s.profileUrl
            FROM shopify s
        `);
        
        if (!rows || rows.length === 0) {
            return res.status(404).json({ success: false, error: "No data available to export." });
        }
        
        // Get filters data
        const [filtersRows] = await db.execute(`
            SELECT id, priceRangeFilter, serviceFilter, locationFilter, industryFilter 
            FROM shopify_filters
        `);
        
        // Create a map of id -> filters
        const filtersMap = {};
        filtersRows.forEach(row => {
            filtersMap[row.id] = {
                priceRangeFilter: row.priceRangeFilter,
                serviceFilter: row.serviceFilter,
                locationFilter: row.locationFilter,
                industryFilter: row.industryFilter
            };
        });
        
        // Create Excel file with data and filters
        const filePath = await exportToExcel(rows, filtersMap);
        
        // Send the file as download
        res.download(filePath, "shopify_partners.xlsx", (err) => {
            if (err) {
                console.error("❌ File Download Error:", err.message);
                res.status(500).json({ success: false, error: "Failed to send Excel file." });
            } else {
                console.log("✅ Excel file downloaded successfully");
                // Optionally clean up the file after sending
                // setTimeout(() => {
                //     fs.unlinkSync(filePath);
                //     console.log("✅ Temporary Excel file deleted");
                // }, 5000);
            }
        });
    } catch (error) {
        console.error("❌ Excel Export Error:", error.message || error);
        res.status(500).json({ success: false, error: "Failed to generate Excel file." });
    }
});

module.exports = router;
