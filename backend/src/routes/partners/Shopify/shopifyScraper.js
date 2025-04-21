const { chromium } = require("playwright");
const { db, initializeDatabase } = require("../../../db");

const scrapeData = async () => {
    await initializeDatabase();
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const scrapedMap = new Map();

    await page.goto("https://www.shopify.com/partners/directory", {
        waitUntil: "load",
        timeout: 60000
    });

    const sections = ["Services", "Industries", "Countries"];

    for (const section of sections) {
        console.log(`\n🔍 Extracting filters from "${section}"...`);
        await expandFilterSection(page, section);

        const filters = await page.$$eval('.facets__fieldset', (fieldsets, sectionName) => {
            const fieldset = Array.from(fieldsets).find(fs => fs.querySelector('legend')?.innerText.trim() === sectionName);
            if (!fieldset) return [];
            return Array.from(fieldset.querySelectorAll('label')).map(label => label.innerText.trim());
        }, section);

        console.log(`📌 Found ${filters.length} filters in "${section}"`);

        for (const filter of filters) {
            console.log(`\n✅ Applying filter: ${filter} [${section}]`);
            try {
                await applyFilter(page, filter, section);
                console.log("🎯 Applied filter and refreshed listings.");

                await scrollAndLoadAllListings(page);

                const partnerLinks = await page.$$eval('a[href*="/partners/directory/"]', anchors => {
                    const seen = new Set();
                    return anchors
                        .map(a => ({
                            name: a.querySelector('h2')?.innerText.trim() || "No Name",
                            link: a.href
                        }))
                        .filter(({ link }) => {
                            if (seen.has(link)) return false;
                            seen.add(link);
                            return true;
                        });
                });

                console.log(`🔗 Found ${partnerLinks.length} partner links.`);

                const chunkSize = 5;
                for (let i = 0; i < partnerLinks.length; i += chunkSize) {
                    const chunk = partnerLinks.slice(i, i + chunkSize);

                    await Promise.all(chunk.map(async ({ name, link }) => {
                        try {
                            if (scrapedMap.has(link)) {
                                const existing = scrapedMap.get(link);
                                const sectionEntry = existing.foundIn.find(entry => entry.section === section);
                                if (sectionEntry) {
                                    if (!sectionEntry.filters.includes(filter)) {
                                        sectionEntry.filters.push(filter);
                                    }
                                } else {
                                    existing.foundIn.push({ section, filters: [filter] });
                                }
                                return;
                            }

                            console.log(`🌐 [${i + 1}/${partnerLinks.length}] Scraping: ${name} -> ${link}`);
                            const detailPage = await browser.newPage();
                            await detailPage.goto(link, { waitUntil: "domcontentloaded", timeout: 60000 });

                            const about = await detailPage.locator('section:has-text("About")').innerText().catch(() => "No About Info");
                            const services = await detailPage.locator('section:has-text("Services")').innerText().catch(() => "No Services Info");
                            const featuredWork = await detailPage.locator('section:has-text("Featured Work")').innerText().catch(() => "No Featured Work Info");
                            const rating = await detailPage.locator('[data-testid="reviewRating"]').innerText().catch(() => "No Rating");

                            const details = {
                                name,
                                link,
                                about,
                                services,
                                featuredWork,
                                rating,
                                foundIn: [{ section, filters: [filter] }]
                            };

                            scrapedMap.set(link, details);

                            await detailPage.close();
                        } catch (error) {
                            console.error(`❌ Failed scraping ${name}:`, error.message);
                        }
                    }));
                }

            } catch (error) {
                console.error(`❌ Error applying filter "${filter}":`, error.message);
            }

            await resetFilters(page);
        }
    }

    const extractedDetails = Array.from(scrapedMap.values());
    for (const [link, details] of scrapedMap.entries()) {
        try {
            const [insertResult] = await db.execute(
                "INSERT INTO shopify (name) VALUES (?)",
                [details.name]
            );

            const shopifyId = insertResult.insertId;
            if (!shopifyId) {
                throw new Error(`Insert into shopify table for "${details.name}" did not return an ID.`);
            }

            await db.execute(
                `INSERT INTO shopify_details (
                    id, link, about, services, featuredWork, rating
                ) VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    shopifyId,
                    link,
                    details.about,
                    details.services,
                    details.featuredWork,
                    details.rating
                ]
            );

            await db.execute(
                `INSERT INTO shopify_filters (id, filters) VALUES (?, ?)`,
                [
                    shopifyId,
                    JSON.stringify(details.foundIn)
                ]
            );

            console.log(`✅ Stored [ID: ${shopifyId}]: ${details.name}`);

        } catch (dbError) {
            console.error(`❌ Database Insert Error for "${details.name}":`, dbError.message);
        }
    }

    await browser.close();
    return extractedDetails;
};

async function scrollAndLoadAllListings(page) {
    try {
        let previousHeight = 0;
        while (true) {
            const loadMore = await page.locator('button:has-text("Load more")');
            if (await loadMore.isVisible()) {
                await loadMore.scrollIntoViewIfNeeded();
                await loadMore.click();
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
        console.log("⚠️ No more 'Load more' button or listings fully loaded.");
    }
}

async function expandFilterSection(page, sectionName) {
    const fieldset = await page.$(`.facets__fieldset:has(legend:text("${sectionName}"))`);
    if (!fieldset) throw new Error(`"${sectionName}" section not found`);
}

async function applyFilter(page, filterText, section) {
    try {
        await expandFilterSection(page, section);
        const fieldset = await page.$(`.facets__fieldset:has(legend:text("${section}"))`);
        const labels = await fieldset.$$('label');
        for (const label of labels) {
            const text = await label.innerText();
            if (text.trim() === filterText.trim()) {
                await label.click();
                await page.waitForTimeout(3000); // Give Shopify time to reload listings
                return;
            }
        }
        throw new Error(`Filter "${filterText}" not found in "${section}"`);
    } catch (error) {
        throw new Error(`applyFilter error: ${error.message}`);
    }
}

async function resetFilters(page) {
    try {
        const clearAll = page.locator('button:has-text("Clear all")');
        if (await clearAll.isVisible()) {
            await clearAll.scrollIntoViewIfNeeded();
            await clearAll.click();
            await page.waitForTimeout(2000);
            console.log("🔁 Cleared all filters.");
        }
    } catch (e) {
        console.error("❌ Failed to reset filters:", e.message);
    }
}

module.exports = scrapeData;
