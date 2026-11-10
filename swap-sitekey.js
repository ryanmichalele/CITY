// Temporarily swap the Turnstile site key in all HTML pages (test-key pair for e2e proof)
const fs = require('fs');
const PAGES = [
  'public/index.html',
  'public/dashboard/index.html',
  'public/account-application/index.html',
  'public/US/ag/contactus/index.html',
];
const REAL = '0x4AAAAAAF8BHWBUHTMJ25tK';
const TEST = '1x00000000000000000000AA';
const target = process.argv[2] === 'test' ? TEST : REAL;

for (const p of PAGES) {
  let h = fs.readFileSync(p, 'utf8');
  h = h.split(REAL).join(target).split(TEST).join(target);
  fs.writeFileSync(p, h);
  console.log(`${p} -> site key = ${target}`);
}
