/** Stable unique ID, e.g. createId('habit') gives 'habit_3f2a...' */
export function createId(prefix) {
  let unique;
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    unique = crypto.randomUUID();
  } else {
    unique =
      Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }
  return prefix + '_' + unique;
}