/*
 * Scan every mirrored HTML/CSS/JS file for remote asset URLs (images/fonts/media)
 * and report them, grouped by host, so they can be localized.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(process.cwd(), 'public');
const exts = /\.(html|css|js)$/i;
const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (exts.test(e.name)) files.push(p);
  }
})(ROOT);

const urlRe = /https?:\/\/(?:aemapi|www)\.citi\.com\/(?:content\/dam|cbol-hp-static-assets|commonui-assets|content)\/[^"'\s)\\?>]+\.(?:png|jpe?g|gif|svg|webp|ico|woff2?|ttf|otf|eot|pdf|mp4|json)/gi;

const byHost = new Map();
const perFile = new Map();

for (const f of files) {
  const t = fs.readFileSync(f, 'utf8');
  const found = new Set();
  let m;
  urlRe.lastIndex = 0;
  while ((m = urlRe.exec(t))) found.add(m[0]);
  if (found.size) {
    perFile.set(path.relative(ROOT, f), found.size);
    for (const u of found) {
      const host = new URL(u).host + new URL(u).pathname.split('/').slice(0, 3).join('/');
      byHost.set(host, (byHost.get(host) || 0) + 1);
    }
  }
}

console.log('files scanned:', files.length);
console.log('\n=== remote asset URLs by prefix ===');
[...byHost.entries()].sort((a, b) => b[1] - a[1]).forEach(([h, n]) => console.log('  ' + n + '\t' + h));
console.log('\n=== files with remote assets ===');
[...perFile.entries()].sort((a, b) => b[1] - a[1]).forEach(([f, n]) => console.log('  ' + n + '\t' + f));

// unique list for main page
const main = path.join(ROOT, 'index.html');
if (fs.existsSync(main)) {
  const t = fs.readFileSync(main, 'utf8');
  const set = new Set();
  let m;
  urlRe.lastIndex = 0;
  while ((m = urlRe.exec(t))) set.add(m[0]);
  console.log('\n=== index.html unique remote assets: ' + set.size + ' ===');
  [...set].forEach(u => console.log('  ' + u));
}
