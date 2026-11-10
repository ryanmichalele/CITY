/*
 * Compare image placement between the real citi.com and the local mirror.
 * Captures a screenshot of each + a JSON inventory of every visible <img>
 * (position, size, object-fit/position) plus sprite-based background images.
 */
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function collector() {
  const out = [];
  const els = document.querySelectorAll('img, picture, [style*="background-image"]');
  for (const el of els) {
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    const cs = getComputedStyle(el);
    const src = el.currentSrc || el.src || '';
    let bg = cs.backgroundImage || '';
    if (!src && (!bg || bg === 'none')) continue;
    out.push({
      tag: el.tagName,
      id: el.id || '',
      cls: (el.className && el.className.toString().slice(0, 60)) || '',
      alt: el.alt || '',
      file: (src || bg).split('/').pop().split('"')[0].split(')')[0].split('?')[0],
      src: src.slice(0, 140),
      top: Math.round(r.top + window.scrollY),
      left: Math.round(r.left),
      w: Math.round(r.width),
      h: Math.round(r.height),
      objectFit: cs.objectFit,
      objectPosition: cs.objectPosition,
      opacity: cs.opacity,
      display: cs.display
    });
  }
  return out;
}

async function grab(browser, url, label) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1200 });
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  } catch (e) {
    console.log(label + ': goto warning ' + e.message);
  }
  await new Promise(r => setTimeout(r, 6000));
  // scroll through page so lazy images load, then back to top
  await page.evaluate(async () => {
    const step = 700;
    const h = document.body.scrollHeight;
    for (let y = 0; y < h; y += step) {
      window.scrollTo(0, y);
      await new Promise(r => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
    await new Promise(r => setTimeout(r, 800));
  });
  await new Promise(r => setTimeout(r, 1500));

  const images = await page.evaluate(collector);
  fs.writeFileSync(path.join(process.cwd(), label + '-images.json'), JSON.stringify(images, null, 2));

  await page.screenshot({ path: path.join(process.cwd(), label + '-full.png'), fullPage: true });
  await page.screenshot({ path: path.join(process.cwd(), label + '-top.png'), clip: { x: 0, y: 0, width: 1440, height: 900 } });
  console.log(label + ': ' + images.length + ' visible images');
  await page.close();
  return images;
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu']
  });

  const real = await grab(browser, 'https://www.citi.com/', 'real');
  const local = await grab(browser, 'http://localhost:3000/', 'local');

  const key = i => i.file + '|' + i.alt;
  const realMap = new Map();
  for (const i of real) {
    const k = i.file;
    if (!realMap.has(k)) realMap.set(k, []);
    realMap.get(k).push(i);
  }
  const localMap = new Map();
  for (const i of local) {
    const k = i.file;
    if (!localMap.has(k)) localMap.set(k, []);
    localMap.get(k).push(i);
  }

  console.log('\n=== IN BOTH (compare placement) ===');
  for (const k of new Set([...realMap.keys()].filter(x => localMap.has(x)))) {
    const r = realMap.get(k), l = localMap.get(k);
    const fmt = a => a.map(x => `${x.w}x${x.h}@${x.left},${x.top}${x.objectFit !== 'fill' ? ' [' + x.objectFit + ' ' + x.objectPosition + ']' : ''}`).join(' ; ');
    console.log('  ' + k);
    console.log('     real : ' + fmt(r));
    console.log('     local: ' + fmt(l));
  }

  console.log('\n=== ONLY ON REAL ===');
  for (const k of [...realMap.keys()].filter(x => !localMap.has(x))) {
    const r = realMap.get(k);
    console.log('  ' + k + '  ->  ' + r.map(x => `${x.w}x${x.h}@${x.left},${x.top}`).join(' ; '));
  }

  console.log('\n=== ONLY ON LOCAL ===');
  for (const k of [...localMap.keys()].filter(x => !realMap.has(x))) {
    const l = localMap.get(k);
    console.log('  ' + k + '  ->  ' + l.map(x => `${x.w}x${x.h}@${x.left},${x.top}`).join(' ; '));
  }

  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
