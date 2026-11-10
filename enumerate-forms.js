// Enumerate forms / inputs on every live page
const puppeteer = require('C:/Users/SAM/node_modules/puppeteer');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const PAGES = [
  ['home', '/'],
  ['dashboard', '/dashboard/'],
  ['account-application', '/account-application/?mode=register'],
  ['contactus', '/US/ag/contactus/'],
];

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });

  for (const [name, path] of PAGES) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto('https://city-bank-ca.netlify.app' + path, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise((r) => setTimeout(r, 4000));
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await new Promise((r) => setTimeout(r, 3000));
    await page.evaluate(() => window.scrollTo(0, 0));
    await new Promise((r) => setTimeout(r, 1500));

    const data = await page.evaluate(() => {
      const forms = [...document.querySelectorAll('form')].map((f) => ({
        id: f.id || null,
        cls: (f.className || '').toString().slice(0, 60),
        inputs: f.querySelectorAll('input,select,textarea').length,
        submits: [...f.querySelectorAll('button[type=submit],input[type=submit],button:not([type])')]
          .map((b) => (b.innerText || b.value || '').trim().slice(0, 30)).slice(0, 5),
        visible: !!(f.offsetWidth || f.offsetHeight),
      }));
      const standaloneButtons = [...document.querySelectorAll('button')]
        .filter((b) => !b.closest('form'))
        .map((b) => ({ id: b.id || null, text: (b.innerText || '').trim().slice(0, 30) }))
        .slice(0, 10);
      return { forms, standaloneButtons, totalForms: document.querySelectorAll('form').length };
    });

    console.log(`\n===== ${name} (${path}) =====`);
    console.log('  total <form>:', data.totalForms);
    data.forms.forEach((f, i) => console.log(`   form[${i}] id=${f.id} cls="${f.cls}" visible=${f.visible} inputs=${f.inputs} submits=${JSON.stringify(f.submits)}`));
    if (data.standaloneButtons.length) console.log('   buttons outside forms:', JSON.stringify(data.standaloneButtons));
    await page.close();
  }
  await browser.close();
})();
