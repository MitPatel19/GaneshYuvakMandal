#!/usr/bin/env node
'use strict';
/**
 * Fills the database with realistic sample data so you can see how the app
 * looks before entering your own information.
 *
 *   npm run seed
 *
 * Safe to run more than once — it skips tables that already have data.
 * Use `npm run reset` to clear everything and start again.
 */

const { db, getSetting, setSetting } = require('../src/lib/db');
const h = require('../src/lib/helpers');

const MEMBERS = [
  ['Rajesh Patel', '9876543210', 'President', 'Krishna Nagar, Block A'],
  ['Sunita Joshi', '9876543211', 'Vice President', 'Krishna Nagar, Block B'],
  ['Mahesh Desai', '9876543212', 'Secretary', 'Shivaji Road'],
  ['Priya Shah', '9876543213', 'Treasurer', 'Gandhi Chowk'],
  ['Amit Kulkarni', '9876543214', 'Joint Secretary', 'Krishna Nagar, Block C'],
  ['Nilesh Bhatt', '9876543215', 'Committee Member', 'Market Lane'],
  ['Kavita Mehta', '9876543216', 'Committee Member', 'Temple Street'],
  ['Suresh Rane', '9876543217', 'Volunteer', 'Krishna Nagar, Block A'],
  ['Deepak Sharma', '9876543218', 'Volunteer', 'Station Road'],
  ['Anita Pawar', '9876543219', 'Member', 'Gandhi Chowk'],
];

const DONORS = [
  ['Ramesh Trading Co.', '9820011001', 11001, 'UPI', 'Sponsorship'],
  ['Shri Vitthal Kirana Store', '9820011002', 5100, 'Cash', 'Vargani'],
  ['Dr. Anil Kulkarni', '9820011003', 2100, 'UPI', 'Donation'],
  ['Sushila Ben Patel', '9820011004', 1001, 'Cash', 'Vargani'],
  ['Jayesh Furniture', '9820011005', 5100, 'Bank Transfer', 'Sponsorship'],
  ['Nitin Auto Garage', '9820011006', 501, 'Cash', 'Vargani'],
  ['Meena Tailors', '9820011007', 501, 'UPI', 'Vargani'],
  ['Krishna Medical', '9820011008', 2100, 'UPI', 'Donation'],
  ['Hiten Shah', '9820011009', 1001, 'Cash', 'Vargani'],
  ['Gokul Dairy', '9820011010', 251, 'Cash', 'Vargani'],
  ['Vasant Rao Deshmukh', '9820011011', 1100, 'UPI', 'Prasad'],
  ['Sneha Beauty Parlour', '9820011012', 501, 'Cash', 'Vargani'],
];

const EXPENSES = [
  ['Ganpati Murti (4 feet, eco-friendly)', 'Murti (Idol)', 8500, 'Shree Kala Murti Bhandar'],
  ['Mandap and tent on rent', 'Mandap / Tent', 6000, 'Jai Bhavani Mandap Decorators'],
  ['Flower decoration - all 11 days', 'Decoration', 4200, 'Ganesh Florist'],
  ['LED lights and serial set', 'Decoration', 3100, 'Krishna Electricals'],
  ['Sound system rental', 'Sound & Light', 3500, 'Balaji Sound Service'],
  ['Modak and prasad', 'Prasad / Bhojan', 2800, 'Sweet Home'],
  ['Pooja saman - full set', 'Pooja Saman', 1650, 'Om Pooja Bhandar'],
  ['Invitation banner printing', 'Printing', 900, 'Sai Digital Prints'],
  ['Dhol tasha pathak - Visarjan', 'Visarjan', 5000, 'Shivgarjana Dhol Pathak'],
  ['Truck for Visarjan yatra', 'Transport', 2500, 'Patil Transport'],
];

