const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 400 });
  await page.goto('https://www.citi.com/', { waitUntil: 'networkidle2', timeout: 60000 }).catch(e => console.log('goto:', e.message));
  await new Promise(r => setTimeout(r, 6000));

  const info = await page.evaluate(() => {
    const out = {};
    const logoDiv = document.querySelector('.logoDiv');
    const fdicDiv = document.querySelector('#fdicDiv');
    const fdicLogo = document.querySelector('#fdicLogoA');
    out.logoDivHTML = logoDiv ? logoDiv.outerHTML.slice(0, 1500) : null;
    out.fdicDivHTML = fdicDiv ? fdicDiv.outerHTML.slice(0, 1500) : null;
    if (fdicLogo) {
      const cs = getComputedStyle(fdicLogo);
      const r = fdicLogo.getBoundingClientRect();
      out.fdicLogoStyle = {
        objectFit: cs.objectFit, objectPosition: cs.objectPosition,
        width: cs.width, height: cs.height, marginTop: cs.marginTop, marginLeft: cs.marginLeft,
        src: fdicLogo.src, alt: fdicLogo.alt, rect: { top: Math.round(r.top), left: Math.round(r.left), w: Math.round(r.width), h: Math.round(r.height) }
      };
    }
    // parent structure around logoDiv
    const parent = logoDiv ? logoDiv.parentElement : null;
    if (parent) {
      out.parentHTML = parent.outerHTML.slice(0, 2000);
      const cs = getComputedStyle(parent);
      out.parentStyle = { display: cs.display, gridTemplateColumns: cs.gridTemplateColumns, gap: cs.gap, alignItems: cs.alignItems };
    }
    return out;
  });
  console.log(JSON.stringify(info, null, 2));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
