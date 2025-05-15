/*  scrapeSalesforce.js  */
const { chromium } = require("playwright");
const pLimit       = require("p-limit").default;
const path         = require("path");
const fs           = require("fs").promises;


/* ───────────────────────  concurrency knobs  ───────────────────── */
const FILTER_CONCURRENCY = 8;   // filter→listing rounds running in parallel
const DETAIL_CONCURRENCY = 40;  // partner detail pages per round

const limitFilter = pLimit(FILTER_CONCURRENCY);
/* we create one limitDetail **per filter round** so they don’t share the pool */
const newDetailLimiter = () => pLimit(DETAIL_CONCURRENCY);

const SALESFORCE_FILE = path.resolve(
  __dirname,
  '../../../../../frontend/public/data/salesforce-partners.json'
 );
 /**
  * Ensures the directory & file exist, then writes `extractedDetails` to SALESFORCE_FILE.
  */
 async function storeSalesforceDataAsJson(extractedDetails) {
  try {
   // 1. Ensure the target directory exists
   const resourceDir = path.dirname(SALESFORCE_FILE);
   await fs.mkdir(resourceDir, { recursive: true });
   // 2. If the file doesn’t exist yet, create it with an empty array
   try {
    await fs.access(SALESFORCE_FILE);
   } catch {
    await fs.writeFile(SALESFORCE_FILE, JSON.stringify([], null, 2), 'utf8');
    console.log(`:new: Created empty JSON file: ${SALESFORCE_FILE}`);
   }
   // 3. Pretty-print JSON and overwrite the file
   const jsonData = JSON.stringify(extractedDetails, null, 2);
   await fs.writeFile(SALESFORCE_FILE, jsonData, 'utf8');
   console.log(':white_check_mark: Successfully stored scraped data to salesforce.json');
  } catch (error) {
   console.error(':x: Error in storeSalesforceDataAsJson:', error);
  }
 }

/* ───────────────────────────  main entry  ───────────────────────── */
const scrapeSalesforceData = async (fieldsToScrape, testingMode = false) => {
  const t0 = Date.now();
  /* always include these three core fields */
  if (!fieldsToScrape.includes("name"))     fieldsToScrape.push("name");
  if (!fieldsToScrape.includes("link"))     fieldsToScrape.push("link");
  if (!fieldsToScrape.includes("foundIn"))  fieldsToScrape.push("foundIn");
  console.log(`🔍 Scraping fields: ${fieldsToScrape.join(", ")}`);

  /* one browser reused by every parallel task */
  const browser    = await chromium.launch({ headless: true });
  const rootPage   = await browser.newPage();
  const scrapedMap = new Map();

  /* ───── get list of filters per section using a single page ───── */
  await rootPage.goto("https://appexchange.salesforce.com/consulting", {
    waitUntil: "load",
    timeout : 60000,
  });

  const sections = ["Salesforce Expertise", "Industry Expertise"];
  for (const section of sections) {
    console.log(`\n🔍 Extracting filters from "${section}"…`);
    await expandFilterSection(rootPage, section);

    const filters = await rootPage.$$eval(
      "fieldset",
      (fieldsets, sectionName) => {
        const fs = fieldsets.find(f =>
          f.querySelector("legend span")?.innerText.trim() === sectionName
        );
        if (!fs) return [];
        return Array.from(fs.querySelectorAll(".slds-checkbox label"))
          .map(l => l.innerText.trim().replace(/\s*only$/, ""))
          .filter(Boolean);
      },
      section
    );

    console.log(`📌 Found ${filters.length} filters in "${section}"`);
    const maxFilters = testingMode ? 2 : filters.length;

    /* ── run several filter rounds in parallel (but capped) ── */
    await Promise.all(
      filters.slice(0, maxFilters).map(filter =>
        limitFilter(() =>
          scrapeFilterRound(
            browser,
            section,
            filter,
            fieldsToScrape,
            scrapedMap,
            testingMode
          )
        )
      )
    );
  }

  await browser.close();
  const extractedDetails = Array.from(scrapedMap.values());
  await storeSalesforceDataAsJson(extractedDetails);
  const elapsedMs = Date.now() - t0;
  const hh = String(Math.floor(elapsedMs / 3_600_000)).padStart(2, "0");
  const mm = String(Math.floor((elapsedMs % 3_600_000) / 60_000)).padStart(2, "0");
  const ss = String(Math.floor((elapsedMs % 60_000) / 1_000)).padStart(2, "0");
  console.log(`⏱️  Total execution time: ${hh}:${mm}:${ss}`);
  return extractedDetails;
};

