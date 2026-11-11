// FULL LIVE FLOW on production: fill the real registration form -> submit -> dashboard
const puppeteer = require('C:/Users/SAM/node_modules/puppeteer');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = process.argv[2] || 'https://city-bank-ca.netlify.app';

const CUSTOMER = {
  firstName: 'Priya',
  lastName: 'Raghavan',
  middleName: '',
  dob: '1991-07-23',
  ssn: '456781239',
  citizenship: 'us-citizen',
  ownership: 'individual',
  email: 'priya.raghavan@example.com',
  phone: '4155550184',
  street: '1200 Pine Street',
  apt: 'Unit 8',
  city: 'San Francisco',
  state: 'CA',
  zip: '94108',
  country: 'US',
  mailingSame: 'yes',
  empStatus: 'employed',
  occupation: 'Senior Financial Analyst',
  employer: 'Pacific Trust Group',
  jobTitle: 'Senior Analyst',
  industry: 'Information Technology',
  income: '$100,000',
  incomeSource: 'Salary / wages',
  sourceFunds: 'Salary',
  monthlyDeposits: '$2,500',
  monthlyWithdrawals: '$1,000',
  purpose: 'Saving',
  activity: 'Moderate',
  tinType: 'ssn',
  signature: 'Priya Raghavan',
};

async function setInput(page, sel, value) {
  await page.evaluate((s, v) => {
    const el = document.querySelector(s);
    if (!el) return;
    el.focus();
    el.value = v;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.blur();
  }, sel, value);
}

async function pickSelect(page, sel, textMatch) {
  const ok = await page.evaluate((s, t) => {
    const el = document.querySelector(s);
    if (!el) return false;
    const opt = [...el.options].find((o) => (o.textContent || '').toLowerCase().includes(t.toLowerCase()));
    if (!opt) return false;
    el.value = opt.value;
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }, sel, textMatch);
  if (!ok) console.log(`  ! could not pick "${textMatch}" in ${sel}`);
  return ok;
}

async function pickRadio(page, name, value) {
  await page.evaluate((n, v) => {
    const el = document.querySelector(`input[name="${n}"][value="${v}"]`);
    if (el) { el.checked = true; el.dispatchEvent(new Event('change', { bubbles: true })); }
  }, name, value);
}

async function check(page, sel) {
  await page.evaluate((s) => {
    const el = document.querySelector(s);
    if (el && !el.checked) { el.checked = true; el.dispatchEvent(new Event('change', { bubbles: true })); }
  }, sel);
}

async function currentStep(page) {
  return page.evaluate(() => {
    const p = document.querySelector('.step-panel:not([hidden])');
    return p ? p.getAttribute('data-step') : null;
  });
}

