const fs = require('fs');
const path = require('path');

const ROOT = 'public';

// Scan all JS bundles for /content/dam/ asset paths
const dir = path.join(ROOT, 'cbol-hp-static-assets');
const jsFiles = [];
function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.js')) jsFiles.push(p);
  }
}
if (fs.existsSync(dir)) walk(dir);

const damPaths = new Set();
const re = /["'](\/content\/dam\/[^"'\s)]+)["']/gi;
for (const f of jsFiles) {
  const t = fs.readFileSync(f, 'utf8');
  let mm;
  while ((mm = re.exec(t))) damPaths.add(mm[1]);
}
console.log('JS-referenced /content/dam/ paths:', damPaths.size);
let missing = 0;
for (const p of [...damPaths].sort()) {
  const fp = path.join(ROOT, p);
  const ex = fs.existsSync(fp);
  if (!ex) { missing++; console.log('  MISSING', p); }
  else console.log('  OK     ', p, '(' + fs.statSync(fp).size + ' bytes)');
}
console.log('missing content/dam assets:', missing);

// Also scan HTML for content/dam
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const re2 = /["'](\/content\/dam\/[^"'\s)]+)["']/gi;
const htmlDams = new Set();
let mm2;
while ((mm2 = re2.exec(html))) htmlDams.add(mm2[1]);
console.log('\nHTML /content/dam/ paths:', htmlDams.size);
for (const p of htmlDams) {
  const fp = path.join(ROOT, p);
  console.log((fs.existsSync(fp) ? '  OK  ' : '  MISS'), p);
}