/* ───────────────────────  ONE FILTER ROUND  ────────────────────── */
async function scrapeFilterRound(
  browser,
  section,
  filter,
  fieldsToScrape,
  scrapedMap,
  testingMode
) {
  console.log(`\n✅ Applying filter: ${filter} [${section}]`);
  const context = await browser.newContext();
  const page    = await context.newPage();

  /* cheap bandwidth saver – skip images / fonts / css */
  await page.route("**/*", route => {
    const t = route.request().resourceType();
    if (t === "image" || t === "font" || t === "stylesheet") return route.abort();
    route.continue();
  });

  await page.goto("https://appexchange.salesforce.com/consulting", {
    waitUntil: "load",
    timeout : 60000,
  });

  try {
    await applyFilter(page, filter, section);
    console.log("🎯 Clicked 'Apply' button.");
    await scrollAndLoadAllListings(page);

    let partnerLinks = await page.$$eval(".appx-tiles-grid-ul a", anchors =>
      anchors.map(a => ({
        name: a.querySelector(".appx-tile-title span")?.innerText.trim() || "No Name",
        link: a.href,
      }))
    );

    if (testingMode) {
      const limit = 10;
      console.log(`🧪 TESTING MODE: Limiting to first ${limit} partners.`);
      partnerLinks = partnerLinks.slice(0, limit);
    }
    console.log(`🔗 Found ${partnerLinks.length} links.`);

    const limitDetail = newDetailLimiter(); // fresh pool for this round

    /* ── detail pages in parallel, capped by limitDetail ── */
    await Promise.all(
      partnerLinks.map(({ name, link }) =>
        limitDetail(() =>
          extractPartnerDetail(
            browser,
            { name, link, section, filter, fieldsToScrape, scrapedMap }
          )
        )
      )
    );
  } catch (error) {
    console.error(`❌ Error with filter "${filter}":`, error.message);
  } finally {
    await context.close();
  }
}

/* ─────────────────  extract ONE partner detail page  ───────────── */
async function extractPartnerDetail(
  browser,
  { name, link, section, filter, fieldsToScrape, scrapedMap }
) {
  /* merge-and-dedupe logic – stays exactly the same */
  if (scrapedMap.has(link)) {
    const existing     = scrapedMap.get(link);
    const sectionEntry = existing.foundIn.find(e => e.section === section);
    if (sectionEntry) {
      if (!sectionEntry.filters.includes(filter)) sectionEntry.filters.push(filter);
    } else {
      existing.foundIn.push({ section, filters: [filter] });
    }
    return;
  }

  console.log(`Opening: ${name} -> ${link}`);
  const detailPage = await browser.newPage();
  try {
    await detailPage.goto(link, { waitUntil: "domcontentloaded", timeout: 60000 });

    if (
      fieldsToScrape.some(f =>
        [
          "tagline",
          "description",
          "expertise",
          "industries",
          "services",
          "extendedDescription",
          "countries",
        ].includes(f)
      )
    ) {
      await detailPage.waitForSelector(
        ".appx-headline-details-tagline, .appx-extended-detail-description",
        { timeout: 15000 }
      );
    }

    const details = {
      name,
      link,
      foundIn: [{ section, filters: [filter] }],
    };

    /* all optional field selectors – unchanged */
    if (fieldsToScrape.includes("tagline")) {
      details.tagline = await detailPage
        .locator(".appx-headline-details-tagline")
        .innerText()
        .catch(() => "No tagline");
    }
    if (fieldsToScrape.includes("description")) {
      details.description = await detailPage
        .locator(".appx-headline-details-descr")
        .innerText()
        .catch(() => "No description");
    }
    if (fieldsToScrape.includes("expertise")) {
      details.expertise = await detailPage
        .locator(
          "#AppxConsultingListingDetail\\:AppxLayout\\:listingDetailOverviewTab\\:appxListingDetailOverviewTabComp\\:ftList\\:0\\:featureItem"
        )
        .innerText()
        .catch(() => "No expertise");
    }
    if (fieldsToScrape.includes("industries")) {
      details.industries = await detailPage
        .locator(
          "#AppxConsultingListingDetail\\:AppxLayout\\:listingDetailOverviewTab\\:appxListingDetailOverviewTabComp\\:ftList\\:1\\:featureItem"
        )
        .innerText()
        .catch(() => "No industries");
    }
    if (fieldsToScrape.includes("services")) {
      details.services = await detailPage
        .locator(
          "#AppxConsultingListingDetail\\:AppxLayout\\:listingDetailOverviewTab\\:appxListingDetailOverviewTabComp\\:ftList\\:2\\:featureItem"
        )
        .innerText()
        .catch(() => "No services");
    }
    if (fieldsToScrape.includes("extendedDescription")) {
      details.extendedDescription = await detailPage
        .locator(".appx-extended-detail-description")
        .innerText()
        .catch(() => "No extended description");
    }
    if (fieldsToScrape.includes("countries")) {
      details.countries = await detailPage.evaluate(() => {
        const result = { UnitedStates: [], Canada: [], International: [] };
        document.querySelectorAll(".appx-detail-sub-subsection").forEach(sec => {
          const t = sec.querySelector(".appx-detail-subsection-values-title")?.innerText.trim();
          if (!t) return;
          let countries = [];
          const tip = sec.querySelector(".appx-tooltip-text");
          if (tip) {
            countries = tip.innerText.split(",").map(c => c.trim()).filter(Boolean);
          } else {
            const inline = sec.querySelector(".appx-detail-subsection-values-title")?.nextSibling;
            if (inline && inline.nodeType === Node.TEXT_NODE) countries = [inline.textContent.trim()];
          }
          if (t === "United States")      result.UnitedStates  = countries;
          else if (t === "Canada")        result.Canada        = countries;
          else if (t === "International") result.International = countries;
        });
        return result;
      });
    }

    scrapedMap.set(link, details);
  } catch (error) {
    console.error(`❌ Failed to extract ${name}:`, error.message);
  } finally {
    await detailPage.close();
  }
}

