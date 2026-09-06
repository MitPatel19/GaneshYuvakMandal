'use strict';
const express = require('express');
const auth = require('../lib/auth');

const router = express.Router();

router.get('/', (req, res) => {
  res.redirect(req.user ? '/dashboard' : '/p');
});

router.get('/login', (req, res) => {
  if (req.user) return res.redirect('/dashboard');
  res.render('pages/login', {
    title: res.locals.t('login_title'),
    next: typeof req.query.next === 'string' ? req.query.next : '/dashboard',
    error: req.query.err ? String(req.query.err) : '',
  });
});

router.post('/login', (req, res) => {
  const next = typeof req.body.next === 'string' && req.body.next.startsWith('/')
    ? req.body.next
    : '/dashboard';

  if (auth.isLockedOut(req)) {
    return res.status(429).render('pages/login', {
      title: res.locals.t('login_title'),
      next,
      error: 'Too many attempts. Please wait 15 minutes and try again.',
    });
  }

  const user = auth.verifyUser(req.body.username, req.body.password);
  if (!user) {
    auth.noteFailure(req);
    return res.status(401).render('pages/login', {
      title: res.locals.t('login_title'),
      next,
      error: res.locals.t('wrong_login'),
    });
  }

  auth.clearFailures(req);
  const lang = req.session.lang;
  req.session = { user: { id: user.id }, lang };
  res.redirect(next);
});

router.post('/logout', (req, res) => {
  req.session = null;
  res.redirect('/login');
});

module.exports = router;
