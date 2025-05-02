const XLSX = require("xlsx");
const path = require("path");

const exportToExcel = (data, fileName = "shopify_partners.xlsx") => {
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("No data provided for Excel export.");
  }

  // 1. Get all unique keys from all data objects.
  const allKeys = data.reduce((keys, obj) => {
    Object.keys(obj).forEach(key => {
      if (!keys.includes(key)) {
        keys.push(key);
      }
    });
    return keys;
  }, []);

  // 2. Ensure every data object has all the keys, with empty values if missing, and
  //    convert arrays to strings.
  const preparedData = data.map(item => {
    const completeItem = {};
    allKeys.forEach(key => {
      let value = item[key];
      if (value === undefined || value === null) {
        value = "";
      } else if (Array.isArray(value)) {
        value = value.join(", "); // Convert arrays to comma-separated strings
      } else if (typeof value === 'object') {
        value = JSON.stringify(value);
      }
      completeItem[key] = value;
    });
    return completeItem;
  });

  const worksheet = XLSX.utils.json_to_sheet(preparedData, { header: allKeys });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Partners");

  // Apply autofilter to the first row
  const columnCount = allKeys.length;
  const lastColumnLetter = XLSX.utils.encode_col(columnCount - 1);
  worksheet['!autofilter'] = { ref: `A1:${lastColumnLetter}1` };

  // Set column widths.  Adjust these as needed.
  const columnWidths = allKeys.map(key => {
    let width = 20; // Default width
     if (key.toLowerCase().includes('name')) {
        width = 50;
    } else if (key.toLowerCase().includes('link') || key.toLowerCase().includes('url')) {
        width = 70;
    } else if (key.toLowerCase().includes('expertise'))
      width = 50;
    return { wch: width }; // wch is the character width
  });
  worksheet['!cols'] = columnWidths;

  // Ensure the file is created in the same directory as this module
  const filePath = path.join(__dirname, fileName);
  XLSX.writeFile(workbook, filePath);

  console.log(`✅ Excel file created at: ${filePath}`);
  console.log(`
  ℹ️  Excel file "${fileName}" created.

  The following columns in the Excel file are set up with AutoFilter:

  ${allKeys.map(key => `-  **${key}**`).join('\n')}
  `);
  return filePath;
};

module.exports = exportToExcel;
