/*
 * Download missing /content/dam/... hero background image referenced by JS config.
 * heroBackgroundImgPath -> /content/dam/cfs/uspb/usmkt/cbol-homepage/en/static/images/Citi-futuristic-angles-bg-compressed.jpg
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(process.cwd(), 'public');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

const assets = [
  {
    url: 'https://www.citi.com/content/dam/cfs/uspb/usmkt/cbol-homepage/en/static/images/Citi-futuristic-angles-bg-compressed.jpg',
    rel: '/content/dam/cfs/uspb/usmkt/cbol-homepage/en/static/images/Citi-futuristic-angles-bg-compressed.jpg'
  }
];

(async () => {
  for (const a of assets) {
    const fp = path.join(ROOT, a.rel);
    try {
      const res = await fetch(a.url, { headers: { 'User-Agent': UA } });
      if (!res.ok) { console.log('FAIL', a.rel, 'HTTP', res.status); continue; }
      const ab = await res.arrayBuffer();
      fs.mkdirSync(path.dirname(fp), { recursive: true });
      fs.writeFileSync(fp, Buffer.from(ab));
      console.log('OK ', a.rel, '(' + ab.length + ' bytes)');
    } catch (e) {
      console.log('FAIL', a.rel, '->', e.message);
    }
  }
})();
