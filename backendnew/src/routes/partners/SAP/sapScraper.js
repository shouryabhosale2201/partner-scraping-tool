const fs = require('fs/promises');
const path = require('path');

const SAP_FILE = path.resolve(
    __dirname,
    '../../../../../frontend/public/data/sap-partners.json'
);

async function storeSAPDataAsJson(scrapedMap) {
    try {
        await fs.mkdir(path.dirname(SAP_FILE), { recursive: true });
        try { await fs.access(SAP_FILE); }
        catch { await fs.writeFile(SAP_FILE, '[]', 'utf8'); }

        const arr = Array.from(scrapedMap.values());
        await fs.writeFile(SAP_FILE, JSON.stringify(arr, null, 2), 'utf8');
        console.log(`✅  Stored ${arr.length} records → ${SAP_FILE}`);
    } catch (err) {
        console.error('❌  Cannot write JSON:', err);
    }
}

async function fetchFilterMetadata() {
    const url = 'https://partnerfinder.sap.com/sap/details/api/data/full';
    const res = await fetch(url);
    const data = await res.json();

    // Build solution → solutionL2 mapping
    const solutions = (data.solutions || []).map(sol => ({
        name: sol.name,
        solutionsL2: (sol.solutionsL2 || []).map(sub => ({
            name: sub.name,
        }))
    }));

    return {
        industries: Object.values(data.industries || {}),
        engagement: Object.values(data.engagement || {}),
        countries: Object.values(data.allowedCountries || {}),
        solutions
    };
}


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchPartnersForFilter(type, value, pageSize = 50) {
    const partners = [];
    const encodedFilter = encodeURIComponent(`${type}:${value}`);

    let page = 0;
    let totalPages = 2; // default; will update after first response

    while (page < totalPages) {
        const url = `https://partnerfinder.sap.com/sap/search/api/search/bm/results?q=&qField=partner&filter=${encodedFilter}&pageSize=${pageSize}&pageNumber=${page}&order=bestmatch`;

        const res = await fetch(url);
        if (!res.ok) {
            console.error(`❌ Failed to fetch page ${page} for ${type}:${value}`);
            break;
        }

        const json = await res.json();
        if (!json.results || json.results.length === 0) break;

        partners.push(...json.results);

        if (page === 0 && json.count) {
            totalPages = Math.ceil(json.count / pageSize);
        }

        page++;
        await sleep(500); // throttle to avoid API rate limits
    }

    return partners;
}

async function scrapeSAPData() {
    console.log('🚀 Starting SAP Partner scrape…');
    const filters = await fetchFilterMetadata();
    const scrapedMap = new Map();
  
    for (const [type, values] of Object.entries(filters)) {
      if (type === 'solutions') continue; // handled separately
  
      console.log(`📂 Processing ${type} (${values.length})`);
      const fieldName = type === 'countries' ? 'countries' : type;
  
      for (const value of values) {
        console.log(`   🔍 ${type}: ${value}`);
        const partners = await fetchPartnersForFilter(type, value);
        for (const p of partners) {
          const key = `${p.title}::${p.profileId}`;
          const link = `https://partnerfinder.sap.com/profile/${p.profileId}`;
  
          if (!scrapedMap.has(key)) {
            scrapedMap.set(key, {
              name: p.title,
              link,
              industries: [],
              engagement: [],
              countries: [],
              solutions: {}
            });
          }
  
          const entry = scrapedMap.get(key);
          if (!entry[fieldName].includes(value)) {
            entry[fieldName].push(value);
          }
        }
      }
    }
  
    // Process solutions and their L2s as filters
    const solutionFilters = filters.solutions || [];
    for (const solution of solutionFilters) {
      const parent = solution.name;
  
      for (const sub of solution.solutionsL2 || []) {
        const child = sub.name;
        const label = `${parent} > ${child}`;
        console.log(`   🔍 solutionL2: ${label}`);
  
        const partners = await fetchPartnersForFilter('products', child);
  
        for (const p of partners) {
          const key = `${p.title}::${p.profileId}`;
          const link = `https://partnerfinder.sap.com/profile/${p.profileId}`;
  
          if (!scrapedMap.has(key)) {
            scrapedMap.set(key, {
              name: p.title,
              link,
              industries: [],
              engagement: [],
              countries: [],
              solutions: {}
            });
          }
  
          const entry = scrapedMap.get(key);
  
          if (!entry.solutions[parent]) {
            entry.solutions[parent] = [child];
          } else if (!entry.solutions[parent].includes(child)) {
            entry.solutions[parent].push(child);
          }
        }
      }
    }
  
    console.log(`✅ Done. Total unique partners: ${scrapedMap.size}`);
    await storeSAPDataAsJson(scrapedMap);
    return [...scrapedMap.values()];
  }
  
module.exports = scrapeSAPData;
