import { getDb } from './database.js';
import { STORES_V1, DB_VERSION } from './schema.js';
import { getSettings, updateSettings } from './settingsStore.js';
import {
  createBackupEnvelope,
  getBackupFilename,
  getUniqueIndexes,
  MAX_BACKUP_BYTES,
  parseBackupText,
  summarizeBackup,
  validateBackup,
} from './backupFormat.js';
import { todayKey } from '../utils/dates.js';

/** Every shelf the database has, in the order defined in schema.js. */
export const STORE_NAMES = Object.keys(STORES_V1);
const UNIQUE_INDEXES = getUniqueIndexes(STORES_V1);

const ignoreError = () => {};

/** Reads every shelf plus the settings into one plain object. */
export async function buildBackup(now = new Date()) {
  const db = await getDb();
  const tx = db.transaction(STORE_NAMES, 'readonly');
  const pending = STORE_NAMES.map((name) => tx.objectStore(name).getAll());
  const results = await Promise.all(pending);
  await tx.done;

  const stores = {};
  STORE_NAMES.forEach((name, index) => {
    stores[name] = results[index];
  });

  return createBackupEnvelope({
    stores,
    settings: getSettings(),
    schemaVersion: DB_VERSION,
    exportedAt: now.toISOString(),
  });
}

/** Starts a browser download of the full backup. Returns counts for the message. */
export async function downloadBackup() {
  const envelope = await buildBackup();
  const json = JSON.stringify(envelope, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = getBackupFilename(todayKey());
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  return summarizeBackup(envelope);
}

/** Reads and checks a backup file the user picked. Nothing is saved here. */
export async function readBackupFile(file) {
  if (!file) {
    return { ok: false, errors: ['No file was chosen.'], warnings: [] };
  }
  if (file.size > MAX_BACKUP_BYTES) {
    return {
      ok: false,
      errors: ['That file is bigger than 25 MB. A normal backup is much smaller, so it is probably not one.'],
      warnings: [],
    };
  }
  const text = await file.text();
  const parsed = parseBackupText(text);
  if (!parsed.ok) {
    return { ok: false, errors: parsed.errors, warnings: [] };
  }
  return validateBackup(parsed.value, {
    knownStores: STORE_NAMES,
    maxSchemaVersion: DB_VERSION,
    uniqueIndexes: UNIQUE_INDEXES,
  });
}

/**
 * Replaces the contents of every shelf that appears in the backup.
 * All shelves are written in ONE transaction, so if anything fails nothing changes.
 */
export async function restoreBackup(backup) {
  const shelves = Object.keys(backup.stores).filter((name) => STORE_NAMES.includes(name));
  if (shelves.length === 0) {
    throw new Error('The backup has no shelves to restore.');
  }

  const db = await getDb();
  const tx = db.transaction(shelves, 'readwrite');
  let recordsRestored = 0;

  shelves.forEach((name) => {
    const store = tx.objectStore(name);
    store.clear().catch(ignoreError);
    backup.stores[name].forEach((record) => {
      store.put(record).catch(ignoreError);
      recordsRestored += 1;
    });
  });

  try {
    await tx.done;
  } catch (error) {
    const reason =
      error && error.name === 'ConstraintError'
        ? 'two records clash with each other.'
        : (error && error.message) || 'the browser stopped the save.';
      throw new Error('Restore was stopped and nothing was changed: ' + reason, {
      cause: error,
    });
  }

  // Settings are saved only after the database write succeeded.
  if (backup.settings) {
    updateSettings(backup.settings);
  }
  return { shelvesRestored: shelves.length, recordsRestored };
}

/** Writes, reads back and deletes one test record. Returns true when it works. */
export async function runStorageSelfTest() {
  const db = await getDb();
  const id = 'selftest_' + Date.now();
  await db.put('meta', { id, purpose: 'storage-self-test', createdAt: new Date().toISOString() });
  const readBack = await db.get('meta', id);
  await db.delete('meta', id);
  return Boolean(readBack && readBack.id === id);
}