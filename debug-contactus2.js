// Trace what happens on the contactus page: navigation + when our head elements disappear
const puppeteer = require('C:/Users/SAM/node_modules/puppeteer');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  page.removeAllListeners('console');

  page.on('framenavigated', (f) => { if (f === page.mainFrame()) console.log('  NAV ->', f.url()); });

  await page.goto('https://city-bank-ca.netlify.app/US/ag/contactus/', { waitUntil: 'domcontentloaded', timeout: 60000 });

  for (const label of ['domcontentloaded+0.5s', '+2s', '+5s']) {
    await new Promise((r) => setTimeout(r, label === 'domcontentloaded+0.5s' ? 500 : label === '+2s' ? 2000 : 5000));
    const s = await page.evaluate(() => ({
      url: location.pathname,
      scriptTag: !!document.querySelector('script[src*="turnstile.js"]'),
      cssLink: !!document.querySelector('link[href*="turnstile.css"]'),
      meta: !!document.querySelector('meta[name="cf-turnstile-site-key"]'),
      tsGlobal: !!window.turnstile,
      standalone: !!document.querySelector('[data-cf-turnstile-standalone]'),
      title: document.title,
    }));
    console.log(label, JSON.stringify(s));
  }

  // Also check the raw response we were served
  const resp = await page.goto('https://city-bank-ca.netlify.app/US/ag/contactus/', { waitUntil: 'domcontentloaded' });
  const html = await resp.text();
  console.log('\nserved status:', resp.status(), 'bytes:', html.length);
  console.log('has ssr-state currentRoute:', (html.match(/"currentRoute":"[^"]*"/) || [])[0]);

  await browser.close();
})();
