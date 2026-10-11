import {
  addDays,
  compareDateKeys,
  diffDays,
  isValidDateKey,
  parseDateKey,
} from '../../utils/dates.js';
import { startOfWeek } from '../../utils/calendar.js';
import { isValidTime, isValidTimeRange } from '../../utils/time.js';

/**
 * The rules for semesters, subjects, class rules and one-day changes.
 *
 * Every validate function takes whatever the form (or an old backup) holds and returns
 *   { ok, errors, value }
 * errors is an object like { name: 'Give the semester a name.' } keyed by field,
 * and value is the cleaned-up record (or null when something is wrong).
 * This file has no React and no database code, so it can be tested directly.
 */

export const SUBJECT_COLORS = [
  { id: 'blue', label: 'Blue' },
  { id: 'indigo', label: 'Indigo' },
  { id: 'purple', label: 'Purple' },
  { id: 'pink', label: 'Pink' },
  { id: 'red', label: 'Red' },
  { id: 'orange', label: 'Orange' },
  { id: 'yellow', label: 'Yellow' },
  { id: 'green', label: 'Green' },
  { id: 'teal', label: 'Teal' },
  { id: 'gray', label: 'Gray' },
];
export const DEFAULT_SUBJECT_COLOR = 'blue';

export const CLASS_KINDS = [
  { id: 'lecture', label: 'Lecture', short: 'Lec' },
  { id: 'tutorial', label: 'Tutorial', short: 'Tut' },
  { id: 'lab', label: 'Lab', short: 'Lab' },
  { id: 'other', label: 'Other', short: 'Class' },
];
export const DEFAULT_CLASS_KIND = 'lecture';

export const REPEAT_OPTIONS = [
  { id: 'weekly', label: 'Every week' },
  { id: 'biweekly', label: 'Every 2 weeks' },
  { id: 'once', label: 'One time only' },
];
export const DEFAULT_REPEAT = 'weekly';

export const MAX_SEMESTER_DAYS = 400;

const COLOR_IDS = SUBJECT_COLORS.map((color) => color.id);
const KIND_IDS = CLASS_KINDS.map((kind) => kind.id);
const REPEAT_IDS = REPEAT_OPTIONS.map((option) => option.id);

/** Looks up a class type; unknown values show as "Other" instead of crashing. */
export function getClassKind(kindId) {
  return CLASS_KINDS.find((kind) => kind.id === kindId) || CLASS_KINDS[CLASS_KINDS.length - 1];
}

