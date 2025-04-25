const express = require("express");
const scrapeData = require("./microsoftScraper");
const exportToExcel = require("./microsoftExcel");
const { db, initializeDatabase } = require("../../../db");
const router = express.Router();
const fs = require("fs");

// API to Scrape Data and Store in Database
router.get("/scrape", async (req, res) => {
    try {
        initializeDatabase();
        await db.execute("DELETE FROM microsoft_filters WHERE id >= 0");
        await db.execute("DELETE FROM microsoft_details WHERE id >= 0");
        await db.execute("DELETE FROM microsoft WHERE id >= 0");
        await db.execute("ALTER TABLE microsoft AUTO_INCREMENT = 1");
        await db.execute("ALTER TABLE microsoft_details AUTO_INCREMENT = 1");
        await db.execute("ALTER TABLE microsoft_filters AUTO_INCREMENT = 1");
        console.log("🧹 Microsoft tables cleared!");
        console.log("🔄 Scraping fresh data from microsoft");
        
        // Get selected fields from request query params
        const selectedFields = req.query.fields ? JSON.parse(req.query.fields) : ['name', 'industryFocus'];
        
        // Pass selected fields to scraper
        const data = await scrapeData(selectedFields);
        res.json({ success: true, data });
    } catch (error) {
        console.error("❌ Scraping Error:", error.message);
        res.status(500).json({ success: false, error: "Failed to scrape data." });
    }
});

router.get("/fetch", async (req, res) => {
    initializeDatabase(); // Ensure the database connection is initialized
    try {
        // Parse the selected fields from query parameters if available
        const selectedFields = req.query.fields ? JSON.parse(req.query.fields) : null;

        // Build the query with only selected fields from the database
        // We always need the ID and name fields for proper functioning
        let query = `
            SELECT
                m.id,
                m.name
        `;
        
        // Get the columns that actually exist in the database
        const [columns] = await db.execute(`SHOW COLUMNS FROM microsoft_details`);
        const availableColumns = columns.map(col => col.Field);
        
        // Define column mapping for all possible fields
        const columnMapping = {
            'description': 'd.description',
            'product': 'd.product',
            'solutions': 'd.solutions',
            'serviceType': 'd.serviceType',
            'industryFocus': 'd.industryFocus'
        };
        
        // Add each available column to the SELECT clause if it was selected
        Object.entries(columnMapping).forEach(([key, value]) => {
            // Only include this field if it exists in the database AND (no specific fields were selected OR this field was selected)
            if (availableColumns.includes(key) && (!selectedFields || selectedFields.includes(key))) {
                query += `,\n                ${value}`;
            }
        });
        
        // Complete the query
        query += `
            FROM microsoft m
            LEFT JOIN microsoft_details d ON m.id = d.id
        `;
        
        const conditions = [];
        // Check if industries filter is provided
        if (req.query.industries) {
            const selectedIndustries = JSON.parse(req.query.industries);
            if (selectedIndustries.length > 0) {
                const industryConditions = selectedIndustries.map(industry =>
                    `JSON_CONTAINS(d.industryFocus, '"${industry}"')`
                );
                conditions.push(`(${industryConditions.join(' AND ')})`);
            }
        }
        // Check if products filter is provided
        if (req.query.products) {
            const selectedProducts = JSON.parse(req.query.products);
            if (selectedProducts.length > 0) {
                const productConditions = selectedProducts.map(product =>
                    `JSON_CONTAINS(d.product, '"${product}"')`
                );
                conditions.push(`(${productConditions.join(' AND ')})`);
            }
        }
        // Check if solutions filter is provided
        if (req.query.solutions) {
            const selectedSolutions = JSON.parse(req.query.solutions);
            if (selectedSolutions.length > 0) {
                const solutionConditions = selectedSolutions.map(solution =>
                    `JSON_CONTAINS(d.solutions, '"${solution}"')`
                );
                conditions.push(`(${solutionConditions.join(' AND ')})`);
            }
        }
        // Check if services filter is provided
        if (req.query.services) {
            const selectedServices = JSON.parse(req.query.services);
            if (selectedServices.length > 0) {
                const serviceConditions = selectedServices.map(service =>
                    `JSON_CONTAINS(d.serviceType, '"${service}"')`
                );
                conditions.push(`(${serviceConditions.join(' AND ')})`);
            }
        }
        // If any filters are applied, append the WHERE clause
        if (conditions.length > 0) {
            query += ` WHERE ${conditions.join(' AND ')}`;
        }
        
        console.log("Executing query:", query); // Debugging the query
        
        // Execute the query
        const [rows] = await db.execute(query);
        
        // Process rows to ensure consistent data format
        const processedRows = rows.map(row => {
            const processed = { ...row };
            
            // Process certain fields that might be JSON strings
            ['product', 'solutions', 'serviceType', 'industryFocus'].forEach(field => {
                if (processed[field]) {
                    try {
                        if (typeof processed[field] === 'string') {
                            processed[field] = JSON.parse(processed[field]);
                        }
                    } catch (e) {
                        // If parsing fails, keep the original value
                        console.warn(`Failed to parse JSON for field ${field}:`, e);
                    }
                }
            });
            
            return processed;
        });
        
        res.json({ success: true, data: processedRows });
    } catch (error) {
        console.error("❌ Database Fetch Error:", error.message);
        res.status(500).json({ success: false, error: "Failed to fetch data." });
    }
});

