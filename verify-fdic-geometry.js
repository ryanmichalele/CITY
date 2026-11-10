/*
 * Verify the injected FDIC badge geometry at several widths vs citi.com.
 */
const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
  for (const width of [1440, 1024, 768, 650, 390]) {
    const page = await browser.newPage();
    await page.setViewport({ width, height: 800 });
    try { await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2', timeout: 60000 }); } catch (e) {}
    await new Promise(r => setTimeout(r, 4500));
    const info = await page.evaluate(() => {
      const r = el => { if (!el) return null; const b = el.getBoundingClientRect(); return { x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height) }; };
      const img = document.querySelector('#fdicDiv img');
      const jl = document.querySelector('.journeyLogo');
      const c = img ? getComputedStyle(img) : null;
      return {
        journeyLogo: r(jl),
        badge: r(img),
        id: img ? img.id : null,
        mt: c ? c.marginTop : null,
        ml: c ? c.marginLeft : null,
        pos: c ? c.objectPosition : null,
        fit: c ? c.objectFit : null,
        src: img ? img.src.split('/').pop() : null,
        loaded: img ? (img.complete && img.naturalWidth > 0) : false
      };
    });
    console.log(width, '->', JSON.stringify(info));
    if (width === 390 || width === 768) {
      await page.screenshot({ path: 'local-header-' + width + '.png', clip: { x: 0, y: 0, width, height: 200 } });
    }
    await page.close();
  }
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
