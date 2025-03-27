const { chromium } = require("playwright");

(async () => {
  try {
    const browser = await chromium.launch({ headless: false }); // Set headless to true for faster execution
    const page = await browser.newPage();

    await page.goto("https://appexchange.salesforce.com/consulting", { waitUntil: "domcontentloaded" });

    await page.waitForSelector(".appx-tiles-grid-ul .appx-tile-title", { timeout: 60000 }); // Increased timeout

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

    console.log("Extracted Partner Data:", partnerData.filter(Boolean));

    let extractedDetails = [];

    for (const { name, link } of partnerData.filter(Boolean)) {
      try {
        console.log(`\nNavigating to: ${name} -> ${link}`);
        await page.goto(link, { waitUntil: "domcontentloaded", timeout: 60000 });

        // Wait for a known element to ensure the page is loaded
        await page.waitForSelector(".appx-headline-details-tagline, .appx-extended-detail-description", { timeout: 15000 });

        const tagline = await page.locator(".appx-headline-details-tagline").innerText().catch(() => "No tagline available");
        const description = await page.locator(".appx-headline-details-descr").innerText().catch(() => "No description available");
        const expertise = await page.locator("#AppxConsultingListingDetail\\:AppxLayout\\:listingDetailOverviewTab\\:appxListingDetailOverviewTabComp\\:ftList\\:0\\:featureItem").innerText().catch(() => "No expertise available");
        const industries = await page.locator("#AppxConsultingListingDetail\\:AppxLayout\\:listingDetailOverviewTab\\:appxListingDetailOverviewTabComp\\:ftList\\:1\\:featureItem").innerText().catch(() => "No industries available");
        const services = await page.locator("#AppxConsultingListingDetail\\:AppxLayout\\:listingDetailOverviewTab\\:appxListingDetailOverviewTabComp\\:ftList\\:2\\:featureItem").innerText().catch(() => "No services available");
        const extendedDescription = await page.locator(".appx-extended-detail-description").innerText().catch(() => "No extended description available");

        const partnerDetails = {
          name,
          link,
          tagline,
          description,
          expertise,
          industries,
          services,
          extendedDescription,
        };

        extractedDetails.push(partnerDetails);

        console.log("Extracted Details:", partnerDetails);
      } catch (error) {
        console.error(`Error extracting details for ${name}:`, error);
      }
    }

    console.log("\nFinal JSON Output:", JSON.stringify(extractedDetails, null, 2));

    await browser.close();
  } catch (error) {
    console.error("An error occurred:", error);
  }
})();
