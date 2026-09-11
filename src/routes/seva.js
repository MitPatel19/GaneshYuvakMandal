'use strict';
const express = require('express');
const { db } = require('../lib/db');
const h = require('../lib/helpers');
const { sevaTypeName } = require('../lib/seva-types');
const { LANGUAGES } = require('../lib/i18n');

const router = express.Router();

/* ------------------------------------------------------------------ */
/*  Queries                                                            */
/* ------------------------------------------------------------------ */

function activeTypes(daily) {
  const where = daily === undefined ? '' : 'AND is_daily = ?';
  const params = daily === undefined ? [] : [daily ? 1 : 0];
  return db
    .prepare(`SELECT * FROM seva_types WHERE is_active = 1 ${where} ORDER BY sort_order, id`)
    .all(...params);
}

/** Sponsors on one day, keyed by seva type. */
function sevasForDate(date) {
  const rows = db.prepare('SELECT * FROM sevas WHERE seva_date = ? ORDER BY id').all(date);
  const map = new Map();
  for (const r of rows) {
    if (!map.has(r.type_id)) map.set(r.type_id, []);
    map.get(r.type_id).push(r);
  }
  return map;
}

/** Sponsors of the whole-Mahotsav sevas, keyed by seva type. */
function oneTimeSevas() {
  const rows = db.prepare("SELECT * FROM sevas WHERE seva_date = '' ORDER BY id").all();
  const map = new Map();
  for (const r of rows) {
    if (!map.has(r.type_id)) map.set(r.type_id, []);
    map.get(r.type_id).push(r);
  }
  return map;
}

/** One message listing everything sponsored on a day, for the mandal group. */
function dayShareText(date, dailyRows, settings, tm, lang) {
  const lines = [
    `🙏 *${settings.mandal_name}* 🙏`,
    `${tm('seva_for')} ${h.formatDate(date)} (${h.weekday(date)})`,
    '',
  ];
  let any = false;
  for (const row of dailyRows) {
    if (!row.sponsors.length) continue;
    any = true;
    const names = row.sponsors.map((sp) => sp.donor_name).join(', ');
    lines.push(`${row.type.icon} *${sevaTypeName(row.type, lang)}*`);
    lines.push(`   ${names}`);
  }
  if (!any) lines.push(`_${tm('seva_none_yet')}_`);
  lines.push('', `🙏 ${tm('sm_bappa_morya')}`);
  return lines.join('\n');
}

/* ------------------------------------------------------------------ */
/*  Day view — the main screen                                         */
/* ------------------------------------------------------------------ */

router.get('/', (req, res) => {
  const s = res.locals.settings;
  const lang = res.locals.lang;
  const festivalDays = h.dateRange(s.festival_start, s.festival_end);
  const today = h.todayISO();
  const requested = String(req.query.date || '').trim();
  const date =
    requested || (festivalDays.includes(today) ? today : festivalDays[0] || today);

  const daily = activeTypes(true);
  const onceTypes = activeTypes(false);
  const dayMap = sevasForDate(date);
  const onceMap = oneTimeSevas();

  const dailyRows = daily.map((type) => ({
    type,
    label: sevaTypeName(type, lang),
    sponsors: dayMap.get(type.id) || [],
  }));
  const onceRows = onceTypes.map((type) => ({
    type,
    label: sevaTypeName(type, lang),
    sponsors: onceMap.get(type.id) || [],
  }));

  const filled = dailyRows.filter((r) => r.sponsors.length).length;
  const dayTotal = dailyRows.reduce(
    (sum, r) => sum + r.sponsors.reduce((a, sp) => a + sp.amount, 0),
    0
  );
  const grandTotal = db.prepare('SELECT COALESCE(SUM(amount),0) AS t FROM sevas').get().t;
  const sponsorCount = db.prepare('SELECT COUNT(*) AS c FROM sevas').get().c;

  const shareText = dayShareText(date, dailyRows, s, res.locals.tm, res.locals.templateLang);

  res.render('pages/seva', {
    title: res.locals.t('seva'),
    date,
    festivalDays,
    dailyRows,
    onceRows,
    filled,
    dailyCount: dailyRows.length,
    dayTotal,
    grandTotal,
    sponsorCount,
    shareText,
    shareLink: h.whatsappShareLink(shareText),
  });
});

/* ------------------------------------------------------------------ */
/*  Whole-Mahotsav board                                               */
/* ------------------------------------------------------------------ */

router.get('/board', (req, res) => {
  const s = res.locals.settings;
  const lang = res.locals.lang;
  const festivalDays = h.dateRange(s.festival_start, s.festival_end);
  const daily = activeTypes(true);

  const rows = db.prepare("SELECT * FROM sevas WHERE seva_date <> ''").all();
  const byKey = new Map();
  for (const r of rows) {
    const key = `${r.type_id}|${r.seva_date}`;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(r);
  }

  const board = daily.map((type) => ({
    type,
    label: sevaTypeName(type, lang),
    cells: festivalDays.map((d) => ({
      date: d,
      sponsors: byKey.get(`${type.id}|${d}`) || [],
    })),
  }));

  const totalSlots = daily.length * festivalDays.length;
  const filledSlots = board.reduce(
    (n, r) => n + r.cells.filter((c) => c.sponsors.length).length,
    0
  );

  res.render('pages/seva-board', {
    title: res.locals.t('seva_board'),
    festivalDays,
    board,
    totalSlots,
    filledSlots,
  });
});

