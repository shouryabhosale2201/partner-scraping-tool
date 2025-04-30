const { chromium } = require("playwright");
const path = require('path');
const fs = require('fs').promises;

const DATA_DIR = path.join(__dirname, 'data');
const Salesforce_File = path.join(DATA_DIR, 'salesforce_partners.json');

async function storeSalesforceDataAsJson(filepath, extractedDetails) {
    try {
        // Step 1: Convert the scrapedMap to a plain array
        // const scrapedArray = Array.from(scrapedMap.values());
        // const scrapedArray = Array.from(scrapedMap.values());

        // Step 2: Stringify the array
        const jsonData = JSON.stringify(extractedDetails, null, 2); // Pretty print with 2 spaces

        // Step 3: Write to a file
        await fs.writeFile(filepath, jsonData, 'utf8');

        console.log('✅ Successfully stored scraped data to salesforce_partners.json');
    } catch (error) {
        console.error('❌ Error saving JSON file:', error);
    }
}

const scrapeData = async (fieldsToScrape , testingMode = true) => {

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const scrapedMap = new Map();

    if (!fieldsToScrape.includes('name')) fieldsToScrape.push('name');
    if (!fieldsToScrape.includes('link')) fieldsToScrape.push('link');
    if (!fieldsToScrape.includes('foundIn')) fieldsToScrape.push('foundIn');

    console.log(`🔍 Scraping fields: ${fieldsToScrape.join(', ')}`);

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

        const maxFilters = testingMode ? 2 : filters.length;
        for (const filter of filters.slice(0, maxFilters)) {

            console.log(`\n✅ Applying filter: ${filter} [${section}]`);
            try {
                await applyFilter(page, filter, section);
                console.log("🎯 Clicked 'Apply' button.");

                await scrollAndLoadAllListings(page);

                let partnerLinks = await page.$$eval(".appx-tiles-grid-ul a", anchors =>
                    anchors.map(anchor => ({
                        name: anchor.querySelector(".appx-tile-title span")?.innerText.trim() || "No Name",
                        link: anchor.href
                    }))
                );

                if (testingMode) {
                    const limit = 10;
                    console.log(`🧪 TESTING MODE: Limiting to first ${limit} partners.`);
                    partnerLinks = partnerLinks.slice(0, limit);
                }

                console.log(`🔗 Found ${partnerLinks.length} links.`);

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

                            console.log(`Opening: ${name} -> ${link}`);
                            const detailPage = await browser.newPage();
                            await detailPage.goto(link, { waitUntil: "domcontentloaded", timeout: 60000 });

                            if (fieldsToScrape.some(field =>
                                ['tagline', 'description', 'expertise', 'industries', 'services', 'extendedDescription'].includes(field))) {
                                await detailPage.waitForSelector(".appx-headline-details-tagline, .appx-extended-detail-description", { timeout: 15000 });
                            }

                            const details = {
                                name,
                                link,
                                foundIn: [{ section, filters: [filter] }]
                            };

                            if (fieldsToScrape.includes('tagline')) {
                                details.tagline = await detailPage.locator(".appx-headline-details-tagline").innerText().catch(() => "No tagline");
                            }

                            if (fieldsToScrape.includes('description')) {
                                details.description = await detailPage.locator(".appx-headline-details-descr").innerText().catch(() => "No description");
                            }

                            if (fieldsToScrape.includes('expertise')) {
                                details.expertise = await detailPage.locator("#AppxConsultingListingDetail\\:AppxLayout\\:listingDetailOverviewTab\\:appxListingDetailOverviewTabComp\\:ftList\\:0\\:featureItem").innerText().catch(() => "No expertise");
                            }

                            if (fieldsToScrape.includes('industries')) {
                                details.industries = await detailPage.locator("#AppxConsultingListingDetail\\:AppxLayout\\:listingDetailOverviewTab\\:appxListingDetailOverviewTabComp\\:ftList\\:1\\:featureItem").innerText().catch(() => "No industries");
                            }

                            if (fieldsToScrape.includes('services')) {
                                details.services = await detailPage.locator("#AppxConsultingListingDetail\\:AppxLayout\\:listingDetailOverviewTab\\:appxListingDetailOverviewTabComp\\:ftList\\:2\\:featureItem").innerText().catch(() => "No services");
                            }

                            if (fieldsToScrape.includes('extendedDescription')) {
                                details.extendedDescription = await detailPage.locator(".appx-extended-detail-description").innerText().catch(() => "No extended description");
                            }

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
    await browser.close();
    const extractedDetails = Array.from(scrapedMap.values());
    await storeSalesforceDataAsJson(Salesforce_File, extractedDetails);
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