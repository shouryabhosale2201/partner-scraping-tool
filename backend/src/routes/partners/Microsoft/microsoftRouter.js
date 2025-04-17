const express = require("express");
const scrapeData = require("./microsoftScraper");
const exportToExcel = require("./microsoftExcel");
const {db, initializeDatabase} = require("../../../db");
const router = express.Router();

// API to Scrape Data and Store in Database
router.get("/scrape", async (req, res) => {
    try {
        console.log("🔄 Scraping fresh data from microsoft");
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
                m.id, 
                m.name, 
                d.description,  
                d.product, 
                d.solutions, 
                d.serviceType 
            FROM microsoft m
            LEFT JOIN microsoft_details d ON m.id = d.id
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
        const [rows] = await db.execute(`
            SELECT 
                m.id,
                m.name,
                d.description, 
                d.product,
                d.solutions,
                d.serviceType,
                f.industry 
            FROM microsoft m
            LEFT JOIN microsoft_details d ON m.id = d.id
            LEFT JOIN microsoft_filters f ON m.id = f.id
        `);
        
        if (!rows || rows.length === 0) {
            return res.status(404).json({ success: false, error: "No data available to export." });
        }
        
        // Process rows to handle JSON fields
        const processedRows = rows.map(row => {
            const processedRow = {
                id: row.id,
                name: row.name,
                description: row.description || ""
            };
            
            // Safely process JSON fields
            ['product', 'solutions', 'serviceType'].forEach(field => {
                if (row[field]) {
                    try {
                        // Try to parse as JSON if it's a string
                        const parsed = typeof row[field] === 'string' ? JSON.parse(row[field]) : row[field];
                        processedRow[field] = typeof parsed === 'object' ? JSON.stringify(parsed) : String(parsed);
                    } catch (e) {
                        // If parsing fails, just use the original value as a string
                        processedRow[field] = String(row[field]);
                    }
                } else {
                    processedRow[field] = "";
                }
            });
            
            // Special handling for industry field as it's an array
            if (row.industry) {
                try {
                    const industryArray = typeof row.industry === 'string' ? JSON.parse(row.industry) : row.industry;
                    if (Array.isArray(industryArray)) {
                        processedRow.industry = industryArray.join(", ");
                    } else {
                        processedRow.industry = String(row.industry);
                    }
                } catch (e) {
                    processedRow.industry = String(row.industry);
                }
            } else {
                processedRow.industry = "";
            }
            
            return processedRow;
        });
        
        const filePath = exportToExcel(processedRows); // Excel file path
        
        res.download(filePath, "microsoft_partners.xlsx", (err) => {
            if (err) {
                console.error("❌ File Download Error:", err.message);
                res.status(500).json({ success: false, error: "Failed to send Excel file." });
            }
        });
    } catch (error) {
        console.error("❌ Excel Export Error:", error.message);
        res.status(500).json({ success: false, error: "Failed to generate Excel file." });
    }
});

module.exports = router;