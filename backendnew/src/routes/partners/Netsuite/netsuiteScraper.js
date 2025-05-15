const axios = require('axios');
const fs = require('fs/promises');
const path = require('path');

const NETSUITE_FILE = path.resolve(
  __dirname,
  '../../../../../frontend/public/data/netsuite-partners.json'
);

async function storeNetsuiteDataAsJson(scrapedMap) {
  try {
    await fs.mkdir(path.dirname(NETSUITE_FILE), { recursive: true });
    try {
      await fs.access(NETSUITE_FILE);
    } catch {
      await fs.writeFile(NETSUITE_FILE, '[]', 'utf8');
    }

    const arr = Array.from(scrapedMap.values());
    await fs.writeFile(NETSUITE_FILE, JSON.stringify(arr, null, 2), 'utf8');
    console.log(`✅  Stored ${arr.length} records → ${NETSUITE_FILE}`);
  } catch (err) {
    console.error('❌  Cannot write JSON:', err);
  }
}

async function scrapeNetsuiteData() {
  console.log('🚀 Starting NetSuite Partner scrape…');

  const scrapedMap = new Map();

  try {
    const response = await axios.get(
      'https://www.netsuite.com/portal/assets/js/partners/all.min.json',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'Accept': '*/*',
          'Referer': 'https://www.netsuite.com/portal/partners/find-a-partner.shtml',
          'Cookie': 'ak_bmsc=A15196B62A0BEBB59655E265A87340DF~000000000000000000000000000000~YAAQEAkgF/IHxcKWAQAAgMHfzRvoxo5ZQ2spGV5wCPy73Y8O9NeMlsw7MYQN9Q7Pm0gfMxRQjh0SwQkLnMeG3ii3uwsbNcDg5GUXyunMRdAcazf/Rmel3MCXR0QlKmMGvzhFBDLirUUxlQx7KrIdhkTi3lU0In904tLxxFEdHuzulRnrOw+g9DbETgUkro5gf8GWvaIH3Vy/fNQ/aYnjX4NgOf1WrJGWO0BeMFDkUVYb0SkT+ApWWgbelJA7FOJYsgiqERrucj/KmbvzY51dfbwGPpOkLzLaIDP2JjfdrYSFo5fopK7aWdvrq4BNVx6T+Gy2iYdxKnogq35zr1Nrnz25+0VN+h53El3RmQ==; bm_sv=ADAA98172649B99F8D88DB8C96EE8384~YAAQEAkgF+4LxcKWAQAASBThzRsB8ckh4yC7xJ/6lmvCkjxoyMXzlMJikk+IkA/O6+6CWRUnLXneMlAV8q2F+1vwgwa0G2z7H6SWnd70s3q3PR73EO3mVq9ruvrOPXLCEOn283lNJEvmV1VoJkS1rgrj7XuhGHk5g7tMfyIeTqboatXVVrCjxX4xhVWJZA4ia2bdAd5O1iaDRUvmikGaPuUjQ5hnwmDM3ZLskgwjT94t8lU39D0dt5Fg+/xsgOXmxyg=~1; akaas_aud-seg-ns-prod=2147483647~rv=11~id=10abdc9de81cc97e0362415ee1c6b009'
        }
      }
    );

    const partners = response.data;

    partners.forEach(p => {
      scrapedMap.set(p.id, {
        name: p.title || '-',
        link: p.url || '',
        region: Array.isArray(p.region) && p.region.length > 0 ? p.region[0] : '',
      });
    });

    console.log(`✅ Done. Total unique partners: ${scrapedMap.size}`);
    await storeNetsuiteDataAsJson(scrapedMap);
    return [...scrapedMap.values()];
  } catch (err) {
    console.error('❌ Error scraping NetSuite data:', err.message);
    return [];
  }
}

module.exports = scrapeNetsuiteData;
