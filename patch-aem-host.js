/*
 * Point AEM asset host config at the local mirror so every /content/dam image
 * loads from disk instead of https://aemapi.citi.com.
 * Only the base URL values are changed; no markup is touched.
 */
const fs = require('fs');
const path = require('path');

const targets = [
  'public/index.html',
  path.join('public', 'US', 'ag', 'contactus', 'index.html')
];

const pairs = [
  // escaped-JSON form used inside the SSR state script
  ['"aemServerUrl\\":\\"https:\\u002F\\u002Faemapi.citi.com\\"', '"aemServerUrl\\":\\"\\"'],
  ['"aemServerUrl":"https:\\u002F\\u002Faemapi.citi.com"', '"aemServerUrl":""'],
  // in case some pages embed it unescaped
  ['"aemServerUrl":"https://aemapi.citi.com"', '"aemServerUrl":""']
];

for (const rel of targets) {
  const fp = path.join(process.cwd(), rel);
  if (!fs.existsSync(fp)) { console.log('skip missing:', rel); continue; }
  let t = fs.readFileSync(fp, 'utf8');
  const before = t;
  for (const [from, to] of pairs) t = t.split(from).join(to);
  if (t !== before) { fs.writeFileSync(fp, t); console.log('patched aemServerUrl -> local:', rel); }
  else console.log('no change (already local or pattern miss):', rel);
}
