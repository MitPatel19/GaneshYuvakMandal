'use strict';
const express = require('express');
const { db } = require('../lib/db');
const h = require('../lib/helpers');

const router = express.Router();

router.get('/', (req, res) => {
  const today = h.todayISO();
  const s = res.locals.settings;

  const collected = db.prepare('SELECT COALESCE(SUM(amount), 0) AS total FROM donations').get().total;
  const spent = db.prepare('SELECT COALESCE(SUM(amount), 0) AS total FROM expenses').get().total;
  const donorCount = db.prepare('SELECT COUNT(*) AS c FROM donations').get().c;
  const memberCount = db.prepare('SELECT COUNT(*) AS c FROM members WHERE is_active = 1').get().c;

  const todayEvents = db
    .prepare('SELECT * FROM events WHERE event_date = ? ORDER BY start_time, id')
    .all(today);

  const upcomingEvents = db
    .prepare('SELECT * FROM events WHERE event_date > ? ORDER BY event_date, start_time LIMIT 5')
    .all(today);

  const todayDuties = db
    .prepare('SELECT * FROM duties WHERE duty_date = ? ORDER BY slot, id')
    .all(today);

  const recentDonations = db
    .prepare('SELECT * FROM donations ORDER BY id DESC LIMIT 6')
    .all();

  const pinned = db
    .prepare('SELECT * FROM announcements ORDER BY pinned DESC, id DESC LIMIT 3')
    .all();

  const todayCollected = db
    .prepare('SELECT COALESCE(SUM(amount), 0) AS total FROM donations WHERE donated_on = ?')
    .get(today).total;

  // Ready-made invitation the user can fire off in one tap.
  const vars = h.baseTemplateVars(s);
  const inviteTemplate = db
    .prepare("SELECT body FROM templates WHERE name LIKE 'Invitation%' ORDER BY id LIMIT 1")
    .get();
  const inviteText = h.renderTemplate(
    inviteTemplate
      ? inviteTemplate.body
      : '🙏 {{mandal_name}} invites you to Ganesh Mahotsav {{year}} — {{festival_start}} to {{festival_end}}.',
    vars
  );

  res.render('pages/dashboard', {
    title: res.locals.t('dashboard'),
    collected,
    spent,
    inHand: collected - spent,
    todayCollected,
    donorCount,
    memberCount,
    todayEvents,
    upcomingEvents,
    todayDuties,
    recentDonations,
    pinned,
    inviteText,
    inviteLink: h.whatsappShareLink(inviteText),
  });
});

module.exports = router;
