import { describe, expect, it } from 'vitest';
import { classStatus, createScheduleEngine, ruleOccursOn, subjectTitle } from './scheduleEngine.js';
import { makeExceptionId } from './scheduleModel.js';

const SEM = { id: 's1', name: 'Fall', startDate: '2026-10-05', endDate: '2027-01-31' };
const SUBJ = { id: 'sub1', semesterId: 's1', code: 'PSYC1011', name: 'General Psychology', color: 'indigo', instructor: 'Mihret' };

function rule(overrides) {
  return {
    id: 'r1',
    subjectId: 'sub1',
    kind: 'lecture',
    repeat: 'weekly',
    weekdays: [1],
    startTime: '08:30',
    endTime: '10:20',
    location: 'B59-2-006',
    ...overrides,
  };
}

function engineWith(parts) {
  return createScheduleEngine({
    semesters: [SEM],
    subjects: [SUBJ],
    scheduleRules: [rule()],
    exceptions: [],
    ...parts,
  });
}

function dates(engine, list) {
  return list.filter((date) => engine.occurrencesOn(date).length > 0);
}

describe('weekly classes', () => {
  it('appear on the right weekday inside the semester only', () => {
    const engine = engineWith({});
    expect(engine.occurrencesOn('2026-10-05')).toHaveLength(1); // first Monday
    expect(engine.occurrencesOn('2026-10-06')).toHaveLength(0); // Tuesday
    expect(engine.occurrencesOn('2026-09-28')).toHaveLength(0); // Monday before the start
    expect(engine.occurrencesOn('2027-01-25')).toHaveLength(1); // last Monday
    expect(engine.occurrencesOn('2027-02-01')).toHaveLength(0); // Monday after the end
  });
  it('fill in the details from the rule and the subject', () => {
    const occurrence = engineWith({}).occurrencesOn('2026-10-12')[0];
    expect(occurrence.title).toBe('PSYC1011');
    expect(occurrence.subjectName).toBe('General Psychology');
    expect(occurrence.color).toBe('indigo');
    expect(occurrence.startTime).toBe('08:30');
    expect(occurrence.endTime).toBe('10:20');
    expect(occurrence.location).toBe('B59-2-006');
    expect(occurrence.instructor).toBe('Mihret');
    expect(occurrence.status).toBe('normal');
    expect(occurrence.key).toBe('r1@2026-10-12');
  });
  it('a rule with several weekdays appears on each of them', () => {
    const engine = engineWith({ scheduleRules: [rule({ weekdays: [1, 3, 5] })] });
    expect(dates(engine, ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09'])).toEqual([
      '2026-10-05',
      '2026-10-07',
      '2026-10-09',
    ]);
  });
  it('sort by start time, then end time, then name', () => {
    const engine = engineWith({
      subjects: [SUBJ, { ...SUBJ, id: 'sub2', code: 'ANTH1002', color: 'blue' }],
      scheduleRules: [
        rule({ id: 'late', startTime: '13:30', endTime: '15:20' }),
        rule({ id: 'b', subjectId: 'sub1' }),
        rule({ id: 'a', subjectId: 'sub2' }),
      ],
    });
    expect(engine.occurrencesOn('2026-10-05').map((o) => o.ruleId)).toEqual(['a', 'b', 'late']);
  });
  it('ignore the week-start setting because weeks are always Monday based', () => {
    const engine = engineWith({ scheduleRules: [rule({ repeat: 'biweekly', weekdays: [0] })] });
    // Sunday 2026-10-11 closes week 1 (Mon 5 Oct - Sun 11 Oct), so it is week index 0
    expect(engine.occurrencesOn('2026-10-11')).toHaveLength(1);
    expect(engine.occurrencesOn('2026-10-18')).toHaveLength(0);
    expect(engine.occurrencesOn('2026-10-25')).toHaveLength(1);
  });
});

