'use strict';
const express = require('express');
const QRCode = require('qrcode');
const { db, getSetting } = require('../lib/db');
const h = require('../lib/helpers');

const router = express.Router();

const MODES = ['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Other'];
const PURPOSES = ['Vargani', 'Donation', 'Sponsorship', 'Prasad', 'Decoration', 'Cultural Program', 'Other'];
const QUICK_AMOUNTS = [101, 251, 501, 1001, 2100, 5100];

/** Next receipt number, e.g. GM-2026-0042. Falls back safely if numbers are edited by hand. */
function nextReceiptNo() {
  const year = getSetting('year') || String(new Date().getFullYear());
  const prefix = `GM-${year}-`;
  const row = db
    .prepare(
      `SELECT receipt_no FROM donations
        WHERE receipt_no LIKE ?
        ORDER BY LENGTH(receipt_no) DESC, receipt_no DESC LIMIT 1`
    )
    .get(prefix + '%');
  let next = 1;
  if (row && row.receipt_no) {
    const n = parseInt(String(row.receipt_no).slice(prefix.length), 10);
    if (!Number.isNaN(n)) next = n + 1;
  }
  return prefix + String(next).padStart(4, '0');
}

function buildFilter(query) {
  const where = [];
  const params = [];
  const q = String(query.q || '').trim();
  const mode = String(query.mode || '').trim();
  const from = String(query.from || '').trim();
  const to = String(query.to || '').trim();

  if (q) {
    where.push('(donor_name LIKE ? OR phone LIKE ? OR receipt_no LIKE ? OR address LIKE ?)');
    const like = `%${q}%`;
    params.push(like, like, like, like);
  }
  if (mode) { where.push('mode = ?'); params.push(mode); }
  if (from) { where.push('donated_on >= ?'); params.push(from); }
  if (to) { where.push('donated_on <= ?'); params.push(to); }

  return {
    clause: where.length ? 'WHERE ' + where.join(' AND ') : '',
    params,
    filters: { q, mode, from, to },
  };
}

router.get('/', (req, res) => {
  const { clause, params, filters } = buildFilter(req.query);
  const donations = db
    .prepare(`SELECT * FROM donations ${clause} ORDER BY donated_on DESC, id DESC LIMIT 500`)
    .all(...params);
  const agg = db
    .prepare(`SELECT COALESCE(SUM(amount),0) AS total, COUNT(*) AS count FROM donations ${clause}`)
    .get(...params);

  res.render('pages/donations', {
    title: res.locals.t('donations'),
    donations,
    filters,
    modes: MODES,
    total: agg.total,
    count: agg.count,
  });
});

router.get('/new', (req, res) => {
  const s = res.locals.settings;
  res.render('pages/donation-form', {
    title: res.locals.t('new_donation'),
    donation: {
      receipt_no: nextReceiptNo(),
      donor_name: '',
      phone: '',
      address: '',
      amount: '',
      mode: 'Cash',
      purpose: 'Vargani',
      received_by: (req.user && req.user.display_name) || '',
      note: '',
      donated_on: h.todayISO(),
    },
    modes: MODES,
    purposes: PURPOSES,
    quickAmounts: QUICK_AMOUNTS,
    action: '/donations/new',
    upiId: s.upi_id,
  });
});

