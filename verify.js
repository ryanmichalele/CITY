const fs = require('fs');
const path = require('path');

const t = fs.readFileSync('public/index.html', 'utf8');
console.log('html len', t.length);
console.log('has <nav:', /<nav/i.test(t));
console.log('has navbar-ish:', /navbar|nav-bar|main-nav|global-nav/i.test(t));
const i = t.search(/<nav/i);
console.log('--- first nav snippet ---');
console.log(i < 0 ? '(none found)' : t.slice(i, i + 800));

const css = fs.readFileSync('public/cbol-hp-static-assets/styles-UTVRLUNW.css', 'utf8');
const urlRe = /url\(['"]?([^'")\s]+)['"]?\)/gi;
let m; const refs = [];
while ((m = urlRe.exec(css))) refs.push(m[1]);
console.log('\ncss url() refs:', refs.length);
const same = refs.filter(r => !r.startsWith('http') && !r.startsWith('//'));
const ext = refs.filter(r => r.startsWith('http') || r.startsWith('//'));
console.log('  relative:', same.length, ' external:', ext.length);
ext.slice(0, 10).forEach(r => console.log('   ext:', r));

const missing = same.filter(r => {
  try {
    const u = new URL(r, 'https://www.citi.com');
    return !fs.existsSync(path.join('public', u.pathname));
  } catch { return true; }
});
console.log('  relative css refs missing locally:', missing.length);
missing.slice(0, 15).forEach(r => console.log('   MISSING', r));

// check a few key assets exist
const keys = [
  '/cbol-hp-static-assets/main-ZDREJTDY.js',
  '/cbol-hp-static-assets/styles-UTVRLUNW.css',
  '/cbol-hp-static-assets/chunk-GDRUDWCJ.js',
  '/cbol-hp-static-assets/assets/favicon.ico',
  '/index.html'
];
console.log('\n--- key assets ---');
keys.forEach(k => {
  const fp = path.join('public', k);
  console.log((fs.existsSync(fp) ? 'OK  ' : 'MISS'), k, fs.existsSync(fp) ? '(' + fs.statSync(fp).size + ' bytes)' : '');
});
