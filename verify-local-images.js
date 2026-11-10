/*
 * Load the local page, collect every image request + failure, download any
 * asset that is still missing, then reload and report the final state.
 */
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROOT = path.join(process.cwd(), 'public');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
const PAGE_URL = process.argv[2] || 'http://localhost:3000/';

function isImageBuffer(buf, rel) {
  if (!buf || buf.length < 64) return false;
  const head = buf.slice(0, 200).toString('utf8').trim().toLowerCase();
  if (head.startsWith('<!doctype html') || head.startsWith('<html')) return false;
  if (/\.svg$/i.test(rel)) return head.includes('<svg') || head.includes('<?xml');
  if (/\.png$/i.test(rel)) return buf[0] === 0x89 && buf[1] === 0x50;
  if (/\.jpe?g$/i.test(rel)) return buf[0] === 0xff && buf[1] === 0xd8;
  return true;
}

async function download(rel) {
  for (const h of ['https://aemapi.citi.com', 'https://www.citi.com']) {
    try {
      const res = await fetch(h + rel, { headers: { 'User-Agent': UA, 'Referer': 'https://www.citi.com/' } });
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      if (!isImageBuffer(buf, rel)) continue;
      const fp = path.join(ROOT, rel);
      fs.mkdirSync(path.dirname(fp), { recursive: true });
      fs.writeFileSync(fp, buf);
      return { ok: true, bytes: buf.length };
    } catch (e) {}
  }
  return { ok: false };
}

async function pass(browser, label) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1200 });
  const failed = new Set();
  const remote = new Set();
  const okLocal = new Set();

  page.on('response', resp => {
    const u = resp.url();
    if (!/\.(png|jpe?g|gif|svg|webp)(\?|$)/i.test(u)) return;
    if (resp.status() >= 400) failed.add(new URL(u).pathname);
    if (/^https?:\/\/(localhost|127\.0\.0\.1)/.test(u)) {
      if (resp.status() === 200) okLocal.add(new URL(u).pathname);
    } else if (/aemapi\.citi\.com|www\.citi\.com/.test(u)) {
      remote.add(u);
    }
  });

  try { await page.goto(PAGE_URL, { waitUntil: 'networkidle2', timeout: 60000 }); } catch (e) {}
  await new Promise(r => setTimeout(r, 5000));
  await page.evaluate(async () => {
    const h = document.body.scrollHeight;
    for (let y = 0; y < h; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); }
    window.scrollTo(0, 0);
    await new Promise(r => setTimeout(r, 800));
  });
  await new Promise(r => setTimeout(r, 2500));

  const imgs = await page.evaluate(() => [...document.querySelectorAll('img')].map(i => ({
    src: (i.currentSrc || i.src || '').slice(0, 200),
    ok: i.complete && i.naturalWidth > 0,
    nw: i.naturalWidth
  })));

  await page.close();
  console.log('\n----- ' + label + ' -----');
  console.log('img elements:', imgs.length, '| loaded:', imgs.filter(i => i.ok).length, '| local 200 responses:', okLocal.size);
  console.log('remote image requests:', remote.size);
  [...remote].slice(0, 20).forEach(u => console.log('   REMOTE ' + u));
  console.log('failed (4xx/5xx) image responses:', failed.size);
  [...failed].slice(0, 20).forEach(u => console.log('   FAILED ' + u));
  const broken = imgs.filter(i => !i.ok);
  if (broken.length) { console.log('broken <img>:'); broken.forEach(b => console.log('   ' + b.src)); }
  return { failed: [...failed], remote: [...remote], broken, imgs };
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });

  const p1 = await pass(browser, 'PASS 1 (before download)');
  const need = new Set([...p1.failed, ...p1.remote.map(u => new URL(u).pathname)]);
  if (need.size) {
    console.log('\nDownloading ' + need.size + ' missing image(s)...');
    for (const rel of need) {
      const r = await download(rel);
      console.log((r.ok ? 'OK   ' : 'FAIL ') + rel + (r.ok ? ' (' + r.bytes + ')' : ''));
    }
  }

  const p2 = await pass(browser, 'PASS 2 (after download)');

  // Final inventory
  const inv = await puppeteer.launch ? null : null;
  fs.writeFileSync(path.join(process.cwd(), 'image-verify.json'), JSON.stringify({ p1, p2 }, null, 2));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
