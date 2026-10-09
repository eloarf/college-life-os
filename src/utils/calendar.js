import {
  addDays,
  dateRange,
  daysInMonth,
  getWeekday,
  makeDateKey,
  parseDateKey,
} from './dates.js';

/**
 * Week and month math. weekStartsOn: 0 = Sunday, 1 = Monday ... 6 = Saturday.
 * The app default is Monday (1).
 */

function assertWeekStart(weekStartsOn) {
  if (!Number.isInteger(weekStartsOn) || weekStartsOn < 0 || weekStartsOn > 6) {
    throw new Error('weekStartsOn must be 0-6, got: ' + String(weekStartsOn));
  }
}

export function startOfWeek(key, weekStartsOn = 1) {
  assertWeekStart(weekStartsOn);
  const offset = (getWeekday(key) - weekStartsOn + 7) % 7;
  return addDays(key, -offset);
}

export function endOfWeek(key, weekStartsOn = 1) {
  return addDays(startOfWeek(key, weekStartsOn), 6);
}

/** The 7 date keys of the week containing the given day. */
export function getWeekDates(key, weekStartsOn = 1) {
  const start = startOfWeek(key, weekStartsOn);
  return dateRange(start, addDays(start, 6));
}

/** Weekday numbers in display order, e.g. Monday start: [1,2,3,4,5,6,0] */
export function getWeekdayOrder(weekStartsOn = 1) {
  assertWeekStart(weekStartsOn);
  const order = [];
  for (let i = 0; i < 7; i += 1) {
    order.push((weekStartsOn + i) % 7);
  }
  return order;
}

export function startOfMonth(key) {
  const parts = parseDateKey(key);
  return makeDateKey(parts.year, parts.month, 1);
}

export function endOfMonth(key) {
  const parts = parseDateKey(key);
  return makeDateKey(parts.year, parts.month, daysInMonth(parts.year, parts.month));
}

/**
 * Moves by whole months. If the target month is shorter, the day is
 * clamped: Jan 31 + 1 month = Feb 28 (or 29 in a leap year).
 */
export function addMonths(key, amount) {
  if (!Number.isInteger(amount)) {
    throw new Error('addMonths needs a whole number, got: ' + String(amount));
  }
  const parts = parseDateKey(key);
  const monthIndex = parts.year * 12 + (parts.month - 1) + amount;
  const year = Math.floor(monthIndex / 12);
  const month = (monthIndex % 12) + 1;
  const day = Math.min(parts.day, daysInMonth(year, month));
  return makeDateKey(year, month, day);
}

/**
 * Grid for a month calendar: an array of weeks, each with 7 cells like
 * { dateKey: "2026-10-03", inMonth: true }. Days from the neighbouring
 * months fill the edges and have inMonth: false. Has 4 to 6 weeks.
 * month is 1-12.
 */
export function getMonthGrid(year, month, weekStartsOn = 1) {
  const first = makeDateKey(year, month, 1);
  const last = makeDateKey(year, month, daysInMonth(year, month));
  const gridStart = startOfWeek(first, weekStartsOn);
  const gridEnd = endOfWeek(last, weekStartsOn);
  const days = dateRange(gridStart, gridEnd);

  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(
      days.slice(i, i + 7).map((dateKey) => ({
        dateKey,
        inMonth: dateKey >= first && dateKey <= last,
      }))
    );
  }
  return weeks;
}