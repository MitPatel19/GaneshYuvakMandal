'use strict';
const express = require('express');
const { db } = require('../lib/db');
const h = require('../lib/helpers');

const router = express.Router();

const ROLES = [
  'President', 'Vice President', 'Secretary', 'Joint Secretary',
  'Treasurer', 'Committee Member', 'Volunteer', 'Member',
];

function listMembers(search) {
  if (search) {
    const like = `%${search}%`;
    return db
      .prepare(
        `SELECT * FROM members
          WHERE name LIKE ? OR phone LIKE ? OR role LIKE ? OR address LIKE ?
          ORDER BY is_active DESC, name COLLATE NOCASE`
      )
      .all(like, like, like, like);
  }
  return db.prepare('SELECT * FROM members ORDER BY is_active DESC, name COLLATE NOCASE').all();
}

router.get('/', (req, res) => {
  const search = String(req.query.q || '').trim();
  const members = listMembers(search);
  res.render('pages/members', {
    title: res.locals.t('members'),
    members,
    search,
    roles: ROLES,
    activeCount: members.filter((m) => m.is_active).length,
  });
});

router.get('/new', (req, res) => {
  res.render('pages/member-form', {
    title: res.locals.t('add_new'),
    member: { name: '', phone: '', role: 'Member', address: '', note: '', is_active: 1 },
    roles: ROLES,
    action: '/members/new',
  });
});

router.post('/new', (req, res) => {
  const { name, phone, role, address, note } = req.body;
  if (!String(name || '').trim()) {
    return res.redirect('/members/new?err=' + encodeURIComponent('Please enter a name.'));
  }
  db.prepare(
    'INSERT INTO members (name, phone, role, address, note, is_active) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(
    String(name).trim(),
    String(phone || '').trim(),
    String(role || 'Member').trim(),
    String(address || '').trim(),
    String(note || '').trim(),
    1
  );
  res.redirect('/members?ok=' + encodeURIComponent('Member added'));
});

router.get('/:id/edit', (req, res) => {
  const member = db.prepare('SELECT * FROM members WHERE id = ?').get(req.params.id);
  if (!member) return res.redirect('/members');
  res.render('pages/member-form', {
    title: res.locals.t('edit'),
    member,
    roles: ROLES,
    action: `/members/${member.id}/edit`,
  });
});

router.post('/:id/edit', (req, res) => {
  const { name, phone, role, address, note } = req.body;
  db.prepare(
    `UPDATE members SET name = ?, phone = ?, role = ?, address = ?, note = ?, is_active = ?
      WHERE id = ?`
  ).run(
    String(name || '').trim(),
    String(phone || '').trim(),
    String(role || 'Member').trim(),
    String(address || '').trim(),
    String(note || '').trim(),
    req.body.is_active ? 1 : 0,
    req.params.id
  );
  res.redirect('/members?ok=' + encodeURIComponent('Member updated'));
});

router.post('/:id/delete', (req, res) => {
  db.prepare('DELETE FROM members WHERE id = ?').run(req.params.id);
  res.redirect('/members?ok=' + encodeURIComponent('Member removed'));
});

router.get('/export.csv', (req, res) => {
  const members = listMembers('');
  const csv = h.toCSV(
    ['Name', 'Phone', 'Role', 'Address', 'Note', 'Active'],
    members.map((m) => [m.name, m.phone, m.role, m.address, m.note, m.is_active ? 'Yes' : 'No'])
  );
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="members.csv"');
  res.send(csv);
});

module.exports = router;
