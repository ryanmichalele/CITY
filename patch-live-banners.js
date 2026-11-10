// Patch the mirror's public/index.html ssr-state with the LIVE citi.com homepage banner config
const fs = require('fs');

const IDX = 'public/index.html';
const KEY = 'aemCS_en_static_default-json-banners';
const SET = ['firstTimeExp', 'blueExp', 'goldExp'];

const html = fs.readFileSync(IDX, 'utf8');
const m = html.match(/(<script id="ssr-state" type="application\/json">)([\s\S]*?)(<\/script>)/);
if (!m) { console.error('ssr-state script block not found'); process.exit(1); }

const state = JSON.parse(m[2]);
const live = JSON.parse(fs.readFileSync('live-offers-session.json', 'utf8'));

// live = [{ moduleType, locationId, cms }]
const newSlots = live.map((o) => ({ moduleName: o.moduleType, banner: o.cms }));

const items = state[KEY].body.data.defaultBanners.items;
for (const seg of SET) {
  const before = items[0][seg].length;
  items[0][seg] = newSlots.map((s) => JSON.parse(JSON.stringify(s)));
  console.log(`${seg}: ${before} -> ${items[0][seg].length} slots`);
}

// Re-serialize; escape '<' so a '</script>' can never appear inside the JSON block
const json = JSON.stringify(state).replace(/</g, '\\u003c');

const patched = html.slice(0, m.index) + m[1] + json + m[3] + html.slice(m.index + m[0].length);
fs.writeFileSync(IDX, patched, 'utf8');
console.log('\nindex.html patched. size', html.length, '->', patched.length);

// verify round-trip
const check = JSON.parse(fs.readFileSync(IDX, 'utf8').match(/<script id="ssr-state" type="application\/json">([\s\S]*?)<\/script>/)[1]);
const v = check[KEY].body.data.defaultBanners.items[0].firstTimeExp;
console.log('\nVERIFY firstTimeExp:');
v.forEach((e, i) => {
  const b = e.banner;
  const ip = (o) => (o && o.image && o.image._path) || (o && o._path) || null;
  console.log(`  [${i}] ${e.moduleName} ${b.contentId}`);
  console.log(`      imgLarge=${ip(b.imgLarge)}  home2=${ip(b.homepage2Image)}`);
});
