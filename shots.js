/*
 * Screenshot the local pages (desktop + mobile header) after image localization.
 */
const puppeteer = require('puppeteer-core');
const path = require('path');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function shot(browser, url, file, width, height, fullPage) {
  const page = await browser.newPage();
  await page.setViewport({ width, height });
  try { await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 }); } catch (e) {}
  await new Promise(r => setTimeout(r, 5000));
  if (fullPage) {
    await page.evaluate(async () => {
      const h = document.body.scrollHeight;
      for (let y = 0; y < h; y += 700) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 110)); }
      window.scrollTo(0, 0);
      await new Promise(r => setTimeout(r, 900));
    });
    await new Promise(r => setTimeout(r, 1200));
  }
  await page.screenshot({ path: path.join(process.cwd(), file), fullPage: !!fullPage });
  console.log('saved', file);
  await page.close();
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
  await shot(browser, 'http://localhost:3000/', 'local-top2.png', 1440, 1200, false);
  await shot(browser, 'http://localhost:3000/', 'local-full2.png', 1440, 1200, true);
  await shot(browser, 'http://localhost:3000/US/ag/contactus', 'local-contactus.png', 1440, 1200, false);
  await shot(browser, 'http://localhost:3000/', 'local-mobile.png', 390, 900, false);
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
