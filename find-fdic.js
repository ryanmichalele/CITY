const fs = require('fs');
const path = require('path');

const dir = 'public/cbol-hp-static-assets';
const files = [];
function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.js')) files.push(p);
  }
}
walk(dir);

for (const f of files) {
  const t = fs.readFileSync(f, 'utf8');
  if (/fdic/i.test(t)) {
    console.log('=== ' + path.basename(f) + ' has FDIC ===');
    const re = /.{100}fdic.{160}/gi;
    let m; let n = 0;
    while ((m = re.exec(t)) && n < 8) { console.log('  ...' + m[0].replace(/\s+/g, ' ').trim()); n++; }
  }
}

// Find header logo image path patterns
console.log('\n=== image path patterns (citilogo / header / banner) ===');
for (const f of files) {
  const t = fs.readFileSync(f, 'utf8');
  const re = /["'`](\/content\/dam\/[^"'`]*(?:logo|fdic|header|banner|citiredesign)[^"'`]*)["'`]/gi;
  let m;
  while ((m = re.exec(t))) console.log('  ', path.basename(f), '->', m[1]);
}
