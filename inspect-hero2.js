const fs = require('fs');
const html = fs.readFileSync('public/index.html', 'utf8');

// Extract the heroReskinSection div and its immediate contents
const idx = html.indexOf('heroReskinSection');
if (idx === -1) { console.log('heroReskinSection not found'); process.exit(0); }
// Find the opening <div ... class="heroReskinSection">
const divStart = html.lastIndexOf('<div', idx);
const divOpen = html.slice(divStart, html.indexOf('>', divStart) + 1);
console.log('OPENING DIV:', divOpen);
// Find closing of this div - naive: find next </div> after the section content
const afterOpen = html.indexOf('>', divStart) + 1;
const closeIdx = html.indexOf('</div>', afterOpen);
console.log('CONTENT INSIDE HERO DIV:');
console.log(html.slice(afterOpen, closeIdx));

// Also check for any style attribute on the hero div
console.log('\n--- hero div has style? ---', divOpen.includes('style'));

// Look for background-color rules in CSS targeting hero or body
const css = fs.readFileSync('public/cbol-hp-static-assets/styles-UTVRLUNW.css', 'utf8');
for (const k of ['heroReskinSection{', 'heroReskinSection ', '.heroReskinSection']) {
  let pos = css.indexOf(k), n = 0;
  while (pos !== -1) { n++; pos = css.indexOf(k, pos + 1); }
  console.log('CSS', k, '=>', n);
}
