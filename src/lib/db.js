'use strict';
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const config = require('./config');
const { BUILTIN_TEMPLATES, LEGACY_NAME_TO_KEY } = require('./templates');
const { DEFAULT_SEVA_TYPES } = require('./seva-types');
const { LANGUAGES } = require('./i18n');

const db = new Database(config.dbFile);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));

/* ------------------------------------------------------------------ */
/*  Settings helpers                                                   */
/* ------------------------------------------------------------------ */

const DEFAULT_SETTINGS = {
  mandal_name: 'Ganesh Yuvak Mandal',
  tagline: 'Ganpati Bappa Morya!',
  year: String(new Date().getFullYear()),
  festival_start: '2026-09-14',
  festival_end: '2026-09-24',
  address: '',
  about: 'Welcome to our Ganpati Mahotsav. Everyone is warmly invited to take darshan and join the aarti.',
  president_name: '',
  president_phone: '',
  secretary_name: '',
  secretary_phone: '',
  treasurer_name: '',
  treasurer_phone: '',
  upi_id: '',
  upi_name: '',
  whatsapp_group_link: '',
  google_maps_link: '',
  language: 'en',
  currency: '₹',
  country_code: '91',
  // When on, WhatsApp templates are shown in whichever language is picked with
  // the 🌐 button. When off, they always use the default language above.
  template_follow_ui_language: '1',
  // Leave empty to use whatever address the site is opened on. Set it once a
  // custom domain is attached so printed QR posters keep pointing at the right place.
  public_base_url: '',
  public_page_enabled: '1',
  public_show_donors: '1',
  public_show_total: '0',
  public_show_seva: '1',
};

const getSettingStmt = db.prepare('SELECT value FROM settings WHERE key = ?');
const setSettingStmt = db.prepare(
  'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
);

function getSetting(key, fallback = '') {
  const row = getSettingStmt.get(key);
  if (row && row.value !== undefined && row.value !== null) return row.value;
  if (key in DEFAULT_SETTINGS) return DEFAULT_SETTINGS[key];
  return fallback;
}

function setSetting(key, value) {
  setSettingStmt.run(key, value == null ? '' : String(value));
}

function allSettings() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const out = { ...DEFAULT_SETTINGS };
  for (const r of rows) out[r.key] = r.value;
  return out;
}

/* ------------------------------------------------------------------ */
/*  First-run seeding                                                  */
/* ------------------------------------------------------------------ */

