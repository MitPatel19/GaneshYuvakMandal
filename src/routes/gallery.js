'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const multer = require('multer');
const { db } = require('../lib/db');
const config = require('../lib/config');

const router = express.Router();

const ALLOWED = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, config.uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ALLOWED.has(ext) ? ext : '.jpg'}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: config.maxUploadBytes, files: 10 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED.has(ext) || !/^image\//.test(file.mimetype)) {
      return cb(new Error('Only image files (JPG, PNG, WEBP, GIF) can be uploaded.'));
    }
    cb(null, true);
  },
});

router.get('/', (req, res) => {
  const photos = db.prepare('SELECT * FROM photos ORDER BY id DESC').all();
  res.render('pages/gallery', {
    title: res.locals.t('gallery'),
    photos,
    maxMb: Math.round(config.maxUploadBytes / 1024 / 1024),
  });
});

/** Turn multer's errors into a friendly redirect instead of an error page. */
function handleUpload(req, res, next) {
  upload.array('photos', 10)(req, res, (err) => {
    if (!err) return next();
    const msg =
      err.code === 'LIMIT_FILE_SIZE'
        ? `Photo is too big. Please upload images under ${Math.round(config.maxUploadBytes / 1024 / 1024)} MB.`
        : err.code === 'LIMIT_FILE_COUNT'
        ? 'You can upload up to 10 photos at a time.'
        : err.message || 'Sorry, that file could not be uploaded.';
    res.redirect('/gallery?err=' + encodeURIComponent(msg));
  });
}

router.post('/upload', handleUpload, (req, res) => {
  const files = req.files || [];
  if (!files.length) {
    return res.redirect('/gallery?err=' + encodeURIComponent('Please choose at least one photo.'));
  }
  const caption = String(req.body.caption || '').trim();
  const ins = db.prepare('INSERT INTO photos (filename, caption) VALUES (?, ?)');
  db.transaction(() => {
    for (const f of files) ins.run(f.filename, caption);
  })();
  res.redirect('/gallery?ok=' + encodeURIComponent(`${files.length} photo(s) uploaded`));
});

router.post('/:id/delete', (req, res) => {
  const photo = db.prepare('SELECT * FROM photos WHERE id = ?').get(req.params.id);
  if (photo) {
    db.prepare('DELETE FROM photos WHERE id = ?').run(photo.id);
    // Never let a stray path escape the upload folder.
    const target = path.join(config.uploadDir, path.basename(photo.filename));
    if (target.startsWith(config.uploadDir)) {
      fs.promises.unlink(target).catch(() => {});
    }
  }
  res.redirect('/gallery?ok=' + encodeURIComponent('Photo deleted'));
});

module.exports = router;
