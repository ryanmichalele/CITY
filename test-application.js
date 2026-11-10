/*
 * End-to-end test of the local account application:
 *  - Register / Activate buttons on the mirrored homepage open the form
 *  - all 8 steps, validation, back/edit, agreements, demo decisions
 *  - refresh persistence, duplicate-submit prevention
 *  - no external requests, no console errors, mobile layout
 *
 * Usage: node test-application.js
 */
const puppeteer = require('puppeteer-core');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const HOME = 'http://localhost:3000/';
const FORM = 'http://localhost:3000/account-application/?mode=register';

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok, detail: detail || '' });
  console.log((ok ? 'PASS  ' : 'FAIL  ') + name + (detail ? '  [' + detail + ']' : ''));
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function setValue(page, selector, value) {
  await page.$eval(selector, (el, v) => {
    el.value = v;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
  await sleep(60);
}

async function selectRadio(page, selector) {
  await page.$eval(selector, el => {
    el.checked = true;
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await sleep(60);
}

async function currentStep(page) {
  return page.evaluate(() => {
    const panel = document.querySelector('.step-panel:not([hidden])');
    return panel ? Number(panel.getAttribute('data-step')) : 0;
  });
}

async function visibleText(page, selector) {
  return page.$eval(selector, el => (el.innerText || '').replace(/\s+/g, ' ').trim()).catch(() => '');
}

async function stepShot(page, name) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(250);
  await page.screenshot({ path: name, clip: { x: 0, y: 0, width: 1440, height: 1180 } });
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new',
    args: ['--no-sandbox', '--disable-gpu']
  });

  /* ======================= 1. homepage bridge ============================ */
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1180 });
  page.on('dialog', d => d.accept());

  const formConsoleErrors = [];
  const externalHosts = new Set();

  await page.goto(HOME, { waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {});
  await sleep(8000);

  const regHref = await page.$eval('#register_acc', a => a.getAttribute('href')).catch(() => null);
  check('Register link points at the local form', regHref === '/account-application/?mode=register', String(regHref));

  const actHref = await page.$eval('#activate_card', a => a.getAttribute('href')).catch(() => null);
  check('Activate link points at the local form', actHref === '/account-application/?mode=activate', String(actHref));

  const heroText = await page.evaluate(() => (document.body.innerText || '').includes('Earn 50,000'));
  check('Homepage campaign content still renders after the patch', heroText);

  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {}),
    page.click('#register_acc')
  ]);
  await sleep(1200);

  check('Register opens the application page', /\/account-application\/\?mode=register$/.test(page.url()), page.url());
  check('Form heading is "Open an Account"', (await visibleText(page, '#page-title')) === 'Open an Account');
  check('All 8 progress items are present', (await page.$$eval('.stepper li', els => els.length)) === 8);

  page.on('pageerror', err => formConsoleErrors.push('pageerror: ' + err.message));
  page.on('console', msg => { if (msg.type() === 'error') formConsoleErrors.push('console: ' + msg.text()); });
  page.on('request', req => {
    try {
      const u = new URL(req.url());
      if (u.protocol.startsWith('http') && u.host !== 'localhost:3000' && u.host !== '127.0.0.1:3000') {
        externalHosts.add(u.host);
      }
    } catch (e) {}
  });

  /* ======================= 2. step 1 ==================================== */
  await page.click('#btn-next');
  await sleep(400);
  const emptyErr = await visibleText(page, '[data-field-group="accountType"] .field-error');
  check('Step 1 blocks Continue without a selection', /Choose an account type/i.test(emptyErr), emptyErr);

  const backVisible = await page.$eval('#btn-back', el => el.getBoundingClientRect().height > 0);
  check('Back button is hidden on the first step', !backVisible);

  const saveVisible = await page.$eval('#btn-save', el => el.getBoundingClientRect().height > 0);
  check('Save & continue later is available', saveVisible);

  await page.click('.account-card');
  await sleep(150);
  const selected = await page.$eval('input[name="accountType"]:checked', el => el.value).catch(() => '');
  check('Account card selects Checking', selected === 'checking', selected);

  await page.click('#btn-next');
  await sleep(500);
  check('Step 1 Continue opens Step 2', (await currentStep(page)) === 2);
  await stepShot(page, 'form-step2.png');

  /* ======================= 3. step 2 ==================================== */
  await page.click('#btn-next');
  await sleep(300);
  const step2Errors = await page.$$eval('section[data-step="2"] .field-error', els => els.length);
  check('Step 2 shows field-level errors for empty required fields', step2Errors >= 4, step2Errors + ' errors');

  await setValue(page, '#firstName', 'Jordan');
  await setValue(page, '#middleName', 'A');
  await setValue(page, '#lastName', 'Example');
  await setValue(page, '#dob', '1990-05-14');
  await setValue(page, '#ssn', '123456789');
  await setValue(page, '#citizenship', 'us-citizen');
  await selectRadio(page, 'input[name="ownership"][value="individual"]');

  const ssnFormatted = await page.$eval('#ssn', el => el.value);
  check('SSN is formatted while typing', ssnFormatted === '123-45-6789', ssnFormatted);

  await page.click('#btn-next');
  await sleep(500);
  check('Step 2 Continue opens Step 3', (await currentStep(page)) === 3);
  await stepShot(page, 'form-step3.png');

  /* ======================= 4. step 3 ==================================== */
  await setValue(page, '#email', 'jordan@example.com');
  await setValue(page, '#phone', '5551234567');
  await setValue(page, '#street', '123 Main Street');
  await setValue(page, '#apt', 'Apt 4B');
  await setValue(page, '#city', 'Austin');
  await setValue(page, '#state', 'TX');
  await setValue(page, '#zip', '78701');
  await selectRadio(page, 'input[name="mailingSame"][value="no"]');
  await sleep(200);

  const mailingVisible = await page.$eval('#mailing-block', el => el.getBoundingClientRect().height > 0);
  check('Mailing address fields appear when "No" is selected', mailingVisible);

  await page.click('#btn-next');
  await sleep(350);
  const mailErrors = await page.$$eval('#mailing-block .field-error', els => els.length);
  check('Separate mailing address is validated', mailErrors >= 2, mailErrors + ' errors');

  await setValue(page, '#mailStreet', 'PO Box 5521');
  await setValue(page, '#mailCity', 'Austin');
  await setValue(page, '#mailState', 'TX');
  await setValue(page, '#mailZip', '78768');

  await page.click('#btn-next');
  await sleep(500);
  check('Step 3 Continue opens Step 4', (await currentStep(page)) === 4);
  await stepShot(page, 'form-step4.png');

  /* ======================= 5. step 4 ==================================== */
  await setValue(page, '#empStatus', 'unemployed');
  await sleep(200);
  const employerHidden = await page.$eval('#employer-block', el => el.getBoundingClientRect().height === 0);
  check('Employer fields hide for Unemployed applicants', employerHidden);

  await setValue(page, '#empStatus', 'employed');
  await sleep(200);
  const employerShown = await page.$eval('#employer-block', el => el.getBoundingClientRect().height > 0);
  check('Employer fields show for Employed applicants', employerShown);

  await setValue(page, '#occupation', 'Software Engineer');
  await setValue(page, '#employer', 'Northwind Labs');
  await setValue(page, '#jobTitle', 'Senior Engineer');
  await setValue(page, '#industry', 'Information Technology');
  await setValue(page, '#income', '$100,000 – $149,999');
  await setValue(page, '#incomeSource', 'Salary / wages');
  await setValue(page, '#sourceFunds', 'Employment income');
  await setValue(page, '#monthlyDeposits', '$5,000 – $9,999');
  await setValue(page, '#monthlyWithdrawals', '$1,000 – $4,999');
  await setValue(page, '#purpose', 'Everyday spending');
  await setValue(page, '#activity', 'Moderate — regular deposits and payments');

  await page.click('#btn-next');
  await sleep(500);
  check('Step 4 Continue opens Step 5', (await currentStep(page)) === 5);
  await stepShot(page, 'form-step5.png');

  /* ======================= 6. step 5 ==================================== */
  await selectRadio(page, 'input[name="usResident"][value="yes"]');
  await sleep(150);
  const countryHidden = await page.$eval('#residency-country-field', el => el.getBoundingClientRect().height === 0);
  check('Tax residency country hidden for U.S. residents', countryHidden);

  await setValue(page, '#tinType', 'ssn');
  await page.click('#taxCert');
  await page.click('#taxDeclarations');
  await sleep(150);

  await page.click('#btn-next');
  await sleep(600);
  check('Step 5 Continue opens the Review step', (await currentStep(page)) === 6);

  /* ======================= 7. review ==================================== */
  const reviewCards = await page.$$eval('.review-card', els => els.length);
  check('Review shows all 6 sections', reviewCards === 6, reviewCards + ' cards');

  const reviewText = await visibleText(page, '#review-body');
  check('Review includes entered personal data', reviewText.includes('Jordan') && reviewText.includes('Example'));
  check('Review masks the SSN', /•••-••-6789/.test(reviewText) && !reviewText.includes('123-45-6789'));

  await stepShot(page, 'form-review.png');

  // Edit -> change -> returns to review
  await page.click('.review-card [data-edit-step="2"]');
  await sleep(500);
  check('Review Edit opens the Personal step', (await currentStep(page)) === 2);

  await setValue(page, '#firstName', 'Jordan');
  await page.click('#btn-next');
  await sleep(500);
  check('Continue after Edit returns to Review', (await currentStep(page)) === 6);

  /* ======================= 8. step 7 agreements ========================= */
  await page.click('#btn-next');
  await sleep(500);
  check('Review Continue opens Agreements', (await currentStep(page)) === 7);

  await page.click('#btn-next');
  await sleep(400);
  const agreementErrors = await page.$$eval('section[data-step="7"] .field-error', els => els.length);
  check('Agreements block submission until acknowledged', agreementErrors >= 5, agreementErrors + ' errors');

  await page.$eval('#agreement-list', el => {
    el.querySelectorAll('details').forEach(d => d.setAttribute('open', ''));
  });
  await sleep(200);
  const docsOpen = await page.$$eval('#agreement-list details[open]', els => els.length);
  check('Agreement documents can be opened', docsOpen === 6, docsOpen + ' open');

  for (const id of ['daa', 'fees', 'privacy', 'econsent', 'funds', 'terms']) {
    await page.click('input[data-agreement="' + id + '"]');
    await sleep(40);
  }

  await setValue(page, '#signature', 'Jordan A. Example');
  await page.click('#esignConsent');
  await sleep(150);

  await stepShot(page, 'form-agreements.png');

  /* ======================= 9. submit + decision ========================= */
  await page.click('#btn-next');
  await sleep(400);
  const loading = await page.$eval('#btn-next', el => el.classList.contains('loading'));
  check('Submit shows a loading state', loading);

  await sleep(1800);
  check('Decision step is shown after submit', (await currentStep(page)) === 8);

  const decisionTitle = await visibleText(page, '#decision-panel h2');
  check('Default demo status is Pending Review', decisionTitle === 'Application Under Review', decisionTitle);

  const reference = await page.$eval('.decision-ref strong', el => el.textContent.trim()).catch(() => '');
  check('Decision shows a demo application reference', /^DEMO-\d{8}-[A-Z0-9]{6}$/.test(reference), reference);

  const previews = await page.$$eval('[data-preview-status]', els => els.length);
  check('Three demo decision states can be previewed', previews === 3, previews + ' buttons');

  await page.click('[data-preview-status="approved"]');
  await sleep(300);
  check('Approved state renders', (await visibleText(page, '#decision-panel h2')) === 'Application Approved');
  await stepShot(page, 'form-decision-approved.png');

  await page.click('[data-preview-status="declined"]');
  await sleep(300);
  check('Declined state renders', (await visibleText(page, '#decision-panel h2')) === 'Application Not Approved');

  await page.click('[data-preview-status="pending_review"]');
  await sleep(300);
  check('Pending state renders', (await visibleText(page, '#decision-panel h2')) === 'Application Under Review');

  /* duplicate submit guard */
  await page.evaluate(() => {
    const form = document.getElementById('app-form');
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });
  await sleep(400);
  const reference2 = await page.$eval('.decision-ref strong', el => el.textContent.trim());
  check('Duplicate submission is prevented', reference2 === reference, reference + ' -> ' + reference2);

  /* ======================= 10. refresh persistence ====================== */
  await page.reload({ waitUntil: 'networkidle2' }).catch(() => {});
  await sleep(1500);
  check('Reload keeps the submitted decision screen', (await currentStep(page)) === 8);
  const reference3 = await page.$eval('.decision-ref strong', el => el.textContent.trim()).catch(() => '');
  check('Reload keeps the same application reference', reference3 === reference, reference3);

  /* ======================= 11. external requests / console ============== */
  check('Form makes no external network requests', externalHosts.size === 0, [...externalHosts].join(', '));
  check('Form has no console errors', formConsoleErrors.length === 0, formConsoleErrors.slice(0, 3).join(' | '));

  /* ======================= 12. activate button ========================== */
  const page2 = await browser.newPage();
  await page2.setViewport({ width: 1440, height: 900 });
  await page2.goto(HOME, { waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {});
  await sleep(7000);
  await Promise.all([
    page2.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {}),
    page2.click('#activate_card')
  ]);
  await sleep(1000);
  check('Activate opens the application page', /mode=activate$/.test(page2.url()), page2.url());
  check('Activate mode heading is "Activate Your Account"', (await visibleText(page2, '#page-title')) === 'Activate Your Account');
  await page2.close();

  /* ======================= 13. refresh mid-application ================== */
  const page3 = await browser.newPage();
  await page3.setViewport({ width: 1440, height: 1000 });
  page3.on('dialog', d => d.accept());
  await page3.goto(FORM, { waitUntil: 'networkidle2' }).catch(() => {});
  await sleep(1200);
  await page3.click('.account-card:nth-child(2)');
  await page3.click('#btn-next');
  await sleep(400);
  await setValue(page3, '#firstName', 'Taylor');
  await setValue(page3, '#lastName', 'Morgan');
  await setValue(page3, '#ssn', '987654321');
  await sleep(600);
  await page3.reload({ waitUntil: 'networkidle2' }).catch(() => {});
  await sleep(1400);

  const resumed = await currentStep(page3);
  const resumedFirst = await page3.$eval('#firstName', el => el.value).catch(() => '');
  const resumedSsn = await page3.$eval('#ssn', el => el.value).catch(() => '');
  const ssnPlaceholder = await page3.$eval('#ssn', el => el.placeholder).catch(() => '');
  check('Refresh restores the current step', resumed === 2, 'step ' + resumed);
  check('Refresh restores non-sensitive fields', resumedFirst === 'Taylor', resumedFirst);
  check('Refresh does not restore the SSN value', resumedSsn === '', JSON.stringify(resumedSsn));
  check('Refresh asks the user to re-enter the SSN', /re-enter/i.test(ssnPlaceholder), ssnPlaceholder);

  await page3.close();

  /* ======================= 14. mobile ================================== */
  const mobile = await browser.newPage();
  await mobile.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await mobile.goto(FORM, { waitUntil: 'networkidle2' }).catch(() => {});
  await sleep(1200);

  const overflow = await mobile.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth
  }));
  check('Mobile layout has no horizontal overflow', overflow.scrollWidth <= overflow.innerWidth + 1, JSON.stringify(overflow));

  const mobileStepper = await mobile.$eval('#stepper-mobile', el => getComputedStyle(el).display);
  check('Mobile progress indicator is visible', mobileStepper !== 'none', mobileStepper);

  await mobile.screenshot({ path: 'form-mobile-step1.png', fullPage: false });

  await mobile.click('.account-card');
  await mobile.click('#btn-next');
  await sleep(500);
  await mobile.screenshot({ path: 'form-mobile-step2.png', fullPage: false });
  await mobile.close();

  /* ======================= summary ===================================== */
  await browser.close();

  const failed = results.filter(r => !r.ok);
  console.log('\n================ SUMMARY ================');
  console.log('checks: ' + results.length + ' | passed: ' + (results.length - failed.length) + ' | failed: ' + failed.length);
  if (failed.length) {
    failed.forEach(f => console.log('  FAILED: ' + f.name + (f.detail ? ' [' + f.detail + ']' : '')));
    process.exit(1);
  }
})().catch(err => {
  console.error('FATAL', err);
  process.exit(1);
});
