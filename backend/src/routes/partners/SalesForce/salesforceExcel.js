const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

/**
 * Export Salesforce partners data to Excel
 * @param {Array} data - Array of partner objects
 * @param {Object} filtersMap - Map of filters by partner ID
 * @param {Object} countriesMap - Map of countries data by partner ID
 * @param {String} fileName - Output file name
 * @returns {String} - Path to created Excel file
 */
const exportToExcel = (data, filtersMap, countriesMap, fileName = "salesforce_partners.xlsx") => {
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("No data provided for Excel export.");
  }

  // Format each item to include Salesforce Expertise, Industry Expertise, and Countries from maps
  const formattedData = data.map(item => {
    const formattedItem = { ...item };
    // Remove ID from the exported data as it's just for internal use
    delete formattedItem.id;
    
    const filterObjects = filtersMap[item.id] || [];
    const countriesData = countriesMap[item.id] || {};
    
    // Extract filters by section
    const getFiltersBySection = (section) => {
      const entry = filterObjects.find(f => f.section === section);
      return entry && Array.isArray(entry.filters) ? entry.filters.join(", ") : "";
    };
    
    // Add expertise columns
    formattedItem["Salesforce Expertise"] = getFiltersBySection("Salesforce Expertise");
    formattedItem["Industry Expertise"] = getFiltersBySection("Industry Expertise");
    
    // Format and add countries data
    Object.entries(countriesData).forEach(([countryGroup, regions]) => {
      if (Array.isArray(regions) && regions.length > 0) {
        formattedItem[`${countryGroup} Regions`] = regions.join(", ");
      }
    });
    
    return formattedItem;
  });

  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(formattedData);
  
  // Apply autofilter to the first row
  const columnCount = Object.keys(formattedData[0]).length;
  const lastColumnLetter = XLSX.utils.encode_col(columnCount - 1);
  worksheet['!autofilter'] = { ref: `A1:${lastColumnLetter}1` };
  
  // Set predefined custom column widths for better readability
  const columnWidths = [
    { wch: 50 },  // Partner name
    { wch: 70 },  // Link
    { wch: 50 },  // Salesforce Expertise
    { wch: 50 },  // Industry Expertise
    { wch: 60 },  // UnitedStates Regions
    { wch: 50 },  // Canada Regions
    { wch: 60 },  // International Regions
    { wch: 50 },  // Any other columns
    { wch: 50 },
    { wch: 50 }
  ];
  worksheet['!cols'] = columnWidths;
  
  // Create workbook and append worksheet
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Partners");
  
  // Write to file
  const filePath = path.join(__dirname, fileName);
  XLSX.writeFile(workbook, filePath);
  
  console.log(`:white_check_mark: Excel file created at: ${filePath}`);
  return filePath;
};

module.exports = exportToExcel;