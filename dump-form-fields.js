// Dump select/radio/checkbox options from the registration form
const fs = require('fs');
const html = fs.readFileSync('public/account-application/index.html', 'utf8');

const selRe = /<select\b([^>]*)>([\s\S]*?)<\/select>/g;
let m;
console.log('=== SELECTS ===');
while ((m = selRe.exec(html)) !== null) {
  const attrs = m[1];
  const id = (attrs.match(/id="([^"]+)"/) || [])[1] || '?';
  const opts = [...m[2].matchAll(/<option\b([^>]*)>/g)].map((o) => {
    const v = (o[1].match(/value="([^"]*)"/) || [])[1] || '';
    const t = (o[1].match(/data-model="([^"]*)"/) || [])[1] || '';
    return v + (t ? ` [${t}]` : '');
  });
  console.log(`  #${id}: ${opts.join(' | ')}`);
}

const radioRe = /<input\b[^>]*type="radio"[^>]*>/g;
console.log('\n=== RADIOS ===');
while ((m = radioRe.exec(html)) !== null) {
  const name = (m[0].match(/name="([^"]+)"/) || [])[1] || '?';
  const value = (m[0].match(/value="([^"]*)"/) || [])[1] || '';
  console.log(`  ${name} = ${value}`);
}

const cbRe = /<input\b[^>]*type="checkbox"[^>]*>/g;
console.log('\n=== CHECKBOXES ===');
while ((m = cbRe.exec(html)) !== null) {
  const id = (m[0].match(/id="([^"]+)"/) || [])[1] || '?';
  console.log(`  #${id}`);
}

const txtRe = /<(?:input|textarea)\b[^>]*id="([^"]+)"[^>]*>/g;
console.log('\n=== TEXT INPUT IDS ===');
const seen = new Set();
while ((m = txtRe.exec(html)) !== null) { if (!seen.has(m[1])) { seen.add(m[1]); console.log('  #' + m[1]); } }
