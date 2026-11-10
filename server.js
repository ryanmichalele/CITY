/*
 * Local HTTP server for the mirrored citi.com site.
 * Serves files from ./public with correct MIME types so ES modules / importmap work.
 * No HTML/CSS/JS is rewritten — files are served byte-for-byte as mirrored.
 *
 * Usage: node server.js [port]
 * Then open: http://localhost:<port>
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT || process.argv[2] || 3000);
const ROOT = path.join(process.cwd(), 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.cjs': 'application/javascript',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.manifest': 'application/manifest+json',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.eot': 'application/vnd.ms-fontobject',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
  '.map': 'application/json'
};

function mimeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME[ext] || 'application/octet-stream';
}

function send(res, status, body, type) {
  res.writeHead(status, {
    'Content-Type': type,
    'Cache-Control': 'no-cache',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(body);
}

function tryFile(res, filePath) {
  if (!fs.existsSync(filePath)) return false;
  const stat = fs.statSync(filePath);
  if (stat.isDirectory()) return false;
  const stream = fs.createReadStream(filePath);
  res.writeHead(200, {
    'Content-Type': mimeFor(filePath),
    'Cache-Control': 'no-cache',
    'Access-Control-Allow-Origin': '*'
  });
  stream.pipe(res);
  stream.on('error', () => {
    if (!res.writableEnded) send(res, 500, 'Internal Server Error', 'text/plain');
  });
  return true;
}

function resolveFile(reqUrl) {
  // strip query string
  let pathname = reqUrl.split('?')[0];
  // decode %2F etc.
  try { pathname = decodeURIComponent(pathname); } catch { }
  // split into segments and rebuild under ROOT (Windows-safe, avoids
  // path.normalize('/') turning into an absolute backslash)
  const segs = pathname.split(/[\\/]+/).filter(Boolean);
  let target = ROOT;
  for (const s of segs) {
    if (s === '..' || s === '.') continue; // block traversal
    target = path.join(target, s);
  }
  const candidates = [
    target,
    path.join(target, 'index.html')
  ];
  // final safety: resolved path must stay within ROOT
  const valid = candidates.filter(c => {
    const rel = path.relative(ROOT, c);
    return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
  });
  return valid.length ? valid : null;
}

const server = http.createServer((req, res) => {
  const candidates = resolveFile(req.url);
  if (!candidates) {
    return send(res, 403, 'Forbidden', 'text/plain');
  }
  // try exact file, then directory/index.html, then SPA fallback to root index.html
  let served = false;
  for (const cp of candidates) {
    if (tryFile(res, cp)) { served = true; break; }
  }
  if (!served) {
    // Only fall back to index.html for extension-less routes (client-side routing).
    // For missing assets (e.g. *.js/*.css/*.png) return a real 404 so the browser
    // does not receive HTML where it expects JS/CSS/images.
    const pathname = req.url.split('?')[0];
    const last = pathname.split('/').pop();
    const hasExt = last.includes('.');
    if (!hasExt) {
      const fallback = path.join(ROOT, 'index.html');
      if (tryFile(res, fallback)) return;
    }
    send(res, 404, 'Not Found', 'text/plain');
  }
});

server.listen(PORT, () => {
  console.log(`Citi mirror server running at http://localhost:${PORT}`);
  console.log(`Serving webroot: ${ROOT}`);
});
