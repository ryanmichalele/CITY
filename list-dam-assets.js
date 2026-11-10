/*
 * Localize every /content/dam asset referenced by the mirrored pages.
 *
 * Step 1 (this run): extract + list every asset path found in the SSR state
 * of each HTML file, and report which ones are missing on disk.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(process.cwd(), 'public');

const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.html')) files.push(p);
  }
})(ROOT);

const ASSET_EXT = /\.(png|jpe?g|gif|svg|webp|ico|woff2?|ttf|otf|eot|pdf|mp4)$/i;

function decodeEscapes(s) {
  return s.replace(/\\u002F/g, '/').replace(/\\\//g, '/');
}

function collect(text) {
  const set = new Set();
  // escaped JSON form: \u002Fcontent\u002Fdam\u002F....png
  const escaped = /\\u002Fcontent\\u002Fdam\\u002F[^"'\s<>]+?\.(?:png|jpe?g|gif|svg|webp|ico|pdf|mp4)/gi;
  let m;
  while ((m = escaped.exec(text))) set.add(decodeEscapes(m[0]));
  // plain form: /content/dam/....png
  const plain = /\/content\/dam\/[^"'\s<>]+?\.(?:png|jpe?g|gif|svg|webp|ico|pdf|mp4)/gi;
  while ((m = plain.exec(text))) set.add(m[0]);
  // url-encoded form: %2Fcontent%2Fdam%2F
  const enc = /%2Fcontent%2Fdam%2F[^"'\s<>]+?\.(?:png|jpe?g|gif|svg|webp|ico|pdf|mp4)/gi;
  while ((m = enc.exec(text))) set.add(decodeURIComponent(m[0]).replace(/^\//, '/'));
  return set;
}

const all = new Map(); // path -> [files]
for (const f of files) {
  const text = fs.readFileSync(f, 'utf8');
  const found = collect(text);
  for (const u of found) {
    const p = u.startsWith('/') ? u : '/' + u;
    if (!all.has(p)) all.set(p, []);
    all.get(p).push(path.relative(ROOT, f));
  }
}

const missing = [];
const present = [];
for (const [p] of all) {
  const fp = path.join(ROOT, p);
  if (fs.existsSync(fp) && fs.statSync(fp).size > 0) present.push(p);
  else missing.push(p);
}

console.log('html files:', files.length);
console.log('unique /content/dam assets referenced:', all.size);
console.log('present locally:', present.length);
console.log('MISSING locally:', missing.length);
console.log('\n=== MISSING ===');
missing.sort().forEach(p => console.log('  ' + p + '   <- ' + all.get(p).join(', ')));

fs.writeFileSync(path.join(process.cwd(), 'missing-dam-assets.json'), JSON.stringify({ missing, present }, null, 2));
