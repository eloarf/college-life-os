import { WEEKDAY_NAMES, WEEKDAY_SHORT, compareDateKeys, diffDays, getWeekday, parseDateKey } from '../../utils/dates.js';
import { getWeekdayOrder, startOfWeek } from '../../utils/calendar.js';
import { formatDuration, formatTime, timeToMinutes } from '../../utils/time.js';
import { subjectTitle } from './scheduleEngine.js';

/** Words and groupings for the screens. No React and no database in here. */

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Wed 14 Oct" */
export function formatShortDate(dateKey) {
  const parts = parseDateKey(dateKey);
  return WEEKDAY_SHORT[getWeekday(dateKey)] + ' ' + parts.day + ' ' + MONTH_SHORT[parts.month - 1];
}

/** "5 Oct 2026" */
export function formatLongDate(dateKey) {
  const parts = parseDateKey(dateKey);
  return parts.day + ' ' + MONTH_SHORT[parts.month - 1] + ' ' + parts.year;
}

/** "08:30 – 10:20" or "8:30 am – 10:20 am" */
export function formatTimeRange(startTime, endTime, clockFormat) {
  return formatTime(startTime, clockFormat) + ' – ' + formatTime(endTime, clockFormat);
}

/** The line under "Next class", for example "Starts in 2h 5m" or "Tomorrow at 08:30". */
export function describeUpcoming(next, nowMinutes, clockFormat) {
  const occurrence = next.occurrence;
  if (next.state === 'ongoing') {
    return 'In progress · ends in ' + formatDuration(timeToMinutes(occurrence.endTime) - nowMinutes);
  }
  if (next.daysAway === 0) {
    return 'Starts in ' + formatDuration(timeToMinutes(occurrence.startTime) - nowMinutes);
  }
  const at = ' at ' + formatTime(occurrence.startTime, clockFormat);
  if (next.daysAway === 1) return 'Tomorrow' + at;
  return formatShortDate(next.date) + at;
}

function plural(count, word) {
  return count + ' ' + word + (count === 1 ? '' : 's');
}

/**
 * Where "today" sits inside a semester. Weeks are counted Monday to Sunday,
 * and the week the semester starts in is week 1.
 */
export function describeSemesterProgress(semester, today) {
  const firstWeek = startOfWeek(semester.startDate, 1);
  const totalWeeks = diffDays(startOfWeek(semester.endDate, 1), firstWeek) / 7 + 1;
  if (compareDateKeys(today, semester.startDate) < 0) {
    const days = diffDays(semester.startDate, today);
    return {
      state: 'upcoming',
      week: 0,
      totalWeeks,
      label: days === 1 ? 'Starts tomorrow' : 'Starts in ' + plural(days, 'day'),
    };
  }
  if (compareDateKeys(today, semester.endDate) > 0) {
    const days = diffDays(today, semester.endDate);
    return {
      state: 'ended',
      week: totalWeeks,
      totalWeeks,
      label: days === 1 ? 'Ended yesterday' : 'Ended ' + plural(days, 'day') + ' ago',
    };
  }
  const week = diffDays(startOfWeek(today, 1), firstWeek) / 7 + 1;
  return { state: 'active', week, totalWeeks, label: 'Week ' + week + ' of ' + totalWeeks };
}

/**
 * Which semester to show first: the one running today (newest if several),
 * else the next one to start, else the one that ended most recently.
 * semesters must be sorted newest first, as the engine returns them.
 */
export function pickDefaultSemester(semesters, today) {
  if (semesters.length === 0) return null;
  const running = semesters.find(
    (semester) =>
      compareDateKeys(semester.startDate, today) <= 0 && compareDateKeys(semester.endDate, today) >= 0
  );
  if (running) return running;
  const upcoming = semesters.filter((semester) => compareDateKeys(semester.startDate, today) > 0);
  if (upcoming.length > 0) return upcoming[upcoming.length - 1];
  return semesters[0];
}

/**
 * The repeating timetable for the "week at a glance" list: one entry per
 * weekday in display order, plus a separate list of one-time classes.
 */
export function buildWeeklyTimetable(rules, subjects, weekStartsOn = 1) {
  const subjectById = new Map(subjects.map((subject) => [subject.id, subject]));
  const sorted = rules
    .filter((rule) => subjectById.has(rule.subjectId))
    .map((rule) => ({ rule, subject: subjectById.get(rule.subjectId) }))
    .sort((a, b) => {
      if (a.rule.startTime !== b.rule.startTime) return a.rule.startTime < b.rule.startTime ? -1 : 1;
      const left = subjectTitle(a.subject);
      const right = subjectTitle(b.subject);
      if (left !== right) return left < right ? -1 : 1;
      return a.rule.id < b.rule.id ? -1 : 1;
    });

  const days = getWeekdayOrder(weekStartsOn).map((weekday) => ({
    weekday,
    name: WEEKDAY_NAMES[weekday],
    entries: sorted.filter((entry) => entry.rule.repeat !== 'once' && entry.rule.weekdays.includes(weekday)),
  }));

  const oneTime = sorted
    .filter((entry) => entry.rule.repeat === 'once')
    .sort((a, b) => {
      if (a.rule.date !== b.rule.date) return a.rule.date < b.rule.date ? -1 : 1;
      return a.rule.startTime < b.rule.startTime ? -1 : a.rule.startTime > b.rule.startTime ? 1 : 0;
    });

  return { days, oneTime };
}

