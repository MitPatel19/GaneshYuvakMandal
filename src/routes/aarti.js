'use strict';
const express = require('express');
const { db } = require('../lib/db');
const h = require('../lib/helpers');

const router = express.Router();

router.get('/', (req, res) => {
  const aartis = db.prepare('SELECT * FROM aartis ORDER BY sort_order, id').all();
  const activeId = req.query.id ? Number(req.query.id) : (aartis[0] && aartis[0].id);
  const active = aartis.find((a) => a.id === activeId) || aartis[0] || null;
  res.render('pages/aarti', {
    title: res.locals.t('aarti'),
    aartis,
    active,
    shareLink: active
      ? h.whatsappShareLink(`🙏 *${active.title}*\n\n${active.lyrics}\n\n— ${res.locals.settings.mandal_name}`)
      : '',
  });
});

router.post('/new', (req, res) => {
  const title = String(req.body.title || '').trim();
  if (!title) return res.redirect('/aarti?err=' + encodeURIComponent('Please enter a title.'));
  const max = db.prepare('SELECT COALESCE(MAX(sort_order), 0) AS m FROM aartis').get().m;
  const info = db
    .prepare('INSERT INTO aartis (title, lyrics, language, sort_order) VALUES (?, ?, ?, ?)')
    .run(title, String(req.body.lyrics || '').trim(), String(req.body.language || '').trim(), max + 1);
  res.redirect(`/aarti?id=${info.lastInsertRowid}&ok=` + encodeURIComponent('Aarti added'));
});

router.post('/:id/edit', (req, res) => {
  db.prepare('UPDATE aartis SET title = ?, lyrics = ?, language = ? WHERE id = ?').run(
    String(req.body.title || '').trim(),
    String(req.body.lyrics || '').trim(),
    String(req.body.language || '').trim(),
    req.params.id
  );
  res.redirect(`/aarti?id=${req.params.id}&ok=` + encodeURIComponent('Aarti updated'));
});

router.post('/:id/delete', (req, res) => {
  db.prepare('DELETE FROM aartis WHERE id = ?').run(req.params.id);
  res.redirect('/aarti?ok=' + encodeURIComponent('Aarti deleted'));
});

module.exports = router;
