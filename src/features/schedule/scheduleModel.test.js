import { describe, expect, it } from 'vitest';
import {
  ValidationError,
  defaultSemesterDates,
  defaultSemesterName,
  getClassKind,
  makeExceptionId,
  validateScheduleException,
  validateScheduleRule,
  validateSemester,
  validateSubject,
} from './scheduleModel.js';

const goodRule = {
  subjectId: 'subject_1',
  kind: 'lecture',
  repeat: 'weekly',
  weekdays: [3, 1],
  startTime: '08:30',
  endTime: '10:20',
  location: ' B59-2-006 ',
};

describe('validateSemester', () => {
  it('accepts a normal semester and trims the name', () => {
    const result = validateSemester({ name: '  Fall  ', startDate: '2026-10-05', endDate: '2027-01-31' });
    expect(result.ok).toBe(true);
    expect(result.value).toEqual({ name: 'Fall', startDate: '2026-10-05', endDate: '2027-01-31' });
  });
  it('rejects a missing name, bad dates and an end before the start', () => {
    expect(validateSemester({ name: '  ', startDate: '2026-10-05', endDate: '2027-01-31' }).errors.name).toBe(
      'Give the semester a name.'
    );
    expect(validateSemester({ name: 'A', startDate: '2026-02-30', endDate: '2027-01-31' }).errors.startDate).toBe(
      'Choose a valid start date.'
    );
    expect(validateSemester({ name: 'A', startDate: '2026-10-05', endDate: '2026-10-05' }).errors.endDate).toBe(
      'The end date must be after the start date.'
    );
    expect(validateSemester({ name: 'A', startDate: '2026-10-05', endDate: '2026-10-04' }).ok).toBe(false);
  });
  it('limits the length to 400 days and the name to 60 characters', () => {
    expect(validateSemester({ name: 'A', startDate: '2026-01-01', endDate: '2027-02-05' }).ok).toBe(true);
    expect(validateSemester({ name: 'A', startDate: '2026-01-01', endDate: '2027-02-06' }).ok).toBe(false);
    expect(validateSemester({ name: 'x'.repeat(61), startDate: '2026-10-05', endDate: '2027-01-31' }).ok).toBe(false);
  });
  it('does not crash on missing input', () => {
    expect(validateSemester(undefined).ok).toBe(false);
    expect(validateSemester(null).value).toBe(null);
  });
});

describe('validateSubject', () => {
  it('needs a semester and a code or a name', () => {
    expect(validateSubject({ code: 'MATH1007' }).errors.semesterId).toBe('Choose a semester.');
    expect(validateSubject({ semesterId: 's' }).errors.name).toBe('Enter a course name or a course code.');
    expect(validateSubject({ semesterId: 's', code: 'MATH1007' }).ok).toBe(true);
    expect(validateSubject({ semesterId: 's', name: 'Maths' }).ok).toBe(true);
  });
  it('defaults the colour to blue and rejects unknown colours', () => {
    expect(validateSubject({ semesterId: 's', code: 'A' }).value.color).toBe('blue');
    expect(validateSubject({ semesterId: 's', code: 'A', color: '' }).value.color).toBe('blue');
    expect(validateSubject({ semesterId: 's', code: 'A', color: 'neon' }).errors.color).toBe(
      'Choose one of the colours.'
    );
    expect(validateSubject({ semesterId: 's', code: 'A', color: 'teal' }).value.color).toBe('teal');
  });
  it('checks the length limits', () => {
    expect(validateSubject({ semesterId: 's', code: 'x'.repeat(21) }).errors.code).toBe(
      'The course code must be 20 characters or fewer.'
    );
    expect(validateSubject({ semesterId: 's', name: 'x'.repeat(81) }).ok).toBe(false);
    expect(validateSubject({ semesterId: 's', code: 'A', notes: 'x'.repeat(501) }).ok).toBe(false);
  });
});

