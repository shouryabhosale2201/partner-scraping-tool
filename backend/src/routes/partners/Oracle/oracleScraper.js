const fs = require('fs').promises;
const expertiseListApi = require("./expertiseListApi");
const locationListApi = require("./locationListApi")
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const Oracle_File = path.join(DATA_DIR, 'oracle_partners.json');
const apiUrl = "https://partner-finder.oracle.com/catalog/opf/partnerList";
const headers = {
    "Content-Type": "application/json",
    "Accept": "application/json, text/javascript, */*; q=0.01",
    "X-Requested-With": "XMLHttpRequest",
};

const payloadTemplate = {
    keyword: "",
    pageNumber: "1",
    resultCount: "15",
    searchBy: "company",
    filters: {
        xscCompanyLocation: ["4205~North America"]
    },
    searchExpertiseIds: {
        CSPE: "1032,1033,1031,1035,1034,1036,1452,1453,1454,1125,1455,1051,1052,1053,1054,1055,1056,1057,1058,1059,1075,1076,1081,1078,1069,1070,1071,1073,1072,1068,1084,1080,1082,1083,1061,1062,1064,1065,1063,1066,1067",
        CSSE: "1492,1672,1514,1512,1658,1660,1661,1652,1653,1654,1655,1513,1657,1656,1659",
        ISE: "354,1225,247,251,1226,250,1351,246,1836,930,355,1349,356,1348,1350,1552,357,358,359,360,361,362,363,1532,1792,1772,1146,891,890,810,1285,1325,1265,1145,1634,990,671,1147,1205,1632,1326,832,1306,1692,1752,1912,373,374,379,376,1245,1037,382,378,380,381,384,385,386,1872,388,387,383,366,367,369,370,368,371,372"
    },
    xscProfileType: "Partner Profile"
};

async function storeOracleDataAsJson(filepath, scrapedMap) {
    try {
        // Step 1: Convert the scrapedMap to a plain array
        const scrapedArray = Array.from(scrapedMap.values());

        // Step 2: Stringify the array
        const jsonData = JSON.stringify(scrapedArray, null, 2); // Pretty print with 2 spaces

        // Step 3: Write to a file
        await fs.writeFile(filepath, jsonData, 'utf8');

        console.log('✅ Successfully stored scraped data to oracle_partners.json');
    } catch (error) {
        console.error('❌ Error saving JSON file:', error);
    }
}


