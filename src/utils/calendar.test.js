import { describe, it, expect } from 'vitest';
import {
  addMonths,
  endOfMonth,
  endOfWeek,
  getMonthGrid,
  getWeekDates,
  getWeekdayOrder,
  startOfMonth,
  startOfWeek,
} from './calendar.js';

describe('weeks', () => {
  it('finds the start of the week with a Monday start', () => {
    expect(startOfWeek('2026-10-03', 1)).toBe('2026-09-28'); // Saturday
    expect(startOfWeek('2026-09-28', 1)).toBe('2026-09-28'); // already Monday
    expect(startOfWeek('2026-10-04', 1)).toBe('2026-09-28'); // Sunday belongs to the week before
  });

  it('finds the start of the week with a Sunday start', () => {
    expect(startOfWeek('2026-10-03', 0)).toBe('2026-09-27');
    expect(startOfWeek('2026-10-04', 0)).toBe('2026-10-04');
  });

  it('defaults to a Monday start', () => {
    expect(startOfWeek('2026-10-03')).toBe('2026-09-28');
  });

  it('finds the end of the week', () => {
    expect(endOfWeek('2026-10-03', 1)).toBe('2026-10-04');
    expect(endOfWeek('2026-10-03', 0)).toBe('2026-10-03');
  });

  it('lists the 7 days of a week', () => {
    const week = getWeekDates('2026-10-03', 1);
    expect(week).toHaveLength(7);
    expect(week[0]).toBe('2026-09-28');
    expect(week[6]).toBe('2026-10-04');
  });

  it('handles a week that spans two years', () => {
    const week = getWeekDates('2026-12-31', 1);
    expect(week[0]).toBe('2026-12-28');
    expect(week[6]).toBe('2027-01-03');
  });

  it('rejects an invalid week start', () => {
    expect(() => startOfWeek('2026-10-03', 7)).toThrow('weekStartsOn');
    expect(() => startOfWeek('2026-10-03', 'x')).toThrow('weekStartsOn');
  });

  it('gives weekday order for headers', () => {
    expect(getWeekdayOrder(1)).toEqual([1, 2, 3, 4, 5, 6, 0]);
    expect(getWeekdayOrder(0)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });
});

describe('months', () => {
  it('finds the first and last day of a month', () => {
    expect(startOfMonth('2026-10-15')).toBe('2026-10-01');
    expect(endOfMonth('2026-10-15')).toBe('2026-10-31');
  });

  it('knows February in leap and normal years', () => {
    expect(endOfMonth('2024-02-10')).toBe('2024-02-29');
    expect(endOfMonth('2025-02-10')).toBe('2025-02-28');
  });

  it('adds months and clamps short months', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2024-01-31', 1)).toBe('2024-02-29');
    expect(addMonths('2026-03-31', -1)).toBe('2026-02-28');
  });

  it('crosses year boundaries both ways', () => {
    expect(addMonths('2026-12-15', 1)).toBe('2027-01-15');
    expect(addMonths('2026-01-15', -1)).toBe('2025-12-15');
    expect(addMonths('2026-10-03', 12)).toBe('2027-10-03');
    expect(addMonths('2026-10-03', -10)).toBe('2025-12-03');
  });

  it('handles leap day plus a year', () => {
    expect(addMonths('2024-02-29', 12)).toBe('2025-02-28');
  });

  it('adding zero months changes nothing', () => {
    expect(addMonths('2026-10-03', 0)).toBe('2026-10-03');
  });
});

describe('month grid', () => {
  it('builds October 2026 (Monday start) as 5 full weeks', () => {
    const grid = getMonthGrid(2026, 10, 1);
    expect(grid).toHaveLength(5);
    grid.forEach((week) => expect(week).toHaveLength(7));
    expect(grid[0][0].dateKey).toBe('2026-09-28');
    expect(grid[0][0].inMonth).toBe(false);
    expect(grid[0][3].dateKey).toBe('2026-10-01');
    expect(grid[0][3].inMonth).toBe(true);
    expect(grid[4][6].dateKey).toBe('2026-11-01');
    expect(grid[4][6].inMonth).toBe(false);
  });

  it('marks exactly the days of the month as inMonth', () => {
    const cells = getMonthGrid(2026, 10, 1).flat();
    expect(cells.filter((cell) => cell.inMonth)).toHaveLength(31);
  });

  it('can be exactly 4 weeks (February 2026, Sunday start)', () => {
    const grid = getMonthGrid(2026, 2, 0);
    expect(grid).toHaveLength(4);
    expect(grid[0][0].dateKey).toBe('2026-02-01');
    expect(grid[3][6].dateKey).toBe('2026-02-28');
  });

  it('can need 6 weeks (August 2026, Monday start)', () => {
    const grid = getMonthGrid(2026, 8, 1);
    expect(grid).toHaveLength(6);
    expect(grid[0][0].dateKey).toBe('2026-07-27');
    expect(grid[5][6].dateKey).toBe('2026-09-06');
  });

  it('includes leap day', () => {
    const cells = getMonthGrid(2024, 2, 1).flat();
    const leapDay = cells.find((cell) => cell.dateKey === '2024-02-29');
    expect(leapDay.inMonth).toBe(true);
  });

  it('rejects a month that does not exist', () => {
    expect(() => getMonthGrid(2026, 13, 1)).toThrow('Invalid date key');
  });
});