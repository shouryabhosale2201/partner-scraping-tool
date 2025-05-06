// salesforceRouter.js
const express = require("express");
const scrapeData = require("./salesforceScraper");
const exportToExcel = require("./salesforceExcel");
const router = express.Router();
const path = require('path');
const fs = require("fs").promises;

const DATA_DIR = path.join(__dirname, 'data');
const Salesforce_File = path.join(DATA_DIR, 'salesforce_partners.json');

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

// router.get("/fetch", async (req, res) => {
//     try {
//         const rawData = await fs.readFile(Salesforce_File, "utf-8");
//         const partners = JSON.parse(rawData);

//         // Parse query parameters (filters)
//         const salesforceExpertise = req.query.salesforceExpertise ? JSON.parse(req.query.salesforceExpertise) : [];
//         const industryExpertise = req.query.industryExpertise ? JSON.parse(req.query.industryExpertise) : [];
//         const regionFilters = req.query.regionFilters ? JSON.parse(req.query.regionFilters) : [];
//         const selectedFields = req.query.fields ? JSON.parse(req.query.fields) : [];

//         // Function to match Salesforce/Industry Expertise filters
//         const matchesFilters = (foundIn, section, filters) => {
//             const entry = foundIn.find(f => f.section === section);
//             if (!entry) return false;
//             return filters.every(f => entry.filters.includes(f));
//         };

//         // Filter partners based on all conditions (AND logic)
//         // For all filter categories
//         let filtered = partners.filter(partner => {
//             const foundIn = partner.foundIn || [];
//             const countries = partner.countries || {};

//             // Check Salesforce Expertise
//             const matchesSalesforce = salesforceExpertise.length === 0 ||
//                 matchesFilters(foundIn, "Salesforce Expertise", salesforceExpertise);

//             // Check Industry Expertise
//             const matchesIndustry = industryExpertise.length === 0 ||
//                 matchesFilters(foundIn, "Industry Expertise", industryExpertise);

//             // Check Regions - a simple flat check to see if ANY selected region exists
//             const allRegions = Object.values(countries).flat(); // Get all regions regardless of country
//             const matchesRegions = regionFilters.length === 0 ||
//                 regionFilters.every(region => allRegions.includes(region));

//             // Apply AND logic to all filter categories
//             return matchesSalesforce && matchesIndustry && matchesRegions;
//         });

//         // If selectedFields are provided, filter the response data accordingly
//         if (selectedFields.length > 0) {
//             filtered = filtered.map(partner => {
//                 const partial = {};
//                 selectedFields.forEach(field => {
//                     if (partner[field] !== undefined) {
//                         partial[field] = partner[field];
//                     }
//                 });
//                 return partial;
//             });
//         } else {
//             // If no specific fields are selected, return only name and link
//             filtered = filtered.map(({ name, link }) => ({ name, link }));
//         }

//         // Return filtered results
//         res.json({ success: true, data: filtered });
//     } catch (error) {
//         console.error(":x: Salesforce Filter Fetch Error:", error.message);
//         res.status(500).json({ success: false, error: "Failed to fetch filtered Salesforce data." });
//     }
// });


// router.get("/filters", async (req, res) => {
//     try {
//         const rawData = await fs.readFile(Salesforce_File, "utf-8");
//         const partners = JSON.parse(rawData);
//         const sectionsMap = {};

//         // Section filters: Salesforce Expertise & Industry Expertise
//         partners.forEach((partner) => {
//             if (partner.foundIn) {
//                 partner.foundIn.forEach(({ section, filters }) => {
//                     if (!sectionsMap[section]) sectionsMap[section] = new Set();
//                     filters.forEach((filter) => {
//                         if (filter) sectionsMap[section].add(filter);
//                     });
//                 });
//             }
//         });

//         // Country + Regions as nested structure
//         const countryFilters = [];

//         partners.forEach((partner) => {
//             if (partner.countries) {
//                 Object.entries(partner.countries).forEach(([countryGroup, regions]) => {
//                     let countryEntry = countryFilters.find(entry => entry.label === countryGroup);
//                     if (!countryEntry) {
//                         countryEntry = { label: countryGroup, children: new Set() };
//                         countryFilters.push(countryEntry);
//                     }
//                     regions.forEach(region => {
//                         if (region) countryEntry.children.add(region);
//                     });
//                 });
//             }
//         });

//         // Final transformation
//         const responseData = [];

//         // Push country group with nested regions
//         responseData.push({
//             section: "Country",
//             filters: countryFilters.map(({ label, children }) => ({
//                 label,
//                 children: Array.from(children).sort()
//             }))
//         });

//         // Push expertise sections
//         Object.entries(sectionsMap).forEach(([section, filtersSet]) => {
//             if (section !== "Country" && section !== "Region") {
//                 responseData.push({
//                     section,
//                     filters: [...filtersSet].sort()
//                 });
//             }
//         });

//         res.json(responseData);
//     } catch (err) {
//         console.error("❌ Error reading Salesforce filters from file:", err);
//         res.status(500).json({ error: "Failed to fetch Salesforce filter data" });
//     }
// });






// router.get("/downloadExcel", async (req, res) => {
//     try {
//         // Read all data directly from the JSON file
//         const rawData = await fs.readFile(Salesforce_File, "utf-8");
//         const allPartners = JSON.parse(rawData);

//         // Parse selected fields
//         const selectedFields = req.query.fields ? JSON.parse(req.query.fields) : [];

//         // If no specific fields are selected, use default fields
//         const fieldsToInclude = selectedFields.length > 0 ? selectedFields : ['name', 'link'];

//         // Process all partners for Excel export
//         const dataWithIds = allPartners.map((item, idx) => {
//             // Create a new object with only the selected fields
//             const filteredItem = { id: `${idx}` }; // Add ID for reference in maps
            
//             fieldsToInclude.forEach(field => {
//                 if (field !== 'foundIn' && field !== 'countries' && item[field] !== undefined) {
//                     filteredItem[field] = item[field];
//                 }
//             });
            
//             return filteredItem;
//         });

//         // Build maps for expertise and countries data
//         const filtersMap = {};
//         const countriesMap = {};
        
//         allPartners.forEach((item, idx) => {
//             const id = `${idx}`;
//             filtersMap[id] = item.foundIn || [];
            
//             // Include countries data separately for better formatting in Excel
//             if (item.countries) {
//                 countriesMap[id] = item.countries;
//             }
//         });

//         // Generate the Excel file
//         const fileName = "salesforce_partners.xlsx";
//         const filePath = await exportToExcel(dataWithIds, filtersMap, countriesMap, fileName);

//         // Send the file as download
//         res.download(filePath, fileName, (err) => {
//             if (err) {
//                 console.error(":x: File Download Error:", err.message);
//                 res.status(500).json({ success: false, error: "Failed to send Excel file." });
//             } else {
//                 console.log(":white_check_mark: Excel file downloaded successfully");
//             }
//         });
//     } catch (error) {
//         console.error(":x: Excel Export Error:", error.message || error);
//         res.status(500).json({ success: false, error: "Failed to generate Excel file." });
//     }
// });


module.exports = router;