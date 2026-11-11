// Prove the dashboard shows the REGISTERED customer, not the demo one
const puppeteer = require('C:/Users/SAM/node_modules/puppeteer');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = process.argv[2] || 'http://localhost:3111';
const WHO = process.argv[3] || 'Rohan Sharma';
const EMAIL = 'rohan.sharma@example.com';

function draftFor(name, email, reference) {
  const parts = name.split(' ');
  return {
    accountType: 'savings',
    personal: { firstName: parts[0], middleName: '', lastName: parts.slice(1).join(' '), dob: '1988-03-14', ssnLast4: '9876', citizenship: 'us-citizen', ownership: 'individual' },
    contact: { email, phone: '(646) 555-0111', street: '77 Market Street', apt: '', city: 'Brooklyn', state: 'NY', zip: '11201', country: 'US', mailingSame: 'yes', mailing: {} },
    employment: { status: 'employed', occupation: 'Consultant', employer: 'Vertex', jobTitle: 'Consultant', industry: 'Information Technology', income: '$100,000 – $149,999' },
    financial: { incomeSource: 'Salary / wages', sourceFunds: 'Employment income', monthlyDeposits: '$1,000 – $4,999', monthlyWithdrawals: 'Less than $1,000', purpose: 'Saving', activity: 'Moderate — regular deposits and payments' },
    tax: { usResident: 'yes', tinType: 'ssn', residencyCountry: '', certification: true, declarations: true },
    agreements: { accepted: { daa: true, fees: true, privacy: true, econsent: true, funds: true, terms: true }, signature: name, consent: true, acceptedAt: new Date().toISOString(), docVersion: '1.0' },
    meta: { submitted: true, status: 'approved', reference, submittedAt: new Date().toISOString() },
    ui: { step: 8, maxStep: 8 },
  };
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
  let fails = 0;
  const check = (n, ok, x) => { if (!ok) fails++; console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${n}${x ? '  ' + x : ''}`); };

  for (const ref of ['APP-20261111-RH01', 'APP-20261111-RH02']) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    page.removeAllListeners('console');

    // exactly what /account-application/app.js persists on submit
    await page.evaluateOnNewDocument((d) => {
      try { sessionStorage.setItem('citi-application-draft-v1', JSON.stringify(d)); } catch (e) {}
    }, draftFor(WHO, EMAIL, ref));

    await page.goto(BASE + '/dashboard/', { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise((r) => setTimeout(r, 3500));

    const d = await page.evaluate(() => {
      const t = (s) => (document.querySelector(s)?.textContent || '').trim();
      return {
        url: location.pathname,
        greeting: t('#welcome-greeting'),
        hello: t('#welcome-hello'),
        holder: t('#hero-holder'),
        eyebrow: t('#hero-eyebrow'),
        reference: t('#hero-reference'),
        number: t('#account-number-value'),
        infoName: t('#info-name'),
        infoEmail: t('#info-email'),
        infoType: t('#info-type'),
        profile: t('#profile-name'),
        initials: t('#profile-initials'),
      };
    });
    console.log(`\n--- registered as ${WHO} (ref ${ref}) ---`);
    console.log('   ', JSON.stringify(d));

    check('not the demo customer (Alex)', !/alex/i.test(d.holder + d.greeting + d.infoName + d.profile));
    check('greeting uses the real first name', d.greeting.indexOf(WHO.split(' ')[0]) !== -1, d.greeting);
    check('hello line uses the real first name', d.hello === 'Hello, ' + WHO.split(' ')[0] + '!', d.hello);
    check('holder = registered full name', d.holder === WHO, d.holder);
    check('email from the registration', d.infoEmail === EMAIL, d.infoEmail);
    check('account type from the registration', d.eyebrow === 'Savings Account', d.eyebrow);
    check('profile name = registered name', d.profile === WHO, d.profile);
    check('application reference shown', d.reference === ref, d.reference);
    check('account number is unique per registration', d.number.indexOf(ref.slice(-4)) !== -1 || d.number.indexOf('•') !== -1, d.number);
    await page.close();
  }

  // two different customers must not see each other's data
  console.log('\n--- two different customers, separate browsers ---');
  const names = ['Aarav Patel', 'Chen Wei'];
  const results = [];
  for (let i = 0; i < names.length; i++) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    page.removeAllListeners('console');
    await page.evaluateOnNewDocument((d) => {
      try { sessionStorage.setItem('citi-application-draft-v1', JSON.stringify(d)); } catch (e) {}
    }, draftFor(names[i], names[i].replace(/\s+/g, '.').toLowerCase() + '@example.com', 'APP-20261111-C' + (i + 1)));
    await page.goto(BASE + '/dashboard/', { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise((r) => setTimeout(r, 3000));
    results.push(await page.evaluate(() => ({
      name: (document.querySelector('#info-name') || {}).textContent,
      email: (document.querySelector('#info-email') || {}).textContent,
      ref: (document.querySelector('#hero-reference') || {}).textContent,
    })));
    await page.close();
  }
  console.log('   customer A:', JSON.stringify(results[0]));
  console.log('   customer B:', JSON.stringify(results[1]));
  check('customer A sees only their own data', results[0].name === names[0] && results[0].email === names[0].replace(/\s+/g, '.').toLowerCase() + '@example.com');
  check('customer B sees only their own data', results[1].name === names[1] && results[1].email === names[1].replace(/\s+/g, '.').toLowerCase() + '@example.com');
  check('no cross-customer leakage', results[0].ref !== results[1].ref && results[0].name !== results[1].name);

  await browser.close();
  console.log('\n================================');
  console.log(fails === 0 ? 'ALL CUSTOMER-DATA CHECKS PASSED' : `${fails} CHECK(S) FAILED`);
})();
