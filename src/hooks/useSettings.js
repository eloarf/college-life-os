import { useSyncExternalStore } from 'react';
import {
  getSettings,
  subscribeSettings,
  updateSettings,
} from '../data/settingsStore.js';

export function useSettings() {
  const settings = useSyncExternalStore(subscribeSettings, getSettings);
  return [settings, updateSettings];
}