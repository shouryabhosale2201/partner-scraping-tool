// shopifyExcel.js
const ExcelJS = require('exceljs');
const path = require('path');

const exportToExcel = async (data, fileName = "shopify_partners.xlsx") => {
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("No data provided for Excel export.");
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Shopify Partners');

  // Define the core columns for Shopify data
  const columns = [
    { header: 'Partner Tier', key: 'partnerTier', width: 20 },
    { header: 'Name', key: 'name', width: 25 },
    { header: 'Description', key: 'description', width: 40 },
    { header: 'Specialized Services', key: 'specializedServices', width: 30 },
    { header: 'Other Services', key: 'otherServices', width: 30 },
    { header: 'Featured Work', key: 'featuredWork', width: 30 },
    { header: 'Rating', key: 'rating', width: 10 },
    { header: 'Profile URL', key: 'profileUrl', width: 35 },
    { header: 'Filters (Price Range)', key: 'filtersPriceRange', width: 25 },
    { header: 'Filters (Service)', key: 'filtersService', width: 25 },
    { header: 'Filters (Location)', key: 'filtersLocation', width: 25 },
    { header: 'Filters (Industry)', key: 'filtersIndustry', width: 25 }
  ];

  worksheet.columns = columns;

  // Add data rows
  worksheet.addRows(data);

  // Style the header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.eachCell(cell => {
    if (cell.value && String(cell.value).includes('Filters')) {
      // Style filter columns differently
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE6F7FF' } // Light blue
      };
      cell.font = { bold: true, color: { argb: 'FF0070C0' } }; // Dark blue
      cell.note = `Multiple filters may be present, separated by commas. Use Excel filter dropdowns to filter.`;
    } else {
      // Style normal columns
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF0F0F0' } // Light gray
      };
    }
    cell.border = {
      bottom: { style: 'thin' }
    };
  });

  // Apply autofilter to the entire header
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: worksheet.columnCount }
  };

  // Save the workbook
  const filePath = path.join(__dirname, fileName);
  await workbook.xlsx.writeFile(filePath);
  console.log(`✅ Shopify Excel file created at: ${filePath}`);

  return filePath;
};

// Export function
module.exports = async (data, fileName) => {
  return await exportToExcel(data, fileName);
};
