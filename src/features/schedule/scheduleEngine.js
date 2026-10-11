import { addDays, compareDateKeys, diffDays, getWeekday, isValidDateKey } from '../../utils/dates.js';
import { startOfWeek } from '../../utils/calendar.js';
import { timeToMinutes } from '../../utils/time.js';
import {
  SUBJECT_COLORS,
  validateScheduleException,
  validateScheduleRule,
} from './scheduleModel.js';

/**
 * Turns the saved records into "what is on this day".
 *
 * Only the repeating RULES are saved (for example "Monday 08:30, every week").
 * The classes of a given date are worked out here on demand, so there are no
 * thousands of saved class records, and changing a rule changes every week at once.
 *
 * The engine never trusts the database: records that are damaged or point to
 * something that no longer exists are skipped and counted in skippedCount.
 */

const COLOR_IDS = SUBJECT_COLORS.map((color) => color.id);
const FALLBACK_COLOR = 'gray';

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && typeof value.id === 'string' && value.id !== '';
}

function text(value) {
  return typeof value === 'string' ? value : '';
}

function byStartThenName(a, b) {
  if (a.startTime !== b.startTime) return a.startTime < b.startTime ? -1 : 1;
  if (a.endTime !== b.endTime) return a.endTime < b.endTime ? -1 : 1;
  if (a.title !== b.title) return a.title < b.title ? -1 : 1;
  if (a.ruleId !== b.ruleId) return a.ruleId < b.ruleId ? -1 : 1;
  return 0;
}

/** The name shown for a subject: its code if it has one, otherwise its name. */
export function subjectTitle(subject) {
  return subject.code || subject.name || 'Untitled subject';
}

/**
 * Does this rule have a class on this date?
 * Weeks always start on Monday here, so changing the "week starts on"
 * setting never moves a class to another week.
 * A one-time class shows on its own date even if that is outside the semester.
 */
export function ruleOccursOn(rule, semester, date) {
  if (rule.repeat === 'once') return rule.date === date;
  if (compareDateKeys(date, semester.startDate) < 0) return false;
  if (compareDateKeys(date, semester.endDate) > 0) return false;
  if (!rule.weekdays.includes(getWeekday(date))) return false;
  if (rule.repeat === 'biweekly') {
    const weeksSinceStart =
      diffDays(startOfWeek(date, 1), startOfWeek(semester.startDate, 1)) / 7;
    return (weeksSinceStart + rule.biweeklyOffset) % 2 === 0;
  }
  return true;
}

/** 'cancelled' | 'upcoming' | 'ongoing' | 'finished' for one class on one date. */
export function classStatus(occurrence, today, nowMinutes) {
  if (occurrence.status === 'cancelled') return 'cancelled';
  const order = compareDateKeys(occurrence.date, today);
  if (order < 0) return 'finished';
  if (order > 0) return 'upcoming';
  if (nowMinutes < timeToMinutes(occurrence.startTime)) return 'upcoming';
  if (nowMinutes < timeToMinutes(occurrence.endTime)) return 'ongoing';
  return 'finished';
}

