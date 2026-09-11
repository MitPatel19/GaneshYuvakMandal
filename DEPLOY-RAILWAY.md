# Deploying to Railway — step by step

This guide takes you from this repository to a live web address you can
share on WhatsApp. It assumes you have never deployed anything before.

**Total time: about 10 minutes. Cost: Railway's Hobby plan, currently $5/month
of usage credit — this app is small and normally sits well inside it.**

---

## What you need before you start

1. A **GitHub account** with this repository pushed to it.
2. A **Railway account** — sign up free at <https://railway.app> (you can
   sign in with GitHub, which makes step 1 below easier).

---

## Step 1 — Create the project

1. Go to <https://railway.app/new>.
2. Click **Deploy from GitHub repo**.
3. Choose the repository `GaneshYuvakMandal`.
   - If you don't see it, click **Configure GitHub App** and give Railway
     permission to read that repository.
4. Railway starts building immediately. **Let it run** — we still have to add
   the settings below, so the first build may finish and then restart. That is
   normal.

Railway detects Node.js automatically and uses `nixpacks.toml` +
`railway.json` from this repository, so there is nothing to configure in the
build settings.

---

## Step 2 — Add a Volume (IMPORTANT — do not skip)

The app stores everything (donations, members, program, photos) in a small
SQLite database file. Without a Volume, that file lives inside the container
and **is erased every time you redeploy**. A Volume is permanent disk.

1. Open your service, go to the **Variables / Settings** area and find
   **Volumes** (or right-click the service canvas → **Attach Volume**).
2. Click **Add Volume**.
3. Set the **Mount path** to:

   ```
   /data
   ```

4. Save. A 1 GB volume is plenty — a full season of records plus a few
   hundred photos uses far less.

---

## Step 3 — Add the environment variables

Open your service → **Variables** → **Raw Editor**, and paste this in:

```
DATA_DIR=/data
NODE_ENV=production
ADMIN_USERNAME=admin
ADMIN_PASSWORD=PutAStrongPasswordHere
SESSION_SECRET=paste-a-long-random-string-here
MAX_UPLOAD_MB=6
```

Then change two of them:

- **`ADMIN_PASSWORD`** — the password you will use to log in. Pick something
  only your committee knows. You can change it later inside the app under
  *Settings → Change Password*.
- **`SESSION_SECRET`** — any long random string. It keeps login cookies
  secure. Generate one by running this on your computer:

  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

  Or simply mash your keyboard for 50+ characters. Nobody has to remember it.

> ⚠️ **Do not set `PORT`.** Railway sets it automatically and the app reads it.

Click **Deploy** / **Redeploy** to apply.

---

## Step 4 — Turn on the public web address

1. Service → **Settings** → **Networking** → **Generate Domain**.
2. Railway gives you a URL like
   `ganeshyuvakmandal-production.up.railway.app`.
3. Open it. You should see the public Mahotsav page. 🎉

Your two important links:

| Link | Who it is for |
|---|---|
| `https://your-app.up.railway.app/p` | **The public page** — send this to everyone on WhatsApp |
| `https://your-app.up.railway.app/login` | **Committee login** — only for your mandal members |

---

## Step 5 — First login and setup

1. Open `/login` and sign in with the `ADMIN_USERNAME` and `ADMIN_PASSWORD`
   you set in Step 3.
2. Go to **⚙️ Settings** and fill in:
   - Mandal name, address, Google Maps link
   - **Sthapana and Visarjan dates** (confirm these against your panchang —
     the countdown, the program days and the duty calendar all follow them)
   - President / Secretary / Treasurer names and phone numbers
   - **UPI ID** — a payment QR code is generated from it automatically and
     appears on receipts and the public page
   - WhatsApp group invite link
3. Go to **📅 Schedule** and press **✨ Create starter program**. That fills
   in Sthapana, morning and evening aarti for every day, Maha Prasad and
   Visarjan. Edit or delete anything you don't need.
4. Go to **👥 Members** and add your committee.
5. Go to **🍛 Seva** and check the sponsorship list under *Seva List* — morning
   tea, prasad, thal, nasto, jamanvar, murti, water, gulal and shobhayatra
   prasad are already there. Rename or add whatever your mandal uses, then start
   filling in sponsors day by day.
