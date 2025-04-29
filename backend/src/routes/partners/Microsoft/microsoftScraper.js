// microsoftScraper.js
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

// File paths for our JSON "tables"
const DATA_DIR = path.join(__dirname, 'data');
const MICROSOFT_FILE = path.join(DATA_DIR, 'microsoft.json');

async function storeMicrosoftDataAsJson(filepath, scrapedArray) {
  try {
    await fs.writeFile(filepath, JSON.stringify([]), 'utf8'); // This clears the file
    // Step 2: Stringify the array
    const jsonData = JSON.stringify(scrapedArray, null, 2); // Pretty print with 2 spaces
    // Step 3: Write to a file
    await fs.writeFile(filepath, jsonData, 'utf8');
    console.log(':white_check_mark: Successfully stored scraped data to microsoft.json');
  } catch (error) {
    console.error(':x: Error saving JSON file:', error);
  }
}

// Initialize the JSON files if they don't exist
const initializeJsonFiles = async () => {
  try {
    // Create data directory if it doesn't exist
    await fs.mkdir(DATA_DIR, { recursive: true });

    // Check if each file exists, if not create it with empty array
    const file = MICROSOFT_FILE;

    try {
      await fs.access(file);
    } catch (err) {
      // File doesn't exist, create it with empty array
      await fs.writeFile(file, JSON.stringify([]));
      console.log(`Created empty JSON file: ${file}`);
    }

    console.log('JSON files initialized successfully');
  } catch (error) {
    console.error('Error initializing JSON files:', error);
    throw error;
  }
};

function safeField(value) {
  if (value === null || value === undefined) return "N/A";
  if (Array.isArray(value) && value.length === 0) return "N/A";
  if (typeof value === 'string' && value.trim() === '') return "N/A";
  return value;
}

const scrapeData = async (selectedFields = ['name', 'industryFocus', 'country']) => {
  console.log(`Starting scrape with fields: ${selectedFields.join(', ')}`);
  const pageOffsets = [0, 18, 36, 54, 72, 90];
  const extractedDetails = [];

  await initializeJsonFiles();

  if (!selectedFields.includes('name')) {
    selectedFields.push('name');
  }

  let microsoftData = [];

  for (const pageOffset of pageOffsets) {
    try {
      console.log(`Fetching page offset: ${pageOffset}`);
      const response = await axios.get(
        `https://main.prod.marketplacepartnerdirectory.azure.com/api/partners?filter=sort%3D0%3BpageSize%3D36%3BpageOffset%3D${pageOffset}%3Bradius%3D100%3BlocationNotRequired%3Dtrue`,
        {
          headers: {
            'accept': 'application/json, text/plain, */*',
            'referer': 'https://main.prod.marketplacepartnerdirectory.azure.com/en-us/partners',
            'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36'
          },
          timeout: 10000
        }
      );

      console.log(`✅ Response received for page ${pageOffset}!`);
      const partners = response.data?.matchingPartners?.items || [];
      console.log(`Found ${partners.length} partners on page ${pageOffset}`);

      for (const partner of partners) {
        try {
          const newId = extractedDetails.length + 1;

          const partnerEntry = { id: newId };

          // Always include name
          partnerEntry.name = partner.name || "N/A";
          // Add selected fields
          partnerEntry.description = selectedFields.includes('description')
            ? safeField(partner.description)
            : undefined;
          partnerEntry.industryFocus = selectedFields.includes('industryFocus')
            ? safeField(partner.industryFocus)
            : undefined;

          partnerEntry.product = selectedFields.includes('product')
            ? safeField(partner.product)
            : undefined;

          partnerEntry.solutions = selectedFields.includes('solutions')
            ? safeField(partner.solutions)
            : undefined;

          partnerEntry.serviceType = selectedFields.includes('serviceType')
            ? safeField(partner.serviceType)
            : undefined;

          partnerEntry.country = selectedFields.includes('country')
            ? safeField(partner.location?.address?.country)
            : undefined;

          // Add partner URL based on partnerId
          partnerEntry.link = `https://appsource.microsoft.com/en-us/marketplace/partner-dir/${partner.partnerId}/overview`;

          microsoftData.push(partnerEntry);
          extractedDetails.push(partnerEntry);

        } catch (error) {
          console.error(`❌ JSON Processing Error for ${partner.name}:`, error.message);
        }
      }
    } catch (error) {
      console.error(`❌ Error fetching page ${pageOffset}:`, error.message);
    }
  }

  console.log(`Writing ${microsoftData.length} entries to microsoft.json`);

  try {
    await storeMicrosoftDataAsJson(MICROSOFT_FILE, microsoftData);
    console.log("✅ Successfully wrote all data to microsoft.json");
  } catch (writeError) {
    console.error("❌ Error writing to microsoft.json:", writeError);
    throw new Error(`Failed to write data: ${writeError.message}`);
  }

  return extractedDetails;
};

module.exports = scrapeData;
