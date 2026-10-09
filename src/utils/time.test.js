import { describe, it, expect } from 'vitest';
import {
  durationMinutes,
  formatDuration,
  formatTime,
  isValidTime,
  isValidTimeRange,
  minutesToTime,
  timeRangesOverlap,
  timeToMinutes,
} from './time.js';

describe('time validation', () => {
  it('accepts valid 24-hour times', () => {
    expect(isValidTime('00:00')).toBe(true);
    expect(isValidTime('08:30')).toBe(true);
    expect(isValidTime('23:59')).toBe(true);
  });

  it('rejects invalid times', () => {
    expect(isValidTime('24:00')).toBe(false);
    expect(isValidTime('8:30')).toBe(false);
    expect(isValidTime('12:60')).toBe(false);
    expect(isValidTime('ab:cd')).toBe(false);
    expect(isValidTime(null)).toBe(false);
    expect(isValidTime(830)).toBe(false);
  });
});

describe('minutes conversion', () => {
  it('converts times to minutes', () => {
    expect(timeToMinutes('00:00')).toBe(0);
    expect(timeToMinutes('08:30')).toBe(510);
    expect(timeToMinutes('23:59')).toBe(1439);
  });

  it('converts minutes back to times', () => {
    expect(minutesToTime(0)).toBe('00:00');
    expect(minutesToTime(510)).toBe('08:30');
    expect(minutesToTime(1439)).toBe('23:59');
  });

  it('throws on bad input', () => {
    expect(() => timeToMinutes('25:00')).toThrow('Invalid time');
    expect(() => minutesToTime(1440)).toThrow('Minutes');
    expect(() => minutesToTime(-1)).toThrow('Minutes');
    expect(() => minutesToTime(1.5)).toThrow('Minutes');
  });
});

describe('formatTime', () => {
  it('shows 24-hour time by default', () => {
    expect(formatTime('08:30')).toBe('08:30');
    expect(formatTime('14:00', '24h')).toBe('14:00');
  });

  it('shows 12-hour time like the university timetable', () => {
    expect(formatTime('08:30', '12h')).toBe('8:30 am');
    expect(formatTime('13:30', '12h')).toBe('1:30 pm');
    expect(formatTime('16:50', '12h')).toBe('4:50 pm');
  });

  it('handles midnight and noon', () => {
    expect(formatTime('00:00', '12h')).toBe('12:00 am');
    expect(formatTime('12:00', '12h')).toBe('12:00 pm');
    expect(formatTime('12:05', '12h')).toBe('12:05 pm');
    expect(formatTime('23:59', '12h')).toBe('11:59 pm');
  });
});

describe('ranges and duration', () => {
  it('validates ranges', () => {
    expect(isValidTimeRange('08:30', '10:20')).toBe(true);
    expect(isValidTimeRange('10:20', '08:30')).toBe(false);
    expect(isValidTimeRange('10:20', '10:20')).toBe(false);
    expect(isValidTimeRange('10:20', 'later')).toBe(false);
  });

  it('measures real class lengths', () => {
    expect(durationMinutes('08:30', '10:20')).toBe(110);
    expect(durationMinutes('14:00', '16:50')).toBe(170);
  });

  it('throws on a backwards or empty range', () => {
    expect(() => durationMinutes('10:00', '09:00')).toThrow('Invalid time range');
    expect(() => durationMinutes('10:00', '10:00')).toThrow('Invalid time range');
  });
});

describe('overlap', () => {
  it('does not treat back-to-back classes as overlapping', () => {
    expect(timeRangesOverlap('08:30', '10:20', '10:20', '12:00')).toBe(false);
  });

  it('detects partial overlap, both ways round', () => {
    expect(timeRangesOverlap('08:30', '10:20', '10:00', '11:00')).toBe(true);
    expect(timeRangesOverlap('10:00', '11:00', '08:30', '10:20')).toBe(true);
  });

  it('detects one range inside another', () => {
    expect(timeRangesOverlap('08:00', '12:00', '09:00', '10:00')).toBe(true);
  });

  it('ignores separate ranges', () => {
    expect(timeRangesOverlap('08:00', '09:00', '13:00', '14:00')).toBe(false);
  });
});

describe('formatDuration', () => {
  it('formats minutes and hours', () => {
    expect(formatDuration(0)).toBe('0m');
    expect(formatDuration(45)).toBe('45m');
    expect(formatDuration(60)).toBe('1h');
    expect(formatDuration(134)).toBe('2h 14m');
  });

  it('rejects negative or fractional durations', () => {
    expect(() => formatDuration(-1)).toThrow('Duration');
    expect(() => formatDuration(1.5)).toThrow('Duration');
  });
});