const { chromium } = require("playwright");
const db = require("../../../db");

const scrapeData = async () => {

    const url = "https://partner-finder.oracle.com/catalog/?search=%5B%7B%221%22%3A%22filter-location%22%2C%222%22%3A%22%22%2C%223%22%3A%5B%22location4205%22%5D%2C%224%22%3A%22%22%7D%5D";
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    console.log(`Navigating to Oracle partners website`);
    await page.goto(url, { waitUntil: "domcontentloaded" });

    // Wait for the partner list to load
    await page.waitForSelector("ul.o-partners--list li.o-partner", { timeout: 60000 });

    const partnerItems = await page.locator("ul.o-partners--list li.o-partner").all();

    const partnerData = await Promise.all(
        partnerItems.map(async (partner) => {
            try {
                const infoBlock = partner.locator("div.o-partner--info");
                const linkElement = infoBlock.locator("a:has(h6)");
                const link = await linkElement.getAttribute("href");
                return { link };
            } catch (error) {
                console.error("Failed to extract partner data : ", error);
                return null;
            }
        })
    );

    // //CLEAR DATABASE BEFORE INSERTING NEW DATA
    // try {
    //     await db.execute("DELETE FROM oracle");
    //     console.log("Database cleared. Storing fresh data...");
    // } catch (dbError) {
    //     console.error("Database Deletion Error:", dbError.message);
    // }

    let extractedDetails = [];

    for (const { link } of partnerData.filter(Boolean)) {
        try {
            await page.goto(link, { waitUntil: "domcontentloaded", timeout: 60000 });
            console.log("reached website");

            const nameLocator = page.locator(".o-partner-businesscard--details h1");
            await nameLocator.waitFor({ state: "visible", timeout: 100000 });
            const name = (await nameLocator.textContent())?.trim();
            // console.log("Extracted name:", name);

            // Oracle Expertise Description
            const oracleExpertiseP = await page.locator("h4:text('Oracle Expertise') + p").textContent();
            // console.log("oracle expertise p : ", oracleExpertiseP);

            // Oracle Expertise Details (List Items)
            const expertiseDetails = await page
                .locator("h4:text('Oracle Expertise') + p + ul.bulleted-list li")
                .allTextContents();
            // console.log("oracle expertise : ", expertiseDetails);

            // Company Overview
            const companyOverviewLocator = page.locator("#PartnerSummary");
            await companyOverviewLocator.waitFor({ state: "visible", timeout: 10000 });
            const companyOverview = await companyOverviewLocator.innerText();
            // console.log("company overview:", companyOverview);            

            // Extract Solutions (Title + URL)
            const solutions = await page.evaluate(() => {
                return Array.from(document.querySelectorAll("ul.o-paragraph-list li a.o-link-heading"))
                    .map(el => ({
                        title: el.textContent.trim(),
                        url: el.href
                    }));
            });

            const partnerDetails = {
                partner_name: name,
                oracle_expertise_description: oracleExpertiseP?.trim() || "",
                oracle_expertise_areas: expertiseDetails.join(", "), // join list for a single text column
                company_overview: companyOverview,
                solution_titles: solutions.map(s => s.title).join(", "), // flatten to comma-separated string
                solution_links: solutions.map(s => s.url).join(", ") // same for URLs
            };

            console.log(partnerDetails);
            extractedDetails.push(partnerDetails);

            try {
                await db.execute(
                    `INSERT INTO oracle (name,oracle_expertise_description,oracle_expertise_areas, company_overview,solution_titles,solution_links) VALUES (?, ?, ?, ?, ?, ?)`,
                    [name, oracleExpertiseP?.trim() || "", expertiseDetails.join(", "), companyOverview, solutions.map(s => s.title).join(", "), solutions.map(s => s.url).join(", ")]
                );
                console.log("Stored in DB : ", name);
            } catch (dbError) {
                console.error("Database Insert Error : ", dbError.message);
            }
        } catch (error) {
            console.error(`Error extracting details for ${link}:`, error);
        }
    }

    await browser.close();
    return extractedDetails;
};

module.exports = scrapeData;
