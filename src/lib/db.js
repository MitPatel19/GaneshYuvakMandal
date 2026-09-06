'use strict';
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const config = require('./config');

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
  public_page_enabled: '1',
  public_show_donors: '1',
  public_show_total: '0',
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

const DEFAULT_TEMPLATES = [
  {
    name: 'Invitation / Aamantran',
    category: 'Invite',
    body:
      '🙏 *Ganpati Bappa Morya!* 🙏\n\n{{mandal_name}} warmly invites you and your family to our Ganesh Mahotsav {{year}}.\n\n📅 {{festival_start}} to {{festival_end}}\n📍 {{address}}\n\nPlease come for darshan and aarti with your family.\n\n_Ganpati Bappa Morya, Mangal Murti Morya!_',
  },
  {
    name: 'Donation Thank You',
    category: 'Donation',
    body:
      '🙏 *Thank you {{donor_name}}!* 🙏\n\nWe have received your contribution of {{currency}}{{amount}} for {{mandal_name}} Ganesh Mahotsav {{year}}.\nReceipt No: {{receipt_no}}\nDate: {{date}}\n\nMay Bappa bless you and your family with health, happiness and prosperity.\n\n_Ganpati Bappa Morya!_',
  },
  {
    name: 'Donation Request / Vargani',
    category: 'Donation',
    body:
      '🙏 *Ganpati Bappa Morya!* 🙏\n\n{{mandal_name}} is celebrating Ganesh Mahotsav {{year}} from {{festival_start}} to {{festival_end}}.\n\nWe humbly request your contribution (vargani) to help us serve the community.\n\n💳 UPI: {{upi_id}}\n📞 Contact: {{president_phone}}\n\nEvery contribution, big or small, is a blessing. Thank you!',
  },
  {
    name: "Today's Aarti Reminder",
    category: 'Reminder',
    body:
      '🔔 *Aarti Reminder* 🔔\n\n{{mandal_name}}\n\nAarti today at the mandap. Please join us on time with your family.\n\n📍 {{address}}\n\n_Ganpati Bappa Morya!_',
  },
  {
    name: 'Duty Reminder for Volunteer',
    category: 'Reminder',
    body:
      '🙏 Jai Shree Ganesh {{member_name}},\n\nYou have *{{slot}}* duty on {{date}} at {{mandal_name}}.\n\nPlease reach the mandap 15 minutes early.\nThank you for your seva! 🙏',
  },
  {
    name: 'Visarjan Announcement',
    category: 'Invite',
    body:
      '🙏 *Ganpati Visarjan* 🙏\n\n{{mandal_name}} Ganesh Visarjan Yatra on {{festival_end}}.\n\nPlease join the procession with your family and give Bappa a grand farewell.\n\n_Ganpati Bappa Morya, Pudhchya Varshi Lavkar Ya!_ 🎉',
  },
];

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
      'Administrator',
      'admin'
    );
  }

  const tplCount = db.prepare('SELECT COUNT(*) AS c FROM templates').get().c;
  if (tplCount === 0) {
    const ins = db.prepare('INSERT INTO templates (name, body, category) VALUES (?, ?, ?)');
    const tx = db.transaction((rows) => rows.forEach((t) => ins.run(t.name, t.body, t.category)));
    tx(DEFAULT_TEMPLATES);
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

seedFirstRun();

module.exports = { db, getSetting, setSetting, allSettings, DEFAULT_SETTINGS, seedFirstRun };
