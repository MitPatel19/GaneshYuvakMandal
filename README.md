# 🕉 Ganpati Mahotsav Manager

A complete, ready-to-deploy web app for running a **Ganesh Chaturthi mandal** —
donations, expenses, daily program, aarti duty, members, photos and accounts,
all in one place, with **one-tap WhatsApp sharing** built into every screen.

Designed to be genuinely easy for someone who is not comfortable with
technology: large text, big buttons, four languages, and a text-size control
in the header.

> **Deploying it?** Follow **[DEPLOY-RAILWAY.md](DEPLOY-RAILWAY.md)** — a
> 10-minute, step-by-step guide.

---

## What it does

### 💬 WhatsApp is the point
Nothing here needs the WhatsApp Business API, a paid gateway, or approval from
Meta. It uses standard `wa.me` links, so it works from any phone or laptop:

- **Broadcast** — write one message and send it to all members, the committee
  only, all donors, or today's duty volunteers. Each name is one tap; the
  message is already typed, you just press send. Names turn green ✅ as you go
  so you never lose your place in a long list.
- **`{{name}}` personalisation** — each person gets a message addressed to them.
- **Message templates** — invitation, donation request, thank-you receipt,
  aarti reminder, duty reminder, visarjan announcement. Your mandal name,
  dates, address and UPI ID are filled in automatically. Add your own too.
- **Share anything, anywhere** — the full program, one day's program, a
  donation receipt, an announcement, the duty roster, the accounts summary,
  an aarti's lyrics, or the link to your public page.

### 💰 Donations (Vargani / Chanda)
Record a donation in seconds with quick-amount chips (₹101 / ₹251 / ₹501 …).
Receipt numbers are generated automatically (`GM-2026-0001`). Every donation
gets a **printable receipt** with the amount in words and your UPI QR code —
and a **Send Receipt** button that opens WhatsApp with a thank-you already
written.

### 🧾 Expenses & accounts
Categorised expenses (Murti, Mandap, Decoration, Sound, Prasad, Visarjan …)
with vendor and who paid. The **Reports** page shows collected vs spent vs
balance in hand, breakdowns by payment mode, purpose and category, day-wise
collection, and top donors — plus a **printable hisab sheet** with signature
lines for the treasurer, secretary and president.

### 📅 Program & duties
A day-by-day schedule for the whole Mahotsav. Press **✨ Create starter
program** and it fills in Sthapana, morning and evening aarti for every day,
Maha Prasad and Visarjan — then edit what you like. Assign aarti and volunteer
duty per day per slot, remind each person on WhatsApp, or send the whole day's
roster to your group. Copy one day's roster onto another day in one click.

### 🌐 Public page
A separate, no-login page at `/p` built to be shared on WhatsApp: countdown,
program, darshan timings, location, photo gallery, UPI donation QR, aarti
lyrics, committee contacts and a donor thank-you board. You control what
appears — donor names and the collected total are both optional.

### 📖 Aarti book
Sukhkarta Dukhharta, Jai Ganesh Deva, Ganpati Atharvashirsha and Shendur Laal
Chadhayo are included, with a big **A− / A+** control so people can actually
read the lyrics while singing. Add your own aartis too.

### 👥 Members · 📸 Gallery · 📢 Announcements
Committee directory with WhatsApp and call buttons, a photo gallery that also
feeds the public page, and pinned announcements that show on the home screen.

### 🔐 Practical things
Multiple logins (give the treasurer their own), password change, CSV exports,
a full JSON backup, and a **Start a new season** button that clears the year's
records while keeping members, photos, templates and settings.

---

## Built for readability

| | |
|---|---|
| **Large default text** | 17px base with an **A− / A+** control saved per device |
| **Big tap targets** | Every button is at least 50px tall |
| **Four languages** | English · ગુજરાતી · हिंदी · मराठी, switchable from the header |
| **Works one-handed** | Bottom navigation on phones, sidebar on desktop |
| **Installable** | Add to Home Screen on Android and iPhone; opens like an app |
| **Prints properly** | Receipts and the accounts sheet have real print stylesheets |
| **No layout surprises** | Tested down to 360px wide with no horizontal scrolling |

---

## Running it on your own computer

```bash
npm install
npm run seed      # optional — fills in realistic sample data
npm start
```

Open <http://localhost:3000> and log in with `admin` / `ganpati123`.

Useful commands:

```bash
npm run dev     # auto-restart while editing
npm run seed    # add demo members, donations, expenses, program, duties
npm run reset   # delete the local database and start clean
```

---

## Configuration

Copy `.env.example` to `.env`. Every value has a sensible default, so nothing
is required locally.

| Variable | What it does | Default |
|---|---|---|
| `DATA_DIR` | Folder for the database and uploaded photos. **Must point at a persistent volume in production.** | `./data` |
| `ADMIN_USERNAME` | Username of the first admin, created on first start | `admin` |
| `ADMIN_PASSWORD` | Password of the first admin | `ganpati123` |
| `SESSION_SECRET` | Signs the login cookie — use a long random string | insecure default |
| `NODE_ENV` | Set to `production` on a live server (enables secure cookies) | `development` |
| `MAX_UPLOAD_MB` | Largest photo that can be uploaded | `6` |
| `PORT` | Port to listen on — set automatically by Railway | `3000` |

The app prints a warning at startup if `DATA_DIR`, `ADMIN_PASSWORD` or
`SESSION_SECRET` are left at their defaults.

---

## How it is built

Deliberately boring and dependency-light, so it keeps working for years with
no maintenance:

- **Node.js + Express** with **EJS** server-rendered pages — every page works
  without JavaScript; the client script only adds conveniences.
- **SQLite** via `better-sqlite3` — one file, no database server to pay for or
  administer. Backed up by downloading one JSON file.
- **No CSS or JS framework.** One hand-written stylesheet, one small script.
- **No build step.** What is in the repository is what runs.

Security: signed httpOnly session cookies, bcrypt password hashing, CSRF
tokens on every form, login rate limiting, upload type and size limits, and
CSV export escaping against spreadsheet formula injection.

```
src/
  server.js            Express app, middleware, CSRF, view locals
  lib/
    config.js          Environment and paths
    db.js              SQLite connection, schema, first-run seeding
    schema.sql         Table definitions
    auth.js            Login, password hashing, rate limiting
    helpers.js         Dates, money, phone/WhatsApp links, templates, CSV
    i18n.js            English / Gujarati / Hindi / Marathi dictionary
  routes/              One file per section of the app
views/
  partials/            Shared header and footer
  pages/               One template per screen
public/
  css/style.css        The whole design system
  js/app.js            Progressive enhancement only
scripts/
  seed-demo.js         Sample data
  reset-db.js          Wipe the local database
```

---

## A note on the festival dates

The app ships with **14 September 2026** (Ganesh Chaturthi) and
**24 September 2026** (Anant Chaturdashi / Visarjan) as defaults. Please
confirm both against your own panchang and set them under **Settings** — the
countdown, the program days and the duty calendar are all derived from them.

---

🙏 **Ganpati Bappa Morya · Mangal Murti Morya** 🙏
