const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

/**
 * Exports data to Excel file with industry filtering dropdown
 * @param {Array} data - Array of objects to export
 * @param {String} fileName - Name of the output Excel file
 * @returns {String} - Path to the created Excel file
 */
const exportToExcel = (data, fileName = "microsoft_partners.xlsx") => {
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("No data provided for Excel export.");
  }

  // Create worksheet with data
  const worksheet = XLSX.utils.json_to_sheet(data);
  
  // Adjust column widths for better readability
  const colWidths = [
    { wch: 10 },  // id
    { wch: 30 },  // name
    { wch: 50 },  // description
    { wch: 30 },  // product
    { wch: 30 },  // solutions
    { wch: 30 },  // serviceType
    { wch: 40 }   // industry - wider for the filter dropdown
  ];
  
  worksheet['!cols'] = colWidths;
  
  // Get all unique industry values
  const allIndustries = new Set();
  const industryColumnIndex = Object.keys(data[0]).findIndex(key => key.toLowerCase() === 'industry');
  
  // If we found the industry column
  if (industryColumnIndex !== -1) {
    // Get all industries mentioned in any row
    data.forEach(row => {
      const industryValue = row.industry;
      if (industryValue) {
        // Split by comma if it's a comma-separated string
        const industries = industryValue.split(',').map(i => i.trim());
        industries.forEach(industry => {
          if (industry) allIndustries.add(industry);
        });
      }
    });
  
    // Define the industry filter dropdown
    // Find the letter for the industry column (assuming it's the 7th column = G)
    const industryCol = String.fromCharCode(65 + industryColumnIndex);
    const lastRow = data.length + 1; // +1 for header row
    
    // Convert industry values to array
    const industryList = Array.from(allIndustries);
    
    // Add autofilter to the worksheet
    worksheet['!autofilter'] = { ref: `A1:${industryCol}${lastRow}` };
    
    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Partners");
    
    // Add dropdown values
    if (!worksheet['!filters']) worksheet['!filters'] = {};
    worksheet['!filters'][industryCol] = { 
      items: industryList.reduce((obj, industry) => {
        obj[industry] = true; // Set to true to indicate it's selected by default
        return obj;
      }, {})
    };
    
    // Generate unique filename to avoid conflicts
    const timestamp = new Date().getTime();
    const uniqueFileName = fileName.replace('.xlsx', `-${timestamp}.xlsx`);
    const filePath = path.join(__dirname, uniqueFileName);
    
    // Write file
    XLSX.writeFile(workbook, filePath);
    
    console.log(`✅ Excel file created at: ${filePath}`);
    return filePath;
  } else {
    // If industry column not found, just export normally
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Partners");
    
    const timestamp = new Date().getTime();
    const uniqueFileName = fileName.replace('.xlsx', `-${timestamp}.xlsx`);
    const filePath = path.join(__dirname, uniqueFileName);
    
    XLSX.writeFile(workbook, filePath);
    
    console.log(`✅ Excel file created at: ${filePath}`);
    return filePath;
  }
};

// Advanced version that creates a proper Excel filter
const exportToExcelWithAdvancedFilter = (data, fileName = "microsoft_partners.xlsx") => {
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("No data provided for Excel export.");
  }
  
  // Create worksheet with data
  const worksheet = XLSX.utils.json_to_sheet(data);
  
  // Add auto filter
  const range = XLSX.utils.decode_range(worksheet['!ref']);
  worksheet['!autofilter'] = {
    ref: XLSX.utils.encode_range(
      { r: 0, c: 0 },  // Start at first row, first column
      { r: range.e.r, c: range.e.c }  // End at last row, last column
    )
  };
  
  // Adjust column widths for better readability
  const headers = Object.keys(data[0]);
  const colWidths = headers.map(header => {
    if (header === 'description') return { wch: 50 };
    if (header === 'industry') return { wch: 40 };
    return { wch: 30 };
  });
  
  worksheet['!cols'] = colWidths;
  
  // Create workbook and add worksheet
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Partners");
  
  // Generate unique filename
  const timestamp = new Date().getTime();
  const uniqueFileName = fileName.replace('.xlsx', `-${timestamp}.xlsx`);
  const filePath = path.join(__dirname, uniqueFileName);
  
  // Write file with options that enable filtering
  const options = {
    bookSST: false,
    type: 'file',
    cellStyles: true,
    compression: true
  };
  
  XLSX.writeFile(workbook, filePath, options);
  
  console.log(`✅ Excel file created at: ${filePath} with industry filtering enabled`);
  return filePath;
};

// Export the appropriate function
module.exports = exportToExcelWithAdvancedFilter;