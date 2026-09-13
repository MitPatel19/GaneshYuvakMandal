'use strict';
const express = require('express');
const { verifyUser, setPassword, isOwner } = require('../lib/auth');

const router = express.Router();

/** Every signed-in person can manage their own login here, owner or helper. */
router.get('/', (req, res) => {
  res.render('pages/account', { title: res.locals.t('my_account') });
});

router.post('/password', (req, res) => {
  const current = String(req.body.current_password || '');
  const next = String(req.body.new_password || '');
  const confirm = String(req.body.confirm_password || '');

  if (next.length < 6) {
    return res.redirect(
      '/account?err=' + encodeURIComponent('New password must be at least 6 characters.')
    );
  }
  if (next !== confirm) {
    return res.redirect(
      '/account?err=' + encodeURIComponent('The two new passwords do not match.')
    );
  }
  if (!verifyUser(req.user.username, current)) {
    return res.redirect('/account?err=' + encodeURIComponent('Current password is wrong.'));
  }

  setPassword(req.user.id, next);
  res.redirect('/account?ok=' + encodeURIComponent('Password changed'));
});

module.exports = router;
