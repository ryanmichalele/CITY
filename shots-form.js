/*
 * Final visual snapshots: account-type step, pending decision, and the
 * homepage sign-on area (to confirm the original buttons look unchanged).
 */
const puppeteer = require('puppeteer-core');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1180 });
  await page.goto('http://localhost:3000/account-application/?mode=register', { waitUntil: 'networkidle2' }).catch(() => {});
  await sleep(1200);
  await page.screenshot({ path: 'form-step1.png', clip: { x: 0, y: 0, width: 1440, height: 1180 } });
  await page.close();

  const home = await browser.newPage();
  await home.setViewport({ width: 1440, height: 900 });
  await home.goto('http://localhost:3000/', { waitUntil: 'networkidle2' }).catch(() => {});
  await sleep(8000);
  const box = await home.evaluate(() => {
    const el = document.getElementById('register_acc');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: Math.max(0, r.left - 260), y: Math.max(0, r.top - 220), width: 720, height: 420 };
  });
  if (box) await home.screenshot({ path: 'homepage-register-area.png', clip: box });
  await home.close();

  await browser.close();
  console.log('saved form-step1.png, homepage-register-area.png');
})().catch(e => { console.error('FATAL', e); process.exit(1); });
