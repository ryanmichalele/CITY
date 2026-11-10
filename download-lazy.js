const fs = require('fs');
const path = require('path');
const ROOT = path.join(process.cwd(), 'public');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

const files = [
  '/cbol-hp-static-assets/chunk-VPH6S7QP.js',
  '/cbol-hp-static-assets/cbol-core-assets/cedric/cedric_2.56.2.js'
];

(async () => {
  for (const rel of files) {
    const fp = path.join(ROOT, rel);
    if (fs.existsSync(fp) && fs.statSync(fp).size > 0) { console.log('already exists:', rel); continue; }
    try {
      const res = await fetch('https://www.citi.com' + rel, { headers: { 'User-Agent': UA } });
      if (!res.ok) { console.log('FAIL', rel, res.status); continue; }
      const ab = await res.arrayBuffer();
      fs.mkdirSync(path.dirname(fp), { recursive: true });
      fs.writeFileSync(fp, Buffer.from(ab));
      console.log('OK', rel, ab.byteLength);
    } catch (e) { console.log('FAIL', rel, e.message); }
  }
})();
