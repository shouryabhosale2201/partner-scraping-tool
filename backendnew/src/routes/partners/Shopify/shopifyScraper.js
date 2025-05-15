/**
 * Fast Shopify Partners scraper
 *  – auto-pagination
 *  – asset-blocking (no images/css/fonts)
 *  – exponential back-off on nav failures
 *
 * Run with:  MAX_WORKERS=40 LISTING_CONCURRENCY=20 node scrape.js
 */
const { chromium } = require('playwright');
const fs   = require('fs');
const path = require('path');
const pLimit = require('p-limit').default;

/* ── tunables via env ───────────────────────────────────────── */
const MAX_WORKERS         = Number(process.env.MAX_WORKERS)         || 80;
const LISTING_CONCURRENCY = Number(process.env.LISTING_CONCURRENCY) || 40;
const MAX_PAGES_HARDCAP   = Number(process.env.MAX_PAGES)           || Infinity;
const RETRIES             = 2;
const BACKOFF_MS          = 1_000;
const PAGE_TIMEOUT        = 60_000;
/* ───────────────────────────────────────────────────────────── */

const blockAssets = async page => {
  await page.route('**/*', r =>
    /^(document|xhr|fetch)$/.test(r.request().resourceType())
      ? r.continue()
      : r.abort()
  );
};

const createContextPool = async (browser, size) => {
  const contexts = await Promise.all(
    Array.from({ length: size }, () => browser.newContext())
  );
  const queue = [...contexts];
  const busy  = new Set();
  return {
    acquire: async () => {
      while (queue.length === 0) await new Promise(r => setTimeout(r, 10));
      const ctx = queue.pop(); busy.add(ctx); return ctx;
    },
    release: ctx => { busy.delete(ctx); queue.push(ctx); },
    destroy: () => Promise.all([...queue, ...busy].map(c => c.close()))
  };
};

const discoverTotalPages = async browser => {
  const ctx  = await browser.newContext();
  const page = await ctx.newPage();
  await blockAssets(page);
  await page.goto(
    'https://www.shopify.com/partners/directory/services?page=1',
    { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT }
  );
  const last = await page.$eval(
    'div[data-component-name="pagination"] a[data-component-name^="page-"]:last-of-type',
    a => Number((a.getAttribute('aria-label') || '').match(/\d+/)?.[0] || 1)
  ).catch(() => 1);
  await ctx.close();
  return last;
};

async function scrapeShopifyData() {
  const t0 = process.hrtime.bigint();
  const browser = await chromium.launch({ headless: true });
  const pool    = await createContextPool(browser, MAX_WORKERS);
  const listLim = pLimit(LISTING_CONCURRENCY);
  const profLim = pLimit(MAX_WORKERS);
  const extracted = [];

  const TOTAL_PAGES    = await discoverTotalPages(browser);
  const PAGES_TO_CRAWL = Math.min(TOTAL_PAGES, MAX_PAGES_HARDCAP);
  console.log(`🗺️  Directory reports ${TOTAL_PAGES} pages; crawling ${PAGES_TO_CRAWL}`);

  /* ── listing pages ── */
  const listT0 = process.hrtime.bigint();
  const getPartnerUrlsFromPage = async (pageNum, attempt = 0) => {
    const ctx  = await pool.acquire();
    const page = await ctx.newPage();
    await blockAssets(page);
    try {
      await page.goto(
        `https://www.shopify.com/partners/directory/services?page=${pageNum}`,
        { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT }
      );
      console.log(`🔍 Listing ${pageNum} ✓`);
      return await page.$$eval(
        'a[href^="/partners/directory/partner/"]',
        as => as.map(a => `https://www.shopify.com${a.getAttribute('href')}`)
      );
    } catch (err) {
      console.warn(`⚠️ Listing ${pageNum} failed (${attempt + 1}/${RETRIES}): ${err.message}`);
      if (attempt < RETRIES) {
        await new Promise(r => setTimeout(r, BACKOFF_MS * 2 ** attempt));
        return getPartnerUrlsFromPage(pageNum, attempt + 1);
      }
      return [];
    } finally {
      await page.close(); pool.release(ctx);
    }
  };

  const partnerUrls = (
    await Promise.all(
      Array.from({ length: PAGES_TO_CRAWL }, (_, i) =>
        listLim(() => getPartnerUrlsFromPage(i + 1))
      )
    )
  ).flat();
  const listElapsed = Number(process.hrtime.bigint() - listT0) / 1e9;
  console.log(`🕒 Listing phase   : ${listElapsed.toFixed(1)} s`);
  console.log(`🔗 Found ${new Set(partnerUrls).size} unique partner URLs.`);

  /* ── profile pages ── */
  const profT0 = process.hrtime.bigint();
  const extractPartnerData = async (link, attempt = 0) => {
    const ctx  = await pool.acquire();
    const page = await ctx.newPage();
    await blockAssets(page);
    try {
      console.log(`📄 Extracting: ${link}`);
      await page.goto(link, { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT });

      const name  = await page.locator('h1.richtext').textContent().catch(() => 'N/A') || 'N/A';
      const loc   = page.locator('p.richtext.text-t7:has-text("Primary location")');
      const primaryLocation = (await loc.locator('xpath=following-sibling::p[1]')
                                        .textContent().catch(() => 'N/A'))?.trim() || 'N/A';

      try { const btn = page.locator('button[data-component-name="expand-languages"]');
            if (await btn.isVisible()) await btn.click(); } catch {}
      let languages = ['N/A'];
      try {
        const txt = await page.locator('p.richtext.text-t7:has-text("Languages")')
                              .locator('xpath=following-sibling::p[1]').textContent();
        if (txt) languages = txt.split(',').map(s => s.trim());
      } catch {}
      const industries = (await page.locator('h2:has-text("Industries") + p.richtext')
                                   .textContent().catch(() => 'N/A'))?.trim() || 'N/A';

      return { name, link, locations: [primaryLocation], languages, industries };
    } catch (err) {
      console.warn(`❌ Extract failed ${link} (${attempt + 1}/${RETRIES}): ${err.message}`);
      if (attempt < RETRIES) {
        await new Promise(r => setTimeout(r, BACKOFF_MS * 2 ** attempt));
        return extractPartnerData(link, attempt + 1);
      }
      return null;
    } finally {
      await page.close(); pool.release(ctx);
    }
  };

  const results = await Promise.all(
    partnerUrls.map(url => profLim(() => extractPartnerData(url)))
  );
  extracted.push(...results.filter(Boolean));
  const profElapsed = Number(process.hrtime.bigint() - profT0) / 1e9;
  console.log(`🕒 Profile phase   : ${profElapsed.toFixed(1)} s`);

  /* ── wrap-up ── */
  await pool.destroy(); await browser.close();

  const dir = path.join(__dirname, 'data');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
  fs.writeFileSync(path.join(dir, 'shopify_partners.json'),
                   JSON.stringify(extracted, null, 2));
  console.log(`✅ Saved ${extracted.length} partners → data/shopify_partners.json`);

  const totalElapsed = Number(process.hrtime.bigint() - t0) / 1e9;
  console.log(`⏱  Finished in ${totalElapsed.toFixed(1)} seconds`);
  return extracted;
}

if (require.main === module) scrapeData();
module.exports = scrapeShopifyData;
