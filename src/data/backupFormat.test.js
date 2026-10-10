import { describe, it, expect } from 'vitest';
import {
  BACKUP_FORMAT_VERSION,
  createBackupEnvelope,
  getBackupFilename,
  getUniqueIndexes,
  parseBackupText,
  summarizeBackup,
  validateBackup,
} from './backupFormat.js';
import { STORES_V1 } from './schema.js';

const KNOWN_STORES = ['subjects', 'habitCompletions', 'xpEvents', 'meta'];
const UNIQUE_INDEXES = {
  habitCompletions: [['habitId', 'date']],
  xpEvents: [['dedupeKey']],
};

function makeBackup(overrides = {}) {
  return {
    app: 'college-life-os',
    formatVersion: 1,
    schemaVersion: 1,
    exportedAt: '2026-10-09T10:00:00.000Z',
    settings: { displayName: 'Fraole' },
    stores: {
      subjects: [{ id: 'subject_1', name: 'MATH1007' }],
      habitCompletions: [
        { id: 'completion_1', habitId: 'habit_1', date: '2026-10-09', quantity: 45 },
      ],
    },
    ...overrides,
  };
}

function run(raw, options = {}) {
  return validateBackup(raw, {
    knownStores: KNOWN_STORES,
    maxSchemaVersion: 1,
    uniqueIndexes: UNIQUE_INDEXES,
    ...options,
  });
}

function hasError(result, text) {
  return result.errors.some((line) => line.includes(text));
}

describe('parseBackupText', () => {
  it('reads valid JSON', () => {
    const result = parseBackupText('{"app":"x"}');
    expect(result.ok).toBe(true);
    expect(result.value.app).toBe('x');
  });

  it('explains broken JSON instead of throwing', () => {
    const result = parseBackupText('{this is not json');
    expect(result.ok).toBe(false);
    expect(hasError(result, 'not valid JSON')).toBe(true);
  });
});

