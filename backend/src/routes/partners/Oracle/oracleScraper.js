const { chromium } = require("playwright");
const { db, initializeDatabase } = require("../../../db");

const scrapeData = async () => {
    // const expertiseIdMap = {
    //     // CSPE IDs
    //     "1032": "CSPE", "1033": "CSPE", "1031": "CSPE", "1035": "CSPE", "1034": "CSPE",
    //     "1036": "CSPE", "1452": "CSPE", "1453": "CSPE", "1454": "CSPE", "1125": "CSPE",
    //     "1455": "CSPE", "1051": "CSPE", "1052": "CSPE", "1053": "CSPE", "1054": "CSPE",
    //     "1055": "CSPE", "1056": "CSPE", "1057": "CSPE", "1058": "CSPE", "1059": "CSPE",
    //     "1075": "CSPE", "1076": "CSPE", "1081": "CSPE", "1078": "CSPE", "1069": "CSPE",
    //     "1070": "CSPE", "1071": "CSPE", "1073": "CSPE", "1072": "CSPE", "1068": "CSPE",
    //     "1084": "CSPE", "1080": "CSPE", "1082": "CSPE", "1083": "CSPE", "1061": "CSPE",
    //     "1062": "CSPE", "1064": "CSPE", "1065": "CSPE", "1063": "CSPE", "1066": "CSPE",
    //     "1067": "CSPE",

    //     // CSSE IDs
    //     "1492": "CSSE", "1672": "CSSE", "1514": "CSSE", "1512": "CSSE", "1658": "CSSE",
    //     "1660": "CSSE", "1661": "CSSE", "1652": "CSSE", "1653": "CSSE", "1654": "CSSE",
    //     "1655": "CSSE", "1513": "CSSE", "1657": "CSSE", "1656": "CSSE", "1659": "CSSE",

    //     // ISE IDs
    //     "354": "ISE", "1225": "ISE", "247": "ISE", "251": "ISE", "1226": "ISE",
    //     "250": "ISE", "1351": "ISE", "246": "ISE", "1836": "ISE", "930": "ISE",
    //     "355": "ISE", "1349": "ISE", "356": "ISE", "1348": "ISE", "1350": "ISE",
    //     "1552": "ISE", "357": "ISE", "358": "ISE", "359": "ISE", "360": "ISE",
    //     "361": "ISE", "362": "ISE", "363": "ISE", "1532": "ISE", "1792": "ISE",
    //     "1772": "ISE", "1146": "ISE", "891": "ISE", "890": "ISE", "810": "ISE",
    //     "1285": "ISE", "1325": "ISE", "1265": "ISE", "1145": "ISE", "1634": "ISE",
    //     "990": "ISE", "671": "ISE", "1147": "ISE", "1205": "ISE", "1632": "ISE",
    //     "1326": "ISE", "832": "ISE", "1306": "ISE", "1692": "ISE", "1752": "ISE",
    //     "1912": "ISE", "373": "ISE", "374": "ISE", "379": "ISE", "376": "ISE",
    //     "1245": "ISE", "1037": "ISE", "382": "ISE", "378": "ISE", "380": "ISE",
    //     "381": "ISE", "384": "ISE", "385": "ISE", "386": "ISE", "1872": "ISE",
    //     "388": "ISE", "387": "ISE", "383": "ISE", "366": "ISE", "367": "ISE",
    //     "369": "ISE", "370": "ISE", "368": "ISE", "371": "ISE", "372": "ISE"
    // };

    // // Usage example:
    // function findCategory(id) {
    //     return expertiseIdMap[id] || "Not found";
    // }

    initializeDatabase();
    const browser = await chromium.launch({ headless: true });

    const level4Items = [];
    try {
        const url = 'https://partner-finder.oracle.com/catalog/api/file/OPN-EXPERTISELIST-DF';
        const response = await fetch(url);
        const expertiseData = await response.json();

        if (expertiseData.expertiseList && Array.isArray(expertiseData.expertiseList)) {
            expertiseData.expertiseList.forEach(level1 => {
                if (level1.level_2_list && Array.isArray(level1.level_2_list)) {
                    level1.level_2_list.forEach(level2 => {
                        if (level2.level_3_list && Array.isArray(level2.level_3_list)) {
                            level2.level_3_list.forEach(level3 => {
                                const ucm_column = level3.ucm_column;
                                if (level3.level_4_list && Array.isArray(level3.level_4_list)) {
                                    level3.level_4_list.forEach(level4 => {
                                        level4Items.push({
                                            ucm_column,
                                            id: level4.id,
                                            name: level4.name,
                                        });
                                    });
                                }
                            });
                        }
                    });
                }
            });
        }

        console.log('Extracted Level 4 Expertise IDs and Names:', level4Items);
    } catch (error) {
        console.error('Error fetching expertise list:', error.message);
    }

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

    let allPartnerIds = [];
    for (const { ucm_column, id, filterName } of level4Items) {

        let currentPage = 1;
        let totalPages = 3;

        while (currentPage <= totalPages) {
            console.log("sending request to : ", filterName, id, ucm_column);
            const payload = {
                ...payloadTemplate,
                pageNumber: String(currentPage),
                filters: {
                    [ucm_column]: [id]
                }
            };
            const response = await fetch(apiUrl, {
                method: "POST",
                headers,
                body: JSON.stringify(payload),
                // body: payload,
            });

            const data = await response.json();

            const partnerList = data?.profiles || [];
            const partnerIds = partnerList.map(p => p.id);
            console.log(partnerIds);
            allPartnerIds.push(...partnerIds);

            // Update total pages based on 'count' from response
            // const totalResults = data.count || partnerList.length;
            // totalPages = Math.ceil(totalResults / parseInt(payloadTemplate.resultCount));

            currentPage++;
        }

        console.log("Total Partner IDs:", allPartnerIds.length);

        const baseUrl = "https://partner-finder.oracle.com/catalog/Partner/";
        const allPartners = allPartnerIds.map(id => `${baseUrl}${id}`);

        console.log("Generated Links:", allPartners.length);
        console.log(allPartners);

        const chunkSize = 5;
        const scrapedMap = new Map();
        const failedLinks = [];

        for (let i = 0; i < allPartners.length; i += chunkSize) {
            const chunk = allPartners.slice(i, i + chunkSize).filter(Boolean);

            await Promise.all(chunk.map(async (link, idx) => {
                try {
                    const detailPage = await browser.newPage();
                    await detailPage.goto(link, { waitUntil: "domcontentloaded", timeout: 100000 });
                    console.log(`🌐 [${i + idx + 1}/${allPartners.length}] Opening: ${link}`);

                    const nameLocator = detailPage.locator(".o-partner-businesscard--details h1");
                    await nameLocator.waitFor({ state: "visible", timeout: 100000 });
                    const name = (await nameLocator.textContent())?.trim();

                    const oracleExpertiseP = await detailPage.locator("h4:text('Oracle Expertise') + p").textContent();
                    const expertiseDetails = await detailPage
                        .locator("h4:text('Oracle Expertise') + p + ul.bulleted-list li")
                        .allTextContents();

                    const companyOverviewLocator = detailPage.locator("#PartnerSummary");
                    await companyOverviewLocator.waitFor({ state: "visible", timeout: 100000 });
                    const companyOverview = await companyOverviewLocator.innerText();

                    const solutions = await detailPage.evaluate(() => {
                        return Array.from(document.querySelectorAll("ul.o-paragraph-list li a.o-link-heading"))
                            .map(el => ({
                                title: el.textContent.trim(),
                                url: el.href
                            }));
                    });

                    // Step 1: Insert into `oracle` table
                    const [result] = await db.execute(
                        `INSERT INTO oracle (name) VALUES (?)`,
                        [name]
                    );
                    const oracleId = result.insertId;

                    // Step 2: Insert into `oracle_details` table
                    try {
                        await db.execute(
                            `INSERT INTO oracle_details (
                            id, oracle_expertise_description, oracle_expertise_areas,
                            company_overview, solution_titles, solution_links
                        ) VALUES (?, ?, ?, ?, ?, ?)`,
                            [
                                oracleId,
                                oracleExpertiseP?.trim() || "",
                                expertiseDetails.join(", "),
                                companyOverview,
                                solutions.map(s => s.title).join(", "),
                                solutions.map(s => s.url).join(", ")
                            ]
                        );
    
                        await db.execute(
                            `INSERT INTO oracle_filters (id, filters)
                             VALUES (?, ?)
                             ON DUPLICATE KEY UPDATE
                               filters = JSON_MERGE_PRESERVE(filters, VALUES(filters))`,
                            [oracleId, filterName]
                          );
                          
                    } catch (dbError) {
                        console.log("error inserting into db : ", dbError, " for : ", )
                    }

                    const details = {
                        name,
                        link,
                        oracleExpertiseP,
                        expertiseDetails,
                        companyOverview,
                        solutions
                    };
                    scrapedMap.set(link, details);
                    console.log(`✅ Extracted and Stored: ${name}`);

                    await detailPage.close();
                } catch (error) {
                    console.error(`❌ Failed to extract ${link}:`, error.message);
                    failedLinks.push(link);
                }
            }));
        }
    }

    // const maxRetries = 2;

    // for (const link of failedLinks) {
    //     let attempt = 0;
    //     let success = false;

    //     while (attempt < maxRetries && !success) {
    //         try {
    //             const detailPage = await browser.newPage();
    //             await detailPage.goto(link, { waitUntil: "domcontentloaded", timeout: 100000 });
    //             console.log(`🌐 Retrying: ${link}`);

    //             const nameLocator = detailPage.locator(".o-partner-businesscard--details h1");
    //             await nameLocator.waitFor({ state: "visible", timeout: 100000 });
    //             const name = (await nameLocator.textContent())?.trim();

    //             const oracleExpertiseP = await detailPage.locator("h4:text('Oracle Expertise') + p").textContent();
    //             const expertiseDetails = await detailPage
    //                 .locator("h4:text('Oracle Expertise') + p + ul.bulleted-list li")
    //                 .allTextContents();

    //             const companyOverviewLocator = detailPage.locator("#PartnerSummary");
    //             await companyOverviewLocator.waitFor({ state: "visible", timeout: 100000 });
    //             const companyOverview = await companyOverviewLocator.innerText();

    //             const solutions = await detailPage.evaluate(() => {
    //                 return Array.from(document.querySelectorAll("ul.o-paragraph-list li a.o-link-heading"))
    //                     .map(el => ({
    //                         title: el.textContent.trim(),
    //                         url: el.href
    //                     }));
    //             });

    //             // Step 1: Insert into `oracle` table
    //             const [result] = await db.execute(
    //                 `INSERT INTO oracle (name) VALUES (?)`,
    //                 [name]
    //             );
    //             const oracleId = result.insertId;

    //             // Step 2: Insert into `oracle_details` table
    //             await db.execute(
    //                 `INSERT INTO oracle_details (
    //                 id, oracle_expertise_description, oracle_expertise_areas,
    //                 company_overview, solution_titles, solution_links
    //             ) VALUES (?, ?, ?, ?, ?, ?)`,
    //                 [
    //                     oracleId,
    //                     oracleExpertiseP?.trim() || "",
    //                     expertiseDetails.join(", "),
    //                     companyOverview,
    //                     solutions.map(s => s.title).join(", "),
    //                     solutions.map(s => s.url).join(", ")
    //                 ]
    //             );

    //             const details = {
    //                 name,
    //                 link,
    //                 oracleExpertiseP,
    //                 expertiseDetails,
    //                 companyOverview,
    //                 solutions
    //             };
    //             scrapedMap.set(link, details);
    //             console.log(`✅ Extracted and Stored: ${name}`);

    //             await detailPage.close();
    //         } catch (error) {
    //             attempt++;
    //             console.error(`Retry ${attempt} failed for ${link}:`, error.message);
    //             if (attempt === maxRetries) {
    //                 console.error(`❌ All retries failed for ${link}`);
    //             }
    //         }
    //     }
    // }

    const extractedDetails = Array.from(scrapedMap.values());
    return extractedDetails;
};

module.exports = scrapeData;