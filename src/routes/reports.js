'use strict';
const express = require('express');
const { db } = require('../lib/db');
const h = require('../lib/helpers');
const { sevaTypeName } = require('../lib/seva-types');

const router = express.Router();

function buildReport(settings, lang) {
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

  const sevaTotal = db.prepare('SELECT COALESCE(SUM(amount),0) AS t FROM sevas').get().t;
  const sevaByType = db
    .prepare(
      `SELECT t.icon, t.name, t.name_en, t.name_gu, t.name_hi, t.name_mr,
              COUNT(s.id) AS count, COALESCE(SUM(s.amount),0) AS total
         FROM sevas s JOIN seva_types t ON t.id = s.type_id
        GROUP BY t.id ORDER BY total DESC, count DESC`
    )
    .all();
  const topSevaDonors = db
    .prepare(
      `SELECT donor_name, phone, COUNT(*) AS times, COALESCE(SUM(amount),0) AS total
         FROM sevas GROUP BY donor_name, phone ORDER BY total DESC, times DESC LIMIT 15`
    )
    .all();

  const counts = {
    donations: db.prepare('SELECT COUNT(*) AS c FROM donations').get().c,
    expenses: db.prepare('SELECT COUNT(*) AS c FROM expenses').get().c,
    members: db.prepare('SELECT COUNT(*) AS c FROM members WHERE is_active = 1').get().c,
    events: db.prepare('SELECT COUNT(*) AS c FROM events').get().c,
    photos: db.prepare('SELECT COUNT(*) AS c FROM photos').get().c,
    seva: db.prepare('SELECT COUNT(*) AS c FROM sevas').get().c,
  };

  const currency = settings.currency || '₹';
  const maxDaily = daily.reduce((m, d) => Math.max(m, d.total), 0);
  const maxCategory = byCategory.reduce((m, d) => Math.max(m, d.total), 0);

  return {
    sevaByType: sevaByType.map((r) => ({ ...r, label: sevaTypeName(r, lang) })),
    collected, spent, inHand: collected - spent,
    byMode, byPurpose, byCategory, daily, topDonors, counts,
    sevaTotal, topSevaDonors,
    currency, maxDaily, maxCategory,
  };
}

router.get('/', (req, res) => {
  const s = res.locals.settings;
  const report = buildReport(s);

  const tm = res.locals.tm;
  const summaryText = [
    `📊 *${s.mandal_name}* — ${tm('sm_accounts')} ${s.year}`,
    '',
    `💰 ${tm('sm_total_collected')}: ${h.formatMoney(report.collected, s.currency)}`,
    `🧾 ${tm('sm_total_spent')}: ${h.formatMoney(report.spent, s.currency)}`,
    `🏦 ${tm('sm_balance')}: ${h.formatMoney(report.inHand, s.currency)}`,
    '',
    `🍛 ${tm('seva_total')}: ${h.formatMoney(report.sevaTotal, s.currency)}  (${report.counts.seva} ${tm('seva_sponsors')})`,
    '',
    `👥 ${tm('sm_donors')}: ${report.counts.donations}   |   ${tm('sm_members_c')}: ${report.counts.members}`,
    '',
    `*${tm('sm_top_expenses')}*`,
    ...report.byCategory.slice(0, 5).map((c) => `• ${c.label}: ${h.formatMoney(c.total, s.currency)}`),
    '',
    `_${tm('sm_as_on')} ${h.formatDate(h.todayISO())}_`,
    `🙏 ${tm('sm_bappa_morya')}`,
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
  const report = buildReport(s, res.locals.lang);
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
    seva_types: db.prepare('SELECT * FROM seva_types').all(),
    sevas: db.prepare('SELECT * FROM sevas').all(),
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
