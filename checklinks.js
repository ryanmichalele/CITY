const fs = require('fs');
const t = fs.readFileSync('public/index.html', 'utf8');
const re = /<a\b[^>]*?href=["']([^"']+)["']/gi;
let m; const pages = [];
while ((m = re.exec(t))) {
  try {
    const u = new URL(m[1], 'https://www.citi.com');
    if ((u.host === 'www.citi.com' || u.host === 'citi.com') && !m[1].startsWith('http')) {
      const p = u.pathname;
      if (!p.split('/').pop().includes('.')) pages.push(p);
    }
  } catch { }
}
const uniq = [...new Set(pages)];
console.log('same-origin page links:', uniq.length);
uniq.slice(0, 80).forEach(p => console.log('  ' + p));
console.log('--- manifest refs ---');
const mm = t.match(/<link[^>]*manifest[^>]*>/gi);
console.log(mm ? mm : 'none');
console.log('--- icon refs ---');
const ic = t.match(/<link[^>]*icon[^>]*>/gi);
console.log(ic ? ic.slice(0, 6) : 'none');
