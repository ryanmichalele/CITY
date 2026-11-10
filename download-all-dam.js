/*
 * Analyze the real citi.com header and download ALL missing /content/dam/ assets.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(process.cwd(), 'public');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
const CONCURRENCY = 6;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ---- collect all same-origin absolute asset paths from JS/CSS/HTML ----
function collectPaths() {
  const set = new Set();
  const dirs = [path.join(ROOT, 'cbol-hp-static-assets')];
  const files = [];
  function walk(d) {
    if (!fs.existsSync(d)) return;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(js|css)$/i.test(e.name)) files.push(p);
    }
  }
  dirs.forEach(walk);
  // HTML
  const htmlFp = path.join(ROOT, 'index.html');
  if (fs.existsSync(htmlFp)) files.push(htmlFp);

  for (const f of files) {
    const t = fs.readFileSync(f, 'utf8');
    // absolute paths that look like assets (content/dam, commonui-assets, etc.)
    const re = /["'(\s](\/(?:content\/dam|commonui-assets|content|static)\/[^"')\s]+?\.(?:png|jpe?g|gif|svg|webp|ico|woff2?|ttf|otf|eot|pdf|mp4|json))["')\s]/gi;
    let m;
    while ((m = re.exec(t))) set.add(m[1]);
  }
  return set;
}

async function downloadOne(rel) {
  const fp = path.join(ROOT, rel);
  if (fs.existsSync(fp) && fs.statSync(fp).size > 0) return 'skip';
  const url = 'https://www.citi.com' + rel;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (!res.ok) return 'HTTP ' + res.status;
      const ab = await res.arrayBuffer();
      if (ab.byteLength === 0) return 'empty';
      fs.mkdirSync(path.dirname(fp), { recursive: true });
      fs.writeFileSync(fp, Buffer.from(ab));
      return 'ok ' + ab.byteLength;
    } catch (e) {
      if (attempt === 2) return 'ERR ' + e.message;
      await sleep(400);
    }
  }
}

(async () => {
  const all = [...collectPaths()].filter(p => !p.endsWith('/') && !p.includes('*'));
  console.log('total candidate asset paths:', all.length);
  const pending = all.filter(p => {
    const fp = path.join(ROOT, p);
    return !(fs.existsSync(fp) && fs.statSync(fp).size > 0);
  });
  console.log('missing before download:', pending.length);
  pending.forEach(p => console.log('  MISSING', p));

  let ok = 0, fail = 0;
  const results = [];
  let idx = 0;
  async function worker() {
    while (idx < pending.length) {
      const rel = pending[idx++];
      const r = await downloadOne(rel);
      if (r.startsWith('ok')) { ok++; process.stdout.write('.'); }
      else { fail++; results.push({ rel, r }); process.stdout.write('x'); }
      await sleep(80);
    }
  }
  const workers = Array.from({ length: CONCURRENCY }, worker);
  await Promise.all(workers);

  console.log('\n\n=== DOWNLOAD RESULT ===');
  console.log('downloaded:', ok, 'failed:', fail);
  results.forEach(r => console.log('  FAIL', r.rel, '->', r.r));
})();
