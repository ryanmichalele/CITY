/*
 * Capture the real citi.com homepage banner payload + rendered image slots.
 * Runs several fresh (cookie-less) sessions to detect whether the campaign
 * variant is stable or rotating, then compares the local mirror against the
 * captured variant.
 *
 * Usage: node capture-align.js
 */
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT = path.join(process.cwd(), 'captured-state');
fs.mkdirSync(OUT, { recursive: true });

const RUNS = 3;

function collector() {
  const out = [];
  for (const img of document.querySelectorAll('img')) {
    const r = img.getBoundingClientRect();
    if (r.width < 40 || r.height < 20) continue;
    const cs = getComputedStyle(img);
    out.push({
      file: (img.currentSrc || img.src || '').split('/').pop().split('?')[0],
      alt: (img.alt || '').replace(/\s+/g, ' ').trim(),
      left: Math.round(r.left),
      top: Math.round(r.top + window.scrollY),
      w: Math.round(r.width),
      h: Math.round(r.height),
      fit: cs.objectFit,
      pos: cs.objectPosition
    });
  }
  out.sort((a, b) => a.top - b.top || a.left - b.left);
  return out;
}

async function waitRender(page) {
  try { await page.goto('https://www.citi.com/', { waitUntil: 'networkidle2', timeout: 60000 }); } catch (e) {}
  await new Promise(r => setTimeout(r, 9000));
  await page.evaluate(async () => {
    const h = document.body.scrollHeight;
    for (let y = 0; y < h; y += 700) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 130)); }
    window.scrollTo(0, 0);
    await new Promise(r => setTimeout(r, 900));
  });
  await new Promise(r => setTimeout(r, 1500));
}

(async () => {
  const results = [];
  for (let run = 0; run < RUNS; run++) {
    const browser = await puppeteer.launch({
      executablePath: CHROME, headless: 'new',
      args: ['--no-sandbox', '--disable-gpu']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 1200 });

    let payload = null;
    page.on('response', async resp => {
      if (!/marketing\/offers\/banner/.test(resp.url())) return;
      try { payload = await resp.text(); } catch (e) {}
    });

    await waitRender(page);
    const images = await page.evaluate(collector);

    let meta = null;
    if (payload) {
      fs.writeFileSync(path.join(OUT, 'align-run-' + run + '.json'), payload);
      const j = JSON.parse(payload);
      const reqs = JSON.parse(j.contentResponse.contentRequest).marketingRequests;
      const mbr = j.contentResponse.marketingBannerResponses;
      meta = {
        requests: reqs.map(r => r.moduleType + ':' + r.contentId),
        responses: mbr.map(r => r.moduleType + ':' + r.contentId),
        hero: (() => {
          const h = mbr.find(r => r.moduleType === 'hero-one');
          if (!h) return '';
          const m = (h.cmsContent.match(/([A-Za-z0-9_]+\.(?:png|jpg|jpeg))/g) || []);
          return m.join(',');
        })()
      };
    }
    fs.writeFileSync(path.join(OUT, 'align-run-' + run + '-images.json'), JSON.stringify(images, null, 2));
    results.push({ run, meta, images });
    console.log('\n===== REAL RUN ' + run + ' =====');
    if (meta) {
      console.log('requests : ' + meta.requests.join(' | '));
      console.log('responses: ' + meta.responses.join(' | '));
      console.log('hero imgs: ' + meta.hero);
    } else {
      console.log('no banner payload captured!');
    }
    console.log('content images (' + images.length + '):');
    images.forEach(i => console.log('  ' + i.left + ',' + i.top + ' ' + i.w + 'x' + i.h + '  ' + i.file));
    await page.close();
    await browser.close();
  }

  const sig = r => r.meta ? r.meta.responses.join('|') : 'none';
  const stable = results.every(r => sig(r) === sig(results[0]));
  console.log('\n================ SUMMARY ================');
  results.forEach(r => console.log('run ' + r.run + ': ' + sig(r)));
  console.log('variant stable across fresh sessions: ' + stable);
  console.log('captured payloads: captured-state/align-run-*.json');

  // Save the first captured payload as the mirror payload
  if (results[0].meta) {
    fs.mkdirSync(path.join(process.cwd(), 'mirror-api'), { recursive: true });
    fs.copyFileSync(path.join(OUT, 'align-run-0.json'), path.join(process.cwd(), 'mirror-api', 'marketing-offers-banner.json'));
    console.log('mirror payload updated from run 0');
  }
})().catch(e => { console.error('FATAL', e); process.exit(1); });
