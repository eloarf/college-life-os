/**
 * A tiny "something in the database changed" announcement.
 * Screens that show saved data listen here and reload themselves, so a
 * restored backup or an imported timetable appears without refreshing the page.
 */
const listeners = new Set();

export function subscribeDataChanged(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function notifyDataChanged() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // One broken listener must not stop the others
    }
  });
}
