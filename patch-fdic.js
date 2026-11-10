/*
 * Additive fix (homepage only): render the FDIC badge next to the Citi logo,
 * matching citi.com's responsive geometry:
 *   >= 991px : 427x32, margin 30/40, sprite crop -20,-173
 *   651-990  : 427x32, margin 24/30, sprite crop -20,-173
 *   <= 650   : 270x44, margin 11/12, sprite crop -20,-256
 * The real homepage gets this from the fdiceligibility API (CORS-blocked in a
 * local mirror), so we insert the same DOM the Angular component would build.
 * The contact-us page on the real site has no FDIC badge, so it is not added there.
 */
const fs = require('fs');
const path = require('path');

const STYLE = `
<style id="mirror-fdic-style">
/* FDIC badge next to Citi logo (same responsive geometry as citi.com) */
#fdicDiv{display:flex;align-items:flex-start}
#fdicLogoA{display:block;border:0;max-width:none;object-fit:none;object-position:-20px -173px;width:427px;height:32px;margin-top:30px;margin-left:40px}
@media (max-width:990px){#fdicLogoA{margin-top:24px;margin-left:30px}}
@media (max-width:650px){#fdicLogoA{object-position:-20px -256px;width:270px;height:44px;margin-top:11px;margin-left:12px}}
@media (max-width:425px){#fdicDiv{align-items:center;position:relative;top:-4px}}
</style>
`;

const SCRIPT = `
<script id="mirror-fdic-fix">
(function(){
  var SPRITE="/content/dam/cfs/mobile/assets/CBOL/IA/Angular/assets/Citi_Icon_Sprite_Banner_v2.svg";
  function addFdic(){
    var jl=document.querySelector('.journeyLogo');
    if(!jl) return;
    if(jl.querySelector('#fdicDiv')) return;
    var d=document.createElement('div');
    d.id='fdicDiv';
    var a=document.createElement('a');
    a.setAttribute('role','presentation');
    a.id='fdicFocusUrl';
    a.tabIndex=0;
    var img=document.createElement('img');
    img.id='fdicLogoA';
    img.alt='Citi FDIC Insured';
    img.src=SPRITE;
    a.appendChild(img);
    d.appendChild(a);
    jl.appendChild(d);
  }
  addFdic();
  /* keep it present even if Angular re-renders the banner during hydration */
  setInterval(addFdic, 500);
})();
</script>
`;

const MAIN = path.join(process.cwd(), 'public', 'index.html');
const OTHERS = [path.join(process.cwd(), 'public', 'US', 'ag', 'contactus', 'index.html')];

// ---- homepage: install style + script ----
if (fs.existsSync(MAIN)) {
  let html = fs.readFileSync(MAIN, 'utf8');
  const styleRe = /<style id="mirror-fdic-style">[\s\S]*?<\/style>\n?/;
  if (styleRe.test(html)) html = html.replace(styleRe, STYLE.trim() + '\n');
  else {
    const i = html.lastIndexOf('</head>');
    if (i !== -1) html = html.slice(0, i) + STYLE + html.slice(i);
  }
  const scriptRe = /<script id="mirror-fdic-fix">[\s\S]*?<\/script>\n?/;
  if (scriptRe.test(html)) html = html.replace(scriptRe, SCRIPT.trim() + '\n');
  else {
    const i = html.lastIndexOf('</body>');
    if (i !== -1) html = html.slice(0, i) + SCRIPT + html.slice(i);
  }
  fs.writeFileSync(MAIN, html);
  console.log('homepage FDIC badge installed');
}

// ---- other pages: make sure no FDIC badge is injected ----
for (const fp of OTHERS) {
  if (!fs.existsSync(fp)) continue;
  let html = fs.readFileSync(fp, 'utf8');
  const before = html;
  html = html.replace(/<style id="mirror-fdic-style">[\s\S]*?<\/style>\n?/g, '');
  html = html.replace(/<script id="mirror-fdic-fix">[\s\S]*?<\/script>\n?/g, '');
  if (html !== before) { fs.writeFileSync(fp, html); console.log('removed FDIC blocks (not on real page):', path.relative(process.cwd(), fp)); }
  else console.log('no FDIC blocks:', path.relative(process.cwd(), fp));
}
