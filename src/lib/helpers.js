'use strict';

/* ------------------------------------------------------------------ */
/*  Dates                                                              */
/* ------------------------------------------------------------------ */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Today's date in the mandal's local time, as YYYY-MM-DD. */
function todayISO(tz = process.env.TZ_OFFSET_MINUTES) {
  const offset = Number(tz);
  const now = new Date();
  if (!Number.isNaN(offset) && tz !== undefined && tz !== '') {
    const shifted = new Date(now.getTime() + offset * 60000);
    return shifted.toISOString().slice(0, 10);
  }
  // Default to IST (UTC+5:30) which is where these mandals actually are.
  const ist = new Date(now.getTime() + 330 * 60000);
  return ist.toISOString().slice(0, 10);
}

function parseISO(value) {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
  if (!m) return null;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

/** "14 Sep 2026" */
function formatDate(value) {
  const d = parseISO(value);
  if (!d) return value || '';
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** "Monday, 14 Sep 2026" */
function formatDateLong(value) {
  const d = parseISO(value);
  if (!d) return value || '';
  return `${WEEKDAYS[d.getUTCDay()]}, ${formatDate(value)}`;
}

function weekday(value) {
  const d = parseISO(value);
  return d ? WEEKDAYS[d.getUTCDay()] : '';
}

/** Whole days from `from` to `to` (negative when `to` is in the past). */
function daysBetween(from, to) {
  const a = parseISO(from);
  const b = parseISO(to);
  if (!a || !b) return null;
  return Math.round((b - a) / 86400000);
}

function addDays(value, n) {
  const d = parseISO(value);
  if (!d) return value;
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Every date from start..end inclusive, capped so a typo can't hang the page. */
function dateRange(start, end, cap = 60) {
  const out = [];
  const a = parseISO(start);
  const b = parseISO(end);
  if (!a || !b || b < a) return out;
  let cur = a;
  while (cur <= b && out.length < cap) {
    out.push(cur.toISOString().slice(0, 10));
    cur = new Date(cur.getTime() + 86400000);
  }
  return out;
}

/** "07:30" -> "7:30 AM" */
function formatTime(value) {
  if (!value) return '';
  const m = /^(\d{1,2}):(\d{2})/.exec(String(value));
  if (!m) return value;
  let h = Number(m[1]);
  const min = m[2];
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${min} ${ampm}`;
}

function timeRange(start, end) {
  if (!start && !end) return '';
  if (start && end) return `${formatTime(start)} - ${formatTime(end)}`;
  return formatTime(start || end);
}

/* ------------------------------------------------------------------ */
/*  Money                                                              */
/* ------------------------------------------------------------------ */

/** Indian digit grouping: 1234567 -> "12,34,567" */
function groupIndian(intPart) {
  const s = String(intPart);
  if (s.length <= 3) return s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3);
  return rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3;
}

function formatMoney(amount, currency = '₹') {
  const n = Number(amount) || 0;
  const neg = n < 0;
  const abs = Math.abs(n);
  const rounded = Math.round(abs * 100) / 100;
  const intPart = Math.floor(rounded);
  const decPart = Math.round((rounded - intPart) * 100);
  let out = groupIndian(intPart);
  if (decPart > 0) out += '.' + String(decPart).padStart(2, '0');
  return `${neg ? '-' : ''}${currency}${out}`;
}

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigits(n) {
  if (n < 20) return ONES[n];
  const t = TENS[Math.floor(n / 10)];
  const o = ONES[n % 10];
  return o ? `${t} ${o}` : t;
}

/** Amount in words, Indian system - used on printed receipts. */
function amountInWords(amount) {
  let n = Math.floor(Math.abs(Number(amount) || 0));
  if (n === 0) return 'Zero Rupees Only';
  const parts = [];
  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  const hundred = Math.floor(n / 100);
  const rest = n % 100;
  if (crore) parts.push(`${twoDigits(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (hundred) parts.push(`${ONES[hundred]} Hundred`);
  if (rest) parts.push(twoDigits(rest));
  return parts.join(' ') + ' Rupees Only';
}

/* ------------------------------------------------------------------ */
/*  Phone + WhatsApp                                                   */
/* ------------------------------------------------------------------ */

/**
 * Normalise an Indian-style phone number into the digits-only form that
 * wa.me expects (country code, no plus, no spaces).
 * Returns '' when there is nothing usable.
 */
function normalisePhone(raw, countryCode = '91') {
  if (!raw) return '';
  let digits = String(raw).replace(/[^\d]/g, '');
  if (!digits) return '';
  // Strip common trunk prefixes: 00<cc>, 0<local>
  if (digits.startsWith('00')) digits = digits.slice(2);
  const cc = String(countryCode || '91').replace(/[^\d]/g, '') || '91';
  if (digits.length === 10) return cc + digits;
  if (digits.length === 11 && digits.startsWith('0')) return cc + digits.slice(1);
  if (digits.startsWith(cc) && digits.length >= 10 + cc.length) return digits;
  if (digits.length > 10) return digits;
  return '';
}

/** wa.me deep link. Works on phone and on WhatsApp Web, no API key needed. */
function whatsappLink(phone, message, countryCode = '91') {
  const text = encodeURIComponent(message == null ? '' : String(message));
  const num = normalisePhone(phone, countryCode);
  if (!num) return `https://wa.me/?text=${text}`;
  return `https://wa.me/${num}?text=${text}`;
}

/** Share sheet link with no fixed recipient - user picks the group/contact. */
function whatsappShareLink(message) {
  return `https://wa.me/?text=${encodeURIComponent(message == null ? '' : String(message))}`;
}

function telLink(phone) {
  const digits = String(phone || '').replace(/[^\d+]/g, '');
  return digits ? `tel:${digits}` : '';
}

/* ------------------------------------------------------------------ */
/*  Message templates                                                  */
/* ------------------------------------------------------------------ */

/**
 * Replace {{placeholder}} tokens. Unknown tokens are removed rather than
 * left visible, so a half-filled message never goes out looking broken.
 */
function renderTemplate(body, vars = {}) {
  if (!body) return '';
  return String(body)
    .replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
      const v = vars[key];
      return v === undefined || v === null ? '' : String(v);
    })
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

/** Variables every template can rely on. */
function baseTemplateVars(settings) {
  return {
    mandal_name: settings.mandal_name || '',
    tagline: settings.tagline || '',
    year: settings.year || '',
    address: settings.address || '',
    about: settings.about || '',
    festival_start: formatDate(settings.festival_start),
    festival_end: formatDate(settings.festival_end),
    upi_id: settings.upi_id || '',
    upi_name: settings.upi_name || '',
    president_name: settings.president_name || '',
    president_phone: settings.president_phone || '',
    secretary_name: settings.secretary_name || '',
    secretary_phone: settings.secretary_phone || '',
    treasurer_name: settings.treasurer_name || '',
    treasurer_phone: settings.treasurer_phone || '',
    currency: settings.currency || '₹',
    date: formatDate(todayISO()),
    maps: settings.google_maps_link || '',
  };
}

/**
 * Which language the WhatsApp templates should be shown in.
 * When "follow the language button" is on, templates track whatever language
 * the admin is currently reading the app in. When it is off they stay on the
 * mandal's default language, so switching the UI never changes what goes out.
 */
function templateLanguage(settings, uiLang) {
  const follow = String(settings.template_follow_ui_language || '1') === '1';
  const chosen = follow ? uiLang : settings.language;
  return chosen || settings.language || 'en';
}

/* ------------------------------------------------------------------ */
/*  UPI                                                                */
/* ------------------------------------------------------------------ */

function upiLink({ upiId, name, amount, note }) {
  if (!upiId) return '';
  const params = new URLSearchParams();
  params.set('pa', upiId);
  if (name) params.set('pn', name);
  if (amount && Number(amount) > 0) params.set('am', String(Number(amount).toFixed(2)));
  params.set('cu', 'INR');
  if (note) params.set('tn', note);
  return `upi://pay?${params.toString()}`;
}

/* ------------------------------------------------------------------ */
/*  Misc                                                               */
/* ------------------------------------------------------------------ */

function csvEscape(value) {
  const s = value == null ? '' : String(value);
  // Guard against spreadsheet formula injection from user-entered names.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

function toCSV(headers, rows) {
  const lines = [headers.map(csvEscape).join(',')];
  for (const row of rows) lines.push(row.map(csvEscape).join(','));
  return '﻿' + lines.join('\r\n');
}

function initials(name) {
  return String(name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

function truncate(text, max = 120) {
  const s = String(text || '');
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

module.exports = {
  MONTHS,
  WEEKDAYS,
  todayISO,
  parseISO,
  formatDate,
  formatDateLong,
  weekday,
  daysBetween,
  addDays,
  dateRange,
  formatTime,
  timeRange,
  formatMoney,
  amountInWords,
  normalisePhone,
  whatsappLink,
  whatsappShareLink,
  telLink,
  renderTemplate,
  baseTemplateVars,
  templateLanguage,
  upiLink,
  toCSV,
  csvEscape,
  initials,
  truncate,
};
