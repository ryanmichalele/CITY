/*
 * Log what the local mirror requests from the gcgapi endpoints (URL + method),
 * so we can serve those responses locally.
 */
const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1200 });

  page.on('request', req => {
    const u = req.url();
    if (/gcgapi/.test(u)) console.log('REQ ' + req.method() + ' ' + u);
  });
  page.on('response', resp => {
    const u = resp.url();
    if (/gcgapi/.test(u)) console.log('RES ' + resp.status() + ' ' + (resp.headers()['content-type'] || '') + ' ' + u);
  });
  page.on('requestfailed', req => {
    const u = req.url();
    if (/gcgapi/.test(u)) console.log('FAILED ' + req.method() + ' ' + u + ' :: ' + (req.failure() && req.failure().errorText));
  });

  try { await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2', timeout: 60000 }); } catch (e) {}
  await new Promise(r => setTimeout(r, 8000));

  const hero = await page.evaluate(() => {
    const h = document.querySelector('app-hero-reskin');
    return h ? h.innerText.replace(/\s+/g, ' ').slice(0, 200) : '(no hero)';
  });
  console.log('\nHERO TEXT:', hero);
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
