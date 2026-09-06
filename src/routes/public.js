'use strict';
const express = require('express');
const QRCode = require('qrcode');
const { db } = require('../lib/db');
const h = require('../lib/helpers');

const router = express.Router();

function publicSchedule(settings) {
  const events = db
    .prepare('SELECT * FROM events WHERE is_public = 1 ORDER BY event_date, start_time, id')
    .all();
  const days = h.dateRange(settings.festival_start, settings.festival_end);
  const map = new Map();
  for (const d of days) map.set(d, []);
  for (const e of events) {
    if (!map.has(e.event_date)) map.set(e.event_date, []);
    map.get(e.event_date).push(e);
  }
  return [...map.entries()]
    .filter(([, list]) => list.length > 0)
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([date, list]) => ({ date, events: list }));
}

router.get('/p', async (req, res) => {
  const s = res.locals.settings;

  if (s.public_page_enabled !== '1') {
    return res.status(404).render('pages/error', {
      title: 'Not available',
      message: 'This page is not published yet. Please contact the mandal.',
      status: 404,
    });
  }

  const days = publicSchedule(s);
  const announcements = db
    .prepare('SELECT * FROM announcements ORDER BY pinned DESC, id DESC LIMIT 5')
    .all();
  const photos = db.prepare('SELECT * FROM photos ORDER BY id DESC LIMIT 12').all();
  const aartis = db.prepare('SELECT id, title, language FROM aartis ORDER BY sort_order, id').all();

  const totalCollected =
    s.public_show_total === '1'
      ? db.prepare('SELECT COALESCE(SUM(amount),0) AS t FROM donations').get().t
      : null;

  const topDonors =
    s.public_show_donors === '1'
      ? db
          .prepare(
            `SELECT donor_name, COALESCE(SUM(amount),0) AS total FROM donations
              GROUP BY donor_name ORDER BY total DESC LIMIT 20`
          )
          .all()
      : [];

  let qrDataUrl = '';
  if (s.upi_id) {
    try {
      qrDataUrl = await QRCode.toDataURL(
        h.upiLink({ upiId: s.upi_id, name: s.upi_name || s.mandal_name, note: 'Vargani' }),
        { margin: 1, width: 380, color: { dark: '#2a1c10', light: '#ffffff' } }
      );
    } catch (_) { /* ignore */ }
  }

  const pageUrl = `${req.protocol}://${req.get('host')}/p`;
  const shareText =
    `🙏 *${s.mandal_name}* — Ganesh Mahotsav ${s.year}\n\n` +
    `📅 ${h.formatDate(s.festival_start)} to ${h.formatDate(s.festival_end)}\n` +
    (s.address ? `📍 ${s.address}\n` : '') +
    `\nFull program and details:\n${pageUrl}\n\nGanpati Bappa Morya! 🎉`;

  res.render('pages/public', {
    title: `${s.mandal_name} — Ganesh Mahotsav ${s.year}`,
    days,
    announcements,
    photos,
    aartis,
    totalCollected,
    topDonors,
    qrDataUrl,
    upiLink: s.upi_id
      ? h.upiLink({ upiId: s.upi_id, name: s.upi_name || s.mandal_name, note: 'Vargani' })
      : '',
    pageUrl,
    shareText,
    shareLink: h.whatsappShareLink(shareText),
  });
});

/** Read-only aarti page so devotees can sing along from their own phone. */
router.get('/p/aarti/:id', (req, res) => {
  const s = res.locals.settings;
  if (s.public_page_enabled !== '1') return res.redirect('/p');
  const aarti = db.prepare('SELECT * FROM aartis WHERE id = ?').get(req.params.id);
  if (!aarti) return res.redirect('/p');
  res.render('pages/public-aarti', {
    title: aarti.title,
    aarti,
    shareLink: h.whatsappShareLink(`🙏 *${aarti.title}*\n\n${aarti.lyrics}\n\n— ${s.mandal_name}`),
  });
});

module.exports = router;
