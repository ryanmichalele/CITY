/*
 * Localize images: download missing /content/dam assets and point the SSR
 * config at local paths (empty base => root-relative /content/dam/...).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(process.cwd(), 'public');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
const { missing } = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'missing-dam-assets.json'), 'utf8'));

function isImageBuffer(buf, rel) {
  if (!buf || buf.length < 64) return false;
  const head = buf.slice(0, 200).toString('utf8').trim().toLowerCase();
  if (head.startsWith('<!doctype html') || head.startsWith('<html')) return false;
  if (/\.svg$/i.test(rel)) return head.includes('<svg') || head.includes('<?xml');
  if (/\.(png)$/i.test(rel)) return buf[0] === 0x89 && buf[1] === 0x50;
  if (/\.(jpe?g)$/i.test(rel)) return buf[0] === 0xff && buf[1] === 0xd8;
  return true;
}

async function tryDownload(rel) {
  const hosts = ['https://aemapi.citi.com', 'https://www.citi.com'];
  for (const h of hosts) {
    try {
      const res = await fetch(h + rel, { headers: { 'User-Agent': UA, 'Referer': 'https://www.citi.com/' } });
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      if (!isImageBuffer(buf, rel)) continue;
      const fp = path.join(ROOT, rel);
      fs.mkdirSync(path.dirname(fp), { recursive: true });
      fs.writeFileSync(fp, buf);
      return { ok: true, bytes: buf.length, host: h };
    } catch (e) { /* try next */ }
  }
  return { ok: false };
}

(async () => {
  let ok = 0, fail = [];
  for (const rel of missing) {
    const r = await tryDownload(rel);
    if (r.ok) { ok++; console.log('OK   ' + rel + ' (' + r.bytes + ' from ' + r.host + ')'); }
    else { fail.push(rel); console.log('FAIL ' + rel); }
  }
  console.log('\ndownloaded ' + ok + '/' + missing.length);

  // ---- patch config: local base for static assets ----
  const targets = ['public/index.html', path.join('public', 'US', 'ag', 'contactus', 'index.html')];
  for (const rel of targets) {
    const fp = path.join(process.cwd(), rel);
    if (!fs.existsSync(fp)) continue;
    let t = fs.readFileSync(fp, 'utf8');
    const before = t;
    t = t.split('"aemStaticAssetsUrl\\":\\"https:\\u002F\\u002Faemapi.citi.com\\"').join('"aemStaticAssetsUrl\\":\\"\\"');
    t = t.split('"aemStaticAssetsUrl":"https:\\u002F\\u002Faemapi.citi.com"').join('"aemStaticAssetsUrl":""');
    if (t !== before) { fs.writeFileSync(fp, t); console.log('patched aemStaticAssetsUrl -> local:', rel); }
    else console.log('config already local (or pattern not found):', rel);
  }
  if (fail.length) fs.writeFileSync(path.join(process.cwd(), 'failed-dam-assets.json'), JSON.stringify(fail, null, 2));
})().catch(e => { console.error('FATAL', e); process.exit(1); });
