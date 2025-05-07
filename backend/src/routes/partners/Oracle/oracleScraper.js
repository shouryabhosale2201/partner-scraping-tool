const fs = require('fs').promises;
const path = require('path');
const pLimit = require('p-limit').default;
const expertiseListApi = require('./expertiseListApi');
const locationListApi = require('./locationListApi');
const http = require('http');
const https = require('https');

// ----- Configuration -----
const ORACLE_API_URL = 'https://partner-finder.oracle.com/catalog/opf/partnerList';
const CONCURRENCY = process.env.ORACLE_SCRAPER_CONCURRENCY
  ? Number(process.env.ORACLE_SCRAPER_CONCURRENCY)
  : 5;  // Lower concurrency to limit burst rate
const RESULT_COUNT = process.env.ORACLE_SCRAPER_RESULT_COUNT
  ? Number(process.env.ORACLE_SCRAPER_RESULT_COUNT)
  : 200;
const WAIT_MS = process.env.ORACLE_SCRAPER_WAIT_MS
  ? Number(process.env.ORACLE_SCRAPER_WAIT_MS)
  : 500; // Default 500ms between Level-4 tasks
const limit = pLimit(CONCURRENCY);
// keep-alive agents for HTTP/HTTPS
const keepAliveHttpAgent = new http.Agent({ keepAlive: true });
const keepAliveHttpsAgent = new https.Agent({ keepAlive: true });
const agent = parsedURL =>
  parsedURL.protocol === 'http:' ? keepAliveHttpAgent : keepAliveHttpsAgent;
const headers = {
  'Content-Type': 'application/json',
  'Accept': 'application/json, text/javascript, */*; q=0.01',
  'X-Requested-With': 'XMLHttpRequest',
};
const ORACLE_FILE = path.resolve(
  __dirname,
  '../../../../../frontend/public/data/oracle-partners.json'
);
const payloadTemplate = {
  keyword: '',
  pageNumber: '1',
  resultCount: String(RESULT_COUNT),
  searchBy: 'company',
  filters: { xscCompanyLocation: ['4205~North America'] },
  searchExpertiseIds: {
    CSPE: '1032,1033,1031,1035,1034,1036,1452,1453,1454,1125,1455,1051,1052,1053,1054,1055,1056,1057,1058,1059,1075,1076,1081,1078,1069,1070,1071,1073,1072,1068,1084,1080,1082,1083,1061,1062,1064,1065,1063,1066,1067',
    CSSE: '1492,1672,1514,1512,1658,1660,1661,1652,1653,1654,1655,1513,1657,1656,1659',
    ISE:  '354,1225,247,251,1226,250,1351,246,1836,930,355,1349,356,1348,1350,1552,357,358,359,360,361,362,363,1532,1792,1772,1146,891,890,810,1285,1325,1265,1145,1634,990,671,1147,1205,1632,1326,832,1306,1692,1752,1912,373,374,379,376,1245,1037,382,378,380,381,384,385,386,1872,388,387,383,366,367,369,370,368,371,372'
  },
  xscProfileType: 'Partner Profile',
};
// simple sleep helper
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
async function storeOracleDataAsJson(scrapedMap) {
  try {
    await fs.mkdir(path.dirname(ORACLE_FILE), { recursive: true });
    try { await fs.access(ORACLE_FILE); }
    catch { await fs.writeFile(ORACLE_FILE, '[]', 'utf8'); }
    const arr = Array.from(scrapedMap.values());
    await fs.writeFile(ORACLE_FILE, JSON.stringify(arr, null, 2), 'utf8');
    console.log(`✅  Stored ${arr.length} records → ${ORACLE_FILE}`);
  } catch (err) {
    console.error('❌  Cannot write JSON:', err);
  }
}
async function scrapeData() {
  console.log('🔄  Starting Oracle scrape…');
  const [expertiseHierarchy, apacCountries] = await Promise.all([
    expertiseListApi(),
    locationListApi(),
  ]);
  console.log(`✅  Expertise L1 count: ${expertiseHierarchy.length}`);
  console.log(`✅  APAC country count : ${apacCountries.length}`);
  const scrapedMap = new Map();
  let serial = 1;
  // --- process per Level-2 group with delays ---
  for (const lvl1 of expertiseHierarchy) {
    console.log(`▶️  L1 ${lvl1.name}`);
    for (const lvl2 of lvl1.level_2_list || []) {
      console.log(`   ➡️  L2 ${lvl2.name}`);
      // gather Level-4 tasks under this Level-2
      const tasks = [];
      for (const lvl3 of lvl2.level_3_list || []) {
        for (const lvl4 of lvl3.level_4_list || []) {
          tasks.push({ lvl1, lvl2, lvl3, lvl4 });
        }
      }
      console.log(`      ⏳  Running ${tasks.length} tasks for ${lvl2.name}`);
      // process tasks sequentially in limited batches
      for (const task of tasks) {
        await limit(() => processLevel4(task, scrapedMap, () => serial++));
        console.log(`      ⏱  Sleeping ${WAIT_MS}ms before next task`);
        await sleep(WAIT_MS);
      }
    }
  }
  // --- APAC location scrape ---
  console.log('🌏  Location scrape…');
  for (const country of apacCountries) {
    await limit(async () => {
      console.log(`   🌐  ${country.name}`);
      let page = 1, pages = 1;
      const baseFilters = { xscCompanyLocation: [`${country.id}~${country.name}`] };
      while (page <= pages) {
        try {
          const res = await fetch(ORACLE_API_URL, {
            method: 'POST', headers,
            body: JSON.stringify({
              ...payloadTemplate,
              pageNumber: String(page),
              filters: baseFilters,
            }),
            agent,
          });
          if (!res.ok) { console.error(`🚨  ${country.name} p${page} ${res.status}`); break; }
          const data = await res.json();
          const partners = data.profiles || [];
          pages = Math.ceil((data.count || partners.length) / RESULT_COUNT);
          partners.forEach(p => {
            const link = `https://partner-finder.oracle.com/catalog/Partner/${p.id}`;
            if (!scrapedMap.has(link)) {
              scrapedMap.set(link, {
                serialNumber: serial++, id: p.id,
                name: p.name, link, locations: [country.name]
              });
            } else {
              const locs = scrapedMap.get(link).locations || [];
              if (!locs.includes(country.name)) locs.push(country.name);
            }
          });
          console.log(`      ✔️  ${country.name} p${page}/${pages}`);
          page++;
          console.log(`      ⏱  Sleeping ${WAIT_MS}ms before next page`);
          await sleep(WAIT_MS);
        } catch (e) {
          console.error(`🚨  ${country.name} p${page}`, e.message);
          break;
        }
      }
    });
  }
  // --- persist & finish ---
  console.log(`📝  Writing ${scrapedMap.size} partners…`);
  await storeOracleDataAsJson(scrapedMap);
  console.log('🎉  Done');
  return [...scrapedMap.values()];
}
/**
 * processLevel4
 * @param {object} task  contains lvl1, lvl2, lvl3, lvl4
 * @param {Map} scrapedMap to accumulate results
 * @param {Function} nextSerial generator callback
 */
