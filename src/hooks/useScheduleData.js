import { useEffect, useMemo, useState } from 'react';
import { loadScheduleData } from '../data/scheduleRepository.js';
import { subscribeDataChanged } from '../data/changeEvents.js';
import { createScheduleEngine } from '../features/schedule/scheduleEngine.js';

/**
 * Loads the semesters, subjects and class rules and keeps them up to date.
 * Returns { status, engine, message }:
 *   status 'loading' - first load in progress (engine is null)
 *   status 'ready'   - engine can answer questions about any date
 *   status 'error'   - message says what went wrong (engine keeps the last good data if any)
 */
export function useScheduleData() {
  const [state, setState] = useState({ status: 'loading', data: null, message: '' });

  useEffect(() => {
    let stopped = false;
    let latestRequest = 0;

    function refresh() {
      latestRequest += 1;
      const thisRequest = latestRequest;
      loadScheduleData()
        .then((data) => {
          if (!stopped && thisRequest === latestRequest) {
            setState({ status: 'ready', data, message: '' });
          }
        })
        .catch((error) => {
          if (!stopped && thisRequest === latestRequest) {
            setState((previous) => ({
              status: 'error',
              data: previous.data,
              message: (error && error.message) || 'Unknown problem.',
            }));
          }
        });
    }

    refresh();
    const unsubscribe = subscribeDataChanged(refresh);
    return () => {
      stopped = true;
      unsubscribe();
    };
  }, []);

  const engine = useMemo(
    () => (state.data ? createScheduleEngine(state.data) : null),
    [state.data]
  );

  return { status: state.status, engine, message: state.message };
}
