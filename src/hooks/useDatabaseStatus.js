import { useEffect, useState } from 'react';
import { initDatabase } from '../data/database.js';

export function useDatabaseStatus() {
  const [status, setStatus] = useState({ state: 'loading' });

  useEffect(() => {
    let cancelled = false;
    initDatabase()
      .then((info) => {
        if (!cancelled) setStatus({ state: 'ready', ...info });
      })
      .catch((error) => {
        if (!cancelled) setStatus({ state: 'error', message: error.message });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return status;
}