// Final production screenshots of the live dashboard
const puppeteer = require('C:/Users/SAM/node_modules/puppeteer');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const DRAFT = require('./draft-fixture.js');

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.evaluateOnNewDocument((d) => { try { sessionStorage.setItem('citi-application-draft-v1', JSON.stringify(d)); } catch (e) {} }, DRAFT);
  await page.goto('https://city-bank-ca.netlify.app/dashboard/', { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 5000));
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: 'live-dashboard.png' });
  console.log('saved live-dashboard.png');
  await browser.close();
})();