export function createScheduleEngine(data) {
  const input = data || {};
  let skippedCount = 0;

  const semesters = [];
  (Array.isArray(input.semesters) ? input.semesters : []).forEach((record) => {
    if (
      isRecord(record) &&
      isValidDateKey(record.startDate) &&
      isValidDateKey(record.endDate) &&
      compareDateKeys(record.startDate, record.endDate) <= 0
    ) {
      semesters.push({
        id: record.id,
        name: text(record.name).trim() || 'Untitled semester',
        startDate: record.startDate,
        endDate: record.endDate,
      });
    } else {
      skippedCount += 1;
    }
  });
  // Newest first; ties broken by id so the order is always the same
  semesters.sort((a, b) => {
    if (a.startDate !== b.startDate) return a.startDate < b.startDate ? 1 : -1;
    return a.id < b.id ? -1 : 1;
  });
  const semesterById = new Map(semesters.map((semester) => [semester.id, semester]));

  const subjects = [];
  (Array.isArray(input.subjects) ? input.subjects : []).forEach((record) => {
    if (isRecord(record) && semesterById.has(record.semesterId)) {
      subjects.push({
        id: record.id,
        semesterId: record.semesterId,
        code: text(record.code).trim(),
        name: text(record.name).trim(),
        instructor: text(record.instructor).trim(),
        color: COLOR_IDS.includes(record.color) ? record.color : FALLBACK_COLOR,
        notes: text(record.notes).trim(),
      });
    } else {
      skippedCount += 1;
    }
  });
  subjects.sort((a, b) => {
    const left = subjectTitle(a).toLowerCase();
    const right = subjectTitle(b).toLowerCase();
    if (left !== right) return left < right ? -1 : 1;
    return a.id < b.id ? -1 : 1;
  });
  const subjectById = new Map(subjects.map((subject) => [subject.id, subject]));

  const rules = [];
  (Array.isArray(input.scheduleRules) ? input.scheduleRules : []).forEach((record) => {
    if (!isRecord(record) || !subjectById.has(record.subjectId)) {
      skippedCount += 1;
      return;
    }
    const checked = validateScheduleRule(record);
    if (!checked.ok) {
      skippedCount += 1;
      return;
    }
    rules.push({
      ...checked.value,
      id: record.id,
      semesterId: subjectById.get(record.subjectId).semesterId,
    });
  });
  rules.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  // One change per class per day. If a backup holds two, the later id wins.
  const exceptionByKey = new Map();
  const ruleIds = new Set(rules.map((rule) => rule.id));
  const rawExceptions = Array.isArray(input.exceptions) ? input.exceptions : [];
  const exceptionRecords = rawExceptions.filter(isRecord);
  skippedCount += rawExceptions.length - exceptionRecords.length;
  exceptionRecords.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  exceptionRecords.forEach((record) => {
    const checked = validateScheduleException(record);
    if (!checked.ok || !ruleIds.has(checked.value.ruleId)) {
      skippedCount += 1;
      return;
    }
    exceptionByKey.set(checked.value.ruleId + '|' + checked.value.date, {
      ...checked.value,
      id: record.id,
    });
  });

  const ruleById = new Map(rules.map((rule) => [rule.id, rule]));

  function buildOccurrence(rule, date) {
    const subject = subjectById.get(rule.subjectId);
    const exception = exceptionByKey.get(rule.id + '|' + date) || null;
    let status = 'normal';
    let startTime = rule.startTime;
    let endTime = rule.endTime;
    let location = rule.location;
    if (exception && exception.type === 'cancelled') {
      status = 'cancelled';
    } else if (exception) {
      status = 'changed';
      if (exception.newStartTime) {
        startTime = exception.newStartTime;
        endTime = exception.newEndTime;
      }
      if (exception.newLocation) location = exception.newLocation;
    }
    return {
      key: rule.id + '@' + date,
      ruleId: rule.id,
      subjectId: subject.id,
      date,
      title: subjectTitle(subject),
      subjectName: subject.name,
      color: subject.color,
      kind: rule.kind,
      startTime,
      endTime,
      location,
      instructor: rule.instructor || subject.instructor,
      notes: rule.notes,
      status,
      originalStartTime: rule.startTime,
      originalEndTime: rule.endTime,
      originalLocation: rule.location,
      exceptionNote: exception ? exception.note : '',
      isOneTime: rule.repeat === 'once',
    };
  }

  function occurrencesOn(date) {
    if (!isValidDateKey(date)) return [];
    const found = [];
    rules.forEach((rule) => {
      const semester = semesterById.get(rule.semesterId);
      if (semester && ruleOccursOn(rule, semester, date)) {
        found.push(buildOccurrence(rule, date));
      }
    });
    return found.sort(byStartThenName);
  }

  /**
   * The class in progress, or else the next one that has not been cancelled.
   * Looks lookaheadDays days ahead. Returns null when there is none.
   */
  function findNextClass(today, nowMinutes, lookaheadDays = 14) {
    if (!isValidDateKey(today)) return null;
    for (let offset = 0; offset <= lookaheadDays; offset += 1) {
      const date = addDays(today, offset);
      const candidates = occurrencesOn(date).filter((occurrence) => {
        if (occurrence.status === 'cancelled') return false;
        return offset > 0 || timeToMinutes(occurrence.endTime) > nowMinutes;
      });
      if (candidates.length > 0) {
        const occurrence = candidates[0];
        const started = offset === 0 && timeToMinutes(occurrence.startTime) <= nowMinutes;
        return { occurrence, date, daysAway: offset, state: started ? 'ongoing' : 'upcoming' };
      }
    }
    return null;
  }

  return {
    semesters,
    subjects,
    rules,
    skippedCount,
    semesterById: (id) => semesterById.get(id) || null,
    subjectById: (id) => subjectById.get(id) || null,
    ruleById: (id) => ruleById.get(id) || null,
    subjectsForSemester: (id) => subjects.filter((subject) => subject.semesterId === id),
    rulesForSemester: (id) => rules.filter((rule) => rule.semesterId === id),
    occurrencesOn,
    findNextClass,
  };
}
