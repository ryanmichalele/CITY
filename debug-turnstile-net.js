// Trace Turnstile network activity + longer wait for the iframe
const puppeteer = require('C:/Users/SAM/node_modules/puppeteer');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  page.on('request', (r) => {
    if (/challenges\.cloudflare|turnstile|cdn-cgi/i.test(r.url())) console.log('  REQ ', r.method(), r.url().slice(0, 150));
  });
  page.on('response', (r) => {
    if (/challenges\.cloudflare|turnstile|cdn-cgi/i.test(r.url())) console.log('  RES ', r.status(), r.url().slice(0, 150));
  });
  page.on('requestfailed', (r) => {
    if (/challenges\.cloudflare|turnstile|cdn-cgi/i.test(r.url())) console.log('  FAIL', r.failure()?.errorText, r.url().slice(0, 150));
  });
  page.removeAllListeners('console');

  await page.goto('https://city-bank-ca.netlify.app/', { waitUntil: 'networkidle2', timeout: 60000 });

  for (const wait of [3000, 5000, 10000]) {
    await new Promise((r) => setTimeout(r, wait));
    const s = await page.evaluate(() => {
      const host = document.querySelector('.cf-turnstile-host');
      return {
        hostHTML: host ? host.innerHTML.slice(0, 400) : null,
        widgetIframes: host ? host.querySelectorAll('iframe').length : 0,
        responses: document.querySelectorAll('input[name="cf-turnstile-response"]').length,
        respValue: (document.querySelector('input[name="cf-turnstile-response"]') || {}).value || '',
      };
    });
    console.log(`\n--- after ${wait}ms ---`);
    console.log(JSON.stringify(s, null, 2));
  }

  await browser.close();
})();
