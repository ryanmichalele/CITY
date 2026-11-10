const fs = require('fs');

(async () => {
  const res = await fetch('https://www.citi.com/', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36' }
  });
  const t = await res.text();
  fs.writeFileSync('_raw_home.html', t);

  const re = /(?:src|href)=["']([^"']+)["']/gi;
  let m; const urls = [];
  while ((m = re.exec(t))) urls.push(m[1]);

  console.log('total asset refs:', urls.length);
  const hosts = {};
  for (const u of urls) {
    try { const h = new URL(u).host; hosts[h] = (hosts[h] || 0) + 1; }
    catch (e) { hosts['(relative)'] = (hosts['(relative)'] || 0) + 1; }
  }
  console.log('hosts:', JSON.stringify(hosts, null, 2));

  console.log('--- relative refs sample ---');
  urls.filter(u => !u.startsWith('http')).slice(0, 60).forEach(u => console.log(u));

  // look for importmap
  const im = t.match(/<script[^>]*type=["']importmap["'][^>]*>([\s\S]*?)<\/script>/);
  console.log('importmap present:', !!im);
  if (im) console.log(im[1].slice(0, 1500));

  // look for data-src, srcset, poster, etc.
  const re2 = /(?:data-src|data-href|srcset|poster|content)=["']([^"']+)["']/gi;
  const urls2 = [];
  while ((m = re2.exec(t))) urls2.push(m[1]);
  console.log('--- data/srcset refs count:', urls2.length);
  urls2.slice(0, 40).forEach(u => console.log(u));
})();
