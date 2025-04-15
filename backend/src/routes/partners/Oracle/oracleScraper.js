const { chromium } = require("playwright");
const {db, initializeDatabase} = require("../../../db");

const scrapeData = async () => {
    initializeDatabase();
    const url = "https://partner-finder.oracle.com/catalog/?search=%5B%7B%221%22%3A%22filter-location%22%2C%222%22%3A%22%22%2C%223%22%3A%5B%22location4205%22%5D%2C%224%22%3A%22%22%7D%5D";
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    console.log(`Navigating to Oracle partners website`);
    await page.goto(url, { waitUntil: "domcontentloaded" });
    
    // Array to store all partners data
    const allPartnersData = [];
    let currentPage = 1;
    
    async function scrapeAllPages() {
        try {
            // Wait for initial page load
            await page.waitForSelector("ul.o-partners--list li.o-partner", { timeout: 60000 });
            
            let previousPartnerContent = ""; // We'll use the content to detect changes
            
            while (true) {
                console.log(`Scraping page ${currentPage}`);
                
                // Wait for partner list to be visible
                await page.waitForSelector("ul.o-partners--list li.o-partner");
                
                // Extract the current partners on this page
                const partnerItems = await page.locator("ul.o-partners--list li.o-partner").all();
                console.log(`Found ${partnerItems.length} partners on page ${currentPage}`);
                
                // Process each partner
                const currentPageData = await Promise.all(
                    partnerItems.map(async (partner) => {
                        try {
                            const infoBlock = partner.locator("div.o-partner--info");
                            const linkElement = infoBlock.locator("a:has(h6)");
                            const link = await linkElement.getAttribute("href");
                            return { link };
                        } catch (error) {
                            console.error("Failed to extract partner data: ", error);
                            return null;
                        }
                    })
                );
                
                // Filter out nulls and add to our collection
                const validData = currentPageData.filter(Boolean);
                allPartnersData.push(...validData);
                console.log(`Added ${validData.length} partners from page ${currentPage}. Total: ${allPartnersData.length}`);
                
                // Check if there's a next button that's not disabled
                const hasNextButton = await page.locator('ul.o-pagination li:last-child:not(.disabled)').count() > 0;
                if (!hasNextButton) {
                    console.log("No more pages (next button is disabled or not found)");
                    break;
                }
                
                // Get current content for comparison
                previousPartnerContent = await page.locator("ul.o-partners--list").innerHTML();
                
                // Click the next button
                console.log("Clicking next button...");
                await page.locator('ul.o-pagination li:last-child a').click();
                
                // Wait for content to change
                try {
                    await page.waitForFunction(
                        (prevContent) => {
                            const currentContent = document.querySelector("ul.o-partners--list").innerHTML;
                            return currentContent !== prevContent;
                        },
                        previousPartnerContent,
                        { timeout: 10000 }
                    );
                    console.log("Page content changed successfully");
                } catch (e) {
                    console.log("Timeout waiting for content change, breaking the loop");
                    break;
                }
                // Increment page counter
                currentPage++;
            }
            
            console.log(`Completed scraping. Total partners found: ${allPartnersData.length}`);
            return allPartnersData;
        } catch (error) {
            console.error("Error during pagination scraping:", error);
            return allPartnersData; // Return what we have so far
        }
    }
    
    // Execute the scraping
    const allPartners = await scrapeAllPages();
    
    // Print the results
    console.log("All partner links:");
    allPartners.forEach(partner => console.log(partner.link));

    // //CLEAR DATABASE BEFORE INSERTING NEW DATA
    // try {
    //     await db.execute("DELETE FROM oracle");
    //     console.log("Database cleared. Storing fresh data...");
    // } catch (dbError) {
    //     console.error("Database Deletion Error:", dbError.message);
    // }

    let extractedDetails = [];

    for (const { link } of allPartners.filter(Boolean)) {
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
                // Step 1: Insert into `oracle` table (name only)
                const [result] = await db.execute(
                    `INSERT INTO oracle (name) VALUES (?)`,
                    [name]
                );
                const oracleId = result.insertId;
            
                // Step 2: Insert into `oracle_details` table using the oracle ID
                await db.execute(
                    `INSERT INTO oracle_details (
                        id,
                        oracle_expertise_description,
                        oracle_expertise_areas,
                        company_overview,
                        solution_titles,
                        solution_links
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
            
                console.log("✅ Stored in DB:", name);
            } catch (dbError) {
                console.error("❌ Database Insert Error:", dbError.message);
            }
            
        } catch (error) {
            console.error(`Error extracting details for ${link}:`, error);
        }
    }

    await browser.close();
    return extractedDetails;
};

module.exports = scrapeData;