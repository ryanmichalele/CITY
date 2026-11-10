const fs = require('fs');
const path = require('path');

const ROOT = 'public';
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

// Collect every relative asset reference
const re = /(?:src|href|data-src|data-href|poster)=["']([^"']+)["']/gi;
let m; const refs = [];
while ((m = re.exec(html))) {
  const r = m[1].replace(/\\u002F/g, '/');
  if (r.startsWith('http') || r.startsWith('//')) continue; // external
  refs.push(r);
}
// srcset
const ssRe = /srcset=["']([^"']+)["']/gi;
while ((m = ssRe.exec(html))) {
  m[1].split(',').forEach(part => {
    const u = part.trim().split(/\s+/)[0];
    if (!u.startsWith('http') && !u.startsWith('//')) refs.push(u);
  });
}

const uniq = [...new Set(refs)];
console.log('relative asset refs in HTML:', uniq.length);
let missing = 0;
for (const r of uniq) {
  const u = new URL(r, 'https://www.citi.com');
  const fp = path.join(ROOT, u.pathname);
  const exists = fs.existsSync(fp) || fs.existsSync(path.join(fp, 'index.html'));
  if (!exists) { missing++; console.log('  MISSING', r); }
}
console.log('missing locally:', missing);

// Check JS bundles for additional relative asset URLs (images/fonts referenced at runtime)
console.log('\n--- scanning JS bundles for url() / asset strings ---');
const jsDir = path.join(ROOT, 'cbol-hp-static-assets');
const jsFiles = [];
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else if (e.name.endsWith('.js')) jsFiles.push(full);
  }
}
if (fs.existsSync(jsDir)) walk(jsDir);

let bundleAssetRefs = 0;
for (const jf of jsFiles) {
  const txt = fs.readFileSync(jf, 'utf8');
  // look for /cbol-hp-static-assets/... references inside JS
  const assetRe = /["'](\/cbol-hp-static-assets\/[^"'\s)]+)["']/g;
  let mm;
  while ((mm = assetRe.exec(txt))) {
    const r = mm[1];
    const fp = path.join(ROOT, r);
    if (!fs.existsSync(fp)) {
      bundleAssetRefs++;
      if (bundleAssetRefs <= 30) console.log('  JS-referenced MISSING', r, 'in', path.basename(jf));
    }
  }
}
console.log('JS-referenced assets missing locally:', bundleAssetRefs);

console.log('\n=== VERIFICATION DONE ===');
