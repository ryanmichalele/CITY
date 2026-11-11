/* ============================================================================
 * Local dashboard preview
 * ----------------------------------------------------------------------------
 * Serves ./public on http://localhost:3111 with the customer session already
 * seeded, so the dashboard can be opened and reviewed WITHOUT filling the
 * 8-step account application form.
 *
 *   node preview-dashboard.js          -> http://localhost:3111/dashboard/
 *
 * This is a LOCAL DEVELOPMENT TOOL ONLY. It does not touch the deployed
 * site, does not modify any file in ./public, and the demo data it seeds is
 * clearly fictional sample data.
 * ========================================================================== */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = Number(process.env.PORT || process.argv[2] || 3111);
const ROOT = path.join(__dirname, 'public');

// Fictional demo customer — mirrors the shape produced by the real
// /account-application/app.js form so the dashboard renders every section.
const DEMO_DRAFT = {
  accountType: 'checking',
  personal: {
    firstName: 'Alex', middleName: 'R', lastName: 'Morgan',
    dob: '1990-04-12', ssnLast4: '1234',
    citizenship: 'us-citizen', ownership: 'individual',
  },
  contact: {
    email: 'alex.morgan@example.com', phone: '(212) 555-0147',
    street: '88 Pine Street', apt: 'Apt 12C',
    city: 'New York', state: 'NY', zip: '10004',
    country: 'US', mailingSame: 'yes', mailing: {},
  },
  employment: {
    status: 'employed', occupation: 'Senior Software Engineer',
    employer: 'Citi Digital Group', jobTitle: 'Senior Engineer',
    industry: 'Information Technology', income: '$100,000 – $149,999',
  },
  financial: {
    incomeSource: 'Salary / wages', sourceFunds: 'Employment income',
    monthlyDeposits: '$1,000 – $4,999', monthlyWithdrawals: 'Less than $1,000',
    purpose: 'Saving', activity: 'Moderate — regular deposits and payments',
  },
  tax: {
    usResident: 'yes', tinType: 'ssn', residencyCountry: '',
    certification: true, declarations: true,
  },
  agreements: {
    accepted: { daa: true, fees: true, privacy: true, econsent: true, funds: true, terms: true },
    signature: 'Alex Morgan', consent: true,
    acceptedAt: new Date().toISOString(), docVersion: '1.0',
  },
  meta: {
    submitted: true, status: 'approved',
    reference: 'APP-20261111-DEMO01',
    submittedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  ui: { step: 8, maxStep: 8 },
};

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript', '.mjs': 'application/javascript',
  '.json': 'application/json', '.ico': 'image/x-icon', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff': 'font/woff',
  '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf',
  '.eot': 'application/vnd.ms-fontobject', '.mp4': 'video/mp4',
  '.webm': 'video/webm', '.pdf': 'application/pdf', '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml', '.map': 'application/json',
};

// Seeds the demo customer session before the dashboard app boots.
const SEED_SCRIPT = `
<script>
(function () {
  try {
    sessionStorage.setItem('citi-application-draft-v1', ${JSON.stringify(JSON.stringify(DEMO_DRAFT))});
    sessionStorage.setItem('citi-dashboard-session-v1', JSON.stringify({
      reference: ${JSON.stringify(DEMO_DRAFT.meta.reference)},
      lastSignIn: new Date().toISOString(),
      device: 'Local preview',
      signedInAt: new Date().toISOString(),
    }));
  } catch (e) {}
})();
</script>
`;

function mimeFor(file) {
  return MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
}

function resolveFile(urlPath) {
  let pathname = urlPath.split('?')[0];
  try { pathname = decodeURIComponent(pathname); } catch (e) { /* */ }
  const segs = pathname.split(/[\\/]+/).filter(Boolean);
  let target = ROOT;
  for (const s of segs) {
    if (s === '..' || s === '.') continue;
    target = path.join(target, s);
  }
  const candidates = [target, path.join(target, 'index.html')];
  return candidates.filter((c) => {
    const rel = path.relative(ROOT, c);
    return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
  });
}

const server = http.createServer((req, res) => {
  const candidates = resolveFile(req.url);
  if (!candidates) { res.writeHead(403); return res.end('Forbidden'); }

  for (const file of candidates) {
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) continue;

    // Inject the demo session into the dashboard document.
    if (file.endsWith('.html')) {
      let html = fs.readFileSync(file, 'utf8');
      if (/dashboard\/index\.html$/.test(file) || /\/dashboard\//.test(req.url.split('?')[0])) {
        html = html.replace('<head>', '<head>' + SEED_SCRIPT);
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
      return res.end(html);
    }

    res.writeHead(200, { 'Content-Type': mimeFor(file), 'Cache-Control': 'no-cache' });
    return fs.createReadStream(file).pipe(res);
  }

  // SPA fallback for extension-less routes.
  const last = req.url.split('?')[0].split('/').pop();
  if (last && !last.includes('.')) {
    const fallback = path.join(ROOT, 'index.html');
    if (fs.existsSync(fallback)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(fs.readFileSync(fallback, 'utf8'));
    }
  }
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}/dashboard/`;
  console.log('');
  console.log('  Citi dashboard — local preview');
  console.log('  -------------------------------');
  console.log(`  ${url}`);
  console.log('');
  console.log('  Demo customer: Alex R Morgan (fictional sample data)');
  console.log('  Press Ctrl+C to stop.');
  console.log('');
  exec(`start "" "${url}"`);
});
