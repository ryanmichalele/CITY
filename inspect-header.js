const fs = require('fs');
const html = fs.readFileSync('public/index.html', 'utf8');

// Extract header region: from <citi-header ...> to </citi-header> or first <main
let hStart = html.indexOf('<citi-header');
let hEnd = html.indexOf('</citi-header>');
if (hEnd === -1) hEnd = html.indexOf('<main');
const header = html.slice(hStart, hEnd > hStart ? hEnd : hStart + 30000);
console.log('header length:', header.length);

// All img tags in header with src/alt
console.log('\n=== HEADER <img> tags ===');
const imgRe = /<img\b[^>]*>/gi;
let m;
while ((m = imgRe.exec(header))) {
  const tag = m[0];
  const src = (tag.match(/src=["']([^"']+)["']/i) || [])[1] || '(no src)';
  const alt = (tag.match(/alt=["']([^"']*)["']/i) || [])[1] || '';
  console.log('  src:', src, '| alt:', alt);
}

// Any FDIC mentions in header
console.log('\n=== FDIC mentions in header ===');
const fdicRe = /.{80}fdic.{120}/gi;
let fm;
while ((fm = fdicRe.exec(header))) console.log(fm[0].replace(/\s+/g, ' ').trim());

// All src-like refs in header
console.log('\n=== all src/href refs in header (unique) ===');
const refRe = /(?:src|href)=["']([^"']+)["']/gi;
const set = new Set();
while ((m = refRe.exec(header))) set.add(m[1]);
[...set].forEach(r => console.log('  ', r));