function seed() {
  const already =
    db.prepare('SELECT COUNT(*) AS c FROM members').get().c +
    db.prepare('SELECT COUNT(*) AS c FROM donations').get().c;
  if (already > 0) {
    console.log('⚠  Database already has members or donations — nothing was added.');
    console.log('   Run `npm run reset` first if you want a clean demo.');
    return;
  }

  if (getSetting('mandal_name') === 'Ganesh Yuvak Mandal') {
    setSetting('mandal_name', 'Shree Ganesh Yuvak Mandal');
    setSetting('address', 'Krishna Nagar, Near Hanuman Temple, Surat');
    setSetting('president_name', 'Rajesh Patel');
    setSetting('president_phone', '9876543210');
    setSetting('secretary_name', 'Mahesh Desai');
    setSetting('secretary_phone', '9876543212');
    setSetting('treasurer_name', 'Priya Shah');
    setSetting('treasurer_phone', '9876543213');
    setSetting('upi_id', 'ganeshmandal@okaxis');
    setSetting('upi_name', 'Shree Ganesh Yuvak Mandal');
  }

  const start = getSetting('festival_start');
  const end = getSetting('festival_end');
  const days = h.dateRange(start, end);
  const firstDay = days[0] || h.todayISO();
  const lastDay = days[days.length - 1] || h.todayISO();

  const insMember = db.prepare(
    'INSERT INTO members (name, phone, role, address) VALUES (?, ?, ?, ?)'
  );
  const insDonation = db.prepare(
    `INSERT INTO donations (receipt_no, donor_name, phone, amount, mode, purpose, received_by, donated_on)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insExpense = db.prepare(
    'INSERT INTO expenses (title, category, amount, vendor, paid_by, spent_on) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const insEvent = db.prepare(
    `INSERT INTO events (title, description, category, event_date, start_time, end_time, place, incharge, is_public)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`
  );
  const insDuty = db.prepare(
    'INSERT INTO duties (duty_date, slot, member_name, phone) VALUES (?, ?, ?, ?)'
  );
  const insAnn = db.prepare('INSERT INTO announcements (title, body, pinned) VALUES (?, ?, ?)');
  const insSeva = db.prepare(
    'INSERT INTO sevas (type_id, seva_date, donor_name, phone, amount) VALUES (?, ?, ?, ?, ?)'
  );

  const year = getSetting('year');
  const place = getSetting('address');

  db.transaction(() => {
    MEMBERS.forEach((m) => insMember.run(...m));

    DONORS.forEach((d, i) => {
      insDonation.run(
        `GM-${year}-${String(i + 1).padStart(4, '0')}`,
        d[0], d[1], d[2], d[3], d[4],
        'Priya Shah',
        h.addDays(firstDay, Math.min(i % 6, days.length - 1))
      );
    });

    EXPENSES.forEach((e, i) => {
      insExpense.run(e[0], e[1], e[2], e[3], 'Priya Shah', h.addDays(firstDay, i % 5));
    });

    days.forEach((date, idx) => {
      if (idx === 0) {
        insEvent.run('Ganpati Sthapana & Pran Pratishtha', 'Murti sthapana and first mahapooja',
          'Sthapana', date, '09:00', '11:00', place, 'Rajesh Patel');
      }
      insEvent.run('Morning Aarti', '', 'Aarti', date, '08:00', '08:30', place, 'Mahesh Desai');
      insEvent.run('Evening Aarti', '', 'Aarti', date, '19:30', '20:15', place, 'Amit Kulkarni');
      if (idx === 2) {
        insEvent.run('Bhajan Sandhya', 'Bhajan by local artists', 'Bhajan / Kirtan',
          date, '21:00', '23:00', place, 'Kavita Mehta');
      }
      if (idx === 4) {
        insEvent.run('Children Drawing Competition', 'Open for all children up to 14 years',
          'Competition', date, '16:00', '18:00', place, 'Sunita Joshi');
      }
      if (idx === 6) {
        insEvent.run('Cultural Program', 'Dance and singing by mandal members',
          'Cultural Program', date, '20:30', '23:00', place, 'Kavita Mehta');
      }
      if (idx === days.length - 1) {
        insEvent.run('Maha Prasad', 'Community bhojan for all devotees', 'Mahaprasad',
          date, '12:00', '15:00', place, 'Nilesh Bhatt');
        insEvent.run('Visarjan Yatra', 'Farewell procession with dhol tasha', 'Visarjan',
          date, '16:00', '20:00', place, 'Rajesh Patel');
      }
    });

    days.slice(0, 4).forEach((date, i) => {
      insDuty.run(date, 'Morning Aarti', MEMBERS[i % MEMBERS.length][0], MEMBERS[i % MEMBERS.length][1]);
      insDuty.run(date, 'Evening Aarti', MEMBERS[(i + 3) % MEMBERS.length][0], MEMBERS[(i + 3) % MEMBERS.length][1]);
      insDuty.run(date, 'Prasad Distribution', MEMBERS[(i + 5) % MEMBERS.length][0], MEMBERS[(i + 5) % MEMBERS.length][1]);
    });

    // A few seva sponsors so the Seva screens are not empty on a demo install
    const sevaTypes = db.prepare('SELECT * FROM seva_types ORDER BY sort_order, id').all();
    const dailyTypes = sevaTypes.filter((t) => t.is_daily);
    const onceTypes = sevaTypes.filter((t) => !t.is_daily);
    const sponsors = [
      ['Ramesh Trading Co.', '9820011001'],
      ['Shri Vitthal Kirana Store', '9820011002'],
      ['Dr. Anil Kulkarni', '9820011003'],
      ['Sushila Ben Patel', '9820011004'],
      ['Jayesh Furniture', '9820011005'],
      ['Krishna Medical', '9820011008'],
      ['Gokul Dairy', '9820011010'],
      ['Meena Tailors', '9820011007'],
    ];
    let n = 0;
    // Fill the first three days of daily seva, leaving later days open on purpose
    days.slice(0, 3).forEach((date) => {
      dailyTypes.forEach((type, i) => {
        if ((i + n) % 3 === 2) return; // leave some slots needing a sponsor
        const sp = sponsors[n % sponsors.length];
        insSeva.run(type.id, date, sp[0], sp[1], [1100, 2100, 5100, 751][n % 4]);
        n += 1;
      });
    });
    onceTypes.forEach((type, i) => {
      if (i % 3 === 2) return;
      const sp = sponsors[(n + i) % sponsors.length];
      insSeva.run(type.id, '', sp[0], sp[1], [11000, 21000, 5100][i % 3]);
    });

    insAnn.run(
      'Maha Prasad on the last day',
      `Maha Prasad will be served on ${h.formatDate(lastDay)} from 12:00 PM. All families are requested to join.`,
      1
    );
    insAnn.run(
      'Vargani collection',
      'Volunteers will visit every home this week for vargani. Please cooperate. You can also pay by UPI.',
      0
    );
  })();

  console.log('✅ Demo data added:');
  console.log(`   ${MEMBERS.length} members, ${DONORS.length} donations, ${EXPENSES.length} expenses`);
  console.log(`   programs and duties for ${days.length} days, 2 announcements`);
  console.log(`   ${db.prepare('SELECT COUNT(*) AS c FROM sevas').get().c} seva sponsors across ${
    db.prepare('SELECT COUNT(*) AS c FROM seva_types').get().c} seva types`);
  console.log('\n   Start the app with `npm start` and log in.');
}

seed();
