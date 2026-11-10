/*
 * Inspect the 1x1 placeholder image in the local mirror + compare with the
 * corresponding element on the real site.
 */
const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function inspect(browser, url, label) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1200 });
  try { await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 }); } catch (e) {}
  await new Promise(r => setTimeout(r, 6000));
  await page.evaluate(async () => {
    const h = document.body.scrollHeight;
    for (let y = 0; y < h; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 150)); }
    window.scrollTo(0, 0);
    await new Promise(r => setTimeout(r, 800));
  });
  await new Promise(r => setTimeout(r, 1500));

  const out = await page.evaluate(() => {
    const res = { images: [] };
    // find big images (bottom modules)
    for (const img of document.querySelectorAll('img')) {
      const r = img.getBoundingClientRect();
      if (r.width < 200) continue;
      res.images.push({
        html: img.outerHTML.slice(0, 700),
        rendered: Math.round(r.width) + 'x' + Math.round(r.height),
        top: Math.round(r.top + window.scrollY),
        left: Math.round(r.left),
        natural: img.naturalWidth + 'x' + img.naturalHeight,
        currentSrc: (img.currentSrc || '').slice(0, 160),
        parentHtml: img.parentElement ? img.parentElement.outerHTML.slice(0, 500) : '',
        grandparentClasses: img.closest('*[class]') ? (img.parentElement.parentElement.className || '').toString() : ''
      });
    }
    // any background images in the lower page
    res.bg = [];
    for (const el of document.querySelectorAll('div,section,a,span')) {
      const cs = getComputedStyle(el);
      if (cs.backgroundImage && cs.backgroundImage !== 'none' && cs.backgroundImage.includes('url(')) {
        const r = el.getBoundingClientRect();
        if (r.width > 200 && r.height > 150) {
          res.bg.push({
            cls: (el.className || '').toString().slice(0, 70),
            bg: cs.backgroundImage.slice(0, 160),
            size: Math.round(r.width) + 'x' + Math.round(r.height),
            top: Math.round(r.top + window.scrollY), left: Math.round(r.left)
          });
        }
      }
    }
    return res;
  });

  console.log('\n================ ' + label + ' (' + url + ') ================');
  console.log(JSON.stringify(out, null, 2));
  await page.close();
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
  await inspect(browser, 'https://www.citi.com/', 'REAL');
  await inspect(browser, 'http://localhost:3000/', 'LOCAL');
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
