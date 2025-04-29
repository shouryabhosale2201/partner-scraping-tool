const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

const exportToExcel = (data, fileName = "oracle_partners.xlsx") => {
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("No data provided for Excel export.");
  }

  // Add filters and locations to each row if they don't exist
  const formattedData = data.map(item => {
    const formattedItem = { ...item };

    // Ensure filters and locations are visible as columns
    formattedItem.filters = item.filters?.map(f => f.level4Name).join(", ") || "";
    formattedItem.locations = item.locations?.join(", ") || "";

    return formattedItem;
  });

  const worksheet = XLSX.utils.json_to_sheet(formattedData);

  // Apply autofilter to the first row
  const columnCount = Object.keys(formattedData[0]).length;
  const lastColumnLetter = XLSX.utils.encode_col(columnCount - 1); 
  worksheet['!autofilter'] = { ref: `A1:${lastColumnLetter}1` };

  // Set custom column widths for different columns
  const columnWidths = [
    { wch: 30 }, 
    { wch: 50 }, 
    { wch: 70 }, 
    { wch: 50 }, 
    { wch: 30 }, 

  ];

  worksheet['!cols'] = columnWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Partners");

  const filePath = path.join(__dirname, fileName);
  XLSX.writeFile(workbook, filePath);

  console.log(`✅ Excel file created at: ${filePath}`);
  return filePath;
};

module.exports = exportToExcel;
