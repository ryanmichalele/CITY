/* ============================================================================
   Citi account application
   ========================================================================== */
(function () {
  'use strict';

  var DRAFT_KEY = 'citi-application-draft-v1';
  var DOC_VERSION = '2026.11';
  var STEPS = [
    'Account Type', 'Personal', 'Contact', 'Employment & Finance',
    'Tax & Legal', 'Review', 'Agreements', 'Decision'
  ];

  var US_STATES = [
    ['AL', 'Alabama'], ['AK', 'Alaska'], ['AZ', 'Arizona'], ['AR', 'Arkansas'],
    ['CA', 'California'], ['CO', 'Colorado'], ['CT', 'Connecticut'], ['DE', 'Delaware'],
    ['DC', 'District of Columbia'], ['FL', 'Florida'], ['GA', 'Georgia'], ['HI', 'Hawaii'],
    ['ID', 'Idaho'], ['IL', 'Illinois'], ['IN', 'Indiana'], ['IA', 'Iowa'],
    ['KS', 'Kansas'], ['KY', 'Kentucky'], ['LA', 'Louisiana'], ['ME', 'Maine'],
    ['MD', 'Maryland'], ['MA', 'Massachusetts'], ['MI', 'Michigan'], ['MN', 'Minnesota'],
    ['MS', 'Mississippi'], ['MO', 'Missouri'], ['MT', 'Montana'], ['NE', 'Nebraska'],
    ['NV', 'Nevada'], ['NH', 'New Hampshire'], ['NJ', 'New Jersey'], ['NM', 'New Mexico'],
    ['NY', 'New York'], ['NC', 'North Carolina'], ['ND', 'North Dakota'], ['OH', 'Ohio'],
    ['OK', 'Oklahoma'], ['OR', 'Oregon'], ['PA', 'Pennsylvania'], ['RI', 'Rhode Island'],
    ['SC', 'South Carolina'], ['SD', 'South Dakota'], ['TN', 'Tennessee'], ['TX', 'Texas'],
    ['UT', 'Utah'], ['VT', 'Vermont'], ['VA', 'Virginia'], ['WA', 'Washington'],
    ['WV', 'West Virginia'], ['WI', 'Wisconsin'], ['WY', 'Wyoming']
  ];

  var AGREEMENTS = [
    {
      id: 'daa',
      title: 'Deposit Account Agreement',
      body: 'This Deposit Account Agreement describes the general terms that govern a deposit account, including account ownership, deposits, withdrawals, funds availability, account fees, statements, and dispute resolution.'
    },
    {
      id: 'fees',
      title: 'Fee Schedule',
      body: 'The Fee Schedule lists the monthly service fees, transaction fees, and optional service charges that apply to each account type. Monthly service fees may be waived when the stated qualifying activity or balance is met.'
    },
    {
      id: 'privacy',
      title: 'Privacy Notice',
      body: 'The Privacy Notice explains what personal information is collected, how it is used, how it is protected, and the choices available to customers, including data sharing and opt-out rights under applicable law.'
    },
    {
      id: 'econsent',
      title: 'Electronic Communications Consent',
      body: 'By consenting to electronic communications, you agree to receive account disclosures, statements, notices, and other communications electronically. Consent may be withdrawn as described in the agreement.'
    },
    {
      id: 'funds',
      title: 'Funds Availability Disclosure',
      body: 'The Funds Availability Disclosure explains when deposits become available for withdrawal, including holds that may apply to certain deposit types.'
    },
    {
      id: 'terms',
      title: 'Account Terms and Conditions',
      body: 'The Account Terms and Conditions describe eligible account holders, account use, identity verification requirements, account closure, and other conditions that apply to the account. Eligibility is subject to verification and final approval in a real application.'
    }
  ];

  var INCOMPLETE = 'Required';

  /* ---------------------------------------------------------------- state -- */
  function blankState() {
    return {
      accountType: '',
      personal: {
        firstName: '', middleName: '', lastName: '', dob: '', ssnLast4: '',
        citizenship: '', ownership: ''
      },
      contact: {
        email: '', phone: '', street: '', apt: '', city: '', state: '', zip: '',
        country: 'US', mailingSame: '',
        mailing: { street: '', apt: '', city: '', state: '', zip: '' },
        createPassword: '', confirmPassword: ''
      },
      employment: {
        status: '', occupation: '', employer: '', jobTitle: '', industry: '', income: ''
      },
      financial: {
        incomeSource: '', sourceFunds: '', monthlyDeposits: '',
        monthlyWithdrawals: '', purpose: '', activity: ''
      },
      tax: {
        usResident: '', tinType: '', residencyCountry: '',
        certification: false, declarations: false
      },
      agreements: { accepted: {}, signature: '', consent: false, acceptedAt: null, docVersion: DOC_VERSION },
      meta: { submitted: false, status: '', reference: '', submittedAt: '', passwordHash: '' },
      ui: { step: 1, maxStep: 1 }
    };
  };

  var state = blankState();
  var fullSsn = '';            // memory only — never persisted
  var plainPassword = '';      // memory only — never persisted, shown once on step 8
  var submitting = false;
  var persistTimer = null;
  var editReturn = false;       // true when a Review "Edit" sent the user back

  /* ------------------------------------------------------------------ dom -- */
  var form = document.getElementById('app-form');
  var panels = Array.prototype.slice.call(document.querySelectorAll('.step-panel'));
  var stepper = document.getElementById('stepper');
  var stepperMobile = document.getElementById('stepper-mobile');
  var actions = document.getElementById('form-actions');
  var btnBack = document.getElementById('btn-back');
  var btnNext = document.getElementById('btn-next');
  var btnSave = document.getElementById('btn-save');
  var toastEl = document.getElementById('toast');
  var liveRegion = document.getElementById('live-region');
  var reviewBody = document.getElementById('review-body');
  var decisionPanel = document.getElementById('decision-panel');
  var ssnInput = document.getElementById('ssn');
  var toggleSsn = document.getElementById('toggle-ssn');

  /* --------------------------------------------------------------- helpers -- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function getPath(obj, path) {
    var parts = path.split('.');
    var cur = obj;
    for (var i = 0; i < parts.length; i++) {
      if (cur == null) return undefined;
      cur = cur[parts[i]];
    }
    return cur;
  }

  function setPath(obj, path, value) {
    var parts = path.split('.');
    var cur = obj;
    for (var i = 0; i < parts.length - 1; i++) {
      if (typeof cur[parts[i]] !== 'object' || cur[parts[i]] === null) cur[parts[i]] = {};
      cur = cur[parts[i]];
    }
    cur[parts[parts.length - 1]] = value;
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function digitsOnly(value) { return String(value || '').replace(/\D/g, ''); }

  function isEmail(value) { return /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(String(value || '').trim()); }
  function isZip(value) { return /^\d{5}(-\d{4})?$/.test(String(value || '').trim()); }

  function formatPhone(value) {
    var d = digitsOnly(value).slice(0, 10);
    if (d.length <= 3) return d;
    if (d.length <= 6) return '(' + d.slice(0, 3) + ') ' + d.slice(3);
    return '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6);
  }

  function formatSsn(value) {
    var d = digitsOnly(value).slice(0, 9);
    if (d.length <= 3) return d;
    if (d.length <= 5) return d.slice(0, 3) + '-' + d.slice(3);
    return d.slice(0, 3) + '-' + d.slice(3, 5) + '-' + d.slice(5);
  }

  function toast(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { toastEl.classList.remove('show'); }, 3200);
  }

  function announce(message) {
    if (liveRegion) liveRegion.textContent = message;
  }

  function val(value) {
    return (value === undefined || value === null || String(value).trim() === '') ? '' : String(value);
  }

  function ageFromDob(dob) {
    if (!dob) return -1;
    var d = new Date(dob + 'T00:00:00');
    if (isNaN(d.getTime())) return -1;
    var today = new Date();
    var age = today.getFullYear() - d.getFullYear();
    var m = today.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
    return age;
  }

  function makeReference() {
    var now = new Date();
    var stamp = '' + now.getFullYear() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0');
    var rand = Math.random().toString(36).slice(2, 8).toUpperCase();
    return 'APP-' + stamp + '-' + rand;
  }

  async function hashPassword(password) {
    var encoder = new TextEncoder();
    var data = encoder.encode(password);
    var hashBuffer = await crypto.subtle.digest('SHA-256', data);
    var hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
  }

  function passwordStrength(password) {
    var score = 0;
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score; // 0-4
  }

  function updatePasswordStrength(value) {
    var el = $('#password-strength-value');
    if (!el) return;
    var score = passwordStrength(value);
    var labels = ['—', 'Weak', 'Fair', 'Good', 'Strong'];
    var colors = ['#999', '#d9534f', '#f0ad4e', '#5bc0de', '#5cb85c'];
    el.textContent = value ? labels[score] : '—';
    el.style.color = value ? colors[score] : '#999';
  }

  function updatePasswordMatchHint() {
    var hint = $('#password-match-hint');
    var cp = $('#createPassword');
    var conf = $('#confirmPassword');
    if (!hint || !cp || !conf) return;
    if (conf.value && cp.value && cp.value !== conf.value) {
      hint.style.display = 'block';
    } else {
      hint.style.display = 'none';
    }
  }

  function maskPassword(password) {
    return '•'.repeat(password.length);
  }

  function formatDate(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  /* -------------------------------------------------------------- errors --- */
  function errorContainer(el) {
    if (!el) return null;
    if (el.type === 'radio') {
      return el.closest('[data-field-group]') || el.closest('.field');
    }
    if (el.type === 'checkbox') {
      if (el.closest('.agreement')) return el.closest('.agreement');
      if (el.closest('.check-item')) return el.closest('.check-item').parentElement;
      return el.closest('.field') || el.parentElement;
    }
    return el.closest('.field') || el.parentElement;
  }

  function clearErrors() {
    $all('#app-form .js-error').forEach(function (p) { p.remove(); });
    $all('#app-form .invalid').forEach(function (el) { el.classList.remove('invalid'); });
    $all('#app-form .agreement.invalid').forEach(function (el) { el.classList.remove('invalid'); });
    $all('#app-form .check-item.invalid').forEach(function (el) { el.classList.remove('invalid'); });
    $all('#app-form [aria-invalid="true"]').forEach(function (el) { el.removeAttribute('aria-invalid'); });
  }

  function setError(el, message) {
    if (!el) return;
    var target = errorContainer(el);
    if (!target) return;
    var p = document.createElement('p');
    p.className = 'field-error js-error';
    p.textContent = message;
    target.appendChild(p);

    if (el.type === 'checkbox' && el.closest('.agreement')) {
      el.closest('.agreement').classList.add('invalid');
    } else if (el.type === 'checkbox') {
      var item = el.closest('.check-item');
      if (item) item.classList.add('invalid');
      el.classList.add('invalid');
    } else if (el.type === 'radio') {
      $all('input[name="' + el.name + '"]').forEach(function (r) { r.setAttribute('aria-invalid', 'true'); });
    } else {
      el.classList.add('invalid');
      el.setAttribute('aria-invalid', 'true');
    }
    if (p.id && el.id) el.setAttribute('aria-describedby', p.id);
  }

  function showErrors(errors) {
    clearErrors();
    if (!errors.length) return;
    errors.forEach(function (e) { setError(e.el, e.msg); });
    var first = errors[0].el;
    if (first) {
      var focusable = first.type === 'radio'
        ? $all('input[name="' + first.name + '"]')[0]
        : first;
      try {
        focusable.focus({ preventScroll: true });
        var box = focusable.getBoundingClientRect();
        window.scrollTo({ top: Math.max(0, box.top + window.scrollY - 140), behavior: 'smooth' });
      } catch (err) { /* ignore */ }
    }
    announce(errors.length + ' field' + (errors.length > 1 ? 's need' : ' needs') + ' attention.');
  }

  /* ------------------------------------------------------------ validation -- */
  function validateStep1() {
    var errs = [];
    if (!state.accountType) {
      errs.push({ el: $('input[name="accountType"]'), msg: 'Choose an account type to continue.' });
    }
    return errs;
  }

  function validateStep2() {
    var p = state.personal;
    var errs = [];
    if (val(p.firstName).trim().length < 2) errs.push({ el: $('#firstName'), msg: 'Enter your first name.' });
    if (val(p.lastName).trim().length < 2) errs.push({ el: $('#lastName'), msg: 'Enter your last name.' });

    if (!p.dob) {
      errs.push({ el: $('#dob'), msg: 'Enter your date of birth.' });
    } else {
      var age = ageFromDob(p.dob);
      if (age < 0) errs.push({ el: $('#dob'), msg: 'Enter a valid date of birth.' });
      else if (age < 18) errs.push({ el: $('#dob'), msg: 'You must be at least 18 years old to open an account.' });
      else if (age > 120) errs.push({ el: $('#dob'), msg: 'Enter a valid date of birth.' });
    }

    if (digitsOnly(fullSsn).length !== 9) {
      errs.push({ el: $('#ssn'), msg: 'Enter a 9-digit SSN or ITIN.' });
    }
    if (!p.citizenship) errs.push({ el: $('#citizenship'), msg: 'Select your citizenship or residency status.' });
    if (!p.ownership) errs.push({ el: $('input[name="ownership"]'), msg: 'Select an account ownership type.' });
    return errs;
  }

  function validateStep3() {
    var c = state.contact;
    var errs = [];
    if (!isEmail(c.email)) errs.push({ el: $('#email'), msg: 'Enter a valid email address, for example name@example.com.' });
    if (digitsOnly(c.phone).length !== 10) errs.push({ el: $('#phone'), msg: 'Enter a 10-digit U.S. mobile phone number.' });
    if (!val(c.street).trim()) errs.push({ el: $('#street'), msg: 'Enter your street address.' });
    if (!val(c.city).trim()) errs.push({ el: $('#city'), msg: 'Enter your city.' });
    if (!c.state) errs.push({ el: $('#state'), msg: 'Select your state.' });
    if (!isZip(c.zip)) errs.push({ el: $('#zip'), msg: 'Enter a valid ZIP code (12345 or 12345-6789).' });
    if (!c.country) errs.push({ el: $('#country'), msg: 'Select your country.' });
    if (!c.mailingSame) errs.push({ el: $('input[name="mailingSame"]'), msg: 'Tell us whether your mailing address is the same.' });

    // Password validation
    var cp = val(c.createPassword);
    var conf = val(c.confirmPassword);
    if (!cp) {
      errs.push({ el: $('#createPassword'), msg: 'Create a password.' });
    } else {
      var strength = passwordStrength(cp);
      if (strength < 2) {
        errs.push({ el: $('#createPassword'), msg: 'Password is too weak. Use a mix of letters, numbers, and symbols.' });
      }
    }
    if (!conf) {
      errs.push({ el: $('#confirmPassword'), msg: 'Confirm your password.' });
    } else if (cp && conf && cp !== conf) {
      errs.push({ el: $('#confirmPassword'), msg: 'Passwords do not match.' });
    }

    if (c.mailingSame === 'no') {
      if (!val(c.mailing.street).trim()) errs.push({ el: $('#mailStreet'), msg: 'Enter the mailing street address.' });
      if (!val(c.mailing.city).trim()) errs.push({ el: $('#mailCity'), msg: 'Enter the mailing city.' });
      if (!c.mailing.state) errs.push({ el: $('#mailState'), msg: 'Select the mailing state.' });
      if (!isZip(c.mailing.zip)) errs.push({ el: $('#mailZip'), msg: 'Enter a valid mailing ZIP code.' });
    }
    return errs;
  }

  function validateStep4() {
    var e = state.employment;
    var f = state.financial;
    var errs = [];

    if (!e.status) errs.push({ el: $('#empStatus'), msg: 'Select your employment status.' });
    if (!val(e.occupation).trim()) errs.push({ el: $('#occupation'), msg: 'Enter your occupation.' });

    if (['employed', 'self-employed', 'business-owner'].indexOf(e.status) !== -1) {
      if (!val(e.employer).trim()) errs.push({ el: $('#employer'), msg: 'Enter your employer or business name.' });
  function showWarning(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.className = 'show warning';
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { toastEl.className = ''; }, 5000);
  }
      if (!val(e.jobTitle).trim()) errs.push({ el: $('#jobTitle'), msg: 'Enter your job title.' });
      if (!e.industry) errs.push({ el: $('#industry'), msg: 'Select your industry.' });
      if (!e.income) errs.push({ el: $('#income'), msg: 'Select your annual income range.' });
    }

    if (!f.incomeSource) errs.push({ el: $('#incomeSource'), msg: 'Select your primary source of income.' });
    if (!f.sourceFunds) errs.push({ el: $('#sourceFunds'), msg: 'Select the source of funds for this account.' });
    if (!f.monthlyDeposits) errs.push({ el: $('#monthlyDeposits'), msg: 'Select expected monthly deposits.' });
    if (!f.monthlyWithdrawals) errs.push({ el: $('#monthlyWithdrawals'), msg: 'Select expected monthly withdrawals.' });
    if (!f.purpose) errs.push({ el: $('#purpose'), msg: 'Select the purpose of opening the account.' });
    if (!f.activity) errs.push({ el: $('#activity'), msg: 'Select expected account activity.' });
    return errs;
  }

  function validateStep5() {
    var t = state.tax;
    var errs = [];
    if (!t.usResident) errs.push({ el: $('input[name="usResident"]'), msg: 'Tell us whether you are a U.S. tax resident.' });
    if (!t.tinType) errs.push({ el: $('#tinType'), msg: 'Select your taxpayer identification type.' });
    if (t.usResident === 'no' && !t.residencyCountry) {
      errs.push({ el: $('#residencyCountry'), msg: 'Select your tax residency country.' });
    }
    if (!t.certification) errs.push({ el: $('#taxCert'), msg: 'You must certify the information is accurate.' });
    if (!t.declarations) errs.push({ el: $('#taxDeclarations'), msg: 'You must acknowledge the legal declarations.' });
    return errs;
  }

  function validateAgreements() {
    var errs = [];
    AGREEMENTS.forEach(function (doc) {
      if (!state.agreements.accepted[doc.id]) {
        errs.push({ el: $('input[data-agreement="' + doc.id + '"]'), msg: 'Acknowledge the ' + doc.title + '.' });
      }
    });

    var sig = val(state.agreements.signature).trim();
    var first = val(state.personal.firstName).trim().toLowerCase();
    var last = val(state.personal.lastName).trim().toLowerCase();
    var normalized = sig.toLowerCase();
    if (sig.length < 3 || (first && normalized.indexOf(first) === -1) || (last && normalized.indexOf(last) === -1)) {
      errs.push({ el: $('#signature'), msg: 'Type your full legal name to sign (first and last name).' });
    }
    if (!state.agreements.consent) {
      errs.push({ el: $('#esignConsent'), msg: 'Agree to use electronic records and signatures.' });
    }
    return errs;
  }

  function validateAllBeforeReview() {
    return [].concat(validateStep1(), validateStep2(), validateStep3(), validateStep4(), validateStep5());
  }

  function stepValidator(n) {
    if (n === 1) return validateStep1;
    if (n === 2) return validateStep2;
    if (n === 3) return validateStep3;
    if (n === 4) return validateStep4;
    if (n === 5) return validateStep5;
    if (n === 7) return validateAgreements;
    return function () { return []; };
  }

  /* ----------------------------------------------------------- persistence -- */
  function snapshot() {
    var copy = JSON.parse(JSON.stringify({
      accountType: state.accountType,
      personal: state.personal,
      contact: state.contact,
      employment: state.employment,
      financial: state.financial,
      tax: state.tax,
      agreements: state.agreements,
      meta: state.meta,
      ui: state.ui
    }));
    // never persist the typed signature or anything derived from the full SSN
    copy.agreements.signature = '';
    copy.personal.ssnLast4 = state.personal.ssnLast4;
    // never persist plaintext passwords in sessionStorage
    copy.contact.createPassword = '';
    copy.contact.confirmPassword = '';
    return copy;
  }

  function persistDraft() {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(snapshot()));
    } catch (err) { /* storage may be unavailable */ }
  }

  function persistSoon() {
    clearTimeout(persistTimer);
    persistTimer = setTimeout(persistDraft, 250);
  }

  function restoreDraft() {
    var raw;
    try { raw = sessionStorage.getItem(DRAFT_KEY); } catch (err) { return; }
    if (!raw) return;
    var saved;
    try { saved = JSON.parse(raw); } catch (err) { return; }
    if (!saved || typeof saved !== 'object') return;

    if (typeof saved.accountType === 'string') state.accountType = saved.accountType;
    ['personal', 'contact', 'employment', 'financial', 'tax'].forEach(function (section) {
      if (saved[section] && typeof saved[section] === 'object') {
        Object.keys(state[section]).forEach(function (key) {
          if (saved[section][key] !== undefined) state[section][key] = saved[section][key];
        });
      }
    });
    if (saved.contact && saved.contact.mailing && typeof saved.contact.mailing === 'object') {
      Object.keys(state.contact.mailing).forEach(function (key) {
        if (saved.contact.mailing[key] !== undefined) state.contact.mailing[key] = saved.contact.mailing[key];
      });
    }
    if (saved.agreements && typeof saved.agreements === 'object') {
      if (saved.agreements.accepted && typeof saved.agreements.accepted === 'object') {
        state.agreements.accepted = saved.agreements.accepted;
      }
      state.agreements.consent = !!saved.agreements.consent;
      state.agreements.acceptedAt = saved.agreements.acceptedAt || null;
    }
    if (saved.meta && typeof saved.meta === 'object') {
      state.meta.submitted = !!saved.meta.submitted;
      state.meta.status = typeof saved.meta.status === 'string' ? saved.meta.status : '';
      state.meta.reference = typeof saved.meta.reference === 'string' ? saved.meta.reference : '';
      state.meta.submittedAt = typeof saved.meta.submittedAt === 'string' ? saved.meta.submittedAt : '';
    }
    if (saved.ui && typeof saved.ui === 'object') {
      state.ui.step = Math.min(8, Math.max(1, parseInt(saved.ui.step, 10) || 1));
      state.ui.maxStep = Math.min(8, Math.max(state.ui.step, parseInt(saved.ui.maxStep, 10) || state.ui.step));
    }
    if (state.meta.submitted) {
      state.ui.step = 8;
      state.ui.maxStep = 8;
    }
  }

  function hasDraftData() {
    var p = state.personal;
    return !!(state.accountType || val(p.firstName) || val(p.lastName) || val(state.contact.email) ||
      val(state.contact.street) || val(state.employment.status) || val(state.tax.usResident));
  }

  /* -------------------------------------------------------------- rendering -- */
  function fillSelect(select, items) {
    if (!select) return;
    items.forEach(function (item) {
      var opt = document.createElement('option');
      opt.value = item[0];
      opt.textContent = item[1];
      select.appendChild(opt);
    });
  }

  function renderAgreements() {
    var list = document.getElementById('agreement-list');
    if (!list) return;
    list.innerHTML = '';
    AGREEMENTS.forEach(function (doc) {
      var wrap = document.createElement('div');
      wrap.className = 'agreement';
      wrap.setAttribute('data-doc', doc.id);

      var details = document.createElement('details');
      var summary = document.createElement('summary');
      summary.textContent = doc.title;
      details.appendChild(summary);

      var body = document.createElement('div');
      body.className = 'agreement-doc';
      body.innerHTML = '<p>' + escapeHtml(doc.body) + '</p>' +
        '<p><strong>Document version:</strong> ' + escapeHtml(DOC_VERSION) + '</p>';
      details.appendChild(body);
      wrap.appendChild(details);

      var label = document.createElement('label');
      label.className = 'check-item';
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.setAttribute('data-agreement', doc.id);
      cb.checked = !!state.agreements.accepted[doc.id];
      cb.setAttribute('aria-label', 'Acknowledge ' + doc.title);
      var span = document.createElement('span');
      span.textContent = 'I have read and accept the ' + doc.title + '.';
      label.appendChild(cb);
      label.appendChild(span);
      wrap.appendChild(label);

      list.appendChild(wrap);
    });
  }

  function fillFormValues() {
    $all('[data-model]').forEach(function (el) {
      var path = el.getAttribute('data-model');
      if (path === 'personal.ssn') return; // handled separately
      var value = getPath(state, path);
      if (el.type === 'checkbox') {
        el.checked = !!value;
      } else if (el.type === 'radio') {
        el.checked = (value === el.value);
      } else {
        el.value = value == null ? '' : value;
      }
    });
    if (state.personal.ssnLast4 && ssnInput && !fullSsn) {
      ssnInput.placeholder = '•••-••-' + state.personal.ssnLast4 + ' (re-enter to continue)';
    }
  }

  function updateStepper() {
    var current = state.ui.step;
    $all('li', stepper).forEach(function (li) {
      var n = parseInt(li.getAttribute('data-step'), 10);
      li.classList.remove('is-active', 'is-done');
      li.removeAttribute('aria-current');
      if (n < current || (current === 8 && n < 8)) li.classList.add('is-done');
      if (n === current) { li.classList.add('is-active'); li.setAttribute('aria-current', 'step'); }
    });
    if (stepperMobile) {
      stepperMobile.innerHTML = 'Step <span>' + current + ' of 8</span> — ' + escapeHtml(STEPS[current - 1]);
    }
  }

  function updateActions() {
    var step = state.ui.step;
    btnBack.hidden = (step === 1 || step === 8);
    btnSave.hidden = (step === 8);
    actions.hidden = (step === 8);
    btnNext.textContent = step === 7 ? 'Sign & Submit' : 'Continue';
    btnNext.disabled = submitting;
  }

  function showStep(n, opts) {
    opts = opts || {};
    state.ui.step = n;
    panels.forEach(function (panel) {
      var step = parseInt(panel.getAttribute('data-step'), 10);
      panel.hidden = step !== n;
    });
    updateStepper();
    updateActions();

    if (n === 6) renderReview();
    if (n === 8) renderDecision(opts.previewStatus);

    if (opts.scroll !== false) {
      var card = document.querySelector('.app-card');
      var top = card ? card.getBoundingClientRect().top + window.scrollY - 100 : 0;
      window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    }
    if (opts.focus !== false) {
      var heading = n === 8
        ? (decisionPanel ? decisionPanel.querySelector('h2') : null)
        : panels[n - 1].querySelector('h2');
      if (heading) {
        if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
        try { heading.focus({ preventScroll: true }); } catch (err) { /* ignore */ }
      }
    }
    if (n < 8) persistSoon();
  }

  function goBack() {
    if (state.ui.step <= 1) return;
    clearErrors();
    if (editReturn && state.ui.step < 6) {
      editReturn = false;
      showStep(6);
      return;
    }
    showStep(state.ui.step - 1);
  }

  async function continueFromCurrent() {
    if (submitting) return;
    var step = state.ui.step;
    if (step === 8) return;

    var errors;
    if (step === 6) {
      errors = validateAllBeforeReview();
      if (!errors.length) errors = validateStep5();
    } else if (step === 7) {
      errors = validateAllBeforeReview().concat(validateAgreements());
    } else {
      errors = stepValidator(step)();
    }

    if (errors.length) {
      // Show warning but allow proceeding to next step
      showWarning('Some required fields are missing. You can continue and complete them later.');
      showErrors(errors);
    } else {
      clearErrors();
    }

    if (step === 7) {
      await submitApplication();
      return;
    }

    if (editReturn && step < 6) {
      editReturn = false;
      state.ui.maxStep = Math.max(state.ui.maxStep, 6);
      showStep(6);
      return;
    }

    var next = Math.min(8, step + 1);
    state.ui.maxStep = Math.max(state.ui.maxStep, next);
    showStep(next);
  }

  /* ---------------------------------------------------------------- review -- */
  function valueOr(value, placeholder) {
    var v = val(value);
    return v ? escapeHtml(v) : '<span class="empty">' + escapeHtml(placeholder || 'Not provided') + '</span>';
  }

  function accountTypeLabel() {
    if (state.accountType === 'checking') return 'Checking Account';
    if (state.accountType === 'savings') return 'Savings Account';
    if (state.accountType === 'money-market') return 'Money Market Account';
    return '';
  }

  var CITIZENSHIP_LABELS = {
    'us-citizen': 'U.S. citizen',
    'permanent-resident': 'U.S. permanent resident',
    'non-resident-alien': 'Non-resident alien',
    'other': 'Other'
  };
  var EMPLOYMENT_LABELS = {
    'employed': 'Employed',
    'self-employed': 'Self-employed',
    'business-owner': 'Business owner',
    'unemployed': 'Unemployed',
    'retired': 'Retired',
    'student': 'Student',
    'other': 'Other'
  };
  var TIN_LABELS = { ssn: 'SSN', itin: 'ITIN', foreign: 'Foreign TIN' };

  function formatDob(value) {
    var parts = String(value || '').split('-');
    if (parts.length !== 3) return value || '';
    var d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    if (isNaN(d.getTime())) return value;
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function addressLine(prefix, a) {
    if (!a) return '';
    var bits = [a.street, a.apt].filter(function (x) { return val(x); });
    if (!bits.length) return '';
    return bits.join(', ');
  }

  function buildReviewSections() {
    var p = state.personal;
    var c = state.contact;
    var e = state.employment;
    var f = state.financial;
    var t = state.tax;

    var personalName = [p.firstName, p.middleName, p.lastName].filter(function (x) { return val(x); }).join(' ');
    var address = [addressLine('res', c), [c.city, c.state, c.zip].filter(function (x) { return val(x); }).join(', ')]
      .filter(function (x) { return val(x); }).join(' · ');
    var mailing = c.mailingSame === 'yes'
      ? (address || 'Same as residential address')
      : [addressLine('mail', c.mailing), [c.mailing.city, c.mailing.state, c.mailing.zip].filter(function (x) { return val(x); }).join(', ')]
          .filter(function (x) { return val(x); }).join(' · ');

    return [
      {
        key: 'accountType', step: 1, title: 'Account Type',
        rows: [
          ['Selected account', accountTypeLabel()],
          ['Account ownership', p.ownership === 'joint' ? 'Joint' : (p.ownership === 'individual' ? 'Individual' : '')]
        ]
      },
      {
        key: 'personal', step: 2, title: 'Personal Information',
        rows: [
          ['Full name', personalName],
          ['Date of birth', formatDob(p.dob)],
          ['SSN / ITIN', p.ssnLast4 ? '•••-••-' + p.ssnLast4 : ''],
          ['Citizenship / residency', CITIZENSHIP_LABELS[p.citizenship] || '']
        ]
      },
      {
        key: 'contact', step: 3, title: 'Contact Information',
        rows: [
          ['Email address', c.email],
          ['Mobile phone', c.phone],
          ['Residential address', address],
          ['Mailing address', mailing],
          ['Country', c.country === 'US' ? 'United States' : c.country]
        ]
      },
      {
        key: 'employment', step: 4, title: 'Employment Information',
        rows: [
          ['Employment status', EMPLOYMENT_LABELS[e.status] || ''],
          ['Occupation', e.occupation],
          ['Employer / business', e.employer],
          ['Job title', e.jobTitle],
          ['Industry', e.industry],
          ['Annual income', e.income]
        ]
      },
      {
        key: 'financial', step: 4, title: 'Financial Information',
        rows: [
          ['Primary income source', f.incomeSource],
          ['Source of funds', f.sourceFunds],
          ['Expected monthly deposits', f.monthlyDeposits],
          ['Expected monthly withdrawals', f.monthlyWithdrawals],
          ['Purpose of account', f.purpose],
          ['Expected activity', f.activity]
        ]
      },
      {
        key: 'tax', step: 5, title: 'Tax & Legal Information',
        rows: [
          ['U.S. tax resident', t.usResident === 'yes' ? 'Yes' : (t.usResident === 'no' ? 'No' : '')],
          ['Taxpayer ID type', TIN_LABELS[t.tinType] || ''],
          ['Tax residency country', t.residencyCountry],
          ['Certification', t.certification ? 'Certified' : ''],
          ['Legal declarations', t.declarations ? 'Acknowledged' : ''],
          ['Tax document', t.usResident === 'no' ? 'W-8BEN' : 'W-9']
        ]
      }
    ];
  }

  function renderReview() {
    var sections = buildReviewSections();
    reviewBody.innerHTML = '';

    sections.forEach(function (section) {
      var validator = stepValidator(section.step === 4 ? 4 : section.step);
      var invalid = validator().length > 0;

      // sections on step 4 are validated together; use the same check
      if (section.key === 'employment' || section.key === 'financial') invalid = validateStep4().length > 0;
      if (section.key === 'accountType') invalid = validateStep1().length > 0;
      if (section.key === 'personal') invalid = validateStep2().length > 0;
      if (section.key === 'contact') invalid = validateStep3().length > 0;
      if (section.key === 'tax') invalid = validateStep5().length > 0;

      var card = document.createElement('div');
      card.className = 'review-card';

      var head = document.createElement('div');
      head.className = 'review-head';
      var h3 = document.createElement('h3');
      h3.textContent = section.title;
      head.appendChild(h3);

      if (invalid) {
        var warn = document.createElement('span');
        warn.className = 'review-warn';
        warn.textContent = 'Incomplete';
        head.appendChild(warn);
      }

      var edit = document.createElement('button');
      edit.type = 'button';
      edit.className = 'edit-btn';
      edit.setAttribute('data-edit-step', String(section.step));
      edit.textContent = 'Edit';
      edit.setAttribute('aria-label', 'Edit ' + section.title);
      head.appendChild(edit);
      card.appendChild(head);

      var body = document.createElement('div');
      body.className = 'review-body';
      var dl = document.createElement('dl');
      dl.className = 'review-dl';

      section.rows.forEach(function (row) {
        var wrap = document.createElement('div');
        var dt = document.createElement('dt');
        dt.textContent = row[0];
        var dd = document.createElement('dd');
        var raw = val(row[1]);
        if (raw) dd.textContent = raw;
        else { dd.className = 'empty'; dd.textContent = INCOMPLETE; }
        wrap.appendChild(dt);
        wrap.appendChild(dd);
        dl.appendChild(wrap);
      });

      body.appendChild(dl);
      card.appendChild(body);
      reviewBody.appendChild(card);
    });
  }

  /* -------------------------------------------------------------- decisions -- */
  var DECISION_META = {
    approved: {
      className: 'approved',
      icon: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 6 9 17l-5-5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      title: 'Application Approved',
      sub: 'Your application has been approved.'
    },
    pending_review: {
      className: 'pending',
      icon: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/><path d="M12 7v5l3.5 2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
      title: 'Application Under Review',
      sub: 'Your application has been submitted successfully.'
    },
    declined: {
      className: 'declined',
      icon: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 7l10 10M17 7 7 17" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
      title: 'Application Not Approved',
      sub: 'This application was not approved at this time.'
    }
  };

  function decisionBody(status) {
    var ref = escapeHtml(state.meta.reference || 'Not submitted');
    var decisionDate = formatDate(state.meta.submittedAt);

    if (status === 'approved') {
      return '' +
        '<div class="decision-card">' +
          '<h3>Approval details</h3>' +
          '<p><strong>Application reference:</strong> ' + ref + '<br>' +
          '<strong>Approval date:</strong> ' + escapeHtml(decisionDate) + '<br>' +
          '<strong>Account type:</strong> ' + escapeHtml(accountTypeLabel() || 'Not selected') + '</p>' +
        '</div>' +
        '<div class="decision-card">' +
          '<h3>Next steps</h3>' +
          '<ul>' +
            '<li>Review your approval and account documents.</li>' +
            '<li>Complete identity verification if additional information is requested.</li>' +
            '<li>Fund the account using your preferred method.</li>' +
            '<li>Use your Login ID and password below to sign in to your dashboard.</li>' +
          '</ul>' +
        '</div>' +
        '<div class="decision-card">' +
          '<h3>Account activation information</h3>' +
          '<p>Your account is ready. Continue to your dashboard to view account details and activity.</p>' +
        '</div>' +
        '<div class="decision-card decision-card--credentials">' +
          '<h3>Your Login Credentials (shown once)</h3>' +
          '<p><strong>Login ID / Application Reference:</strong> <span id="cred-login-id">' + ref + '</span></p>' +
          '<p><strong>Login Password:</strong> ' +
          '<span id="cred-password-display">' + (plainPassword ? maskPassword(plainPassword) : '—') + '</span> ' +
          '<button type="button" class="btn btn-sm btn-outline" id="toggle-cred-password" style="margin-left:8px;">Show</button>' +
          '</p>' +
          '<p class="hint">Save your Login ID and password. You will need them to sign in to your dashboard after you log out. Your password is shown only once and is never displayed again.</p>' +
        '</div>' +
        '<div class="decision-action">' +
          '<button type="button" class="btn btn-primary" id="go-to-dashboard">Go to Your Dashboard</button>' +
        '</div>';
    }

    if (status === 'declined') {
      return '' +
        '<div class="decision-card">' +
          '<h3>Decision details</h3>' +
          '<p><strong>Application reference:</strong> ' + ref + '<br>' +
          '<strong>Decision date:</strong> ' + escapeHtml(decisionDate) + '<br>' +
          '<strong>Account type:</strong> ' + escapeHtml(accountTypeLabel() || 'Not selected') + '</p>' +
        '</div>' +
        '<div class="decision-card">' +
          '<h3>What happens next</h3>' +
          '<p>A written notice explaining the decision will be provided. Where required by law, an adverse-action notice will identify the consumer reporting agency used and explain your rights to obtain a copy of your report and dispute inaccurate information.</p>' +
        '</div>' +
        '<div class="decision-card">' +
          '<h3>Questions?</h3>' +
          '<p>Customer support: 1-800-374-9700</p>' +
        '</div>';
    }

    return '' +
      '<div class="decision-card">' +
        '<h3>Review status</h3>' +
        '<p><strong>Application reference:</strong> ' + ref + '<br>' +
        '<strong>Submitted:</strong> ' + escapeHtml(decisionDate) + '<br>' +
        '<strong>Status:</strong> Pending review</p>' +
        '<p>Most applications are reviewed within 1–3 business days.</p>' +
      '</div>' +
      '<div class="decision-card">' +
        '<h3>Additional information</h3>' +
        '<p>No additional information has been requested. We may ask for proof of address, identity verification, or income documentation before making a decision.</p>' +
      '</div>' +
      '<div class="decision-card">' +
        '<h3>Customer support</h3>' +
        '<p>Support reference: ' + ref + '<br>Phone: 1-800-374-9700</p>' +
      '</div>';
  }

  function renderDecision(previewStatus) {
    if (!decisionPanel) return;
    var status = previewStatus || state.meta.status || 'pending_review';
    var meta = DECISION_META[status] || DECISION_META.pending_review;
    var ref = state.meta.reference || 'Not submitted';

    decisionPanel.innerHTML = '' +
      '<div class="decision ' + meta.className + '">' +
        '<div class="decision-icon">' + meta.icon + '</div>' +
        '<h2>' + escapeHtml(meta.title) + '</h2>' +
        '<p class="decision-sub">' + escapeHtml(meta.sub) + '</p>' +
        '<div class="decision-ref">Application reference: <strong>' + escapeHtml(ref) + '</strong></div>' +
        decisionBody(status) +

      '</div>';

    // Wire up the one-time password reveal toggle on the approval page
    var toggleCred = document.getElementById('toggle-cred-password');
    var credDisplay = document.getElementById('cred-password-display');
    if (toggleCred && credDisplay && plainPassword) {
      var revealed = false;
      toggleCred.addEventListener('click', function () {
        revealed = !revealed;
        credDisplay.textContent = revealed ? plainPassword : maskPassword(plainPassword);
        toggleCred.textContent = revealed ? 'Hide' : 'Show';
        toggleCred.setAttribute('aria-pressed', revealed ? 'true' : 'false');
        toggleCred.setAttribute('aria-label', revealed ? 'Hide password' : 'Show password');
      });
    }
  }

  async function submitApplication() {
    if (submitting || state.meta.submitted) {
      if (state.meta.submitted) showStep(8);
      return;
    }
    submitting = true;
    btnNext.classList.add('loading');
    btnNext.disabled = true;
    announce('Submitting your application.');

    setTimeout(async function () {
      state.meta.submitted = true;
      state.meta.status = 'approved';
      state.meta.reference = makeReference();
      state.meta.submittedAt = new Date().toISOString();
      state.agreements.acceptedAt = state.meta.submittedAt;
      state.agreements.docVersion = DOC_VERSION;
      state.ui.maxStep = 8;

      // Hash the customer-created password (client-side prototype only — not production-grade)
      var cp = val(state.contact.createPassword);
      if (cp) {
        state.meta.passwordHash = await hashPassword(cp);
        plainPassword = cp; // memory only — shown once on step 8, never persisted
      }

      submitting = false;
      btnNext.classList.remove('loading');
      persistDraft();
      toast('Application approved. Redirecting to your dashboard...');
      announce('Application approved. Redirecting to dashboard.');
      setTimeout(function () { window.location.assign('/dashboard/'); }, 800);
    }, 1100);
  }

  /* -------------------------------------------------------------- side fx --- */
  function toggleEmployerBlock() {
    var block = document.getElementById('employer-block');
    if (!block) return;
    var show = ['employed', 'self-employed', 'business-owner'].indexOf(state.employment.status) !== -1;
    block.hidden = !show;
  }

  function toggleMailingBlock() {
    var block = document.getElementById('mailing-block');
    if (!block) return;
    block.hidden = state.contact.mailingSame !== 'no';
  }

  function toggleTaxFields() {
    var countryField = document.getElementById('residency-country-field');
    var badge = document.getElementById('tax-doc-badge');
    var text = document.getElementById('tax-doc-text');
    if (countryField) countryField.hidden = state.tax.usResident !== 'no';
    if (state.tax.usResident === 'no') {
      if (badge) badge.textContent = 'W-8BEN';
      if (text) text.textContent = 'Non-U.S. persons generally complete the applicable IRS Form W-8 to certify foreign status and claim any treaty benefits.';
    } else {
      if (badge) badge.textContent = 'W-9';
      if (text) text.textContent = 'U.S. persons generally complete IRS Form W-9 to certify their taxpayer identification number and tax status.';
    }
  }

  function applyModel(el) {
    var path = el.getAttribute('data-model');
    if (!path) return;
    if (el.type === 'checkbox') {
      setPath(state, path, !!el.checked);
    } else if (el.type === 'radio') {
      if (!el.checked) return;
      setPath(state, path, el.value);
    } else {
      setPath(state, path, el.value);
    }
    clearFieldError(el);
    persistSoon();
  }

  function clearFieldError(el) {
    var target = errorContainer(el);
    if (target) {
      var p = target.querySelector(':scope > .js-error');
      if (p) p.remove();
      target.classList.remove('invalid');
    }
    el.classList.remove('invalid');
    el.removeAttribute('aria-invalid');
    var item = el.closest ? el.closest('.check-item') : null;
    if (item) item.classList.remove('invalid');
    if (el.type === 'radio') {
      $all('input[name="' + el.name + '"]').forEach(function (r) { r.removeAttribute('aria-invalid'); });
    }
  }

  /* ----------------------------------------------------------------- events -- */
  function bindEvents() {
    form.addEventListener('input', function (event) {
      var el = event.target;
      if (!el || !el.matches) return;

      if (el.id === 'ssn') {
        var d = digitsOnly(el.value).slice(0, 9);
        fullSsn = d;
        state.personal.ssnLast4 = d.slice(-4);
        el.value = formatSsn(el.value);
        clearFieldError(el);
        persistSoon();
        return;
      }
      if (el.id === 'phone') {
        el.value = formatPhone(el.value);
        applyModel(el);
        return;
      }
      if (el.id === 'zip' || el.id === 'mailZip') {
        el.value = el.value.replace(/[^\d-]/g, '').slice(0, 10);
      }
      if (el.hasAttribute('data-model') || el.hasAttribute('data-agreement')) {
        if (el.hasAttribute('data-agreement')) {
          state.agreements.accepted[el.getAttribute('data-agreement')] = !!el.checked;
          clearFieldError(el);
          persistSoon();
        } else {
          applyModel(el);
          if (el.id === 'createPassword') {
            updatePasswordStrength(el.value);
          }
          if (el.id === 'confirmPassword') {
            updatePasswordMatchHint();
          }
        }
      }
    });

    form.addEventListener('change', function (event) {
      var el = event.target;
      if (!el || !el.matches) return;

      if (el.hasAttribute('data-agreement')) {
        state.agreements.accepted[el.getAttribute('data-agreement')] = !!el.checked;
        clearFieldError(el);
        persistSoon();
        return;
      }

      if (el.hasAttribute('data-model')) {
        applyModel(el);
        var path = el.getAttribute('data-model');
        if (path === 'employment.status') toggleEmployerBlock();
        if (path === 'contact.mailingSame') toggleMailingBlock();
        if (path === 'tax.usResident') toggleTaxFields();
        if (path === 'personal.ownership' || path === 'tax.tinType') { /* no extra ui */ }
      }
    });

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      continueFromCurrent();
    });

    btnBack.addEventListener('click', goBack);
    btnNext.addEventListener('click', function (event) {
      if (btnNext.type !== 'submit') continueFromCurrent();
    });
    btnSave.addEventListener('click', function () {
      persistDraft();
      toast('Progress saved in this browser tab. Sensitive fields are not stored.');
    });

    toggleSsn.addEventListener('click', function () {
      var show = ssnInput.type === 'password';
      ssnInput.type = show ? 'text' : 'password';
      toggleSsn.textContent = show ? 'Hide' : 'Show';
      toggleSsn.setAttribute('aria-pressed', show ? 'true' : 'false');
      toggleSsn.setAttribute('aria-label', show ? 'Hide SSN or ITIN' : 'Show SSN or ITIN');
    });

    var toggleCreate = document.getElementById('toggle-create-password');
    var toggleConfirm = document.getElementById('toggle-confirm-password');
    if (toggleCreate) {
      toggleCreate.addEventListener('click', function () {
        var show = document.getElementById('createPassword').type === 'password';
        document.getElementById('createPassword').type = show ? 'text' : 'password';
        toggleCreate.textContent = show ? 'Hide' : 'Show';
        toggleCreate.setAttribute('aria-pressed', show ? 'true' : 'false');
        toggleCreate.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
      });
    }
    if (toggleConfirm) {
      toggleConfirm.addEventListener('click', function () {
        var show = document.getElementById('confirmPassword').type === 'password';
        document.getElementById('confirmPassword').type = show ? 'text' : 'password';
        toggleConfirm.textContent = show ? 'Hide' : 'Show';
        toggleConfirm.setAttribute('aria-pressed', show ? 'true' : 'false');
        toggleConfirm.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
      });
    }

    stepper.addEventListener('click', function (event) {
      var li = event.target.closest('li');
      if (!li || !li.classList.contains('is-done')) return;
      if (state.meta.submitted) { showStep(8); return; }
      var n = parseInt(li.getAttribute('data-step'), 10);
      if (!n || n === state.ui.step) return;
      clearErrors();
      editReturn = false;
      showStep(n);
    });

    reviewBody.addEventListener('click', function (event) {
      var btn = event.target.closest('[data-edit-step]');
      if (!btn) return;
      clearErrors();
      editReturn = true;
      showStep(parseInt(btn.getAttribute('data-edit-step'), 10));
    });


    decisionPanel.addEventListener('click', function (event) {
      var btn = event.target.closest('#go-to-dashboard');
      if (!btn) return;
      location.assign('/dashboard/');
    });

    window.addEventListener('beforeunload', function (event) {
      if (!state.meta.submitted && hasDraftData()) {
        event.preventDefault();
        event.returnValue = '';
        return '';
      }
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        $all('#app-form details[open]').forEach(function (d) { d.removeAttribute('open'); });
      }
    });
  }

  /* ------------------------------------------------------------------- init -- */
  function updateMode() {
    var params = new URLSearchParams(window.location.search);
    var mode = params.get('mode');
    if (mode === 'activate') {
      var h1 = document.getElementById('page-title');
      var sub = document.getElementById('page-subtitle');
      if (h1) h1.textContent = 'Activate Your Account';
      if (sub) sub.textContent = 'Confirm your details and activate your Citi® account in eight short steps. You can review and edit everything before you submit.';
      document.title = 'Activate Your Account | Citi';
    }
  }

  function init() {
    var stateSelect = document.getElementById('state');
    var mailStateSelect = document.getElementById('mailState');
    fillSelect(stateSelect, US_STATES);
    fillSelect(mailStateSelect, US_STATES);

    var dob = document.getElementById('dob');
    if (dob) dob.max = new Date().toISOString().slice(0, 10);

    restoreDraft();
    renderAgreements();
    fillFormValues();
    toggleEmployerBlock();
    toggleMailingBlock();
    toggleTaxFields();
    updateMode();
    bindEvents();

    var startStep = state.meta.submitted ? 8 : (state.ui.step || 1);
    showStep(startStep, { scroll: false, focus: false });

    if (state.personal.ssnLast4 && ssnInput) {
      ssnInput.placeholder = '•••-••-' + state.personal.ssnLast4 + ' (re-enter to continue)';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
