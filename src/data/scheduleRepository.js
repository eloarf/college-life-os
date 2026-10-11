import { getDb } from './database.js';
import { notifyDataChanged } from './changeEvents.js';
import { createId } from '../utils/ids.js';

/**
 * Saving and loading for semesters, subjects and class rules.
 * Screens call these functions and never touch IndexedDB directly.
 * Every successful save announces itself, so open screens reload by themselves.
 */

const SCHEDULE_STORES = ['semesters', 'subjects', 'scheduleRules', 'scheduleExceptions'];

/** Reads all four schedule shelves in ONE transaction, so the pieces always match each other. */
export async function loadScheduleData() {
  const db = await getDb();
  const tx = db.transaction(SCHEDULE_STORES, 'readonly');
  const pending = SCHEDULE_STORES.map((name) => tx.objectStore(name).getAll());
  const results = await Promise.all(pending);
  await tx.done;
  return {
    semesters: results[0],
    subjects: results[1],
    scheduleRules: results[2],
    exceptions: results[3],
  };
}

/** value must already be checked with validateSemester. */
export async function addSemester(value) {
  const db = await getDb();
  const record = { id: createId('semester'), ...value };
  await db.put('semesters', record);
  notifyDataChanged();
  return record;
}

/** value must already be checked with validateSubject. */
export async function addSubject(value) {
  const db = await getDb();
  const semester = await db.get('semesters', value.semesterId);
  if (!semester) {
    throw new Error('That semester no longer exists. Go back and choose another one.');
  }
  const record = { id: createId('subject'), ...value };
  await db.put('subjects', record);
  notifyDataChanged();
  return record;
}

/** value must already be checked with validateScheduleRule. */
export async function addScheduleRule(value) {
  const db = await getDb();
  const subject = await db.get('subjects', value.subjectId);
  if (!subject) {
    throw new Error('That subject no longer exists. Go back and choose another one.');
  }
  const record = { id: createId('rule'), semesterId: subject.semesterId, ...value };
  await db.put('scheduleRules', record);
  notifyDataChanged();
  return record;
}

/**
 * Saves a whole sample timetable (from buildSampleTimetable) in ONE transaction:
 * either everything is saved or nothing is. Refuses to run when a semester already
 * exists, so pressing the button twice can never create a double timetable.
 */
export async function importSampleTimetable(records) {
  const db = await getDb();
  if ((await db.count('semesters')) > 0) {
    throw new Error('You already have a semester, so the sample timetable was not loaded.');
  }
  const tx = db.transaction(['semesters', 'subjects', 'scheduleRules'], 'readwrite');
  const pending = [tx.objectStore('semesters').put(records.semester)];
  records.subjects.forEach((subject) => pending.push(tx.objectStore('subjects').put(subject)));
  records.scheduleRules.forEach((rule) => pending.push(tx.objectStore('scheduleRules').put(rule)));
  pending.push(tx.done);
  await Promise.all(pending);
  notifyDataChanged();
}
