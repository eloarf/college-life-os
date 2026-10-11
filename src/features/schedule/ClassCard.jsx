import { getClassKind } from './scheduleModel.js';
import { formatTimeRange } from './scheduleView.js';

const DOT = ' · ';

function badgeFor(occurrence, status) {
  if (status === 'cancelled') return 'Cancelled';
  if (status === 'ongoing') return 'Now';
  if (occurrence.status === 'changed') return 'Changed';
  if (status === 'finished') return 'Done';
  return '';
}

/**
 * One class on one day.
 * occurrence comes from the schedule engine; status is 'upcoming' | 'ongoing' |
 * 'finished' | 'cancelled' (from classStatus). dateText is an optional extra
 * line (such as a date) shown above the time.
 */
export default function ClassCard({ occurrence, status, clockFormat, dateText }) {
  const badge = badgeFor(occurrence, status);
  const kind = getClassKind(occurrence.kind);
  const details = [occurrence.location, occurrence.instructor].filter(Boolean).join(DOT);
  const showName = occurrence.subjectName && occurrence.subjectName !== occurrence.title;
  const wasMoved =
    occurrence.status === 'changed' &&
    (occurrence.startTime !== occurrence.originalStartTime ||
      occurrence.endTime !== occurrence.originalEndTime ||
      occurrence.location !== occurrence.originalLocation);

  return (
    <li className={'class-card sc--' + occurrence.color + ' class-card--' + status}>
      <div className="class-card__body">
        <div className="class-card__top">
          <h3 className="class-card__title">{occurrence.title}</h3>
          {badge && <span className="badge class-card__badge">{badge}</span>}
        </div>
        {dateText && <p className="class-card__meta">{dateText}</p>}
        <p className="class-card__time">
          {formatTimeRange(occurrence.startTime, occurrence.endTime, clockFormat)}
          {DOT}
          {kind.label}
        </p>
        {showName && <p className="class-card__meta">{occurrence.subjectName}</p>}
        {details && <p className="class-card__meta">{details}</p>}
        {wasMoved && (
          <p className="class-card__meta">
            {'Usually ' +
              formatTimeRange(occurrence.originalStartTime, occurrence.originalEndTime, clockFormat) +
              (occurrence.originalLocation ? DOT + occurrence.originalLocation : '')}
          </p>
        )}
        {occurrence.exceptionNote && <p className="class-card__meta">{occurrence.exceptionNote}</p>}
      </div>
    </li>
  );
}
