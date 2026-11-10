const puppeteer = require('puppeteer-core');
const path = require('path');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--window-size=1440,1200']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1200 });

  const consoleErrors = [];
  const failedRequests = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', err => consoleErrors.push('PAGEERROR: ' + err.message));
  page.on('requestfailed', req => {
    failedRequests.push(req.url() + ' :: ' + (req.failure() && req.failure().errorText));
  });

  const url = process.argv[2] || 'http://localhost:3000/';
  console.log('Opening', url);
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
  } catch (e) {
    console.log('goto warning:', e.message);
  }
  await new Promise(r => setTimeout(r, 4000)); // let Angular render

  const shot = path.join(process.cwd(), 'shot_local.png');
  await page.screenshot({ path: shot, fullPage: false });
  console.log('screenshot:', shot);

  // also full page
  await page.screenshot({ path: path.join(process.cwd(), 'shot_full.png'), fullPage: true });

  // Inspect the header area
  const info = await page.evaluate(() => {
    const out = {};
    const header = document.querySelector('citi-header') || document.querySelector('.header') || document.querySelector('header');
    out.headerExists = !!header;
    if (header) {
      const r = header.getBoundingClientRect();
      out.headerRect = { top: r.top, height: r.height, width: r.width };
      const cs = getComputedStyle(header);
      out.headerBg = cs.backgroundColor;
    }
    // body / html bg
    out.bodyBg = getComputedStyle(document.body).backgroundColor;
    out.htmlBg = getComputedStyle(document.documentElement).backgroundColor;
    // find largest black-ish elements
    const all = [...document.querySelectorAll('body *')];
    const blacks = [];
    for (const el of all) {
      const cs = getComputedStyle(el);
      const bg = cs.backgroundColor;
      const r = el.getBoundingClientRect();
      if (r.width > 200 && r.height > 40 && r.top < 1200) {
        if (bg === 'rgb(0, 0, 0)' || bg === 'rgba(0, 0, 0, 0.5)' || /^rgba?\(0, 0, 0/.test(bg)) {
          blacks.push({ tag: el.tagName, cls: (el.className && el.className.toString().slice(0, 80)) || '', bg, top: Math.round(r.top), h: Math.round(r.height), w: Math.round(r.width) });
        }
      }
    }
    out.blackElements = blacks.slice(0, 20);
    // hero section
    const hero = document.querySelector('.heroReskinSection');
    if (hero) {
      const cs = getComputedStyle(hero);
      out.hero = { bg: cs.backgroundColor, bgImage: cs.backgroundImage.slice(0, 120), height: Math.round(hero.getBoundingClientRect().height) };
    }
    // images broken?
    const imgs = [...document.querySelectorAll('img')].map(i => ({
      src: i.currentSrc || i.src,
      ok: i.complete && i.naturalWidth > 0,
      w: i.naturalWidth
    }));
    out.brokenImages = imgs.filter(i => !i.ok).slice(0, 30);
    out.totalImages = imgs.length;
    return out;
  });

  console.log('\n=== PAGE INFO ===');
  console.log(JSON.stringify(info, null, 2));

  console.log('\n=== CONSOLE ERRORS (' + consoleErrors.length + ') ===');
  consoleErrors.slice(0, 30).forEach(e => console.log('  ', e.slice(0, 300)));

  console.log('\n=== FAILED REQUESTS (' + failedRequests.length + ') ===');
  failedRequests.slice(0, 40).forEach(e => console.log('  ', e.slice(0, 300)));

  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
