'use strict';
const express = require('express');
const QRCode = require('qrcode');
const h = require('../lib/helpers');

const router = express.Router();

/**
 * The address people should be sent to. Uses `public_base_url` when the mandal
 * has set one (handy once a custom domain is attached), otherwise whatever
 * host this request arrived on — so the QR is correct on Railway with no setup.
 */
function publicUrl(req, settings) {
  const configured = String(settings.public_base_url || '').trim();
  const base = configured
    ? configured.replace(/\/+$/, '')
    : `${req.protocol}://${req.get('host')}`;
  return `${base}/p`;
}

router.get('/', async (req, res) => {
  const s = res.locals.settings;
  const url = publicUrl(req, s);

  let qrDataUrl = '';
  try {
    qrDataUrl = await QRCode.toDataURL(url, {
      margin: 1,
      width: 900,
      errorCorrectionLevel: 'M',
      color: { dark: '#2a1c10', light: '#ffffff' },
    });
  } catch (_) {
    /* the page still works, it just shows the link instead */
  }

  const shareText =
    `🙏 *${s.mandal_name}* — Ganesh Mahotsav ${s.year}\n\n` +
    `${res.locals.tm('sm_see_program')}\n${url}\n\n🙏 ${res.locals.tm('sm_bappa_morya')}`;

  res.render('pages/qr', {
    title: res.locals.t('qr_poster'),
    url,
    qrDataUrl,
    shareText,
    shareLink: h.whatsappShareLink(shareText),
  });
});

/** The bare QR as a PNG — for printing, or sending as a WhatsApp image. */
router.get('/code.png', async (req, res) => {
  const url = publicUrl(req, res.locals.settings);
  const size = Math.min(2000, Math.max(200, Number(req.query.size) || 1000));
  try {
    const buf = await QRCode.toBuffer(url, {
      type: 'png',
      margin: 2,
      width: size,
      errorCorrectionLevel: 'M',
      color: { dark: '#000000', light: '#ffffff' },
    });
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', 'attachment; filename="mandal-qr.png"');
    res.send(buf);
  } catch (err) {
    res.status(500).send('Could not generate the QR code.');
  }
});

module.exports = router;
