const { chromium } = require("playwright");
const db = require("../../../db");

const scrapeData = async () => {
    const url = "https://appexchange.salesforce.com/consulting";
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    console.log(`Navigating to: ${url}`);
    await page.goto(url, { waitUntil: "domcontentloaded" });

    await page.waitForSelector(".appx-tiles-grid-ul .appx-tile-title", { timeout: 60000 });

    const partners = await page.locator(".appx-tiles-grid-ul a").all();

    const partnerData = await Promise.all(
        partners.map(async (partner) => {
            try {
                const name = await partner.locator(".appx-tile-title span").innerText({ timeout: 5000 });
                const link = await partner.getAttribute("href");
                return { name, link };
            } catch (error) {
                console.error("Error extracting partner data:", error);
                return null;
            }
        })
    );

    // //CLEAR DATABASE BEFORE INSERTING NEW DATA
    // try {
    //     await db.execute("DELETE FROM salesforce");
    //     console.log("Database cleared. Storing fresh data...");
    // } catch (dbError) {
    //     console.error("Database Deletion Error:", dbError.message);
    // }

    let extractedDetails = [];

    for (const { name, link } of partnerData.filter(Boolean)) {
        try {
            await page.goto(link, { waitUntil: "domcontentloaded", timeout: 60000 });

            await page.waitForSelector(".appx-headline-details-tagline, .appx-extended-detail-description", { timeout: 15000 });

            const tagline = await page.locator(".appx-headline-details-tagline").innerText().catch(() => "No tagline available");
            const description = await page.locator(".appx-headline-details-descr").innerText().catch(() => "No description available");
            const expertise = await page.locator("#AppxConsultingListingDetail\\:AppxLayout\\:listingDetailOverviewTab\\:appxListingDetailOverviewTabComp\\:ftList\\:0\\:featureItem").innerText().catch(() => "No expertise available");
            const industries = await page.locator("#AppxConsultingListingDetail\\:AppxLayout\\:listingDetailOverviewTab\\:appxListingDetailOverviewTabComp\\:ftList\\:1\\:featureItem").innerText().catch(() => "No industries available");
            const services = await page.locator("#AppxConsultingListingDetail\\:AppxLayout\\:listingDetailOverviewTab\\:appxListingDetailOverviewTabComp\\:ftList\\:2\\:featureItem").innerText().catch(() => "No services available");
            const extendedDescription = await page.locator(".appx-extended-detail-description").innerText().catch(() => "No extended description available");

            const partnerDetails = { name, link, tagline, description, expertise, industries, services, extendedDescription };

            // Save to MySQL
            try {
                await db.execute(
                    "INSERT INTO salesforce (name, link, tagline, description, expertise, industries, services, extendedDescription) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    [name, link, tagline, description, expertise, industries, services, extendedDescription]
                );
                console.log("✅ Stored in DB:", name);
            } catch (dbError) {
                console.error("❌ Database Insert Error:", dbError.message);
            }

            extractedDetails.push(partnerDetails);
        } catch (error) {
            console.error(`Error extracting details for ${name}:`, error);
        }
    }

    await browser.close();
    return extractedDetails;
};

module.exports = scrapeData;
