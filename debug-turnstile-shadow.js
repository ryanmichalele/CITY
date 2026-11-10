// Confirm the Turnstile widget is really rendering (shadow DOM) and can produce a token
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

  await page.goto('https://city-bank-ca.netlify.app/', { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 8000));

  const info = await page.evaluate(() => {
    const host = document.querySelector('.cf-turnstile-host');
    const inner = host ? host.querySelector('div') : null;
    const shadow = inner ? inner.shadowRoot : null;
    let shadowIframes = 0;
    let shadowHTML = null;
    if (shadow) {
      shadowIframes = shadow.querySelectorAll('iframe').length;
      shadowHTML = shadow.innerHTML.slice(0, 300);
    }
    // find every widget id turnstile knows about
    const ids = [];
    if (window.turnstile && window.turnstile._private) {
      for (const k of Object.keys(window.turnstile._private)) {
        if (/widget/i.test(k)) { /* noop */ }
      }
    }
    // response inputs
    const respInputs = [...document.querySelectorAll('input[name="cf-turnstile-response"]')].map((i) => ({
      id: i.id, value: i.value ? 'TOKEN(' + i.value.length + ' chars)' : '',
    }));
    const r = host ? host.getBoundingClientRect() : null;
    return {
      hostRect: r ? { w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top) } : null,
      hasShadowRoot: !!shadow,
      shadowIframes,
      shadowHTML,
      respInputs,
      ids,
    };
  });
  console.log('HOME:', JSON.stringify(info, null, 2));

  // screenshot the sign-on panel area
  const el = await page.$('.cf-turnstile-host');
  if (el) {
    const box = await el.boundingBox();
    if (box) {
      await page.screenshot({ path: 'turnstile-widget.png', clip: { x: Math.max(0, box.x - 40), y: Math.max(0, box.y - 120), width: 420, height: 260 } });
      console.log('screenshot: turnstile-widget.png');
    }
  }

  await browser.close();
})();
