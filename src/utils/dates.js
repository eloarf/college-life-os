/**
 * Date utilities for College Life OS.
 *
 * Core idea: a calendar day is a plain string like "2026-10-03" (a "date key").
 * It has no clock time and no timezone, so midnight and timezone bugs
 * cannot happen. All day math runs through UTC internally, so daylight
 * saving changes can never shift a day.
 *
 * Years must be 1000-9999 (this avoids a JavaScript quirk with tiny years).
 */

export const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const MS_PER_DAY = 86400000;
const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MAX_RANGE_DAYS = 3700; // about 10 years: protects against runaway loops

function pad(number, length) {
  return String(number).padStart(length, '0');
}

export function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** month is 1-12 */
export function daysInMonth(year, month) {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

/** True only for real calendar days in the exact form YYYY-MM-DD. */
export function isValidDateKey(value) {
  if (typeof value !== 'string') return false;
  const match = DATE_KEY_PATTERN.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1000) return false;
  if (month < 1 || month > 12) return false;
  return day >= 1 && day <= daysInMonth(year, month);
}

function assertValidDateKey(key) {
  if (!isValidDateKey(key)) {
    throw new Error('Invalid date key: ' + String(key));
  }
}

/** Builds a date key from numbers. month is 1-12. */
export function makeDateKey(year, month, day) {
  const key = pad(year, 4) + '-' + pad(month, 2) + '-' + pad(day, 2);
  assertValidDateKey(key);
  return key;
}

/** "2026-10-03" -> { year: 2026, month: 10, day: 3 } */
export function parseDateKey(key) {
  assertValidDateKey(key);
  const parts = key.split('-').map(Number);
  return { year: parts[0], month: parts[1], day: parts[2] };
}

/** Converts a JavaScript Date to the LOCAL calendar day on this device. */
export function toDateKey(date) {
  return makeDateKey(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

/** Today's date key on this device. Pass a Date only in tests. */
export function todayKey(now = new Date()) {
  return toDateKey(now);
}

function keyToUtcMs(key) {
  const parts = parseDateKey(key);
  return Date.UTC(parts.year, parts.month - 1, parts.day);
}

function utcMsToKey(ms) {
  const date = new Date(ms);
  return makeDateKey(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate()
  );
}

/** Moves a date by a whole number of days (negative goes backwards). */
export function addDays(key, amount) {
  if (!Number.isInteger(amount)) {
    throw new Error('addDays needs a whole number, got: ' + String(amount));
  }
  return utcMsToKey(keyToUtcMs(key) + amount * MS_PER_DAY);
}

/** Whole days from earlierKey to laterKey (negative if reversed). */
export function diffDays(laterKey, earlierKey) {
  return Math.round((keyToUtcMs(laterKey) - keyToUtcMs(earlierKey)) / MS_PER_DAY);
}

/** Returns -1, 0 or 1, handy for sorting. */
export function compareDateKeys(a, b) {
  assertValidDateKey(a);
  assertValidDateKey(b);
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/** True if the day is after today. Future days never count as missed. */
export function isFutureDate(key, today = todayKey()) {
  return compareDateKeys(key, today) === 1;
}

/** 0 = Sunday ... 6 = Saturday */
export function getWeekday(key) {
  return new Date(keyToUtcMs(key)).getUTCDay();
}

/** Every day from startKey to endKey, inclusive. Empty if start is after end. */
export function dateRange(startKey, endKey) {
  const count = diffDays(endKey, startKey) + 1;
  if (count <= 0) return [];
  if (count > MAX_RANGE_DAYS) {
    throw new Error('Date range too large: ' + count + ' days');
  }
  const days = [];
  for (let i = 0; i < count; i += 1) {
    days.push(addDays(startKey, i));
  }
  return days;
}

/**
 * Human-readable date. Locale is optional (defaults to the device language).
 * Example: formatDateKey("2026-10-03", { month: "short", day: "numeric" }, "en-US")
 * gives "Oct 3".
 */
export function formatDateKey(key, options, locale) {
  const formatOptions = options || {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  };
  const formatter = new Intl.DateTimeFormat(locale, {
    ...formatOptions,
    timeZone: 'UTC',
  });
  return formatter.format(new Date(keyToUtcMs(key)));
}