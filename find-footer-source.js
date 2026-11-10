/*
 * Find which network response on the real citi.com homepage contains the footer
 * legal text ("NMLS 412915" / "Equal Housing Lender").
 */
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT = path.join(process.cwd(), 'captured-state');
fs.mkdirSync(OUT, { recursive: true });

const NEEDLES = ['NMLS 412915', 'Equal Housing Lender', 'The products, account packages', 'International Personal Bank'];

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1200 });

  const hits = [];
  page.on('response', async resp => {
    const url = resp.url();
    if (/\.(png|jpe?g|svg|webp|gif|woff2?|css)(\?|$)/i.test(url)) return;
    const ct = resp.headers()['content-type'] || '';
    if (!/json|javascript|text\/html/.test(ct)) return;
    let text;
    try { text = await resp.text(); } catch (e) { return; }
    if (!text || text.length > 8_000_000) return;
    const found = NEEDLES.filter(n => text.includes(n));
    if (found.length) {
      hits.push({ url, status: resp.status(), ct, len: text.length, found, text });
      console.log('HIT ' + resp.status() + ' ' + ct + ' ' + url + ' :: ' + found.join(' , '));
    }
  });

  try { await page.goto('https://www.citi.com/', { waitUntil: 'networkidle2', timeout: 60000 }); } catch (e) {}
  await new Promise(r => setTimeout(r, 10000));
  await page.evaluate(async () => {
    const h = document.body.scrollHeight;
    for (let y = 0; y < h; y += 700) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 150)); }
    window.scrollTo(0, 0);
  });
  await new Promise(r => setTimeout(r, 2500));

  console.log('\n=== footer raw DOM ===');
  const dom = await page.evaluate(() => {
    const el = [...document.querySelectorAll('footer, [class*="footer"], [class*="disclosure"]')].pop();
    return el ? el.innerText.replace(/\s+/g, ' ').slice(0, 1500) : '(none)';
  });
  console.log(dom);

  fs.writeFileSync(path.join(OUT, 'footer-source-hits.json'), JSON.stringify(hits.map(h => ({
    url: h.url, status: h.status, ct: h.ct, len: h.len, found: h.found,
    sample: h.text.slice(Math.max(0, h.text.indexOf(h.found[0] || 'NMLS') - 300), h.text.indexOf(h.found[0] || 'NMLS') + 700)
  })), null, 2));
  console.log('\nsaved captured-state/footer-source-hits.json (' + hits.length + ' hits)');
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
