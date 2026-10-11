import { describe, expect, it } from 'vitest';
import {
  buildWeeklyTimetable,
  describeSemesterProgress,
  describeUpcoming,
  formatShortDate,
  formatTimeRange,
  pickDefaultSemester,
} from './scheduleView.js';

const SEM = { id: 's1', name: 'Fall', startDate: '2026-10-05', endDate: '2027-01-31' };

describe('formatting', () => {
  it('formats dates and time ranges', () => {
    expect(formatShortDate('2026-10-14')).toBe('Wed 14 Oct');
    expect(formatShortDate('2028-02-29')).toBe('Tue 29 Feb');
    expect(formatTimeRange('08:30', '10:20', '24h')).toBe('08:30 – 10:20');
    expect(formatTimeRange('13:30', '15:20', '12h')).toBe('1:30 pm – 3:20 pm');
  });
});

describe('describeUpcoming', () => {
  const occurrence = { startTime: '08:30', endTime: '10:20' };
  it('describes a class in progress', () => {
    const next = { occurrence, date: '2026-10-05', daysAway: 0, state: 'ongoing' };
    expect(describeUpcoming(next, 9 * 60, '24h')).toBe('In progress · ends in 1h 20m');
  });
  it('describes a class later today, tomorrow and further away', () => {
    expect(describeUpcoming({ occurrence, date: '2026-10-05', daysAway: 0, state: 'upcoming' }, 7 * 60, '24h')).toBe(
      'Starts in 1h 30m'
    );
    expect(describeUpcoming({ occurrence, date: '2026-10-06', daysAway: 1, state: 'upcoming' }, 0, '24h')).toBe(
      'Tomorrow at 08:30'
    );
    expect(describeUpcoming({ occurrence, date: '2026-10-12', daysAway: 7, state: 'upcoming' }, 0, '12h')).toBe(
      'Mon 12 Oct at 8:30 am'
    );
  });
});

describe('describeSemesterProgress', () => {
  it('counts Monday-based weeks, with the first week being week 1', () => {
    expect(describeSemesterProgress(SEM, '2026-10-05')).toEqual({ state: 'active', week: 1, totalWeeks: 17, label: 'Week 1 of 17' });
    expect(describeSemesterProgress(SEM, '2026-10-11').week).toBe(1);
    expect(describeSemesterProgress(SEM, '2026-10-12').week).toBe(2);
    expect(describeSemesterProgress(SEM, '2027-01-31').label).toBe('Week 17 of 17');
  });
  it('counts a partial first and last week', () => {
    const partial = { id: 'p', name: 'P', startDate: '2026-10-07', endDate: '2026-10-21' };
    const progress = describeSemesterProgress(partial, '2026-10-08');
    expect(progress.totalWeeks).toBe(3);
    expect(progress.week).toBe(1);
  });
  it('describes a semester that has not started or has ended', () => {
    expect(describeSemesterProgress(SEM, '2026-10-04')).toEqual({ state: 'upcoming', week: 0, totalWeeks: 17, label: 'Starts tomorrow' });
    expect(describeSemesterProgress(SEM, '2026-09-25').label).toBe('Starts in 10 days');
    expect(describeSemesterProgress(SEM, '2027-02-01').label).toBe('Ended yesterday');
    expect(describeSemesterProgress(SEM, '2027-02-10').label).toBe('Ended 10 days ago');
    expect(describeSemesterProgress(SEM, '2027-02-10').state).toBe('ended');
  });
  it('works across a leap day', () => {
    const leap = { id: 'l', name: 'L', startDate: '2028-01-31', endDate: '2028-05-31' };
    expect(describeSemesterProgress(leap, '2028-03-01').week).toBe(5);
  });
});

describe('pickDefaultSemester', () => {
  const old = { id: 'old', name: 'Old', startDate: '2026-02-02', endDate: '2026-06-07' };
  const future = { id: 'future', name: 'Future', startDate: '2027-03-01', endDate: '2027-06-30' };
  const later = { id: 'later', name: 'Later', startDate: '2027-09-01', endDate: '2027-12-30' };
  it('prefers the semester running today', () => {
    expect(pickDefaultSemester([future, SEM, old], '2026-10-10').id).toBe('s1');
  });
  it('then the next one to start, then the latest one that ended', () => {
    expect(pickDefaultSemester([later, future, old], '2026-10-10').id).toBe('future');
    expect(pickDefaultSemester([SEM, old], '2027-05-01').id).toBe('s1');
  });
  it('returns null when there are none', () => {
    expect(pickDefaultSemester([], '2026-10-10')).toBe(null);
  });
});

describe('buildWeeklyTimetable', () => {
  const subjects = [
    { id: 'a', code: 'ANTH1002', name: 'Anthropology', color: 'blue' },
    { id: 'p', code: 'PSYC1011', name: 'Psychology', color: 'indigo' },
  ];
  const base = { kind: 'lecture', repeat: 'weekly', startTime: '08:30', endTime: '10:20', location: '', date: null };
  const rules = [
    { ...base, id: 'r1', subjectId: 'p', weekdays: [1] },
    { ...base, id: 'r2', subjectId: 'a', weekdays: [1, 5], startTime: '13:30', endTime: '15:20' },
    { ...base, id: 'r3', subjectId: 'a', repeat: 'once', date: '2026-11-02', weekdays: [] },
    { ...base, id: 'r4', subjectId: 'missing', weekdays: [2] },
  ];
  it('groups by weekday in Monday-first order, sorted by time', () => {
    const table = buildWeeklyTimetable(rules, subjects, 1);
    expect(table.days.map((d) => d.name)).toEqual(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']);
    expect(table.days[0].entries.map((e) => e.rule.id)).toEqual(['r1', 'r2']);
    expect(table.days[1].entries).toHaveLength(0); // the rule with a missing subject is left out
    expect(table.days[4].entries.map((e) => e.rule.id)).toEqual(['r2']);
  });
  it('can start the week on Sunday', () => {
    expect(buildWeeklyTimetable(rules, subjects, 0).days[0].name).toBe('Sunday');
  });
  it('lists one-time classes separately', () => {
    const table = buildWeeklyTimetable(rules, subjects, 1);
    expect(table.oneTime.map((e) => e.rule.id)).toEqual(['r3']);
    expect(table.days.every((d) => d.entries.every((e) => e.rule.id !== 'r3'))).toBe(true);
  });
});