const DEFAULT_AARTIS = [
  {
    title: 'Sukhkarta Dukhharta (सुखकर्ता दुःखहर्ता)',
    language: 'Marathi',
    sort_order: 1,
    lyrics: `सुखकर्ता दुखहर्ता वार्ता विघ्नाची।
नुरवी पुरवी प्रेम कृपा जयाची॥
सर्वांगी सुंदर उटी शेंदुराची।
कंठी झळके माळ मुक्ताफळांची॥

जय देव जय देव जय मंगलमूर्ती।
दर्शनमात्रे मनकामना पुरती॥ धृ॥

रत्नखचित फरा तुज गौरीकुमरा।
चंदनाची उटी कुमकुम केशरा॥
हिरेजडित मुकुट शोभतो बरा।
रुणझुणती नूपुरे चरणी घागरिया॥

जय देव जय देव जय मंगलमूर्ती।
दर्शनमात्रे मनकामना पुरती॥

लंबोदर पीतांबर फणिवरवंदना।
सरळ सोंड वक्रतुंड त्रिनयना॥
दास रामाचा वाट पाहे सदना।
संकटी पावावे निर्वाणी रक्षावे सुरवरवंदना॥

जय देव जय देव जय मंगलमूर्ती।
दर्शनमात्रे मनकामना पुरती॥`,
  },
  {
    title: 'Jai Ganesh Jai Ganesh Deva (जय गणेश जय गणेश देवा)',
    language: 'Hindi',
    sort_order: 2,
    lyrics: `जय गणेश जय गणेश जय गणेश देवा।
माता जाकी पार्वती पिता महादेवा॥

एक दंत दयावंत चार भुजा धारी।
माथे सिंदूर सोहे मूसे की सवारी॥
जय गणेश जय गणेश जय गणेश देवा॥

अंधन को आँख देत कोढ़िन को काया।
बाँझन को पुत्र देत निर्धन को माया॥
जय गणेश जय गणेश जय गणेश देवा॥

पान चढ़े फूल चढ़े और चढ़े मेवा।
लड्डुअन का भोग लगे संत करें सेवा॥
जय गणेश जय गणेश जय गणेश देवा॥

दीनन की लाज रखो शंभु सुतकारी।
कामना को पूर्ण करो जाऊँ बलिहारी॥
जय गणेश जय गणेश जय गणेश देवा॥`,
  },
  {
    title: 'Ganpati Atharvashirsha (Opening)',
    language: 'Sanskrit',
    sort_order: 3,
    lyrics: `ॐ नमस्ते गणपतये।
त्वमेव प्रत्यक्षं तत्त्वमसि।
त्वमेव केवलं कर्तासि।
त्वमेव केवलं धर्तासि।
त्वमेव केवलं हर्तासि।
त्वमेव सर्वं खल्विदं ब्रह्मासि।
त्वं साक्षादात्मासि नित्यम्॥

वक्रतुण्ड महाकाय सूर्यकोटि समप्रभ।
निर्विघ्नं कुरु मे देव सर्वकार्येषु सर्वदा॥`,
  },
  {
    title: 'Shendur Laal Chadhayo (शेंदुर लाल चढ़ायो)',
    language: 'Hindi',
    sort_order: 4,
    lyrics: `शेंदुर लाल चढ़ायो अच्छा गजमुख को।
दोंदिल लाल बिराजे सुत गौरीहर को॥
हाथ लिए गुड़ लड्डू साईं सुरवर को।
महिमा कहे न जाय लागत हूँ पद को॥

जय जय जी गणराज विद्यासुखदाता।
धन्य तुम्हारो दर्शन मेरा मन रमता॥ धृ॥

अष्टों सिद्धि दासी संकट को बैरी।
विघ्नविनाशन मंगल मूरत अधिकारी॥
कोटि सूरज प्रकाश ऐसी छबि तेरी।
गंडस्थल मदमस्तक झूले शशिबिहारी॥

जय जय जी गणराज विद्यासुखदाता।
धन्य तुम्हारो दर्शन मेरा मन रमता॥`,
  },
];

/* ------------------------------------------------------------------ */
/*  Schema migrations for databases created by an earlier version      */
/* ------------------------------------------------------------------ */

function columnExists(table, column) {
  return db.prepare(`PRAGMA table_info(${table})`).all().some((c) => c.name === column);
}

function migrate() {
  // v1 -> v2: templates gained a language and a stable key for the built-ins.
  if (!columnExists('templates', 'lang')) {
    db.exec("ALTER TABLE templates ADD COLUMN lang TEXT NOT NULL DEFAULT 'en'");
  }
  if (!columnExists('templates', 'builtin_key')) {
    db.exec("ALTER TABLE templates ADD COLUMN builtin_key TEXT NOT NULL DEFAULT ''");
    // The six English templates the first release seeded are matched by their
    // original name so they become the English copy of each built-in, and any
    // wording the mandal already edited is preserved.
    const claim = db.prepare(
      "UPDATE templates SET builtin_key = ?, lang = 'en' WHERE name = ? AND builtin_key = ''"
    );
    db.transaction(() => {
      for (const [name, key] of Object.entries(LEGACY_NAME_TO_KEY)) claim.run(key, name);
    })();
  }
  db.exec(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_templates_builtin " +
      "ON templates(builtin_key, lang) WHERE builtin_key <> ''"
  );

  // v3 -> v4: logins gained roles. Everyone used to be a full admin, so the
  // first login created (the one seeded from ADMIN_USERNAME) becomes the owner
  // and any extra logins become helpers. Nobody is locked out — the owner can
  // promote anyone back from Settings.
  const legacy = db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'admin'").get().c;
  if (legacy > 0) {
    const first = db.prepare('SELECT id FROM users ORDER BY id LIMIT 1').get();
    db.transaction(() => {
      db.prepare("UPDATE users SET role = 'helper' WHERE role = 'admin'").run();
      if (first) db.prepare("UPDATE users SET role = 'owner' WHERE id = ?").run(first.id);
    })();
  }

  // A database must never end up with no owner — that would lock Settings for good.
  const owners = db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'owner'").get().c;
  if (owners === 0) {
    const first = db.prepare('SELECT id FROM users ORDER BY id LIMIT 1').get();
    if (first) db.prepare("UPDATE users SET role = 'owner' WHERE id = ?").run(first.id);
  }
}

