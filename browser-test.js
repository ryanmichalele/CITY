// Browser render check: desktop + mobile, console errors, failed requests, blank-screen detection
const puppeteer = require('C:/Users/SAM/node_modules/puppeteer');
const fs = require('fs');

const BASE = 'https://city-bank-ca.netlify.app';
const OUT = 'C:/Users/SAM/OneDrive/Desktop/citi-mirror';

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900, isMobile: false },
  { name: 'mobile', width: 390, height: 844, isMobile: true },
];

const PAGES = [
  { path: '/', name: 'home' },
  { path: '/dashboard/', name: 'dashboard' },
  { path: '/account-application/?mode=register', name: 'account-application' },
  { path: '/US/ag/contactus/', name: 'contactus' },
];

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });

  let totalIssues = 0;

  for (const vp of VIEWPORTS) {
    console.log(`\n########## ${vp.name.toUpperCase()} ${vp.width}x${vp.height} ##########`);

    for (const p of PAGES) {
      const page = await browser.newPage();
      await page.setViewport({
        width: vp.width,
        height: vp.height,
        isMobile: vp.isMobile,
        deviceScaleFactor: 1,
        hasTouch: vp.isMobile,
      });

      const consoleErrors = [];
      const pageErrors = [];
      const failedOurOrigin = [];
      const failedExternal = [];

      page.on('console', (m) => {
        if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 220));
      });
      page.on('pageerror', (e) => pageErrors.push(String(e.message).slice(0, 220)));
      page.on('requestfailed', (r) => {
        const rec = `${r.url().slice(0, 140)} :: ${r.failure()?.errorText}`;
        if (r.url().includes('city-bank-ca.netlify.app')) failedOurOrigin.push(rec);
        else failedExternal.push(rec);
      });
      page.on('response', (r) => {
        if (r.status() >= 400 && r.url().includes('city-bank-ca.netlify.app')) {
          failedOurOrigin.push(`HTTP ${r.status()} ${r.url().slice(0, 140)}`);
        }
      });

      await page.goto(BASE + p.path, { waitUntil: 'networkidle2', timeout: 60000 });
      await new Promise((r) => setTimeout(r, 2500));

      const m = await page.evaluate(() => {
        const body = document.body;
        const html = document.documentElement;
        const text = (body.innerText || '').trim();
        // detect "blank" = no visible text and no rendered content
        const hasContent = text.length > 0;
        const bodyH = body.scrollHeight;
        const docH = html.scrollHeight;
        // is CSS applied? check a known layout property on <html>
        const cs = getComputedStyle(html);
        const sheets = [...document.styleSheets].length;
        const imgs = [...document.images];
        const brokenImgs = imgs.filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.currentSrc || i.src);
        // horizontal overflow check
        const overflowX = docH && html.scrollWidth > html.clientWidth + 2 ? html.scrollWidth - html.clientWidth : 0;
        return {
          hasContent,
          textLen: text.length,
          bodyH,
          docH,
          sheets,
          cssApplied: cs.display !== 'inline' && cs.getPropertyValue('font-family') !== '',
          fontFamily: cs.getPropertyValue('font-family'),
          imgTotal: imgs.length,
          brokenImgs,
          overflowX,
          title: document.title,
          h1: (document.querySelector('h1')?.innerText || '').trim().slice(0, 70),
        };
      });

      const shot = `${OUT}/prod-${vp.name}-${p.name}.png`;
      await page.screenshot({ path: shot, fullPage: false });

      const ok =
        m.hasContent &&
        m.docH > 500 &&
        m.sheets > 0 &&
        m.brokenImgs.length === 0 &&
        failedOurOrigin.length === 0;

      if (!ok) totalIssues++;

      console.log(`\n--- ${vp.name} ${p.path} ---`);
      console.log(`  ${ok ? 'PASS' : 'FAIL'}  title="${m.title}" h1="${m.h1}"`);
      console.log(`  content: ${m.textLen} chars, docHeight=${m.docH}px, stylesheets=${m.sheets}, font=${m.fontFamily.slice(0, 40)}`);
      console.log(`  images: ${m.imgTotal} total, ${m.brokenImgs.length} broken${m.brokenImgs.length ? ' -> ' + m.brokenImgs.slice(0, 3).join(', ') : ''}`);
      console.log(`  horizontal overflow: ${m.overflowX}px`);
      console.log(`  failed requests (our origin): ${failedOurOrigin.length}${failedOurOrigin.length ? ' -> ' + failedOurOrigin.slice(0, 3).join(' | ') : ''}`);
      console.log(`  failed requests (external, expected for mirror): ${failedExternal.length}`);
      if (pageErrors.length) console.log(`  PAGE ERRORS: ${pageErrors.slice(0, 3).join(' | ')}`);
      if (consoleErrors.length) console.log(`  console errors: ${consoleErrors.slice(0, 3).join(' | ')}`);

      await page.close();
    }
  }

  await browser.close();
  console.log('\n================================');
  console.log(totalIssues === 0 ? 'ALL BROWSER CHECKS PASSED' : `${totalIssues} BROWSER CHECK(S) FAILED`);
})();