describe('every-2-weeks classes', () => {
  const winter = { id: 's1', name: 'Winter', startDate: '2026-12-14', endDate: '2027-03-14' };
  it('alternate correctly across the new year', () => {
    const engine = engineWith({
      semesters: [winter],
      scheduleRules: [rule({ repeat: 'biweekly', weekdays: [1] })],
    });
    expect(dates(engine, ['2026-12-14', '2026-12-21', '2026-12-28', '2027-01-04', '2027-01-11', '2027-01-18'])).toEqual([
      '2026-12-14',
      '2026-12-28',
      '2027-01-11',
    ]);
  });
  it('can start on the second week with the offset', () => {
    const engine = engineWith({
      semesters: [winter],
      scheduleRules: [rule({ repeat: 'biweekly', weekdays: [1], biweeklyOffset: 1 })],
    });
    expect(dates(engine, ['2026-12-14', '2026-12-21', '2026-12-28', '2027-01-04'])).toEqual([
      '2026-12-21',
      '2027-01-04',
    ]);
  });
  it('count the first week even when the semester starts mid-week', () => {
    const midWeek = { id: 's1', name: 'Mid', startDate: '2026-10-07', endDate: '2027-01-31' };
    const engine = engineWith({
      semesters: [midWeek],
      scheduleRules: [rule({ repeat: 'biweekly', weekdays: [4] })], // Thursday
    });
    expect(dates(engine, ['2026-10-01', '2026-10-08', '2026-10-15', '2026-10-22'])).toEqual(['2026-10-08', '2026-10-22']);
  });
  it('handle a leap day', () => {
    const leap = { id: 's1', name: 'Leap', startDate: '2028-01-31', endDate: '2028-05-31' };
    const weekly = engineWith({ semesters: [leap], scheduleRules: [rule({ weekdays: [2] })] });
    expect(dates(weekly, ['2028-02-28', '2028-02-29', '2028-03-01', '2028-03-07'])).toEqual(['2028-02-29', '2028-03-07']);
    const biweekly = engineWith({ semesters: [leap], scheduleRules: [rule({ repeat: 'biweekly', weekdays: [2] })] });
    expect(dates(biweekly, ['2028-02-29', '2028-03-07'])).toEqual(['2028-02-29']);
  });
});

describe('one-time classes', () => {
  it('appear only on their date, even outside the semester', () => {
    const engine = engineWith({
      scheduleRules: [rule({ repeat: 'once', date: '2027-03-03', weekdays: [] })],
    });
    expect(engine.occurrencesOn('2027-03-03')).toHaveLength(1);
    expect(engine.occurrencesOn('2027-03-03')[0].isOneTime).toBe(true);
    expect(engine.occurrencesOn('2027-03-10')).toHaveLength(0);
    expect(engine.occurrencesOn('2027-02-24')).toHaveLength(0);
  });
});

