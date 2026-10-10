import { isValidDateKey } from '../utils/dates.js';

/**
 * Backup file format.
 *
 * This file has no browser or database code, so it can be tested directly.
 * backupService.js does the reading and writing.
 */

export const BACKUP_APP_ID = 'college-life-os';
export const BACKUP_FORMAT_VERSION = 1;
export const MAX_BACKUP_BYTES = 25 * 1024 * 1024;

// If one of these fields exists on a record, it must hold a real YYYY-MM-DD date.
const DATE_FIELDS = ['date', 'dueDate', 'startDate', 'endDate'];

// Long problem lists are cut short so the message stays readable.
const MAX_PROBLEMS_SHOWN = 12;

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isMissing(value) {
  return value === undefined || value === null;
}

function isWholeNumberAtLeast(value, minimum) {
  return Number.isInteger(value) && value >= minimum;
}

/** Builds the object that is written to the backup file. */
export function createBackupEnvelope({ stores, settings, schemaVersion, exportedAt }) {
  return {
    app: BACKUP_APP_ID,
    formatVersion: BACKUP_FORMAT_VERSION,
    schemaVersion,
    exportedAt,
    settings,
    stores,
  };
}

/** For example: college-life-os-backup-2026-10-09.json */
export function getBackupFilename(dateKey) {
  return 'college-life-os-backup-' + dateKey + '.json';
}

/** Reads the text of a file. Never throws. */
export function parseBackupText(text) {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, errors: ['The file is not valid JSON, so it cannot be a backup.'] };
  }
}

/**
 * Finds the unique indexes in a schema definition written like STORES_V1.
 * Returns for example: { habitCompletions: [['habitId', 'date']] }.
 */
export function getUniqueIndexes(storeDefinitions) {
  const result = {};
  Object.keys(storeDefinitions).forEach((storeName) => {
    const fieldLists = storeDefinitions[storeName]
      .filter((entry) => entry[2] && entry[2].unique)
      .map((entry) => (Array.isArray(entry[1]) ? entry[1] : [entry[1]]));
    if (fieldLists.length > 0) {
      result[storeName] = fieldLists;
    }
  });
  return result;
}

function checkRecords(storeName, records, uniqueFieldLists, problems) {
  const seenIds = new Set();
  const seenKeys = uniqueFieldLists.map(() => new Set());
  const clean = [];

  records.forEach((record, index) => {
    const where = storeName + ' #' + (index + 1);

    if (!isPlainObject(record)) {
      problems.push(where + ': record is not an object.');
      return;
    }
    if (typeof record.id !== 'string' || record.id.trim() === '') {
      problems.push(where + ': record has no id.');
      return;
    }
    if (seenIds.has(record.id)) {
      problems.push(where + ': duplicate id "' + record.id + '".');
      return;
    }
    const badDateField = DATE_FIELDS.find(
      (field) => !isMissing(record[field]) && !isValidDateKey(record[field])
    );
    if (badDateField) {
      problems.push(where + ': "' + badDateField + '" is not a valid date.');
      return;
    }

    let clashWith = null;
    uniqueFieldLists.forEach((fields, listIndex) => {
      if (clashWith || fields.some((field) => isMissing(record[field]))) return;
      const key = JSON.stringify(fields.map((field) => record[field]));
      if (seenKeys[listIndex].has(key)) {
        clashWith = fields;
      } else {
        seenKeys[listIndex].add(key);
      }
    });
    if (clashWith) {
      problems.push(where + ': same ' + clashWith.join(' + ') + ' as an earlier record.');
      return;
    }

    seenIds.add(record.id);
    clean.push(record);
  });

  return clean;
}

/**
 * Checks a parsed backup. Nothing should be written unless ok is true.
 *
 * options.knownStores: shelf names this app version understands.
 * options.maxSchemaVersion: the newest database version this app can read.
 * options.uniqueIndexes: output of getUniqueIndexes().
 */
export function validateBackup(raw, options) {
  const warnings = [];

  if (!isPlainObject(raw) || raw.app !== BACKUP_APP_ID) {
    return { ok: false, errors: ['This file is not a College Life OS backup.'], warnings };
  }

  const headerErrors = [];
  if (!isWholeNumberAtLeast(raw.formatVersion, 1)) {
    headerErrors.push('The backup has no valid format version.');
  } else if (raw.formatVersion > BACKUP_FORMAT_VERSION) {
    headerErrors.push(
      'This backup was made by a newer version of the app (format ' +
        raw.formatVersion +
        '). Update the app, then try again.'
    );
  }

  if (!isWholeNumberAtLeast(raw.schemaVersion, 1)) {
    headerErrors.push('The backup has no valid database version.');
  } else if (raw.schemaVersion > options.maxSchemaVersion) {
    headerErrors.push(
      'This backup comes from a newer database version (' +
        raw.schemaVersion +
        '). Update the app, then try again.'
    );
  }

  if (!isPlainObject(raw.stores)) {
    headerErrors.push('The backup has no "stores" section.');
  }
  if (!isMissing(raw.settings) && !isPlainObject(raw.settings)) {
    headerErrors.push('The settings section is not valid.');
  }
  if (headerErrors.length > 0) {
    return { ok: false, errors: headerErrors, warnings };
  }

  const knownStores = new Set(options.knownStores);
  const uniqueIndexes = options.uniqueIndexes || {};
  const problems = [];
  const cleanStores = {};

  Object.keys(raw.stores).forEach((storeName) => {
    if (!knownStores.has(storeName)) {
      warnings.push('Unknown shelf "' + storeName + '" was skipped.');
      return;
    }
    const records = raw.stores[storeName];
    if (!Array.isArray(records)) {
      problems.push(storeName + ': expected a list of records.');
      return;
    }
    cleanStores[storeName] = checkRecords(
      storeName,
      records,
      uniqueIndexes[storeName] || [],
      problems
    );
  });

  if (problems.length > 0) {
    const errors = problems.slice(0, MAX_PROBLEMS_SHOWN);
    if (problems.length > MAX_PROBLEMS_SHOWN) {
      errors.push('...and ' + (problems.length - MAX_PROBLEMS_SHOWN) + ' more problems.');
    }
    return { ok: false, errors, warnings };
  }

  const totalRecords = Object.keys(cleanStores).reduce(
    (sum, name) => sum + cleanStores[name].length,
    0
  );
  if (totalRecords === 0) {
    warnings.push('This backup contains no records.');
  }

  return {
    ok: true,
    errors: [],
    warnings,
    backup: {
      schemaVersion: raw.schemaVersion,
      exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : null,
      settings: isPlainObject(raw.settings) ? raw.settings : null,
      stores: cleanStores,
    },
  };
}

/** Counts records per shelf, for the preview screen. */
export function summarizeBackup(backup) {
  const counts = Object.keys(backup.stores).map((storeName) => ({
    store: storeName,
    count: backup.stores[storeName].length,
  }));
  const totalRecords = counts.reduce((sum, row) => sum + row.count, 0);
  return { totalRecords, counts };
}