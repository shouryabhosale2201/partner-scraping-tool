const { chromium } = require('playwright');
const db = require("../../../db");

const scrapeData = async () => {
    const scrapePage = async (browser, pageNum) => {
        const page = await browser.newPage();
        const url = `https://www.shopify.com/partners/directory/services?page=${pageNum}`;
        console.log(`Navigating to ${url}`);
        try {
            await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

            const partnerSelector = 'a[href^="/partners/directory/partner/"]';
            await page.waitForSelector(partnerSelector, { timeout: 10000 });

            const partnerItems = await page.locator(partnerSelector).all();

            const data = await Promise.all(
                partnerItems.map(async (partner) => {
                    try {
                        const href = await partner.getAttribute('href');
                        return {
                            link: `https://www.shopify.com${href}`,
                        };
                    } catch (err) {
                        return null;
                    }
                })
            );

            return data.filter(Boolean);
        } catch (error) {
            console.error(`Error on page ${pageNum}:`, error.message);
            return [];
        } finally {
            await page.close();
        }
    };

    (async () => {
        const browser = await chromium.launch({ headless: true });
        const totalPages = 221;
        const batchSize = 10;
        const allPartnerData = [];

        for (let i = 1; i <= totalPages; i += batchSize) {
            const currentBatch = [];
            for (let j = i; j < i + batchSize && j <= totalPages; j++) {
                currentBatch.push(scrapePage(browser, j));
            }

            const batchResults = await Promise.all(currentBatch);
            for (const result of batchResults) {
                allPartnerData.push(...result);
            }

            console.log(`✅ Completed batch ${i}–${Math.min(i + batchSize - 1, totalPages)} (${allPartnerData.length} links so far)`);
        }

        let extractedDetails = [];

        const detailBatchSize = 10;
        for (let i = 0; i < allPartnerData.length; i += detailBatchSize) {
            const batch = allPartnerData.slice(i, i + detailBatchSize);
        
            const batchResults = await Promise.all(batch.map(async ({ link }) => {
                try {
                    const page = await browser.newPage();
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
        
                    const featuredWork = await page.$$eval('div.pt-4 > div.flex.flex-col', (entries) => {
                        return entries.map((entry) => {
                            const title = entry.querySelector('h3')?.innerText.trim() || '';
                            const description = entry.querySelector('pre')?.innerText.trim() || '';
                            const linkElement = entry.querySelector('a');
                            const link = linkElement ? linkElement.href : '';
                            return { title, description, link };
                        });
                    });
        
                    const partnerDetails = {
                        name, link, businessDescription, specializedServices: services, featuredWork: featuredWork
                    };
        
                    await page.close();
                    return partnerDetails;
                } catch (error) {
                    console.error(`Error extracting details for ${link}:`, error);
                    return null;
                }
            }));
        
            for (const partnerDetails of batchResults.filter(Boolean)) {
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
                    console.log("Stored in DB : ", partnerDetails.name);
                    extractedDetails.push(partnerDetails);
                } catch (dbError) {
                    console.error("Database Insert Error : ", dbError.message);
                }
            }
        }
        
        console.log(`Scraped total ${allPartnerData.length} partner links from ${totalPages} pages`);
        await browser.close();
        return extractedDetails;
    })();
}
module.exports = scrapeData;