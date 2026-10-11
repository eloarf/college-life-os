import { useEffect, useState } from 'react';
import { todayKey } from '../utils/dates.js';

/**
 * The current date and time, refreshed every 30 seconds and whenever the
 * phone's screen wakes up, so "Starts in 5m" and "today" never go stale.
 */
export function useClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const refresh = () => setNow(new Date());
    const timer = setInterval(refresh, 30000);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  return {
    today: todayKey(now),
    nowMinutes: now.getHours() * 60 + now.getMinutes(),
  };
}
