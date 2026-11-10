const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 400 });
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2', timeout: 45000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 5000));

  const info = await page.evaluate(() => {
    const out = {};
    const jl = document.querySelector('.journeyLogo');
    out.journeyLogoExists = !!jl;
    if (jl) {
      out.journeyLogoHTML = jl.outerHTML.slice(0, 1200);
      const cs = getComputedStyle(jl);
      out.journeyLogoStyle = { display: cs.display, alignItems: cs.alignItems };
    }
    const logoImg = document.querySelector('#logoDiv img, .logoDiv img');
    if (logoImg) { out.logoImgSrc = logoImg.src; out.logoImgAlt = logoImg.alt; }
    out.fdicDivExists = !!document.querySelector('#fdicDiv');
    out.fdicLogoExists = !!document.querySelector('#fdicLogoA');
    // Also find the .content-wrap structure
    const cw = document.querySelector('.content-wrap');
    if (cw) {
      const kids = [...cw.children].map(c => ({ tag: c.tagName, id: c.id, cls: (c.className && c.className.toString().slice(0, 60)) || '' }));
      out.contentWrapChildren = kids;
    }
    return out;
  });
  console.log(JSON.stringify(info, null, 2));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
