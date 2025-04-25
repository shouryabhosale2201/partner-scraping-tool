// salesforceRouter.js
const express = require("express");
const scrapeData = require("./salesforceScraper");
const exportToExcel = require("./salesforceExcel");
const { db, initializeDatabase } = require("../../../db");
const router = express.Router();

// API to Scrape Data and Store in Database
router.get("/scrape", async (req, res) => {
    try {
        initializeDatabase();
        // Parse the selected fields from the request
        const selectedFields = req.query.fields ? JSON.parse(req.query.fields) : [];
        
        // Default fields if none selected
        const fieldsToScrape = selectedFields.length > 0 ? selectedFields : ['name', 'link', 'foundIn'];
        
        await db.execute("DELETE FROM salesforce_filters WHERE id >= 0");
        await db.execute("DELETE FROM salesforce_details WHERE id >= 0");
        await db.execute("DELETE FROM salesforce WHERE id >= 0");
        await db.execute("ALTER TABLE salesforce AUTO_INCREMENT = 1");
        await db.execute("ALTER TABLE salesforce_details AUTO_INCREMENT = 1");
        await db.execute("ALTER TABLE salesforce_filters AUTO_INCREMENT = 1");
        console.log("🧹 Salesforce tables cleared!");
        console.log("🔄 Scraping fresh data from salesforce");
        console.log("📋 Fields to scrape:", fieldsToScrape);
        
        const data = await scrapeData(fieldsToScrape);
        res.json({ success: true, data });
    } catch (error) {
        console.error("❌ Scraping Error:", error.message);
        res.status(500).json({ success: false, error: "Failed to scrape data." });
    }
});

router.get("/fetch", async (req, res) => {
    initializeDatabase();

    try {
        // Parse the filter parameters
        const salesforceExpertise = req.query.salesforceExpertise ? JSON.parse(req.query.salesforceExpertise) : [];
        const industryExpertise = req.query.industryExpertise ? JSON.parse(req.query.industryExpertise) : [];
        
        // Parse selected fields
        const selectedFields = req.query.fields ? JSON.parse(req.query.fields) : [];
        
        // Build dynamic SELECT query based on fields
        let selectFields = "";
        
        // Always include id (needed for joins)
        selectFields = "s.id";
        
        // Add selected fields or default fields
        if (selectedFields.length > 0) {
            if (selectedFields.includes('name')) selectFields += ", s.name";
            if (selectedFields.includes('link')) selectFields += ", d.link";
            if (selectedFields.includes('tagline')) selectFields += ", d.tagline";
            if (selectedFields.includes('description')) selectFields += ", d.description";
            if (selectedFields.includes('expertise')) selectFields += ", d.expertise";
            if (selectedFields.includes('industries')) selectFields += ", d.industries";
            if (selectedFields.includes('services')) selectFields += ", d.services";
            if (selectedFields.includes('extendedDescription')) selectFields += ", d.extendedDescription";
        } else {
            // Default fields if none selected
            selectFields += ", s.name, d.link";
        }
        
        // If no filters, just fetch all data
        if (!salesforceExpertise.length && !industryExpertise.length) {
            const [rows] = await db.execute(`
                SELECT 
                    ${selectFields}
                FROM salesforce s
                LEFT JOIN salesforce_details d ON s.id = d.id
            `);
            
            return res.json({ success: true, data: rows });
        }
        
        // If we have filters, construct query with conditions
        let query = `
            SELECT 
                ${selectFields}
            FROM salesforce s
            LEFT JOIN salesforce_details d ON s.id = d.id
            LEFT JOIN salesforce_filters f ON s.id = f.id
            WHERE 1=1
        `;
        
        const queryParams = [];
        
        // Add filter conditions
        if (salesforceExpertise.length > 0) {
            salesforceExpertise.forEach(filter => {
                query += ` AND f.filters LIKE ?`;
                queryParams.push(`%${filter}%`);
            });
        }
        
        if (industryExpertise.length > 0) {
            industryExpertise.forEach(filter => {
                query += ` AND f.filters LIKE ?`;
                queryParams.push(`%${filter}%`);
            });
        }
        
        const [rows] = await db.execute(query, queryParams);
        res.json({ success: true, data: rows });

    } catch (error) {
        console.error("❌ Salesforce Filter Fetch Error:", error.message);
        res.status(500).json({ success: false, error: "Failed to fetch filtered Salesforce data." });
    }
});

router.get("/filters", async (req, res) => {
    try {
        const [rows] = await db.query(`SELECT filters FROM salesforce_filters`);

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
        
        // Build dynamic SELECT query based on fields
        let selectFields = "s.id";
        
        // Add selected fields or default fields
        if (selectedFields.length > 0) {
            if (selectedFields.includes('name')) selectFields += ", s.name";
            if (selectedFields.includes('link')) selectFields += ", d.link";
            if (selectedFields.includes('tagline')) selectFields += ", d.tagline";
            if (selectedFields.includes('description')) selectFields += ", d.description";
            if (selectedFields.includes('expertise')) selectFields += ", d.expertise";
            if (selectedFields.includes('industries')) selectFields += ", d.industries";
            if (selectedFields.includes('services')) selectFields += ", d.services";
            if (selectedFields.includes('extendedDescription')) selectFields += ", d.extendedDescription";
        } else {
            // Default fields if none selected
            selectFields += ", s.name, d.link";
        }

        // Get main data joined with details
        const [rows] = await db.execute(`
            SELECT 
                ${selectFields}
            FROM salesforce s
            LEFT JOIN salesforce_details d ON s.id = d.id
        `);

        if (!rows || rows.length === 0) {
            return res.status(404).json({ success: false, error: "No data available to export." });
        }

        // Get filters data
        const [filtersRows] = await db.execute(`
            SELECT id, filters 
            FROM salesforce_filters
        `);

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
                // Clean up if needed
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