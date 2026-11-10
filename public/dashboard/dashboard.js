/* ============================================================================
   Community Bank — Online Banking Dashboard JS (frontend prototype)
   Loads customer data from sessionStorage (set by the account application)
   and renders the dashboard. No backend, no database, no real data.
   ========================================================================== */

(function () {
  'use strict';

  var STORAGE_KEY = 'citi-application-draft-v1';
  var ACCOUNT_KEY = 'citi-dashboard-account-v1';

  /* ---------------------------------------------------------------- data -- */
  function getDraft() {
    try {
      var raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (err) { return null; }
  }

  function getAccount() {
    try {
      var raw = sessionStorage.getItem(ACCOUNT_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (err) { return null; }
  }

  function setAccount(acct) {
    try {
      sessionStorage.setItem(ACCOUNT_KEY, JSON.stringify(acct));
    } catch (err) { /* storage unavailable */ }
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  }

  function formatDateLong(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function formatDateTime(iso) {
    if (!iso) return 'Never';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true
    }) + ' ' + Intl.DateTimeFormat('en-US', { timeZoneName: 'short' }).format(d).split(', ').pop();
  }

  function maskAccount(ref) {
    if (!ref) return '**** **** **** 0000';
    var digits = String(ref).replace(/\D/g, '');
    if (digits.length < 4) return '**** **** **** 0000';
    var last = digits.slice(-4);
    return '**** **** **** ' + last;
  }

  function stateName(abbr) {
    var map = {
      AL:'Alabama', AK:'Alaska', AZ:'Arizona', AR:'Arkansas', CA:'California',
      CO:'Colorado', CT:'Connecticut', DE:'Delaware', DC:'District of Columbia',
      FL:'Florida', GA:'Georgia', HI:'Hawaii', ID:'Idaho', IL:'Illinois',
      IN:'Indiana', IA:'Iowa', KS:'Kansas', KY:'Kentucky', LA:'Louisiana',
      ME:'Maine', MD:'Maryland', MA:'Massachusetts', MI:'Michigan', MN:'Minnesota',
      MS:'Mississippi', MO:'Missouri', MT:'Montana', NE:'Nebraska', NV:'Nevada',
      NH:'New Hampshire', NJ:'New Jersey', NM:'New Mexico', NY:'New York',
      NC:'North Carolina', ND:'North Dakota', OH:'Ohio', OK:'Oklahoma',
      OR:'Oregon', PA:'Pennsylvania', RI:'Rhode Island', SC:'South Carolina',
      SD:'South Dakota', TN:'Tennessee', TX:'Texas', UT:'Utah', VT:'Vermont',
      VA:'Virginia', WA:'Washington', WV:'West Virginia', WI:'Wisconsin', WY:'Wyoming'
    };
    return map[abbr] || abbr || '—';
  }

  /* -------------------------------------------------------------- account -- */
  function buildAccount(draft) {
    var p = draft.personal || {};
    var c = draft.contact || {};
    var acctType = draft.accountType || 'checking';
    var ref = draft.meta.reference || 'APP-' + new Date().toISOString().slice(0,10).replace(/-/g,'') + '-ACCT';
    var existing = getAccount();

    if (existing && existing.reference === ref) return existing;

    var fullName = [p.firstName, p.middleName, p.lastName].filter(Boolean).join(' ');
    var lastSignIn = existing ? existing.lastSignIn : new Date().toISOString();
    var device = existing ? existing.device : 'Desktop Browser';

    var checkingBalance = 4785.91;
    var savingsBalance = 12450.00;

    var acct = {
      reference: ref,
      applicationReference: draft.meta.reference || '',
      accountType: acctType,
      firstName: p.firstName || '',
      lastName: p.lastName || '',
      fullName: fullName,
      email: c.email || '',
      city: c.city || '',
      state: c.state || '',
      zip: c.zip || '',
      lastSignIn: lastSignIn,
      device: device,
      accounts: [
        {
          type: 'checking',
          label: 'Checking Account',
          number: 'ACC-' + ref.slice(-8),
          masked: '**** **** **** ' + (ref.slice(-4) || '0000'),
          available: checkingBalance,
          current: checkingBalance,
          expanded: true,
          transactions: [
            { date: '2026-09-14', desc: 'Online Purchase', amount: -20.00, balance: 4785.91, type: 'debit' },
            { date: '2026-09-10', desc: 'Cash Withdrawal', amount: -30.00, balance: 4805.91, type: 'debit' },
            { date: '2026-09-09', desc: 'Card Purchase Refund', amount: 50.00, balance: 4835.91, type: 'credit' },
            { date: '2026-09-05', desc: 'Direct Deposit', amount: 1250.00, balance: 4785.91, type: 'credit' },
            { date: '2026-09-02', desc: 'Grocery Store', amount: -45.67, balance: 3535.91, type: 'debit' }
          ]
        }
      ]
    };

    if (acctType === 'savings' || acctType === 'money-market') {
      acct.accounts.push({
        type: 'savings',
        label: 'Savings Account',
        number: 'SV-' + ref.slice(-6),
        masked: '**** **** **** ' + (ref.slice(-4) || '0000'),
        available: savingsBalance,
        current: savingsBalance,
        status: 'Active',
        expanded: false,
        transactions: [
          { date: '2026-09-12', desc: 'Monthly Interest', amount: 12.50, balance: 12450.00, type: 'credit' },
          { date: '2026-09-01', desc: 'Automatic Transfer', amount: 500.00, balance: 12437.50, type: 'credit' },
          { date: '2026-08-28', desc: 'ATM Withdrawal', amount: -100.00, balance: 11937.50, type: 'debit' }
        ]
      });
    }

    setAccount(acct);
    return acct;
  }

  /* -------------------------------------------------------------- render -- */
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $all = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function showSection(id) {
    $all('.section').forEach(function (s) { s.classList.remove('active'); });
    $all('.nav-item').forEach(function (n) { n.classList.remove('active'); });
    var section = $('#section-' + id);
    var nav = $('#nav-' + id);
    if (section) section.classList.add('active');
    if (nav) nav.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderWelcome(acct) {
    var firstnameEl = $('#welcome-firstname');
    var fullnameEl = $('#meta-fullname');
    var citystateEl = $('#meta-citystate');
    var lastsigninEl = $('#meta-lastsignin');
    var deviceEl = $('#meta-device');
    var welcomeMeta = $('#welcome-meta');

    if (firstnameEl) firstnameEl.textContent = escapeHtml(acct.firstName || 'Customer');
    if (fullnameEl) fullnameEl.textContent = escapeHtml(acct.fullName || '—');
    if (citystateEl) {
      var parts = [acct.city, acct.state, acct.zip].filter(Boolean);
      citystateEl.textContent = parts.length ? parts.join(', ') : '—';
    }
    if (lastsigninEl) lastsigninEl.textContent = acct.lastSignIn ? formatDateTime(acct.lastSignIn) : 'First sign-in';
    if (deviceEl) deviceEl.textContent = acct.device || '—';

    if (welcomeMeta) {
      var neverSignedIn = !acct.lastSignIn;
      if (neverSignedIn) {
        var notice = document.createElement('p');
        notice.className = 'first-login-msg';
        notice.textContent = 'First sign-in detected. Welcome to your online banking dashboard.';
        welcomeMeta.appendChild(notice);
      }
    }
  }

  function renderAccountCard(acct) {
    var grid = $('#account-grid');
    if (!grid) return;
    grid.innerHTML = '';

    acct.accounts.forEach(function (account) {
      var card = document.createElement('article');
      card.className = 'account-card ' + account.type;

      var header = document.createElement('div');
      header.className = 'account-header' + (account.expanded ? ' expanded' : '');
      header.setAttribute('role', 'button');
      header.setAttribute('tabindex', '0');
      header.setAttribute('aria-expanded', account.expanded ? 'true' : 'false');
      header.setAttribute('aria-label', account.label + ' account, ' + account.masked);

      var info = document.createElement('div');
      info.className = 'account-info';

      var type = document.createElement('div');
      type.className = 'account-type';
      type.textContent = account.label.toUpperCase();

      var name = document.createElement('div');
      name.className = 'account-name';
      name.textContent = escapeHtml(account.label);

      var number = document.createElement('div');
      number.className = 'account-number';
      number.textContent = 'Account Number: ' + escapeHtml(account.masked) + '  ·  Reference: ' + escapeHtml(account.number);

      info.appendChild(type);
      info.appendChild(name);
      info.appendChild(number);

      var balance = document.createElement('div');
      balance.className = 'balance-row';
      var balLabel = document.createElement('span');
      balLabel.className = 'balance-label';
      balLabel.textContent = 'Available Balance';
      var balValue = document.createElement('span');
      balValue.className = 'balance-value';
      balValue.textContent = formatCurrency(account.available);
      balance.appendChild(balLabel);
      balance.appendChild(balValue);

      if (account.current !== undefined && account.current !== account.available) {
        var curRow = document.createElement('div');
        curRow.className = 'balance-row';
        var curLabel = document.createElement('span');
        curLabel.className = 'balance-label';
        curLabel.textContent = 'Current Balance';
        var curValue = document.createElement('span');
        curValue.className = 'balance-value';
        curValue.textContent = formatCurrency(account.current);
        curRow.appendChild(curLabel);
        curRow.appendChild(curValue);
        info.appendChild(curRow);
      }
      info.appendChild(balance);

      if (account.status) {
        var badge = document.createElement('span');
        badge.className = 'status-badge';
        badge.textContent = escapeHtml(account.status);
        info.appendChild(badge);
      }

      var icon = document.createElement('span');
      icon.className = 'expand-icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = '▾';

      header.appendChild(info);
      header.appendChild(icon);
      card.appendChild(header);

      var body = document.createElement('div');
      body.className = 'account-body' + (account.expanded ? '' : ' collapsed');

      var txTitle = document.createElement('div');
      txTitle.className = 'tx-section-title';
      var txHeading = document.createElement('span');
      txHeading.textContent = 'Recent Transactions';
      var viewAll = document.createElement('a');
      viewAll.className = 'view-all';
      viewAll.href = '#';
      viewAll.textContent = 'View All Transactions';
      viewAll.addEventListener('click', function (e) { e.preventDefault(); toast('Transaction history.'); });
      txTitle.appendChild(txHeading);
      txTitle.appendChild(viewAll);

      var table = document.createElement('table');
      table.className = 'tx-table';
      var thead = document.createElement('thead');
      var trHead = document.createElement('tr');
      ['Date', 'Description', 'Debit / Credit', 'Balance'].forEach(function (h) {
        var th = document.createElement('th');
        th.textContent = h;
        trHead.appendChild(th);
      });
      thead.appendChild(trHead);
      table.appendChild(thead);

      var tbody = document.createElement('tbody');
      (account.transactions || []).forEach(function (tx) {
        var row = document.createElement('tr');
        row.className = 'tx-row';

        var tdDate = document.createElement('td');
        tdDate.className = 'tx-date';
        tdDate.textContent = formatDateLong(tx.date);

        var tdDesc = document.createElement('td');
        tdDesc.className = 'tx-desc';
        tdDesc.textContent = escapeHtml(tx.desc);

        var tdAmt = document.createElement('td');
        tdAmt.className = 'tx-amount ' + tx.type;
        tdAmt.textContent = (tx.type === 'credit' ? '+' : '-') + formatCurrency(Math.abs(tx.amount));

        var tdBal = document.createElement('td');
        tdBal.className = 'tx-balance';
        tdBal.textContent = formatCurrency(tx.balance);

        row.appendChild(tdDate);
        row.appendChild(tdDesc);
        row.appendChild(tdAmt);
        row.appendChild(tdBal);
        tbody.appendChild(row);
      });
      table.appendChild(tbody);

      body.appendChild(txTitle);
      body.appendChild(table);

      var note = document.createElement('p');
      note.className = 'tx-note';
      note.textContent = '';
      body.appendChild(note);

      card.appendChild(body);
      grid.appendChild(card);

      header.addEventListener('click', function () {
        var expanded = header.classList.toggle('expanded');
        header.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        if (expanded) {
          body.classList.remove('collapsed');
          icon.style.transform = 'rotate(180deg)';
          icon.style.color = 'var(--bank-blue)';
        } else {
          body.classList.add('collapsed');
          icon.style.transform = '';
          icon.style.color = '';
        }
      });
      header.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          header.click();
        }
      });
    });
  }

  function renderProducts(acct) {
    var section = $('#section-products');
    var grid = $('#product-grid');
    if (!section || !grid) return;

    var extra = acct.accounts.filter(function (a) { return a.type !== 'checking'; });
    if (!extra.length) {
      section.classList.add('hidden');
      return;
    }

    section.classList.remove('hidden');
    grid.innerHTML = '';

    extra.forEach(function (product) {
      var card = document.createElement('article');
      card.className = 'product-card';

      var type = document.createElement('div');
      type.className = 'product-type';
      type.textContent = product.label.toUpperCase();

      var name = document.createElement('div');
      name.className = 'product-name';
      name.textContent = escapeHtml(product.label);

      var number = document.createElement('div');
      number.className = 'product-number';
      number.textContent = 'Account: ' + escapeHtml(product.masked) + '  ·  Reference: ' + escapeHtml(product.number);

      var balance = document.createElement('div');
      balance.className = 'product-balance';
      balance.textContent = formatCurrency(product.available);

      card.appendChild(type);
      card.appendChild(name);
      card.appendChild(number);
      card.appendChild(balance);

      if (product.status) {
        var meta = document.createElement('div');
        meta.className = 'product-meta';
        meta.textContent = 'Status: ' + escapeHtml(product.status);
        card.appendChild(meta);
      }

      grid.appendChild(card);
    });
  }

  function renderDashboard() {
    var draft = getDraft();
    if (!draft || !draft.meta || !draft.meta.submitted) {
      location.assign('/account-application/');
      return;
    }

    var acct = buildAccount(draft);
    renderWelcome(acct);
    renderAccountCard(acct);
    renderProducts(acct);
    showSection('dashboard');
  }

  /* -------------------------------------------------------------- events -- */
  function bindEvents() {
    $all('.nav-item').forEach(function (item) {
      item.addEventListener('click', function () {
        var section = item.getAttribute('data-section');
        if (section === 'dashboard') { showSection('dashboard'); return; }
        showSection('coming-soon');
      });
    });

    var backBtn = $('#back-to-accounts');
    if (backBtn) backBtn.addEventListener('click', function () { showSection('dashboard'); });

    var signoutBtn = $('#signout-btn');
    if (signoutBtn) signoutBtn.addEventListener('click', signout);
    var sidebarSignout = $('#sidebar-signout');
    if (sidebarSignout) sidebarSignout.addEventListener('click', signout);

    function signout() {
      sessionStorage.removeItem(ACCOUNT_KEY);
      location.assign('/');
    }
  }

  function toast(message) {
    var el = $('#toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.classList.remove('show'); }, 3200);
  }

  /* ------------------------------------------------------------------- init -- */
  function init() {
    bindEvents();
    renderDashboard();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
