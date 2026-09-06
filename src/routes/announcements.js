'use strict';
const express = require('express');
const { db } = require('../lib/db');
const h = require('../lib/helpers');

const router = express.Router();

router.get('/', (req, res) => {
  const s = res.locals.settings;
  const rows = db.prepare('SELECT * FROM announcements ORDER BY pinned DESC, id DESC').all();
  const announcements = rows.map((a) => {
    const text = `📢 *${a.title}*\n\n${a.body}\n\n— ${s.mandal_name}\n🙏 Ganpati Bappa Morya!`;
    return { ...a, shareText: text, shareLink: h.whatsappShareLink(text) };
  });
  res.render('pages/announcements', {
    title: res.locals.t('announcements'),
    announcements,
  });
});

router.post('/new', (req, res) => {
  const title = String(req.body.title || '').trim();
  if (!title) {
    return res.redirect('/announcements?err=' + encodeURIComponent('Please enter a title.'));
  }
  db.prepare('INSERT INTO announcements (title, body, pinned) VALUES (?, ?, ?)').run(
    title,
    String(req.body.body || '').trim(),
    req.body.pinned ? 1 : 0
  );
  res.redirect('/announcements?ok=' + encodeURIComponent('Announcement posted'));
});

router.post('/:id/edit', (req, res) => {
  db.prepare('UPDATE announcements SET title = ?, body = ?, pinned = ? WHERE id = ?').run(
    String(req.body.title || '').trim(),
    String(req.body.body || '').trim(),
    req.body.pinned ? 1 : 0,
    req.params.id
  );
  res.redirect('/announcements?ok=' + encodeURIComponent('Announcement updated'));
});

router.post('/:id/delete', (req, res) => {
  db.prepare('DELETE FROM announcements WHERE id = ?').run(req.params.id);
  res.redirect('/announcements?ok=' + encodeURIComponent('Announcement deleted'));
});

module.exports = router;
