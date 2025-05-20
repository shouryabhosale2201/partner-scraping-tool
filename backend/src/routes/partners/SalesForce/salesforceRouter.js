// salesforceRouter.js
const express = require("express");
const scrapeData = require("./salesforceScraper");
const router = express.Router();

// API to Scrape Data and Store in Database
router.get("/scrape", async (req, res) => {
    try {
        // Parse the selected fields from the request
        const selectedFields = req.query.fields ? JSON.parse(req.query.fields) : [];

        // Default fields if none selected
        const fieldsToScrape = selectedFields.length > 0 ? selectedFields : ['name', 'link', 'foundIn', 'countries'];
        console.log(fieldsToScrape)
        const data = await scrapeData(fieldsToScrape);
        res.json({ success: true, data });
    } catch (error) {
        console.error("❌ Scraping Error:", error.message);
        res.status(500).json({ success: false, error: "Failed to scrape data." });
    }
});

module.exports = router;