const axios = require('axios');
const {db, initializeDatabase} = require("../../../db");

const scrapeData = async () => {
  const pageOffsets = [0,18,36,54,72,90];  // You can extend this later for pagination
  const extractedDetails = [];  
    initializeDatabase();
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
    //   console.log(JSON.stringify(response.data?.matchingPartners?.items, null, 2));

      const partners = response.data?.matchingPartners?.items || [];

      for (const partner of partners) {
        const details = {
          name: partner.name || "No name",
          description: partner.description || "No description",
          industryFocus: partner.industryFocus || [],
          product: partner.product || [],
          solutions: partner.solutions || [],
          serviceType: partner.serviceType || []
        };

        try {
            // Step 1: Insert into 'microsoft' to get the generated ID
            const [result] = await db.execute(
              `INSERT INTO microsoft (name) VALUES (?)`,
              [details.name]
            );
          
            const insertedId = result.insertId;  // Auto-generated ID from the first insert
          
            // Step 2: Insert the rest of the details using that ID into 'microsoft_details'
            await db.execute(
              `INSERT INTO microsoft_details (id, description, product, solutions, serviceType) VALUES (?, ?, ?, ?, ?)`,
              [
                insertedId,
                details.description,
                // JSON.stringify(details.industryFocus),
                JSON.stringify(details.product),
                JSON.stringify(details.solutions),
                JSON.stringify(details.serviceType)
              ]
            );

            await db.execute(`INSERT INTO microsoft_filters (id, industry) VALUES (?,?)`,
              [
                insertedId,
                JSON.stringify(details.industryFocus)
              ]
            );
          
            console.log(`✅ Inserted into DB: ${details.name} (ID: ${insertedId})`);
          
          } catch (dbError) {
            console.error(`❌ DB Insert Error for ${details.name}:`, dbError.message);
          }
          

        extractedDetails.push(details);
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





//  https://main.prod.marketplacepartnerdirectory.azure.com/api/partners?filter=industries%3DEducation%3Bsort%3D0%3BpageSize%3D18%3Bcountry%3Dus%3Bradius%3D100%3Blocname%3DUnited%2520States%3BlocationNotRequired%3Dtrue

//  https://main.prod.marketplacepartnerdirectory.azure.com/api/partners?filter=industries%3DAgriculture%3Bsort%3D0%3BpageSize%3D18%3Bcountry%3Dus%3Bradius%3D100%3Blocname%3DUnited%2520States%3BlocationNotRequired%3Dtrue

// https://main.prod.marketplacepartnerdirectory.azure.com/api/partners?filter=industries%3DAgriculture%3Bsort%3D0%3BpageSize%3D18%3BpageOffset%3D18%3Bcountry%3Dus%3Bradius%3D100%3Blocname%3DUnited%2520States%3BlocationNotRequired%3Dtrue

// https://main.prod.marketplacepartnerdirectory.azure.com/api/partners?filter=industries%3DAgriculture%3Bsort%3D0%3BpageSize%3D18%3BpageOffset%3D36%3Bcountry%3Dus%3Bradius%3D100%3Blocname%3DUnited%2520States%3BlocationNotRequired%3Dtrue

//  https://main.prod.marketplacepartnerdirectory.azure.com/api/partners?filter=industries%3DPublic%2520Safety%2520and%2520National%2520Security%3Bsort%3D0%3BpageSize%3D18%3Bcountry%3Dus%3Bradius%3D100%3Blocname%3DUnited%2520States%3BlocationNotRequired%3Dtrue

/* 
Agriculture : https://main.prod.marketplacepartnerdirectory.azure.com/api/partners?filter=industries%3DAgriculture%3Bsort%3D0%3BpageSize%3D18%3BpageOffset%3D18%3Bcountry%3Dus%3Bradius%3D100%3Blocname%3DUnited%2520States%3BlocationNotRequired%3Dtrue

Distribution : https://main.prod.marketplacepartnerdirectory.azure.com/api/partners?filter=industries%3DDistribution%3Bsort%3D0%3BpageSize%3D18%3BpageOffset%3D18%3Bcountry%3Dus%3Bradius%3D100%3Blocname%3DUnited%2520States%3BlocationNotRequired%3Dtrue

Education : https://main.prod.marketplacepartnerdirectory.azure.com/api/partners?filter=industries%3DEducation%3Bsort%3D0%3BpageSize%3D18%3BpageOffset%3D18%3Bcountry%3Dus%3Bradius%3D100%3Blocname%3DUnited%2520States%3BlocationNotRequired%3Dtrue

Financial Services : https://main.prod.marketplacepartnerdirectory.azure.com/api/partners?filter=industries%3DFinancial%2520Services%3Bsort%3D0%3BpageSize%3D18%3BpageOffset%3D18%3Bcountry%3Dus%3Bradius%3D100%3Blocname%3DUnited%2520States%3BlocationNotRequired%3Dtrue

Government : https://main.prod.marketplacepartnerdirectory.azure.com/api/partners?filter=industries%3DGovernment%3Bsort%3D0%3BpageSize%3D18%3BpageOffset%3D18%3Bcountry%3Dus%3Bradius%3D100%3Blocname%3DUnited%2520States%3BlocationNotRequired%3Dtrue

Healthcare : https://main.prod.marketplacepartnerdirectory.azure.com/api/partners?filter=industries%3DHealthcare%3Bsort%3D0%3BpageSize%3D18%3BpageOffset%3D18%3Bcountry%3Dus%3Bradius%3D100%3Blocname%3DUnited%2520States%3BlocationNotRequired%3Dtrue

Hospitality & Travel : https://main.prod.marketplacepartnerdirectory.azure.com/api/partners?filter=industries%3DHospitality%2520%2520%2526%2520Travel%3Bsort%3D0%3BpageSize%3D18%3BpageOffset%3D18%3Bcountry%3Dus%3Bradius%3D100%3Blocname%3DUnited%2520States%3BlocationNotRequired%3Dtrue

Manufacturing & Resources : https://main.prod.marketplacepartnerdirectory.azure.com/api/partners?filter=industries%3DManufacturing%2520%2526%2520Resources%3Bsort%3D0%3BpageSize%3D18%3BpageOffset%3D18%3Bcountry%3Dus%3Bradius%3D100%3Blocname%3DUnited%2520States%3BlocationNotRequired%3Dtrue

Media & Communications : https://main.prod.marketplacepartnerdirectory.azure.com/api/partners?filter=industries%3DMedia%2520%2526%2520Communications%3Bsort%3D0%3BpageSize%3D18%3BpageOffset%3D18%3Bcountry%3Dus%3Bradius%3D100%3Blocname%3DUnited%2520States%3BlocationNotRequired%3Dtrue

Nonprofit & IGO : https://main.prod.marketplacepartnerdirectory.azure.com/api/partners?filter=industries%3DNonprofit%2520%2526%2520IGO%3Bsort%3D0%3BpageSize%3D18%3BpageOffset%3D18%3Bcountry%3Dus%3Bradius%3D100%3Blocname%3DUnited%2520States%3BlocationNotRequired%3Dtrue

Power & Utilities : https://main.prod.marketplacepartnerdirectory.azure.com/api/partners?filter=industries%3DPower%2520and%2520utilities%3Bsort%3D0%3BpageSize%3D18%3BpageOffset%3D18%3Bcountry%3Dus%3Bradius%3D100%3Blocname%3DUnited%2520States%3BlocationNotRequired%3Dtrue

Professional Services : https://main.prod.marketplacepartnerdirectory.azure.com/api/partners?filter=industries%3DProfessional%2520services%3Bsort%3D0%3BpageSize%3D18%3BpageOffset%3D18%3Bcountry%3Dus%3Bradius%3D100%3Blocname%3DUnited%2520States%3BlocationNotRequired%3Dtrue

Public Safety & National Security : https://main.prod.marketplacepartnerdirectory.azure.com/api/partners?filter=industries%3DPublic%2520Safety%2520and%2520National%2520Security%3Bsort%3D0%3BpageSize%3D18%3BpageOffset%3D18%3Bcountry%3Dus%3Bradius%3D100%3Blocname%3DUnited%2520States%3BlocationNotRequired%3Dtrue

Retail & Consumer Goods : https://main.prod.marketplacepartnerdirectory.azure.com/api/partners?filter=industries%3DPublic%2520Safety%2520and%2520National%2520Security%3Bsort%3D0%3BpageSize%3D18%3BpageOffset%3D18%3Bcountry%3Dus%3Bradius%3D100%3Blocname%3DUnited%2520States%3BlocationNotRequired%3Dtrue

Transportation : https://main.prod.marketplacepartnerdirectory.azure.com/api/partners?filter=industries%3DTransportation%3Bsort%3D0%3BpageSize%3D18%3BpageOffset%3D18%3Bcountry%3Dus%3Bradius%3D100%3Blocname%3DUnited%2520States%3BlocationNotRequired%3Dtrue









*/