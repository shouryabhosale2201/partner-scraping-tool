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
        const fieldsToScrape = selectedFields.length > 0 ? selectedFields : ['name', 'link', 'foundIn'];
        console.log(fieldsToScrape)
        const data = await scrapeData(fieldsToScrape);
        res.json({ success: true, data });
    } catch (error) {
        console.error("❌ Scraping Error:", error.message);
        res.status(500).json({ success: false, error: "Failed to scrape data." });
    }
});

router.get("/fetch", async (req, res) => {
    try {
        const rawData = await fs.readFile(Salesforce_File, "utf-8");
        const partners = JSON.parse(rawData);
        // Parse query parameters
        const salesforceExpertise = req.query.salesforceExpertise ? JSON.parse(req.query.salesforceExpertise) : [];
        const industryExpertise = req.query.industryExpertise ? JSON.parse(req.query.industryExpertise) : [];
        const selectedFields = req.query.fields ? JSON.parse(req.query.fields) : [];
        // Helper function to check if a partner matches a section + filters
        const matchesFilters = (foundIn, section, filters) => {
            const entry = foundIn.find(f => f.section === section);
            if (!entry) return false;
            return filters.every(f => entry.filters.includes(f));
        };
        // Filter data based on provided filters
        let filtered = partners.filter(partner => {
            const foundIn = partner.foundIn || [];
            const matchesSalesforce = salesforceExpertise.length === 0 || matchesFilters(foundIn, "Salesforce Expertise", salesforceExpertise);
            const matchesIndustry = industryExpertise.length === 0 || matchesFilters(foundIn, "Industry Expertise", industryExpertise);
            // Apply AND within each section, OR across sections
            return (salesforceExpertise.length && industryExpertise.length)
                ? matchesSalesforce || matchesIndustry
                : matchesSalesforce && matchesIndustry;
        });
        // Only include requested fields, always include "name" and "link" if no fields specified
        if (selectedFields.length > 0) {
            filtered = filtered.map(partner => {
                const partial = {};
                selectedFields.forEach(field => {
                    if (partner[field] !== undefined) {
                        partial[field] = partner[field];
                    }
                });
                return partial;
            });
        } else {
            // Default fields if none specified
            filtered = filtered.map(({ name, link }) => ({ name, link }));
        }
        res.json({ success: true, data: filtered });
    } catch (error) {
        console.error(":x: Salesforce Filter Fetch Error:", error.message);
        res.status(500).json({ success: false, error: "Failed to fetch filtered Salesforce data." });
    }
});
router.get("/filters", async (req, res) => {
    try {
        const rawData = await fs.readFile(Salesforce_File, "utf-8");
        const partners = JSON.parse(rawData);
        // Initialize map to group filters by section
        const sectionsMap = {};
        partners.forEach((partner) => {
            if (!partner.foundIn) return;
            partner.foundIn.forEach(({ section, filters }) => {
                if (!sectionsMap[section]) {
                    sectionsMap[section] = new Set();
                }
                filters.forEach((filter) => {
                    if (filter) sectionsMap[section].add(filter);
                });
            });
        });
        // Convert sets to arrays for response
        const responseData = Object.entries(sectionsMap).map(([section, filtersSet]) => ({
            section,
            filters: [...filtersSet]
        }));
        res.json(responseData);
    } catch (err) {
        console.error(":x: Error reading Salesforce filters from file:", err);
        res.status(500).json({ error: "Failed to fetch Salesforce filter data" });
    }
});


router.get("/downloadExcel", async (req, res) => {
    try {
      const rawData = await fs.readFile(Salesforce_File, "utf-8");
      const partners = JSON.parse(rawData);
      
      // Parse selected fields
      const selectedFields = req.query.fields ? JSON.parse(req.query.fields) : [];
      
      // Build filtersMap from `foundIn` field in JSON but exclude it from output
      const filtersMap = {};
      const dataWithIds = partners.map((item, idx) => {
        const id = `${idx}`; // Generate a pseudo-id since JSON has no database id
        filtersMap[id] = item.foundIn || [];
        return { id, ...item };
      });
      
      // Apply selectedFields if provided, explicitly excluding foundIn
      const rows = dataWithIds.map(item => {
        const result = { id: item.id };
        
        if (selectedFields.length > 0) {
          selectedFields
            .filter(field => field !== 'foundIn') // Explicitly filter out foundIn
            .forEach(field => {
              if (item[field] !== undefined) {
                result[field] = item[field];
              }
            });
        } else {
          // Default fields, explicitly excluding foundIn
          result.name = item.name;
          result.link = item.link;
        }
        
        return result;
      });
      
      // Generate the Excel file
      const fileName = "salesforce_partners.xlsx";
      const filePath = await exportToExcel(rows, filtersMap, fileName);
      
      // Send the file as download
      res.download(filePath, fileName, (err) => {
        if (err) {
          console.error(":x: File Download Error:", err.message);
          res.status(500).json({ success: false, error: "Failed to send Excel file." });
        } else {
          console.log(":white_check_mark: Excel file downloaded successfully");
        }
      });
    } catch (error) {
      console.error(":x: Excel Export Error:", error.message || error);
      res.status(500).json({ success: false, error: "Failed to generate Excel file." });
    }
  });

module.exports = router;