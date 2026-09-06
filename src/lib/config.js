'use strict';
require('dotenv').config();
const path = require('path');
const fs = require('fs');

const PROJECT_ROOT = path.join(__dirname, '..', '..');

// On Railway attach a Volume and set DATA_DIR to its mount path (e.g. /data)
// so that the database and uploaded photos survive every redeploy.
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(PROJECT_ROOT, 'data');

const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');

for (const dir of [DATA_DIR, UPLOAD_DIR]) {
  fs.mkdirSync(dir, { recursive: true });
}

const config = {
  projectRoot: PROJECT_ROOT,
  dataDir: DATA_DIR,
  uploadDir: UPLOAD_DIR,
  dbFile: path.join(DATA_DIR, 'mandal.sqlite'),
  port: Number(process.env.PORT) || 3000,
  env: process.env.NODE_ENV || 'development',
  sessionSecret: process.env.SESSION_SECRET || 'ganpati-bappa-morya-change-me',
  admin: {
    username: (process.env.ADMIN_USERNAME || 'admin').trim(),
    password: process.env.ADMIN_PASSWORD || 'ganpati123',
  },
  usingDefaultSecret: !process.env.SESSION_SECRET,
  usingDefaultPassword: !process.env.ADMIN_PASSWORD,
  persistentStorage: Boolean(process.env.DATA_DIR),
  maxUploadBytes: Number(process.env.MAX_UPLOAD_MB || 6) * 1024 * 1024,
};

module.exports = config;
