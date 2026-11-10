/*
 * Verify a mirrored page uses only local images: report remote/failed image
 * requests, download what's missing, then re-check.
 * Usage: node verify-page-images.js <url>
 */
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROOT = path.join(process.cwd(), 'public');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
const PAGE_URL = process.argv[2] || 'http://localhost:3000/';

const ASSET_RE = /\.(png|jpe?g|gif|svg|webp|ico)(\?|$)/i;

function isImageBuffer(buf, rel) {
  if (!buf || buf.length < 32) return false;
  const head = buf.slice(0, 200).toString('utf8').trim().toLowerCase();
  if (head.startsWith('<!doctype html') || head.startsWith('<html')) return false;
  if (/\.svg$/i.test(rel)) return head.includes('<svg') || head.includes('<?xml');
  if (/\.png$/i.test(rel)) return buf[0] === 0x89 && buf[1] === 0x50;
  if (/\.jpe?g$/i.test(rel)) return buf[0] === 0xff && buf[1] === 0xd8;
  return true;
}

async function download(rel) {
  const hosts = ['https://www.citi.com', 'https://online.citi.com', 'https://aemapi.citi.com'];
  for (const h of hosts) {
    try {
      const res = await fetch(h + rel, { headers: { 'User-Agent': UA, 'Referer': 'https://www.citi.com/' } });
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      if (!isImageBuffer(buf, rel)) continue;
      const fp = path.join(ROOT, rel);
      fs.mkdirSync(path.dirname(fp), { recursive: true });
      fs.writeFileSync(fp, buf);
      return { ok: true, bytes: buf.length, host: h };
    } catch (e) {}
  }
  return { ok: false };
}

async function pass(browser, label) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1200 });
  const failed = new Set(), remote = new Set(), local200 = new Set();

  page.on('response', resp => {
    const u = resp.url();
    if (!ASSET_RE.test(u)) return;
    let parsed;
    try { parsed = new URL(u); } catch (e) { return; }
    if (/citi\.com$/.test(parsed.host) || /\.citi\.com$/.test(parsed.host)) {
      if (/^(localhost|127\.0\.0\.1)$/.test(parsed.host)) {
        if (resp.status() === 200) local200.add(parsed.pathname);
      } else if (/\.citi\.com$/.test(parsed.host)) {
        remote.add(u);
      }
    }
    if (resp.status() >= 400) failed.add(parsed.pathname);
  });

  try { await page.goto(PAGE_URL, { waitUntil: 'networkidle2', timeout: 60000 }); } catch (e) {}
  await new Promise(r => setTimeout(r, 5000));
  await page.evaluate(async () => {
    const h = document.body.scrollHeight;
    for (let y = 0; y < h; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); }
    window.scrollTo(0, 0); await new Promise(r => setTimeout(r, 800));
  });
  await new Promise(r => setTimeout(r, 2000));

  const imgs = await page.evaluate(() => [...document.querySelectorAll('img')].map(i => ({
    src: (i.currentSrc || i.src || '').slice(0, 160),
    ok: i.complete && i.naturalWidth > 0
  })));

  await page.close();
  console.log('\n----- ' + label + ' -----');
  console.log('imgs:', imgs.length, '| loaded:', imgs.filter(i => i.ok).length, '| local 200:', local200.size);
  console.log('remote image requests:', remote.size);
  [...remote].forEach(u => console.log('   REMOTE ' + u));
  console.log('failed image responses:', failed.size);
  [...failed].forEach(u => console.log('   FAILED ' + u));
  const broken = imgs.filter(i => !i.ok);
  if (broken.length) { console.log('broken <img>:'); broken.forEach(b => console.log('   ' + b.src)); }
  return { remote: [...remote], failed: [...failed], broken };
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
  console.log('PAGE:', PAGE_URL);

  const p1 = await pass(browser, 'PASS 1');
  const need = new Set([...p1.failed, ...p1.remote.map(u => new URL(u).pathname)]);
  need.delete('/fp/clear.png');
  if (need.size) {
    console.log('\nDownloading ' + need.size + ' asset(s)...');
    for (const rel of need) {
      const r = await download(rel);
      console.log((r.ok ? 'OK   ' : 'FAIL ') + rel + (r.ok ? ' (' + r.bytes + ' from ' + r.host + ')' : ''));
    }
  }
  const p2 = await pass(browser, 'PASS 2');
  console.log('\nRESULT: remote=' + p2.remote.length + ' failed=' + p2.failed.length + ' broken=' + p2.broken.length);
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
