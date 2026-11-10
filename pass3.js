/*
 * Mirror unicode-escaped nav page: /US/ag/contactus
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(process.cwd(), 'public');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

async function fetchBuffer(urlStr) {
  const res = await fetch(urlStr, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${urlStr}`);
  return Buffer.from(await res.arrayBuffer());
}

(async () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  // find all href/src values containing \u002F escapes
  const re = /(?:src|href)=["']([^"']*\\u002F[^"']*)["']/gi;
  let m; const found = [];
  while ((m = re.exec(html))) found.push(m[1]);
  const uniq = [...new Set(found)];
  console.log('escaped refs found:', uniq.length);
  uniq.forEach(r => console.log('  ', r));

  for (const r of uniq) {
    const decoded = r.replace(/\\u002F/g, '/');
    try {
      const u = new URL(decoded, 'https://www.citi.com');
      if (u.host !== 'www.citi.com' && u.host !== 'citi.com') continue;
      const pathname = u.pathname;
      const fp = path.join(ROOT, pathname, 'index.html');
      const buf = await fetchBuffer('https://www.citi.com' + pathname);
      fs.mkdirSync(path.dirname(fp), { recursive: true });
      fs.writeFileSync(fp, buf);
      console.log('PAGE OK', pathname, '(' + buf.length + ' bytes)');
      // assets on this page
      const h = buf.toString('utf8');
      const aRe = /<(?:script|img|iframe|source|video|audio|track|object|embed|input)\b[^>]*?(?:src|href|data|poster)=["']([^"']+)["']/gi;
      const linkRe = /<link\b[^>]*?href=["']([^"']+)["']/gi;
      const ssRe = /srcset=["']([^"']+)["']/gi;
      const assets = new Set();
      const add = (ref) => {
        if (!ref) return;
        try { const u2 = new URL(ref, 'https://www.citi.com' + pathname); if ((u2.host==='www.citi.com'||u2.host==='citi.com')&&!ref.startsWith('http')) assets.add(u2.pathname); } catch { }
      };
      let mm;
      for (const rx of [aRe, linkRe]) { rx.lastIndex = 0; while ((mm = rx.exec(h))) add(mm[1]); }
      ssRe.lastIndex = 0; while ((mm = ssRe.exec(h))) mm[1].split(',').forEach(p=>add(p.trim().split(/\s+/)[0]));
      for (const r2 of assets) {
        const afp = path.join(ROOT, r2);
        if (!fs.existsSync(afp)) {
          try { const ab = await fetchBuffer('https://www.citi.com'+r2); fs.mkdirSync(path.dirname(afp),{recursive:true}); fs.writeFileSync(afp, ab); }
          catch { /* ignore */ }
        }
      }
      console.log('   assets on page:', assets.size);
    } catch (e) {
      console.log('FAIL', decoded, '->', e.message);
    }
  }
})();
