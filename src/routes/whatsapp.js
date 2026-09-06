'use strict';
const express = require('express');
const { db } = require('../lib/db');
const { LANGUAGES } = require('../lib/i18n');
const h = require('../lib/helpers');

const router = express.Router();

const TOKENS = [
  '{{name}}', '{{mandal_name}}', '{{year}}', '{{festival_start}}', '{{festival_end}}',
  '{{address}}', '{{upi_id}}', '{{president_phone}}', '{{date}}', '{{maps}}',
];

/**
 * Build the recipient list for a given audience.
 * `{{name}}` is substituted per person in the browser so each contact
 * gets a personally addressed message without a round trip.
 */
function getAudience(kind, settings) {
  const cc = settings.country_code || '91';
  const map = (rows, nameKey) =>
    rows
      .map((r) => ({
        name: r[nameKey] || '',
        phone: h.normalisePhone(r.phone, cc),
        raw: r.phone || '',
        extra: r.role || r.amount || '',
      }))
      .filter((r) => r.name);

  switch (kind) {
    case 'members':
      return map(
        db.prepare('SELECT name, phone, role FROM members WHERE is_active = 1 ORDER BY name COLLATE NOCASE').all(),
        'name'
      );
    case 'committee':
      return map(
        db
          .prepare(
            `SELECT name, phone, role FROM members
              WHERE is_active = 1 AND role NOT IN ('Member', 'Volunteer')
              ORDER BY name COLLATE NOCASE`
          )
          .all(),
        'name'
      );
    case 'donors':
      return map(
        db
          .prepare(
            `SELECT donor_name AS name, phone, MAX(amount) AS amount FROM donations
              WHERE phone <> '' GROUP BY donor_name, phone ORDER BY name COLLATE NOCASE`
          )
          .all(),
        'name'
      );
    case 'duties_today':
      return map(
        db
          .prepare('SELECT member_name AS name, phone, slot AS role FROM duties WHERE duty_date = ?')
          .all(h.todayISO()),
        'name'
      );
    default:
      return [];
  }
}

const AUDIENCES = [
  { key: 'members', label: 'All active members', icon: '👥' },
  { key: 'committee', label: 'Committee only', icon: '🎖' },
  { key: 'donors', label: 'All donors', icon: '💰' },
  { key: 'duties_today', label: "Today's duty volunteers", icon: '🪔' },
];

/**
 * Built-in templates are shown in the active template language; templates the
 * mandal wrote itself always appear, whatever language they were written in,
 * so nothing they created can silently disappear.
 */
function listTemplates(lang) {
  return db
    .prepare(
      `SELECT * FROM templates
        WHERE builtin_key = '' OR lang = ?
        ORDER BY builtin_key = '' , category, name`
    )
    .all(lang);
}

router.get('/', (req, res) => {
  const s = res.locals.settings;
  const templates = listTemplates(res.locals.templateLang);
  const audienceKey = String(req.query.audience || 'members');
  const templateId = req.query.template ? Number(req.query.template) : null;

  const chosen = templateId ? templates.find((t) => t.id === templateId) : null;
  const vars = h.baseTemplateVars(s);
  // Keep {{name}} unresolved so the browser can personalise per recipient.
  const message = String(req.query.message || '') ||
    (chosen ? h.renderTemplate(chosen.body.replace(/\{\{\s*name\s*\}\}/g, '@@NAME@@'), vars).replace(/@@NAME@@/g, '{{name}}') : '');

  const recipients = getAudience(audienceKey, s);

  res.render('pages/whatsapp', {
    title: res.locals.t('whatsapp'),
    templates,
    templatesRendered: templates.map((t) => ({
      ...t,
      rendered: h.renderTemplate(t.body.replace(/\{\{\s*name\s*\}\}/g, '@@NAME@@'), vars).replace(/@@NAME@@/g, '{{name}}'),
    })),
    audiences: AUDIENCES,
    audienceKey,
    recipients,
    message,
    tokens: TOKENS,
    groupLink: s.whatsapp_group_link,
  });
});

/* ---------------- Template management ---------------- */

router.get('/templates', (req, res) => {
  // The management page can show every language, so a mandal can fine-tune the
  // Gujarati wording while reading the app in English.
  const showAll = req.query.all === '1';
  const templates = showAll
    ? db.prepare("SELECT * FROM templates ORDER BY builtin_key = '', lang, category, name").all()
    : listTemplates(res.locals.templateLang);
  res.render('pages/templates', {
    title: res.locals.t('templates'),
    templates,
    tokens: TOKENS,
    showAll,
    languages: LANGUAGES,
  });
});

router.post('/templates/new', (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) return res.redirect('/whatsapp/templates?err=' + encodeURIComponent('Please enter a name.'));
  db.prepare('INSERT INTO templates (name, body, category, lang) VALUES (?, ?, ?, ?)').run(
    name,
    String(req.body.body || '').trim(),
    String(req.body.category || 'General').trim(),
    res.locals.templateLang
  );
  res.redirect('/whatsapp/templates?ok=' + encodeURIComponent('Template saved'));
});

router.post('/templates/:id/edit', (req, res) => {
  db.prepare('UPDATE templates SET name = ?, body = ?, category = ? WHERE id = ?').run(
    String(req.body.name || '').trim(),
    String(req.body.body || '').trim(),
    String(req.body.category || 'General').trim(),
    req.params.id
  );
  res.redirect('/whatsapp/templates?ok=' + encodeURIComponent('Template updated'));
});

router.post('/templates/:id/delete', (req, res) => {
  const tpl = db.prepare('SELECT builtin_key FROM templates WHERE id = ?').get(req.params.id);
  if (tpl && tpl.builtin_key) {
    return res.redirect(
      '/whatsapp/templates?err=' +
        encodeURIComponent(
          'Built-in templates cannot be deleted — edit the wording instead, or just ignore it.'
        )
    );
  }
  db.prepare('DELETE FROM templates WHERE id = ?').run(req.params.id);
  res.redirect('/whatsapp/templates?ok=' + encodeURIComponent('Template deleted'));
});

module.exports = router;
