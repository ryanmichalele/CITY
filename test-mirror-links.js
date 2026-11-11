// Verify every banking link stays on the mirror and Register/Activate/Open-an-Account open the local form
const puppeteer = require('C:/Users/SAM/node_modules/puppeteer');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = process.argv[2] || 'http://localhost:3111';

const OFFSITE = /^(?:[a-z0-9-]+\.)*(?:citi|citibank|citigroup)\.com$/i;
const KW = /register|activat|create an account|open an account/i;

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
  let fails = 0;

  for (const vp of [
    { name: 'DESKTOP 1440', width: 1440, height: 900, mobile: false },
    { name: 'MOBILE 390', width: 390, height: 844, mobile: true },
  ]) {
    const page = await browser.newPage();
    await page.setViewport({ width: vp.width, height: vp.height, isMobile: vp.mobile, hasTouch: vp.mobile });
    page.removeAllListeners('console');
    await page.goto(BASE + '/', { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise((r) => setTimeout(r, 5000));

    // open every nav/menu panel that is present
    await page.evaluate(() => {
      document.querySelectorAll('a, button').forEach((b) => {
        const s = ((b.id || '') + ' ' + (b.className || '') + ' ' + (b.getAttribute('aria-label') || '')).toLowerCase();
        if (/mobilemenu|hamburger|menulink|menutoggle/.test(s)) { try { b.click(); } catch (e) {} }
      });
    });
    await new Promise((r) => setTimeout(r, 2500));

    const audit = await page.evaluate(() => {
      const off = [];
      const form = [];
      let scanned = 0;
      document.querySelectorAll('a').forEach((a) => {
        const href = a.getAttribute('href') || '';
        const text = (a.innerText || a.textContent || '').replace(/\s+/g, ' ').trim();
        scanned++;
        let host = '';
        const m = href.match(/^https?:\/\/([^/?#]+)/i);
        if (m) host = m[1].toLowerCase();
        if (host && /^(?:[a-z0-9-]+\.)*(?:citi|citibank|citigroup)\.com$/i.test(host)) {
          off.push({ text: text.slice(0, 40), href: href.slice(0, 80), id: a.id || '' });
        }
        if (/register|activat|create an account|open an account/i.test(text) && href.indexOf('/account-application') !== -1) {
          form.push({ text: text.slice(0, 40), href: href.slice(0, 70), id: a.id || '' });
        }
      });
      return { scanned, off, form };
    });

    console.log(`\n########## ${vp.name} ##########`);
    console.log(`  anchors scanned: ${audit.scanned}`);
    console.log(`  STILL POINTING AT THE REAL SITE: ${audit.off.length}`);
    audit.off.forEach((o) => console.log(`     ! id="${o.id}" text="${o.text}" href="${o.href}"`));
    if (audit.off.length) fails++;

    console.log(`  routed to the local form: ${audit.form.length}`);
    audit.form.forEach((f) => console.log(`     -> id="${f.id}" text="${f.text}" href="${f.href}"`));
    await page.close();
  }

  // ---- functional click test: each keyword link must open our form ----
  console.log('\n########## CLICK BEHAVIOUR ##########');
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  page.removeAllListeners('console');
  await page.goto(BASE + '/', { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 5000));

  const targets = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('a').forEach((a) => {
      const text = (a.innerText || a.textContent || '').replace(/\s+/g, ' ').trim();
      if (/register|activate|create an account|open an account/i.test(text)) {
        out.push({ text: text.slice(0, 40), href: a.getAttribute('href') || '', id: a.id || '' });
      }
    });
    return out;
  });
  const uniq = [];
  const seen = new Set();
  targets.forEach((t) => { const k = t.text + '|' + t.href; if (!seen.has(k)) { seen.add(k); uniq.push(t); } });

  for (const t of uniq.slice(0, 8)) {
    const p2 = await browser.newPage();
    await p2.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    p2.removeAllListeners('console');
    await p2.goto(BASE + '/', { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise((r) => setTimeout(r, 4500));
    const clicked = await p2.evaluate((id, text) => {
      const el = id
        ? document.getElementById(id)
        : [...document.querySelectorAll('a')].find((a) => (a.innerText || '').trim().startsWith(text));
      if (!el) return 'NOT FOUND';
      el.click();
      return 'clicked';
    }, t.id, t.text);
    await new Promise((r) => setTimeout(r, 3000));
    const url = p2.url();
    const onForm = url.indexOf('/account-application') !== -1;
    const mode = /mode=activate/.test(url) ? 'activate' : (onForm ? 'register' : '-');
    const offsite = /citi\.com|citibank\.com/i.test(url);
    const ok = onForm && !offsite;
    if (!ok) fails++;
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  "${t.text}" (${clicked}) -> ${url.replace(BASE, '')}  [mode=${mode}]`);
    await p2.close();
  }

  await browser.close();
  console.log('\n================================');
  console.log(fails === 0 ? 'ALL LINK CHECKS PASSED' : `${fails} LINK CHECK(S) FAILED`);
})();
