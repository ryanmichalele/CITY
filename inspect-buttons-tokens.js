/*
 * Inspect the mirrored homepage's Register / Activate controls and the design
 * tokens (fonts, colours) needed to build the application form in the same theme.
 */
const puppeteer = require('puppeteer-core');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1100 });
  try { await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2', timeout: 60000 }); } catch (e) {}
  await new Promise(r => setTimeout(r, 8000));

  const info = await page.evaluate(() => {
    const out = { buttons: [], tokens: {} };
    const rx = /^(register|register now|activate|activate account|open account|get started|register for online access|activate a card)$/i;
    for (const el of document.querySelectorAll('a, button')) {
      const txt = (el.innerText || '').replace(/\s+/g, ' ').trim();
      if (!rx.test(txt)) continue;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      out.buttons.push({
        tag: el.tagName.toLowerCase(),
        text: txt,
        href: el.getAttribute('href'),
        id: el.id || '',
        cls: (el.className || '').toString().slice(0, 80),
        rect: { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) },
        color: cs.color, bg: cs.backgroundColor,
        visible: r.width > 0 && r.height > 0
      });
    }
    const bodyCs = getComputedStyle(document.body);
    out.tokens.bodyFont = bodyCs.fontFamily;
    out.tokens.bodyColor = bodyCs.color;
    out.tokens.bodyBg = bodyCs.backgroundColor;
    const h1 = document.querySelector('h1');
    if (h1) { const c = getComputedStyle(h1); out.tokens.h1Font = c.fontFamily; out.tokens.h1Color = c.color; out.tokens.h1Size = c.fontSize; out.tokens.h1Weight = c.fontWeight; }
    const primary = document.querySelector('.cds-button.primary-btn, .primary-btn');
    if (primary) { const c = getComputedStyle(primary); out.tokens.btnBg = c.backgroundColor; out.tokens.btnColor = c.color; out.tokens.btnRadius = c.borderRadius; out.tokens.btnFont = c.fontFamily; out.tokens.btnPad = c.padding; out.tokens.btnHeight = c.height; }
    const link = document.querySelector('a.cta-link');
    if (link) { const c = getComputedStyle(link); out.tokens.linkColor = c.color; out.tokens.linkFont = c.fontFamily; }
    out.tokens.headerBg = (() => { const b = document.querySelector('.banner'); return b ? getComputedStyle(b).backgroundColor : null; })();
    out.tokens.headerH = (() => { const b = document.querySelector('.banner'); return b ? Math.round(b.getBoundingClientRect().height) : null; })();
    return out;
  });

  console.log(JSON.stringify(info, null, 2));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
