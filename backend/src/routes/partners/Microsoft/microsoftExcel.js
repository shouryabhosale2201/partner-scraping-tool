const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

/**
 * Exports data to Excel file with proper field formatting
 * @param {Array} data - Array of objects to export
 * @param {String} fileName - Name of the output Excel file
 * @returns {String} - Path to the created Excel file
 */
const exportToExcel = (data, fileName = "microsoft_partners.xlsx") => {
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("No data provided for Excel export.");
  }

  // Create worksheet with data as is - JSON fields should already be handled
  const worksheet = XLSX.utils.json_to_sheet(data);
  
  // Adjust column widths for better readability
  const colWidths = [
    { wch: 10 },  // id
    { wch: 30 },  // name
    { wch: 50 },  // description
    { wch: 30 },  // product
    { wch: 30 },  // solutions
    { wch: 30 },  // serviceType
    { wch: 30 }   // industry
  ];
  
  worksheet['!cols'] = colWidths;
  
  // Create workbook and add worksheet
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Partners");

  // Generate unique filename to avoid conflicts
  const timestamp = new Date().getTime();
  const uniqueFileName = fileName.replace('.xlsx', `-${timestamp}.xlsx`);
  const filePath = path.join(__dirname, uniqueFileName);
  
  // Write file
  XLSX.writeFile(workbook, filePath);

  console.log(`✅ Excel file created at: ${filePath}`);
  return filePath;
};

module.exports = exportToExcel;