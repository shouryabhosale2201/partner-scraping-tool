const { chromium } = require("playwright");
const { db, initializeDatabase } = require("../../../db");
const filterIdApi = require("./filterIdApi");


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

async function storeOracleDataToDB(scrapedMap) {
    for (const [link, details] of scrapedMap.entries()) {
        try {
            // Step 1: Insert into `oracle` table
            const [result] = await db.execute(
                `INSERT INTO oracle (name) VALUES (?)`,
                [details.name]
            );
            const oracleId = result.insertId;

            // Step 2: Insert into `oracle_details` table
            await db.execute(
                `INSERT INTO oracle_details (
                    id, oracle_expertise_areas, company_overview, solution_titles, solution_links, link
                ) VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    oracleId,
                    details.expertiseDetails.join(", "),
                    details.companyOverview,
                    details.solutions.map(s => s.title).join(", "),
                    details.solutions.map(s => s.url).join(", "),
                    link
                ]
            );

            // Step 3: Insert filters into `oracle_filters` table
            await db.execute(
                `INSERT INTO oracle_filters (id, filters) VALUES (?, ?)`,
                [oracleId, JSON.stringify(details.filter)]
            );

            console.log(`✅ Stored : ${details.name}`);
        } catch (dbError) {
            console.log("❌ Error inserting into DB:", dbError, "for:", details.name);
        }
    }
}


const scrapeData = async () => {

    initializeDatabase();
    const browser = await chromium.launch({ headless: true });

    const level4Items = await filterIdApi();

    let allPartnerIds = [];
    let tests = 0;
    const scrapedMap = new Map();
    for (const { ucm_column, id, filterName } of level4Items) {
        if (tests > 1) {
            break;
        }
        tests++;
        console.log("trying : ", filterName, id, ucm_column);

        let currentPage = 1;
        let totalPages = 1;

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

        const chunkSize = 4;
        const failedLinks = [];

        for (let i = 0; i < allPartners.length; i += chunkSize) {
            const chunk = allPartners.slice(i, i + chunkSize).filter(Boolean);

            await Promise.all(chunk.map(async (link, idx) => {
                try {
                    // if (scrapedMap.has(link)) {
                    //     const existingDetails = scrapedMap.get(link);

                    //     if (!Array.isArray(existingDetails.filter)) {
                    //         existingDetails.filter = [];
                    //     }

                    //     if (!existingDetails.filter.includes(filterName)) {
                    //         existingDetails.filter.push(filterName);
                    //     }

                    //     scrapedMap.set(link, existingDetails);
                    // } else {
                    //     const details = {
                    //         name,
                    //         link,
                    //         expertiseDetails,
                    //         companyOverview,
                    //         solutions,
                    //         filter: [filterName]
                    //     };
                    //     scrapedMap.set(link, details);
                    // }


                    const detailPage = await browser.newPage();
                    await detailPage.goto(link, { waitUntil: "domcontentloaded", timeout: 60000 });
                    console.log(`🌐 [${i + idx + 1}/${allPartners.length}] Opening: ${link}`);

                    const nameLocator = detailPage.locator(".o-partner-businesscard--details h1");
                    await nameLocator.waitFor({ state: "visible", timeout: 60000 });
                    const name = (await nameLocator.textContent())?.trim();

                    const expertiseDetails = await detailPage
                        .locator("h4:text('Oracle Expertise') + p + ul.bulleted-list li")
                        .allTextContents();

                    const companyOverviewLocator = detailPage.locator("#PartnerSummary");
                    await companyOverviewLocator.waitFor({ state: "visible", timeout: 60000 });
                    const companyOverview = await companyOverviewLocator.innerText();

                    const solutions = await detailPage.evaluate(() => {
                        return Array.from(document.querySelectorAll("ul.o-paragraph-list li a.o-link-heading"))
                            .map(el => ({
                                title: el.textContent.trim(),
                                url: el.href
                            }));
                    });

                    // const filters = Array.isArray(filterName) ? filterName : [];
                    const filters = [filterName];

                    const details = {
                        name,
                        link,
                        expertiseDetails,
                        companyOverview,
                        solutions,
                        filter: [...filters]
                    };
                    scrapedMap.set(link, details);
                    console.log(`✅ Extracted : ${name} Filters : ${details.filter}`);

                    await detailPage.close();
                } catch (error) {
                    console.error(`❌ Failed to extract ${link}:`, error.message);
                    failedLinks.push(link);
                }
            }));
        }
    }
    console.log(scrapedMap);

    for (const [link, details] of scrapedMap.entries()) {
        console.log("started storing");
        try {
            // Step 1: Insert into `oracle` table
            const [result] = await db.execute(
                `INSERT INTO oracle (name) VALUES (?)`,
                [details.name]
            );
            const oracleId = result.insertId;

            // Step 2: Insert into `oracle_details` table
            await db.execute(
                `INSERT INTO oracle_details (
                    id, oracle_expertise_areas, company_overview, solution_titles, solution_links, link
                ) VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    oracleId,
                    details.expertiseDetails.join(", "),
                    details.companyOverview,
                    details.solutions.map(s => s.title).join(", "),
                    details.solutions.map(s => s.url).join(", "),
                    link
                ]
            );

            // Step 3: Insert filters into `oracle_filters` table
            await db.execute(
                `INSERT INTO oracle_filters (id, filters) VALUES (?, ?)`,
                [oracleId, details.filter.map()]
            );

            console.log(`✅ Stored : ${details.name}`);
        } catch (dbError) {
            console.log("❌ Error inserting into DB:", dbError, "for:", details.name);
        }
    }

    const extractedDetails = Array.from(scrapedMap.values());
    // await storeOracleDataToDB(scrapedMap);
    await browser.close();
    return extractedDetails;
};

module.exports = scrapeData;