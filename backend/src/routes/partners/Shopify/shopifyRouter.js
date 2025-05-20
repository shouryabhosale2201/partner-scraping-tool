//shopifyRouter.js
const express = require("express");
const scrapeData = require("./shopifyScraper");
const router = express.Router();

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

module.exports = router;
