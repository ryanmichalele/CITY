/*
 * Inspect the real site's FDIC badge at several viewport widths:
 * which element id is used, and the exact geometry.
 */
const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
  for (const width of [1920, 1440, 1280, 1024, 991, 768, 600, 425, 390]) {
    const page = await browser.newPage();
    await page.setViewport({ width, height: 800 });
    try { await page.goto('https://www.citi.com/', { waitUntil: 'networkidle2', timeout: 60000 }); } catch (e) {}
    await new Promise(r => setTimeout(r, 4500));
    const info = await page.evaluate(() => {
      const rect = el => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }; };
      const cs = el => { if (!el) return null; const c = getComputedStyle(el); return { mt: c.marginTop, ml: c.marginLeft, fit: c.objectFit, pos: c.objectPosition, w: c.width, h: c.height, display: c.display }; };
      const out = { vw: window.innerWidth };
      const fdicDiv = document.querySelector('#fdicDiv');
      const jl = document.querySelector('.journeyLogo');
      const logoDiv = document.querySelector('#logoDiv');
      out.journeyLogo = { rect: rect(jl), style: cs(jl) };
      out.logoDiv = { rect: rect(logoDiv) };
      out.fdicDiv = { rect: rect(fdicDiv), style: cs(fdicDiv) };
      const imgs = [...document.querySelectorAll('#fdicDiv img')];
      out.fdicImgs = imgs.map(i => ({ id: i.id, alt: i.alt, rect: rect(i), style: cs(i), src: i.src.split('/').pop() }));
      // any other fdic-named img in header
      out.otherFdic = [...document.querySelectorAll('citi-header img')].filter(i => /fdic/i.test(i.id + i.alt)).map(i => ({ id: i.id, rect: rect(i), style: cs(i) }));
      return out;
    });
    console.log('\n===== width ' + width + ' =====');
    console.log(JSON.stringify(info, null, 2));
    await page.close();
  }
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
