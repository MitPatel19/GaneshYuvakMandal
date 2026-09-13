-- ============================================================
--  Ganpati Mahotsav Manager - database schema (SQLite)
-- ============================================================

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name  TEXT NOT NULL DEFAULT '',
  -- 'owner' = main admin (everything), 'helper' = login created by the owner
  role          TEXT NOT NULL DEFAULT 'helper',
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS members (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  phone      TEXT NOT NULL DEFAULT '',
  role       TEXT NOT NULL DEFAULT 'Member',
  address    TEXT NOT NULL DEFAULT '',
  note       TEXT NOT NULL DEFAULT '',
  is_active  INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_members_name ON members(name);

CREATE TABLE IF NOT EXISTS donations (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  receipt_no  TEXT NOT NULL DEFAULT '',
  donor_name  TEXT NOT NULL,
  phone       TEXT NOT NULL DEFAULT '',
  address     TEXT NOT NULL DEFAULT '',
  amount      REAL NOT NULL DEFAULT 0,
  mode        TEXT NOT NULL DEFAULT 'Cash',
  purpose     TEXT NOT NULL DEFAULT 'Vargani',
  received_by TEXT NOT NULL DEFAULT '',
  note        TEXT NOT NULL DEFAULT '',
  donated_on  TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_donations_date ON donations(donated_on);
CREATE INDEX IF NOT EXISTS idx_donations_name ON donations(donor_name);

CREATE TABLE IF NOT EXISTS expenses (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  title      TEXT NOT NULL,
  category   TEXT NOT NULL DEFAULT 'Other',
  amount     REAL NOT NULL DEFAULT 0,
  vendor     TEXT NOT NULL DEFAULT '',
  paid_by    TEXT NOT NULL DEFAULT '',
  note       TEXT NOT NULL DEFAULT '',
  spent_on   TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(spent_on);

CREATE TABLE IF NOT EXISTS events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category    TEXT NOT NULL DEFAULT 'Program',
  event_date  TEXT NOT NULL,
  start_time  TEXT NOT NULL DEFAULT '',
  end_time    TEXT NOT NULL DEFAULT '',
  place       TEXT NOT NULL DEFAULT '',
  incharge    TEXT NOT NULL DEFAULT '',
  is_public   INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);

CREATE TABLE IF NOT EXISTS duties (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  duty_date  TEXT NOT NULL,
  slot       TEXT NOT NULL DEFAULT 'Morning Aarti',
  title      TEXT NOT NULL DEFAULT '',
  member_id  INTEGER REFERENCES members(id) ON DELETE SET NULL,
  member_name TEXT NOT NULL DEFAULT '',
  phone      TEXT NOT NULL DEFAULT '',
  note       TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_duties_date ON duties(duty_date);

CREATE TABLE IF NOT EXISTS announcements (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL DEFAULT '',
  pinned     INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS templates (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  body        TEXT NOT NULL DEFAULT '',
  category    TEXT NOT NULL DEFAULT 'General',
  -- Language this wording is written in (en / gu / hi / mr).
  lang        TEXT NOT NULL DEFAULT 'en',
  -- Set for the templates that ship with the app, empty for ones the mandal
  -- writes itself. Lets the app find "the thank-you message" in any language.
  builtin_key TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
-- The unique index on (builtin_key, lang) is created in db.js migrate(), after
-- the columns are guaranteed to exist on databases made by an earlier version.

CREATE TABLE IF NOT EXISTS photos (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  filename   TEXT NOT NULL,
  caption    TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS aartis (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  title      TEXT NOT NULL,
  lyrics     TEXT NOT NULL DEFAULT '',
  language   TEXT NOT NULL DEFAULT 'Marathi',
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- ============================================================
--  Seva / sponsorship: who is giving prasad, thal, nasto ...
-- ============================================================

CREATE TABLE IF NOT EXISTS seva_types (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  -- Fallback label, and optional per-language wording. The app shows
  -- name_<lang> when it is filled in, otherwise `name`.
  name       TEXT NOT NULL,
  name_en    TEXT NOT NULL DEFAULT '',
  name_gu    TEXT NOT NULL DEFAULT '',
  name_hi    TEXT NOT NULL DEFAULT '',
  name_mr    TEXT NOT NULL DEFAULT '',
  icon       TEXT NOT NULL DEFAULT '🙏',
  -- 1 = someone sponsors it on each day of the Mahotsav
  -- 0 = sponsored once for the whole Mahotsav
  is_daily   INTEGER NOT NULL DEFAULT 1,
  suggested_amount REAL NOT NULL DEFAULT 0,
  is_active  INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sevas (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  type_id    INTEGER NOT NULL REFERENCES seva_types(id),
  -- Empty for a whole-Mahotsav seva, otherwise the day it covers.
  seva_date  TEXT NOT NULL DEFAULT '',
  donor_name TEXT NOT NULL,
  phone      TEXT NOT NULL DEFAULT '',
  address    TEXT NOT NULL DEFAULT '',
  amount     REAL NOT NULL DEFAULT 0,
  note       TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sevas_date ON sevas(seva_date);
CREATE INDEX IF NOT EXISTS idx_sevas_type ON sevas(type_id);
CREATE INDEX IF NOT EXISTS idx_sevas_donor ON sevas(donor_name);
