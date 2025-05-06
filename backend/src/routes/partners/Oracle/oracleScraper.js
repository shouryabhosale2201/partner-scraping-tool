const fs = require('fs').promises;
const path = require('path');
const expertiseListApi = require("./expertiseListApi");
const locationListApi  = require("./locationListApi");

const DATA_DIR    = path.join(__dirname, 'data');
const Oracle_File = path.join(DATA_DIR, 'oracle_partners.json');

const apiUrl = "https://partner-finder.oracle.com/catalog/opf/partnerList";
const headers = {
  "Content-Type": "application/json",
  "Accept": "application/json, text/javascript, */*; q=0.01",
  "X-Requested-With": "XMLHttpRequest",
};

async function storeOracleDataAsJson(scrapedMap) {
    try {
      // 1. Ensure the target directory exists
      const resourceDir = path.dirname(ORACLE_FILE);
      await fs.mkdir(resourceDir, { recursive: true });
  
      // 2. If the file doesn’t exist yet, create it with an empty array
      try {
        await fs.access(ORACLE_FILE);
      } catch {
        await fs.writeFile(ORACLE_FILE, JSON.stringify([], null, 2), 'utf8');
        console.log(`🆕 Created empty JSON file: ${ORACLE_FILE}`);
      }
  
      // 3. Convert the Map values to an array
      const scrapedArray = Array.from(scrapedMap.values());
  
      // 4. Pretty-print JSON and overwrite the file
      await fs.writeFile(ORACLE_FILE, JSON.stringify(scrapedArray, null, 2), 'utf8');
      console.log('✅ Successfully stored scraped data to oracle.json');
  
    } catch (error) {
      console.error('❌ Error in storeOracleDataAsJson:', error);
    }
  }

const payloadTemplate = {
  keyword: "",
  pageNumber: "1",
  resultCount: "100",           // <<<<<< bumped from 15 to 100
  searchBy: "company",
  filters: { xscCompanyLocation: ["4205~North America"] },
  searchExpertiseIds: { /* ... unchanged ... */ },
  xscProfileType: "Partner Profile"
};

