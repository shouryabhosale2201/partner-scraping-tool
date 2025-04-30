const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");
const exportToExcel = (data, filtersMap, fileName = "salesforce_partners.xlsx") => {
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("No data provided for Excel export.");
  }
  // Format each item to include Salesforce Expertise and Industry Expertise from filtersMap
  const formattedData = data.map(item => {
    const formattedItem = { ...item };
    const filterObjects = filtersMap[item.id] || [];
    const getFiltersBySection = (section) => {
      const entry = filterObjects.find(f => f.section === section);
      return entry && Array.isArray(entry.filters) ? entry.filters.join(", ") : "";
    };
    formattedItem["Salesforce Expertise"] = getFiltersBySection("Salesforce Expertise");
    formattedItem["Industry Expertise"] = getFiltersBySection("Industry Expertise");
    return formattedItem;
  });
  const worksheet = XLSX.utils.json_to_sheet(formattedData);
  // Apply autofilter to the first row
  const columnCount = Object.keys(formattedData[0]).length;
  const lastColumnLetter = XLSX.utils.encode_col(columnCount - 1);
  worksheet['!autofilter'] = { ref: `A1:${lastColumnLetter}1` };
  // Set predefined custom column widths
  const columnWidths = [
    { wch: 10 },
    { wch: 50 },
    { wch: 70 },
    { wch: 50 },
    { wch: 50 },
    { wch: 50 },
    { wch: 60 },
    { wch: 50 },
    { wch: 50 },
    { wch: 30 },
    { wch: 30 }
  ];
  worksheet['!cols'] = columnWidths;
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Partners");
  const filePath = path.join(__dirname, fileName);
  XLSX.writeFile(workbook, filePath);
  console.log(`:white_check_mark: Excel file created at: ${filePath}`);
  return filePath;
};
module.exports = exportToExcel;