/** Thrown when code tries to save something that fails validation. */
export class ValidationError extends Error {
  constructor(message, errors) {
    super(message);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

function cleanText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function isBlank(value) {
  return value === undefined || value === null || value === '';
}

function isFilledText(value) {
  return typeof value === 'string' && value !== '';
}

function checkLength(errors, field, value, maxLength, label) {
  if (value.length > maxLength) {
    errors[field] = label + ' must be ' + maxLength + ' characters or fewer.';
  }
}

function finish(errors, value) {
  const ok = Object.keys(errors).length === 0;
  return { ok, errors, value: ok ? value : null };
}

/** Accepts a list of weekday numbers (0 = Sunday ... 6 = Saturday). Returns null if invalid. */
function normalizeWeekdays(list) {
  if (!Array.isArray(list)) return null;
  const unique = [];
  for (const day of list) {
    if (!Number.isInteger(day) || day < 0 || day > 6) return null;
    if (!unique.includes(day)) unique.push(day);
  }
  return unique.sort((a, b) => a - b);
}

export function validateSemester(input) {
  const source = input || {};
  const errors = {};
  const name = cleanText(source.name);
  const { startDate, endDate } = source;

  if (!name) {
    errors.name = 'Give the semester a name.';
  } else {
    checkLength(errors, 'name', name, 60, 'The name');
  }
  if (!isValidDateKey(startDate)) errors.startDate = 'Choose a valid start date.';
  if (!isValidDateKey(endDate)) errors.endDate = 'Choose a valid end date.';

  if (!errors.startDate && !errors.endDate) {
    if (compareDateKeys(endDate, startDate) <= 0) {
      errors.endDate = 'The end date must be after the start date.';
    } else if (diffDays(endDate, startDate) > MAX_SEMESTER_DAYS) {
      errors.endDate = 'A semester can be at most ' + MAX_SEMESTER_DAYS + ' days long.';
    }
  }
  return finish(errors, { name, startDate, endDate });
}

export function validateSubject(input) {
  const source = input || {};
  const errors = {};
  const code = cleanText(source.code);
  const name = cleanText(source.name);
  const instructor = cleanText(source.instructor);
  const notes = cleanText(source.notes);
  const color = isBlank(source.color) ? DEFAULT_SUBJECT_COLOR : source.color;

  if (!isFilledText(source.semesterId)) errors.semesterId = 'Choose a semester.';
  if (!code && !name) errors.name = 'Enter a course name or a course code.';
  checkLength(errors, 'code', code, 20, 'The course code');
  checkLength(errors, 'name', name, 80, 'The course name');
  checkLength(errors, 'instructor', instructor, 80, 'The instructor');
  checkLength(errors, 'notes', notes, 500, 'The notes');
  if (!COLOR_IDS.includes(color)) errors.color = 'Choose one of the colours.';

  return finish(errors, { semesterId: source.semesterId, code, name, instructor, color, notes });
}

export function validateScheduleRule(input) {
  const source = input || {};
  const errors = {};
  const kind = isBlank(source.kind) ? DEFAULT_CLASS_KIND : source.kind;
  const repeat = isBlank(source.repeat) ? DEFAULT_REPEAT : source.repeat;
  const location = cleanText(source.location);
  const instructor = cleanText(source.instructor);
  const notes = cleanText(source.notes);

  if (!isFilledText(source.subjectId)) errors.subjectId = 'Choose a subject.';
  if (!KIND_IDS.includes(kind)) errors.kind = 'Choose a class type.';
  if (!REPEAT_IDS.includes(repeat)) errors.repeat = 'Choose how often the class repeats.';
  checkLength(errors, 'location', location, 40, 'The room');
  checkLength(errors, 'instructor', instructor, 80, 'The instructor');
  checkLength(errors, 'notes', notes, 300, 'The notes');

  if (!isValidTime(source.startTime)) errors.startTime = 'Enter a start time.';
  if (!isValidTime(source.endTime)) errors.endTime = 'Enter an end time.';
  if (!errors.startTime && !errors.endTime && !isValidTimeRange(source.startTime, source.endTime)) {
    errors.endTime = 'The end time must be after the start time.';
  }

  let weekdays = [];
  let date = null;
  let biweeklyOffset = 0;
  if (repeat === 'once') {
    if (isValidDateKey(source.date)) {
      date = source.date;
    } else {
      errors.date = 'Choose the date of this class.';
    }
  } else if (REPEAT_IDS.includes(repeat)) {
    const days = normalizeWeekdays(source.weekdays);
    if (days === null || days.length === 0) {
      errors.weekdays = 'Choose at least one day of the week.';
    } else {
      weekdays = days;
    }
    if (repeat === 'biweekly' && source.biweeklyOffset === 1) biweeklyOffset = 1;
  }

  return finish(errors, {
    subjectId: source.subjectId,
    kind,
    repeat,
    weekdays,
    date,
    biweeklyOffset,
    startTime: source.startTime,
    endTime: source.endTime,
    location,
    instructor,
    notes,
  });
}

/** One class on one date: either cancelled, or moved to another time/room. */
export function validateScheduleException(input) {
  const source = input || {};
  const errors = {};
  const note = cleanText(source.note);
  const isChange = source.type === 'changed';

  if (!isFilledText(source.ruleId)) errors.ruleId = 'Choose a class.';
  if (!isValidDateKey(source.date)) errors.date = 'Choose a valid date.';
  if (source.type !== 'cancelled' && !isChange) errors.type = 'Choose cancelled or changed.';
  checkLength(errors, 'note', note, 300, 'The note');

  let newStartTime = null;
  let newEndTime = null;
  let newLocation = '';
  if (isChange) {
    newLocation = cleanText(source.newLocation);
    checkLength(errors, 'newLocation', newLocation, 40, 'The room');
    if (isFilledText(source.newStartTime) || isFilledText(source.newEndTime)) {
      if (isValidTimeRange(source.newStartTime, source.newEndTime)) {
        newStartTime = source.newStartTime;
        newEndTime = source.newEndTime;
      } else {
        errors.newEndTime = 'Enter a start and an end time, with the end after the start.';
      }
    }
    if (!newStartTime && !newLocation && !errors.newEndTime && !errors.newLocation) {
      errors.newLocation = 'Change the time or the room, or cancel the class instead.';
    }
  }

  return finish(errors, {
    ruleId: source.ruleId,
    date: source.date,
    type: source.type,
    newStartTime,
    newEndTime,
    newLocation,
    note,
  });
}

/** One change per class per day, so the id is built from both. */
export function makeExceptionId(ruleId, date) {
  return 'exception_' + ruleId + '_' + date;
}

/** Suggested dates for a new semester: this week's Monday, 17 weeks long. */
export function defaultSemesterDates(today) {
  const startDate = startOfWeek(today, 1);
  return { startDate, endDate: addDays(startDate, 17 * 7 - 1) };
}

/** Months August to December are Semester 1 of that academic year, the rest Semester 2. */
export function defaultSemesterName(today) {
  const { year, month } = parseDateKey(today);
  const firstYear = month >= 8 ? year : year - 1;
  const term = month >= 8 ? 'Semester 1' : 'Semester 2';
  const secondYear = String((firstYear + 1) % 100).padStart(2, '0');
  return firstYear + '/' + secondYear + ' — ' + term;
}
