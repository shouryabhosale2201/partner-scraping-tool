const { chromium } = require("playwright");
const db = require("../../../db");

const scrapeData = async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const scrapedMap = new Map();

    await page.goto("https://appexchange.salesforce.com/consulting", {
        waitUntil: "load",
        timeout: 60000
    });

    // const sections = ["Salesforce Expertise", "Industry Expertise"];

    console.log(`\n🧹 Skipping filters. Loading all listings...`);
    // await scrollAndLoadLimitedListings(page,3);
    await scrollAndLoadAllListings(page);
    console.log(`✅ Finished loading all listings.`);

    const partnerLinks = await page.$$eval(".appx-tiles-grid-ul a", anchors =>
        anchors.map(anchor => ({
            name: anchor.querySelector(".appx-tile-title span")?.innerText.trim() || "No Name",
            link: anchor.href
        }))
    );

    console.log(`🔗 Found ${partnerLinks.length} listings.`);

    const chunkSize = 20;
    for (let i = 0; i < partnerLinks.length; i += chunkSize) {
        const chunk = partnerLinks.slice(i, i + chunkSize);

        await Promise.all(chunk.map(async ({ name, link }) => {
            try {
                console.log(`🌐 [${i + 1}/${partnerLinks.length}] Opening: ${name} -> ${link}`);
                const detailPage = await browser.newPage();
                await detailPage.goto(link, { waitUntil: "domcontentloaded", timeout: 60000 });
                await detailPage.waitForSelector(".appx-headline-details-tagline, .appx-extended-detail-description", { timeout: 15000 });

                const tagline = await detailPage.locator(".appx-headline-details-tagline").innerText().catch(() => "No tagline");
                const description = await detailPage.locator(".appx-headline-details-descr").innerText().catch(() => "No description");
                const expertise = await detailPage.locator("#AppxConsultingListingDetail\\:AppxLayout\\:listingDetailOverviewTab\\:appxListingDetailOverviewTabComp\\:ftList\\:0\\:featureItem").innerText().catch(() => "No expertise");
                const industries = await detailPage.locator("#AppxConsultingListingDetail\\:AppxLayout\\:listingDetailOverviewTab\\:appxListingDetailOverviewTabComp\\:ftList\\:1\\:featureItem").innerText().catch(() => "No industries");
                const services = await detailPage.locator("#AppxConsultingListingDetail\\:AppxLayout\\:listingDetailOverviewTab\\:appxListingDetailOverviewTabComp\\:ftList\\:2\\:featureItem").innerText().catch(() => "No services");
                const extendedDescription = await detailPage.locator(".appx-extended-detail-description").innerText().catch(() => "No extended description");

                const details = {
                    name,
                    link,
                    tagline,
                    description,
                    expertise,
                    industries,
                    services,
                    extendedDescription
                };
                // Save to MySQL
                try {
                    // Step 1: Insert into basic salesforce table and AWAIT the result
                    // The result object contains insertId
                    const [insertResult] = await db.execute( // <-- Added await
                        "INSERT INTO salesforce (name) VALUES (?)",
                        [name]
                    );
                    // Get the ID directly from the result of the INSERT query
                    const salesforceId = insertResult.insertId;
                    // Check if an ID was actually generated (it should be if AUTO_INCREMENT is set up)
                    if (!salesforceId) {
                        throw new Error(`Insert into salesforce table for "${name}" did not return an ID.`);
                    }
                    // Step 2: Insert details into salesforce_details table and AWAIT completion
                    await db.execute( // <-- Added await
                        `INSERT INTO salesforce_details (
                        id, link, tagline, description, expertise, industries, services, extendedDescription
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            salesforceId, // Use the ID obtained from the first insert
                            link,
                            tagline,
                            description,
                            expertise,
                            industries,
                            services,
                            extendedDescription,
                        ]
                    );
                    console.log(`:white_check_mark: Stored in DB (ID: ${salesforceId}):`, name);
                } catch (dbError) {
                    console.error(`:x: Database Insert Error for "${name}":`, dbError.message);
                }

                scrapedMap.set(link, details);
                console.log(`✅ Extracted: ${name}`);

                await detailPage.close();

            } catch (error) {
                console.error(`❌ Failed to extract ${name}:`, error.message);
            }
        }));
    }


    const extractedDetails = Array.from(scrapedMap.values());

    await browser.close();
    return extractedDetails;
};

async function scrollAndLoadAllListings(page) {
    try {
        let previousHeight = 0;
        while (true) {
            const showMore = await page.locator("button:has-text('Show More')");
            if (await showMore.isVisible()) {
                await showMore.scrollIntoViewIfNeeded();
                await showMore.click();
                await page.waitForTimeout(2000);
            } else {
                const currentHeight = await page.evaluate(() => document.body.scrollHeight);
                if (currentHeight === previousHeight) break;
                previousHeight = currentHeight;
                await page.mouse.wheel(0, 1000);
                await page.waitForTimeout(1000);
            }
        }
    } catch (error) {
        console.log("⚠️ No 'Show More' button or finished loading.");
    }
}

// async function scrollAndLoadLimitedListings(page, maxClicks = 2) {
//     try {
//         let clickCount = 0;
//         while (clickCount < maxClicks) {
//             const showMore = await page.locator("button:has-text('Show More')");
//             if (await showMore.isVisible()) {
//                 await showMore.scrollIntoViewIfNeeded();
//                 await showMore.click();
//                 await page.waitForTimeout(2000);
//                 clickCount++;
//             } else {
//                 break;
//             }
//         }
//         console.log(`🛑 Clicked "Show More" ${clickCount} time(s).`);
//     } catch (error) {
//         console.log("⚠️ Error during limited scrolling:", error.message);
//     }
// }

module.exports = scrapeData;
