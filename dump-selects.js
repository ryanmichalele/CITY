const fs = require('fs');
const h = fs.readFileSync('public/account-application/index.html', 'utf8');
for (const id of ['industry', 'income', 'incomeSource', 'activity', 'state']) {
  const i = h.indexOf('id="' + id + '"');
  if (i < 0) { console.log(id + ': not found'); continue; }
  const s = h.lastIndexOf('<select', i);
  const e = h.indexOf('</select>', i);
  console.log('--- #' + id + ' ---');
  console.log(h.slice(s, e + 9).replace(/\s+/g, ' ').slice(0, 600));
  console.log();
}
