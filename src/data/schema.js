/**
 * The single source of truth for the database structure.
 * To change the structure later: add a new migration at the bottom of
 * MIGRATIONS and raise DB_VERSION. Never edit an old migration.
 */
export const DB_NAME = 'college-life-os';
export const DB_VERSION = 1;

// Every store uses id as its key. Indexes make date lookups fast.
// Format: [indexName, keyPath, options]
export const STORES_V1 = {
  semesters: [],
  subjects: [['bySemester', 'semesterId']],
  scheduleRules: [
    ['bySubject', 'subjectId'],
    ['bySemester', 'semesterId'],
  ],
  scheduleExceptions: [
    ['byRule', 'ruleId'],
    ['byDate', 'date'],
  ],
  attendance: [
    ['byDate', 'date'],
    ['bySubject', 'subjectId'],
  ],
  assignments: [
    ['bySubject', 'subjectId'],
    ['byDueDate', 'dueDate'],
  ],
  exams: [
    ['bySubject', 'subjectId'],
    ['byDate', 'date'],
  ],
  topics: [['bySubject', 'subjectId']],
  studySessions: [
    ['byDate', 'date'],
    ['bySubject', 'subjectId'],
  ],
  habits: [],
  habitCompletions: [
    ['byHabit', 'habitId'],
    ['byDate', 'date'],
    ['byHabitAndDate', ['habitId', 'date'], { unique: true }],
  ],
  goals: [],
  projects: [],
  quests: [],
  // dedupeKey is unique so the same event can never award XP twice
  xpEvents: [
    ['byDate', 'date'],
    ['byDedupeKey', 'dedupeKey', { unique: true }],
  ],
  streakFreezes: [['byDate', 'date']],
  reminders: [['byDueAt', 'dueAt']],
  meta: [],
};

function createStores(db, definitions) {
  for (const [storeName, indexes] of Object.entries(definitions)) {
    if (db.objectStoreNames.contains(storeName)) continue;
    const store = db.createObjectStore(storeName, { keyPath: 'id' });
    for (const [indexName, keyPath, options] of indexes) {
      store.createIndex(indexName, keyPath, options);
    }
  }
}

// version number -> function that upgrades from (version - 1)
export const MIGRATIONS = {
  1: (db) => createStores(db, STORES_V1),
};

export function runMigrations(db, oldVersion, newVersion) {
  for (let v = oldVersion + 1; v <= newVersion; v += 1) {
    const migrate = MIGRATIONS[v];
    if (migrate) migrate(db);
  }
}