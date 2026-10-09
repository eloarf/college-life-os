import { describe, it, expect } from 'vitest';
import {
  addDays,
  compareDateKeys,
  daysInMonth,
  dateRange,
  diffDays,
  formatDateKey,
  getWeekday,
  isFutureDate,
  isLeapYear,
  isValidDateKey,
  makeDateKey,
  parseDateKey,
  toDateKey,
  todayKey,
} from './dates.js';

describe('leap years and month lengths', () => {
  it('knows which years are leap years', () => {
    expect(isLeapYear(2024)).toBe(true);
    expect(isLeapYear(2025)).toBe(false);
    expect(isLeapYear(2000)).toBe(true);
    expect(isLeapYear(1900)).toBe(false);
    expect(isLeapYear(2100)).toBe(false);
  });

  it('gives the right number of days in each month', () => {
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2025, 2)).toBe(28);
    expect(daysInMonth(2026, 4)).toBe(30);
    expect(daysInMonth(2026, 1)).toBe(31);
    expect(daysInMonth(2026, 12)).toBe(31);
  });
});

describe('date key validation', () => {
  it('accepts real dates', () => {
    expect(isValidDateKey('2026-10-03')).toBe(true);
    expect(isValidDateKey('2024-02-29')).toBe(true);
    expect(isValidDateKey('2026-12-31')).toBe(true);
  });

  it('rejects impossible or badly formatted dates', () => {
    expect(isValidDateKey('2025-02-29')).toBe(false);
    expect(isValidDateKey('2026-02-30')).toBe(false);
    expect(isValidDateKey('2026-13-01')).toBe(false);
    expect(isValidDateKey('2026-00-10')).toBe(false);
    expect(isValidDateKey('2026-1-5')).toBe(false);
    expect(isValidDateKey('2026-10-03T10:00')).toBe(false);
    expect(isValidDateKey('0999-01-01')).toBe(false);
    expect(isValidDateKey('')).toBe(false);
    expect(isValidDateKey(null)).toBe(false);
    expect(isValidDateKey(undefined)).toBe(false);
    expect(isValidDateKey(20261003)).toBe(false);
  });

  it('throws a clear error when a function gets a bad key', () => {
    expect(() => addDays('nope', 1)).toThrow('Invalid date key');
    expect(() => parseDateKey('2026-02-30')).toThrow('Invalid date key');
  });
});

describe('building and parsing keys', () => {
  it('pads single digits', () => {
    expect(makeDateKey(2026, 1, 5)).toBe('2026-01-05');
  });

  it('parses a key back into numbers', () => {
    expect(parseDateKey('2026-10-03')).toEqual({ year: 2026, month: 10, day: 3 });
  });
});

describe('converting a Date to a local day', () => {
  it('uses the local calendar day, with months counted from 1', () => {
    expect(toDateKey(new Date(2026, 0, 5, 9, 0))).toBe('2026-01-05');
  });

  it('keeps 23:59 on the same day', () => {
    expect(toDateKey(new Date(2026, 9, 3, 23, 59))).toBe('2026-10-03');
  });

  it('moves to the next day at exactly midnight', () => {
    expect(toDateKey(new Date(2026, 9, 4, 0, 0))).toBe('2026-10-04');
  });

  it('handles the turn of the year', () => {
    expect(toDateKey(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-31');
    expect(toDateKey(new Date(2027, 0, 1, 0, 0))).toBe('2027-01-01');
  });

  it('todayKey uses the Date it is given', () => {
    expect(todayKey(new Date(2026, 9, 3, 23, 59))).toBe('2026-10-03');
  });
});

describe('addDays', () => {
  it('crosses month boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('crosses year boundaries in both directions', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
  });

  it('handles leap day correctly', () => {
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDays('2024-02-28', 2)).toBe('2024-03-01');
    expect(addDays('2025-02-28', 1)).toBe('2025-03-01');
    expect(addDays('2024-01-01', 366)).toBe('2025-01-01');
  });

  it('adding zero changes nothing', () => {
    expect(addDays('2026-10-03', 0)).toBe('2026-10-03');
  });

  it('is not confused by daylight saving changes elsewhere in the world', () => {
    expect(addDays('2026-03-07', 1)).toBe('2026-03-08');
    expect(addDays('2026-03-07', 2)).toBe('2026-03-09');
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-10-31', 2)).toBe('2026-11-02');
  });

  it('refuses fractions', () => {
    expect(() => addDays('2026-10-03', 1.5)).toThrow('whole number');
  });
});

