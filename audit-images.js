/*
 * Audit local mirror images for genuine placement bugs:
 *  - distorted aspect ratio (rendered ratio != natural ratio)
 *  - overflowing its parent container
 *  - overlapping another image
 *  - sprite images (object-fit:none) whose crop lands outside the sprite
 */
const puppeteer = require('puppeteer-core');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const URL = process.argv[2] || 'http://localhost:3000/';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new',
    args: ['--no-sandbox', '--disable-gpu']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1200 });
  try { await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 }); } catch (e) {}
  await new Promise(r => setTimeout(r, 6000));
  await page.evaluate(async () => {
    const h = document.body.scrollHeight;
    for (let y = 0; y < h; y += 700) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 100)); }
    window.scrollTo(0, 0);
    await new Promise(r => setTimeout(r, 700));
  });
  await new Promise(r => setTimeout(r, 1200));

  const res = await page.evaluate(() => {
    const probs = [];
    const imgs = [...document.querySelectorAll('img')].filter(i => i.getBoundingClientRect().width > 2);
    const info = [];
    for (const img of imgs) {
      const r = img.getBoundingClientRect();
      const cs = getComputedStyle(img);
      const nw = img.naturalWidth, nh = img.naturalHeight;
      const rec = {
        file: (img.currentSrc || img.src).split('/').pop().split('?')[0],
        src: (img.currentSrc || img.src).slice(0, 200),
        natural: nw + 'x' + nh,
        rendered: Math.round(r.width) + 'x' + Math.round(r.height),
        top: Math.round(r.top + window.scrollY), left: Math.round(r.left),
        fit: cs.objectFit, pos: cs.objectPosition,
        parent: img.parentElement ? img.parentElement.tagName + '.' + (img.parentElement.className || '').toString().slice(0, 40) : ''
      };
      info.push(rec);

      // distortion (only meaningful for non-sprite images)
      if (cs.objectFit === 'fill' && nw && nh && r.width > 10 && r.height > 10) {
        const natR = nw / nh, renR = r.width / r.height;
        const dev = Math.abs(natR - renR) / natR;
        if (dev > 0.18) probs.push('DISTORTED ' + rec.file + ' natural ' + rec.natural + ' rendered ' + rec.rendered + ' (' + Math.round(dev * 100) + '%) @' + rec.left + ',' + rec.top);
      }

      // overflow parent (ignore absolute/fixed positioning and sprites)
      const p = img.parentElement;
      if (p && !['absolute', 'fixed'].includes(getComputedStyle(img).position)) {
        const pr = p.getBoundingClientRect();
        const over = Math.max(0, r.right - pr.right) + Math.max(0, pr.left - r.left) + Math.max(0, r.bottom - pr.bottom) + Math.max(0, pr.top - r.top);
        if (over > 40 && pr.width > 50) {
          probs.push('OVERFLOW ' + rec.file + ' rendered ' + rec.rendered + ' by ' + Math.round(over) + 'px out of parent ' + rec.parent + ' (' + Math.round(pr.width) + 'x' + Math.round(pr.height) + ')');
        }
      }

      // sprite crop sanity: object-position must be within natural size
      if (cs.objectFit === 'none') {
        const m = (cs.objectPosition || '').match(/(-?[\d.]+)px\s+(-?[\d.]+)px/);
        if (m) {
          const ox = Math.abs(parseFloat(m[1])), oy = Math.abs(parseFloat(m[2]));
          if (nw && (ox > nw || oy > nh)) {
            probs.push('SPRITE OUT OF RANGE ' + rec.file + ' pos ' + cs.objectPosition + ' natural ' + rec.natural);
          }
        }
      }
    }

    // image-image overlaps (big overlaps only)
    for (let i = 0; i < imgs.length; i++) {
      for (let j = i + 1; j < imgs.length; j++) {
        const a = imgs[i].getBoundingClientRect(), b = imgs[j].getBoundingClientRect();
        const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (ox > 20 && oy > 20) {
          const fa = (imgs[i].currentSrc || imgs[i].src).split('/').pop();
          const fb = (imgs[j].currentSrc || imgs[j].src).split('/').pop();
          if (fa !== fb) probs.push('OVERLAP ' + fa + ' <-> ' + fb + ' (' + Math.round(ox) + 'x' + Math.round(oy) + ')');
        }
      }
    }
    return { count: imgs.length, probs, info };
  });

  console.log('URL:', URL);
  console.log('images checked:', res.count);
  console.log('\n=== PROBLEMS (' + res.probs.length + ') ===');
  res.probs.forEach(p => console.log('  ' + p));
  console.log('\n=== ALL IMAGES ===');
  res.info.forEach(i => console.log('  ' + i.file + '  natural=' + i.natural + ' rendered=' + i.rendered + ' @' + i.left + ',' + i.top + ' fit=' + i.fit + ' pos=' + i.pos));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
