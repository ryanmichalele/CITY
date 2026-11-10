const fs = require('fs');
const html = fs.readFileSync('public/index.html', 'utf8');

// Find the actual div element with class="heroReskinSection" in body
const re = /<div\b[^>]*class=["'][^'"]*\bheroReskinSection\b[^'"]*["'][^>]*>/gi;
let m;
let found = null;
while ((m = re.exec(html))) {
  // Skip if it's inside a <style> tag
  const before = html.slice(0, m.index);
  const lastStyleClose = before.lastIndexOf('</style>');
  const lastStyleOpen = before.lastIndexOf('<style');
  if (lastStyleClose !== -1 && lastStyleClose > lastStyleOpen) continue;
  found = m;
  break;
}

if (!found) { console.log('Hero div not found in body'); process.exit(0); }

console.log('=== OPENING HERO DIV (body) ===');
console.log(found[0]);

const contentStart = found.index + found[0].length;

// Find matching closing div by counting
let depth = 1;
let i = contentStart;
let closeIdx = -1;
while (i < html.length && depth > 0) {
  const nextOpenTag = html.indexOf('<div', i);
  const nextCloseTag = html.indexOf('</div>', i);
  if (nextCloseTag === -1) break;
  if (nextOpenTag !== -1 && nextOpenTag < nextCloseTag) {
    depth++;
    i = nextOpenTag + 4;
  } else {
    depth--;
    i = nextCloseTag + 6;
    if (depth === 0) closeIdx = nextCloseTag;
  }
}

const heroContent = closeIdx !== -1 ? html.slice(contentStart, closeIdx) : html.slice(contentStart, contentStart + 5000);
console.log('\n=== HERO CONTENT ===');
console.log(heroContent.slice(0, 4000));

// Find overlay-related elements inside hero
console.log('\n=== OVERLAY / DARK / BLACK elements inside hero ===');
const overlayRe = /<(div|section|span)\b[^>]*class=["'][^'"]*(?:overlay|dark|black|bg-)[^'"]*["'][^>]*>/gi;
let om;
while ((om = overlayRe.exec(heroContent))) {
  console.log(om[0].slice(0, 300));
}

// Also check for inline style with background on any element in hero
console.log('\n=== INLINE background styles in hero ===');
const styleRe = /<[^>]+style=["'][^'"]*(?:background|background-color|bg-)[^'"]*["'][^>]*>/gi;
let sm;
while ((sm = styleRe.exec(heroContent))) {
  console.log(sm[0].slice(0, 300));
}
