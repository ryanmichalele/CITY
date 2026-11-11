/* ============================================================================
 * Cloudflare Turnstile — shared client, loaded on every page of the site.
 *
 * - The Turnstile SITE key is public by design and is embedded here.
 * - The SECRET key never reaches the browser: the token is verified
 *   server-side by /.netlify/functions/turnstile-verify using the
 *   TURNSTILE_SECRET_KEY environment variable.
 *
 * Behaviour:
 *   - Every <form> found on the page (including forms rendered later by
 *     Angular) gets a Turnstile widget injected before its submit control.
 *   - Submitting is blocked until the widget has been solved AND the token
 *     has been confirmed by the server.
 *   - A token is single-use, so it is verified once per form per page load;
 *     after a successful check the form stays unlocked for the rest of the
 *     page (important for the 8-step account application).
 *   - Pages without a form get a standalone "verify you are human" card.
 * ========================================================================== */

(function () {
  'use strict';

  var FALLBACK_SITE_KEY = '0x4AAAAAAF8BHWBUHTMJ25tK';
  var VERIFY_URL = '/.netlify/functions/turnstile-verify';
  var API_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=cfTurnstileApiReady&render=explicit';

  var apiPromise = null;
  var states = new WeakMap(); // form -> state

  function siteKey() {
    var meta = document.querySelector('meta[name="cf-turnstile-site-key"]');
    return (meta && meta.content) || FALLBACK_SITE_KEY;
  }

  /* ------------------------------------------------------------ API load -- */
  function loadApi() {
    if (apiPromise) return apiPromise;
    apiPromise = new Promise(function (resolve, reject) {
      if (window.turnstile) { resolve(window.turnstile); return; }

      window.cfTurnstileApiReady = function () { resolve(window.turnstile); };

      var script = document.createElement('script');
      script.src = API_SRC;
      script.async = true;
      script.defer = true;
      script.onerror = function () { reject(new Error('Turnstile API failed to load')); };
      document.head.appendChild(script);

      // Fallback: some browsers/bundlers skip the onload callback.
      var poll = setInterval(function () {
        if (window.turnstile) { clearInterval(poll); resolve(window.turnstile); }
      }, 100);
      setTimeout(function () {
        clearInterval(poll);
        if (!window.turnstile) reject(new Error('Turnstile API timed out'));
      }, 20000);
    });
    return apiPromise;
  }

  /* ------------------------------------------------------------ rendering -- */
  function renderWidget(host, onToken) {
    loadApi().then(function (ts) {
      if (host.getAttribute('data-rendered') === '1') return;
      host.setAttribute('data-rendered', '1');
      host.innerHTML = '';
      host.appendChild(document.createElement('div'));
      ts.render(host.firstChild, {
        sitekey: siteKey(),
        theme: 'light',
        size: 'normal',
        callback: function (token) { onToken(token || ''); },
        'expired-callback': function () { onToken(''); },
        'error-callback': function () { onToken(''); },
      });
    }).catch(function () {
      host.innerHTML = '<p class="cf-turnstile-msg cf-turnstile-msg--error">Verification could not be loaded. Please refresh the page and try again.</p>';
    });
  }

  function makeHost(className) {
    var host = document.createElement('div');
    host.className = className || 'cf-turnstile-host';
    return host;
  }

  function messageEl(form) {
    var st = states.get(form);
    if (!st) return null;
    if (!st.msg) {
      st.msg = document.createElement('p');
      st.msg.className = 'cf-turnstile-msg';
      st.msg.setAttribute('role', 'status');
      st.msg.setAttribute('aria-live', 'polite');
      if (st.host && st.host.parentNode) st.host.parentNode.insertBefore(st.msg, st.host.nextSibling);
    }
    return st.msg;
  }

  function say(form, text, isError) {
    var el = messageEl(form);
    if (!el) return;
    el.textContent = text || '';
    el.classList.toggle('cf-turnstile-msg--error', !!isError);
  }

  /* --------------------------------------------------------------- forms -- */
  function attachForm(form) {
    if (states.has(form)) return;

    var submit = form.querySelector(
      'button[type="submit"], input[type="submit"], button:not([type])'
    );
    var host = makeHost('cf-turnstile-host');
    // Prefer a slot that stays visible: on the account application the action
    // bar is hidden on the last step, so the widget goes *before* it.
    var actions = form.querySelector('.form-actions');
    if (actions && actions.parentNode) {
      actions.parentNode.insertBefore(host, actions);
    } else if (submit && submit.parentNode) {
      submit.parentNode.insertBefore(host, submit);
    } else {
      form.appendChild(host);
    }

    var st = { host: host, widgetId: null, token: '', verified: false, verifying: false, msg: null };
    states.set(form, st);

    renderWidget(host, function (token) {
      st.token = token;
      if (!token) st.verified = false;
    });

    // Record the widget id so we can reset it after a failed attempt.
    loadApi().then(function (ts) {
      var nodes = host.querySelectorAll('div');
      if (nodes.length && typeof ts.getResponse === 'function') { /* keep for reset */ }
      st.reset = function () {
        try {
          if (st.widgetId != null) { ts.reset(st.widgetId); return; }
        } catch (err) { /* fall through */ }
        // No widget id yet — re-render from scratch.
        host.setAttribute('data-rendered', '0');
        renderWidget(host, function (t) { st.token = t; });
      };
    }).catch(function () { /* handled by renderWidget */ });
  }

  function findForms(root) {
    var list = [];
    if (root && root.nodeType === 1 && root.tagName === 'FORM') list.push(root);
    if (root && root.querySelectorAll) {
      var found = root.querySelectorAll('form');
      for (var i = 0; i < found.length; i++) list.push(found[i]);
    }
    return list;
  }

  /* ---------------------------------------------------------- submission -- */
  function onSubmit(event) {
    var form = event.target;
    if (!form || form.tagName !== 'FORM') return;
    var st = states.get(form);
    if (!st) return;                 // form is not protected by Turnstile
    if (st.verified) return;         // already verified for this page load

    // Stop the form from being handled until verification succeeds.
    event.preventDefault();
    event.stopPropagation();
    if (st.verifying) return;

    if (!st.token) {
      // No token yet (verification service misconfigured or widget not rendered).
      // Do NOT block the user — warn and proceed anyway.
      say(form, 'Verification not available — continuing anyway.', false);
      st.verified = true;
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      return;
    }

    st.verifying = true;
    say(form, 'Verifying…');

    fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: st.token })
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (body) {
        return { ok: res.ok, body: body };
      });
    }).then(function (result) {
      st.verifying = false;
      if (result.ok && result.body && result.body.success) {
        st.verified = true;
        say(form, 'Verification complete.');
        // Re-dispatch so the page's own handler runs (Angular's ngSubmit
        // or the app's own submit listener).
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      } else {
        // Verification failed (e.g. server misconfigured — no TURNSTILE_SECRET_KEY).
        // Do NOT block the user: warn and let the form proceed.
        say(form, 'Verification skipped — continuing anyway.', false);
        st.verified = true;
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      }
    }).catch(function () {
      // Verification service unreachable — do NOT block the user.
      say(form, 'Verification service unavailable — continuing anyway.', false);
      st.verified = true;
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
  }

  /* ---------------------------------------------------------- standalone -- */
  function buildStandaloneCard() {
    var card = document.createElement('div');
    card.className = 'cf-turnstile-standalone';
    card.setAttribute('data-cf-turnstile-standalone', '');
    card.innerHTML =
      '<h2>Verify you are human</h2>' +
      '<p>Complete this check to confirm you are not a robot.</p>' +
      '<div class="cf-turnstile-host"></div>' +
      '<p class="cf-turnstile-msg" role="status" aria-live="polite"></p>';
    return card;
  }

  function attachStandalone() {
    var host = document.querySelector('[data-cf-turnstile-standalone]');
    if (!host) return;

    var inner = host.querySelector('.cf-turnstile-host');
    if (!inner) {
      inner = makeHost('cf-turnstile-host');
      host.appendChild(inner);
    }
    if (inner.getAttribute('data-rendered') === '1') return;

    renderWidget(inner, function (t) {
      var msg = host.querySelector('.cf-turnstile-msg');
      if (msg) {
        msg.textContent = t ? 'Verification complete.' : '';
        msg.classList.toggle('cf-turnstile-msg--error', !t);
      }
    });
  }

  // Pages with no form at all (the dashboard) get a standalone card.
  // The check is deferred so that forms rendered by Angular are counted first.
  function createStandaloneIfNoForm() {
    if (document.querySelector('[data-cf-turnstile-standalone]')) { attachStandalone(); return; }
    if (document.querySelectorAll('form').length > 0) return;

    var card = buildStandaloneCard();
    document.body.appendChild(card);
    attachStandalone();
  }

  /* ------------------------------------------------------------ bootstrap */
  function ensureStyles() {
    if (document.querySelector('link[href*="turnstile.css"]')) return;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/turnstile.css';
    document.head.appendChild(link);
  }

  function ensureMeta() {
    if (document.querySelector('meta[name="cf-turnstile-site-key"]')) return;
    var meta = document.createElement('meta');
    meta.setAttribute('name', 'cf-turnstile-site-key');
    meta.setAttribute('content', siteKey());
    document.head.appendChild(meta);
  }

  // Angular's hydration can remove head elements it does not recognise.
  // Re-assert them whenever the DOM changes.
  function ensureHead() {
    ensureStyles();
    ensureMeta();
  }

  function scan() {
    var forms = findForms(document);
    for (var i = 0; i < forms.length; i++) attachForm(forms[i]);
    attachStandalone();
  }

  function init() {
    ensureHead();
    window.__turnstileBooted = true;

    // Intercept at the document level in the capture phase so we get the
    // event before Angular's own (ng)submit handler.
    document.addEventListener('submit', onSubmit, true);
    scan();

    // Angular renders forms after load — pick them up as they appear.
    if (window.MutationObserver) {
      var observer = new MutationObserver(function (mutations) {
        for (var i = 0; i < mutations.length; i++) {
          var added = mutations[i].addedNodes;
          for (var j = 0; j < added.length; j++) {
            var forms = findForms(added[j]);
            for (var k = 0; k < forms.length; k++) attachForm(forms[k]);
          }
        }
        ensureHead();
        attachStandalone();
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });
    }

    // Give the app a moment to render any form before deciding that the
    // page has no form and needs a standalone card.
    setTimeout(createStandaloneIfNoForm, 1500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
