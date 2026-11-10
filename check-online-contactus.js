/*
 * Quick check: does the real online.citi.com contact-us page show the FDIC badge?
 */
const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  try { await page.goto('https://online.citi.com/US/ag/contactus', { waitUntil: 'networkidle2', timeout: 60000 }); } catch (e) { console.log('goto:', e.message); }
  await new Promise(r => setTimeout(r, 5000));
  const info = await page.evaluate(() => ({
    url: location.href,
    fdicDiv: !!document.querySelector('#fdicDiv'),
    fdicImgs: [...document.querySelectorAll('#fdicDiv img')].map(i => {
      const r = i.getBoundingClientRect();
      return { id: i.id, x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) };
    }),
    logo: !!document.querySelector('#logoDiv')
  }));
  console.log(JSON.stringify(info, null, 2));
  await page.screenshot({ path: 'real-online-contactus.png', clip: { x: 0, y: 0, width: 1440, height: 400 } });
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