/* ─────────────────────  helper: scroll listings  ────────────────── */
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
  } catch {
    console.log("⚠️ No 'Show More' button or finished loading.");
  }
}

/* ─────────────────── helper: expand filter UI  ──────────────────── */
async function expandFilterSection(page, sectionName) {
  const fieldset = await page.$(`fieldset:has(legend span:text("${sectionName}"))`);
  if (!fieldset) throw new Error(`"${sectionName}" section not found`);
  const showMoreBtn = await fieldset.$(".appx-form-show-more");
  if (showMoreBtn) {
    const isVisible = await showMoreBtn.evaluate(el => window.getComputedStyle(el).display !== "none");
    if (!isVisible) {
      await showMoreBtn.evaluate(el => (el.style.display = "inline-block"));
      await page.waitForTimeout(300);
    }
    if (await showMoreBtn.isVisible()) {
      console.log(`➕ Clicking 'Show More +' in "${sectionName}"`);
      await showMoreBtn.scrollIntoViewIfNeeded();
      await showMoreBtn.click();
      await page.waitForTimeout(500);
    }
  }
}

/* ─────────────────── helper: apply one filter  ─────────────────── */
async function applyFilter(page, filterText, section) {
  try {
    await expandFilterSection(page, section);
    const fieldset = await page.$(`fieldset:has(legend span:text("${section}"))`);
    const labels   = await fieldset.$$("label");

    for (const label of labels) {
      const text     = await label.innerText();
      const cleaned  = text.trim().replace(/\s*only$/, "");
      if (cleaned.toLowerCase() === filterText.toLowerCase()) {
        await waitForSpinnerToDisappear(page);
        try { await label.scrollIntoViewIfNeeded({ timeout: 5000 }); }
        catch { console.warn(`⚠️ Could not scroll to "${filterText}", clicking anyway…`); }
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

/* ───────── helper: wait for AppExchange spinner to vanish ───────── */
async function waitForSpinnerToDisappear(page) {
  try {
    await Promise.all([
      page.waitForSelector("#appx-content-container-id.slds-spinner_container", {
        state  : "hidden",
        timeout: 15000,
      }),
      page.waitForSelector(".appx-loading", { state: "hidden", timeout: 15000 }),
    ]);
  } catch {
    /* ignore – sometimes spinner is already gone */
  }
}

/* ────────────────────────  module export  ───────────────────────── */
module.exports = scrapeSalesforceData;
