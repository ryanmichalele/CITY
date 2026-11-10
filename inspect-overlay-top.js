const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1200 });
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2', timeout: 45000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 5000));

  const res = await page.evaluate(() => {
    const out = {};
    const pts = [[720, 300], [720, 500], [300, 300], [1200, 300], [720, 160]];
    out.points = pts.map(([x, y]) => {
      const el = document.elementFromPoint(x, y);
      const chain = [];
      let cur = el;
      let depth = 0;
      while (cur && depth < 12) {
        const cs = getComputedStyle(cur);
        chain.push({
          tag: cur.tagName,
          cls: (cur.className && cur.className.toString().slice(0, 60)) || '',
          id: cur.id || '',
          bg: cs.backgroundColor,
          bgImg: cs.backgroundImage.slice(0, 80),
          opacity: cs.opacity,
          filter: cs.filter,
          mixBlend: cs.mixBlendMode,
          position: cs.position,
          z: cs.zIndex
        });
        cur = cur.parentElement;
        depth++;
      }
      return { x, y, chain };
    });

    // All fixed / absolute large overlays
    const overlays = [];
    for (const el of document.querySelectorAll('body *')) {
      const cs = getComputedStyle(el);
      if (cs.position === 'fixed' || (cs.position === 'absolute' && parseInt(cs.zIndex || 0) > 100)) {
        const r = el.getBoundingClientRect();
        if (r.width > 300 && r.height > 300) {
          overlays.push({
            tag: el.tagName,
            cls: (el.className && el.className.toString().slice(0, 80)) || '',
            id: el.id || '',
            bg: cs.backgroundColor,
            opacity: cs.opacity,
            z: cs.zIndex,
            rect: { top: Math.round(r.top), left: Math.round(r.left), w: Math.round(r.width), h: Math.round(r.height) },
            display: cs.display,
            visibility: cs.visibility
          });
        }
      }
    }
    out.overlays = overlays;

    // check html/body classes and inline style
    out.htmlClass = document.documentElement.className;
    out.bodyClass = document.body.className;
    out.htmlStyle = document.documentElement.getAttribute('style');
    out.bodyStyle = document.body.getAttribute('style');

    // look for cdk overlay backdrop
    out.cdkBackdrops = document.querySelectorAll('.cdk-overlay-backdrop, .cdk-overlay-container').length;
    out.jamp = document.querySelectorAll('[class*="jamp"], .loading, .loader').length;
    return out;
  });

  console.log(JSON.stringify(res, null, 2));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
