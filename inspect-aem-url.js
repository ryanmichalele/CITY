/*
 * Inspect how the JS builds AEM asset URLs.
 */
const fs = require('fs');
const path = require('path');

const dir = 'public/cbol-hp-static-assets';
const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.js')) files.push(p);
  }
})(dir);

for (const f of files) {
  const t = fs.readFileSync(f, 'utf8');
  for (const key of ['aemServerUrl', 'aemStaticAssetsUrl', '_path']) {
    let p = -1, n = 0;
    while ((p = t.indexOf(key, p + 1)) !== -1 && n < 6) {
      const snip = t.slice(Math.max(0, p - 160), p + 200).replace(/\s+/g, ' ');
      console.log('[' + path.basename(f) + '] ' + key + ' @' + p + '\n   ...' + snip + '...');
      n++;
    }
    if (n) console.log('');
  }
}
