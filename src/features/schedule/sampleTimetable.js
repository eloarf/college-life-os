import { createId } from '../../utils/ids.js';
import {
  ValidationError,
  validateScheduleRule,
  validateSemester,
  validateSubject,
} from './scheduleModel.js';

/**
 * The Engineering Section 12 timetable, as an optional starting point.
 * Nothing here is built into the app's screens: it is only used when the
 * person presses the "load timetable" button, and every part of it can be
 * edited or deleted afterwards. Weekdays: 1 = Monday ... 5 = Friday.
 */
const SUBJECTS = [
  { key: 'ANTH', code: 'ANTH1002', name: 'Social Anthropology', color: 'blue', instructor: 'Lemma, Adugna' },
  { key: 'ENTR', code: 'ENTR1006', name: 'Entrepreneurship', color: 'orange', instructor: 'Elham, Derese' },
  { key: 'FLEN', code: 'FLEN1003', name: 'Communicative English Language Skills I', color: 'green', instructor: 'Fantahun, Alemu' },
  { key: 'GEES', code: 'GEES1005', name: 'Geography of Ethiopia and The horn', color: 'purple', instructor: 'Adugna, Endalew' },
  { key: 'MATH', code: 'MATH1007', name: 'Mathematics for Natural Science', color: 'teal', instructor: 'Anwar, Seid' },
  { key: 'PHIL', code: 'PHIL1009', name: 'Logic and Critical Thinking', color: 'pink', instructor: 'addisalem, Bekele' },
  { key: 'PSYC', code: 'PSYC1011', name: 'General Psychology', color: 'indigo', instructor: 'Mihret, Abraham' },
];

const CLASSES = [
  { subject: 'PSYC', weekday: 1, kind: 'lecture', startTime: '08:30', endTime: '10:20', location: 'B59-2-006' },
  { subject: 'ANTH', weekday: 1, kind: 'lecture', startTime: '13:30', endTime: '15:20', location: 'B59-3-010' },
  { subject: 'GEES', weekday: 2, kind: 'lecture', startTime: '10:30', endTime: '12:20', location: 'B59-1-008' },
  { subject: 'MATH', weekday: 2, kind: 'tutorial', startTime: '14:00', endTime: '16:50', location: 'B59-2-005' },
  { subject: 'ENTR', weekday: 3, kind: 'lecture', startTime: '10:30', endTime: '12:20', location: 'B59-4-008' },
  { subject: 'FLEN', weekday: 4, kind: 'lecture', startTime: '10:30', endTime: '12:20', location: 'B59-2-002' },
  { subject: 'PHIL', weekday: 4, kind: 'lecture', startTime: '13:30', endTime: '15:20', location: 'B59-2-003' },
  { subject: 'MATH', weekday: 5, kind: 'lecture', startTime: '08:30', endTime: '10:20', location: 'B59-1-007' },
  { subject: 'FLEN', weekday: 5, kind: 'tutorial', startTime: '14:00', endTime: '16:50', location: 'B59-4-008' },
];

function mustBeValid(result, what) {
  if (!result.ok) {
    throw new ValidationError('The sample ' + what + ' is not valid.', result.errors);
  }
  return result.value;
}

/**
 * Builds the records for a semester plus the sample subjects and weekly classes.
 * semesterInput is { name, startDate, endDate } (checked here).
 * makeId is only replaced in tests.
 */
export function buildSampleTimetable(semesterInput, makeId = createId) {
  const semester = {
    id: makeId('semester'),
    ...mustBeValid(validateSemester(semesterInput), 'semester'),
  };

  const subjectIdByKey = {};
  const subjects = SUBJECTS.map((item) => {
    const id = makeId('subject');
    subjectIdByKey[item.key] = id;
    const value = mustBeValid(
      validateSubject({
        semesterId: semester.id,
        code: item.code,
        name: item.name,
        color: item.color,
        instructor: item.instructor,
      }),
      'subject ' + item.code
    );
    return { id, ...value };
  });

  const scheduleRules = CLASSES.map((item) => {
    const subjectId = subjectIdByKey[item.subject];
    const value = mustBeValid(
      validateScheduleRule({
        subjectId,
        kind: item.kind,
        repeat: 'weekly',
        weekdays: [item.weekday],
        startTime: item.startTime,
        endTime: item.endTime,
        location: item.location,
      }),
      'class ' + item.subject
    );
    return { id: makeId('rule'), semesterId: semester.id, ...value };
  });

  return { semester, subjects, scheduleRules };
}
