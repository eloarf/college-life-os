const STORAGE_KEY = 'college-life-os:settings:v1';

export const DEFAULT_SETTINGS = {
  displayName: 'Fraole',
  weekStartsOn: 1, // 1 = Monday, 0 = Sunday
  clockFormat: '24h', // '24h' | '12h'
  theme: 'grand-hotel',
};

/** Never trust stored data: fall back to defaults for anything invalid. */
function sanitize(raw) {
  const input = raw && typeof raw === 'object' ? raw : {};
  const name =
    typeof input.displayName === 'string' ? input.displayName.trim().slice(0, 40) : '';
  return {
    displayName: name || DEFAULT_SETTINGS.displayName,
    weekStartsOn: input.weekStartsOn === 0 ? 0 : 1,
    clockFormat: input.clockFormat === '12h' ? '12h' : '24h',
    theme: DEFAULT_SETTINGS.theme,
  };
}

function load() {
  try {
    const text = localStorage.getItem(STORAGE_KEY);
    return sanitize(text ? JSON.parse(text) : null);
  } catch {
    return { ...DEFAULT_SETTINGS }; // corrupted JSON or storage blocked
  }
}

let cache = null;
const listeners = new Set();

export function getSettings() {
  if (!cache) cache = load();
  return cache;
}

export function updateSettings(patch) {
  cache = sanitize({ ...getSettings(), ...patch });
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // Storage full or blocked: settings still work for this session
  }
  listeners.forEach((listener) => listener());
  return cache;
}

export function subscribeSettings(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}