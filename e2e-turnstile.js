// END-TO-END: widget solves -> token sent to server -> server verifies -> form proceeds
const puppeteer = require('C:/Users/SAM/node_modules/puppeteer');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'https://city-bank-ca.netlify.app';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  page.removeAllListeners('console');

  const verifyCalls = [];
  page.on('response', async (r) => {
    if (r.url().includes('turnstile-verify')) {
      let body = '';
      try { body = await r.text(); } catch (e) { /* */ }
      verifyCalls.push({ status: r.status(), body });
    }
  });

  await page.goto(BASE + '/account-application/?mode=register', { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 4000));

  // wait for the widget to issue a token
  let tokenLen = 0;
  for (let i = 0; i < 20 && tokenLen === 0; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    tokenLen = await page.evaluate(() => {
      const i = document.querySelector('input[name="cf-turnstile-response"]');
      return i && i.value ? i.value.length : 0;
    });
  }
  console.log('1. widget issued token       :', tokenLen > 0 ? `YES (${tokenLen} chars)` : 'NO');

  const stepBefore = await page.evaluate(() => {
    const p = document.querySelector('.step-panel:not([hidden])');
    return p ? p.getAttribute('data-step') : null;
  });

  // Fill in step 1 so the app's own validation lets the form advance.
  await page.evaluate(() => {
    const radio = document.querySelector('input[name="accountType"]');
    if (radio) { radio.checked = true; radio.dispatchEvent(new Event('change', { bubbles: true })); }
  });

  // submit the form the way a user would
  await page.evaluate(() => {
    const btn = document.getElementById('btn-next');
    if (btn) btn.click();
  });
  await new Promise((r) => setTimeout(r, 3000));

  const stepAfter = await page.evaluate(() => {
    const p = document.querySelector('.step-panel:not([hidden])');
    return p ? p.getAttribute('data-step') : null;
  });
  const msgs = await page.evaluate(() =>
    [...document.querySelectorAll('.cf-turnstile-msg')].map((m) => m.textContent.trim()).filter(Boolean));

  console.log('2. server verify calls       :', JSON.stringify(verifyCalls));
  console.log('3. step before -> after      :', stepBefore, '->', stepAfter);
  console.log('4. turnstile messages        :', JSON.stringify(msgs));

  const ok =
    tokenLen > 0 &&
    verifyCalls.length === 1 &&
    verifyCalls[0].status === 200 &&
    /"success":\s*true/.test(verifyCalls[0].body) &&
    stepBefore !== stepAfter;

  console.log('\n================================');
  console.log(ok ? 'END-TO-END PASS: token -> server verified -> form advanced' : 'END-TO-END FAILED');
  await browser.close();
})();
