const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });

  const bad = [];
  page.on('response', async resp => {
    const url = resp.url();
    const ct = resp.headers()['content-type'] || '';
    if (/\.js(\?|$)/.test(url) && /text\/html/.test(ct)) {
      bad.push({ url, status: resp.status(), ct });
    }
  });

  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2', timeout: 45000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 5000));

  console.log('=== JS requests served as HTML (' + bad.length + ') ===');
  bad.forEach(b => console.log('  ', b.status, b.url));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
