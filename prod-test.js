// Production smoke test against https://city-bank-ca.netlify.app
const BASE = 'https://city-bank-ca.netlify.app';

const htmlPages = [
  '/',
  '/dashboard/',
  '/account-application/',
  '/account-application/?mode=register',
  '/account-application/?mode=activate',
  '/US/ag/contactus/',
];

const assets = [
  ['/cbol-hp-static-assets/styles-UTVRLUNW.css', 'text/css'],
  ['/cbol-hp-static-assets/main-ZDREJTDY.js', 'javascript'],
  ['/cbol-hp-static-assets/polyfills-KFGV2ZA5.js', 'javascript'],
  ['/cbol-hp-static-assets/scripts-BG4V4SZS.js', 'javascript'],
  ['/cbol-hp-static-assets/chunk-EUL5VXVK.js', 'javascript'],
  ['/cbol-hp-static-assets/chunk-PYYWKTYB.js', 'javascript'],
  ['/cbol-hp-static-assets/chunk-GDRUDWCJ.js', 'javascript'],
  ['/cbol-hp-static-assets/assets/js/banner.min.54ddf126.js', 'javascript'],
  ['/cbol-hp-static-assets/assets/js/fp.js', 'javascript'],
  ['/cbol-hp-static-assets/assets/favicon.ico', 'image'],
  ['/cbol-hp-static-assets/assets/img/Citi-futuristic-angles-bg-compressed.jpg', 'image'],
  ['/cbol-hp-static-assets/media/mobile_app_download-EAET7HKK.svg', 'image/svg'],
  ['/cbol-hp-static-assets/cds-assets/fonts/interstate/Interstate-Bold.woff2', 'font'],
  ['/cbol-hp-static-assets/cds-assets/fonts/interstate/Interstate-Regular.woff2', 'font'],
  ['/cbol-hp-static-assets/cds-assets/fonts/interstate/Interstate-LightItalic.woff2', 'font'],
  ['/cbol-hp-static-assets/cds-assets/fonts/interstate/Interstate-Light.woff2', 'font'],
  ['/cbol-hp-static-assets/cds-assets/images/QR%20icon.png', 'image/png'],
  ['/cbol-hp-static-assets/cds-assets/images/QR%20icon%20white.png', 'image/png'],
  ['/content/dam/cfs/mobile/assets/CBOL/IA/Angular/assets/citiredesign.svg', 'image/svg'],
  ['/content/dam/cfs/mobile/assets/CBOL/IA/Angular/assets/Citi_Icon_Sprite_Banner_v2.svg', 'image/svg'],
  ['/dashboard/dashboard.css', 'text/css'],
  ['/dashboard/dashboard.js', 'javascript'],
  ['/account-application/styles.css', 'text/css'],
  ['/account-application/app.js', 'javascript'],
];

const spaRoutes = [
  '/banking/checking-account',
  '/some/deep/nested/angular/route',
  '/US/ag/contactus',
];

async function head(path) {
  try {
    const r = await fetch(BASE + path, { redirect: 'follow' });
    const ct = r.headers.get('content-type') || '';
    const len = r.headers.get('content-length');
    return { status: r.status, ct, len };
  } catch (e) {
    return { status: 0, ct: 'ERR ' + e.message, len: null };
  }
}

let fails = 0;

console.log('=== HTML PAGES ===');
for (const p of htmlPages) {
  const r = await head(p);
  const ok = r.status === 200 && r.ct.includes('text/html');
  if (!ok) fails++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${String(r.status).padEnd(4)} ${p}  [${r.ct}]`);
}

console.log('\n=== STATIC ASSETS (status + correct MIME) ===');
for (const [p, expect] of assets) {
  const r = await head(p);
  const ok = r.status === 200 && r.ct.includes(expect);
  if (!ok) fails++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${String(r.status).padEnd(4)} ${p}  [${r.ct}] expect~${expect}`);
}

console.log('\n=== SPA NESTED ROUTES (refresh must not 404) ===');
for (const p of spaRoutes) {
  const r = await head(p);
  const ok = r.status === 200 && r.ct.includes('text/html');
  if (!ok) fails++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${String(r.status).padEnd(4)} ${p}  [${r.ct}]`);
}

console.log('\n=== 404 SHOULD 404 (real asset missing) ===');
{
  const r = await head('/cbol-hp-static-assets/definitely-missing-xyz.js');
  const ok = r.status === 404;
  if (!ok) fails++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${String(r.status).padEnd(4)} /cbol-hp-static-assets/definitely-missing-xyz.js  [${r.ct}]`);
}

console.log('\n=== CONTENT SANITY (homepage body) ===');
{
  const r = await fetch(BASE + '/');
  const html = await r.text();
  const checks = [
    ['DOCTYPE', html.trimStart().startsWith('<!DOCTYPE html>')],
    ['charset meta', /<meta charset="utf-8">/i.test(html)],
    ['viewport meta', /name="viewport"/i.test(html)],
    ['<title> present', /<title>[^<]+<\/title>/i.test(html)],
    ['base href', /<base id="baseHrefId" href="\/">/i.test(html)],
    ['app-root element', /<app-root/i.test(html)],
    ['main css link', /cbol-hp-static-assets\/styles-UTVRLUNW\.css/i.test(html)],
    ['main js script', /cbol-hp-static-assets\/main-ZDREJTDY\.js/i.test(html)],
    ['stylesheet block', /<style/i.test(html)],
    ['body content rendered', /citi-outer-container/i.test(html)],
  ];
  for (const [name, ok] of checks) {
    if (!ok) fails++;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  }
  console.log('  html length:', html.length);
}

console.log('\n=== INTERNAL LINK CHECK (from homepage) ===');
{
  const r = await fetch(BASE + '/');
  const html = await r.text();
  const hrefs = [...html.matchAll(/<a\b[^>]*href="([^"]+)"/g)].map((m) => m[1]);
  const internal = [...new Set(hrefs.filter((h) => h && !/^(https?:|mailto:|tel:|javascript:|#|data:)/i.test(h)))];
  let checked = 0, bad = 0;
  for (const h of internal) {
    const clean = h.split('#')[0].split('?')[0];
    if (!clean) continue;
    checked++;
    const rr = await head(clean);
    if (rr.status !== 200) { bad++; console.log(`  FAIL ${rr.status} ${h}`); }
  }
  console.log(`  checked ${checked} internal links, ${bad} non-200`);
  console.log('  sample:', internal.slice(0, 12).join(', '));
  fails += bad;
}

console.log('\n================================');
console.log(fails === 0 ? 'ALL CHECKS PASSED' : `${fails} CHECK(S) FAILED`);