/* ------------------------------------------------------------------ */
/*  Sponsor add / edit / delete                                        */
/* ------------------------------------------------------------------ */

const QUICK_AMOUNTS = [501, 1001, 2100, 5100, 11000, 21000];

function typeChoices(lang) {
  return activeTypes().map((t) => ({ ...t, label: sevaTypeName(t, lang) }));
}

router.get('/new', (req, res) => {
  const s = res.locals.settings;
  const lang = res.locals.lang;
  const typeId = Number(req.query.type) || null;
  const type = typeId ? db.prepare('SELECT * FROM seva_types WHERE id = ?').get(typeId) : null;
  res.render('pages/seva-form', {
    title: res.locals.t('seva_add'),
    seva: {
      type_id: typeId || '',
      seva_date: type && !type.is_daily ? '' : String(req.query.date || '') || h.todayISO(),
      donor_name: '',
      phone: '',
      address: '',
      amount: type ? type.suggested_amount || '' : '',
      note: '',
    },
    types: typeChoices(lang),
    festivalDays: h.dateRange(s.festival_start, s.festival_end),
    quickAmounts: QUICK_AMOUNTS,
    action: '/seva/new',
    backDate: String(req.query.date || ''),
  });
});

function readBody(b) {
  const typeId = Number(b.type_id);
  const amount = Number(b.amount);
  return {
    typeId,
    date: String(b.seva_date || '').trim(),
    donor: String(b.donor_name || '').trim(),
    phone: String(b.phone || '').trim(),
    address: String(b.address || '').trim(),
    amount: Number.isFinite(amount) && amount > 0 ? amount : 0,
    note: String(b.note || '').trim(),
  };
}

