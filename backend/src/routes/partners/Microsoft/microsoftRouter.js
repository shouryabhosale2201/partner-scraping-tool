const express = require("express");
const scrapeData = require("./microsoftScraper");
const exportToExcel = require("./microsoftExcel");
const { db, initializeDatabase } = require("../../../db");
const router = express.Router();
const fs = require("fs");

// API to Scrape Data and Store in Database
router.get("/scrape", async (req, res) => {
    try {
        await db.execute("DELETE FROM microsoft_filters WHERE id >= 0");
        await db.execute("DELETE FROM microsoft_details WHERE id >= 0");
        await db.execute("DELETE FROM microsoft WHERE id >= 0");
        await db.execute("ALTER TABLE microsoft AUTO_INCREMENT = 1");
        await db.execute("ALTER TABLE microsoft_details AUTO_INCREMENT = 1");
        await db.execute("ALTER TABLE microsoft_filters AUTO_INCREMENT = 1");
        console.log("🧹 Microsoft tables cleared!");
        console.log("🔄 Scraping fresh data from microsoft");
        const data = await scrapeData();
        res.json({ success: true, data });
    } catch (error) {
        console.error("❌ Scraping Error:", error.message);
        res.status(500).json({ success: false, error: "Failed to scrape data." });
    }
});

router.get("/fetch", async (req, res) => {
    initializeDatabase(); // Ensure the database connection is initialized
    try {
        let query = `
            SELECT
                m.id,
                m.name,
                d.description,
                d.product,
                d.solutions,
                d.serviceType,
                d.industryFocus
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
        console.log(query);
        // Execute the query
        const [rows] = await db.execute(query);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error(":x: Database Fetch Error:", error.message);
        res.status(500).json({ success: false, error: "Failed to fetch data." });
    }
});

router.get("/filters", async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT product, solutions, serviceType, industryFocus FROM microsoft_details`
        );

        const extractUnique = (key) => {
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

        // Log filters for debugging purposes
        console.log("Returned filters:", filters);

        // Send filters as JSON response
        res.json(filters);
    } catch (err) {
        console.error("Error fetching filters:", err);
        res.status(500).json({ error: "Failed to fetch filter data" });
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