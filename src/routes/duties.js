'use strict';
const express = require('express');
const { db, getBuiltinTemplate } = require('../lib/db');
const h = require('../lib/helpers');

const router = express.Router();

const SLOTS = [
  'Morning Aarti', 'Noon Pooja', 'Evening Aarti', 'Night Aarti',
  'Prasad Distribution', 'Mandap Cleaning', 'Security / Watch',
  'Donation Collection', 'Sound System', 'Other',
];

function dutyMessage(duty, settings, lang) {
  const tpl = getBuiltinTemplate('duty_reminder', lang);
  const vars = Object.assign(h.baseTemplateVars(settings), {
    member_name: duty.member_name || '',
    name: duty.member_name || '',
    slot: duty.slot,
    date: h.formatDate(duty.duty_date),
    note: duty.note || '',
  });
  return h.renderTemplate(
    tpl ? tpl.body : '🙏 {{member_name}}, you have {{slot}} duty on {{date}} at {{mandal_name}}.',
    vars
  );
}

router.get('/', (req, res) => {
  const s = res.locals.settings;
  const date = String(req.query.date || '').trim() || h.todayISO();
  const duties = db
    .prepare('SELECT * FROM duties WHERE duty_date = ? ORDER BY slot, id')
    .all(date);
  const members = db
    .prepare('SELECT * FROM members WHERE is_active = 1 ORDER BY name COLLATE NOCASE')
    .all();
  const festivalDays = h.dateRange(s.festival_start, s.festival_end);
  const allCount = db.prepare('SELECT COUNT(*) AS c FROM duties').get().c;

  const withLinks = duties.map((d) => {
    const msg = dutyMessage(d, s, res.locals.templateLang);
    return { ...d, message: msg, waLink: h.whatsappLink(d.phone, msg, s.country_code) };
  });

  // One message listing the whole day's roster, for the mandal WhatsApp group.
  const tm = res.locals.tm;
  const groupLines = [
    `🪔 *${s.mandal_name}* — ${tm('sm_duty_for')} ${h.formatDate(date)}`,
    '',
    ...(duties.length
      ? duties.map((d) => `• *${d.slot}*: ${d.member_name || '—'}${d.note ? ' (' + d.note + ')' : ''}`)
      : [`_${tm('sm_no_duty')}_`]),
    '',
    `${tm('sm_be_on_time')} 🙏`,
  ];
  const groupText = groupLines.join('\n');

  res.render('pages/duties', {
    title: res.locals.t('duties'),
    date,
    duties: withLinks,
    members,
    slots: SLOTS,
    festivalDays,
    allCount,
    groupText,
    groupLink: h.whatsappShareLink(groupText),
  });
});

router.post('/new', (req, res) => {
  const b = req.body;
  const date = String(b.duty_date || '').trim() || h.todayISO();
  let memberName = String(b.member_name || '').trim();
  let phone = String(b.phone || '').trim();
  const memberId = b.member_id ? Number(b.member_id) : null;

  if (memberId) {
    const m = db.prepare('SELECT * FROM members WHERE id = ?').get(memberId);
    if (m) {
      memberName = m.name;
      phone = phone || m.phone;
    }
  }
  if (!memberName) {
    return res.redirect(`/duties?date=${date}&err=` + encodeURIComponent('Please choose a member.'));
  }

  db.prepare(
    `INSERT INTO duties (duty_date, slot, title, member_id, member_name, phone, note)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    date,
    String(b.slot || 'Morning Aarti').trim(),
    String(b.title || '').trim(),
    memberId || null,
    memberName,
    phone,
    String(b.note || '').trim()
  );
  res.redirect(`/duties?date=${date}&ok=` + encodeURIComponent('Duty assigned'));
});

router.post('/:id/delete', (req, res) => {
  const duty = db.prepare('SELECT duty_date FROM duties WHERE id = ?').get(req.params.id);
  db.prepare('DELETE FROM duties WHERE id = ?').run(req.params.id);
  const date = duty ? duty.duty_date : h.todayISO();
  res.redirect(`/duties?date=${date}&ok=` + encodeURIComponent('Duty removed'));
});

/** Copy an entire day's roster on to another date — saves a lot of typing. */
router.post('/copy', (req, res) => {
  const from = String(req.body.from || '').trim();
  const to = String(req.body.to || '').trim();
  if (!from || !to || from === to) {
    return res.redirect(`/duties?date=${from || h.todayISO()}&err=` + encodeURIComponent('Choose two different dates.'));
  }
  const rows = db.prepare('SELECT * FROM duties WHERE duty_date = ?').all(from);
  if (!rows.length) {
    return res.redirect(`/duties?date=${from}&err=` + encodeURIComponent('There is no duty on that day to copy.'));
  }
  const ins = db.prepare(
    `INSERT INTO duties (duty_date, slot, title, member_id, member_name, phone, note)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  db.transaction(() => {
    for (const r of rows) ins.run(to, r.slot, r.title, r.member_id, r.member_name, r.phone, r.note);
  })();
  res.redirect(`/duties?date=${to}&ok=` + encodeURIComponent(`Copied ${rows.length} duties`));
});

module.exports = router;
