/*
 * Verify the local mirror against a captured real-site render.
 * Compares every content image (file + position + size + sprite crop) and
 * reports missing / extra / misplaced images.
 *
 * Usage: node verify-align.js [realImagesJson]
 *   default realImagesJson = captured-state/align-run-0-images.json
 */
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const REF = process.argv[2] || path.join('captured-state', 'align-run-0-images.json');

function collector() {
  const out = [];
  for (const img of document.querySelectorAll('img')) {
    const r = img.getBoundingClientRect();
    if (r.width < 40 || r.height < 20) continue;
    const cs = getComputedStyle(img);
    out.push({
      file: (img.currentSrc || img.src || '').split('/').pop().split('?')[0],
      alt: (img.alt || '').replace(/\s+/g, ' ').trim(),
      left: Math.round(r.left),
      top: Math.round(r.top + window.scrollY),
      w: Math.round(r.width),
      h: Math.round(r.height),
      fit: cs.objectFit,
      pos: cs.objectPosition
    });
  }
  out.sort((a, b) => a.top - b.top || a.left - b.left);
  return out;
}

(async () => {
  const real = JSON.parse(fs.readFileSync(REF, 'utf8'));

  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1200 });
  try { await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2', timeout: 60000 }); } catch (e) {}
  await new Promise(r => setTimeout(r, 8000));
  await page.evaluate(async () => {
    const h = document.body.scrollHeight;
    for (let y = 0; y < h; y += 700) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 130)); }
    window.scrollTo(0, 0);
    await new Promise(r => setTimeout(r, 900));
  });
  await new Promise(r => setTimeout(r, 1500));

  const local = await page.evaluate(collector);
  await page.screenshot({ path: 'local-aligned-full.png', fullPage: true });
  await page.screenshot({ path: 'local-aligned-top.png', clip: { x: 0, y: 0, width: 1440, height: 900 } });
  await browser.close();

  console.log('REF  : ' + REF + ' (' + real.length + ' images)');
  console.log('LOCAL: ' + local.length + ' images\n');

  const key = i => i.file + '@' + i.left + ',' + i.top;
  const realKeys = new Map(real.map(i => [key(i), i]));
  const localKeys = new Map(local.map(i => [key(i), i]));

  let problems = 0;
  console.log('=== SLOT CHECK (same file at same position) ===');
  for (const [k, r] of realKeys) {
    const l = localKeys.get(k);
    if (!l) {
      // is the file present somewhere else?
      const elsewhere = local.filter(x => x.file === r.file);
      if (elsewhere.length) {
        problems++;
        console.log('  MISPLACED ' + r.file);
        console.log('     real : ' + r.w + 'x' + r.h + '@' + r.left + ',' + r.top);
        elsewhere.forEach(e => console.log('     local: ' + e.w + 'x' + e.h + '@' + e.left + ',' + e.top));
      } else {
        problems++;
        console.log('  MISSING   ' + r.file + ' (' + r.w + 'x' + r.h + '@' + r.left + ',' + r.top + ')');
      }
      continue;
    }
    const dr = Math.abs(r.left - l.left) + Math.abs(r.top - l.top) + Math.abs(r.w - l.w) + Math.abs(r.h - l.h);
    if (dr > 2 || r.fit !== l.fit || r.pos !== l.pos) {
      problems++;
      console.log('  GEOMETRY  ' + r.file);
      console.log('     real : ' + r.w + 'x' + r.h + '@' + r.left + ',' + r.top + ' ' + r.fit + ' ' + r.pos);
      console.log('     local: ' + l.w + 'x' + l.h + '@' + l.left + ',' + l.top + ' ' + l.fit + ' ' + l.pos);
    }
  }
  for (const [k, l] of localKeys) {
    if (!realKeys.has(k)) {
      problems++;
      console.log('  EXTRA     ' + l.file + ' (' + l.w + 'x' + l.h + '@' + l.left + ',' + l.top + ')');
    }
  }
  if (!problems) console.log('  all content images match exactly');

  console.log('\n=== LOCAL IMAGE LIST ===');
  local.forEach(i => console.log('  ' + i.left + ',' + i.top + ' ' + i.w + 'x' + i.h + '  ' + i.file));
  console.log('\nRESULT: ' + (problems ? problems + ' difference(s)' : 'EXACT MATCH'));
})().catch(e => { console.error('FATAL', e); process.exit(1); });
