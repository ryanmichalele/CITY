/*
 * Citi.com site mirror
 * - Downloads SSR HTML + all assets (JS/CSS/images/fonts/video/PDF/favicon/manifest)
 * - Places files at exact URL-mapped paths under ./public  (no HTML/CSS/JS rewriting)
 * - Crawls same-origin HTML pages found via <a> links (nav + content)
 * Usage: node mirror.js
 */
const fs = require('fs');
const path = require('path');

const BASE = 'https://www.citi.com';
const ROOT = path.join(process.cwd(), 'public'); // webroot
const CONCURRENCY = 4;
const MAX_PAGES = 120;
const DELAY_MS = 250;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

const visitedPages = new Set();
const pageQueue = [BASE + '/'];
const assetDone = new Set();
const assetPending = new Set();
const assetQueue = [];
const cssToProcess = [];
const errors = [];
let pagesMirrored = 0;

function sameOrigin(u) {
  try { return u.host === 'www.citi.com' || u.host === 'citi.com'; } catch { return false; }
}

function resolveUrl(base, ref) {
  try { return new URL(ref, base).href; } catch { return null; }
}

// Map a URL to a local file path under ./public
function urlToFilePath(urlStr) {
  let u;
  try { u = new URL(urlStr); } catch { return null; }
  if (!sameOrigin(u)) return null;
  let pathname = u.pathname || '/';
  if (pathname === '/') return path.join(ROOT, 'index.html');
  const last = pathname.split('/').pop();
  // asset with extension -> save as file
  if (last.includes('.')) return path.join(ROOT, pathname);
  // directory-ish page -> index.html inside that dir
  return path.join(ROOT, pathname, 'index.html');
}

