'use strict';
const express = require('express');
const { db } = require('../lib/db');
const h = require('../lib/helpers');

const router = express.Router();

const CATEGORIES = [
  'Sthapana', 'Aarti', 'Pooja', 'Cultural Program', 'Bhajan / Kirtan',
  'Mahaprasad', 'Competition', 'Visarjan', 'Program', 'Other',
];

/** Group events into day buckets covering the whole festival window. */
function groupByDay(events, settings) {
  const days = h.dateRange(settings.festival_start, settings.festival_end);
  const map = new Map();
  for (const d of days) map.set(d, []);
  for (const e of events) {
    if (!map.has(e.event_date)) map.set(e.event_date, []);
    map.get(e.event_date).push(e);
  }
  return [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([date, list]) => ({ date, events: list }));
}

/** Plain-text schedule that reads well inside a WhatsApp bubble. */
function scheduleText(days, settings, onlyDate, tm) {
  const lines = [
    `🙏 *${settings.mandal_name}* 🙏`,
    `📅 Ganesh Mahotsav ${settings.year} — ${tm('sm_program')}`,
    '',
  ];
  let any = false;
  for (const day of days) {
    if (onlyDate && day.date !== onlyDate) continue;
    const shown = day.events.filter((e) => e.is_public);
    if (!shown.length) continue;
    any = true;
    lines.push(`*${h.formatDate(day.date)} (${h.weekday(day.date)})*`);
    for (const e of shown) {
      const time = h.timeRange(e.start_time, e.end_time);
      lines.push(`• ${time ? time + ' — ' : ''}${e.title}${e.place ? ' @ ' + e.place : ''}`);
    }
    lines.push('');
  }
  if (!any) lines.push(`_${tm('sm_program_soon')}_`, '');
  if (settings.address) lines.push(`📍 ${settings.address}`);
  if (settings.google_maps_link) lines.push(`🗺 ${settings.google_maps_link}`);
  lines.push('', `${tm('sm_bappa_morya')} 🎉`);
  return lines.join('\n');
}

router.get('/', (req, res) => {
  const s = res.locals.settings;
  const events = db.prepare('SELECT * FROM events ORDER BY event_date, start_time, id').all();
  const days = groupByDay(events, s);
  const tm = res.locals.tm;
  const shareAll = scheduleText(days, s, null, tm);
  const today = h.todayISO();
  const shareToday = scheduleText(days, s, today, tm);

  res.render('pages/schedule', {
    title: res.locals.t('schedule'),
    days,
    eventCount: events.length,
    shareAll,
    shareAllLink: h.whatsappShareLink(shareAll),
    shareToday,
    shareTodayLink: h.whatsappShareLink(shareToday),
    hasToday: days.some((d) => d.date === today && d.events.length),
  });
});

router.get('/new', (req, res) => {
  const s = res.locals.settings;
  res.render('pages/event-form', {
    title: res.locals.t('new_event'),
    event: {
      title: '', description: '', category: 'Aarti',
      event_date: String(req.query.date || '') || s.festival_start || h.todayISO(),
      start_time: '', end_time: '', place: s.address || '', incharge: '', is_public: 1,
    },
    categories: CATEGORIES,
    action: '/schedule/new',
  });
});

router.post('/new', (req, res) => {
  const b = req.body;
  if (!String(b.title || '').trim()) {
    return res.redirect('/schedule/new?err=' + encodeURIComponent('Please enter the program name.'));
  }
  db.prepare(
    `INSERT INTO events (title, description, category, event_date, start_time, end_time, place, incharge, is_public)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    String(b.title).trim(),
    String(b.description || '').trim(),
    String(b.category || 'Program').trim(),
    String(b.event_date || '').trim() || h.todayISO(),
    String(b.start_time || '').trim(),
    String(b.end_time || '').trim(),
    String(b.place || '').trim(),
    String(b.incharge || '').trim(),
    b.is_public ? 1 : 0
  );
  res.redirect('/schedule?ok=' + encodeURIComponent('Program added'));
});

router.get('/:id/edit', (req, res) => {
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
  if (!event) return res.redirect('/schedule');
  res.render('pages/event-form', {
    title: res.locals.t('edit'),
    event,
    categories: CATEGORIES,
    action: `/schedule/${event.id}/edit`,
  });
});

router.post('/:id/edit', (req, res) => {
  const b = req.body;
  db.prepare(
    `UPDATE events SET title = ?, description = ?, category = ?, event_date = ?, start_time = ?,
        end_time = ?, place = ?, incharge = ?, is_public = ? WHERE id = ?`
  ).run(
    String(b.title || '').trim(),
    String(b.description || '').trim(),
    String(b.category || 'Program').trim(),
    String(b.event_date || '').trim() || h.todayISO(),
    String(b.start_time || '').trim(),
    String(b.end_time || '').trim(),
    String(b.place || '').trim(),
    String(b.incharge || '').trim(),
    b.is_public ? 1 : 0,
    req.params.id
  );
  res.redirect('/schedule?ok=' + encodeURIComponent('Program updated'));
});

router.post('/:id/delete', (req, res) => {
  db.prepare('DELETE FROM events WHERE id = ?').run(req.params.id);
  res.redirect('/schedule?ok=' + encodeURIComponent('Program deleted'));
});

/** One-tap starter schedule so a new mandal is not staring at an empty page. */
router.post('/quick-setup', (req, res) => {
  const s = res.locals.settings;
  const days = h.dateRange(s.festival_start, s.festival_end);
  if (!days.length) {
    return res.redirect('/schedule?err=' + encodeURIComponent('Please set the festival dates in Settings first.'));
  }
  const existing = db.prepare('SELECT COUNT(*) AS c FROM events').get().c;
  if (existing > 0) {
    return res.redirect('/schedule?err=' + encodeURIComponent('Programs already exist. Add them manually instead.'));
  }

  const ins = db.prepare(
    `INSERT INTO events (title, description, category, event_date, start_time, end_time, place, incharge, is_public)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`
  );
  const place = s.address || '';
  const tx = db.transaction(() => {
    days.forEach((date, idx) => {
      if (idx === 0) {
        ins.run('Ganpati Sthapana & Pran Pratishtha', 'Murti sthapana and first pooja', 'Sthapana', date, '09:00', '11:00', place, '');
      }
      ins.run('Morning Aarti', '', 'Aarti', date, '08:00', '08:30', place, '');
      ins.run('Evening Aarti', '', 'Aarti', date, '19:30', '20:15', place, '');
      if (idx === days.length - 1) {
        ins.run('Maha Prasad', 'Community bhojan for all devotees', 'Mahaprasad', date, '12:00', '15:00', place, '');
        ins.run('Visarjan Yatra', 'Farewell procession — Ganpati Bappa Morya!', 'Visarjan', date, '16:00', '20:00', place, '');
      }
    });
  });
  tx();
  res.redirect('/schedule?ok=' + encodeURIComponent('Starter program created — edit anything you like'));
});

module.exports = router;