router.post('/new', (req, res) => {
  const v = readBody(req.body);
  if (!v.typeId || !v.donor) {
    return res.redirect(
      '/seva/new?err=' + encodeURIComponent('Please choose a seva and enter the donor name.')
    );
  }
  const type = db.prepare('SELECT * FROM seva_types WHERE id = ?').get(v.typeId);
  if (!type) return res.redirect('/seva?err=' + encodeURIComponent('That seva no longer exists.'));

  // A whole-Mahotsav seva never carries a date, whatever the form sent.
  const date = type.is_daily ? v.date || h.todayISO() : '';

  db.prepare(
    `INSERT INTO sevas (type_id, seva_date, donor_name, phone, address, amount, note)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(v.typeId, date, v.donor, v.phone, v.address, v.amount, v.note);

  const back = date ? `/seva?date=${date}` : '/seva';
  res.redirect(`${back}${date ? '&' : '?'}ok=` + encodeURIComponent(res.locals.t('seva_saved')));
});

router.get('/:id/edit', (req, res) => {
  const seva = db.prepare('SELECT * FROM sevas WHERE id = ?').get(req.params.id);
  if (!seva) return res.redirect('/seva');
  const s = res.locals.settings;
  res.render('pages/seva-form', {
    title: res.locals.t('edit'),
    seva,
    types: typeChoices(res.locals.lang),
    festivalDays: h.dateRange(s.festival_start, s.festival_end),
    quickAmounts: QUICK_AMOUNTS,
    action: `/seva/${seva.id}/edit`,
    backDate: seva.seva_date,
  });
});

router.post('/:id/edit', (req, res) => {
  const v = readBody(req.body);
  const type = db.prepare('SELECT * FROM seva_types WHERE id = ?').get(v.typeId);
  const date = type && type.is_daily ? v.date || h.todayISO() : '';
  db.prepare(
    `UPDATE sevas SET type_id = ?, seva_date = ?, donor_name = ?, phone = ?, address = ?,
        amount = ?, note = ? WHERE id = ?`
  ).run(v.typeId, date, v.donor, v.phone, v.address, v.amount, v.note, req.params.id);
  const back = date ? `/seva?date=${date}&` : '/seva?';
  res.redirect(`${back}ok=` + encodeURIComponent(res.locals.t('saved')));
});

router.post('/:id/delete', (req, res) => {
  const seva = db.prepare('SELECT seva_date FROM sevas WHERE id = ?').get(req.params.id);
  db.prepare('DELETE FROM sevas WHERE id = ?').run(req.params.id);
  const back = seva && seva.seva_date ? `/seva?date=${seva.seva_date}&` : '/seva?';
  res.redirect(`${back}ok=` + encodeURIComponent('Removed'));
});

/* ------------------------------------------------------------------ */
/*  Seva list management                                               */
/* ------------------------------------------------------------------ */

router.get('/types', (req, res) => {
  const lang = res.locals.lang;
  const types = db.prepare('SELECT * FROM seva_types ORDER BY sort_order, id').all();
  const counts = db
    .prepare('SELECT type_id, COUNT(*) AS c FROM sevas GROUP BY type_id')
    .all()
    .reduce((m, r) => ({ ...m, [r.type_id]: r.c }), {});
  res.render('pages/seva-types', {
    title: res.locals.t('seva_list'),
    types: types.map((t) => ({ ...t, label: sevaTypeName(t, lang), used: counts[t.id] || 0 })),
    languages: LANGUAGES,
  });
});

function readTypeBody(b) {
  return [
    String(b.name || '').trim(),
    String(b.name_en || '').trim(),
    String(b.name_gu || '').trim(),
    String(b.name_hi || '').trim(),
    String(b.name_mr || '').trim(),
    String(b.icon || '🙏').trim().slice(0, 8) || '🙏',
    b.is_daily ? 1 : 0,
    Number(b.suggested_amount) > 0 ? Number(b.suggested_amount) : 0,
  ];
}

router.post('/types/new', (req, res) => {
  const vals = readTypeBody(req.body);
  if (!vals[0]) {
    return res.redirect('/seva/types?err=' + encodeURIComponent('Please enter a name.'));
  }
  const max = db.prepare('SELECT COALESCE(MAX(sort_order), 0) AS m FROM seva_types').get().m;
  db.prepare(
    `INSERT INTO seva_types
       (name, name_en, name_gu, name_hi, name_mr, icon, is_daily, suggested_amount, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(...vals, max + 1);
  res.redirect('/seva/types?ok=' + encodeURIComponent(res.locals.t('saved')));
});

router.post('/types/:id/edit', (req, res) => {
  const vals = readTypeBody(req.body);
  db.prepare(
    `UPDATE seva_types SET name = ?, name_en = ?, name_gu = ?, name_hi = ?, name_mr = ?,
        icon = ?, is_daily = ?, suggested_amount = ?, is_active = ? WHERE id = ?`
  ).run(...vals, req.body.is_active ? 1 : 0, req.params.id);
  res.redirect('/seva/types?ok=' + encodeURIComponent(res.locals.t('saved')));
});

router.post('/types/:id/delete', (req, res) => {
  const used = db
    .prepare('SELECT COUNT(*) AS c FROM sevas WHERE type_id = ?')
    .get(req.params.id).c;
  if (used > 0) {
    // Deleting would silently take the sponsors with it — hide it instead.
    db.prepare('UPDATE seva_types SET is_active = 0 WHERE id = ?').run(req.params.id);
    return res.redirect(
      '/seva/types?ok=' +
        encodeURIComponent(
          `This seva already has ${used} sponsor(s), so it was hidden instead of deleted. Their names are safe.`
        )
    );
  }
  db.prepare('DELETE FROM seva_types WHERE id = ?').run(req.params.id);
  res.redirect('/seva/types?ok=' + encodeURIComponent('Removed'));
});

/** Move a seva up or down the list. */
router.post('/types/:id/move', (req, res) => {
  const dir = req.body.dir === 'up' ? 'up' : 'down';
  const all = db.prepare('SELECT id, sort_order FROM seva_types ORDER BY sort_order, id').all();
  const idx = all.findIndex((t) => t.id === Number(req.params.id));
  const swapWith = dir === 'up' ? idx - 1 : idx + 1;
  if (idx >= 0 && swapWith >= 0 && swapWith < all.length) {
    const set = db.prepare('UPDATE seva_types SET sort_order = ? WHERE id = ?');
    db.transaction(() => {
      // Renumber from scratch so hand-edited or duplicate orders can't jam it.
      const order = all.map((t) => t.id);
      [order[idx], order[swapWith]] = [order[swapWith], order[idx]];
      order.forEach((id, i) => set.run(i + 1, id));
    })();
  }
  res.redirect('/seva/types?ok=' + encodeURIComponent(res.locals.t('saved')));
});

/* ------------------------------------------------------------------ */
/*  Export                                                             */
/* ------------------------------------------------------------------ */

router.get('/export.csv', (req, res) => {
  const lang = res.locals.lang;
  const rows = db
    .prepare(
      `SELECT s.*, t.name AS type_name, t.name_en, t.name_gu, t.name_hi, t.name_mr
         FROM sevas s JOIN seva_types t ON t.id = s.type_id
        ORDER BY s.seva_date, t.sort_order, s.id`
    )
    .all();
  const csv = h.toCSV(
    ['Seva', 'Date', 'Donor Name', 'Phone', 'Address', 'Amount', 'Note'],
    rows.map((r) => [
      sevaTypeName({ name: r.type_name, name_en: r.name_en, name_gu: r.name_gu, name_hi: r.name_hi, name_mr: r.name_mr }, lang),
      r.seva_date || 'Whole Mahotsav',
      r.donor_name,
      r.phone,
      r.address,
      r.amount,
      r.note,
    ])
  );
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="seva-sponsors.csv"');
  res.send(csv);
});

module.exports = router;
