// One-session capture: live banner API response + rendered DOM banner cards (consistent pair)
const puppeteer = require('C:/Users/SAM/node_modules/puppeteer');
const fs = require('fs');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const EXTRACT = () => {
  const out = [];
  const grab = (el) => {
    const img = el.querySelector('img');
    if (!img) return null;
    const anchor = el.closest('a') || img.closest('a');
    let card = el;
    for (let i = 0; i < 5 && card.parentElement; i++) card = card.parentElement;
    const headEl = card.querySelector('h1,h2,h3,h4');
    return {
      classes: el.className,
      src: img.getAttribute('src'),
      dataSrc: img.getAttribute('data-src'),
      dataSrcset: img.getAttribute('data-srcset'),
      srcset: img.getAttribute('srcset'),
      alt: (img.getAttribute('alt') || '').replace(/\s+/g, ' ').trim(),
      href: anchor ? anchor.getAttribute('href') : null,
      heading: headEl ? headEl.innerText.replace(/\s+/g, ' ').trim().slice(0, 110) : '',
      rect: (() => { const r = img.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top + window.scrollY) }; })(),
    };
  };
  document.querySelectorAll('.product-image, .img-responsive').forEach((el) => { const g = grab(el); if (g) out.push(g); });
  return out;
};

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  let apiJson = null;
  page.on('response', async (r) => {
    if (apiJson) return;
    if (!/marketing\/offers\/banner/.test(r.url())) return;
    try {
      const b = await r.text();
      if (b.includes('marketingBannerResponses')) { apiJson = b; }
    } catch (e) { /* */ }
  });

  await page.goto('https://www.citi.com/', { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 4000));
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await new Promise((r) => setTimeout(r, 5000));
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise((r) => setTimeout(r, 2500));

  const dom = await page.evaluate(EXTRACT);
  if (apiJson) fs.writeFileSync('live-banner-api-session.json', apiJson);
  fs.writeFileSync('live-dom-banners.json', JSON.stringify(dom, null, 2));

  console.log('API captured:', !!apiJson, apiJson ? apiJson.length : 0);
  console.log('\n===== DOM BANNER CARDS =====');
  dom.forEach((d, i) => {
    console.log(`[${i}] ${d.rect.w}x${d.rect.h} @y=${d.rect.top}`);
    console.log(`    classes : ${d.classes}`);
    console.log(`    src     : ${d.src}`);
    console.log(`    data-src: ${d.dataSrc}`);
    console.log(`    alt     : ${d.alt}`);
    console.log(`    heading : ${d.heading}`);
    console.log(`    href    : ${d.href}`);
  });

  await browser.close();
})();