describe('changes to a single date', () => {
  const cancelled = { id: makeExceptionId('r1', '2026-10-12'), ruleId: 'r1', date: '2026-10-12', type: 'cancelled', note: 'Holiday' };
  it('cancel one class and leave the other weeks alone', () => {
    const engine = engineWith({ exceptions: [cancelled] });
    const occurrence = engine.occurrencesOn('2026-10-12')[0];
    expect(occurrence.status).toBe('cancelled');
    expect(occurrence.exceptionNote).toBe('Holiday');
    expect(occurrence.startTime).toBe('08:30');
    expect(engine.occurrencesOn('2026-10-19')[0].status).toBe('normal');
  });
  it('move the time and the room, and remember the original', () => {
    const engine = engineWith({
      exceptions: [
        {
          id: 'e1',
          ruleId: 'r1',
          date: '2026-10-12',
          type: 'changed',
          newStartTime: '11:00',
          newEndTime: '12:50',
          newLocation: 'B60-1-001',
          note: '',
        },
      ],
    });
    const occurrence = engine.occurrencesOn('2026-10-12')[0];
    expect(occurrence.status).toBe('changed');
    expect(occurrence.startTime).toBe('11:00');
    expect(occurrence.endTime).toBe('12:50');
    expect(occurrence.location).toBe('B60-1-001');
    expect(occurrence.originalStartTime).toBe('08:30');
    expect(occurrence.originalLocation).toBe('B59-2-006');
  });
  it('a room-only change keeps the time', () => {
    const engine = engineWith({
      exceptions: [{ id: 'e1', ruleId: 'r1', date: '2026-10-12', type: 'changed', newLocation: 'Hall 2' }],
    });
    const occurrence = engine.occurrencesOn('2026-10-12')[0];
    expect(occurrence.startTime).toBe('08:30');
    expect(occurrence.location).toBe('Hall 2');
  });
  it('a change on a date with no class creates no class', () => {
    const engine = engineWith({
      exceptions: [{ id: 'e1', ruleId: 'r1', date: '2026-10-13', type: 'cancelled' }],
    });
    expect(engine.occurrencesOn('2026-10-13')).toHaveLength(0);
    expect(engine.skippedCount).toBe(0);
  });
  it('a change for a deleted class is skipped', () => {
    const engine = engineWith({
      exceptions: [{ id: 'e1', ruleId: 'gone', date: '2026-10-12', type: 'cancelled' }],
    });
    expect(engine.skippedCount).toBe(1);
  });
  it('when two changes clash the later id wins', () => {
    const engine = engineWith({
      exceptions: [
        { id: 'e2', ruleId: 'r1', date: '2026-10-12', type: 'changed', newLocation: 'Hall 2' },
        { id: 'e1', ruleId: 'r1', date: '2026-10-12', type: 'cancelled' },
      ],
    });
    expect(engine.occurrencesOn('2026-10-12')[0].status).toBe('changed');
  });
});

describe('damaged or incomplete data', () => {
  it('works with nothing at all', () => {
    for (const input of [undefined, null, {}, { semesters: 'x', subjects: 5 }]) {
      const engine = createScheduleEngine(input);
      expect(engine.semesters).toHaveLength(0);
      expect(engine.occurrencesOn('2026-10-12')).toHaveLength(0);
      expect(engine.findNextClass('2026-10-12', 0)).toBe(null);
    }
  });
  it('skips and counts records it cannot use', () => {
    const engine = createScheduleEngine({
      semesters: [SEM, null, { id: 'bad', startDate: 'x', endDate: '2027-01-01' }, { id: 'rev', startDate: '2027-01-02', endDate: '2027-01-01' }],
      subjects: [SUBJ, { id: 'orphan', semesterId: 'missing', code: 'X' }, 'text'],
      scheduleRules: [
        rule(),
        rule({ id: 'r2', subjectId: 'orphan' }),
        rule({ id: 'r3', startTime: '10:00', endTime: '09:00' }),
        rule({ id: 'r4', weekdays: [] }),
        { id: 5 },
      ],
      exceptions: [{ nope: true }],
    });
    expect(engine.semesters).toHaveLength(1);
    expect(engine.subjects).toHaveLength(1);
    expect(engine.rules).toHaveLength(1);
    expect(engine.skippedCount).toBe(3 + 2 + 4 + 1);
    expect(engine.occurrencesOn('2026-10-12')).toHaveLength(1);
  });
  it('shows an unknown colour as gray and names a subject without a code by its name', () => {
    const engine = engineWith({ subjects: [{ ...SUBJ, color: 'neon', code: '' }] });
    expect(engine.subjects[0].color).toBe('gray');
    expect(engine.occurrencesOn('2026-10-12')[0].title).toBe('General Psychology');
    expect(subjectTitle({ code: '', name: '' })).toBe('Untitled subject');
  });
  it('gives a nameless semester a name and rejects an invalid date lookup', () => {
    const engine = engineWith({ semesters: [{ ...SEM, name: 5 }] });
    expect(engine.semesters[0].name).toBe('Untitled semester');
    expect(engine.occurrencesOn('not-a-date')).toHaveLength(0);
  });
});