describe('validateBackup: is this a backup at all?', () => {
  it('accepts a well-formed backup', () => {
    const result = run(makeBackup());
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('rejects values that are not backup objects', () => {
    expect(run(null).ok).toBe(false);
    expect(run([]).ok).toBe(false);
    expect(run('text').ok).toBe(false);
    expect(run({ app: 'some-other-app' }).ok).toBe(false);
    expect(hasError(run({ hello: 1 }), 'not a College Life OS backup')).toBe(true);
  });

  it('refuses a backup made by a newer app format', () => {
    const result = run(makeBackup({ formatVersion: 2 }));
    expect(result.ok).toBe(false);
    expect(hasError(result, 'newer version of the app')).toBe(true);
  });

  it('refuses a backup from a newer database version', () => {
    const result = run(makeBackup({ schemaVersion: 2 }));
    expect(result.ok).toBe(false);
    expect(hasError(result, 'newer database version')).toBe(true);
  });

  it('accepts a backup from an older database version', () => {
    const result = run(makeBackup({ schemaVersion: 1 }), { maxSchemaVersion: 3 });
    expect(result.ok).toBe(true);
  });

  it('rejects missing or invalid version numbers', () => {
    expect(run(makeBackup({ formatVersion: undefined })).ok).toBe(false);
    expect(run(makeBackup({ schemaVersion: 'one' })).ok).toBe(false);
  });

  it('rejects a backup with no stores section', () => {
    const result = run(makeBackup({ stores: undefined }));
    expect(result.ok).toBe(false);
    expect(hasError(result, 'no "stores" section')).toBe(true);
  });

  it('rejects settings that are not an object', () => {
    const result = run(makeBackup({ settings: 'dark' }));
    expect(result.ok).toBe(false);
  });
});

describe('validateBackup: records', () => {
  it('rejects a record with no id', () => {
    const result = run(makeBackup({ stores: { subjects: [{ name: 'MATH1007' }] } }));
    expect(result.ok).toBe(false);
    expect(hasError(result, 'subjects #1: record has no id')).toBe(true);
  });

  it('rejects a duplicate id inside one shelf', () => {
    const result = run(
      makeBackup({ stores: { subjects: [{ id: 'a', name: 'X' }, { id: 'a', name: 'Y' }] } })
    );
    expect(result.ok).toBe(false);
    expect(hasError(result, 'duplicate id "a"')).toBe(true);
  });

  it('allows the same id on two different shelves', () => {
    const result = run(makeBackup({ stores: { subjects: [{ id: 'same' }], meta: [{ id: 'same' }] } }));
    expect(result.ok).toBe(true);
  });

  it('rejects impossible dates', () => {
    const result = run(
      makeBackup({ stores: { habitCompletions: [{ id: 'c1', habitId: 'h1', date: '2026-02-30' }] } })
    );
    expect(result.ok).toBe(false);
    expect(hasError(result, '"date" is not a valid date')).toBe(true);
  });

  it('rejects records that are not objects', () => {
    const result = run(makeBackup({ stores: { subjects: ['MATH1007'] } }));
    expect(result.ok).toBe(false);
    expect(hasError(result, 'record is not an object')).toBe(true);
  });

  it('rejects a shelf that is not a list', () => {
    const result = run(makeBackup({ stores: { subjects: { id: 'x' } } }));
    expect(result.ok).toBe(false);
    expect(hasError(result, 'expected a list of records')).toBe(true);
  });

  it('refuses two habit check-ins for the same habit on the same day', () => {
    const result = run(
      makeBackup({
        stores: {
          habitCompletions: [
            { id: 'c1', habitId: 'habit_1', date: '2026-10-09' },
            { id: 'c2', habitId: 'habit_1', date: '2026-10-09' },
          ],
        },
      })
    );
    expect(result.ok).toBe(false);
    expect(hasError(result, 'same habitId + date as an earlier record')).toBe(true);
  });

  it('allows the same habit on different days', () => {
    const result = run(
      makeBackup({
        stores: {
          habitCompletions: [
            { id: 'c1', habitId: 'habit_1', date: '2026-10-09' },
            { id: 'c2', habitId: 'habit_1', date: '2026-10-10' },
          ],
        },
      })
    );
    expect(result.ok).toBe(true);
  });

  it('refuses duplicate XP event keys', () => {
    const result = run(
      makeBackup({
        stores: {
          xpEvents: [
            { id: 'x1', dedupeKey: 'class:2026-10-09:psyc' },
            { id: 'x2', dedupeKey: 'class:2026-10-09:psyc' },
          ],
        },
      })
    );
    expect(result.ok).toBe(false);
    expect(hasError(result, 'same dedupeKey as an earlier record')).toBe(true);
  });

  it('does not compare unique keys when a field is missing', () => {
    const result = run(
      makeBackup({
        stores: {
          habitCompletions: [
            { id: 'c1', habitId: 'habit_1' },
            { id: 'c2', habitId: 'habit_1' },
          ],
        },
      })
    );
    expect(result.ok).toBe(true);
  });

  it('skips unknown shelves with a warning and drops them', () => {
    const result = run(makeBackup({ stores: { subjects: [{ id: 's1' }], mystery: [{ id: 'm1' }] } }));
    expect(result.ok).toBe(true);
    expect(result.warnings.some((w) => w.includes('Unknown shelf "mystery"'))).toBe(true);
    expect(result.backup.stores.mystery).toBe(undefined);
  });

  it('caps a long problem list so the message stays readable', () => {
    const bad = Array.from({ length: 20 }, () => ({ name: 'no id' }));
    const result = run(makeBackup({ stores: { subjects: bad } }));
    expect(result.ok).toBe(false);
    expect(result.errors).toHaveLength(13);
    expect(result.errors[12].includes('and 8 more problems')).toBe(true);
  });
});

describe('validateBackup: what it hands back', () => {
  it('returns only the parts the restore step needs', () => {
    const result = run(makeBackup());
    expect(Object.keys(result.backup).sort()).toEqual([
      'exportedAt',
      'schemaVersion',
      'settings',
      'stores',
    ]);
  });

  it('uses null when settings are missing', () => {
    const result = run(makeBackup({ settings: undefined }));
    expect(result.ok).toBe(true);
    expect(result.backup.settings).toBe(null);
  });

  it('warns about a backup with no records but still accepts it', () => {
    const result = run(makeBackup({ stores: {} }));
    expect(result.ok).toBe(true);
    expect(result.warnings.some((w) => w.includes('no records'))).toBe(true);
  });
});

describe('envelope, summary and filename', () => {
  it('builds the envelope with the app identity', () => {
    const envelope = createBackupEnvelope({
      stores: {},
      settings: { displayName: 'Fraole' },
      schemaVersion: 1,
      exportedAt: '2026-10-09T10:00:00.000Z',
    });
    expect(envelope).toEqual({
      app: 'college-life-os',
      formatVersion: BACKUP_FORMAT_VERSION,
      schemaVersion: 1,
      exportedAt: '2026-10-09T10:00:00.000Z',
      settings: { displayName: 'Fraole' },
      stores: {},
    });
  });

  it('survives a trip through JSON text and still validates', () => {
    const envelope = createBackupEnvelope({
      stores: { subjects: [{ id: 'subject_1', name: 'MATH1007' }] },
      settings: { displayName: 'Fraole' },
      schemaVersion: 1,
      exportedAt: '2026-10-09T10:00:00.000Z',
    });
    const parsed = parseBackupText(JSON.stringify(envelope, null, 2));
    const result = run(parsed.value);
    expect(result.ok).toBe(true);
    expect(result.backup.stores.subjects[0].name).toBe('MATH1007');
  });

  it('counts records per shelf', () => {
    const summary = summarizeBackup({ stores: { a: [{}, {}], b: [] } });
    expect(summary.totalRecords).toBe(2);
    expect(summary.counts).toEqual([
      { store: 'a', count: 2 },
      { store: 'b', count: 0 },
    ]);
  });

  it('builds a dated filename', () => {
    expect(getBackupFilename('2026-10-09')).toBe('college-life-os-backup-2026-10-09.json');
  });
});

describe('unique indexes come from the real schema', () => {
  it('finds the unique fields in schema.js', () => {
    expect(getUniqueIndexes(STORES_V1)).toEqual({
      habitCompletions: [['habitId', 'date']],
      xpEvents: [['dedupeKey']],
    });
  });

  it('ignores indexes that are not unique', () => {
    expect(getUniqueIndexes({ subjects: [['bySemester', 'semesterId']] })).toEqual({});
  });
});