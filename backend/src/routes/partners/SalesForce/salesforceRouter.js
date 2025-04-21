const express = require("express");
const scrapeData = require("./salesforceScraper");
const exportToExcel = require("./salesforceExcel");
const { db, initializeDatabase } = require("../../../db");
const router = express.Router();

// API to Scrape Data and Store in Database
router.get("/scrape", async (req, res) => {
    try {
        await db.execute("DELETE FROM salesforce_filters WHERE id >= 0");
        await db.execute("DELETE FROM salesforce_details WHERE id >= 0");
        await db.execute("DELETE FROM salesforce WHERE id >= 0");
        await db.execute("ALTER TABLE salesforce AUTO_INCREMENT = 1");
        await db.execute("ALTER TABLE salesforce_details AUTO_INCREMENT = 1");
        await db.execute("ALTER TABLE salesforce_filters AUTO_INCREMENT = 1");
        console.log("🧹 Salesforce tables cleared!");
        console.log("🔄 Scraping fresh data from salesforce");
        const data = await scrapeData();
        res.json({ success: true, data });
    } catch (error) {
        console.error("❌ Scraping Error:", error.message);
        res.status(500).json({ success: false, error: "Failed to scrape data." });
    }
});

// API to Fetch Data from Database
// router.get("/fetch", async (req, res) => {
//     initializeDatabase();
//     try {
//         const [rows] = await db.execute(`
//             SELECT 
//                 s.id,
//                 s.name,
//                 d.link,
//                 d.tagline,
//                 d.description,
//                 d.expertise,
//                 d.industries,
//                 d.services,
//                 d.extendedDescription
//             FROM salesforce s
//             LEFT JOIN salesforce_details d ON s.id = d.id
//         `);

//         res.json({ success: true, data: rows });
//     } catch (error) {
//         console.error("❌ Database Fetch Error:", error.message);
//         res.status(500).json({ success: false, error: "Failed to fetch data." });
//     }
// });

router.get("/fetch", async (req, res) => {
    initializeDatabase();

    try {
        const filters = req.query.filters ? JSON.parse(req.query.filters) : [];

        let query = `
            SELECT 
                s.id,
                s.name,
                d.link,
                d.tagline,
                d.description,
                d.expertise,
                d.industries,
                d.services,
                d.extendedDescription
            FROM salesforce s
            LEFT JOIN salesforce_details d ON s.id = d.id
            LEFT JOIN salesforce_filters f ON s.id = f.id
        `;

        const queryParams = [];

        if (filters.length > 0) {
            query += `
                WHERE EXISTS (
                    SELECT 1
                    FROM JSON_TABLE(f.filters, '$[*]' COLUMNS(
                        filterList JSON PATH '$.filters'
                    )) AS ft
                    WHERE JSON_CONTAINS(ft.filterList, JSON_ARRAY(?))
                )
            `;
            // We use the first value of filters just to satisfy JSON_ARRAY(?)
            // and will dynamically build JSON_ARRAY('A', 'B', 'C') from your filter list
            query = query.replace("JSON_ARRAY(?)", `JSON_ARRAY(${filters.map(() => '?').join(', ')})`);
            queryParams.push(...filters);
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

        const allFilters = rows.flatMap(row => {
            if (!row.filters) return [];

            try {
                const parsed = typeof row.filters === "string"
                    ? JSON.parse(row.filters)
                    : row.filters;

                return parsed.flatMap(entry => entry.filters || []);
            } catch (err) {
                console.error("Error parsing filters JSON:", err);
                return [];
            }
        });

        const uniqueFilters = [...new Set(allFilters)].filter(Boolean);
        console.log(uniqueFilters);
        // Send in the frontend-friendly format
        res.json([
            {
                section: "Salesforce Expertise",
                filters: uniqueFilters
            }
        ]);
    } catch (err) {
        console.error("❌ Error fetching Salesforce filters:", err);
        res.status(500).json({ error: "Failed to fetch Salesforce filter data" });
    }
});


// Download Excel
router.get("/downloadExcel", async (req, res) => {
    initializeDatabase();
    try {
        // Get main data joined with details
        const [rows] = await db.execute(`
            SELECT 
                s.id,
                s.name,
                d.link,
                d.tagline,
                d.description,
                d.expertise,
                d.industries,
                d.services,
                d.extendedDescription
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

        // Create Excel file with data and filters
        const filePath = await exportToExcel(rows, filtersMap);

        // Send the file as download
        res.download(filePath, "salesforce_partners.xlsx", (err) => {
            if (err) {
                console.error("❌ File Download Error:", err.message);
                res.status(500).json({ success: false, error: "Failed to send Excel file." });
            } else {
                console.log("✅ Excel file downloaded successfully");
                // Optionally clean up the file after sending
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