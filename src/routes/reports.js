'use strict';
const express = require('express');
const { db } = require('../lib/db');
const h = require('../lib/helpers');

const router = express.Router();

function buildReport(settings) {
  const collected = db.prepare('SELECT COALESCE(SUM(amount),0) AS t FROM donations').get().t;
  const spent = db.prepare('SELECT COALESCE(SUM(amount),0) AS t FROM expenses').get().t;

  const byMode = db
    .prepare(
      `SELECT mode AS label, COUNT(*) AS count, COALESCE(SUM(amount),0) AS total
         FROM donations GROUP BY mode ORDER BY total DESC`
    )
    .all();

  const byPurpose = db
    .prepare(
      `SELECT purpose AS label, COUNT(*) AS count, COALESCE(SUM(amount),0) AS total
         FROM donations GROUP BY purpose ORDER BY total DESC`
    )
    .all();

  const byCategory = db
    .prepare(
      `SELECT category AS label, COUNT(*) AS count, COALESCE(SUM(amount),0) AS total
         FROM expenses GROUP BY category ORDER BY total DESC`
    )
    .all();

  const daily = db
    .prepare(
      `SELECT donated_on AS date, COUNT(*) AS count, COALESCE(SUM(amount),0) AS total
         FROM donations GROUP BY donated_on ORDER BY donated_on DESC LIMIT 30`
    )
    .all();

  const topDonors = db
    .prepare(
      `SELECT donor_name, phone, COALESCE(SUM(amount),0) AS total, COUNT(*) AS times
         FROM donations GROUP BY donor_name, phone ORDER BY total DESC LIMIT 15`
    )
    .all();

  const counts = {
    donations: db.prepare('SELECT COUNT(*) AS c FROM donations').get().c,
    expenses: db.prepare('SELECT COUNT(*) AS c FROM expenses').get().c,
    members: db.prepare('SELECT COUNT(*) AS c FROM members WHERE is_active = 1').get().c,
    events: db.prepare('SELECT COUNT(*) AS c FROM events').get().c,
    photos: db.prepare('SELECT COUNT(*) AS c FROM photos').get().c,
  };

  const currency = settings.currency || '₹';
  const maxDaily = daily.reduce((m, d) => Math.max(m, d.total), 0);
  const maxCategory = byCategory.reduce((m, d) => Math.max(m, d.total), 0);

  return {
    collected, spent, inHand: collected - spent,
    byMode, byPurpose, byCategory, daily, topDonors, counts,
    currency, maxDaily, maxCategory,
  };
}

router.get('/', (req, res) => {
  const s = res.locals.settings;
  const report = buildReport(s);

  const summaryText = [
    `📊 *${s.mandal_name}* — Hisab (Accounts) ${s.year}`,
    '',
    `💰 Total Collected: ${h.formatMoney(report.collected, s.currency)}`,
    `🧾 Total Spent: ${h.formatMoney(report.spent, s.currency)}`,
    `🏦 Balance In Hand: ${h.formatMoney(report.inHand, s.currency)}`,
    '',
    `👥 Donors: ${report.counts.donations}   |   Members: ${report.counts.members}`,
    '',
    '*Top expense heads:*',
    ...report.byCategory.slice(0, 5).map((c) => `• ${c.label}: ${h.formatMoney(c.total, s.currency)}`),
    '',
    `_As on ${h.formatDate(h.todayISO())}_`,
    '🙏 Ganpati Bappa Morya!',
  ].join('\n');

  res.render('pages/reports', {
    title: res.locals.t('reports'),
    r: report,
    summaryText,
    summaryLink: h.whatsappShareLink(summaryText),
  });
});

/** Everything in one printable page — the sheet a mandal pins on the board. */
router.get('/print', (req, res) => {
  const s = res.locals.settings;
  const donations = db.prepare('SELECT * FROM donations ORDER BY donated_on, id').all();
  const expenses = db.prepare('SELECT * FROM expenses ORDER BY spent_on, id').all();
  const report = buildReport(s);
  res.render('pages/report-print', {
    title: 'Hisab / Accounts',
    donations,
    expenses,
    r: report,
  });
});

router.get('/backup.json', (req, res) => {
  const dump = {
    exported_at: new Date().toISOString(),
    app: 'ganpati-mahotsav-manager',
    version: 1,
    settings: db.prepare('SELECT * FROM settings').all(),
    members: db.prepare('SELECT * FROM members').all(),
    donations: db.prepare('SELECT * FROM donations').all(),
    expenses: db.prepare('SELECT * FROM expenses').all(),
    events: db.prepare('SELECT * FROM events').all(),
    duties: db.prepare('SELECT * FROM duties').all(),
    announcements: db.prepare('SELECT * FROM announcements').all(),
    templates: db.prepare('SELECT * FROM templates').all(),
    aartis: db.prepare('SELECT * FROM aartis').all(),
    photos: db.prepare('SELECT * FROM photos').all(),
  };
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="mandal-backup-${h.todayISO()}.json"`
  );
  res.send(JSON.stringify(dump, null, 2));
});

module.exports = router;
