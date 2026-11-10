const fs = require('fs');
const path = require('path');

const img = 'public/content/dam/cfs/uspb/usmkt/cbol-homepage/en/static/images/Citi-futuristic-angles-bg-compressed.jpg';
console.log('hero image exists:', fs.existsSync(img), 'size:', fs.existsSync(img) ? fs.statSync(img).size : 'n/a');

const html = fs.readFileSync('public/index.html', 'utf8');

// All section elements
const re = /<section\b[^>]*>/gi; let m; let c = 0;
while ((m = re.exec(html))) { c++; if (c <= 25) console.log('SECTION:', m[0].slice(0, 350)); }
console.log('total sections:', c);

// All divs with hero/banner/overlay/city class
console.log('\n--- hero/banner/overlay/city divs ---');
const re2 = /<div\b[^>]*class=["'][^'"]*(?:hero|banner|overlay|city)[^'"]*['"][^>]*>/gi;
let c2 = 0;
while ((m = re2.exec(html))) { c2++; if (c2 <= 25) console.log('DIV:', m[0].slice(0, 350)); }
console.log('count:', c2);

// Look for background-image inline styles
console.log('\n--- inline background styles ---');
const re3 = /style=["'][^'"]*(?:background|url\()[^'"]*['"]/gi;
let c3 = 0;
while ((m = re3.exec(html))) { c3++; if (c3 <= 15) console.log('STYLE:', m[0].slice(0, 300)); }
console.log('count:', c3);

// Check for overlay-related class names used in body
console.log('\n--- searching for overlay class usage ---');
for (const k of ['overlay', 'dark-overlay', 'bg-overlay', 'hero-overlay', 'city-1', 'FBC']) {
  let pos = html.indexOf(k), n = 0;
  while (pos !== -1) { n++; pos = html.indexOf(k, pos + 1); }
  console.log(k, '=>', n);
}
