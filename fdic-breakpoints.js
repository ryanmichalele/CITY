/*
 * Find the exact breakpoint where the real site switches FDIC badge variants.
 */
const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
  for (const width of [650, 649, 651, 655]) {
    const page = await browser.newPage();
    await page.setViewport({ width, height: 700 });
    try { await page.goto('https://www.citi.com/', { waitUntil: 'domcontentloaded', timeout: 60000 }); } catch (e) {}
    await new Promise(r => setTimeout(r, 4000));
    const info = await page.evaluate(() => {
      const img = document.querySelector('#fdicDiv img');
      if (!img) return null;
      const r = img.getBoundingClientRect();
      const c = getComputedStyle(img);
      return { id: img.id, w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.left), y: Math.round(r.top), mt: c.marginTop, ml: c.marginLeft, pos: c.objectPosition };
    });
    console.log(width, '->', JSON.stringify(info));
    await page.close();
  }
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
