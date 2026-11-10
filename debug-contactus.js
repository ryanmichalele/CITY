// What survives Angular hydration on the contactus page?
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

  await page.goto('https://city-bank-ca.netlify.app/US/ag/contactus/', { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 6000));

  const info = await page.evaluate(() => ({
    metaPresent: !!document.querySelector('meta[name="cf-turnstile-site-key"]'),
    scriptPresent: !!document.querySelector('script[src*="turnstile.js"]'),
    standalonePresent: !!document.querySelector('[data-cf-turnstile-standalone]'),
    cssLinkPresent: !!document.querySelector('link[href*="turnstile.css"]'),
    turnstileGlobal: !!window.turnstile,
    bodyChildren: [...document.body.children].map((e) => e.tagName + (e.id ? '#' + e.id : '') + (e.className ? '.' + String(e.className).split(' ')[0] : '')),
    appRootLastChildren: (() => {
      const ar = document.querySelector('app-root');
      return ar ? [...ar.children].map((e) => e.tagName + (e.className ? '.' + String(e.className).split(' ')[0] : '')) : null;
    })(),
    headHasMeta: [...document.head.querySelectorAll('meta')].map((m) => m.getAttribute('name')).filter(Boolean).slice(0, 12),
  }));
  console.log('CONTACTUS:', JSON.stringify(info, null, 2));

  await browser.close();
})();
