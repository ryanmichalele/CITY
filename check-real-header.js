const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 400 });
  console.log('Opening real citi.com...');
  await page.goto('https://www.citi.com/', { waitUntil: 'networkidle2', timeout: 60000 }).catch(e => console.log('goto:', e.message));
  await new Promise(r => setTimeout(r, 6000));

  // Screenshot just the header region
  await page.screenshot({ path: 'real_header.png', clip: { x: 0, y: 0, width: 1440, height: 260 } });

  const info = await page.evaluate(() => {
    const out = {};
    const header = document.querySelector('citi-header') || document.querySelector('header');
    if (header) {
      // find all img in header with src + alt
      out.imgs = [...header.querySelectorAll('img')].map(i => ({ src: i.currentSrc || i.src, alt: i.alt, w: i.naturalWidth, h: i.naturalHeight })).filter(x => x.src);
      // find elements with 'fdic' in id/class/alt
      out.fdic = [...header.querySelectorAll('[id*="fdic" i],[class*="fdic" i],img[alt*="fdic" i],[id*="FDIC"]')].map(e => ({ tag: e.tagName, id: e.id, cls: (e.className && e.className.toString().slice(0, 60)) || '', alt: e.alt || '', src: e.src || '' }));
      out.headerHtmlSnippet = header.innerHTML.slice(0, 500);
    }
    return out;
  });
  console.log(JSON.stringify(info, null, 2));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
