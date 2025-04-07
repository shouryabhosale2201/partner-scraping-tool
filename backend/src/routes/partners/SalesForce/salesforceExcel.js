const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

const exportToExcel = (data, fileName = "partners.xlsx") => {
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("No data provided for Excel export.");
  }

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, "Partners");

  const filePath = path.join(__dirname, fileName);
  XLSX.writeFile(workbook, filePath);

  console.log(`✅ Excel file created at: ${filePath}`);
  return filePath; // ✅ Return the path so it can be sent
};

module.exports = exportToExcel;
