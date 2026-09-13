'use strict';
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const cookieSession = require('cookie-session');

const config = require('./lib/config');
const { allSettings } = require('./lib/db');
const helpers = require('./lib/helpers');
const { LANGUAGES, translator } = require('./lib/i18n');
const { loadUser, requireLogin, requireOwner, isOwner } = require('./lib/auth');

const app = express();
app.set('trust proxy', 1); // Railway terminates TLS in front of us
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));
app.disable('x-powered-by');

/* ------------------------------------------------------------------ */
/*  Core middleware                                                    */
/* ------------------------------------------------------------------ */

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  next();
});

app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(express.json({ limit: '1mb' }));

app.use(
  cookieSession({
    name: 'gm_sess',
    keys: [config.sessionSecret],
    maxAge: 30 * 24 * 60 * 60 * 1000, // stay logged in for a month
    httpOnly: true,
    sameSite: 'lax',
    secure: config.env === 'production',
  })
);

app.use(express.static(path.join(__dirname, '..', 'public'), { maxAge: '7d' }));
app.use('/uploads', express.static(config.uploadDir, { maxAge: '30d' }));

app.use(loadUser);

/* ------------------------------------------------------------------ */
/*  CSRF (double-submit token stored in the signed session)            */
/* ------------------------------------------------------------------ */

app.use((req, res, next) => {
  if (!req.session.csrf) {
    req.session.csrf = crypto.randomBytes(24).toString('hex');
  }
  res.locals.csrfToken = req.session.csrf;
  next();
});

app.use((req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  // File uploads are multipart, so the body is not parsed yet at this point —
  // those forms carry the token in the query string instead.
  const sent =
    (req.body && req.body._csrf) || req.query._csrf || req.headers['x-csrf-token'];
  if (sent && req.session.csrf && sent === req.session.csrf) return next();
  return res.status(403).render('pages/error', {
    title: 'Session expired',
    message:
      'Your session expired for security. Please go back, reload the page and try saving again.',
    status: 403,
  });
});

/* ------------------------------------------------------------------ */
/*  View locals: settings, language, helpers                           */
/* ------------------------------------------------------------------ */

app.use((req, res, next) => {
  const settings = allSettings();

  // ?lang=gu switches language and is remembered in the session.
  const requested = String(req.query.lang || '').toLowerCase();
  if (requested && LANGUAGES.some((l) => l.code === requested)) {
    req.session.lang = requested;
  }
  const lang = req.session.lang || settings.language || 'en';

  res.locals.settings = settings;
  res.locals.lang = lang;
  res.locals.languages = LANGUAGES;
  res.locals.t = translator(lang);
  res.locals.h = helpers;
  res.locals.user = req.user;
  res.locals.isOwner = isOwner(req.user);
  res.locals.currency = settings.currency || '₹';
  res.locals.today = helpers.todayISO();
  res.locals.templateLang = helpers.templateLanguage(settings, lang);
  // `t` translates the screen; `tm` translates the messages that go out on
  // WhatsApp — they differ whenever the template language is pinned.
  res.locals.tm = translator(res.locals.templateLang);
  res.locals.templateLangFollows = String(settings.template_follow_ui_language || '1') === '1';
  res.locals.currentPath = req.path;
  res.locals.query = req.query;
  res.locals.flash = req.query.ok ? String(req.query.ok) : '';
  res.locals.errorMsg = req.query.err ? String(req.query.err) : '';
  res.locals.title = settings.mandal_name || 'Ganpati Mahotsav';
  const t = res.locals.t;
  res.locals.navItems = [
    { href: '/dashboard',     icon: '🏠', label: t('dashboard'),     primary: true },
    { href: '/donations',     icon: '💰', label: t('donations'),     primary: true },
    { href: '/seva',          icon: '🍛', label: t('seva'),          primary: true },
    { href: '/schedule',      icon: '📅', label: t('schedule'),      primary: true },
    { href: '/whatsapp',      icon: '💬', label: t('whatsapp'),      primary: true },
    { href: '/members',       icon: '👥', label: t('members') },
    { href: '/expenses',      icon: '🧾', label: t('expenses') },
    { href: '/duties',        icon: '🪔', label: t('duties') },
    { href: '/announcements', icon: '📢', label: t('announcements') },
    { href: '/gallery',       icon: '📸', label: t('gallery') },
    { href: '/aarti',         icon: '📖', label: t('aarti') },
    { href: '/reports',       icon: '📊', label: t('reports') },
    { href: '/qr',            icon: '🔳', label: t('qr_poster') },
    { href: '/account',       icon: '🔑', label: t('my_account') },
    { href: '/settings',      icon: '⚙️', label: t('settings'), ownerOnly: true },
  ].filter((item) => !item.ownerOnly || res.locals.isOwner);
  res.locals.isActive = (href) =>
    req.path === href || req.path.indexOf(href + '/') === 0;
  res.locals.countdown = (() => {
    const today = helpers.todayISO();
    const toStart = helpers.daysBetween(today, settings.festival_start);
    const toEnd = helpers.daysBetween(today, settings.festival_end);
    if (toStart === null || toEnd === null) return { state: 'unknown', days: null };
    if (toStart > 0) return { state: 'before', days: toStart };
    if (toEnd >= 0) return { state: 'during', days: toEnd, dayNo: Math.abs(toStart) + 1 };
    return { state: 'after', days: Math.abs(toEnd) };
  })();
  next();
});

