import { getDb } from './database.js';

/**
 * Generic access to one store. Feature code uses this instead of
 * touching IndexedDB directly, so storage can change later (e.g. cloud sync).
 */
export function createRepository(storeName) {
  return {
    async getAll() {
      return (await getDb()).getAll(storeName);
    },
    async getById(id) {
      return (await getDb()).get(storeName, id);
    },
    async getAllByIndex(indexName, query) {
      return (await getDb()).getAllFromIndex(storeName, indexName, query);
    },
    async put(record) {
      if (!record || typeof record.id !== 'string') {
        throw new Error(storeName + ': record needs a string id');
      }
      await (await getDb()).put(storeName, record);
      return record;
    },
    async remove(id) {
      await (await getDb()).delete(storeName, id);
    },
    async count() {
      return (await getDb()).count(storeName);
    },
  };
}

// Ready-made repositories; more are added as features arrive
export const semestersRepo = createRepository('semesters');
export const subjectsRepo = createRepository('subjects');
export const scheduleRulesRepo = createRepository('scheduleRules');
export const habitsRepo = createRepository('habits');