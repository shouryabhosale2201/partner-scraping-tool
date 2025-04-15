const axios = require('axios');
const db = require("../../../db");

const scrapeData = async () => {
  const pageOffsets = [0,18,36,54,72,90];  // You can extend this later for pagination
  const extractedDetails = [];  

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
          await db.execute(
            `INSERT INTO microsoft (name, description, industryFocus, product, solutions, serviceType) VALUES (?, ?, ?, ?, ?, ?)`,
            [
              details.name,
              details.description,
              JSON.stringify(details.industryFocus),
              JSON.stringify(details.product),
              JSON.stringify(details.solutions),
              JSON.stringify(details.serviceType)
            ]
          );
          console.log(`✅ Inserted into DB: ${details.name}`);
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
