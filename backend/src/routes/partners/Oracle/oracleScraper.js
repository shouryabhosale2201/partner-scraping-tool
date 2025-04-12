const { chromium } = require("playwright");
const db = require("../../../db");

const scrapeData = async () => {

    const url = "https://partner-finder.oracle.com/catalog/?search=%5B%7B%221%22%3A%22filter-location%22%2C%222%22%3A%22%22%2C%223%22%3A%5B%22location4205%22%5D%2C%224%22%3A%22%22%7D%5D";
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    console.log(`Navigating to Oracle partners website`);
    await page.goto(url, { waitUntil: "domcontentloaded" });
    
    // Wait for the partner list to load
    await page.waitForSelector("ul.o-partners--list li.o-partner", { timeout: 60000 });
    
    // Get all partner list items
    const partnerItems = await page.locator("ul.o-partners--list li.o-partner div.o-partner--info").all();
    
    for (const partner of partnerItems) {
      try {
        // Only get the <a> inside the o-partner--info block
        const link = await partner.locator("a:has(h6)").getAttribute("href");
        // const name = await partner.locator("h6").first().innerText({ timeout: 5000 });

        console.log(link);
      } catch (error) {
        console.error("❌ Failed to extract main link:", error);
      }
    }

    // //CLEAR DATABASE BEFORE INSERTING NEW DATA
    // try {
    //     await db.execute("DELETE FROM oracle");
    //     console.log("Database cleared. Storing fresh data...");
    // } catch (dbError) {
    //     console.error("Database Deletion Error:", dbError.message);
    // }

    // let extractedDetails = [];

    // for (const { name, link } of partnerData.filter(Boolean)) {
    //     try {
    //         await page.goto(link, { waitUntil: "domcontentloaded", timeout: 60000 });

    //         await page.waitForSelector("", { timeout: 15000 });

    //         const partnerDetails = {};

    //         // Save to MySQL
    //         try {
    //             await db.execute(
    //                 "INSERT INTO oracle () VALUES ()",
    //                 []
    //             );
    //             console.log("✅ Stored in DB:", name);
    //         } catch (dbError) {
    //             console.error("❌ Database Insert Error:", dbError.message);
    //         }

    //         extractedDetails.push(partnerDetails);
    //     } catch (error) {
    //         console.error(`Error extracting details for ${name}:`, error);
    //     }
    // }

    // await browser.close();
    // return extractedDetails;
};

module.exports = scrapeData;
