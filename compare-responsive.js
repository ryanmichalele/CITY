/*
 * Responsive header/image comparison: real citi.com vs local mirror at several widths.
 * Reports any <img> whose rendered box or sprite crop (object-fit/position)
 * differs between real and local for the same file.
 */
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const WIDTHS = [1920, 1440, 1280, 1024, 768, 390];

function collector(maxY) {
  const out = [];
  for (const el of document.querySelectorAll('img')) {
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    const top = Math.round(r.top + window.scrollY);
    if (maxY && top > maxY) continue;
    const cs = getComputedStyle(el);
    const src = el.currentSrc || el.src || '';
    out.push({
      file: src.split('/').pop().split('?')[0],
      alt: el.alt || '',
      top, left: Math.round(r.left),
      w: Math.round(r.width), h: Math.round(r.height),
      fit: cs.objectFit, pos: cs.objectPosition
    });
  }
  return out;
}

async function snap(browser, url, width, maxY) {
  const page = await browser.newPage();
  await page.setViewport({ width, height: 1000 });
  try { await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 }); } catch (e) {}
  await new Promise(r => setTimeout(r, 5000));
  const imgs = await page.evaluate(collector, maxY);
  await page.close();
  return imgs;
}

function summarize(list) {
  const m = new Map();
  for (const i of list) {
    const k = i.file + '#' + i.alt;
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(i);
  }
  return m;
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new',
    args: ['--no-sandbox', '--disable-gpu']
  });
  const report = {};
  for (const w of WIDTHS) {
    console.log('\n################ WIDTH ' + w + ' ################');
    const maxY = w < 800 ? 1600 : 500; // header region
    const real = summarize(await snap(browser, 'https://www.citi.com/', w, maxY));
    const local = summarize(await snap(browser, 'http://localhost:3000/', w, maxY));
    const diffs = [];
    for (const [k, r] of real) {
      if (!local.has(k)) { diffs.push('LOCAL MISSING  ' + k + ' (real: ' + r.map(x => x.w + 'x' + x.h + '@' + x.left + ',' + x.top).join(',') + ')'); continue; }
      const l = local.get(k);
      if (r.length !== l.length) { diffs.push('COUNT DIFF ' + k + ' real=' + r.length + ' local=' + l.length); continue; }
      for (let i = 0; i < r.length; i++) {
        const a = r[i], b = l[i];
        const dr = Math.abs(a.top - b.top) + Math.abs(a.left - b.left) + Math.abs(a.w - b.w) + Math.abs(a.h - b.h);
        if (dr > 2 || a.fit !== b.fit || a.pos !== b.pos) {
          diffs.push('DIFF ' + k + '\n   real : ' + a.w + 'x' + a.h + '@' + a.left + ',' + a.top + ' ' + a.fit + ' ' + a.pos +
                     '\n   local: ' + b.w + 'x' + b.h + '@' + b.left + ',' + b.top + ' ' + b.fit + ' ' + b.pos);
        }
      }
    }
    for (const k of local.keys()) if (!real.has(k)) diffs.push('ONLY LOCAL ' + k);
    console.log(diffs.length ? diffs.join('\n') : '  (identical)');
    report[w] = diffs;
  }
  fs.writeFileSync(path.join(process.cwd(), 'responsive-diff.json'), JSON.stringify(report, null, 2));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
