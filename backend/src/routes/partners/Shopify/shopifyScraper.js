const { chromium } = require("playwright");
const db = require("../../../db");

const scrapeData = async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    const baseUrl = "https://www.shopify.com/partners/directory/services";
    let currentPage = 1;
    const allPartnerData = [];

    while (currentPage < 4) {
        const url = `${baseUrl}?page=${currentPage}`;
        console.log(`Navigating to ${url}`);
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

        // Wait for the partner cards to load
        const partnerSelector = 'a[href^="/partners/directory/partner/"]';
        try {
            await page.waitForSelector(partnerSelector, { timeout: 10000 });
        } catch {
            console.log(`No partner cards found on page ${currentPage}. Ending scrape.`);
            break;
        }

        const partnerItems = await page.locator(partnerSelector).all();

        if (partnerItems.length === 0) {
            console.log(`No partners found on page ${currentPage}. Stopping.`);
            break;
        }

        const partnerData = await Promise.all(
            partnerItems.map(async (partner) => {
                try {
                    const href = await partner.getAttribute('href');
                    // const name = await partner.locator('h3').textContent();
                    return {
                        // name: name?.trim() || '',
                        link: `https://www.shopify.com${href}`
                    };
                } catch (error) {
                    console.error("Failed to extract partner data:", error);
                    return null;
                }
            })
        );

        allPartnerData.push(...partnerData.filter(Boolean));

        console.log(`Page ${currentPage} done, partners found: ${partnerData.length}`);
        currentPage++;
    }

    // const filteredData = partnerData.filter(Boolean); // remove nulls
    // return filteredData;

    // //CLEAR DATABASE BEFORE INSERTING NEW DATA
    // try {
    //     await db.execute("DELETE FROM oracle");
    //     console.log("Database cleared. Storing fresh data...");
    // } catch (dbError) {
    //     console.error("Database Deletion Error:", dbError.message);
    // }

    let extractedDetails = [];

    for (const { link } of allPartnerData.filter(Boolean)) {
        try {
            await page.goto(link, { waitUntil: "domcontentloaded", timeout: 60000 });
            console.log("Reached website:", link);

            const name = await page.locator('div.grid.gap-y-3 h1.richtext.text-t4').innerText();
            console.log("Name:", name);            

            const businessDescription = await page.$eval(
                'pre.text-body-base.font-sans.whitespace-pre-wrap.opacity-70.pb-4',
                (el) => el.innerText.trim()
            );

            const services = await page.$$eval('div[aria-labelledby^="header-"]', (sections) => {
                return sections.map((section) => {
                    const title = section.querySelector('h3')?.innerText || '';
                    const price = section.querySelector('p.opacity-70')?.innerText || '';
                    const description = section.querySelector('pre')?.innerText || '';
                    return { title, price, description };
                });
            });

            // Featured Work
            const featuredWork = await page.$$eval('div.pt-4 > div.flex.flex-col', (entries) => {
                return entries.map((entry) => {
                    const title = entry.querySelector('h3')?.innerText.trim() || '';
                    const description = entry.querySelector('pre')?.innerText.trim() || '';
                    const linkElement = entry.querySelector('a');
                    const link = linkElement ? linkElement.href : '';
                    return { title, description, link };
                });
            });

            const partnerDetails = {name,link,businessDescription,specializedServices: services,featuredWork: featuredWork
            };

            try {
                await db.execute(
                    `INSERT INTO shopify (name, link, business_description, specialized_services, featured_work) VALUES (?, ?, ?, ?, ?)`,
                    [
                        partnerDetails.name,
                        partnerDetails.link,
                        partnerDetails.businessDescription,
                        JSON.stringify(partnerDetails.specializedServices),
                        JSON.stringify(partnerDetails.featuredWork)
                    ]
                );
                console.log("Stored in DB : ", name);
            } catch (dbError) {
                console.error("Database Insert Error : ", dbError.message);
            }

            // console.log(partnerDetails);
            extractedDetails.push(partnerDetails);
        } catch (error) {
            console.error(`Error extracting details for ${link}:`, error);
        }
    }
    await browser.close();
    return extractedDetails;
}

module.exports = scrapeData;
