// Debug: why is the Turnstile iframe not rendering?
const puppeteer = require('C:/Users/SAM/node_modules/puppeteer');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  page.on('pageerror', (e) => console.log('  PAGEERROR:', String(e.message).slice(0, 200)));
  page.removeAllListeners('console');

  await page.goto('https://city-bank-ca.netlify.app/', { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 6000));

  const info = await page.evaluate(() => {
    const host = document.querySelector('.cf-turnstile-host');
    const out = {
      hostExists: !!host,
      hostHTML: host ? host.innerHTML.slice(0, 600) : null,
      hostAttrs: host ? Array.from(host.attributes).map((a) => a.name + '=' + a.value.slice(0, 40)) : null,
      allIframes: [...document.querySelectorAll('iframe')].map((f) => f.src.slice(0, 130)),
      hasTurnstile: !!window.turnstile,
      tsKeys: window.turnstile ? Object.keys(window.turnstile) : null,
    };
    // try rendering manually into a fresh div to see the error
    try {
      const probe = document.createElement('div');
      probe.id = 'ts-probe';
      document.body.appendChild(probe);
      const id = window.turnstile.render(probe, {
        sitekey: '0x4AAAAAAF8BHWBUHTMJ25tK',
        callback: (t) => console.log('probe token', t),
        'error-callback': (e) => { window.__tsErr = e; },
      });
      out.probeId = id;
    } catch (e) {
      out.probeError = String(e.message);
    }
    return out;
  });
  console.log(JSON.stringify(info, null, 2));

  await new Promise((r) => setTimeout(r, 5000));
  const after = await page.evaluate(() => ({
    probeErr: window.__tsErr || null,
    probeHTML: (document.getElementById('ts-probe') || {}).innerHTML?.slice(0, 600),
    probeIframes: [...document.querySelectorAll('#ts-probe iframe')].map((f) => f.src.slice(0, 130)),
    allIframes: [...document.querySelectorAll('iframe')].map((f) => f.src.slice(0, 130)),
  }));
  console.log('\nAFTER:', JSON.stringify(after, null, 2));

  await browser.close();
})();
