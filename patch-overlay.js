/*
 * Additive fix: hide the stuck CTA modal backdrop (the black overlay).
 * This only APPENDS a small <style> block before </head>; it does not alter
 * any existing markup or CSS.
 */
const fs = require('fs');
const path = require('path');

const FIX = `
<style id="mirror-overlay-fix">
/* Mirror fix: hide stuck CTA popup backdrop (black overlay) + its empty dialog */
.cbolui-cds .cds-modal-backdrop,
.cds-modal-backdrop{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important}
body.cds-modal-open{overflow:auto!important}
</style>
`;

const targets = [
  'public/index.html',
  path.join('public', 'US', 'ag', 'contactus', 'index.html')
];

for (const rel of targets) {
  const fp = path.join(process.cwd(), rel);
  if (!fs.existsSync(fp)) { console.log('skip (missing):', rel); continue; }
  let html = fs.readFileSync(fp, 'utf8');
  if (html.includes('id="mirror-overlay-fix"')) { console.log('already patched:', rel); continue; }
  const idx = html.lastIndexOf('</head>');
  if (idx === -1) { console.log('no </head>:', rel); continue; }
  html = html.slice(0, idx) + FIX + html.slice(idx);
  fs.writeFileSync(fp, html);
  console.log('patched:', rel);
}
