/* Ganpati Mahotsav Manager — progressive enhancement only.
   Every page works without this file; this just makes it nicer. */
(function () {
  'use strict';

  /* ---------------------------------------------------------------- */
  /*  Toast                                                            */
  /* ---------------------------------------------------------------- */

  var toastEl = null;
  var toastTimer = null;

  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      toastEl.setAttribute('role', 'status');
      toastEl.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove('show');
    }, 2200);
  }
  window.gmToast = toast;

  /* ---------------------------------------------------------------- */
  /*  Text size control (A- / A+) — remembered per device               */
  /* ---------------------------------------------------------------- */

  var SCALE_KEY = 'gm.fontScale';
  var MIN_SCALE = 0.9;
  var MAX_SCALE = 1.45;

  function readScale() {
    try {
      var v = parseFloat(localStorage.getItem(SCALE_KEY));
      return isNaN(v) ? 1 : Math.min(MAX_SCALE, Math.max(MIN_SCALE, v));
    } catch (e) {
      return 1;
    }
  }

  function applyScale(v) {
    document.documentElement.style.setProperty('--font-scale', String(v));
    try { localStorage.setItem(SCALE_KEY, String(v)); } catch (e) { /* private mode */ }
  }

  applyScale(readScale());

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-font]');
    if (!btn) return;
    e.preventDefault();
    var cur = readScale();
    var next = btn.getAttribute('data-font') === 'up' ? cur + 0.1 : cur - 0.1;
    next = Math.round(Math.min(MAX_SCALE, Math.max(MIN_SCALE, next)) * 100) / 100;
    applyScale(next);
  });

  /* ---------------------------------------------------------------- */
  /*  Language dropdown                                                */
  /* ---------------------------------------------------------------- */

  document.addEventListener('click', function (e) {
    var toggle = e.target.closest('[data-langtoggle]');
    var menus = document.querySelectorAll('.langmenu');
    for (var i = 0; i < menus.length; i++) {
      if (!toggle || menus[i] !== toggle.closest('.langmenu')) menus[i].classList.remove('open');
    }
    if (toggle) {
      e.preventDefault();
      toggle.closest('.langmenu').classList.toggle('open');
    }
  });

  /* ---------------------------------------------------------------- */
  /*  Confirm before delete                                            */
  /* ---------------------------------------------------------------- */

  document.addEventListener('submit', function (e) {
    var form = e.target;
    var msg = form.getAttribute('data-confirm');
    if (msg && !window.confirm(msg)) {
      e.preventDefault();
      return;
    }
    // Stop accidental double-submits on slow connections.
    var submitBtn = form.querySelector('[type="submit"]');
    if (submitBtn && !form.hasAttribute('data-no-lock')) {
      setTimeout(function () {
        submitBtn.disabled = true;
        submitBtn.dataset.oldLabel = submitBtn.textContent;
        submitBtn.textContent = '…';
      }, 0);
      // Re-enable if the page is restored from bfcache.
      window.addEventListener('pageshow', function () {
        submitBtn.disabled = false;
        if (submitBtn.dataset.oldLabel) submitBtn.textContent = submitBtn.dataset.oldLabel;
      });
    }
  });

  document.addEventListener('click', function (e) {
    var link = e.target.closest('[data-confirm-link]');
    if (link && !window.confirm(link.getAttribute('data-confirm-link'))) e.preventDefault();
  });

  /* ---------------------------------------------------------------- */
  /*  Copy to clipboard                                                */
  /* ---------------------------------------------------------------- */

  function copyText(text, okMsg) {
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); toast(okMsg); } catch (err) { /* ignore */ }
      document.body.removeChild(ta);
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () { toast(okMsg); }, fallback);
    } else {
      fallback();
    }
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-copy]');
    if (!btn) return;
    e.preventDefault();
    var sel = btn.getAttribute('data-copy');
    var src = sel.charAt(0) === '#' ? document.querySelector(sel) : null;
    var text = src ? (src.value !== undefined ? src.value : src.textContent) : sel;
    copyText(text, btn.getAttribute('data-copy-msg') || 'Copied!');
  });

  /* ---------------------------------------------------------------- */
  /*  Native share sheet, with WhatsApp fallback                       */
  /* ---------------------------------------------------------------- */

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-share]');
    if (!btn) return;
    var sel = btn.getAttribute('data-share');
    var src = sel.charAt(0) === '#' ? document.querySelector(sel) : null;
    var text = src ? (src.value !== undefined ? src.value : src.textContent) : sel;
    if (navigator.share) {
      e.preventDefault();
      navigator.share({ text: text }).catch(function () { /* user cancelled */ });
    }
    // No navigator.share → let the plain wa.me href do its job.
  });

  /* ---------------------------------------------------------------- */
  /*  Live WhatsApp message preview + wa.me link rebuilding            */
  /* ---------------------------------------------------------------- */

  function refreshPreview() {
    var box = document.getElementById('messageBox');
    var preview = document.getElementById('messagePreview');
    if (!box) return;
    var text = box.value;
    if (preview) preview.textContent = text || '…';

    var links = document.querySelectorAll('[data-wa-link]');
    for (var i = 0; i < links.length; i++) {
      var phone = links[i].getAttribute('data-wa-link');
      var personal = text.replace(/\{\{\s*name\s*\}\}/g, links[i].getAttribute('data-wa-name') || '');
      links[i].href = phone
        ? 'https://wa.me/' + phone + '?text=' + encodeURIComponent(personal)
        : 'https://wa.me/?text=' + encodeURIComponent(personal);
    }
  }

  var msgBox = document.getElementById('messageBox');
  if (msgBox) {
    msgBox.addEventListener('input', refreshPreview);
    refreshPreview();
  }

  /* Template picker fills the message box */
  var tplPicker = document.getElementById('templatePicker');
  if (tplPicker && msgBox) {
    tplPicker.addEventListener('change', function () {
      var opt = tplPicker.options[tplPicker.selectedIndex];
      var body = opt ? opt.getAttribute('data-body') : '';
      if (body) {
        msgBox.value = body;
        refreshPreview();
      }
    });
  }

  /* Clicking a {{token}} inserts it at the cursor */
  document.addEventListener('click', function (e) {
    var tok = e.target.closest('[data-token]');
    if (!tok || !msgBox) return;
    e.preventDefault();
    var text = tok.getAttribute('data-token');
    var start = msgBox.selectionStart || 0;
    var end = msgBox.selectionEnd || 0;
    msgBox.value = msgBox.value.slice(0, start) + text + msgBox.value.slice(end);
    msgBox.focus();
    msgBox.selectionStart = msgBox.selectionEnd = start + text.length;
    refreshPreview();
  });

  /* Mark a recipient as done once its WhatsApp link is opened */
  document.addEventListener('click', function (e) {
    var link = e.target.closest('[data-wa-link]');
    if (!link) return;
    var row = link.closest('.recipient');
    if (row) {
      row.classList.add('recipient--sent');
      var tick = row.querySelector('[data-tick]');
      if (tick) tick.textContent = '✅';
    }
  });

  /* Select-all / clear for recipient checkboxes */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-checkall]');
    if (!btn) return;
    e.preventDefault();
    var on = btn.getAttribute('data-checkall') === 'on';
    var boxes = document.querySelectorAll('[data-recipient]');
    for (var i = 0; i < boxes.length; i++) {
      boxes[i].checked = on;
      boxes[i].closest('.check') && boxes[i].closest('.check').classList.toggle('check--on', on);
    }
  });

  document.addEventListener('change', function (e) {
    if (!e.target.matches('[data-recipient]')) return;
    var row = e.target.closest('.check');
    if (row) row.classList.toggle('check--on', e.target.checked);
  });

  /* ---------------------------------------------------------------- */
  /*  Amount quick-pick chips                                          */
  /* ---------------------------------------------------------------- */

  document.addEventListener('click', function (e) {
    var chip = e.target.closest('[data-amount]');
    if (!chip) return;
    e.preventDefault();
    var input = document.getElementById(chip.getAttribute('data-amount-target') || 'amount');
    if (!input) return;
    input.value = chip.getAttribute('data-amount');
    var all = document.querySelectorAll('[data-amount]');
    for (var i = 0; i < all.length; i++) all[i].classList.remove('chip--active');
    chip.classList.add('chip--active');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });

  /* ---------------------------------------------------------------- */
  /*  Instant client-side filter for long lists                        */
  /* ---------------------------------------------------------------- */

  var filterInput = document.getElementById('quickFilter');
  if (filterInput) {
    filterInput.addEventListener('input', function () {
      var q = filterInput.value.trim().toLowerCase();
      var rows = document.querySelectorAll('[data-filterable]');
      var shown = 0;
      for (var i = 0; i < rows.length; i++) {
        var hay = (rows[i].getAttribute('data-filterable') || rows[i].textContent).toLowerCase();
        var match = !q || hay.indexOf(q) !== -1;
        rows[i].style.display = match ? '' : 'none';
        if (match) shown++;
      }
      var none = document.getElementById('filterEmpty');
      if (none) none.style.display = shown === 0 ? '' : 'none';
    });
  }

  /* ---------------------------------------------------------------- */
  /*  Aarti reader text size                                           */
  /* ---------------------------------------------------------------- */

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-lyric]');
    if (!btn) return;
    e.preventDefault();
    var root = document.documentElement;
    var cur = parseFloat(getComputedStyle(root).getPropertyValue('--lyric-scale')) || 1;
    var next = btn.getAttribute('data-lyric') === 'up' ? cur + 0.15 : cur - 0.15;
    root.style.setProperty('--lyric-scale', String(Math.min(2.2, Math.max(0.8, next))));
  });

  /* ---------------------------------------------------------------- */
  /*  Auto-hide flash messages                                         */
  /* ---------------------------------------------------------------- */

  var flash = document.querySelector('[data-autohide]');
  if (flash) {
    setTimeout(function () {
      flash.style.transition = 'opacity .4s ease';
      flash.style.opacity = '0';
      setTimeout(function () { flash.remove(); }, 420);
    }, 4200);
    // Drop ?ok= from the URL so a refresh doesn't replay the message.
    if (window.history.replaceState && window.location.search) {
      var url = new URL(window.location.href);
      if (url.searchParams.has('ok') || url.searchParams.has('err')) {
        url.searchParams.delete('ok');
        url.searchParams.delete('err');
        window.history.replaceState({}, '', url.pathname + (url.search || '') + url.hash);
      }
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Print                                                            */
  /* ---------------------------------------------------------------- */

  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-print]')) {
      e.preventDefault();
      window.print();
    }
  });
})();
