// backend/src/routes/partners/Intuit/intuitScraper.js
require("dotenv").config();
const axios = require("axios");
const fs    = require("fs").promises;
const path  = require("path");

/* ───────── constants ───────── */
const LOCATOR_ID = process.env.INTUIT_LOCATOR_ID
                || "8a99824a81d29c090181d43d97f74601";

const API_ROOT  = "https://rest.ziftmarcom.com/locator/partners";
const PAGE_SIZE = 24;                                   // Intuit’s max page size

const OUT_FILE = path.resolve(
  __dirname,
  "../../../../../frontend/public/data/intuit-partners.json"
);

/* axios helper with mandatory tenant header */
const api = axios.create({
  baseURL: API_ROOT,
  headers: {
    "x-zift-partner-locator": LOCATOR_ID,
    origin : "https://intuit.ziftone.com",
    referer: "https://intuit.ziftone.com/"
  },
  timeout: 15_000
});

/* fetch one page (page is 0-based) */
async function fetchPage(page) {
  const { data } = await api.get("", {
    params: {
      size          : PAGE_SIZE,
      includeFields : true,
      includeTiers  : true,
      types         : "PARTNER",
      page
    }
  });
  return data.content || [];
}

/* ─────────── main scraper ─────────── */
async function scrapeIntuitData () {
  console.log("🚀  Intuit scrape started…");
  await fs.mkdir(path.dirname(OUT_FILE), { recursive: true });

  let page = 0;
  const all = [];

  while (true) {
    const batch = await fetchPage(page);
    if (batch.length === 0) break;       // no more data
    all.push(...batch);
    page += 1;
  }

  /* de-duplicate by original partner.id just in case */
  const unique = Array.from(
    all.reduce((m, p) => m.set(p.id, p), new Map()).values()
  ).map((p, idx) => ({ id: idx + 1, ...p }));   // add serial number

  await fs.writeFile(OUT_FILE, JSON.stringify(unique, null, 2), "utf8");
  console.log(
    `✅  Intuit: ${unique.length} partners saved to intuit-partners.json`
  );

  return unique;           // router sends this to the frontend
}

module.exports = scrapeIntuitData;