describe('validateScheduleRule', () => {
  it('cleans a weekly rule: sorted weekdays, trimmed room, defaults', () => {
    const result = validateScheduleRule(goodRule);
    expect(result.ok).toBe(true);
    expect(result.value.weekdays).toEqual([1, 3]);
    expect(result.value.location).toBe('B59-2-006');
    expect(result.value.date).toBe(null);
    expect(result.value.biweeklyOffset).toBe(0);
  });
  it('fills in the kind and repeat defaults', () => {
    const result = validateScheduleRule({ ...goodRule, kind: undefined, repeat: '' });
    expect(result.value.kind).toBe('lecture');
    expect(result.value.repeat).toBe('weekly');
  });
  it('removes duplicate weekdays and rejects bad ones', () => {
    expect(validateScheduleRule({ ...goodRule, weekdays: [2, 2, 2] }).value.weekdays).toEqual([2]);
    expect(validateScheduleRule({ ...goodRule, weekdays: [] }).errors.weekdays).toBe(
      'Choose at least one day of the week.'
    );
    expect(validateScheduleRule({ ...goodRule, weekdays: [7] }).ok).toBe(false);
    expect(validateScheduleRule({ ...goodRule, weekdays: ['1'] }).ok).toBe(false);
    expect(validateScheduleRule({ ...goodRule, weekdays: null }).ok).toBe(false);
  });
  it('needs the end time to be after the start time', () => {
    expect(validateScheduleRule({ ...goodRule, startTime: '10:00', endTime: '10:00' }).errors.endTime).toBe(
      'The end time must be after the start time.'
    );
    expect(validateScheduleRule({ ...goodRule, startTime: '9:00' }).errors.startTime).toBe('Enter a start time.');
    expect(validateScheduleRule({ ...goodRule, endTime: '25:00' }).errors.endTime).toBe('Enter an end time.');
  });
  it('one-time classes need a date and ignore weekdays', () => {
    const result = validateScheduleRule({ ...goodRule, repeat: 'once', weekdays: [], date: '2026-10-12' });
    expect(result.ok).toBe(true);
    expect(result.value.date).toBe('2026-10-12');
    expect(result.value.weekdays).toEqual([]);
    expect(validateScheduleRule({ ...goodRule, repeat: 'once', date: '2026-13-01' }).errors.date).toBe(
      'Choose the date of this class.'
    );
  });
  it('keeps the biweekly offset only for biweekly rules', () => {
    expect(validateScheduleRule({ ...goodRule, repeat: 'biweekly', biweeklyOffset: 1 }).value.biweeklyOffset).toBe(1);
    expect(validateScheduleRule({ ...goodRule, repeat: 'biweekly', biweeklyOffset: 5 }).value.biweeklyOffset).toBe(0);
    expect(validateScheduleRule({ ...goodRule, repeat: 'weekly', biweeklyOffset: 1 }).value.biweeklyOffset).toBe(0);
  });
  it('rejects unknown kinds and repeats and requires a subject', () => {
    expect(validateScheduleRule({ ...goodRule, kind: 'party' }).errors.kind).toBe('Choose a class type.');
    expect(validateScheduleRule({ ...goodRule, repeat: 'daily' }).errors.repeat).toBe(
      'Choose how often the class repeats.'
    );
    expect(validateScheduleRule({ ...goodRule, subjectId: '' }).errors.subjectId).toBe('Choose a subject.');
  });
});

describe('validateScheduleException', () => {
  const base = { ruleId: 'rule_1', date: '2026-10-12' };
  it('accepts a cancellation and clears any change fields', () => {
    const result = validateScheduleException({
      ...base,
      type: 'cancelled',
      newStartTime: '09:00',
      newEndTime: '10:00',
      newLocation: 'X',
      note: ' Teacher is sick ',
    });
    expect(result.ok).toBe(true);
    expect(result.value.newStartTime).toBe(null);
    expect(result.value.newLocation).toBe('');
    expect(result.value.note).toBe('Teacher is sick');
  });
  it('accepts a moved time, a moved room, or both', () => {
    expect(
      validateScheduleException({ ...base, type: 'changed', newStartTime: '09:00', newEndTime: '10:30' }).ok
    ).toBe(true);
    expect(validateScheduleException({ ...base, type: 'changed', newLocation: 'B60-1-001' }).ok).toBe(true);
  });
  it('rejects a change that changes nothing or has a bad time range', () => {
    expect(validateScheduleException({ ...base, type: 'changed' }).errors.newLocation).toBe(
      'Change the time or the room, or cancel the class instead.'
    );
    expect(
      validateScheduleException({ ...base, type: 'changed', newStartTime: '10:00', newEndTime: '09:00' }).errors
        .newEndTime
    ).toBe('Enter a start and an end time, with the end after the start.');
    expect(validateScheduleException({ ...base, type: 'changed', newStartTime: '10:00' }).ok).toBe(false);
  });
  it('rejects a missing class, a bad date and an unknown type', () => {
    expect(validateScheduleException({ date: '2026-10-12', type: 'cancelled' }).errors.ruleId).toBe('Choose a class.');
    expect(validateScheduleException({ ruleId: 'r', date: '2026-02-30', type: 'cancelled' }).errors.date).toBe(
      'Choose a valid date.'
    );
    expect(validateScheduleException({ ...base, type: 'moved' }).errors.type).toBe('Choose cancelled or changed.');
  });
});

describe('small helpers', () => {
  it('makeExceptionId is stable', () => {
    expect(makeExceptionId('rule_a', '2026-10-12')).toBe('exception_rule_a_2026-10-12');
  });
  it('getClassKind never crashes', () => {
    expect(getClassKind('lab').short).toBe('Lab');
    expect(getClassKind('nonsense').id).toBe('other');
    expect(getClassKind(undefined).id).toBe('other');
  });
  it('ValidationError carries the field errors', () => {
    const error = new ValidationError('bad', { name: 'x' });
    expect(error.name).toBe('ValidationError');
    expect(error.errors).toEqual({ name: 'x' });
  });
  it('suggests semester dates starting on this week Monday and lasting 17 weeks', () => {
    expect(defaultSemesterDates('2026-10-10')).toEqual({ startDate: '2026-10-05', endDate: '2027-01-31' });
    expect(defaultSemesterDates('2026-10-05').startDate).toBe('2026-10-05');
    expect(defaultSemesterDates('2026-10-11').startDate).toBe('2026-10-05');
  });
  it('suggests a semester name from the month', () => {
    expect(defaultSemesterName('2026-10-10')).toBe('2026/27 — Semester 1');
    expect(defaultSemesterName('2027-02-10')).toBe('2026/27 — Semester 2');
    expect(defaultSemesterName('2026-08-01')).toBe('2026/27 — Semester 1');
    expect(defaultSemesterName('2026-07-31')).toBe('2025/26 — Semester 2');
    expect(defaultSemesterName('2099-12-31')).toBe('2099/00 — Semester 1');
  });
});
