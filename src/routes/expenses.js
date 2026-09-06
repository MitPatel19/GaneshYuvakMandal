'use strict';
const express = require('express');
const { db } = require('../lib/db');
const h = require('../lib/helpers');

const router = express.Router();

const CATEGORIES = [
  'Murti (Idol)', 'Decoration', 'Mandap / Tent', 'Sound & Light', 'Prasad / Bhojan',
  'Pooja Saman', 'Cultural Program', 'Transport', 'Visarjan', 'Electricity',
  'Printing', 'Donation Given', 'Other',
];

function buildFilter(query) {
  const where = [];
  const params = [];
  const q = String(query.q || '').trim();
  const category = String(query.category || '').trim();
  if (q) {
    where.push('(title LIKE ? OR vendor LIKE ? OR note LIKE ? OR paid_by LIKE ?)');
    const like = `%${q}%`;
    params.push(like, like, like, like);
  }
  if (category) { where.push('category = ?'); params.push(category); }
  return {
    clause: where.length ? 'WHERE ' + where.join(' AND ') : '',
    params,
    filters: { q, category },
  };
}

router.get('/', (req, res) => {
  const { clause, params, filters } = buildFilter(req.query);
  const expenses = db
    .prepare(`SELECT * FROM expenses ${clause} ORDER BY spent_on DESC, id DESC LIMIT 500`)
    .all(...params);
  const agg = db
    .prepare(`SELECT COALESCE(SUM(amount),0) AS total, COUNT(*) AS count FROM expenses ${clause}`)
    .get(...params);
  const byCategory = db
    .prepare(
      `SELECT category, COALESCE(SUM(amount),0) AS total FROM expenses
        GROUP BY category ORDER BY total DESC`
    )
    .all();

  res.render('pages/expenses', {
    title: res.locals.t('expenses'),
    expenses,
    filters,
    categories: CATEGORIES,
    total: agg.total,
    count: agg.count,
    byCategory,
  });
});

router.get('/new', (req, res) => {
  res.render('pages/expense-form', {
    title: res.locals.t('new_expense'),
    expense: {
      title: '', category: 'Decoration', amount: '', vendor: '',
      paid_by: (req.user && req.user.display_name) || '', note: '', spent_on: h.todayISO(),
    },
    categories: CATEGORIES,
    action: '/expenses/new',
  });
});

router.post('/new', (req, res) => {
  const b = req.body;
  const amount = Number(b.amount);
  if (!String(b.title || '').trim()) {
    return res.redirect('/expenses/new?err=' + encodeURIComponent('Please enter what the money was spent on.'));
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return res.redirect('/expenses/new?err=' + encodeURIComponent('Please enter a valid amount.'));
  }
  db.prepare(
    `INSERT INTO expenses (title, category, amount, vendor, paid_by, note, spent_on)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    String(b.title).trim(),
    String(b.category || 'Other').trim(),
    amount,
    String(b.vendor || '').trim(),
    String(b.paid_by || '').trim(),
    String(b.note || '').trim(),
    String(b.spent_on || '').trim() || h.todayISO()
  );
  res.redirect('/expenses?ok=' + encodeURIComponent('Expense saved'));
});

router.get('/:id/edit', (req, res) => {
  const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id);
  if (!expense) return res.redirect('/expenses');
  res.render('pages/expense-form', {
    title: res.locals.t('edit'),
    expense,
    categories: CATEGORIES,
    action: `/expenses/${expense.id}/edit`,
  });
});

router.post('/:id/edit', (req, res) => {
  const b = req.body;
  const amount = Number(b.amount);
  db.prepare(
    `UPDATE expenses SET title = ?, category = ?, amount = ?, vendor = ?, paid_by = ?,
        note = ?, spent_on = ? WHERE id = ?`
  ).run(
    String(b.title || '').trim(),
    String(b.category || 'Other').trim(),
    Number.isFinite(amount) && amount > 0 ? amount : 0,
    String(b.vendor || '').trim(),
    String(b.paid_by || '').trim(),
    String(b.note || '').trim(),
    String(b.spent_on || '').trim() || h.todayISO(),
    req.params.id
  );
  res.redirect('/expenses?ok=' + encodeURIComponent('Expense updated'));
});

router.post('/:id/delete', (req, res) => {
  db.prepare('DELETE FROM expenses WHERE id = ?').run(req.params.id);
  res.redirect('/expenses?ok=' + encodeURIComponent('Expense deleted'));
});

router.get('/export.csv', (req, res) => {
  const { clause, params } = buildFilter(req.query);
  const rows = db.prepare(`SELECT * FROM expenses ${clause} ORDER BY spent_on, id`).all(...params);
  const csv = h.toCSV(
    ['Date', 'Title', 'Category', 'Amount', 'Vendor', 'Paid By', 'Note'],
    rows.map((e) => [e.spent_on, e.title, e.category, e.amount, e.vendor, e.paid_by, e.note])
  );
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="expenses.csv"');
  res.send(csv);
});

module.exports = router;
