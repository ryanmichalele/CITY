const fs = require('fs');
const path = require('path');

const headerImgs = [
  '/content/dam/cfs/mobile/assets/CBOL/IA/Angular/assets/citiredesign.svg',
  '/content/dam/cfs/mobile/assets/CBOL/IA/Angular/assets/Citi_Icon_Sprite_Banner_v2.svg',
  '/content/dam/cfs/uspb/global-nav/en/web/header/header-banner/images/CPB_D.svg',
  '/content/dam/cfs/uspb/global-nav/en/web/header/header-banner/images/CPB_M.svg',
  '/content/dam/cfs/uspb/global-nav/en/web/header/header-banner/images/citigold_D2x.svg',
  '/content/dam/cfs/uspb/global-nav/en/web/header/header-banner/images/citigold_M2x.svg',
  '/content/dam/cfs/uspb/global-nav/en/web/header/header-banner/images/priority_D2x.svg',
  '/content/dam/cfs/uspb/global-nav/en/web/header/header-banner/images/priority_M2x.svg',
  '/content/dam/cfs/uspb/global-nav/en/web/header/header-banner/images/cpc_M2x.svg',
  '/content/dam/cfs/mobile/assets/CBOL/IA/Angular/assets/att_D.svg',
  '/content/dam/cfs/mobile/assets/CBOL/IA/Angular/assets/att_M.png',
  '/content/dam/cfs/mobile/assets/CBOL/IA/Angular/assets/citibusiness2x.svg',
  '/content/dam/cfs/mobile/assets/CBOL/IA/Angular/assets/business_M2x.svg',
  '/content/dam/cfs/mobile/assets/CBOL/IA/Angular/assets/Citi_Icon_Sprite_Nav_v3.svg'
];

let allOk = true;
for (const rel of headerImgs) {
  const fp = path.join('public', rel);
  if (!fs.existsSync(fp)) { console.log('MISSING', rel); allOk = false; continue; }
  const sz = fs.statSync(fp).size;
  const head = fs.readFileSync(fp).slice(0, 60).toString('utf8').replace(/\s+/g, ' ');
  const looksSvg = head.includes('<svg') || head.includes('<?xml');
  const looksPng = head.includes('PNG') || fp.endsWith('.png');
  console.log((looksSvg || looksPng ? 'OK  ' : '??  '), rel, '(' + sz + ' bytes)');
}
console.log(allOk ? '\nAll header images present.' : '\nSome missing!');
