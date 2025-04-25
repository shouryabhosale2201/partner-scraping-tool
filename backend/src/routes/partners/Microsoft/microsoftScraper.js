const axios = require('axios');
const {db, initializeDatabase} = require("../../../db");

const scrapeData = async (selectedFields = ['name', 'industryFocus']) => {
  const pageOffsets = [0, 18, 36, 54, 72, 90];  // You can extend this later for pagination
  const extractedDetails = [];  
  initializeDatabase();
  
  // Always include 'name' in selectedFields as it's required
  if (!selectedFields.includes('name')) {
    selectedFields.push('name');
  }
  
  for (const pageOffset of pageOffsets) {
    try {
      const response = await axios.get(
        `https://main.prod.marketplacepartnerdirectory.azure.com/api/partners?filter=sort%3D0%3BpageSize%3D36%3BpageOffset%3D${pageOffset}%3Bradius%3D100%3BlocationNotRequired%3Dtrue`,
        {
          headers: {
            'accept': 'application/json, text/plain, */*',
            'referer': 'https://main.prod.marketplacepartnerdirectory.azure.com/en-us/partners',
            'sec-ch-ua': '"Google Chrome";v="135", "Not-A.Brand";v="8", "Chromium";v="135"',
            'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36'
          }
        }
      );
      console.log("Response received!!");
      
      const partners = response.data?.matchingPartners?.items || [];
      for (const partner of partners) {
        // Initialize details object with only selected fields
        const details = {
          name: partner.name || "No name",
        };
        
        // Add other selected fields
        if (selectedFields.includes('description')) {
          details.description = partner.description || "No description";
        }
        
        if (selectedFields.includes('industryFocus')) {
          details.industryFocus = partner.industryFocus || [];
        }
        
        if (selectedFields.includes('product')) {
          details.product = partner.product || [];
        }
        
        if (selectedFields.includes('solutions')) {
          details.solutions = partner.solutions || [];
        }
        
        if (selectedFields.includes('serviceType')) {
          details.serviceType = partner.serviceType || [];
        }
        
        try {
          // Step 1: Insert into 'microsoft' to get the generated ID
          const [result] = await db.execute(
            `INSERT INTO microsoft (name) VALUES (?)`,
            [details.name]
          );
          const insertedId = result.insertId;  // Auto-generated ID from the first insert
          
          // Step 2: Prepare details for microsoft_details table
          // Build the column and parameter lists dynamically based on selected fields
          const detailsColumns = ['id'];
          const detailsParams = [insertedId];
          const detailsPlaceholders = ['?'];
          
          // Add selected fields to the columns and parameters
          const fieldMapping = {
            'description': details.description,
            'product': details.product,
            'solutions': details.solutions,
            'serviceType': details.serviceType,
            'industryFocus': details.industryFocus
          };
          
          Object.entries(fieldMapping).forEach(([field, value]) => {
            if (selectedFields.includes(field)) {
              detailsColumns.push(field);
              detailsParams.push(Array.isArray(value) ? JSON.stringify(value) : value);
              detailsPlaceholders.push('?');
            }
          });
          
          // Insert into microsoft_details if we have any fields beyond just the ID
          if (detailsColumns.length > 1) {
            const insertDetailsQuery = `INSERT INTO microsoft_details (${detailsColumns.join(', ')}) VALUES (${detailsPlaceholders.join(', ')})`;
            await db.execute(insertDetailsQuery, detailsParams);
          }
          
          // Step 3: Insert into microsoft_filters for industry data if it was selected
          if (selectedFields.includes('industryFocus')) {
            await db.execute(
              `INSERT INTO microsoft_filters (id, industry) VALUES (?,?)`,
              [
                insertedId,
                JSON.stringify(details.industryFocus || [])
              ]
            );
          }
          
          console.log(`✅ Inserted into DB: ${details.name} (ID: ${insertedId})`);
          
          // Add to extracted details for the response
          extractedDetails.push(details);
        } catch (dbError) {
          console.error(`❌ DB Insert Error for ${details.name}:`, dbError.message);
        }
      }
    } catch (error) {
      if (error.response) {
        console.error(`❌ HTTP Error [${pageOffset}]:`, error.response.status, error.response.statusText);
      } else {
        console.error(`❌ Request Failed [${pageOffset}]:`, error.message);
      }
    }
  }
  return extractedDetails;
};

module.exports = scrapeData;