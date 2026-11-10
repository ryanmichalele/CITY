const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1200 });
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2', timeout: 45000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 4000));

  const info = await page.evaluate(() => {
    const out = {};
    // Find hero app element
    const heroApp = document.querySelector('app-hero-reskin');
    const hero = document.querySelector('.heroReskinSection');
    function describe(el, label) {
      if (!el) return null;
      const cs = getComputedStyle(el);
      const before = getComputedStyle(el, '::before');
      const after = getComputedStyle(el, '::after');
      const r = el.getBoundingClientRect();
      return {
        label,
        tag: el.tagName,
        cls: (el.className && el.className.toString().slice(0, 100)) || '',
        rect: { top: Math.round(r.top), h: Math.round(r.height), w: Math.round(r.width) },
        backgroundColor: cs.backgroundColor,
        backgroundImage: cs.backgroundImage.slice(0, 160),
        background: cs.background.slice(0, 200),
        opacity: cs.opacity,
        position: cs.position,
        zIndex: cs.zIndex,
        before: { content: before.content, bg: before.backgroundColor, bgImage: before.backgroundImage.slice(0, 160), opacity: before.opacity },
        after: { content: after.content, bg: after.backgroundColor, bgImage: after.backgroundImage.slice(0, 160), opacity: after.opacity }
      };
    }
    out.heroApp = describe(heroApp, 'app-hero-reskin');
    out.hero = describe(hero, 'heroReskinSection');

    // Walk descendants of heroApp / hero and report any with non-transparent bg or gradient
    const container = heroApp || hero;
    out.children = [];
    if (container) {
      const walk = (el, depth) => {
        if (depth > 6) return;
        for (const ch of el.children) {
          const cs = getComputedStyle(ch);
          const before = getComputedStyle(ch, '::before');
          const after = getComputedStyle(ch, '::after');
          const r = ch.getBoundingClientRect();
          const interesting =
            (cs.backgroundImage && cs.backgroundImage !== 'none') ||
            (cs.backgroundColor && cs.backgroundColor !== 'rgba(0, 0, 0, 0)') ||
            (before.backgroundImage && before.backgroundImage !== 'none') ||
            (after.backgroundImage && after.backgroundImage !== 'none') ||
            (before.backgroundColor && before.backgroundColor !== 'rgba(0, 0, 0, 0)') ||
            (after.backgroundColor && after.backgroundColor !== 'rgba(0, 0, 0, 0)');
          if (interesting && r.height > 20) {
            out.children.push({
              tag: ch.tagName,
              cls: (ch.className && ch.className.toString().slice(0, 80)) || '',
              top: Math.round(r.top),
              h: Math.round(r.height),
              w: Math.round(r.width),
              bgColor: cs.backgroundColor,
              bgImage: cs.backgroundImage.slice(0, 140),
              beforeBg: before.backgroundColor,
              beforeImg: before.backgroundImage.slice(0, 140),
              afterBg: after.backgroundColor,
              afterImg: after.backgroundImage.slice(0, 140)
            });
          }
          walk(ch, depth + 1);
        }
      };
      walk(container, 0);
    }
    // Also check the element that actually sits behind content: find sibling of hero content
    return out;
  });

  console.log(JSON.stringify(info, null, 2));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