/* ------------------------------------------------------------------ */
/*  Routes                                                             */
/* ------------------------------------------------------------------ */

app.get('/healthz', (_req, res) => res.json({ ok: true, uptime: process.uptime() }));

app.use('/', require('./routes/auth'));
app.use('/', require('./routes/public'));

app.use('/dashboard', requireLogin, require('./routes/dashboard'));
app.use('/members', requireLogin, require('./routes/members'));
app.use('/donations', requireLogin, require('./routes/donations'));
app.use('/seva', requireLogin, require('./routes/seva'));
app.use('/expenses', requireLogin, require('./routes/expenses'));
app.use('/schedule', requireLogin, require('./routes/schedule'));
app.use('/duties', requireLogin, require('./routes/duties'));
app.use('/announcements', requireLogin, require('./routes/announcements'));
app.use('/whatsapp', requireLogin, require('./routes/whatsapp'));
app.use('/gallery', requireLogin, require('./routes/gallery'));
app.use('/aarti', requireLogin, require('./routes/aarti'));
app.use('/reports', requireLogin, require('./routes/reports'));
app.use('/qr', requireLogin, require('./routes/qr'));
app.use('/account', requireLogin, require('./routes/account'));
app.use('/settings', requireLogin, requireOwner, require('./routes/settings'));

/* ------------------------------------------------------------------ */
/*  404 + error handling                                               */
/* ------------------------------------------------------------------ */

app.use((req, res) => {
  res.status(404).render('pages/error', {
    title: 'Page not found',
    message: 'The page you are looking for does not exist.',
    status: 404,
  });
});

app.use((err, _req, res, _next) => {
  console.error('[error]', err);
  const isSize = err && (err.code === 'LIMIT_FILE_SIZE' || err.type === 'entity.too.large');
  res.status(isSize ? 413 : 500).render('pages/error', {
    title: isSize ? 'File too large' : 'Something went wrong',
    message: isSize
      ? `That file is too big. Please upload an image under ${Math.round(
          config.maxUploadBytes / 1024 / 1024
        )} MB.`
      : 'Sorry, something went wrong on our side. Please try again.',
    status: isSize ? 413 : 500,
  });
});

/* ------------------------------------------------------------------ */
/*  Start                                                              */
/* ------------------------------------------------------------------ */

if (require.main === module) {
  app.listen(config.port, '0.0.0.0', () => {
    console.log(`\n  🕉  Ganpati Mahotsav Manager`);
    console.log(`  ➜  listening on http://0.0.0.0:${config.port}`);
    console.log(`  ➜  database: ${config.dbFile}`);
    if (!config.persistentStorage) {
      console.warn(
        '  ⚠  DATA_DIR is not set. On Railway, attach a Volume and set DATA_DIR to its\n' +
          '     mount path (e.g. /data) or your data will be LOST on every redeploy.'
      );
    }
    if (config.usingDefaultPassword) {
      console.warn('  ⚠  ADMIN_PASSWORD is not set — using the default. Change it now.');
    }
    if (config.usingDefaultSecret) {
      console.warn('  ⚠  SESSION_SECRET is not set — using the default. Set a random value.');
    }
    console.log('');
  });
}

module.exports = app;
