#!/usr/bin/env node
'use strict';
/**
 * Deletes the local database file so the next start begins completely fresh.
 *
 *   npm run reset
 *
 * This only touches the file at DATA_DIR (./data locally). It will refuse to
 * run when NODE_ENV=production so it can never wipe a live deployment.
 */

const fs = require('fs');
const config = require('../src/lib/config');

if (process.env.NODE_ENV === 'production' && !process.argv.includes('--force')) {
  console.error('❌ Refusing to run with NODE_ENV=production.');
  console.error('   Pass --force if you really mean to delete the live database.');
  process.exit(1);
}

let removed = 0;
for (const suffix of ['', '-wal', '-shm']) {
  const file = config.dbFile + suffix;
  if (fs.existsSync(file)) {
    fs.unlinkSync(file);
    removed++;
  }
}

if (removed) {
  console.log(`✅ Deleted the database at ${config.dbFile}`);
  console.log('   The next `npm start` will create a fresh one.');
} else {
  console.log('ℹ  No database file found — nothing to delete.');
}
