'use strict';
const express = require('express');
const QRCode = require('qrcode');
const { db, setSetting, allSettings } = require('../lib/db');
const { setPassword, verifyUser } = require('../lib/auth');
const h = require('../lib/helpers');
const { LANGUAGES } = require('../lib/i18n');

const router = express.Router();

const EDITABLE = [
  'mandal_name', 'tagline', 'year', 'festival_start', 'festival_end', 'address', 'about',
  'president_name', 'president_phone', 'secretary_name', 'secretary_phone',
  'treasurer_name', 'treasurer_phone', 'upi_id', 'upi_name', 'whatsapp_group_link',
  'google_maps_link', 'language', 'currency', 'country_code',
];

const TOGGLES = [
  'template_follow_ui_language',
  'public_page_enabled',
  'public_show_donors',
  'public_show_total',
];

router.get('/', async (req, res) => {
  const s = allSettings();
  let qrDataUrl = '';
  if (s.upi_id) {
    try {
      qrDataUrl = await QRCode.toDataURL(
        h.upiLink({ upiId: s.upi_id, name: s.upi_name || s.mandal_name, note: 'Vargani' }),
        { margin: 1, width: 320, color: { dark: '#2a1c10', light: '#ffffff' } }
      );
    } catch (_) { /* ignore */ }
  }
  const publicUrl = `${req.protocol}://${req.get('host')}/p`;
  const users = db
    .prepare('SELECT id, username, display_name, created_at FROM users ORDER BY id')
    .all();
  res.render('pages/settings', {
    title: res.locals.t('settings'),
    s,
    users,
    languages: LANGUAGES,
    qrDataUrl,
    publicUrl,
    publicShareLink: h.whatsappShareLink(
      `🙏 *${s.mandal_name}* — Ganesh Mahotsav ${s.year}\n\n` +
        `${res.locals.tm('sm_see_program')}\n${publicUrl}\n\n${res.locals.tm('sm_bappa_morya')} 🎉`
    ),
  });
});

router.post('/', (req, res) => {
  for (const key of EDITABLE) {
    if (Object.prototype.hasOwnProperty.call(req.body, key)) {
      setSetting(key, String(req.body[key] || '').trim());
    }
  }
  for (const key of TOGGLES) {
    setSetting(key, req.body[key] ? '1' : '0');
  }
  // Keep the session language in step with the saved default.
  if (req.body.language) req.session.lang = String(req.body.language);
  res.redirect('/settings?ok=' + encodeURIComponent(res.locals.t('saved')));
});

router.post('/password', (req, res) => {
  const current = String(req.body.current_password || '');
  const next = String(req.body.new_password || '');
  if (next.length < 6) {
    return res.redirect('/settings?err=' + encodeURIComponent('New password must be at least 6 characters.'));
  }
  if (!verifyUser(req.user.username, current)) {
    return res.redirect('/settings?err=' + encodeURIComponent('Current password is wrong.'));
  }
  setPassword(req.user.id, next);
  res.redirect('/settings?ok=' + encodeURIComponent('Password changed'));
});

/** Extra logins so the treasurer and secretary do not share one password. */
router.post('/users/new', (req, res) => {
  const username = String(req.body.username || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (!/^[a-z0-9_.-]{3,32}$/.test(username)) {
    return res.redirect('/settings?err=' + encodeURIComponent('Username must be 3-32 letters, numbers, dot, dash or underscore.'));
  }
  if (password.length < 6) {
    return res.redirect('/settings?err=' + encodeURIComponent('Password must be at least 6 characters.'));
  }
  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (exists) {
    return res.redirect('/settings?err=' + encodeURIComponent('That username is already taken.'));
  }
  const bcrypt = require('bcryptjs');
  db.prepare('INSERT INTO users (username, password_hash, display_name, role) VALUES (?, ?, ?, ?)').run(
    username,
    bcrypt.hashSync(password, 10),
    String(req.body.display_name || '').trim(),
    'admin'
  );
  res.redirect('/settings?ok=' + encodeURIComponent('Login created'));
});

router.post('/users/:id/delete', (req, res) => {
  const id = Number(req.params.id);
  const count = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  if (count <= 1) {
    return res.redirect('/settings?err=' + encodeURIComponent('You cannot delete the only login.'));
  }
  if (id === req.user.id) {
    return res.redirect('/settings?err=' + encodeURIComponent('You cannot delete the login you are using.'));
  }
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  res.redirect('/settings?ok=' + encodeURIComponent('Login removed'));
});

/** Wipe transactional data at the end of a season, keeping members and settings. */
router.post('/reset-season', (req, res) => {
  if (String(req.body.confirm || '').trim().toUpperCase() !== 'RESET') {
    return res.redirect('/settings?err=' + encodeURIComponent('Type RESET in the box to confirm.'));
  }
  db.transaction(() => {
    db.prepare('DELETE FROM donations').run();
    db.prepare('DELETE FROM expenses').run();
    db.prepare('DELETE FROM events').run();
    db.prepare('DELETE FROM duties').run();
    db.prepare('DELETE FROM announcements').run();
  })();
  res.redirect('/settings?ok=' + encodeURIComponent('New season started — members, photos and settings kept'));
});

module.exports = router;
