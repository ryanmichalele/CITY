/*
 * Second pass: download JS-referenced assets + crawl escaped nav page links.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(process.cwd(), 'public');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

const extraAssets = [
  '/cbol-hp-static-assets/assets/js/fp-clientlib-v6_0.js',
  '/cbol-hp-static-assets/assets/qrcode/js/xmsdk-apr-v1.js',
  '/cbol-hp-static-assets/assets/qrcode/js/qrsignon-nov-v7.min.js',
  '/cbol-hp-static-assets/media/mobile_app_download-EAET7HKK.svg'
];

async function fetchBuffer(urlStr) {
  const res = await fetch(urlStr, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${urlStr}`);
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  // 1) extra assets
  for (const r of extraAssets) {
    const url = 'https://www.citi.com' + r;
    const fp = path.join(ROOT, r);
    try {
      const buf = await fetchBuffer(url);
      fs.mkdirSync(path.dirname(fp), { recursive: true });
      fs.writeFileSync(fp, buf);
      console.log('OK  ', r, '(' + buf.length + ' bytes)');
    } catch (e) {
      console.log('FAIL', r, '->', e.message);
    }
  }

  // 2) decode \u002F escapes in homepage and find nav page links
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const decoded = html.replace(/\\u002F/g, '/');
  const re = /<a\b[^>]*?href=["']([^"']+)["']/gi;
  let m; const pages = [];
  while ((m = re.exec(decoded))) {
    try {
      const u = new URL(m[1], 'https://www.citi.com');
      if ((u.host === 'www.citi.com' || u.host === 'citi.com') && !m[1].startsWith('http')) {
        const p = u.pathname;
        if (!p.split('/').pop().includes('.')) pages.push(p);
      }
    } catch { }
  }
  const uniq = [...new Set(pages)];
  console.log('\ndecoded same-origin page links:', uniq.length);
  uniq.forEach(p => console.log('  ' + p));

  // 3) fetch each page + its assets
  const visited = new Set(['/']);
  const aRe = /<(?:script|img|iframe|source|video|audio|track|object|embed|input)\b[^>]*?(?:src|href|data|poster)=["']([^"']+)["']/gi;
  const linkRe = /<link\b[^>]*?href=["']([^"']+)["']/gi;
  const ssRe = /srcset=["']([^"']+)["']/gi;
  const pageQueue = uniq.slice();
  let pagesDone = 0;
  while (pageQueue.length > 0) {
    const page = pageQueue.shift();
    const key = page.split('#')[0];
    if (visited.has(key)) continue;
    visited.add(key);
    const url = 'https://www.citi.com' + page;
    const fp = path.join(ROOT, page, 'index.html');
    try {
      const buf = await fetchBuffer(url);
      fs.mkdirSync(path.dirname(fp), { recursive: true });
      fs.writeFileSync(fp, buf);
      pagesDone++;
      console.log('PAGE OK', page, '(' + buf.length + ' bytes)');
      const h = buf.toString('utf8');
      // collect assets on this page
      const assets = [];
      const add = (ref) => {
        if (!ref) return;
        try {
          const u = new URL(ref, url);
          if ((u.host === 'www.citi.com' || u.host === 'citi.com') && !ref.startsWith('http')) assets.push(u.pathname);
        } catch { }
      };
      let mm;
      const res = [aRe, linkRe];
      for (const r of res) { r.lastIndex = 0; while ((mm = r.exec(h))) add(mm[1]); }
      ssRe.lastIndex = 0;
      while ((mm = ssRe.exec(h))) mm[1].split(',').forEach(part => add(part.trim().split(/\s+/)[0]));
      // dedupe download
      for (const r of [...new Set(assets)]) {
        const afp = path.join(ROOT, r);
        if (!fs.existsSync(afp)) {
          try {
            const abuf = await fetchBuffer('https://www.citi.com' + r);
            fs.mkdirSync(path.dirname(afp), { recursive: true });
            fs.writeFileSync(afp, abuf);
          } catch { /* ignore per-page asset failures */ }
        }
      }
      // find more page links in this page
      const a2 = /<a\b[^>]*?href=["']([^"']+)["']/gi;
      while ((m = a2.exec(h))) {
        try {
          const u = new URL(m[1], url);
          if ((u.host === 'www.citi.com' || u.host === 'citi.com') && !m[1].startsWith('http')) {
            const p = u.pathname;
            if (!p.split('/').pop().includes('.') && !visited.has(p) && !pageQueue.includes(p)) pageQueue.push(p);
          }
        } catch { }
      }
    } catch (e) {
      console.log('PAGE FAIL', page, '->', e.message);
    }
  }
  console.log('\npages mirrored this pass:', pagesDone);
}

main().catch(e => { console.error(e); process.exit(1); });
