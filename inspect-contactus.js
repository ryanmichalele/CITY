/*
 * Inspect the contactus page header + verify its images load locally.
 */
const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PAGE = process.argv[2] || 'http://localhost:3000/US/ag/contactus';

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1200 });

  const failed = [], remote = [];
  page.on('response', r => {
    const u = r.url();
    if (!/\.(png|jpe?g|gif|svg|webp)(\?|$)/i.test(u)) return;
    if (r.status() >= 400) failed.push(r.status() + ' ' + u);
    if (!/^https?:\/\/(localhost|127\.0\.0\.1)/.test(u) && /citi\.com/.test(u)) remote.push(u);
  });

  try { await page.goto(PAGE, { waitUntil: 'networkidle2', timeout: 60000 }); } catch (e) {}
  await new Promise(r => setTimeout(r, 5000));
  await page.evaluate(async () => {
    const h = document.body.scrollHeight;
    for (let y = 0; y < h; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); }
    window.scrollTo(0, 0); await new Promise(r => setTimeout(r, 800));
  });
  await new Promise(r => setTimeout(r, 1500));

  const info = await page.evaluate(() => {
    const out = {};
    out.journeyLogo = !!document.querySelector('.journeyLogo');
    out.logoDiv = !!document.querySelector('#logoDiv');
    out.fdicDiv = !!document.querySelector('#fdicDiv');
    const header = document.querySelector('citi-header');
    out.headerHtml = header ? header.innerHTML.slice(0, 1200) : null;
    out.logoParents = [];
    const logo = document.querySelector('#logoDiv');
    let cur = logo;
    for (let i = 0; i < 5 && cur; i++) {
      out.logoParents.push({ tag: cur.tagName, cls: (cur.className || '').toString().slice(0, 80), id: cur.id || '' });
      cur = cur.parentElement;
    }
    out.imgs = [...document.querySelectorAll('img')].map(i => ({
      src: (i.currentSrc || i.src || '').slice(0, 140),
      ok: i.complete && i.naturalWidth > 0,
      w: Math.round(i.getBoundingClientRect().width),
      h: Math.round(i.getBoundingClientRect().height)
    }));
    return out;
  });

  console.log(JSON.stringify(info, null, 2));
  console.log('\nFAILED image responses:', failed.length); failed.slice(0, 20).forEach(f => console.log('  ' + f));
  console.log('REMOTE image requests:', remote.length); remote.slice(0, 20).forEach(r => console.log('  ' + r));
  await page.screenshot({ path: 'contactus-check.png', clip: { x: 0, y: 0, width: 1440, height: 260 } });
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
