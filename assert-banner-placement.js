// Assert mirror homepage == the REAL citi.com capture (the session the config came from)
const puppeteer = require('C:/Users/SAM/node_modules/puppeteer');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const MIRROR = 'https://city-bank-ca.netlify.app/';

// ground truth captured from real citi.com (same session the banner config came from)
const EXPECTED = [
  { file: 'HP_20382_Hero.png', w: 320, h: 224, top: 234, alt: 'Earn 50,000 AAdvantage® bonus miles' },
  { file: 'HP_16036_AA_Family_3UP.jpg', w: 382, h: 220, top: 700, alt: 'Explore Citi® / AAdvantage® cards' },
  { file: 'HP_20384_3UP_Costco_Consumer.jpg', w: 382, h: 220, top: 700, alt: 'Your Favorite Store. Your Favorite Card.' },
  { file: 'HP_19881_Module_3UP.jpg', w: 382, h: 220, top: 700, alt: 'Open. Deposit. Earn $325.' },
  { file: 'HP_17586_Module_3UP_DP.jpg', w: 526, h: 296, top: 1208, alt: 'Great for Balance Transfers' },
  { file: 'HP_12213_Module.jpg', w: 526, h: 296, top: 1600, alt: 'Earn 2% Cash Back' },
  { file: 'HP_19886_GPA.png', w: 526, h: 526, top: 1991, alt: 'Earn more with Citi Premium Boost' },
];

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(MIRROR, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 4000));
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await new Promise((r) => setTimeout(r, 5000));
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise((r) => setTimeout(r, 2000));

  const actual = await page.evaluate(() => {
    const out = [];
    for (const img of document.querySelectorAll('img')) {
      const r = img.getBoundingClientRect();
      if (r.width < 50 || r.height < 50) continue;
      const src = img.currentSrc || img.src || '';
      if (!/banners\/images/.test(src)) continue;
      out.push({
        file: src.split('/').pop().split('?')[0],
        w: Math.round(r.width), h: Math.round(r.height),
        top: Math.round(r.top + window.scrollY),
        alt: (img.alt || '').replace(/\s+/g, ' ').trim().slice(0, 70),
        broken: img.complete && img.naturalWidth === 0,
      });
    }
    return out;
  });

  let fails = 0;
  console.log('slot | expected file                              | got file                                   | size | y-pos | alt');
  for (let i = 0; i < Math.max(EXPECTED.length, actual.length); i++) {
    const e = EXPECTED[i];
    const a = actual[i];
    if (!e || !a) { console.log(`[${i}] MISSING`); fails++; continue; }
    const fileOk = e.file === a.file;
    const sizeOk = Math.abs(e.w - a.w) <= 2 && Math.abs(e.h - a.h) <= 2;
    const posOk = Math.abs(e.top - a.top) <= 30;
    const altOk = a.alt.includes(e.alt.slice(0, 25));
    const imgOk = !a.broken;
    const ok = fileOk && sizeOk && posOk && altOk && imgOk;
    if (!ok) fails++;
    console.log(`${ok ? 'PASS' : 'FAIL'} [${i}] ${e.file.padEnd(40)} ${a.file.padEnd(40)} ${a.w}x${a.h} ${sizeOk ? 'ok' : 'BAD'} ${posOk ? 'ok' : 'BAD'} ${altOk ? 'ok' : 'BAD'} ${imgOk ? 'ok' : 'BROKEN'}`);
  }

  await page.screenshot({ path: 'homepage-desktop-final.png', fullPage: false });
  await page.evaluate(() => window.scrollTo(0, 700));
  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({ path: 'homepage-desktop-3up.png' });
  await page.close();

  await browser.close();
  console.log('\n================================');
  console.log(fails === 0 ? 'HOMEPAGE BANNER PLACEMENT MATCHES REAL citi.com EXACTLY' : `${fails} MISMATCH(ES)`);
})();
