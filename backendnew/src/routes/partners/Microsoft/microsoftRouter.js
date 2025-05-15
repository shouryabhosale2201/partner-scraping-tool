// microsoftRouter.js
const express = require("express");
const scrapeData = require("./microsoftScraper");
const router = express.Router();

router.get("/scrape", async (req, res) => {
    try {
        console.log("🔄 Scraping fresh data from Microsoft Directory...");

        const selectedFields = req.query.fields ? JSON.parse(req.query.fields) : ['name', 'industryFocus','country'];

        const data = await scrapeData(selectedFields);

        if (!data || data.length === 0) {
            console.warn("⚠️ No data scraped!");
            return res.status(500).json({ success: false, message: "No data scraped. Check if Microsoft API is available." });
        }

        res.status(200).json({ success: true, message: `Scraped ${data.length} records successfully!`, data });
    } catch (error) {
        console.error("❌ Scraping Error:", error.message);
        res.status(500).json({ success: false, error: error.message || "Failed to scrape data." });
    }
});

module.exports = router;