describe('several semesters and instructors', () => {
  it('lists the newest semester first and keeps classes in their own semester', () => {
    const old = { id: 's0', name: 'Old', startDate: '2026-02-02', endDate: '2026-06-07' };
    const engine = createScheduleEngine({
      semesters: [old, SEM],
      subjects: [SUBJ, { ...SUBJ, id: 'subOld', semesterId: 's0', code: 'OLD1' }],
      scheduleRules: [rule(), rule({ id: 'rOld', subjectId: 'subOld' })],
      exceptions: [],
    });
    expect(engine.semesters.map((s) => s.id)).toEqual(['s1', 's0']);
    expect(engine.occurrencesOn('2026-10-12').map((o) => o.title)).toEqual(['PSYC1011']);
    expect(engine.occurrencesOn('2026-03-02').map((o) => o.title)).toEqual(['OLD1']);
    expect(engine.rulesForSemester('s0').map((r) => r.id)).toEqual(['rOld']);
    expect(engine.subjectsForSemester('s1').map((s) => s.id)).toEqual(['sub1']);
    expect(engine.semesterById('nope')).toBe(null);
  });
  it('a class instructor overrides the subject instructor', () => {
    const engine = engineWith({ scheduleRules: [rule({ instructor: 'Guest Speaker' })] });
    expect(engine.occurrencesOn('2026-10-12')[0].instructor).toBe('Guest Speaker');
  });
});

describe('ruleOccursOn', () => {
  it('can be used directly', () => {
    const checked = engineWith({}).rules[0];
    expect(ruleOccursOn(checked, SEM, '2026-10-05')).toBe(true);
    expect(ruleOccursOn(checked, SEM, '2026-10-06')).toBe(false);
  });
});

describe('findNextClass', () => {
  const engine = engineWith({});
  const minutes = (h, m) => h * 60 + m;
  it('returns an upcoming class today', () => {
    const next = engine.findNextClass('2026-10-05', minutes(8, 0));
    expect(next.state).toBe('upcoming');
    expect(next.daysAway).toBe(0);
    expect(next.occurrence.ruleId).toBe('r1');
  });
  it('returns the class in progress, including the very first minute', () => {
    expect(engine.findNextClass('2026-10-05', minutes(8, 30)).state).toBe('ongoing');
    expect(engine.findNextClass('2026-10-05', minutes(10, 19)).state).toBe('ongoing');
  });
  it('moves to the next week once the class has ended', () => {
    const next = engine.findNextClass('2026-10-05', minutes(10, 20));
    expect(next.date).toBe('2026-10-12');
    expect(next.daysAway).toBe(7);
  });
  it('skips cancelled classes', () => {
    const cancelled = engineWith({
      exceptions: [{ id: 'e', ruleId: 'r1', date: '2026-10-05', type: 'cancelled' }],
    });
    expect(cancelled.findNextClass('2026-10-05', minutes(7, 0)).date).toBe('2026-10-12');
  });
  it('respects the look-ahead limit', () => {
    expect(engine.findNextClass('2026-10-06', 0, 5)).toBe(null);
    expect(engine.findNextClass('2026-10-06', 0, 6).date).toBe('2026-10-12');
    expect(engine.findNextClass('bad', 0)).toBe(null);
  });
  it('returns nothing after the semester ends', () => {
    expect(engine.findNextClass('2027-02-01', 0)).toBe(null);
  });
});

describe('classStatus', () => {
  const occurrence = { date: '2026-10-05', startTime: '08:30', endTime: '10:20', status: 'normal' };
  it('is based on the date and the time', () => {
    expect(classStatus(occurrence, '2026-10-04', 900)).toBe('upcoming');
    expect(classStatus(occurrence, '2026-10-06', 0)).toBe('finished');
    expect(classStatus(occurrence, '2026-10-05', 509)).toBe('upcoming');
    expect(classStatus(occurrence, '2026-10-05', 510)).toBe('ongoing');
    expect(classStatus(occurrence, '2026-10-05', 619)).toBe('ongoing');
    expect(classStatus(occurrence, '2026-10-05', 620)).toBe('finished');
  });
  it('shows cancelled whatever the time is', () => {
    expect(classStatus({ ...occurrence, status: 'cancelled' }, '2026-10-05', 520)).toBe('cancelled');
  });
});
