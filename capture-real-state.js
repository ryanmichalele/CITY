/*
 * Load the real homepage, wait for the client-side campaign content, and
 * capture every JSON/API response that contains the banner data.
 */
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT = path.join(process.cwd(), 'captured-state');
fs.mkdirSync(OUT, { recursive: true });

const hits = [];
const apiUrls = [];

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1200 });

  page.on('response', async resp => {
    const url = resp.url();
    const ct = resp.headers()['content-type'] || '';
    if (/json|javascript/.test(ct) || /graphql|api|content/i.test(url)) {
      if (!/\.(js|css|png|jpe?g|svg|woff2?)(\?|$)/i.test(url)) apiUrls.push(resp.status() + ' ' + ct + ' ' + url);
    }
    if (!/json/.test(ct)) return;
    try {
      const text = await resp.text();
      if (text.length > 3_000_000) return;
      if (/HP_20382|Earn 50,000|AAdvantage/i.test(text)) {
        hits.push({ url, status: resp.status(), ct, body: text });
      }
    } catch (e) {}
  });

  try { await page.goto('https://www.citi.com/', { waitUntil: 'networkidle2', timeout: 60000 }); } catch (e) { console.log('goto:', e.message); }
  await new Promise(r => setTimeout(r, 9000));

  const state = await page.evaluate(() => {
    const out = { scripts: [], heroText: '' };
    for (const s of document.querySelectorAll('script')) {
      if (s.type === 'application/json' || (s.id && /state|config/i.test(s.id))) {
        out.scripts.push({ id: s.id || '', type: s.type || '', len: s.textContent.length, keys: s.textContent.slice(0, 200) });
      }
    }
    const hero = document.querySelector('app-hero-reskin');
    out.heroText = hero ? hero.innerText.replace(/\s+/g, ' ').slice(0, 400) : '';
    out.bodyText = document.body.innerText.replace(/\s+/g, ' ').slice(0, 600);
    return out;
  });

  console.log('=== JSON responses with campaign data: ' + hits.length + ' ===');
  hits.forEach((h, i) => {
    const f = path.join(OUT, 'hit-' + i + '.json');
    fs.writeFileSync(f, h.body);
    console.log('  ' + i + '. ' + h.status + ' ' + h.body.length + ' bytes  ' + h.url + '  -> saved ' + path.basename(f));
  });

  console.log('\n=== API-ish requests ===');
  [...new Set(apiUrls)].slice(0, 60).forEach(u => console.log('  ' + u));

  console.log('\n=== inline state scripts ===');
  console.log(JSON.stringify(state.scripts, null, 2));
  console.log('\n=== hero text ===\n' + state.heroText);
  console.log('\n=== body text ===\n' + state.bodyText);

  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
