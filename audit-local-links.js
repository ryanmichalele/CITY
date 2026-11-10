// Audit local asset refs + internal links across public/**/*.html
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, 'public');

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

const htmlFiles = walk(ROOT);
const missingAssets = [];
const internalLinks = new Map(); // url -> Set(pages)

for (const file of htmlFiles) {
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  const html = fs.readFileSync(file, 'utf8');
  const page = '/' + rel;

  // src/href attributes
  const re = /\b(?:src|href)\s*=\s*"([^"]+)"/gi;
  let m;
  while ((m = re.exec(html))) {
    let url = m[1].trim();
    if (!url || url.startsWith('#') || url.startsWith('data:') || url.startsWith('mailto:') || url.startsWith('tel:') || url.startsWith('javascript:')) continue;
    if (/^https?:\/\//i.test(url) || url.startsWith('//')) continue; // external

    // strip query/fragment
    const clean = url.split('#')[0].split('?')[0];
    if (!clean) continue;

    if (clean.startsWith('/')) {
      // absolute -> file under public/
      const fsPath = path.join(ROOT, clean.replace(/^\/+/, ''));
      const exists = fs.existsSync(fsPath) || fs.existsSync(path.join(fsPath, 'index.html'));
      if (!exists) missingAssets.push({ page, url: clean, kind: 'asset' });
    } else {
      // relative to current page dir
      const fsPath = path.resolve(path.dirname(file), clean);
      const exists = fs.existsSync(fsPath) || fs.existsSync(path.join(fsPath, 'index.html'));
      if (!exists) missingAssets.push({ page, url: clean, kind: 'rel-asset' });
    }
  }

  // collect navigable internal links
  const re2 = /<a\b[^>]*\bhref\s*=\s*"([^"]+)"/gi;
  while ((m = re2.exec(html))) {
    let url = m[1].trim();
    if (!url || url.startsWith('#') || url.startsWith('data:') || url.startsWith('mailto:') || url.startsWith('tel:') || url.startsWith('javascript:')) continue;
    if (/^https?:\/\//i.test(url) || url.startsWith('//')) continue;
    const clean = url.split('#')[0].split('?')[0];
    if (!clean) continue;
    if (!internalLinks.has(clean)) internalLinks.set(clean, new Set());
    internalLinks.get(clean).add(page);
  }
}

// Resolve internal links against known pages / public dir
const brokenLinks = [];
for (const [url, pages] of internalLinks) {
  const clean = url.split('#')[0].split('?')[0];
  let target;
  if (clean.startsWith('/')) target = path.join(ROOT, clean.replace(/^\/+/, ''));
  else target = path.resolve(path.dirname([...pages][0]), clean);
  const ok = fs.existsSync(target) || fs.existsSync(path.join(target, 'index.html'));
  if (!ok) brokenLinks.push({ url: clean, from: [...pages].join(', ') });
}

// css url() refs
const cssFiles = [];
(function walkCss(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkCss(p);
    else if (e.name.endsWith('.css')) cssFiles.push(p);
  }
})(ROOT);

const missingCssRefs = [];
for (const cf of cssFiles) {
  const css = fs.readFileSync(cf, 'utf8');
  const rel = path.relative(ROOT, cf).replace(/\\/g, '/');
  const re = /url\(\s*['"]?([^'")]+)['"]?\s*\)/gi;
  let m;
  while ((m = re.exec(css))) {
    let u = m[1].trim();
    if (!u || u.startsWith('data:') || u.startsWith('#')) continue;
    if (/^https?:\/\//i.test(u) || u.startsWith('//')) continue;
    u = u.split('#')[0].split('?')[0];
    if (!u) continue;
    u = u.replace(/\\([ '"()])/g, '$1'); // CSS escape sequences
    const abs = u.startsWith('/') ? path.join(ROOT, u.replace(/^\/+/, '')) : path.resolve(path.dirname(cf), u);
    if (!fs.existsSync(abs)) missingCssRefs.push({ css: rel, url: u });
  }
}

console.log('HTML pages scanned:', htmlFiles.length);
console.log('CSS files scanned :', cssFiles.length);
console.log('Internal links    :', internalLinks.size);
console.log('');
console.log('MISSING ASSET REFS:', missingAssets.length);
for (const x of missingAssets) console.log('  ', x.page, '->', x.url, `(${x.kind})`);
console.log('');
console.log('BROKEN INTERNAL LINKS:', brokenLinks.length);
for (const x of brokenLinks) console.log('  ', x.url, '  [from:', x.from, ']');
console.log('');
console.log('MISSING CSS url() REFS:', missingCssRefs.length);
for (const x of missingCssRefs) console.log('  ', x.css, '->', x.url);
