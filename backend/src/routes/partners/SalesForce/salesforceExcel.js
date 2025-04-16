const ExcelJS = require('exceljs');
const path = require("path");

const exportToExcel = async (data, filtersMap, fileName = "salesforce_partners.xlsx") => {
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("No data provided for Excel export.");
  }

  // Create a new workbook and worksheet
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Partners');
  
  // Specify which filter sections we want to enable filters for
  const targetFilterSections = ["Salesforce Expertise", "Industry Expertise"];
  
  // Process filter data to extract unique filter values by section
  const filterSections = new Map(); // Map of section name -> Set of filter values
  const rowToFiltersMap = new Map(); // Map row ID to its filter objects for later use
  
  // First pass: collect all unique filter values by section
  data.forEach(row => {
    if (filtersMap && filtersMap[row.id]) {
      try {
        // Parse filter data
        let filterObjects;
        if (typeof filtersMap[row.id] === 'string') {
          filterObjects = JSON.parse(filtersMap[row.id]);
        } else if (typeof filtersMap[row.id] === 'object') {
          filterObjects = filtersMap[row.id];
        } else {
          filterObjects = [];
        }
        
        // Ensure we have an array
        if (!Array.isArray(filterObjects)) {
          filterObjects = [filterObjects];
        }
        
        // Store the filter objects for this row
        rowToFiltersMap.set(row.id, filterObjects);
        
        // Process each filter section
        filterObjects.forEach(filterObj => {
          if (filterObj && typeof filterObj === 'object') {
            const sectionName = filterObj.section || "Filters";
            const sectionFilters = filterObj.filters || [];
            
            // Get or create the set of filters for this section
            if (!filterSections.has(sectionName)) {
              filterSections.set(sectionName, new Set());
            }
            const filterSet = filterSections.get(sectionName);
            
            // Add each individual filter to the set
            if (Array.isArray(sectionFilters)) {
              sectionFilters.forEach(filter => filterSet.add(filter));
            } else {
              filterSet.add(String(sectionFilters));
            }
          }
        });
      } catch (error) {
        console.error(`Error processing filters for ID ${row.id}:`, error);
      }
    }
  });
  
  // Process data to include formatted filters
  const enhancedData = data.map(row => {
    const result = { ...row };
    
    // Add filter columns based on sections we found
    filterSections.forEach((_, sectionName) => {
      // Initialize with empty string
      result[sectionName] = "";
      
      // If row has filters for this section, add them
      const filterObjects = rowToFiltersMap.get(row.id) || [];
      filterObjects.forEach(filterObj => {
        if (filterObj && filterObj.section === sectionName) {
          const filters = filterObj.filters || [];
          result[sectionName] = Array.isArray(filters) ? filters.join(", ") : String(filters);
        }
      });
    });
    
    return result;
  });

  // Extract all unique keys to create columns
  const allKeys = new Set();
  enhancedData.forEach(item => {
    Object.keys(item).forEach(key => allKeys.add(key));
  });
  
  // Define columns - filter sections go last
  const regularColumns = [];
  const filterColumns = [];
  
  Array.from(allKeys).forEach(key => {
    const column = { header: key, key: key, width: 15 };
    if (filterSections.has(key)) {
      column.width = 25; // Make filter columns wider
      filterColumns.push(column);
    } else {
      regularColumns.push(column);
    }
  });
  
  // Set all columns, regular ones first, then filter columns
  worksheet.columns = [...regularColumns, ...filterColumns];
  
  // Add rows to worksheet
  worksheet.addRows(enhancedData);
  
  // Style the header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.eachCell((cell) => {
    const columnName = cell.value;
    
    if (filterSections.has(columnName)) {
      // Style filter column headers
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFC6EFFF' } // Light blue background for filter columns
      };
      cell.font = { bold: true, color: { argb: 'FF0000FF' } }; // Blue text
      
      // Add a note explaining how to use filters
      cell.note = `Filter column: Use Excel's filter dropdown to filter by ${columnName}. 
      Each cell may contain multiple filter values separated by commas.
      Select a specific filter value to see all rows containing that value.`;
    } else {
      // Style regular column headers
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' } // Light gray background
      };
    }
    
    cell.border = {
      bottom: { style: 'thin' }
    };
  });
  
  // Find column indices for target filter sections
  const filterColumnIndices = [];
  targetFilterSections.forEach(sectionName => {
    const colIndex = worksheet.columns.findIndex(col => col.key === sectionName) + 1;
    if (colIndex > 0) {
      filterColumnIndices.push(colIndex);
      console.log(`✅ Set up filter column for ${sectionName} at column ${colIndex}`);
    }
  });
  
  // Apply auto-filter only to the specified filter columns
  if (filterColumnIndices.length > 0) {
    // We need to create a custom autoFilter that targets only specific columns
    // Get the range of data to apply the filter to
    const lastRow = worksheet.rowCount;
    
    // In ExcelJS, we can't directly specify selective column filtering
    // So we'll use Excel's built-in autoFilter, but only our target columns will be styled 
    // to indicate they're meant for filtering
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: lastRow, column: worksheet.columnCount }
    };
    
    console.log(`✅ Added filter capability to specified columns: ${targetFilterSections.join(', ')}`);
  }
  
  // Save the workbook to file
  const filePath = path.join(__dirname, fileName);
  await workbook.xlsx.writeFile(filePath);
  console.log(`✅ Excel file created at: ${filePath}`);
  
  return filePath;
};

// Export as a Promise-based function
module.exports = async (data, filtersMap, fileName) => {
  return await exportToExcel(data, filtersMap, fileName);
};