/**
 * Clock-time helpers. Times are stored as 24-hour "HH:MM" strings
 * (for example "08:30" or "14:00") and only converted for display.
 */

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

function pad2(number) {
  return String(number).padStart(2, '0');
}

export function isValidTime(value) {
  return typeof value === 'string' && TIME_PATTERN.test(value);
}

/** "08:30" -> 510 (minutes since midnight) */
export function timeToMinutes(time) {
  if (!isValidTime(time)) {
    throw new Error('Invalid time: ' + String(time));
  }
  const parts = time.split(':').map(Number);
  return parts[0] * 60 + parts[1];
}

/** 510 -> "08:30". Accepts 0-1439. */
export function minutesToTime(minutes) {
  if (!Number.isInteger(minutes) || minutes < 0 || minutes > 1439) {
    throw new Error('Minutes must be a whole number from 0 to 1439: ' + String(minutes));
  }
  return pad2(Math.floor(minutes / 60)) + ':' + pad2(minutes % 60);
}

/** "13:30" -> "13:30" (24h) or "1:30 pm" (12h) */
export function formatTime(time, clockFormat = '24h') {
  const total = timeToMinutes(time);
  if (clockFormat !== '12h') return time;
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  const suffix = hours >= 12 ? 'pm' : 'am';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return hour12 + ':' + pad2(minutes) + ' ' + suffix;
}

/** True when both times are valid and the end is after the start. */
export function isValidTimeRange(startTime, endTime) {
  if (!isValidTime(startTime) || !isValidTime(endTime)) return false;
  return timeToMinutes(endTime) > timeToMinutes(startTime);
}

export function durationMinutes(startTime, endTime) {
  if (!isValidTimeRange(startTime, endTime)) {
    throw new Error('Invalid time range: ' + String(startTime) + ' to ' + String(endTime));
  }
  return timeToMinutes(endTime) - timeToMinutes(startTime);
}

/** Back-to-back ranges (one ends exactly when the next starts) do not overlap. */
export function timeRangesOverlap(startA, endA, startB, endB) {
  return (
    timeToMinutes(startA) < timeToMinutes(endB) &&
    timeToMinutes(startB) < timeToMinutes(endA)
  );
}

/** 134 -> "2h 14m", 60 -> "1h", 45 -> "45m" */
export function formatDuration(totalMinutes) {
  if (!Number.isInteger(totalMinutes) || totalMinutes < 0) {
    throw new Error('Duration must be a whole number of minutes: ' + String(totalMinutes));
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return minutes + 'm';
  if (minutes === 0) return hours + 'h';
  return hours + 'h ' + minutes + 'm';
}