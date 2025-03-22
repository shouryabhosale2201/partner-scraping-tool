const { chromium } = require("playwright");

(async () => {
  try {
    // Launch the browser
    const browser = await chromium.launch({ headless: false }); // Set headless to true for performance

    // Create a new page
    const page = await browser.newPage();

    // Navigate to the target website
    await page.goto("https://appexchange.salesforce.com/consulting", { waitUntil: "domcontentloaded" });

    // Wait for the partner tiles to load
    await page.waitForSelector(".appx-tiles-grid-ul .appx-tile-title");

    // Select all partner elements
    const partnerElements = await page.locator(".appx-tiles-grid-ul").all();

    // Extract text from each partner element
    const partnerNames = await Promise.all(partnerElements.map(async (el) => await el.innerText()));

    console.log("Partner Names:", partnerNames);

    // Close the browser
    await browser.close();
  } catch (error) {
    console.error("An error occurred:", error);
  }
})();