const scrapeData = async () => {
  console.log("🔄  Starting Oracle scrape…");

  const expertiseHierarchy = await expertiseListApi();
  const apacCountries      = await locationListApi();

  console.log(`✅  Loaded expertise tree (${expertiseHierarchy.length} level-1 entries)`);
  console.log(`✅  Loaded APAC country list   (${apacCountries.length} countries)`);

  const scrapedMap  = new Map();
  let   serialNumber = 1;

  /* ----------  Expertise filter loop  ---------- */
  for (const level1 of expertiseHierarchy) {
    console.log(`▶️  Level-1: ${level1.name}`);

    for (const level2 of (level1.level_2_list || [])) {
      console.log(`   ➡️  Level-2: ${level2.name}`);

      for (const level3 of (level2.level_3_list || [])) {
        const { name: level3Name, ucm_column } = level3;
        console.log(`      ➡️  Level-3: ${level3Name} (ucm_column ${ucm_column})`);

        for (const level4 of (level3.level_4_list || [])) {
          const { name: level4Name, id: level4Id } = level4;
          console.log(`         🔍  Level-4: ${level4Name} [${level4Id}]`);

          /* ----- 1️⃣  Fetch first page (counts) ----- */
          const firstPayload = {
            ...payloadTemplate,
            pageNumber: "1",
            filters: {
              [ucm_column]: [level4Id],
              xscCompanyLocation: ["1000"]
            }
          };

          try {
            const firstResp = await fetch(apiUrl, {
              method: "POST",
              headers,
              body: JSON.stringify(firstPayload)
            });

            if (!firstResp.ok) {
              console.error(`🚨  Failed first page for ${level4Name} – status ${firstResp.status}`);
              continue;
            }

            const firstData    = await firstResp.json();
            const totalResults = firstData.count || (firstData.profiles || []).length;
            const totalPages   = Math.ceil(totalResults / Number(payloadTemplate.resultCount));

            console.log(`            Pages: ${totalPages}  (results ${totalResults})`);

            /* ----- 2️⃣  Fetch remaining pages in parallel ----- */
            const pagePromises = [];

            for (let p = 1; p <= totalPages; p++) {
              const pagePayload = {
                ...payloadTemplate,
                pageNumber: String(p),
                filters: {
                  [ucm_column]: [level4Id],
                  xscCompanyLocation: ["1000"]
                }
              };

              pagePromises.push(
                fetch(apiUrl, {
                  method: "POST",
                  headers,
                  body: JSON.stringify(pagePayload)
                })
                .then(r => r.json().catch(() => null))
                .catch(err => {
                  console.error(`🚨  Page ${p}/${totalPages} failed (${level4Name}):`, err.message);
                  return null;
                })
              );
            }

            const pageResponses = await Promise.all(pagePromises);

            /* ----- 3️⃣  Merge into scrapedMap ----- */
            for (const pg of pageResponses) {
              const partners = pg?.profiles || [];
              partners.forEach(partner => {
                const link = `https://partner-finder.oracle.com/catalog/Partner/${partner.id}`;

                if (!scrapedMap.has(link)) {
                  scrapedMap.set(link, {
                    serialNumber,
                    id: partner.id,
                    name: partner.name,
                    link,
                    filters: [],
                  });
                  serialNumber++;
                }

                const entry = scrapedMap.get(link);
                entry.filters.push({
                  level1Name : level1.name,
                  level2Name : level2.name,
                  level3Name,
                  ucm_column,
                  level4Name,
                  level4Id,
                });
              });
            }

            console.log(` ✅  Added partners → total ${scrapedMap.size}`);

          } catch (err) {
            console.error(`🚨  Error scraping ${level4Name}:`, err.message);
          }
        }
      }
    }
  }

  /* ----------  Location loop (unchanged logic) ---------- */
  console.log("🌏  Starting location scrape…");

  for (const country of apacCountries) {
    console.log(`   🌐  ${country.name}`);

    let currentPage = 1;
    let totalPages  = 1;

    while (currentPage <= totalPages) {
      try {
        const payload = {
          ...payloadTemplate,
          pageNumber: String(currentPage),
          filters: { xscCompanyLocation: [`${country.id}~${country.name}`] }
        };

        const resp = await fetch(apiUrl, {
          method: "POST",
          headers,
          body: JSON.stringify(payload)
        });

        if (!resp.ok) {
          console.error(`🚨  ${country.name} page ${currentPage} failed – ${resp.status}`);
          break;
        }

        const data = await resp.json();
        const partners = data.profiles || [];
        totalPages = Math.ceil((data.count || partners.length) / Number(payloadTemplate.resultCount));

        partners.forEach(p => {
          const link = `https://partner-finder.oracle.com/catalog/Partner/${p.id}`;

          if (!scrapedMap.has(link)) {
            scrapedMap.set(link, {
              serialNumber,
              id   : p.id,
              name : p.name,
              link,
              filters  : [],
              locations: [country.name]
            });
            serialNumber++;
          } else {
            const entry = scrapedMap.get(link);
            entry.locations = entry.locations || [];
            if (!entry.locations.includes(country.name)) entry.locations.push(country.name);
          }
        });

        console.log(`      ✔️  Page ${currentPage}/${totalPages} (${partners.length} partners)`);

        currentPage++;
      } catch (err) {
        console.error(`🚨  ${country.name} page ${currentPage} error:`, err.message);
        break;
      }
    }
  }

  console.log(`📝  Writing ${scrapedMap.size} partners to JSON…`);
  await storeOracleDataAsJson(Oracle_File, scrapedMap);
  console.log("🎉  All done!");

  return Array.from(scrapedMap.values());
};

module.exports = scrapeData;
