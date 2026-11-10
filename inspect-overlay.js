const fs = require('fs');
const html = fs.readFileSync('public/index.html', 'utf8');

// Find heroReskinSection div and extract it fully
let idx = html.indexOf('heroReskinSection');
if (idx === -1) { console.log('NOT FOUND'); process.exit(0); }

// Go back to find the opening <div
let divStart = html.lastIndexOf('<div', idx);
// Make sure it's the div with heroReskinSection class
let openTagEnd = html.indexOf('>', divStart);
let openingDiv = html.slice(divStart, openTagEnd + 1);
console.log('=== OPENING HERO DIV ===');
console.log(openingDiv.slice(0, 500));

// Now find matching closing </div> - count nested divs
let contentStart = openTagEnd + 1;
let depth = 1;
let i = contentStart;
let closeIdx = -1;
while (i < html.length && depth > 0) {
  const nextOpen = html.indexOf('<div', i);
  const nextClose = html.indexOf('</div>', i);
  if (nextClose === -1) break;
  if (nextOpen !== -1 && nextOpen < nextClose && nextOpen < contentStart + 50000) {
    depth++;
    i = nextOpen + 4;
  } else {
    depth--;
    i = nextClose + 6;
    if (depth === 0) closeIdx = i - 6;
  }
}
if (closeIdx === -1) closeIdx = html.indexOf('</div>', contentStart);

console.log('\n=== HERO CONTENT (first 3000 chars) ===');
console.log(html.slice(contentStart, Math.min(contentStart + 3000, closeIdx)));

// Look for any overlay class in the whole HTML
console.log('\n=== OVERLAY SEARCH ===');
for (const k of ['overlay', 'dark', 'black', 'hero-overlay', 'bg-dark', 'rgba', '::before', '::after']) {
  let pos = html.indexOf(k), n = 0;
  while (pos !== -1) { n++; pos = html.indexOf(k, pos + 1); }
  if (n > 0) console.log(k, '=>', n);
}

// Check inline styles on hero div children - look for style attributes with background
console.log('\n=== INLINE STYLE BACKGROUNDS IN HERO AREA ===');
const heroArea = html.slice(divStart, closeIdx !== -1 ? closeIdx : divStart + 10000);
const styleRe = /style=["'][^'"]*["']/gi;
let sm;
while ((sm = styleRe.exec(heroArea))) {
  if (sm[0].toLowerCase().includes('background') || sm[0].toLowerCase().includes('color')) {
    console.log(sm[0].slice(0, 200));
  }
}
