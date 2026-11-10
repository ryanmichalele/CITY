/*
 * Tiny mock of the Citi dev API the mirrored homepage talks to.
 *
 * The mirrored Angular app decides it is on a dev host (localhost) and POSTs
 * its homepage campaign request to:
 *   http://localhost:7878/gcgapi/dev3/api/v1/marketing/offers/banner
 *
 * Serving the captured response from the real citi.com homepage here makes the
 * mirror render exactly the same homepage content (text + images) as the real
 * site, without touching any HTML.
 *
 * Usage: node mock-api.js [port]
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.API_PORT || process.argv[2] || 7878);
const BODY_FILE = path.join(__dirname, 'mirror-api', 'marketing-offers-banner.json');

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Max-Age': '86400'
};

function json(res, status, body) {
  res.writeHead(status, Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' }, CORS));
  res.end(body);
}

const server = http.createServer((req, res) => {
  const pathname = req.url.split('?')[0];

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS);
    return res.end();
  }

  if (pathname === '/gcgapi/dev3/api/v1/marketing/offers/banner' ||
      pathname === '/gcgapi/prod/api/v1/marketing/offers/banner') {
    if (!fs.existsSync(BODY_FILE)) return json(res, 500, JSON.stringify({ error: 'captured banner payload missing' }));
    return json(res, 200, fs.readFileSync(BODY_FILE));
  }

  json(res, 404, JSON.stringify({ error: 'not found', path: pathname }));
});

server.listen(PORT, () => {
  console.log('Mock Citi dev API running at http://localhost:' + PORT);
  console.log('Banner payload: ' + BODY_FILE);
});
