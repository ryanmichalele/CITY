/* ============================================================================
 * tracker-block.js — strips the third-party analytics/tracking that came along
 * with the mirrored Citi homepage.
 *
 * Why this file exists
 * --------------------
 * The mirrored page still contains Citi's own analytics wiring (Ensighten tag
 * manager -> Google Tag / DoubleClick, Adobe DTM + Audience Manager, ThreatMetrix
 * device fingerprinting, Qualtrics intercepts, LiveRamp/Amazon ad sync, consent
 * vendor). None of that is useful here, it only phones home to Citi/Google/Adobe
 * and it is what made the homepage hang for ~30s waiting on dead requests.
 *
 * How it works (and why it cannot break the page)
 * -----------------------------------------------
 * The page config (ssr-state: ensightenHost / tmx_url / crs_tmx_url) is left
 * EXACTLY as-is, so no code path ever sees an empty or invalid URL — that is
 * what previously threw "TypeError: Failed to construct 'URL': Invalid URL".
 * Instead we only refuse the outgoing requests to the tracker hosts. The app
 * keeps its strings, it just never reaches Google/Adobe/Ensighten.
 *
 * Must be the first script in <head> so the patches are in place before any
 * bundle (Ensighten bootstrap is injected by the Angular bundles at runtime).
 * ========================================================================== */