const scrapeData = async () => {
    const expertiseHierarchy = await expertiseListApi();
    const apacCountries = await locationListApi();
    console.log(expertiseHierarchy);

    const scrapedMap = new Map();
    let serialNumber = 1;

    for (const level1 of expertiseHierarchy) {
        const level1Name = level1.name;
    
        for (const level2 of (level1.level_2_list || [])) {
            const level2Name = level2.name;
    
            for (const level3 of (level2.level_3_list || [])) {
                const level3Name = level3.name;
                const ucm_column = level3.ucm_column;
    
                for (const level4 of (level3.level_4_list || [])) {
                    const level4Name = level4.name;
                    const level4Id = level4.id;
    
                    // Step 1: Get total pages
                    const firstPayload = {
                        ...payloadTemplate,
                        pageNumber: "1",
                        filters: {
                            [ucm_column]: [level4Id],
                            xscCompanyLocation: ["1000"]
                        }
                    };
    
                    try {
                        const firstResponse = await fetch(apiUrl, {
                            method: "POST",
                            headers,
                            body: JSON.stringify(firstPayload),
                        });
    
                        if (!firstResponse.ok) {
                            console.error(`❌ Failed to get totalPages for ${level4Name}`);
                            continue;
                        }
    
                        const firstData = await firstResponse.json();
                        const totalResults = firstData.count || firstData?.profiles?.length || 0;
                        const totalPages = Math.ceil(totalResults / parseInt(payloadTemplate.resultCount));
                        // const totalPages=1;
                        // Step 2: Parallel fetch for all pages
                        const pagePromises = [];
    
                        for (let page = 1; page <= totalPages; page++) {
                            const pagePayload = {
                                ...payloadTemplate,
                                pageNumber: String(page),
                                filters: {
                                    [ucm_column]: [level4Id],
                                    xscCompanyLocation: ["1000"]
                                }
                            };
    
                            const pageRequest = fetch(apiUrl, {
                                method: "POST",
                                headers,
                                body: JSON.stringify(pagePayload),
                            }).then(res => res.json().catch(() => null));
    
                            pagePromises.push(pageRequest);
                        }
    
                        const pageResponses = await Promise.all(pagePromises);
    
                        for (const data of pageResponses) {
                            const partnerList = data?.profiles || [];
                            const baseUrl = "https://partner-finder.oracle.com/catalog/Partner/";
    
                            for (const partner of partnerList) {
                                const link = `${baseUrl}${partner.id}`;
                                const name = partner.name;
    
                                if (scrapedMap.has(link)) {
                                    const existingDetails = scrapedMap.get(link);
    
                                    if (!Array.isArray(existingDetails.filters)) {
                                        existingDetails.filters = [];
                                    }
    
                                    existingDetails.filters.push({
                                        level1Name,
                                        level2Name,
                                        level3Name,
                                        ucm_column,
                                        level4Name,
                                        level4Id
                                    });
    
                                    scrapedMap.set(link, existingDetails);
                                } else {
                                    const details = {
                                        serialNumber,
                                        id: partner.id,
                                        name,
                                        link,
                                        filters: [{
                                            level1Name,
                                            level2Name,
                                            level3Name,
                                            ucm_column,
                                            level4Name,
                                            level4Id
                                        }]
                                    };
                                    scrapedMap.set(link, details);
                                    serialNumber++;
                                }
                            }
                        }
                        console.log("Current SR no. : ",serialNumber);
                    } catch (error) {
                        console.error(`❌ Error scraping ${level4Name}:`, error);
                    }
                }
            }
        }
    }

    // Apply location filter separately
    for (const country of apacCountries) {
        const locationFilter = `${country.id}~${country.name}`;

        let currentPage = 1;
        let totalPages = 1;

        while (currentPage <= totalPages) {
            try {
                const payload = {
                    ...payloadTemplate,
                    pageNumber: String(currentPage),
                    filters: {
                        xscCompanyLocation: [locationFilter]
                    }
                };

                const response = await fetch(apiUrl, {
                    method: "POST",
                    headers,
                    body: JSON.stringify(payload),
                });

                if (!response.ok) {
                    console.error(`❌ Location request failed: ${response.status} ${response.statusText}`);
                    break;
                }

                const data = await response.json();

                const partnerList = data?.profiles || [];
                console.log(`Partners found in ${country.name}:`, partnerList.length);

                const baseUrl = "https://partner-finder.oracle.com/catalog/Partner/";

                for (const partner of partnerList) {
                    const link = `${baseUrl}${partner.id}`;
                    const name = partner.name;

                    if (scrapedMap.has(link)) {
                        const existingDetails = scrapedMap.get(link);

                        if (!Array.isArray(existingDetails.locations)) {
                            existingDetails.locations = [];
                        }

                        if (!existingDetails.locations.includes(country.name)) {
                            existingDetails.locations.push(country.name);
                        }

                        scrapedMap.set(link, existingDetails);
                    } else {
                        const details = {
                            serialNumber,
                            id: partner.id,
                            name,
                            link,
                            filters: [],
                            locations: [country.name]
                        };
                        scrapedMap.set(link, details);
                        serialNumber++;
                    }
                }

                currentPage++;
            } catch (error) {
                console.error(`❌ Error during location scraping for ${country.name} page ${currentPage}:`, error);
                break;
            }
        }
    }

    await storeOracleDataAsJson(Oracle_File, scrapedMap);
    const extractedDetails = Array.from(scrapedMap.values());
    return extractedDetails;
};



module.exports = scrapeData;