describe('diffDays', () => {
  it('counts whole days, positive or negative', () => {
    expect(diffDays('2026-10-03', '2026-10-03')).toBe(0);
    expect(diffDays('2026-10-04', '2026-10-03')).toBe(1);
    expect(diffDays('2026-10-03', '2026-10-04')).toBe(-1);
  });

  it('counts across leap days and years', () => {
    expect(diffDays('2024-03-01', '2024-02-28')).toBe(2);
    expect(diffDays('2025-03-01', '2025-02-28')).toBe(1);
    expect(diffDays('2025-01-01', '2024-01-01')).toBe(366);
    expect(diffDays('2026-01-01', '2025-01-01')).toBe(365);
  });

  it('is correct across daylight saving dates', () => {
    expect(diffDays('2026-03-09', '2026-03-07')).toBe(2);
    expect(diffDays('2026-11-02', '2026-10-31')).toBe(2);
  });
});

describe('comparing and future dates', () => {
  it('compares keys', () => {
    expect(compareDateKeys('2026-10-03', '2026-10-04')).toBe(-1);
    expect(compareDateKeys('2026-10-04', '2026-10-03')).toBe(1);
    expect(compareDateKeys('2026-10-03', '2026-10-03')).toBe(0);
  });

  it('sorts keys chronologically across years', () => {
    const sorted = ['2027-01-01', '2026-12-31', '2026-02-01'].sort(compareDateKeys);
    expect(sorted).toEqual(['2026-02-01', '2026-12-31', '2027-01-01']);
  });

  it('detects future days but not today or the past', () => {
    expect(isFutureDate('2026-10-04', '2026-10-03')).toBe(true);
    expect(isFutureDate('2026-10-03', '2026-10-03')).toBe(false);
    expect(isFutureDate('2026-10-02', '2026-10-03')).toBe(false);
  });
});

describe('getWeekday', () => {
  it('returns 0 for Sunday through 6 for Saturday', () => {
    expect(getWeekday('2026-10-03')).toBe(6);
    expect(getWeekday('2026-10-04')).toBe(0);
    expect(getWeekday('2026-10-05')).toBe(1);
    expect(getWeekday('2024-02-29')).toBe(4);
    expect(getWeekday('2000-01-01')).toBe(6);
  });
});

describe('dateRange', () => {
  it('includes both ends', () => {
    expect(dateRange('2026-10-01', '2026-10-03')).toEqual([
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
    ]);
  });

  it('works for a single day', () => {
    expect(dateRange('2026-10-03', '2026-10-03')).toEqual(['2026-10-03']);
  });

  it('is empty when the start is after the end', () => {
    expect(dateRange('2026-10-05', '2026-10-03')).toEqual([]);
  });

  it('crosses a month and a leap day', () => {
    expect(dateRange('2024-02-28', '2024-03-01')).toEqual([
      '2024-02-28',
      '2024-02-29',
      '2024-03-01',
    ]);
  });

  it('refuses absurdly large ranges', () => {
    expect(() => dateRange('2000-01-01', '2026-01-01')).toThrow('too large');
  });
});

describe('formatDateKey', () => {
  it('formats the full date without timezone shifting', () => {
    expect(formatDateKey('2026-10-03', undefined, 'en-US')).toBe(
      'Saturday, October 3, 2026'
    );
  });

  it('accepts custom options', () => {
    expect(
      formatDateKey('2026-10-03', { month: 'short', day: 'numeric' }, 'en-US')
    ).toBe('Oct 3');
  });
});