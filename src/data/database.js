import { openDB } from 'idb';
import { DB_NAME, DB_VERSION, runMigrations } from './schema.js';

let dbPromise = null;

/** Opens (and if needed upgrades) the database. Cached after first success. */
export function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion) {
        runMigrations(db, oldVersion, newVersion);
      },
      blocking() {
        // Another tab needs to upgrade: close so it isn't stuck waiting
        dbPromise = null;
      },
    }).catch((error) => {
      dbPromise = null; // allow a retry on next call
      throw error;
    });
  }
  return dbPromise;
}

/** Asks the browser not to evict our data when storage is low. */
async function requestPersistence() {
  try {
    if (navigator.storage?.persist) {
      if (await navigator.storage.persisted()) return true;
      return await navigator.storage.persist();
    }
  } catch {
    // Not supported or denied: not fatal
  }
  return false;
}

/** Called once at startup. Returns info for the status stamp. */
export async function initDatabase() {
  const db = await getDb();
  const persisted = await requestPersistence();
  return {
    version: db.version,
    storeCount: db.objectStoreNames.length,
    persisted,
  };
}