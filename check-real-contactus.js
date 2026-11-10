/*
 * Check the real contact-us page: does it show the FDIC badge, and which
 * images does it use in the header/sidebar?
 */
const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1200 });
  try { await page.goto('https://www.citi.com/US/ag/contactus', { waitUntil: 'networkidle2', timeout: 60000 }); } catch (e) { console.log('goto:', e.message); }
  await new Promise(r => setTimeout(r, 6000));

  const info = await page.evaluate(() => {
    const out = { url: location.href };
    const fdic = document.querySelector('#fdicDiv');
    out.fdicDiv = !!fdic;
    out.fdicImgs = [...document.querySelectorAll('#fdicDiv img')].map(i => ({ id: i.id, rect: (() => { const r = i.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }; })() }));
    out.logo = !!document.querySelector('#logoDiv');
    out.journeyLogo = !!document.querySelector('.journeyLogo');
    out.imgs = [...document.querySelectorAll('img')].slice(0, 40).map(i => ({ src: (i.currentSrc || i.src || '').slice(0, 130), alt: i.alt, w: Math.round(i.getBoundingClientRect().width) }));
    return out;
  });
  console.log(JSON.stringify(info, null, 2));
  await page.screenshot({ path: 'real-contactus.png', clip: { x: 0, y: 0, width: 1440, height: 500 } });
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
