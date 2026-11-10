/*
 * Dump the layout of the lower homepage region (between the GPA module and the
 * footer) so differences in block heights between the real site and the local
 * mirror can be identified.
 *
 * Usage: node inspect-bottom.js <url> <label>
 */
const puppeteer = require('puppeteer-core');
const fs = require('fs');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const URL = process.argv[2] || 'http://localhost:3000/';
const LABEL = process.argv[3] || 'local';

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1200 });
  try { await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 }); } catch (e) {}
  await new Promise(r => setTimeout(r, 8000));
  await page.evaluate(async () => {
    const h = document.body.scrollHeight;
    for (let y = 0; y < h; y += 700) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); }
    window.scrollTo(0, 0);
    await new Promise(r => setTimeout(r, 900));
  });
  await new Promise(r => setTimeout(r, 1200));

  const rows = await page.evaluate(() => {
    const out = [];
    const seen = new Set();
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      const top = Math.round(r.top + window.scrollY);
      if (top < 2300 || top > 3500 || r.height < 6) continue;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      // only leaf-ish text blocks or images
      const ownText = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join(' ').replace(/\s+/g, ' ').trim();
      const isImg = el.tagName === 'IMG';
      if (!ownText && !isImg) continue;
      const key = top + '|' + Math.round(r.height) + '|' + ownText.slice(0, 50) + '|' + (isImg ? el.src.split('/').pop() : '');
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        top,
        h: Math.round(r.height),
        left: Math.round(r.left),
        w: Math.round(r.width),
        tag: el.tagName.toLowerCase(),
        cls: (el.className || '').toString().slice(0, 50),
        text: isImg ? '[' + el.src.split('/').pop() + ']' : ownText.slice(0, 110)
      });
    }
    out.sort((a, b) => a.top - b.top || a.left - b.left);
    return out;
  });

  fs.writeFileSync(LABEL + '-bottom.json', JSON.stringify(rows, null, 2));
  console.log('===== ' + LABEL + ' (' + URL + ') rows=' + rows.length + ' =====');
  rows.forEach(r => console.log(String(r.top).padStart(5) + ' h=' + String(r.h).padStart(4) + ' ' + String(r.left).padStart(4) + ' ' + r.tag + '.' + r.cls + ' :: ' + r.text));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
