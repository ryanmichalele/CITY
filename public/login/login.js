/* ============================================================================
 * Citi Online Banking — sign-on page
 *
 * Posts the login ID + password to the `login` Netlify Function, which
 * verifies the scrypt hash in Sanity and issues the signed session cookie.
 * A successful sign-on always lands on /dashboard/; the dashboard itself
 * re-reads the cookie, so no customer identifier is ever trusted from the URL.
 * ========================================================================== */

(function () {
  'use strict';

  var form = document.getElementById('login-form');
  var idInput = document.getElementById('login-id');
  var pwdInput = document.getElementById('login-password');
  var submit = document.getElementById('login-submit');
  var errorEl = document.getElementById('login-error');
  var toggle = document.getElementById('toggle-password');

  function showError(message) {
    if (!errorEl) return;
    errorEl.textContent = message;
    errorEl.hidden = false;
  }

  function clearError() {
    if (!errorEl) return;
    errorEl.textContent = '';
    errorEl.hidden = true;
  }

  if (toggle && pwdInput) {
    toggle.addEventListener('click', function () {
      var show = pwdInput.type === 'password';
      pwdInput.type = show ? 'text' : 'password';
      toggle.textContent = show ? 'Hide' : 'Show';
      toggle.setAttribute('aria-pressed', show ? 'true' : 'false');
      toggle.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    });
  }

  if (idInput) {
    idInput.addEventListener('input', function () {
      idInput.value = idInput.value.toUpperCase();
      clearError();
    });
  }
  if (pwdInput) pwdInput.addEventListener('input', clearError);

  function messageFor(error) {
    if (error === 'too_many_attempts') return 'Too many sign-in attempts. Please try again in 15 minutes.';
    if (error === 'lookup_failed') return 'Sign-in is temporarily unavailable. Please try again shortly.';
    if (error === 'missing_credentials') return 'Enter your login ID and password.';
    return 'The login ID or password is incorrect.';
  }

  if (form) {
    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      clearError();

      var loginId = (idInput ? idInput.value : '').trim().toUpperCase();
      var password = pwdInput ? pwdInput.value : '';

      if (!loginId || !password) {
        showError('Enter your login ID and password.');
        return;
      }

      submit.disabled = true;
      submit.textContent = 'Signing in…';

      try {
        var res = await fetch('/.netlify/functions/login', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ loginId: loginId, password: password }),
        });
        var body = await res.json().catch(function () { return {}; });

        if (res.ok && body && body.ok) {
          submit.textContent = 'Signed in — opening dashboard…';
          window.location.assign('/dashboard/');
          return;
        }

        showError(messageFor(body && body.error));
      } catch (e) {
        showError('We could not reach the sign-in service. Please check your connection and try again.');
      }

      submit.disabled = false;
      submit.textContent = 'Sign On';
    });
  }
})();
