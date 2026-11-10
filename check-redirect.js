// Does the ORIGINAL contactus page (no turnstile markup) also redirect away?
const puppeteer = require('C:/Users/SAM/node_modules/puppeteer');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const URL = process.argv[2];

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  page.removeAllListeners('console');
  page.on('framenavigated', (f) => { if (f === page.mainFrame()) console.log('  NAV ->', f.url().slice(0, 110)); });
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 5000));
  console.log('  final url :', page.url().slice(0, 110));
  console.log('  title     :', await page.title());
  await browser.close();
})();
