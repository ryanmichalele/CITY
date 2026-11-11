// Dashboard test: real submitted draft -> dashboard; no draft -> redirect
const puppeteer = require('C:/Users/SAM/node_modules/puppeteer');
const fs = require('fs');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const BASE = process.argv[2] || 'http://localhost:3111';
const DRAFT = {
  accountType: 'checking',
  personal: { firstName: 'Alex', middleName: 'R', lastName: 'Morgan', dob: '1990-04-12', ssnLast4: '1234', citizenship: 'US', ownership: 'individual' },
  contact: { email: 'alex.morgan@example.com', phone: '(212) 555-0147', street: '88 Pine Street', apt: 'Apt 12C', city: 'New York', state: 'NY', zip: '10004', country: 'US', mailingSame: 'yes', mailing: {} },
  employment: { status: 'employed', occupation: 'Engineer', employer: 'Acme', jobTitle: 'SE', industry: 'Tech', income: '120000' },
  financial: { incomeSource: 'salary', sourceFunds: 'salary', monthlyDeposits: '4000', monthlyWithdrawals: '2500', purpose: 'savings', activity: 'moderate' },
  tax: { usResident: 'yes', tinType: 'ssn', residencyCountry: 'US', certification: true, declarations: true },
  agreements: { accepted: {}, signature: 'Alex Morgan', consent: true, acceptedAt: '2026-11-10T15:04:22.000Z', docVersion: '1.0' },
  meta: { submitted: true, status: 'approved', reference: 'APP-20261110-K3F9QZ', submittedAt: '2026-11-10T15:04:22.000Z' },
  ui: { step: 8, maxStep: 8 },
};

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });
  let fails = 0;
  const check = (name, ok, extra) => {
    if (!ok) fails++;
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`);
  };

  // ---------- 1. unauthenticated -> redirect ----------
  {
    const page = await browser.newPage();
    await page.goto(BASE + '/dashboard/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await new Promise((r) => setTimeout(r, 2500));
    const url = page.url();
    console.log('\n=== 1. NO SESSION (unauthenticated) ===');
    check('redirects to account entry', url.indexOf('/account-application/') !== -1, url);
    await page.close();
  }

  // ---------- 2. authenticated dashboard ----------
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  const errors = [];
  // Third-party noise seen across the whole mirror site (not dashboard code):
  // the bank's analytics scripts log with a hidden font, Cloudflare probes for
  // an optional Private Access Token, and some assets live on external hosts.
  const NOISE = /ERR_NAME_NOT_RESOLVED|MIME type|tagmanager|font-size:0;color:transparent|challenges\.cloudflare\.com.*\/pat\/|net::ERR_FAILED/;
  page.on('pageerror', (e) => { if (!NOISE.test(String(e.message))) errors.push(String(e.message).slice(0, 160)); });
  page.on('console', (m) => { if (m.type() === 'error' && !NOISE.test(m.text())) errors.push('console: ' + m.text().slice(0, 160)); });
  page.on('response', (r) => {
    if (r.status() >= 400 && r.url().includes('city-bank-ca.netlify.app') && !NOISE.test(r.url())) {
      errors.push('HTTP' + r.status() + ' ' + r.url().slice(0, 120));
    }
  });

  await page.evaluateOnNewDocument((draft) => {
    try { sessionStorage.setItem('citi-application-draft-v1', JSON.stringify(draft)); } catch (e) { /* */ }
  }, DRAFT);

  await page.goto(BASE + '/dashboard/', { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 3500));
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await new Promise((r) => setTimeout(r, 2500));
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise((r) => setTimeout(r, 1500));

  console.log('\n=== 2. AUTHENTICATED DASHBOARD ===');
  const d = await page.evaluate(() => {
    const t = (s) => (document.querySelector(s)?.textContent || '').trim();
    return {
      url: location.pathname,
      greeting: t('#welcome-greeting'),
      hello: t('#welcome-hello'),
      holder: t('#hero-holder'),
      eyebrow: t('#hero-eyebrow'),
      status: t('#hero-status'),
      opened: t('#hero-opened'),
      reference: t('#hero-reference'),
      numberMasked: t('#account-number-value'),
      available: t('#hero-available'),
      statAvailable: t('#stat-available'),
      statCurrent: t('#stat-current'),
      statType: t('#stat-type'),
      statStatus: t('#stat-status'),
      infoName: t('#info-name'),
      infoNumber: t('#info-number'),
      infoType: t('#info-type'),
      infoEmail: t('#info-email'),
      infoPhone: t('#info-phone'),
      infoAddress: t('#info-address'),
      profileName: t('#profile-name'),
      initials: t('#profile-initials'),
      qaCount: document.querySelectorAll('.qa-item').length,
      qaIcons: document.querySelectorAll('.qa-item .qa-icon svg').length,
      serviceCount: document.querySelectorAll('.service-item').length,
      productCount: document.querySelectorAll('.product-card').length,
      emptyUpcoming: t('#upcoming-empty'),
      emptyTx: t('#transactions-empty'),
      emptyTxHidden: document.querySelector('#transactions-empty')?.hidden,
      emptyPayHist: t('#payment-history-empty'),
      activityCount: document.querySelectorAll('.tl-item').length,
      activityTitles: [...document.querySelectorAll('.tl-title')].map((e) => e.textContent.trim()),
      notifCount: document.querySelectorAll('.dropdown-notification').length,
      sidebarAccounts: document.querySelectorAll('#sidebar-accounts .sidebar-item').length,
      sidebarAvail: t('#sb-available'),
      lastSignin: t('#meta-lastsignin'),
      font: getComputedStyle(document.body).fontFamily,
      interLoaded: document.fonts ? document.fonts.check('16px Inter') : null,
      heroBg: getComputedStyle(document.querySelector('.account-hero')).backgroundImage.slice(0, 60),
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });

  console.log('  --- content ---');
  console.log('  greeting        :', d.greeting, '|', d.hello);
  console.log('  holder          :', d.holder, '|', d.eyebrow, '|', d.status);
  console.log('  account number  :', d.numberMasked, '->', d.infoNumber);
  console.log('  balances        :', d.available, '/', d.statAvailable, '/', d.statCurrent);
  console.log('  info            :', d.infoName, '|', d.infoType, '|', d.infoEmail, '|', d.infoPhone);
  console.log('  address         :', d.infoAddress);
  console.log('  profile         :', d.profileName, '(' + d.initials + ')');
  console.log('  quick actions   :', d.qaCount, 'with', d.qaIcons, 'icons');
  console.log('  services/products:', d.serviceCount, '/', d.productCount);
  console.log('  empty states    :', JSON.stringify(d.emptyUpcoming), '|', JSON.stringify(d.emptyTx), '|', JSON.stringify(d.emptyPayHist));
  console.log('  activity        :', d.activityCount, JSON.stringify(d.activityTitles));
  console.log('  sidebar         :', d.sidebarAccounts, 'accounts, avail', d.sidebarAvail);
  console.log('  font            :', d.font, '| Inter loaded:', d.interLoaded);
  console.log('  hero bg         :', d.heroBg);
  console.log('  overflow-x      :', d.overflowX, 'px');

  console.log('  --- assertions ---');
  check('greeting uses real first name', d.greeting === 'Good Morning, Alex' || /^Good (Morning|Afternoon|Evening), Alex$/.test(d.greeting), d.greeting);
  check('hello line uses first name', d.hello === 'Hello, Alex!', d.hello);
  check('no "Dear Customer/User"', !/Dear Customer|Dear User|Dear Account Holder/i.test(d.greeting + d.hello + d.holder));
  check('holder = full legal name', d.holder === 'Alex R Morgan', d.holder);
  check('account type from form', d.eyebrow === 'Checking Account', d.eyebrow);
  check('status Active', d.status === 'Active', d.status);
  check('account number masked by default', /•/.test(d.numberMasked) && !/P-2026/.test(d.numberMasked), d.numberMasked);
  check('prototype id masked in info panel by default', /•/.test(d.infoNumber) && !/P-2026/.test(d.infoNumber), d.infoNumber);
  check('balances not fabricated', d.available === '—' && d.statAvailable === '—' && d.statCurrent === '—');
  check('no upcoming payments state', /No upcoming payments/.test(d.emptyUpcoming));
  check('no transactions state', /No transactions yet/.test(d.emptyTx) && d.emptyTxHidden === false);
  check('no payment history state', /No payment history yet/.test(d.emptyPayHist));
  check('8 quick actions', d.qaCount === 8);
  check('quick action icons render', d.qaIcons === 8);
  check('activity timeline populated', d.activityCount >= 4, String(d.activityCount));
  check('notifications populated', d.notifCount > 0);
  check('sidebar shows only customer accounts', d.sidebarAccounts === 2, String(d.sidebarAccounts));
  check('Inter font active', !!d.interLoaded);
  check('no horizontal overflow', d.overflowX <= 0, String(d.overflowX));

  // ---- interactions ----
  console.log('  --- interactions ---');

  // account number toggle
  await page.click('#btn-toggle-number');
  await new Promise((r) => setTimeout(r, 400));
  const revealed = await page.evaluate(() => ({
    number: document.querySelector('#account-number-value').textContent.trim(),
    label: document.querySelector('#toggle-number-label').textContent.trim(),
    pressed: document.querySelector('#btn-toggle-number').getAttribute('aria-pressed'),
    info: document.querySelector('#info-number').textContent.trim(),
  }));
  check('toggle reveals account number', revealed.number === 'P-20261110-K3F9QZ', revealed.number);
  check('toggle updates label + aria', revealed.label === 'Hide account number' && revealed.pressed === 'true');
  check('info panel reflects revealed number', revealed.info === 'P-20261110-K3F9QZ');

  await page.click('#btn-toggle-number');
  await new Promise((r) => setTimeout(r, 400));
  const rehidden = await page.evaluate(() => document.querySelector('#account-number-value').textContent.trim());
  check('toggle hides again', /•/.test(rehidden), rehidden);

  // copy
  await page.evaluate(() => { window.__copied = null; navigator.clipboard.writeText = (t) => { window.__copied = t; return Promise.resolve(); }; });
  await page.click('#btn-copy-number');
  await new Promise((r) => setTimeout(r, 500));
  const copied = await page.evaluate(() => window.__copied);
  check('copy copies the account id', copied === 'P-20261110-K3F9QZ', String(copied));

  // profile dropdown
  await page.click('#btn-profile');
  await new Promise((r) => setTimeout(r, 400));
  const profileOpen = await page.evaluate(() => !document.querySelector('#menu-profile').hidden);
  check('profile dropdown opens', profileOpen);
  await page.keyboard.press('Escape');
  await new Promise((r) => setTimeout(r, 300));
  const profileClosed = await page.evaluate(() => document.querySelector('#menu-profile').hidden);
  check('profile dropdown closes on Escape', profileClosed);

  // notifications dropdown
  await page.click('#btn-notifications');
  await new Promise((r) => setTimeout(r, 400));
  const notifOpen = await page.evaluate(() => !document.querySelector('#menu-notifications').hidden);
  check('notifications dropdown opens', notifOpen);
  await page.click('#btn-notifications');
  await new Promise((r) => setTimeout(r, 300));

  // search
  await page.click('#btn-search');
  await new Promise((r) => setTimeout(r, 400));
  const searchOpen = await page.evaluate(() => !document.querySelector('#search-modal').hidden);
  check('search opens', searchOpen);
  await page.type('#search-input', 'statement');
  await new Promise((r) => setTimeout(r, 400));
  const results = await page.evaluate(() => document.querySelectorAll('.search-result').length);
  check('search filters results', results > 0 && results < 12, String(results));
  await page.keyboard.press('Escape');
  await new Promise((r) => setTimeout(r, 300));

  // quick action navigation
  await page.click('.qa-item[data-target="#payments"]');
  await new Promise((r) => setTimeout(r, 1200));
  const scrolled = await page.evaluate(() => window.scrollY);
  check('quick action scrolls to section', scrolled > 100, 'scrollY=' + Math.round(scrolled));

  // nav active state
  const activeNav = await page.evaluate(() => {
    const a = document.querySelector('.topnav-link.is-active');
    return a ? a.getAttribute('data-nav') : null;
  });
  check('nav active state tracks section', !!activeNav, String(activeNav));

  // responsive
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await new Promise((r) => setTimeout(r, 800));
  const mobile = await page.evaluate(() => ({
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    burgerVisible: getComputedStyle(document.querySelector('#btn-burger')).display !== 'none',
    mainNavHidden: getComputedStyle(document.querySelector('#topnav-main')).display === 'none',
    cols: getComputedStyle(document.querySelector('.dash-shell')).gridTemplateColumns,
  }));
  console.log('  --- mobile 390px ---');
  console.log('  overflow-x:', mobile.overflowX, '| burger:', mobile.burgerVisible, '| main nav hidden:', mobile.mainNavHidden);
  check('no horizontal overflow on mobile', mobile.overflowX <= 0, String(mobile.overflowX));
  check('burger visible on mobile', mobile.burgerVisible);
  check('desktop nav collapses', mobile.mainNavHidden);
  check('single column on mobile', mobile.cols.split(' ').length === 1, mobile.cols);

  // mobile menu
  await page.click('#btn-burger');
  await new Promise((r) => setTimeout(r, 400));
  const mobileMenu = await page.evaluate(() => !document.querySelector('#topnav-mobile').hidden);
  check('mobile menu opens', mobileMenu);
  await page.screenshot({ path: 'dash-mobile-menu.png' });
  await page.click('#btn-burger');
  await new Promise((r) => setTimeout(r, 300));

  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: 'dash-mobile.png', fullPage: false });

  // desktop screenshots
  await page.setViewport({ width: 1440, height: 900 });
  await new Promise((r) => setTimeout(r, 900));
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: 'dash-desktop-top.png' });
  await page.evaluate(() => window.scrollTo(0, 900));
  await new Promise((r) => setTimeout(r, 700));
  await page.screenshot({ path: 'dash-desktop-mid.png' });
  await page.evaluate(() => window.scrollTo(0, 1900));
  await new Promise((r) => setTimeout(r, 700));
  await page.screenshot({ path: 'dash-desktop-low.png' });

  console.log('\n  --- page errors ---');
  if (errors.length) { errors.slice(0, 6).forEach((e) => console.log('   !', e)); }
  check('no JS errors', errors.length === 0, errors.length + ' error(s)');

  await browser.close();
  console.log('\n================================');
  console.log(fails === 0 ? 'ALL DASHBOARD CHECKS PASSED' : `${fails} CHECK(S) FAILED`);
})();