router.get("/filters", async (req, res) => {
    try {
        // Get column information first to see what fields are available
        const [columns] = await db.execute(`SHOW COLUMNS FROM microsoft_details`);
        const availableColumns = columns.map(col => col.Field);
        
        // Build dynamic query with only available columns
        const columnsToSelect = ['product', 'solutions', 'serviceType', 'industryFocus']
            .filter(col => availableColumns.includes(col));
        
        if (columnsToSelect.length === 0) {
            return res.json({
                product: [],
                solution: [],
                services: [],
                industry: []
            });
        }
        
        const selectClause = columnsToSelect.join(', ');
        
        const [rows] = await db.query(
            `SELECT ${selectClause} FROM microsoft_details`
        );

        const extractUnique = (key) => {
            if (!columnsToSelect.includes(key)) return [];
            
            const all = rows.flatMap(row => {
                const value = row[key];
                if (!value) return [];

                // If it's already an array, return it directly
                if (Array.isArray(value)) return value;

                // If it's a stringified array, try parsing it
                try {
                    const parsed = JSON.parse(value);
                    return Array.isArray(parsed) ? parsed : [];
                } catch {
                    return [];
                }
            });

            return [...new Set(all)].filter(Boolean);
        };

        // Extract unique values for each filter type
        const filters = {
            product: extractUnique("product"),
            solution: extractUnique("solutions"),
            services: extractUnique("serviceType"),
            industry: extractUnique("industryFocus"),
        };

        // Send filters as JSON response
        res.json(filters);
    } catch (err) {
        console.error("Error fetching filters:", err);
        res.status(500).json({ error: "Failed to fetch filter data" });
    }
});

// Download Excel with only scraped fields
router.get("/downloadExcel", async (req, res) => {
    initializeDatabase();
    try {
        // Get selected fields from query params if provided
        let selectedFields = req.query.fields ? JSON.parse(req.query.fields) : null;
        
        // Build dynamic query based on available fields
        let query = "SELECT m.id, m.name";
        
        // Get the columns that actually exist in the database
        const [columns] = await db.execute(`SHOW COLUMNS FROM microsoft_details`);
        const availableColumns = columns.map(col => col.Field);
        
        // Map field names to their database column names
        const fieldToColumn = {
            "description": "d.description",
            "product": "d.product",
            "solutions": "d.solutions",
            "serviceType": "d.serviceType",
            "industryFocus": "f.industry"
        };
        
        // If specific fields are requested, include only those fields
        if (selectedFields && selectedFields.length > 0) {
            // Always include ID and name
            Object.entries(fieldToColumn).forEach(([field, column]) => {
                if (selectedFields.includes(field) && availableColumns.includes(field.replace(/^d\./, ''))) {
                    query += `, ${column}`;
                }
            });
        } 
        // Otherwise include all available fields
        else {
            Object.values(fieldToColumn).forEach(column => {
                query += `, ${column}`;
            });
        }
        
        query += ` FROM microsoft m
            LEFT JOIN microsoft_details d ON m.id = d.id
            LEFT JOIN microsoft_filters f ON m.id = f.id`;

        const [rows] = await db.execute(query);

        if (!rows || rows.length === 0) {
            return res.status(404).json({ success: false, error: "No data available to export." });
        }

        // Process rows to handle JSON fields
        const processedRows = rows.map(row => {
            const processedRow = {
                id: row.id,
                name: row.name
            };

            // Process only fields that were selected
            ['description', 'product', 'solutions', 'serviceType', 'industry'].forEach(field => {
                if (!selectedFields || selectedFields.includes(field)) {
                    if (row[field]) {
                        try {
                            // Try to parse as JSON if it's a string
                            const parsed = typeof row[field] === 'string' ? JSON.parse(row[field]) : row[field];
                            processedRow[field] = Array.isArray(parsed) ? parsed.join(", ") : String(parsed);
                        } catch (e) {
                            // If parsing fails, just use the original value as a string
                            processedRow[field] = String(row[field]);
                        }
                    } else {
                        processedRow[field] = "";
                    }
                }
            });

            return processedRow;
        });

        const filePath = exportToExcel(processedRows); // Excel file path

        res.download(filePath, "microsoft_partners.xlsx", (err) => {
            if (err) {
                console.error("❌ File Download Error:", err.message);
                res.status(500).json({ success: false, error: "Failed to send Excel file." });
            } else {
                // Clean up the file after sending
                setTimeout(() => {
                    fs.unlink(filePath, (err) => {
                        if (err) console.error("Error deleting temporary Excel file:", err);
                    });
                }, 1000);
            }
        });
    } catch (error) {
        console.error("❌ Excel Export Error:", error.message);
        res.status(500).json({ success: false, error: "Failed to generate Excel file." });
    }
});

module.exports = router;