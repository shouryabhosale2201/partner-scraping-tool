const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const scrapeData = async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const totalPages = 221;
  const allLinks = [];
  // Step 1: Collect all partner profile links
  for (let i = 1; i <= totalPages; i++) {
    const page = await context.newPage();
    const url = `https://www.shopify.com/partners/directory/services?page=${i}`;
    console.log(`:globe_with_meridians: Visiting: ${url}`);
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForSelector('a[href^="/partners/directory/partner/"]', { timeout: 15000 });
      const hrefs = await page.$$eval('a[href^="/partners/directory/partner/"]', anchors =>
        anchors.map(a => a.getAttribute('href'))
      );
      hrefs.forEach(href => {
        if (href && href.startsWith('/partners/directory/partner/')) {
          allLinks.push(`https://www.shopify.com${href}`);
        }
      });
    } catch (err) {
      console.warn(`:warning: Skipping page ${i}:`, err.message);
    } finally {
      await page.close();
    }
    console.log(`:white_check_mark: Page ${i} done — total links so far: ${allLinks.length}`);
  }
  // Step 2: Extract data from each partner page with basic batching
  const extracted = [];
  const batchSize = 10;
  for (let i = 0; i < allLinks.length; i += batchSize) {
    const batch = allLinks.slice(i, i + batchSize);
    console.log(`:arrows_counterclockwise: Processing batch ${i + 1} to ${i + batch.length}`);
    const results = await Promise.all(batch.map(async (link) => {
      const page = await context.newPage();
      try {
        await page.goto(link, { waitUntil: 'domcontentloaded', timeout: 60000 });
        console.log(`:mag: Extracting: ${link}`);
        const name = await page.locator('h1.richtext').textContent().catch(() => 'N/A');
        // Primary Location
        let primaryLocation = 'N/A';
        try {
          const label = await page.locator('p.richtext.text-t7:has-text("Primary location")');
          const sibling = label.locator('xpath=following-sibling::p[1]');
          primaryLocation = (await sibling.textContent())?.trim() || 'N/A';
        } catch {}
        // Expand languages if "+X more"
        try {
          const expandBtn = page.locator('button[data-component-name="expand-languages"]');
          if (await expandBtn.isVisible()) await expandBtn.click();
        } catch {}
        // Languages
        let languages = ['N/A'];
        try {
          const langLabel = await page.locator('p.richtext.text-t7:has-text("Languages")');
          const langElem = langLabel.locator('xpath=following-sibling::p[1]');
          const langText = await langElem.textContent();
          if (langText) {
            languages = langText.split(',').map(l => l.trim());
          }
        } catch {}
        // Industries
        let industries = 'N/A';
        try {
          const industryText = await page.locator('h2:has-text("Industries") + p.richtext').textContent();
          industries = industryText?.trim() || 'N/A';
        } catch {}
        return {
          name: name?.trim() || 'N/A',
          link,
          locations: [primaryLocation],
          languages,
          industries,
        };
      } catch (err) {
        console.warn(`:x: Failed to extract ${link}:`, err.message);
        return null;
      } finally {
        await page.close();
      }
    }));
    extracted.push(...results.filter(Boolean));
  }
  await browser.close();
  // Step 3: Save as JSON
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
  const outputPath = path.join(dataDir, 'shopify_partners.json');
  fs.writeFileSync(outputPath, JSON.stringify(extracted, null, 2));
  console.log(`:white_check_mark: Scraped data saved to: ${outputPath}`);
  return extracted;
};
module.exports = scrapeData;