router.post('/new', (req, res) => {
  const b = req.body;
  const name = String(b.donor_name || '').trim();
  const amount = Number(b.amount);
  if (!name) {
    return res.redirect('/donations/new?err=' + encodeURIComponent('Please enter the donor name.'));
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return res.redirect('/donations/new?err=' + encodeURIComponent('Please enter a valid amount.'));
  }

  const info = db
    .prepare(
      `INSERT INTO donations
         (receipt_no, donor_name, phone, address, amount, mode, purpose, received_by, note, donated_on)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      String(b.receipt_no || '').trim() || nextReceiptNo(),
      name,
      String(b.phone || '').trim(),
      String(b.address || '').trim(),
      amount,
      String(b.mode || 'Cash').trim(),
      String(b.purpose || 'Vargani').trim(),
      String(b.received_by || '').trim(),
      String(b.note || '').trim(),
      String(b.donated_on || '').trim() || h.todayISO()
    );

  res.redirect(`/donations/${info.lastInsertRowid}/receipt?ok=` + encodeURIComponent('Donation saved'));
});

router.get('/:id/edit', (req, res) => {
  const donation = db.prepare('SELECT * FROM donations WHERE id = ?').get(req.params.id);
  if (!donation) return res.redirect('/donations');
  res.render('pages/donation-form', {
    title: res.locals.t('edit'),
    donation,
    modes: MODES,
    purposes: PURPOSES,
    quickAmounts: QUICK_AMOUNTS,
    action: `/donations/${donation.id}/edit`,
    upiId: res.locals.settings.upi_id,
  });
});

router.post('/:id/edit', (req, res) => {
  const b = req.body;
  const amount = Number(b.amount);
  db.prepare(
    `UPDATE donations SET receipt_no = ?, donor_name = ?, phone = ?, address = ?, amount = ?,
        mode = ?, purpose = ?, received_by = ?, note = ?, donated_on = ?
      WHERE id = ?`
  ).run(
    String(b.receipt_no || '').trim(),
    String(b.donor_name || '').trim(),
    String(b.phone || '').trim(),
    String(b.address || '').trim(),
    Number.isFinite(amount) && amount > 0 ? amount : 0,
    String(b.mode || 'Cash').trim(),
    String(b.purpose || '').trim(),
    String(b.received_by || '').trim(),
    String(b.note || '').trim(),
    String(b.donated_on || '').trim() || h.todayISO(),
    req.params.id
  );
  res.redirect(`/donations/${req.params.id}/receipt?ok=` + encodeURIComponent('Donation updated'));
});

router.post('/:id/delete', (req, res) => {
  db.prepare('DELETE FROM donations WHERE id = ?').run(req.params.id);
  res.redirect('/donations?ok=' + encodeURIComponent('Donation deleted'));
});

router.get('/:id/receipt', async (req, res) => {
  const donation = db.prepare('SELECT * FROM donations WHERE id = ?').get(req.params.id);
  if (!donation) return res.redirect('/donations');

  const s = res.locals.settings;
  const vars = Object.assign(h.baseTemplateVars(s), {
    donor_name: donation.donor_name,
    amount: h.formatMoney(donation.amount, '').trim(),
    receipt_no: donation.receipt_no,
    date: h.formatDate(donation.donated_on),
    purpose: donation.purpose,
    mode: donation.mode,
  });

  const tpl = db
    .prepare("SELECT body FROM templates WHERE name LIKE 'Donation Thank%' ORDER BY id LIMIT 1")
    .get();
  const thanksText = h.renderTemplate(
    tpl ? tpl.body : '🙏 Thank you {{donor_name}} for {{currency}}{{amount}}. Receipt {{receipt_no}}.',
    vars
  );

  let qrDataUrl = '';
  if (s.upi_id) {
    try {
      qrDataUrl = await QRCode.toDataURL(
        h.upiLink({ upiId: s.upi_id, name: s.upi_name || s.mandal_name, note: 'Vargani' }),
        { margin: 1, width: 320, color: { dark: '#2a1c10', light: '#ffffff' } }
      );
    } catch (_) { /* QR is a nicety — never block the receipt */ }
  }

  res.render('pages/receipt', {
    title: `${res.locals.t('receipt')} ${donation.receipt_no}`,
    donation,
    thanksText,
    waLink: h.whatsappLink(donation.phone, thanksText, s.country_code),
    qrDataUrl,
  });
});

router.get('/export.csv', (req, res) => {
  const { clause, params } = buildFilter(req.query);
  const rows = db
    .prepare(`SELECT * FROM donations ${clause} ORDER BY donated_on, id`)
    .all(...params);
  const csv = h.toCSV(
    ['Receipt No', 'Date', 'Donor Name', 'Phone', 'Address', 'Amount', 'Mode', 'Purpose', 'Received By', 'Note'],
    rows.map((d) => [
      d.receipt_no, d.donated_on, d.donor_name, d.phone, d.address,
      d.amount, d.mode, d.purpose, d.received_by, d.note,
    ])
  );
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="donations.csv"');
  res.send(csv);
});

module.exports = router;
