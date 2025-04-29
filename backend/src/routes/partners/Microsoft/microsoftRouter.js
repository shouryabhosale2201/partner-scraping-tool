// microsoftRouter.js
const express = require("express");
const scrapeData = require("./microsoftScraper");
const exportToExcel = require("./microsoftExcel");
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const DATA_DIR = path.join(__dirname, 'data'); // Adjust path if needed
const MICROSOFT_FILE = path.join(DATA_DIR, 'microsoft.json');

// API to Scrape Data and Store in Database
// Scrape Microsoft Partners and Save to JSON
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

// Fetch API
router.get("/fetch", async (req, res) => {
    try {
        // Read the microsoft.json file
        const data = JSON.parse(await fs.readFile(MICROSOFT_FILE, 'utf-8'));

        // Parse selected fields if provided
        const selectedFields = req.query.fields ? JSON.parse(req.query.fields) : null;

        let filteredData = data;

        // Apply industry, product, solution, serviceType and  country filters
        const applyFilter = (field, selectedValues) => {
            if (!selectedValues || selectedValues.length === 0) return;
            filteredData = filteredData.filter(item => {
                const itemField = item[field] || [];
                return selectedValues.every(val => itemField.includes(val));
            });
        };

        if (req.query.industries) {
            const selectedIndustries = JSON.parse(req.query.industries);
            applyFilter('industryFocus', selectedIndustries);
        }
        if (req.query.products) {
            const selectedProducts = JSON.parse(req.query.products);
            applyFilter('product', selectedProducts);
        }
        if (req.query.solutions) {
            const selectedSolutions = JSON.parse(req.query.solutions);
            applyFilter('solutions', selectedSolutions);
        }
        if (req.query.services) {
            const selectedServices = JSON.parse(req.query.services);
            applyFilter('serviceType', selectedServices);
        }
        if (req.query.countries) {
            const selectedCountries = JSON.parse(req.query.countries);
            applyFilter('country', selectedCountries);
        }
        const allFields = new Set(data.flatMap(entry => Object.keys(entry)));
        const missingFields = selectedFields?.filter(f => !allFields.has(f)) || [];

        if (missingFields.length > 0) {
            console.warn(`⚠️ Missing fields in data: ${missingFields.join(", ")}`);
        }
        // Select only the requested fields
        if (selectedFields && selectedFields.length > 0) {
            filteredData = filteredData.map(item => {
                const newItem = { id: item.id, name: item.name,link: item.link }; // Always include id and name
                selectedFields.forEach(field => {
                    if (item[field] !== undefined) {
                        newItem[field] = item[field];
                    }
                });
                return newItem;
            });
        }

        res.json({ success: true, data: filteredData });
    } catch (error) {
        console.error("❌ Fetch Error:", error.message);
        res.status(500).json({ success: false, error: "Failed to fetch data." });
    }
});

// Filters API
router.get("/filters", async (req, res) => {
    try {
        const data = JSON.parse(await fs.readFile(MICROSOFT_FILE, 'utf-8'));

        const extractUnique = (field) => {
            const all = data.flatMap(item => item[field] || []);
            return [...new Set(all)].filter(Boolean);
        };

        const filters = {
            product: extractUnique('product'),
            solution: extractUnique('solutions'),
            services: extractUnique('serviceType'),
            industry: extractUnique('industryFocus'),
            country: extractUnique('country')
        };

        res.json(filters);
    } catch (error) {
        console.error("❌ Filters Error:", error.message);
        res.status(500).json({ error: "Failed to fetch filter data" });
    }
});


// Download Excel with only scraped fields
router.get("/downloadExcel", async (req, res) => {
    try {
        const data = JSON.parse(await fs.readFile(MICROSOFT_FILE, 'utf-8'));
        const selectedFields = req.query.fields ? JSON.parse(req.query.fields) : null;

        const allAvailableFields = new Set(data.flatMap(entry => Object.keys(entry)));
        const defaultFields = ['id', 'name','link'];
        const allowedFields = ['description', 'product', 'solutions', 'serviceType', 'industryFocus','country'];

        const validFields = selectedFields && selectedFields.length > 0
            ? selectedFields.filter(f => allAvailableFields.has(f))
            : allowedFields.filter(f => allAvailableFields.has(f));

        const fieldsToInclude = [...defaultFields, ...validFields];


        const formattedData = data.map(entry => {
            const row = {};
            fieldsToInclude.forEach(field => {
                if (Array.isArray(entry[field])) {
                    row[field] = entry[field].join(', ');
                } else if (entry[field]) {
                    row[field] = entry[field];
                } else {
                    row[field] = '';
                }
            });
            return row;
        });

        const filePath = exportToExcel(formattedData); // Returns full path to .xlsx file

        res.download(filePath, "microsoft_partners.xlsx", (err) => {
            if (err) {
                console.error("❌ File Download Error:", err.message);
                res.status(500).json({ success: false, error: "Failed to send Excel file." });
            } else {
                setTimeout(() => {
                    fs.unlink(filePath).catch(err =>
                        console.error("Error deleting temporary Excel file:", err)
                    );
                }, 1000);
            }
        });
    } catch (error) {
        console.error("❌ Excel Export Error:", error.message);
        res.status(500).json({ success: false, error: "Failed to generate Excel file." });
    }
});


module.exports = router;