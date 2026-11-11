/* ============================================================================
 * Citi Online Banking — customer dashboard
 *
 * Data source
 *   The application is front-end only (no core banking backend). The only
 *   authoritative record of a customer is the application they submitted,
 *   stored in sessionStorage by /account-application/app.js:
 *     citi-application-draft-v1   the submitted application (identity source)
 *
 *   This dashboard never reads a customer identifier from the URL and never
 *   invents financial data. Balances, payments and transactions are only
 *   rendered when a trusted source supplies them; otherwise the UI shows an
 *   explicit empty state.
 * ========================================================================== */

(function () {
  'use strict';

  var DRAFT_KEY = 'citi-application-draft-v1';
  var SESSION_KEY = 'citi-dashboard-session-v1';
  var LEGACY_KEY = 'citi-dashboard-account-v1';
  var ACCOUNT_ENTRY = '/account-application/';

  var ACCOUNT_TYPE_LABELS = {
    checking: 'Checking Account',
    savings: 'Savings Account',
    'money-market': 'Money Market Account',
  };

  /* ------------------------------------------------------------------ dom -- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function setText(sel, value) {
    var el = $(sel);
    if (el) el.textContent = value;
  }

  // Sets a value and marks it as "no data" when it is the em-dash placeholder.
  function setValue(sel, value) {
    var el = $(sel);
    if (!el) return;
    var text = (value === null || value === undefined || value === '') ? '—' : String(value);
    el.textContent = text;
    el.classList.toggle('is-empty', text === '—');
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ------------------------------------------------------------ formatting -- */
  function formatCurrency(value) {
    if (value === null || value === undefined || value === '') return '—';
    var n = Number(value);
    if (!isFinite(n)) return '—';
    return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatDate(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function formatDateTime(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' at ' +
      d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  function greetingFor(date) {
    var h = date.getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  }

  /* --------------------------------------------------------------- storage -- */
  function readJson(key) {
    try {
      var raw = sessionStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function writeJson(key, value) {
    try { sessionStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ }
  }

  function removeKey(key) {
    try { sessionStorage.removeItem(key); } catch (e) { /* ignore */ }
  }

  /* ---------------------------------------------------------------- model -- */
  function buildSession(draft) {
    var personal = draft.personal || {};
    var contact = draft.contact || {};
    var meta = draft.meta || {};

    var firstName = (personal.firstName || '').trim();
    var middleName = (personal.middleName || '').trim();
    var lastName = (personal.lastName || '').trim();
    var fullName = [firstName, middleName, lastName].filter(Boolean).join(' ');

    var accountType = draft.accountType || '';
    var reference = meta.reference || '';

    // The prototype account identifier is derived from the reference the
    // application actually issued. It is explicitly NOT a bank-issued account
    // number — the UI labels it as a prototype id.
    var refParts = reference.split('-');
    var datePart = refParts[1] || '';
    var idPart = refParts[2] || '';
    var prototypeId = 'P-' + datePart + '-' + idPart;
    var last4 = idPart.slice(-4) || '0000';

    var street = [contact.street, contact.apt].filter(Boolean).join(', ');
    var mailing = contact.mailingSame === 'yes'
      ? street
      : [contact.mailing && contact.mailing.street, contact.mailing && contact.mailing.apt].filter(Boolean).join(', ');
    var cityLine = [contact.city, contact.state, contact.zip].filter(Boolean).join(', ');

    var status = (meta.status || '').toLowerCase();
    var accountStatus = status === 'approved' ? 'Active' : (status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Active');

    var legacy = readJson(LEGACY_KEY);
    var previous = legacy && legacy.reference === reference ? legacy : null;

    return {
      applicationReference: reference,
      submittedAt: meta.submittedAt || '',
      openedDate: meta.submittedAt || '',
      firstName: firstName,
      middleName: middleName,
      lastName: lastName,
      fullName: fullName,
      email: contact.email || '',
      phone: contact.phone || '',
      street: street,
      city: cityLine,
      mailingAddress: [mailing, cityLine].filter(Boolean).join(', '),
      accountType: accountType,
      accountTypeLabel: ACCOUNT_TYPE_LABELS[accountType] || 'Deposit Account',
      accountStatus: accountStatus,
      prototypeId: prototypeId,
      maskedId: '•••• •••• •••• ' + last4,
      maskedShort: '••• ' + last4,
      lastSignIn: previous && previous.lastSignIn ? previous.lastSignIn : new Date().toISOString(),
      firstSignIn: !(previous && previous.lastSignIn),
      device: 'This browser',
      // Balances / payments / transactions stay null until a trusted data
      // source provides them. The UI renders explicit empty states.
      availableBalance: null,
      currentBalance: null,
      upcomingPayment: null,
      paymentHistory: null,
      transactions: null,
    };
  }

  function persistSession(session) {
    writeJson(SESSION_KEY, {
      reference: session.applicationReference,
      lastSignIn: session.lastSignIn,
      device: session.device,
      signedInAt: new Date().toISOString(),
    });
  }

  /* --------------------------------------------------------------- toast -- */
  var toastTimer = null;
  function toast(message) {
    var el = $('#toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 3200);
  }

  /* ------------------------------------------------------------- rendering -- */
  function renderIdentity(session) {
    var initials = ((session.firstName || '')[0] || '') + ((session.lastName || '')[0] || '');
    setText('#profile-initials', initials.toUpperCase() || '--');
    setText('#profile-name', session.fullName || 'Signed in');
    setText('#dropdown-name', session.fullName || '—');
    setText('#dropdown-email', session.email || '—');
    setText('#mobile-user', session.fullName ? session.fullName + (session.email ? ' · ' + session.email : '') : '—');
  }

  function renderWelcome(session) {
    var greeting = greetingFor(new Date());
    setText('#welcome-greeting', session.firstName ? greeting + ', ' + session.firstName : greeting);
    setText('#welcome-hello', session.firstName ? 'Hello, ' + session.firstName + '!' : 'Hello!');
    setText('#meta-lastsignin', session.firstSignIn ? 'First sign-in' : formatDateTime(session.lastSignIn));
    setText('#meta-status', session.accountStatus);
  }

  function renderHero(session) {
    setText('#hero-eyebrow', session.accountTypeLabel);
    setText('#hero-holder', session.fullName || 'Account holder');
    setText('#hero-status', session.accountStatus);
    setText('#hero-opened', formatDate(session.openedDate));
    setText('#hero-type', session.accountTypeLabel);
    setText('#hero-reference', session.applicationReference || '—');

    var statusPill = $('#hero-status');
    if (statusPill) {
      statusPill.classList.remove('status-pill--pending', 'status-pill--inactive');
      if (session.accountStatus !== 'Active') statusPill.classList.add('status-pill--pending');
    }

    setValue('#hero-available', formatCurrency(session.availableBalance));
    setText('#hero-available-sub', session.availableBalance === null
      ? 'No balance data available yet'
      : 'As of ' + formatDateTime(session.lastSignIn));
  }

  function renderStats(session) {
    setValue('#stat-available', formatCurrency(session.availableBalance));
    setText('#stat-available-sub', session.availableBalance === null ? 'No balance data available yet' : 'Available to withdraw');
    setValue('#stat-current', formatCurrency(session.currentBalance));
    setText('#stat-current-sub', session.currentBalance === null ? 'No balance data available yet' : 'Total account balance');
    setText('#stat-type', session.accountTypeLabel);
    setText('#stat-type-sub', 'Selected during application');
    setText('#stat-status', session.accountStatus);
    setText('#stat-status-sub', 'Status of your application');
  }

  function renderDetails(session) {
    setText('#info-name', session.fullName || '—');
    setText('#info-number', session.prototypeId || '—');
    setText('#info-type', session.accountTypeLabel);
    setText('#info-status', session.accountStatus);
    setText('#info-opened', formatDate(session.openedDate));
    setText('#info-email', session.email || '—');
    setText('#info-phone', session.phone || '—');
    setText('#info-address', session.mailingAddress || '—');
    setText('#support-email', session.email || '—');
  }

  function renderSidebar(session) {
    setValue('#sb-available', formatCurrency(session.availableBalance));
    setText('#sb-account', session.maskedId || '—');

    var list = $('#sidebar-accounts');
    var empty = $('#sidebar-accounts-empty');
    if (!list) return;

    var accounts = [{
      id: 'primary',
      label: session.accountTypeLabel,
      number: session.maskedShort,
      active: true,
    }];
    if (session.accountType === 'checking') {
      accounts.push({ id: 'savings', label: 'Savings Account', number: null, active: false });
    }

    list.innerHTML = accounts.map(function (a) {
      return '<li class="sidebar-item' + (a.active ? ' sidebar-item--active' : '') + '">' +
        '<span class="sidebar-item-label">' + escapeHtml(a.label) + '</span>' +
        '<span class="sidebar-item-amount">' + escapeHtml(a.number || 'Not opened') + '</span>' +
        '</li>';
    }).join('');
    if (empty) empty.hidden = accounts.length > 0;

    // Recent activity — the same events shown in the activity timeline.
    var events = buildActivity(session).slice(0, 3);
    var actList = $('#sidebar-activity');
    var actEmpty = $('#sidebar-activity-empty');
    if (actList) {
      if (!events.length) {
        actList.innerHTML = '';
        if (actEmpty) actEmpty.hidden = false;
      } else {
        if (actEmpty) actEmpty.hidden = true;
        actList.innerHTML = events.map(function (e) {
          return '<li class="sidebar-item">' +
            '<span class="sidebar-activity-title">' + escapeHtml(e.title) + '</span>' +
            '<span class="sidebar-activity-time">' + escapeHtml(e.meta) + '</span>' +
            '</li>';
        }).join('');
      }
    }
  }

  var QUICK_ACTIONS = [
    { id: 'transfer', icon: 'arrow-left-right', label: 'Transfer Money', sub: 'Between your accounts', action: 'scroll', target: '#payments' },
    { id: 'pay-bills', icon: 'receipt', label: 'Pay Bills', sub: 'Payee management', action: 'scroll', target: '#payments' },
    { id: 'statements', icon: 'file-text', label: 'View Statements', sub: 'Monthly statements', action: 'scroll', target: '#statements' },
    { id: 'history', icon: 'history', label: 'Transaction History', sub: 'Recent activity', action: 'scroll', target: '#statements' },
    { id: 'cards', icon: 'credit-card', label: 'Manage Cards', sub: 'Card controls', action: 'scroll', target: '#products' },
    { id: 'details', icon: 'landmark', label: 'Account Details', sub: 'Profile and settings', action: 'scroll', target: '#details' },
    { id: 'support', icon: 'headset', label: 'Contact Support', sub: 'Call or visit help', action: 'scroll', target: '#support' },
    { id: 'security', icon: 'shield-check', label: 'Security Settings', sub: 'Alerts and sessions', action: 'scroll', target: '#security' },
  ];

  function iconSvg(name, size) {
    var defs = window.__DASH_ICONS__ && window.__DASH_ICONS__[name];
    if (!defs) return '';
    return '<svg class="ic" width="' + (size || 18) + '" height="' + (size || 18) + '" viewBox="0 0 24 24" fill="none" ' +
      'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + defs.inner + '</svg>';
  }

  function renderQuickActions() {
    var grid = $('#qa-grid');
    if (!grid) return;
    grid.innerHTML = QUICK_ACTIONS.map(function (a) {
      return '<button class="qa-item" type="button" data-action="' + a.action + '" data-target="' + a.target + '">' +
        '<span class="qa-icon">' + iconSvg(a.icon, 18) + '</span>' +
        '<span><span class="qa-label">' + escapeHtml(a.label) + '</span>' +
        '<span class="qa-sub">' + escapeHtml(a.sub) + '</span></span>' +
        '</button>';
    }).join('');
  }

  var SERVICES = [
    { icon: 'wallet', title: 'Direct Deposit', sub: 'Add a routing and account number to receive your paychecks.', badge: 'Not set up', tone: 'off' },
    { icon: 'send', title: 'Pay Bills', sub: 'Bill pay is not enabled in this prototype.', badge: 'Coming soon', tone: 'soon' },
    { icon: 'arrow-left-right', title: 'Transfers', sub: 'Account-to-account transfers are not enabled in this prototype.', badge: 'Coming soon', tone: 'soon' },
    { icon: 'bell', title: 'Alerts & Notifications', sub: 'Account and security alerts appear in the notifications menu.', badge: 'Active', tone: 'on' },
    { icon: 'file-text', title: 'Statements', sub: 'Monthly statements appear here once the account has activity.', badge: 'Active', tone: 'on' },
    { icon: 'credit-card', title: 'Manage Cards', sub: 'Card controls and replacement are not enabled in this prototype.', badge: 'Coming soon', tone: 'soon' },
  ];

  function renderServices() {
    var grid = $('#service-grid');
    if (!grid) return;
    grid.innerHTML = SERVICES.map(function (s) {
      return '<div class="service-item">' +
        '<span class="service-icon">' + iconSvg(s.icon, 18) + '</span>' +
        '<div><p class="service-title">' + escapeHtml(s.title) + '</p>' +
        '<p class="service-sub">' + escapeHtml(s.sub) + '</p>' +
        '<span class="service-badge service-badge--' + s.tone + '">' + escapeHtml(s.badge) + '</span>' +
        '</div></div>';
    }).join('');
  }

  function renderProducts(session) {
    var grid = $('#product-grid');
    if (!grid) return;
    var cards = [{
      name: session.accountTypeLabel,
      type: 'Your account',
      desc: 'This is the account you opened. Your account details are on the Account Information panel.',
      badge: 'Active',
      tone: 'on',
      cta: null,
    }];
    if (session.accountType === 'checking') {
      cards.push({
        name: 'Savings Account', type: 'Deposit account',
        desc: 'Earn interest on your savings with a linked savings account.',
        badge: 'Available to open', tone: 'soon',
        cta: { label: 'Open an Account', href: ACCOUNT_ENTRY },
      });
    }
    cards.push({
      name: 'Money Market Account', type: 'Deposit account',
      desc: 'A higher-yield savings option for short-term balances.',
      badge: 'Available to open', tone: 'soon',
      cta: { label: 'Open an Account', href: ACCOUNT_ENTRY },
    });

    grid.innerHTML = cards.map(function (c) {
      return '<article class="product-card' + (c.tone === 'on' ? ' product-card--active' : '') + '">' +
        '<p class="product-type">' + escapeHtml(c.type) + '</p>' +
        '<p class="product-name">' + escapeHtml(c.name) + '</p>' +
        '<p class="product-desc">' + escapeHtml(c.desc) + '</p>' +
        '<span class="service-badge service-badge--' + c.tone + '">' + escapeHtml(c.badge) + '</span>' +
        (c.cta ? '<a class="btn btn-outline btn-sm product-cta" href="' + c.cta.href + '">' + escapeHtml(c.cta.label) + '</a>' : '') +
        '</article>';
    }).join('');
  }

  function renderPayments(session) {
    var upcoming = session.upcomingPayment;
    var emptyEl = $('#upcoming-empty');
    var detailEl = $('#upcoming-detail');
    var btn = $('#btn-make-payment');

    if (!upcoming) {
      if (emptyEl) emptyEl.hidden = false;
      if (detailEl) detailEl.hidden = true;
      if (btn) btn.hidden = true;
    } else {
      if (emptyEl) emptyEl.hidden = true;
      if (detailEl) detailEl.hidden = false;
      setText('#upcoming-due', formatDate(upcoming.dueDate));
      setText('#upcoming-amount', formatCurrency(upcoming.amount));
      setText('#upcoming-payee', upcoming.payee || '—');
      if (btn) btn.hidden = false;
    }

    var history = session.paymentHistory;
    var histEl = $('#payment-history');
    var histEmpty = $('#payment-history-empty');
    if (!history || !history.length) {
      if (histEl) histEl.innerHTML = '';
      if (histEmpty) histEmpty.hidden = false;
    } else {
      if (histEmpty) histEmpty.hidden = true;
      if (histEl) {
        histEl.innerHTML = history.map(function (p) {
          return '<li class="mini-item"><span>' + escapeHtml(p.description || '') + ' · ' + escapeHtml(formatDate(p.date)) +
            '</span><span>' + escapeHtml(formatCurrency(p.amount)) + '</span></li>';
        }).join('');
      }
    }
  }

  var TX_TYPES = {
    deposit: { label: 'Deposit', tone: 'credit' },
    credit: { label: 'Credit', tone: 'credit' },
    debit: { label: 'Debit', tone: 'debit' },
    withdrawal: { label: 'Withdrawal', tone: 'debit' },
    payment: { label: 'Payment', tone: 'debit' },
  };

  function renderTransactions(session) {
    var rows = session.transactions;
    var emptyEl = $('#transactions-empty');
    var wrap = $('#transactions-table-wrap');
    var body = $('#transactions-body');

    if (!rows || !rows.length) {
      if (emptyEl) emptyEl.hidden = false;
      if (wrap) wrap.hidden = true;
      return;
    }
    if (emptyEl) emptyEl.hidden = true;
    if (wrap) wrap.hidden = false;
    if (!body) return;

    body.innerHTML = rows.map(function (t) {
      var type = TX_TYPES[t.type] || { label: t.type || 'Transaction', tone: '' };
      var isCredit = t.amount >= 0;
      var amountClass = isCredit ? 'tx-amount--credit' : 'tx-amount--debit';
      var statusHtml = t.status && t.status.toLowerCase() === 'pending'
        ? '<span class="tx-status tx-status--pending">Pending</span>'
        : '<span class="tx-status">Completed</span>';
      return '<tr>' +
        '<td><span class="tx-desc">' + escapeHtml(t.description || '') + '</span></td>' +
        '<td>' + escapeHtml(formatDate(t.date)) + '</td>' +
        '<td><span class="tx-type tx-type--' + type.tone + '">' + escapeHtml(type.label) + '</span></td>' +
        '<td class="ta-right"><span class="tx-amount ' + amountClass + '">' +
          (isCredit ? '+' : '−') + escapeHtml(formatCurrency(Math.abs(t.amount)).replace('$', '$')) + '</span></td>' +
        '<td>' + statusHtml + '</td>' +
        '</tr>';
    }).join('');
  }

  function buildActivity(session) {
    var events = [];
    if (session.submittedAt) {
      events.push({
        icon: 'check-circle-2',
        title: 'Application submitted and approved',
        meta: formatDateTime(session.submittedAt),
      });
      events.push({
        icon: 'landmark',
        title: session.accountTypeLabel + ' opened',
        meta: formatDate(session.openedDate),
      });
      events.push({
        icon: 'users',
        title: 'Customer profile created',
        meta: formatDateTime(session.submittedAt),
      });
    }
    events.push({
      icon: 'log-out',
      title: session.firstSignIn ? 'First sign-in to online banking' : 'Signed in to online banking',
      meta: formatDateTime(session.lastSignIn),
    });
    if (session.turnstileVerified) {
      events.push({
        icon: 'shield-check',
        title: 'Human verification completed',
        meta: formatDateTime(session.turnstileVerifiedAt),
      });
    }
    return events;
  }

  function renderActivity(session) {
    var events = buildActivity(session);
    var list = $('#activity-list');
    var emptyEl = $('#activity-empty');
    if (!list) return;

    if (!events.length) {
      list.innerHTML = '';
      if (emptyEl) emptyEl.hidden = false;
      return;
    }
    if (emptyEl) emptyEl.hidden = true;
    list.innerHTML = events.map(function (e) {
      return '<li class="tl-item">' +
        '<p class="tl-title">' + escapeHtml(e.title) + '</p>' +
        '<p class="tl-meta">' + escapeHtml(e.meta) + '</p>' +
        '</li>';
    }).join('');
  }

  function renderNotifications(session) {
    var events = buildActivity(session).slice(0, 4);
    var list = $('#notification-list');
    var emptyEl = $('#notification-empty');
    var badge = $('#notification-badge');
    if (!list) return;

    if (!events.length) {
      list.innerHTML = '';
      if (emptyEl) emptyEl.hidden = false;
      if (badge) badge.hidden = true;
      return;
    }
    if (emptyEl) emptyEl.hidden = true;
    if (badge) { badge.hidden = false; badge.textContent = String(events.length); }
    list.innerHTML = events.map(function (e) {
      return '<li class="dropdown-notification">' +
        '<span class="ic-wrap">' + iconSvg(e.icon, 16) + '</span>' +
        '<div><p>' + escapeHtml(e.title) + '</p><time>' + escapeHtml(e.meta) + '</time></div>' +
        '</li>';
    }).join('');
  }

  function renderSecurity(session) {
    setText('#security-lastsignin', session.firstSignIn ? 'First sign-in just now' : formatDateTime(session.lastSignIn));
  }

  /* --------------------------------------------------------------- number -- */
  var numberVisible = false;

  function applyNumberVisibility() {
    var session = currentSession;
    setText('#account-number-value', numberVisible ? session.prototypeId : session.maskedId);
    setText('#info-number', numberVisible ? session.prototypeId : session.maskedId);
    setText('#sb-account', numberVisible ? session.prototypeId : session.maskedId);
    var btn = $('#btn-toggle-number');
    if (btn) btn.setAttribute('aria-pressed', numberVisible ? 'true' : 'false');
    setText('#toggle-number-label', numberVisible ? 'Hide account number' : 'View account number');
    var iconEl = $('#toggle-number-icon');
    if (iconEl) iconEl.innerHTML = iconSvg(numberVisible ? 'eye-off' : 'eye', 16);
  }

  function copyText(text, successMessage) {
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      toast(ok ? successMessage : 'Copy failed — the number is: ' + text);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast(successMessage); }, fallback);
    } else {
      fallback();
    }
  }

  /* ---------------------------------------------------------------- modal -- */
  var lastFocused = null;

  function openModal(title, html) {
    var modal = $('#modal');
    if (!modal) return;
    lastFocused = document.activeElement;
    setText('#modal-title', title);
    $('#modal-body').innerHTML = html;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    var close = $('[data-modal-close]', modal);
    if (close) close.focus();
  }

  function closeModal() {
    var modal = $('#modal');
    if (!modal) return;
    modal.hidden = true;
    document.body.style.overflow = '';
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }

  function openSearch() {
    var modal = $('#search-modal');
    if (!modal) return;
    lastFocused = document.activeElement;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    var input = $('#search-input');
    if (input) { input.value = ''; input.focus(); }
    renderSearch('');
  }

  function closeSearch() {
    var modal = $('#search-modal');
    if (!modal) return;
    modal.hidden = true;
    document.body.style.overflow = '';
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }

  var SEARCH_INDEX = [
    { label: 'Account summary card', icon: 'landmark', target: '#overview', keywords: 'account balance number card' },
    { label: 'Account overview', icon: 'wallet', target: '#overview', keywords: 'available current balance status type' },
    { label: 'Quick Actions', icon: 'arrow-left-right', target: '#quick-actions', keywords: 'transfer pay bills statements cards security support' },
    { label: 'Payments & Billing', icon: 'receipt', target: '#payments', keywords: 'payment bill due autopay' },
    { label: 'Statements & transactions', icon: 'file-text', target: '#statements', keywords: 'statement transaction history debit credit' },
    { label: 'Account Services', icon: 'settings', target: '#services', keywords: 'service direct deposit alerts cards' },
    { label: 'Explore Products', icon: 'book-open', target: '#products', keywords: 'product savings money market credit card' },
    { label: 'Account Information', icon: 'landmark', target: '#details', keywords: 'name email phone address information' },
    { label: 'Security Settings', icon: 'shield-check', target: '#security', keywords: 'security sign in session device verification' },
    { label: 'Recent Account Activity', icon: 'clock', target: '#activity', keywords: 'activity history recent events' },
    { label: 'Help & Support', icon: 'headset', target: '#support', keywords: 'help support contact call' },
  ];

  function renderSearch(query) {
    var list = $('#search-results');
    var emptyEl = $('#search-empty');
    if (!list) return;
    var q = (query || '').trim().toLowerCase();
    var matches = !q ? SEARCH_INDEX : SEARCH_INDEX.filter(function (item) {
      return (item.label + ' ' + item.keywords).toLowerCase().indexOf(q) !== -1;
    });
    if (!matches.length) {
      list.innerHTML = '';
      if (emptyEl) emptyEl.hidden = false;
      return;
    }
    if (emptyEl) emptyEl.hidden = true;
    list.innerHTML = matches.map(function (item) {
      return '<li><button class="search-result" type="button" data-target="' + item.target + '">' +
        iconSvg(item.icon, 16) + '<span>' + escapeHtml(item.label) + '</span></button></li>';
    }).join('');
  }

  /* ------------------------------------------------------------ navigation -- */
  function scrollToTarget(selector) {
    var el = $(selector);
    if (!el) return;
    var top = el.getBoundingClientRect().top + window.scrollY - 84;
    window.scrollTo({ top: top, behavior: 'smooth' });
    setActiveNav(selector);
  }

  function setActiveNav(target) {
    var key = String(target || '').replace('#', '');
    $all('[data-nav]').forEach(function (link) {
      link.classList.toggle('is-active', link.getAttribute('data-nav') === key);
    });
  }

  function setupNav() {
    $all('a[href^="#"]').forEach(function (link) {
      link.addEventListener('click', function (event) {
        var href = link.getAttribute('href');
        if (!href || href === '#') return;
        var target = $(href);
        if (!target) return;
        event.preventDefault();
        scrollToTarget(href);
        closeAllMenus();
      });
    });

    if (window.IntersectionObserver) {
      var observer = new IntersectionObserver(function (entries) {
        var visible = entries.filter(function (e) { return e.isIntersecting; })
          .sort(function (a, b) { return a.boundingClientRect.top - b.boundingClientRect.top; })[0];
        if (visible) setActiveNav('#' + visible.target.id);
      }, { rootMargin: '-90px 0px -60% 0px', threshold: 0 });
      ['overview', 'payments', 'services', 'statements', 'products', 'details', 'security', 'activity', 'support'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) observer.observe(el);
      });
    }
  }

  /* ------------------------------------------------------------ dropdowns -- */
  function closeAllMenus() {
    ['#menu-notifications', '#menu-profile'].forEach(function (sel) {
      var el = $(sel);
      if (el) el.hidden = true;
    });
    ['#btn-notifications', '#btn-profile'].forEach(function (sel) {
      var el = $(sel);
      if (el) el.setAttribute('aria-expanded', 'false');
    });
  }

  function setupDropdowns() {
    var notifBtn = $('#btn-notifications');
    var profileBtn = $('#btn-profile');

    if (notifBtn) {
      notifBtn.addEventListener('click', function (event) {
        event.stopPropagation();
        var menu = $('#menu-notifications');
        var willOpen = menu.hidden;
        closeAllMenus();
        menu.hidden = !willOpen;
        notifBtn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
      });
    }

    if (profileBtn) {
      profileBtn.addEventListener('click', function (event) {
        event.stopPropagation();
        var menu = $('#menu-profile');
        var willOpen = menu.hidden;
        closeAllMenus();
        menu.hidden = !willOpen;
        profileBtn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
      });
    }

    document.addEventListener('click', function (event) {
      if (!event.target.closest || !event.target.closest('.menu-wrap')) closeAllMenus();
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') { closeAllMenus(); closeModal(); closeSearch(); }
    });
  }

  /* -------------------------------------------------------------- mobile -- */
  function setupMobile() {
    var burger = $('#btn-burger');
    var panel = $('#topnav-mobile');
    if (!burger || !panel) return;
    burger.addEventListener('click', function () {
      var open = panel.hidden;
      panel.hidden = !open;
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      burger.innerHTML = iconSvg(open ? 'x' : 'menu', 22);
    });
    $all('.topnav-mobile-link').forEach(function (link) {
      link.addEventListener('click', function () {
        panel.hidden = true;
        burger.setAttribute('aria-expanded', 'false');
        burger.innerHTML = iconSvg('menu', 22);
      });
    });
  }

  /* ------------------------------------------------------------- sign out -- */
  function signOut() {
    removeKey(SESSION_KEY);
    removeKey(DRAFT_KEY);
    removeKey(LEGACY_KEY);
    try { sessionStorage.clear(); } catch (e) { /* ignore */ }
    window.location.assign('/');
  }

  function setupSignOut() {
    ['#signout-btn', '#mobile-signout', '#dropdown-signout'].forEach(function (sel) {
      var btn = $(sel);
      if (btn) btn.addEventListener('click', function () {
        if (window.confirm('Sign out of Citi online banking? Your prototype application data will be cleared from this browser.')) {
          signOut();
        }
      });
    });
  }

  /* ------------------------------------------------------------ turnstile -- */
  function setupTurnstileStatus(session) {
    function check() {
      var input = document.querySelector('input[name="cf-turnstile-response"]');
      if (input && input.value) {
        session.turnstileVerified = true;
        session.turnstileVerifiedAt = new Date().toISOString();
        setText('#security-turnstile', 'Verified — you confirmed you are human');
        renderActivity(session);
        renderNotifications(session);
        persistSession(session);
        return true;
      }
      setText('#security-turnstile', 'Pending — complete the verification below');
      return false;
    }
    check();
    var tries = 0;
    var timer = setInterval(function () {
      if (check() || ++tries > 20) clearInterval(timer);
    }, 1000);
  }

  /* -------------------------------------------------------------- startup -- */
  var currentSession = null;

  function showError(message) {
    var loading = $('#dash-loading');
    var error = $('#dash-error');
    var shell = $('#dash-shell');
    if (loading) loading.hidden = true;
    if (shell) shell.hidden = true;
    if (error) {
      error.hidden = false;
      setText('#dash-error-msg', message);
    }
  }

  function start() {
    var draft = readJson(DRAFT_KEY);

    // Gate: a session exists only when the customer has an approved,
    // submitted application in this browser session. No identifier is ever
    // read from the URL.
    if (!draft || !draft.meta || draft.meta.submitted !== true) {
      window.location.replace(ACCOUNT_ENTRY);
      return;
    }

    currentSession = buildSession(draft);
    persistSession(currentSession);

    var loading = $('#dash-loading');
    var shell = $('#dash-shell');
    if (loading) loading.hidden = true;
    if (shell) shell.hidden = false;

    renderIdentity(currentSession);
    renderWelcome(currentSession);
    renderHero(currentSession);
    renderStats(currentSession);
    renderDetails(currentSession);
    renderSidebar(currentSession);
    renderQuickActions();
    renderServices();
    renderProducts(currentSession);
    renderPayments(currentSession);
    renderTransactions(currentSession);
    renderActivity(currentSession);
    renderNotifications(currentSession);
    renderSecurity(currentSession);
    applyNumberVisibility();

    setupNav();
    setupDropdowns();
    setupMobile();
    setupSignOut();
    setupTurnstileStatus(currentSession);

    // Account number visibility
    var toggle = $('#btn-toggle-number');
    if (toggle) {
      toggle.addEventListener('click', function () {
        numberVisible = !numberVisible;
        applyNumberVisibility();
        toast(numberVisible ? 'Account number shown' : 'Account number hidden');
      });
    }

    // Copy account number
    ['#btn-copy-number', '#btn-copy-number-2'].forEach(function (sel) {
      var btn = $(sel);
      if (!btn) return;
      btn.addEventListener('click', function () {
        copyText(currentSession.prototypeId, 'Account number copied to clipboard');
      });
    });

    // Quick actions
    $all('.qa-item').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var target = btn.getAttribute('data-target');
        if (target) scrollToTarget(target);
      });
    });

    // Account details button on the hero card
    var detailsBtn = $('#btn-account-details');
    if (detailsBtn) detailsBtn.addEventListener('click', function () { scrollToTarget('#details'); });

    // Modals
    $all('[data-modal-close]').forEach(function (el) {
      el.addEventListener('click', closeModal);
    });
    $all('[data-search-close]').forEach(function (el) {
      el.addEventListener('click', closeSearch);
    });

    // Search
    var searchBtn = $('#btn-search');
    if (searchBtn) searchBtn.addEventListener('click', openSearch);
    var searchInput = $('#search-input');
    if (searchInput) {
      searchInput.addEventListener('input', function () { renderSearch(searchInput.value); });
      searchInput.addEventListener('keydown', function (event) {
        if (event.key === 'Enter') {
          var first = $('.search-result');
          if (first) { closeSearch(); scrollToTarget(first.getAttribute('data-target')); }
        }
      });
    }
    $all('.search-result').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var target = btn.getAttribute('data-target');
        closeSearch();
        if (target) scrollToTarget(target);
      });
    });

    // Retry from the error state
    var retry = $('#error-retry');
    if (retry) retry.addEventListener('click', function () { window.location.reload(); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
