import { describe, expect, it } from 'vitest';
import { createScheduleEngine } from './scheduleEngine.js';
import { buildSampleTimetable } from './sampleTimetable.js';
import { ValidationError, validateScheduleRule, validateSubject } from './scheduleModel.js';

const SEMESTER = { name: '2026/27 — Semester 1', startDate: '2026-10-05', endDate: '2027-01-31' };

function counter() {
  let n = 0;
  return (prefix) => {
    n += 1;
    return prefix + '_' + n;
  };
}

describe('buildSampleTimetable', () => {
  const sample = buildSampleTimetable(SEMESTER, counter());
  it('creates one semester, seven subjects and nine weekly classes', () => {
    expect(sample.semester.name).toBe(SEMESTER.name);
    expect(sample.subjects).toHaveLength(7);
    expect(sample.scheduleRules).toHaveLength(9);
  });
  it('gives every record a unique id and links them together', () => {
    const ids = [sample.semester.id]
      .concat(sample.subjects.map((s) => s.id))
      .concat(sample.scheduleRules.map((r) => r.id));
    expect(new Set(ids).size).toBe(ids.length);
    sample.subjects.forEach((s) => expect(s.semesterId).toBe(sample.semester.id));
    const subjectIds = sample.subjects.map((s) => s.id);
    sample.scheduleRules.forEach((r) => {
      expect(subjectIds.includes(r.subjectId)).toBe(true);
      expect(r.semesterId).toBe(sample.semester.id);
    });
  });
  it('uses the colours from the timetable', () => {
    const colors = {};
    sample.subjects.forEach((s) => {
      colors[s.code] = s.color;
    });
    expect(colors).toEqual({
      ANTH1002: 'blue',
      ENTR1006: 'orange',
      FLEN1003: 'green',
      GEES1005: 'purple',
      MATH1007: 'teal',
      PHIL1009: 'pink',
      PSYC1011: 'indigo',
    });
  });
  it('every record passes the normal validation', () => {
    sample.subjects.forEach((s) => expect(validateSubject(s).ok).toBe(true));
    sample.scheduleRules.forEach((r) => expect(validateScheduleRule(r).ok).toBe(true));
  });
  it('produces the right classes each weekday', () => {
    const engine = createScheduleEngine({
      semesters: [sample.semester],
      subjects: sample.subjects,
      scheduleRules: sample.scheduleRules,
      exceptions: [],
    });
    expect(engine.skippedCount).toBe(0);
    const summary = (date) =>
      engine.occurrencesOn(date).map((o) => o.title + ' ' + o.kind + ' ' + o.startTime + '-' + o.endTime + ' ' + o.location);
    expect(summary('2026-10-05')).toEqual([
      'PSYC1011 lecture 08:30-10:20 B59-2-006',
      'ANTH1002 lecture 13:30-15:20 B59-3-010',
    ]);
    expect(summary('2026-10-06')).toEqual([
      'GEES1005 lecture 10:30-12:20 B59-1-008',
      'MATH1007 tutorial 14:00-16:50 B59-2-005',
    ]);
    expect(summary('2026-10-07')).toEqual(['ENTR1006 lecture 10:30-12:20 B59-4-008']);
    expect(summary('2026-10-08')).toEqual([
      'FLEN1003 lecture 10:30-12:20 B59-2-002',
      'PHIL1009 lecture 13:30-15:20 B59-2-003',
    ]);
    expect(summary('2026-10-09')).toEqual([
      'MATH1007 lecture 08:30-10:20 B59-1-007',
      'FLEN1003 tutorial 14:00-16:50 B59-4-008',
    ]);
    expect(summary('2026-10-10')).toEqual([]);
    expect(summary('2026-10-11')).toEqual([]);
  });
  it('refuses an invalid semester', () => {
    expect(() => buildSampleTimetable({ name: '', startDate: '2026-10-05', endDate: '2027-01-31' })).toThrow(
      'The sample semester is not valid.'
    );
    let caught = null;
    try {
      buildSampleTimetable({ name: 'A', startDate: '2027-01-31', endDate: '2026-10-05' });
    } catch (error) {
      caught = error;
    }
    expect(caught instanceof ValidationError).toBe(true);
    expect(caught.errors.endDate).toBe('The end date must be after the start date.');
  });
  it('creates real ids by default', () => {
    const real = buildSampleTimetable(SEMESTER);
    expect(real.semester.id.startsWith('semester_')).toBe(true);
    expect(real.subjects[0].id.startsWith('subject_')).toBe(true);
    expect(real.scheduleRules[0].id.startsWith('rule_')).toBe(true);
  });
});
