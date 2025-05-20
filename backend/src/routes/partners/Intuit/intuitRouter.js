const express = require("express");
const router = express.Router();
const scrapePartners = require("./intuitScraper");

/* ─────────────  GET /api/v1/intuit/scrape  ───────────── */
router.get("/scrape", async (_req, res) => {
  try {
    const data = await scrapePartners();
    res.json({ success: true, data, count: data.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});



module.exports = router;