(function () {
  'use strict';

  if (window.__trackerBlockInstalled) return;
  window.__trackerBlockInstalled = true;

  /* Domains belonging to analytics / ad-tech / fingerprinting only.
   * Deliberately NOT blocked: challanges.cloudflare.com (Turnstile),
   * *.citi.com API hosts (needed by login/session), netlify.app, local assets. */
  var BLOCKED = /(^|\.)(googletagmanager\.com|google-analytics\.com|googleoptimize\.com|googlesyndication\.com|googleadservices\.com|doubleclick\.net|2mdn\.net|ensighten\.com|adobedtm\.com|demdex\.net|omtrdc\.net|2o7\.net|everesttech\.net|online-metrix\.net|content22\.online\.citi\.com|00110\.citi\.com|qualtrics\.com|rlcdn\.com|amazon-adsystem\.com|privacymanager\.io|launchpad-wrapper\.privacymanager\.io|bluekai\.com|krxd\.net|adsrvr\.org|crwdcntrl\.net|tapad\.com|exelator\.com|agkn\.com|mathtag\.com|simpli\.fi|zeotap\.com|sitescout\.com|sc-static\.net|bat\.bing\.com|ads\.linkedin\.com|clarity\.ms|hotjar\.com|matomo\.cloud)$/i;

  /* CNAME-cloaked tag hosts used by the inherited measurement stack, e.g.
   * 1.a79ab95c1589a13f8a4cab612bc71f9f7.com/scripts/prod/crossdomain2.min.js */
  var CLOAKED_TAG_HOST = /^(\d+\.)?[0-9a-f]{16,}\.com$/i;

  /* Telemetry endpoints that sit on the otherwise needed citi.com API host. */
  var CITI_TELEMETRY_PATH = /\/(digital\/reporting|reporting|metrics)\//i;

  /* Citi's "Cedric" telemetry library: it spawns a blob: Web Worker, which no
   * prototype patch can reach, so the library itself is what gets stopped. */
  var CEDRIC_PATH = /\/cedric[\/._-]|cedric[_-]|\/cedric\.js/i;

  /* Legacy Citi fingerprint endpoint, kept for older configs that still embed
   * the full tags.js URL instead of only the origin. */
  var BLOCKED_CITI_TRACKER = /^https?:\/\/content22\.online\.citi\.com\//i;

  /* The mirror carries a broken tag URL: https://tagmanager1.undefined/... */
  var BROKEN_HOST = /^https?:\/\/[^/]*\.undefined(?::\d+)?(\/|$)/i;

  function hostOf(url) {
    try {
      return new URL(String(url), location.href).hostname.replace(/\.$/, '').toLowerCase();
    } catch (e) {
      return '';
    }
  }

  function isBlocked(url) {
    if (!url) return false;
    var s = String(url);
    if (s.indexOf('data:') === 0 || s.indexOf('blob:') === 0) return false;
    if (BLOCKED_CITI_TRACKER.test(s)) return true;
    if (BROKEN_HOST.test(s)) return true;
    if (CEDRIC_PATH.test(s)) return true;
    var h = hostOf(s);
    if (!h) return false;
    if (BLOCKED.test(h) || CLOAKED_TAG_HOST.test(h)) return true;
    if (/citi\.com$/i.test(h) && CITI_TELEMETRY_PATH.test(s)) return true;
    return false;
  }

  function urlOfNode(node) {
    if (!node || node.nodeType !== 1) return '';
    var tag = node.tagName;
    if (tag !== 'SCRIPT' && tag !== 'IMG' && tag !== 'IFRAME' && tag !== 'LINK' &&
        tag !== 'SOURCE' && tag !== 'EMBED' && tag !== 'OBJECT' && tag !== 'VIDEO' &&
        tag !== 'AUDIO' && tag !== 'TRACK') {
      return '';
    }
    try {
      return node.src || node.href || node.data ||
        (node.getAttribute && (node.getAttribute('src') || node.getAttribute('href') || node.getAttribute('data'))) ||
        '';
    } catch (e) {
      return '';
    }
  }

  /* ---- 1. DOM insertion (this is how Ensighten/gtag/Adobe are loaded) ---- */
  var hardenedFrames = typeof WeakSet === 'function' ? new WeakSet() : null;

  /* ThreatMetrix does not run in this window: it creates a hidden
   * about:blank iframe and injects its beacon scripts inside THAT document, so
   * patching only the top window would never see them. Same-origin iframes are
   * harmless to harden, and hardening happens before any script is written. */
  function hardenFrame(frame) {
    if (!frame || frame.tagName !== 'IFRAME') return;
    if (hardenedFrames) {
      if (hardenedFrames.has(frame)) return;
      hardenedFrames.add(frame);
    }
    try {
      var w = frame.contentWindow;
      if (!w || w === window) return;

      var NP = w.Node && w.Node.prototype;
      if (NP && !NP.__trackerBlocked) {
        NP.__trackerBlocked = true;
        var frameAppend = NP.appendChild;
        NP.appendChild = function (node) {
          if (isBlocked(urlOfNode(node))) return node;
          return frameAppend.call(this, node);
        };
        var frameInsert = NP.insertBefore;
        NP.insertBefore = function (node) {
          if (isBlocked(urlOfNode(node))) return node;
          return frameInsert.apply(this, arguments);
        };
        var frameReplace = NP.replaceChild;
        NP.replaceChild = function (node) {
          if (isBlocked(urlOfNode(node))) return node;
          return frameReplace.apply(this, arguments);
        };
      }

      var EP = w.Element && w.Element.prototype;
      if (EP && !EP.__trackerBlocked) {
        EP.__trackerBlocked = true;
        var frameSet = EP.setAttribute;
        EP.setAttribute = function (name, value) {
          if ((name === 'src' || name === 'href' || name === 'data') && isBlocked(value)) return;
          return frameSet.call(this, name, value);
        };
      }

      if (w.XMLHttpRequest && w.XMLHttpRequest.prototype && !w.XMLHttpRequest.prototype.__trackerBlocked) {
        var fXhrProto = w.XMLHttpRequest.prototype;
        fXhrProto.__trackerBlocked = true;
        var fOpen = fXhrProto.open;
        fXhrProto.open = function (method, url) {
          if (isBlocked(url)) { this.__trackerBlockedReq = true; return; }
          return fOpen.apply(this, arguments);
        };
        var fSend = fXhrProto.send;
        fXhrProto.send = function () {
          if (this.__trackerBlockedReq) return;
          return fSend.apply(this, arguments);
        };
      }

      if (typeof w.fetch === 'function' && !w.fetch.__trackerBlocked) {
        var fFetch = w.fetch;
        var wrapped = function (input) {
          var url = typeof input === 'string' ? input : (input && input.url) || '';
          if (isBlocked(url)) {
            if (typeof w.Response === 'function') {
              return Promise.resolve(new w.Response('', { status: 204, statusText: 'No Content' }));
            }
            return Promise.resolve({ ok: true, status: 204 });
          }
          return fFetch.apply(this, arguments);
        };
        wrapped.__trackerBlocked = true;
        w.fetch = wrapped;
      }

      if (w.navigator && w.navigator.sendBeacon && !w.navigator.sendBeacon.__trackerBlocked) {
        var fBeacon = w.navigator.sendBeacon.bind(w.navigator);
        var wrappedBeacon = function (url) {
          if (isBlocked(url)) return true;
          return fBeacon.apply(w.navigator, arguments);
        };
        wrappedBeacon.__trackerBlocked = true;
        w.navigator.sendBeacon = wrappedBeacon;
      }
    } catch (e) { /* cross-origin iframe — nothing to do */ }
  }

  /* Harden about:blank iframes (the ThreatMetrix tags_frame) as soon as they are
   * attached, i.e. before anything is written into them. */
  function watchFrames() {
    try {
      var frames = document.getElementsByTagName('iframe');
      for (var i = 0; i < frames.length; i++) hardenFrame(frames[i]);
    } catch (e) { /* non-fatal */ }
  }

  var origAppend = Node.prototype.appendChild;
  Node.prototype.appendChild = function (node) {
    if (isBlocked(urlOfNode(node))) return node;
    var appended = origAppend.call(this, node);
    if (node && node.tagName === 'IFRAME') hardenFrame(node);
    return appended;
  };

  var origInsert = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function (node) {
    if (isBlocked(urlOfNode(node))) return node;
    var inserted = origInsert.apply(this, arguments);
    if (node && node.tagName === 'IFRAME') hardenFrame(node);
    return inserted;
  };

  var origReplace = Node.prototype.replaceChild;
  Node.prototype.replaceChild = function (node) {
    if (isBlocked(urlOfNode(node))) return node;
    return origReplace.apply(this, arguments);
  };

  var origSetAttr = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function (name, value) {
    if (name === 'src' || name === 'href' || name === 'data') {
      if (isBlocked(value)) return;
    }
    return origSetAttr.call(this, name, value);
  };

  /* Iframes inserted through innerHTML/markup never hit appendChild, so watch
   * the tree and harden any frame that shows up. */
  try {
    if (typeof MutationObserver === 'function') {
      var observer = new MutationObserver(function (records) {
        for (var i = 0; i < records.length; i++) {
          var added = records[i].addedNodes;
          for (var j = 0; j < added.length; j++) {
            var n = added[j];
            if (!n || n.nodeType !== 1) continue;
            if (n.tagName === 'IFRAME') {
              hardenFrame(n);
            } else if (n.getElementsByTagName) {
              var inner = n.getElementsByTagName('iframe');
              for (var k = 0; k < inner.length; k++) hardenFrame(inner[k]);
            }
          }
        }
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });
    }
    document.addEventListener('DOMContentLoaded', watchFrames, true);
  } catch (e) { /* non-fatal */ }

  /* ---- 2. Pixel beacons created through `new Image().src = ...` ---- */
  try {
    var imgDesc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
    if (imgDesc && imgDesc.set) {
      Object.defineProperty(HTMLImageElement.prototype, 'src', {
        configurable: true,
        enumerable: imgDesc.enumerable,
        get: imgDesc.get,
        set: function (value) {
          if (isBlocked(value)) return;
          return imgDesc.set.call(this, value);
        }
      });
    }
  } catch (e) { /* non-fatal */ }

  /* ---- 3. XHR / fetch / sendBeacon telemetry ---- */
  try {
    var origOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url) {
      if (isBlocked(url)) {
        this.__trackerBlocked = true;
        return;
      }
      return origOpen.apply(this, arguments);
    };
    var origSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function () {
      if (this.__trackerBlocked) return;
      return origSend.apply(this, arguments);
    };
  } catch (e) { /* non-fatal */ }

  try {
    if (typeof window.fetch === 'function') {
      var origFetch = window.fetch;
      window.fetch = function (input) {
        var url = typeof input === 'string' ? input : (input && input.url) || '';
        if (isBlocked(url)) {
          if (typeof Response === 'function') {
            return Promise.resolve(new Response('', { status: 204, statusText: 'No Content' }));
          }
          return Promise.resolve({ ok: true, status: 204 });
        }
        return origFetch.apply(this, arguments);
      };
    }
  } catch (e) { /* non-fatal */ }

  try {
    if (navigator.sendBeacon) {
      var origBeacon = navigator.sendBeacon.bind(navigator);
      navigator.sendBeacon = function (url) {
        if (isBlocked(url)) return true;
        return origBeacon.apply(navigator, arguments);
      };
    }
  } catch (e) { /* non-fatal */ }

  /* ---- 4. document.write based tag injection ---- */
  try {
    var origWrite = document.write;
    document.write = function (markup) {
      var s = String(markup);
      if (s.indexOf('nexus.ensighten.com') !== -1 ||
          s.indexOf('googletagmanager.com') !== -1 ||
          s.indexOf('adobedtm.com') !== -1 ||
          s.indexOf('content22.online.citi.com/fp/') !== -1 ||
          s.indexOf('.undefined/') !== -1) {
        return;
      }
      return origWrite.apply(document, arguments);
    };
  } catch (e) { /* non-fatal */ }

  /* ---- 5. Neutralise the globals the tag managers leave behind ---- */
  try {
    var noop = function () {};
    window.gtag = window.gtag || noop;
    window.ga = window.ga || noop;
    window.fbq = window.fbq || noop;
    window._satellite = window._satellite || { track: noop, pageBottom: noop };
    window.dataLayer = window.dataLayer || [];
    if (window.Bootstrapper && typeof window.Bootstrapper === 'object' && !window.Bootstrapper.__blocked) {
      window.Bootstrapper.__blocked = true;
    }
  } catch (e) { /* non-fatal */ }
})();