function assetFilePath(urlStr) {
  let u;
  try { u = new URL(urlStr); } catch { return null; }
  if (!sameOrigin(u)) return null;
  const pathname = u.pathname || '/';
  return path.join(ROOT, pathname);
}

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function fetchBuffer(urlStr) {
  const res = await fetch(urlStr, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${urlStr}`);
  const ab = await res.arrayBuffer();
  return { buffer: Buffer.from(ab), contentType: res.headers.get('content-type') || '' };
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function normalizeAssetRef(ref) {
  // drop query/fragment for dedup but keep the URL for fetching (query may matter)
  return ref.split('#')[0];
}

// ---- HTML asset extraction (regex, no DOM rewrite) ----
const attrRe = /<(?:script|img|iframe|source|video|audio|track|object|embed|input)\b[^>]*?(?:src|href|data|poster)=["']([^"']+)["']/gi;
const linkRe = /<link\b[^>]*?href=["']([^"']+)["']/gi;
const srcsetRe = /srcset=["']([^"']+)["']/gi;
const dataSrcRe = /data-(?:src|href)=["']([^"']+)["']/gi;
const aRe = /<a\b[^>]*?href=["']([^"']+)["']/gi;

function extractFromHtml(html, pageUrl) {
  const assets = [];
  const links = [];
  const add = (ref) => {
    if (!ref) return;
    const abs = resolveUrl(pageUrl, ref);
    if (!abs) return;
    const u = new URL(abs);
    if (!sameOrigin(u)) return; // external (gtm, other citibank countries) -> leave in HTML
    assets.push(abs);
  };
  let m;
  const reList = [attrRe, linkRe, srcsetRe, dataSrcRe];
  for (const re of reList) {
    re.lastIndex = 0;
    while ((m = re.exec(html))) {
      if (re === srcsetRe) {
        // srcset: "url 1x, url 2x, ..." -> take URLs
        m[1].split(',').forEach(part => {
          const u = part.trim().split(/\s+/)[0];
          add(u);
        });
      } else {
        add(m[1]);
      }
    }
  }
  // page links for crawling
  aRe.lastIndex = 0;
  while ((m = aRe.exec(html))) {
    const abs = resolveUrl(pageUrl, m[1]);
    if (!abs) continue;
    const u = new URL(abs);
    if (!sameOrigin(u)) continue;
    const pathname = u.pathname || '/';
    // only crawl HTML-ish pages (no asset extensions)
    const last = pathname.split('/').pop();
    if (last.includes('.')) continue;
    links.push(abs);
  }
  return { assets, links };
}

// CSS url() extraction
const cssUrlRe = /url\(['"]?([^'")\s]+)['"]?\)/gi;
function extractCssUrls(cssText, cssUrl) {
  const out = [];
  let m;
  cssUrlRe.lastIndex = 0;
  while ((m = cssUrlRe.exec(cssText))) {
    const abs = resolveUrl(cssUrl, m[1]);
    if (!abs) continue;
    const u = new URL(abs);
    if (!sameOrigin(u)) continue;
    out.push(abs);
  }
  return out;
}

async function downloadAsset(urlStr) {
  const key = normalizeAssetRef(urlStr);
  if (assetDone.has(key)) return;
  const fp = assetFilePath(urlStr);
  if (!fp) return;
  if (fs.existsSync(fp)) { assetDone.add(key); return; }
  try {
    const { buffer } = await fetchBuffer(urlStr);
    ensureDir(fp);
    fs.writeFileSync(fp, buffer);
    assetDone.add(key);
    process.stdout.write('.');
    // if css, queue its url() refs
    const ct = new URL(urlStr).pathname.toLowerCase();
    if (ct.endsWith('.css')) {
      const text = buffer.toString('utf8');
      for (const ref of extractCssUrls(text, urlStr)) {
        if (!assetDone.has(normalizeAssetRef(ref)) && !assetPending.has(normalizeAssetRef(ref))) {
          assetPending.add(normalizeAssetRef(ref));
          assetQueue.push(ref);
        }
      }
    }
  } catch (e) {
    errors.push({ url: urlStr, err: e.message });
    process.stdout.write('!');
  }
}

async function processAssetQueue() {
  const running = [];
  const enqueue = (url) => {
    const k = normalizeAssetRef(url);
    if (assetDone.has(k) || assetPending.has(k)) return;
    assetPending.add(k);
    assetQueue.push(url);
  };
  while (assetQueue.length > 0 || running.length > 0) {
    while (running.length < CONCURRENCY && assetQueue.length > 0) {
      const url = assetQueue.shift();
      const p = downloadAsset(url).then(() => {
        running.splice(running.indexOf(p), 1);
      });
      running.push(p);
    }
    if (running.length === 0) break;
    await Promise.race(running);
    await sleep(DELAY_MS / 2);
  }
}

async function crawlPages() {
  while (pageQueue.length > 0 && pagesMirrored < MAX_PAGES) {
    const running = [];
    const batch = pageQueue.splice(0, CONCURRENCY);
    for (const pageUrl of batch) {
      const key = pageUrl.split('#')[0];
      if (visitedPages.has(key)) continue;
      visitedPages.add(key);
      const p = (async () => {
        try {
          const { buffer, contentType } = await fetchBuffer(pageUrl);
          const isHtml = contentType.includes('text/html');
          const fp = urlToFilePath(pageUrl);
          if (!fp) return;
          ensureDir(fp);
          fs.writeFileSync(fp, buffer);
          pagesMirrored++;
          process.stdout.write(`[P${pagesMirrored}] `);
          if (isHtml) {
            const html = buffer.toString('utf8');
            const { assets, links } = extractFromHtml(html, pageUrl);
            for (const a of assets) enqueueAsset(a);
            for (const l of links) {
              if (!visitedPages.has(l.split('#')[0]) && !pageQueue.includes(l)) pageQueue.push(l);
            }
            // report nav-ish links count
          }
        } catch (e) {
          errors.push({ url: pageUrl, err: e.message });
          process.stdout.write('E');
        }
      })();
      running.push(p);
    }
    if (running.length) await Promise.all(running);
    await sleep(DELAY_MS);
    await processAssetQueue();
  }
}

function enqueueAsset(url) {
  const k = normalizeAssetRef(url);
  if (assetDone.has(k) || assetPending.has(k)) return;
  assetPending.add(k);
  assetQueue.push(url);
}

(async () => {
  if (!fs.existsSync(ROOT)) fs.mkdirSync(ROOT, { recursive: true });
  console.log('Starting mirror of', BASE);
  console.log('Webroot:', ROOT);
  await crawlPages();
  // final drain of any remaining css-discovered assets
  await processAssetQueue();

  console.log('\n\n=== MIRROR COMPLETE ===');
  console.log('Pages mirrored:', pagesMirrored);
  console.log('Assets downloaded:', assetDone.size);
  console.log('Errors:', errors.length);
  if (errors.length) {
    console.log('--- first 20 errors ---');
    errors.slice(0, 20).forEach(e => console.log(' ', e.url, '->', e.err));
  }
  console.log('Webroot contents:');
  listDir(ROOT, '');
})();

function listDir(dir, rel) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    const r = rel ? rel + '/' + e.name : e.name;
    if (e.isDirectory()) {
      console.log('  [dir] ' + r);
      listDir(full, r);
    } else {
      const sz = fs.statSync(full).size;
      console.log('  ' + r + ' (' + sz + ' bytes)');
    }
  }
}