6. Go to **🔳 QR Code**, print the poster and paste it at the mandap so visitors
   can scan for the program.
7. Go to **💬 WhatsApp**, choose the *Invitation* template and start sending.

> 💬 **Message language.** Templates are supplied in English, Gujarati, Hindi
> and Marathi, and follow whichever language you pick with the 🌐 button. If you
> would rather always send in one language no matter what language you read the
> app in, turn off *Settings → Message language → Match message language to the
> 🌐 language button*; messages then always use your Default Language.

---

## Step 6 — Add it to everyone's phone

The app is installable, so it opens full screen like a normal app.

- **Android (Chrome):** open the link → menu (⋮) → *Add to Home screen*.
- **iPhone (Safari):** open the link → Share button → *Add to Home Screen*.

---

## Everyday running costs

Railway bills for how long the container runs plus a little for the volume.
A small app like this typically stays inside the Hobby plan's included
credit. Two ways to keep it low:

- Leave it as is — this is the simplest and it will be ready whenever
  someone opens the link.
- In the off-season, open the service and **Remove** the deployment. The
  Volume (and all your data) stays. Redeploy next year from the same repo.

---

## Backing up your data

Do this at the end of every Mahotsav — it takes 10 seconds:

1. Log in → **📊 Reports**
2. Click **💾 Full backup (JSON)** and keep the downloaded file safely
   (email it to yourself, or put it in Google Drive).
3. Also download the **Donations CSV** and **Expenses CSV** if you want to
   open the accounts in Excel.

---

## Starting the next year's Mahotsav

1. Take a backup (above).
2. **Settings → Start a new season** → type `RESET`.

This clears donations, expenses, programs, duties and announcements, and
**keeps** your members, photos, aartis, message templates and settings.
Then update the year and the new Sthapana/Visarjan dates in Settings.

---

## Troubleshooting

**Build fails**
Open the **Deploy Logs** tab. Almost always it is a network hiccup — press
**Redeploy**. Check that `package.json` and `package-lock.json` are both
committed to GitHub.

**"Application failed to respond"**
The app didn't start. Check the **Deploy Logs**. Make sure you did *not* set a
`PORT` variable yourself.

**All my data disappeared after a redeploy**
The Volume is missing or `DATA_DIR` doesn't match the mount path. Go back to
Step 2 and Step 3 — the mount path and `DATA_DIR` must both be `/data`.
Restore from your JSON backup afterwards.

**I forgot the admin password**
Change `ADMIN_PASSWORD` in Variables — but note this only creates the *first*
user. If the user already exists, the simplest fix is to add a new login: you
can't reach Settings without logging in, so instead open the Railway shell for
the service and run:

```bash
node -e "
const bcrypt = require('bcryptjs');
const { db } = require('./src/lib/db');
db.prepare('UPDATE users SET password_hash = ? WHERE username = ?')
  .run(bcrypt.hashSync('YourNewPassword', 10), 'admin');
console.log('Password reset for admin');
"
```

**My templates are in the wrong language**
Check *Settings → Message language*. When the match toggle is on, templates
follow the 🌐 button in the header. When it is off, they follow *Default
Language* in the same Settings page. You can also edit the wording of any
language yourself: **WhatsApp → Templates → Show all languages**.

**WhatsApp opens but the message is empty**
Some older WhatsApp versions struggle with very long messages. Shorten the
message, or use the **📋 Copy** button and paste it into WhatsApp yourself.

**The countdown shows the wrong number of days**
Check the Sthapana and Visarjan dates in Settings. Dates are evaluated in
Indian Standard Time.

---

## Deploying somewhere else

Nothing here is Railway-specific. The app is a plain Node.js server that needs
a writable folder. It runs the same way on Render, Fly.io, a VPS, or a
Raspberry Pi on your mandap's WiFi:

```bash
npm ci --omit=dev
DATA_DIR=/some/persistent/folder \
SESSION_SECRET=... \
ADMIN_PASSWORD=... \
NODE_ENV=production \
node src/server.js
```
