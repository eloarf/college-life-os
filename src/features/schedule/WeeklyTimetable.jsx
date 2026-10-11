import { getClassKind } from './scheduleModel.js';
import { subjectTitle } from './scheduleEngine.js';
import { buildWeeklyTimetable, formatShortDate, formatTimeRange } from './scheduleView.js';

const DOT = ' · ';

function RuleRow({ rule, subject, clockFormat, showDate }) {
  const kind = getClassKind(rule.kind);
  const details = [rule.location, rule.instructor || subject.instructor].filter(Boolean).join(DOT);
  let repeatNote = '';
  if (rule.repeat === 'biweekly') {
    repeatNote = rule.biweeklyOffset === 1 ? 'Every 2 weeks (weeks 2, 4, 6 ...)' : 'Every 2 weeks (weeks 1, 3, 5 ...)';
  }
  return (
    <li className={'class-card class-card--upcoming sc--' + subject.color}>
      <div className="class-card__body">
        <div className="class-card__top">
          <h4 className="class-card__title">{subjectTitle(subject)}</h4>
        </div>
        {showDate && <p className="class-card__meta">{formatShortDate(rule.date)}</p>}
        <p className="class-card__time">
          {formatTimeRange(rule.startTime, rule.endTime, clockFormat)}
          {DOT}
          {kind.label}
        </p>
        {details && <p className="class-card__meta">{details}</p>}
        {repeatNote && <p className="class-card__meta">{repeatNote}</p>}
      </div>
    </li>
  );
}

/** The repeating timetable of one semester, grouped by weekday. */
export default function WeeklyTimetable({ rules, subjects, weekStartsOn, clockFormat }) {
  const timetable = buildWeeklyTimetable(rules, subjects, weekStartsOn);
  const busyDays = timetable.days.filter((day) => day.entries.length > 0);

  if (busyDays.length === 0 && timetable.oneTime.length === 0) {
    return <p>No classes in this semester yet.</p>;
  }

  return (
    <div className="stack">
      {busyDays.map((day) => (
        <section key={day.weekday} aria-label={day.name}>
          <h3 className="timetable-day__name">{day.name}</h3>
          <ul className="class-list">
            {day.entries.map((entry) => (
              <RuleRow
                key={entry.rule.id + '-' + day.weekday}
                rule={entry.rule}
                subject={entry.subject}
                clockFormat={clockFormat}
                showDate={false}
              />
            ))}
          </ul>
        </section>
      ))}

      {timetable.oneTime.length > 0 && (
        <section aria-label="One-time classes">
          <h3 className="timetable-day__name">One-time classes</h3>
          <ul className="class-list">
            {timetable.oneTime.map((entry) => (
              <RuleRow
                key={entry.rule.id}
                rule={entry.rule}
                subject={entry.subject}
                clockFormat={clockFormat}
                showDate
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
