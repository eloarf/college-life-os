import { Link } from 'react-router-dom';
import ComingSoon from '../../components/ComingSoon.jsx';
import ClassCard from './ClassCard.jsx';
import { classStatus } from './scheduleEngine.js';
import { describeUpcoming } from './scheduleView.js';
import { useScheduleData } from '../../hooks/useScheduleData.js';
import { useClock } from '../../hooks/useClock.js';
import { useSettings } from '../../hooks/useSettings.js';

const SCHOOL_BAG = '🎒';
const SUNNY = '☀️';
const ELLIPSIS = '…';

function SetupPrompt({ title, children }) {
  return (
    <div className="stack">
      <ComingSoon emoji={SCHOOL_BAG} title={title}>
        {children}
      </ComingSoon>
      <div className="button-row">
        <Link to="/university" className="button">
          Set up timetable
        </Link>
      </div>
    </div>
  );
}

/** The body of the "Today's schedule" card on the Home page. */
export default function TodayClasses() {
  const { status, engine, message } = useScheduleData();
  const { today, nowMinutes } = useClock();
  const [settings] = useSettings();

  if (status === 'error') {
    return (
      <div className="notice notice--error" role="alert">
        <p>The timetable could not be loaded. {message}</p>
      </div>
    );
  }
  if (status === 'loading' || !engine) {
    return (
      <p className="eyebrow" role="status">
        {'Opening the timetable' + ELLIPSIS}
      </p>
    );
  }
  if (engine.semesters.length === 0) {
    return (
      <SetupPrompt title="Your timetable isn't set up yet">
        Add a semester and your weekly classes, and they will appear here.
      </SetupPrompt>
    );
  }
  if (engine.rules.length === 0) {
    return (
      <SetupPrompt title="No classes added yet">
        Add your weekly classes on the University page and they will appear here.
      </SetupPrompt>
    );
  }

  const classes = engine.occurrencesOn(today);
  const next = engine.findNextClass(today, nowMinutes);
  const activeCount = classes.filter((item) => item.status !== 'cancelled').length;

  let nextLine = null;
  if (next) {
    nextLine =
      'Next: ' + next.occurrence.title + ' · ' + describeUpcoming(next, nowMinutes, settings.clockFormat);
  }

  return (
    <div className="stack">
      {classes.length === 0 ? (
        <div className="empty">
          <span className="empty__emoji" aria-hidden="true">
            {SUNNY}
          </span>
          <h3>No classes today</h3>
          <p>{next ? 'Enjoy the free day.' : 'Nothing is scheduled in the next two weeks.'}</p>
        </div>
      ) : (
        <>
          <p className="eyebrow">
            {activeCount === 1 ? '1 class today' : activeCount + ' classes today'}
          </p>
          <ul className="class-list">
            {classes.map((item) => (
              <ClassCard
                key={item.key}
                occurrence={item}
                status={classStatus(item, today, nowMinutes)}
                clockFormat={settings.clockFormat}
              />
            ))}
          </ul>
        </>
      )}

      {nextLine && (
        <p className="next-line" role="status">
          {nextLine}
        </p>
      )}

      {engine.skippedCount > 0 && (
        <p className="eyebrow">
          {engine.skippedCount +
            (engine.skippedCount === 1 ? ' saved item was' : ' saved items were') +
            ' unreadable and ignored.'}
        </p>
      )}
    </div>
  );
}