async function clickNext(page) {
  await page.evaluate(() => {
    const b = document.getElementById('btn-next');
    if (b) b.click();
  });
  await new Promise((r) => setTimeout(r, 1400));
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  page.removeAllListeners('console');

  await page.goto(BASE + '/account-application/', { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 3000));

  // Wait for the Turnstile token (test key auto-solves; real key needs a click)
  let tokenLen = 0;
  for (let i = 0; i < 25 && tokenLen === 0; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    tokenLen = await page.evaluate(() => {
      const el = document.querySelector('input[name="cf-turnstile-response"]');
      return el && el.value ? el.value.length : 0;
    });
  }
  console.log('turnstile token:', tokenLen > 0 ? `issued (${tokenLen})` : 'NOT ISSUED');

  console.log('\n--- STEP 1: account type ---');
  await pickRadio(page, 'accountType', 'checking');
  await clickNext(page);
  console.log('  step now:', await currentStep(page));

  console.log('--- STEP 2: personal ---');
  await setInput(page, '#firstName', CUSTOMER.firstName);
  await setInput(page, '#middleName', CUSTOMER.middleName);
  await setInput(page, '#lastName', CUSTOMER.lastName);
  await setInput(page, '#dob', CUSTOMER.dob);
  await setInput(page, '#ssn', CUSTOMER.ssn);
  await pickSelect(page, '#citizenship', CUSTOMER.citizenship);
  await pickRadio(page, 'ownership', CUSTOMER.ownership);
  await clickNext(page);
  console.log('  step now:', await currentStep(page));

  console.log('--- STEP 3: contact ---');
  await setInput(page, '#email', CUSTOMER.email);
  await setInput(page, '#phone', CUSTOMER.phone);
  await setInput(page, '#street', CUSTOMER.street);
  await setInput(page, '#apt', CUSTOMER.apt);
  await setInput(page, '#city', CUSTOMER.city);
  await pickSelect(page, '#state', CUSTOMER.state);
  await setInput(page, '#zip', CUSTOMER.zip);
  await pickSelect(page, '#country', CUSTOMER.country);
  await pickRadio(page, 'mailingSame', CUSTOMER.mailingSame);
  await clickNext(page);
  console.log('  step now:', await currentStep(page));

  console.log('--- STEP 4: employment + financial ---');
  await pickSelect(page, '#empStatus', CUSTOMER.empStatus);
  await setInput(page, '#occupation', CUSTOMER.occupation);
  await setInput(page, '#employer', CUSTOMER.employer);
  await setInput(page, '#jobTitle', CUSTOMER.jobTitle);
  await pickSelect(page, '#industry', CUSTOMER.industry);
  await pickSelect(page, '#income', CUSTOMER.income);
  await pickSelect(page, '#incomeSource', CUSTOMER.incomeSource);
  await pickSelect(page, '#sourceFunds', CUSTOMER.sourceFunds);
  await pickSelect(page, '#monthlyDeposits', CUSTOMER.monthlyDeposits);
  await pickSelect(page, '#monthlyWithdrawals', CUSTOMER.monthlyWithdrawals);
  await pickSelect(page, '#purpose', CUSTOMER.purpose);
  await pickSelect(page, '#activity', CUSTOMER.activity);
  await clickNext(page);
  console.log('  step now:', await currentStep(page));

  console.log('--- STEP 5: tax ---');
  await pickRadio(page, 'usResident', 'yes');
  await pickSelect(page, '#tinType', CUSTOMER.tinType);
  await check(page, '#taxCert');
  await check(page, '#taxDeclarations');
  await clickNext(page);
  console.log('  step now:', await currentStep(page));

  console.log('--- STEP 6: review ---');
  await clickNext(page);
  console.log('  step now:', await currentStep(page));

  console.log('--- STEP 7: agreements + submit ---');
  await setInput(page, '#signature', CUSTOMER.signature);
  await check(page, '#esignConsent');
  await clickNext(page);
  console.log('  step now:', await currentStep(page));

  // submitApplication redirects to /dashboard/ after ~800ms
  await page.waitForFunction(() => location.pathname.indexOf('/dashboard') !== -1, { timeout: 20000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 3500));

  console.log('\n=== RESULT ===');
  console.log('  final url :', page.url());

  const d = await page.evaluate(() => {
    const t = (s) => (document.querySelector(s)?.textContent || '').trim();
    return {
      greeting: t('#welcome-greeting'),
      hello: t('#welcome-hello'),
      holder: t('#hero-holder'),
      eyebrow: t('#hero-eyebrow'),
      status: t('#hero-status'),
      opened: t('#hero-opened'),
      reference: t('#hero-reference'),
      number: t('#account-number-value'),
      infoName: t('#info-name'),
      infoEmail: t('#info-email'),
      infoPhone: t('#info-phone'),
      infoAddress: t('#info-address'),
      activity: [...document.querySelectorAll('.tl-title')].map((e) => e.textContent.trim()),
    };
  });
  console.log('  greeting  :', d.greeting, '|', d.hello);
  console.log('  holder    :', d.holder, '|', d.eyebrow, '|', d.status);
  console.log('  opened    :', d.opened, '| ref:', d.reference);
  console.log('  number    :', d.number);
  console.log('  info      :', d.infoName, '|', d.infoEmail, '|', d.infoPhone);
  console.log('  address   :', d.infoAddress);
  console.log('  activity  :', JSON.stringify(d.activity));

  await page.screenshot({ path: 'live-registered-dashboard.png' });

  const ok = d.greeting.includes('Priya') && d.holder === 'Priya Raghavan' && d.infoEmail === CUSTOMER.email;
  console.log('\n================================');
  console.log(ok ? 'FULL FLOW PASS: registered on the live site -> dashboard shows the real customer' : 'FULL FLOW FAILED');

  await browser.close();
})();
