/*
 * Additive fix: make every Citi-hosted image resolve to the local mirror.
 * The pages build some image URLs from remote hosts (www.citi.com /
 * aemapi.citi.com / online.citi.com); this rewrites those URLs to
 * root-relative local paths, so images load from disk in exactly the same
 * slots. Nothing else on the page is modified.
 */
const fs = require('fs');
const path = require('path');

const SCRIPT = `
<script id="mirror-local-images">
(function () {
  var HOSTS = '(?:aemapi|www|online)\\\\.citi\\\\.com';
  var PATHS = '(?:content\\\\/dam|cbol-hp-static-assets|commonui-assets|US\\\\/nga)';
  var RE = new RegExp('^https?://' + HOSTS + '(/(' + PATHS + ')/.*)$', 'i');
  var RE_G = new RegExp('https?://' + HOSTS + '(/(?:' + PATHS + ')/)', 'gi');
  function local(u) {
    if (!u) return u;
    var m = String(u).match(RE);
    return m ? m[1] : u;
  }
  function fixSrcset(v) { return String(v).replace(RE_G, '$1'); }
  function fixImg(img) {
    try {
      var s = img.getAttribute('src');
      if (s) { var l = local(s); if (l !== s) img.setAttribute('src', l); }
      var d = img.getAttribute('data-src');
      if (d) { var ld = local(d); if (ld !== d) img.setAttribute('data-src', ld); }
      var ss = img.getAttribute('srcset');
      if (ss) { var ns = fixSrcset(ss); if (ns !== ss) img.setAttribute('srcset', ns); }
      var dss = img.getAttribute('data-srcset');
      if (dss) { var nd = fixSrcset(dss); if (nd !== dss) img.setAttribute('data-srcset', nd); }
    } catch (e) {}
  }
  function scan(root) {
    if (!root || root.nodeType !== 1) return;
    if (root.tagName === 'IMG') fixImg(root);
    if (root.querySelectorAll) {
      var imgs = root.querySelectorAll('img');
      for (var i = 0; i < imgs.length; i++) fixImg(imgs[i]);
      var all = root.querySelectorAll('[style*="background"]');
      for (var j = 0; j < all.length; j++) {
        var bg = all[j].style && all[j].style.backgroundImage;
        if (bg && /citi\\.com/i.test(bg)) all[j].style.backgroundImage = bg.replace(RE_G, '$1');
      }
    }
  }
  scan(document.documentElement);
  new MutationObserver(function (muts) {
    for (var i = 0; i < muts.length; i++) {
      var m = muts[i];
      if (m.type === 'attributes' && m.target && m.target.tagName === 'IMG') fixImg(m.target);
      else if (m.type === 'childList') {
        for (var j = 0; j < m.addedNodes.length; j++) scan(m.addedNodes[j]);
      }
    }
  }).observe(document.documentElement, {
    subtree: true, childList: true,
    attributes: true, attributeFilter: ['src', 'srcset', 'data-src', 'data-srcset']
  });
})();
</script>
`;

const targets = [
  'public/index.html',
  path.join('public', 'US', 'ag', 'contactus', 'index.html')
];

for (const rel of targets) {
  const fp = path.join(process.cwd(), rel);
  if (!fs.existsSync(fp)) { console.log('skip missing:', rel); continue; }
  let t = fs.readFileSync(fp, 'utf8');
  const scriptRe = /<script id="mirror-local-images">[\s\S]*?<\/script>\n?/;
  if (scriptRe.test(t)) {
    t = t.replace(scriptRe, SCRIPT.trim() + '\n');
    fs.writeFileSync(fp, t);
    console.log('updated local image rewriter:', rel);
    continue;
  }
  const idx = t.lastIndexOf('</body>');
  if (idx === -1) { console.log('no </body>:', rel); continue; }
  t = t.slice(0, idx) + SCRIPT + t.slice(idx);
  fs.writeFileSync(fp, t);
  console.log('patched local image rewriter:', rel);
}
