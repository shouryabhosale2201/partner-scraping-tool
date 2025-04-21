const { chromium } = require("playwright");
// import {db} from '../../../db';
const { db, initializeDatabase } = require("../../../db");

const scrapeData = async () => {
    await initializeDatabase();
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const scrapedMap = new Map();

    await page.goto("https://appexchange.salesforce.com/consulting", {
        waitUntil: "load",
        timeout: 60000
    });
    const sections = ["Salesforce Expertise", "Industry Expertise"];

    for (const section of sections) {
        console.log(`\n🔍 Extracting filters from "${section}"...`);
        await expandFilterSection(page, section);

        const filters = await page.$$eval('fieldset', (fieldsets, sectionName) => {
            const fieldset = fieldsets.find(fs =>
                fs.querySelector('legend span')?.innerText.trim() === sectionName
            );
            if (!fieldset) return [];
            return Array.from(fieldset.querySelectorAll('.slds-checkbox label'))
                .map(label => label.innerText.trim().replace(/\s*only$/, ''))
                .filter(option => !!option);
        }, section);

        console.log(`📌 Found ${filters.length} filters in "${section}"`);

        for (const filter of filters) {
            console.log(`\n✅ Applying filter: ${filter} [${section}]`);
            try {
                await applyFilter(page, filter, section);
                console.log("🎯 Clicked 'Apply' button.");

                await scrollAndLoadAllListings(page);

                const partnerLinks = await page.$$eval(".appx-tiles-grid-ul a", anchors =>
                    anchors.map(anchor => ({
                        name: anchor.querySelector(".appx-tile-title span")?.innerText.trim() || "No Name",
                        link: anchor.href
                    }))
                );

                console.log(`🔗 Found ${partnerLinks.length} links.`);

                const chunkSize = 5;  // adjust based on RAM / network
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
                                extendedDescription,
                                foundIn: [{ section, filters: [filter] }]
                            };
                            scrapedMap.set(link, details);
                            await detailPage.close();

                        } catch (error) {
                            console.error(`❌ Failed to extract ${name}:`, error.message);
                        }
                    }));
                }

            } catch (error) {
                console.error(`❌ Error with filter "${filter}":`, error.message);
            }

            await resetFilters(page);
        }
    }


    // At the end, save all filters to the DB
    const extractedDetails = Array.from(scrapedMap.values());
    for (const [link, details] of scrapedMap.entries()) {
        try {
            // Step 1: Insert into salesforce table
            const [insertResult] = await db.execute(
                "INSERT INTO salesforce (name) VALUES (?)",
                [details.name]
            );

            const salesforceId = insertResult.insertId;
            if (!salesforceId) {
                throw new Error(`Insert into salesforce table for "${details.name}" did not return an ID.`);
            }

            // Step 2: Insert into salesforce_details table
            await db.execute(
                `INSERT INTO salesforce_details (
                    id, link, tagline, description, expertise, industries, services, extendedDescription
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    salesforceId,
                    link,
                    details.tagline,
                    details.description,
                    details.expertise,
                    details.industries,
                    details.services,
                    details.extendedDescription
                ]
            );

            // Step 3: Insert into salesforce_filters table
            await db.execute(
                `INSERT INTO salesforce_filters (id, filters) VALUES (?, ?)`,
                [
                    salesforceId,
                    JSON.stringify(details.foundIn)
                ]
            );

            console.log(`✅ Stored [ID: ${salesforceId}]: ${details.name}`);

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

async function scrollAndLoadLimitedListings(page, maxClicks = 2) {
    try {
        let clickCount = 0;
        while (clickCount < maxClicks) {
            const showMore = await page.locator("button:has-text('Show More')");
            if (await showMore.isVisible()) {
                await showMore.scrollIntoViewIfNeeded();
                await showMore.click();
                await page.waitForTimeout(2000);
                clickCount++;
            } else {
                break;
            }
        }
        console.log(`🛑 Clicked "Show More" ${clickCount} time(s).`);
    } catch (error) {
        console.log("⚠️ Error during limited scrolling:", error.message);
    }
}

async function expandFilterSection(page, sectionName) {
    const fieldset = await page.$(`fieldset:has(legend span:text("${sectionName}"))`);
    if (!fieldset) throw new Error(`"${sectionName}" section not found`);
    const showMoreBtn = await fieldset.$('.appx-form-show-more');
    if (showMoreBtn) {
        const isVisible = await showMoreBtn.evaluate(el => window.getComputedStyle(el).display !== "none");
        if (!isVisible) {
            await showMoreBtn.evaluate(el => el.style.display = "inline-block");
            await page.waitForTimeout(300);
        }
        const isNowVisible = await showMoreBtn.isVisible();
        if (isNowVisible) {
            console.log(`➕ Clicking 'Show More +' in "${sectionName}"`);
            await showMoreBtn.scrollIntoViewIfNeeded();
            await showMoreBtn.click();
            await page.waitForTimeout(500);
        }
    }
}

async function applyFilter(page, filterText, section) {
    try {
        await expandFilterSection(page, section);
        const fieldset = await page.$(`fieldset:has(legend span:text("${section}"))`);
        const labels = await fieldset.$$('label');
        for (const label of labels) {
            const text = await label.innerText();
            const cleaned = text.trim().replace(/\s*only$/, "");
            if (cleaned.toLowerCase() === filterText.toLowerCase()) {
                await waitForSpinnerToDisappear(page);
                try { await label.scrollIntoViewIfNeeded({ timeout: 5000 }); }
                catch { console.warn(`⚠️ Could not scroll to "${filterText}", clicking anyway...`); }
                await label.click({ force: true });
                const applyButton = page.locator("#appx_btn_filter_apply");
                await applyButton.waitFor({ state: "visible", timeout: 10000 });
                await applyButton.scrollIntoViewIfNeeded();
                await applyButton.click();
                await waitForSpinnerToDisappear(page);
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
        const resetButton = page.locator('#appx_btn_filter_clear');
        if (await resetButton.isVisible()) {
            await resetButton.scrollIntoViewIfNeeded();
            await resetButton.click({ force: true });
            console.log("🔁 Clicked Reset.");
            await waitForSpinnerToDisappear(page);
        }
    } catch (e) {
        console.error("❌ Failed to reset filters:", e.message);
    }
}

async function waitForSpinnerToDisappear(page) {
    try {
        await Promise.all([
            page.waitForSelector('#appx-content-container-id.slds-spinner_container', { state: 'hidden', timeout: 15000 }),
            page.waitForSelector('.appx-loading', { state: 'hidden', timeout: 15000 })
        ]);
    } catch { }
}

module.exports = scrapeData;