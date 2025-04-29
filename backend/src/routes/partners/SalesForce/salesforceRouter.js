const express = require("express");
const scrapeData = require("./salesforceScraper");
const exportToExcel = require("./salesforceExcel");
const router = express.Router();
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const Salesforce_File = path.join(DATA_DIR, 'salesforce_partners.json');

// API to Scrape Data and Store in Database
router.get("/scrape", async (req, res) => {
    try {
        // Parse the selected fields from the request
        const selectedFields = req.query.fields ? JSON.parse(req.query.fields) : [];
        
        // Default fields if none selected
        const fieldsToScrape = selectedFields.length > 0 ? selectedFields : ['name', 'link', 'foundIn'];
        
        const data = await scrapeData(fieldsToScrape);
        res.json({ success: true, data });
    } catch (error) {
        console.error("❌ Scraping Error:", error.message);
        res.status(500).json({ success: false, error: "Failed to scrape data." });
    }
});

router.get("/fetch", async (req, res) => {
    try {
        // Parse the filter parameters
        const salesforceExpertise = req.query.salesforceExpertise ? JSON.parse(req.query.salesforceExpertise) : [];
        const industryExpertise = req.query.industryExpertise ? JSON.parse(req.query.industryExpertise) : [];
        
        // Parse selected fields
        const selectedFields = req.query.fields ? JSON.parse(req.query.fields) : [];
        
        res.json({ success: true, data: rows });

    } catch (error) {
        console.error("❌ Salesforce Filter Fetch Error:", error.message);
        res.status(500).json({ success: false, error: "Failed to fetch filtered Salesforce data." });
    }
});

router.get("/filters", async (req, res) => {
    try {
        // Initialize sections map to group filters by section
        const sectionsMap = {
            "Salesforce Expertise": new Set(),
            "Industry Expertise": new Set()
        };

        // Process each row's filters
        rows.forEach(row => {
            if (!row.filters) return;

            try {
                const parsed = typeof row.filters === "string"
                    ? JSON.parse(row.filters)
                    : row.filters;
                
                parsed.forEach(entry => {
                    const section = entry.section || "Salesforce Expertise"; // Default section
                    const filters = entry.filters || [];
                    
                    if (sectionsMap[section]) {
                        filters.forEach(filter => sectionsMap[section].add(filter));
                    } else {
                        sectionsMap[section] = new Set(filters);
                    }
                });
            } catch (err) {
                console.error("Error parsing filters JSON:", err);
            }
        });

        // Convert the map to the expected format for frontend
        const responseData = Object.entries(sectionsMap).map(([section, filtersSet]) => ({
            section,
            filters: [...filtersSet].filter(Boolean)
        }));

        res.json(responseData);
    } catch (err) {
        console.error("❌ Error fetching Salesforce filters:", err);
        res.status(500).json({ error: "Failed to fetch Salesforce filter data" });
    }
});

// Download Excel
router.get("/downloadExcel", async (req, res) => {
    initializeDatabase();
    try {
        // Parse selected fields
        const selectedFields = req.query.fields ? JSON.parse(req.query.fields) : [];

        // Create a map of id -> filters for easier lookup
        const filtersMap = {};
        filtersRows.forEach(row => {
            filtersMap[row.id] = row.filters;
        });

        // Generate the Excel file
        const fileName = "salesforce_partners.xlsx";
        const filePath = await exportToExcel(rows, filtersMap, fileName);

        // Send the file as download
        res.download(filePath, fileName, (err) => {
            if (err) {
                console.error("❌ File Download Error:", err.message);
                res.status(500).json({ success: false, error: "Failed to send Excel file." });
            } else {
                console.log("✅ Excel file downloaded successfully");
            }
        });
    } catch (error) {
        console.error("❌ Excel Export Error:", error.message || error);
        res.status(500).json({ success: false, error: "Failed to generate Excel file." });
    }
});

module.exports = router;