async function processLevel4(task, scrapedMap, nextSerial) {
  const { lvl1, lvl2, lvl3, lvl4 } = task;
  const { name: level3Name, ucm_column } = lvl3;
  const { name: level4Name, id: level4Id } = lvl4;
  console.log(`🔍  ${lvl1.name} > ${lvl2.name} > ${level3Name} > ${level4Name}`);
  const baseFilters = { [ucm_column]: [level4Id], xscCompanyLocation: ['1000'] };
  const firstPayload = { ...payloadTemplate, filters: baseFilters, pageNumber: '1' };
  let firstJson;
  try {
    const res = await fetch(ORACLE_API_URL, {
      method: 'POST', headers,
      body: JSON.stringify(firstPayload),
      agent,
    });
    if (!res.ok) {
      console.error(`🚨  ${level4Name} first page ${res.status}`);
      return;
    }
    firstJson = await res.json();
  } catch (err) {
    console.error(`🚨  ${level4Name} first page`, err.message);
    return;
  }
  const total = firstJson.count || firstJson.profiles?.length || 0;
  const totalPages = Math.ceil(total / RESULT_COUNT);
  let allProfiles = firstJson.profiles || [];
  if (total > RESULT_COUNT) {
    const restPages = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
    const rest = await Promise.all(
      restPages.map(p => limit(() =>
        fetch(ORACLE_API_URL, {
          method: 'POST', headers,
          body: JSON.stringify({ ...firstPayload, pageNumber: String(p) }),
          agent,
        })
        .then(r => (r.ok ? r.json() : null))
        .catch(e => (console.error(`🚨  ${level4Name} page ${p}`, e.message), null))
      ))
    );
    rest.forEach(pg => { if (pg?.profiles) allProfiles.push(...pg.profiles); });
  }
  allProfiles.forEach(partner => {
    const link = `https://partner-finder.oracle.com/catalog/Partner/${partner.id}`;
    if (!scrapedMap.has(link)) {
      scrapedMap.set(link, {
        serialNumber: nextSerial(),
        id: partner.id,
        name: partner.name,
        link,
        filters: [],
      });
    }
    scrapedMap.get(link).filters.push({
      level1Name: lvl1.name,
      level2Name: lvl2.name,
      level3Name,
      ucm_column,
      level4Name,
      level4Id,
    });
  });
  console.log(`✔️  total now ${scrapedMap.size}`);
}
module.exports = scrapeData;