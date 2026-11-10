const puppeteer = require('C:/Users/SAM/node_modules/puppeteer');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  page.on('framenavigated', (f) => { if (f === page.mainFrame()) console.log('  NAV ->', f.url()); });
  console.log('goto /dashboard/');
  const resp = await page.goto('https://city-bank-ca.netlify.app/dashboard/', { waitUntil: 'networkidle2', timeout: 60000 });
  console.log('  initial url:', page.url(), 'status:', resp.status());
  await new Promise((r) => setTimeout(r, 4000));
  console.log('  after 4s url:', page.url());
  console.log('  title:', await page.title());
  const info = await page.evaluate(() => ({
    hasDashboard: !!document.querySelector('.bank-header, .dashboard-page'),
    hasAppForm: !!document.querySelector('#app-form'),
    forms: document.querySelectorAll('form').length,
    bodyStart: (document.body.innerHTML || '').slice(0, 120).replace(/\s+/g, ' '),
  }));
  console.log('  ', JSON.stringify(info));
  await browser.close();
})();