/**
 * Make sure every built-in template exists in every language. Rows that are
 * already there are left completely alone, so edits are never overwritten.
 */
function syncBuiltinTemplates() {
  const has = db.prepare('SELECT id FROM templates WHERE builtin_key = ? AND lang = ?');
  const ins = db.prepare(
    'INSERT INTO templates (name, body, category, lang, builtin_key) VALUES (?, ?, ?, ?, ?)'
  );
  db.transaction(() => {
    for (const tpl of BUILTIN_TEMPLATES) {
      for (const { code } of LANGUAGES) {
        const copy = tpl[code];
        if (!copy || has.get(tpl.key, code)) continue;
        ins.run(copy.name, copy.body, tpl.category[code] || tpl.category.en, code, tpl.key);
      }
    }
  })();
}

function seedFirstRun() {
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    if (!getSettingStmt.get(key)) setSetting(key, value);
  }

  const userCount = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  if (userCount === 0) {
    db.prepare(
      'INSERT INTO users (username, password_hash, display_name, role) VALUES (?, ?, ?, ?)'
    ).run(
      config.admin.username.toLowerCase(),
      bcrypt.hashSync(config.admin.password, 10),
      'Main Admin',
      'owner'
    );
  }

  syncBuiltinTemplates();

  const sevaTypeCount = db.prepare('SELECT COUNT(*) AS c FROM seva_types').get().c;
  if (sevaTypeCount === 0) {
    const ins = db.prepare(
      `INSERT INTO seva_types (name, name_en, name_gu, name_hi, name_mr, icon, is_daily, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );
    db.transaction(() => {
      DEFAULT_SEVA_TYPES.forEach((t, i) => {
        ins.run(t.gu, t.en, t.gu, t.hi, t.mr, t.icon, t.is_daily, i + 1);
      });
    })();
  }

  const aartiCount = db.prepare('SELECT COUNT(*) AS c FROM aartis').get().c;
  if (aartiCount === 0) {
    const ins = db.prepare('INSERT INTO aartis (title, lyrics, language, sort_order) VALUES (?, ?, ?, ?)');
    const tx = db.transaction((rows) =>
      rows.forEach((a) => ins.run(a.title, a.lyrics, a.language, a.sort_order))
    );
    tx(DEFAULT_AARTIS);
  }
}

migrate();
seedFirstRun();

/**
 * Fetch a built-in template by its stable key in the requested language.
 * Falls back to English, then to any language that exists, so a message is
 * never blank just because one translation was deleted.
 */
function getBuiltinTemplate(key, lang) {
  const byLang = db.prepare('SELECT * FROM templates WHERE builtin_key = ? AND lang = ?');
  return (
    byLang.get(key, lang) ||
    byLang.get(key, 'en') ||
    db.prepare('SELECT * FROM templates WHERE builtin_key = ? ORDER BY id LIMIT 1').get(key) ||
    null
  );
}

module.exports = {
  db,
  getBuiltinTemplate,
  getSetting,
  setSetting,
  allSettings,
  DEFAULT_SETTINGS,
  seedFirstRun,
  syncBuiltinTemplates,
};
