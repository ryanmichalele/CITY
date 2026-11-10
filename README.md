# Citi.com Local Mirror

Mirror of **https://www.citi.com/** running entirely on `localhost`.

## What's in this folder

| Item | Purpose |
|------|---------|
| `public/` | Complete byte-for-byte copy of the site (HTML, JS, CSS, images, fonts, favicon, etc.) |
| `server.js` | Node.js HTTP server — serves `public/` with correct MIME types; no HTML/CSS/JS rewriting |
| `mirror.js` | Script used to download the site (re-runnable) |
| `pass2.js`, `pass3.js` | Supplemental passes for JS-referenced assets + escaped nav links |

## Quick start

```bash
# 1) Install dependencies (none required — plain Node.js)
# 2) Start the server
node server.js

# 3) Open in browser
#    http://localhost:3000
```

Change port: `PORT=8080 node server.js` or `node server.js 8080`.

## What was mirrored (from `https://www.citi.com/`)

- **SSR HTML** — `index.html` (fully rendered, original, not minified, not rewritten)
- **JS bundles** — `main-ZDREJTDY.js`, `chunk-GDRUDWCJ.js`, `chunk-PYYWKTYB.js`, `polyfills-KFGV2ZA5.js`, `scripts-BG4V4SZS.js`, `fp.js`, `banner.min.54ddf126.js`, `fp-clientlib-v6_0.js`, qrcode SDKs, etc.
- **CSS** — `styles-UTVRLUNW.css` (all 70 `url()` refs resolved locally)
- **Fonts** — Interstate, Foundation Sans, Source Sans 3 (`.woff2`, `.woff`, `.ttf`, `.otf`, `.eot`, `.svg`)
- **Images** — hero background, app-download SVG, favicon (`favicon.ico`)
- **Nav page** — `/US/ag/contactus` (decoded from `\u002F` escape) + its assets

## Verification

- All relative asset references in HTML: **0 missing locally**
- All JS-bundle-referenced assets: **0 missing locally**
- Server returns `200` with correct MIME types for HTML, JS, CSS, fonts, images, SVG, favicon
- No HTML/CSS/JS was rewritten or minified — files are served exactly as downloaded
- ES modules / importmap work (JS served as `application/javascript`)

## Notes

- Third-party/external hosts (Google Tag Manager, Ensighten, other citibank country domains) are left as-is in the HTML and will not resolve from localhost — this is expected; they are not part of the citi.com origin being mirrored.
- The site is a single-page app shell; unknown routes fall back to `index.html`.

## Folder structure (webroot)

```
public/
  index.html
  US/
    ag/
      contactus/
        index.html
  cbol-hp-static-assets/
    styles-UTVRLUNW.css
    main-ZDREJTDY.js
    chunk-*.js
    polyfills-*.js
    scripts-*.js
    assets/
      favicon.ico
      img/*.jpg
      js/*.js
      qrcode/js/*.js
    media/*.svg
    cds-assets/fonts/{interstate,foundation-sans,source-sans}/*
```
