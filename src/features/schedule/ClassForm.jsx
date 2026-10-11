import { useState } from 'react';
import FieldError from './FieldError.jsx';
import { addScheduleRule } from '../../data/scheduleRepository.js';
import { WEEKDAY_SHORT } from '../../utils/dates.js';
import { getWeekdayOrder } from '../../utils/calendar.js';
import {
  CLASS_KINDS,
  DEFAULT_CLASS_KIND,
  DEFAULT_REPEAT,
  REPEAT_OPTIONS,
  validateScheduleRule,
} from './scheduleModel.js';

function subjectLabel(subject) {
  if (subject.code && subject.name) return subject.code + ' – ' + subject.name;
  return subject.code || subject.name || 'Untitled subject';
}

/**
 * Adds a repeating (or one-time) class for one of the semester's subjects.
 * subjects must not be empty. weekStartsOn decides the order of the day buttons.
 */
export default function ClassForm({ subjects, weekStartsOn, onSaved, onCancel }) {
  const [values, setValues] = useState(() => ({
    subjectId: subjects.length > 0 ? subjects[0].id : '',
    kind: DEFAULT_CLASS_KIND,
    repeat: DEFAULT_REPEAT,
    weekdays: [],
    biweeklyOffset: 0,
    date: '',
    startTime: '',
    endTime: '',
    location: '',
    instructor: '',
    notes: '',
  }));
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  function change(field, value) {
    setValues((previous) => ({ ...previous, [field]: value }));
  }

  function toggleWeekday(day) {
    setValues((previous) => {
      const has = previous.weekdays.includes(day);
      const weekdays = has
        ? previous.weekdays.filter((item) => item !== day)
        : [...previous.weekdays, day];
      return { ...previous, weekdays };
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (busy) return;
    const result = validateScheduleRule(values);
    setErrors(result.errors);
    setFormError('');
    if (!result.ok) return;
    setBusy(true);
    try {
      const record = await addScheduleRule(result.value);
      if (onSaved) onSaved(record);
    } catch (error) {
      setFormError('The class could not be saved. ' + error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="stack" onSubmit={handleSubmit} noValidate aria-label="New class">
      <div className="field">
        <label htmlFor="class-subject">Subject</label>
        <select
          id="class-subject"
          className="input"
          value={values.subjectId}
          onChange={(e) => change('subjectId', e.target.value)}
          aria-invalid={errors.subjectId ? 'true' : undefined}
          aria-describedby={errors.subjectId ? 'class-subject-error' : undefined}
        >
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subjectLabel(subject)}
            </option>
          ))}
        </select>
        <FieldError id="class-subject-error" message={errors.subjectId} />
      </div>

      <div className="field">
        <label htmlFor="class-kind">Type</label>
        <select
          id="class-kind"
          className="input"
          value={values.kind}
          onChange={(e) => change('kind', e.target.value)}
        >
          {CLASS_KINDS.map((kind) => (
            <option key={kind.id} value={kind.id}>
              {kind.label}
            </option>
          ))}
        </select>
        <FieldError message={errors.kind} />
      </div>

      <div className="field">
        <label htmlFor="class-repeat">How often</label>
        <select
          id="class-repeat"
          className="input"
          value={values.repeat}
          onChange={(e) => change('repeat', e.target.value)}
        >
          {REPEAT_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
        <FieldError message={errors.repeat} />
      </div>

      {values.repeat === 'once' ? (
        <div className="field">
          <label htmlFor="class-date">Date</label>
          <input
            id="class-date"
            className="input"
            type="date"
            value={values.date}
            onChange={(e) => change('date', e.target.value)}
            aria-invalid={errors.date ? 'true' : undefined}
            aria-describedby={errors.date ? 'class-date-error' : undefined}
          />
          <FieldError id="class-date-error" message={errors.date} />
        </div>
      ) : (
        <fieldset className="field">
          <legend>Days</legend>
          <div className="day-picker">
            {getWeekdayOrder(weekStartsOn).map((day) => (
              <label
                key={day}
                className={'day-chip' + (values.weekdays.includes(day) ? ' is-selected' : '')}
              >
                <input
                  type="checkbox"
                  className="visually-hidden"
                  checked={values.weekdays.includes(day)}
                  onChange={() => toggleWeekday(day)}
                />
                <span>{WEEKDAY_SHORT[day]}</span>
              </label>
            ))}
          </div>
          <FieldError message={errors.weekdays} />
        </fieldset>
      )}

      {values.repeat === 'biweekly' && (
        <div className="field">
          <label htmlFor="class-offset">Which weeks</label>
          <select
            id="class-offset"
            className="input"
            value={String(values.biweeklyOffset)}
            onChange={(e) => change('biweeklyOffset', Number(e.target.value))}
          >
            <option value="0">Weeks 1, 3, 5 ... of the semester</option>
            <option value="1">Weeks 2, 4, 6 ... of the semester</option>
          </select>
        </div>
      )}

      <div className="field">
        <label htmlFor="class-start">Starts</label>
        <input
          id="class-start"
          className="input"
          type="time"
          value={values.startTime}
          onChange={(e) => change('startTime', e.target.value)}
          aria-invalid={errors.startTime ? 'true' : undefined}
          aria-describedby={errors.startTime ? 'class-start-error' : undefined}
        />
        <FieldError id="class-start-error" message={errors.startTime} />
      </div>

      <div className="field">
        <label htmlFor="class-end">Ends</label>
        <input
          id="class-end"
          className="input"
          type="time"
          value={values.endTime}
          onChange={(e) => change('endTime', e.target.value)}
          aria-invalid={errors.endTime ? 'true' : undefined}
          aria-describedby={errors.endTime ? 'class-end-error' : undefined}
        />
        <FieldError id="class-end-error" message={errors.endTime} />
      </div>

      <div className="field">
        <label htmlFor="class-location">Room (optional)</label>
        <input
          id="class-location"
          className="input"
          type="text"
          maxLength={40}
          value={values.location}
          onChange={(e) => change('location', e.target.value)}
          aria-invalid={errors.location ? 'true' : undefined}
          aria-describedby={errors.location ? 'class-location-error' : undefined}
        />
        <FieldError id="class-location-error" message={errors.location} />
      </div>

      <div className="field">
        <label htmlFor="class-instructor">Instructor for this class (optional)</label>
        <input
          id="class-instructor"
          className="input"
          type="text"
          maxLength={80}
          value={values.instructor}
          onChange={(e) => change('instructor', e.target.value)}
          aria-invalid={errors.instructor ? 'true' : undefined}
          aria-describedby={errors.instructor ? 'class-instructor-error' : undefined}
        />
        <FieldError id="class-instructor-error" message={errors.instructor} />
      </div>

      <div className="field">
        <label htmlFor="class-notes">Notes (optional)</label>
        <textarea
          id="class-notes"
          className="input"
          rows={2}
          maxLength={300}
          value={values.notes}
          onChange={(e) => change('notes', e.target.value)}
          aria-invalid={errors.notes ? 'true' : undefined}
          aria-describedby={errors.notes ? 'class-notes-error' : undefined}
        />
        <FieldError id="class-notes-error" message={errors.notes} />
      </div>

      {formError && (
        <div className="notice notice--error" role="alert">
          <p>{formError}</p>
        </div>
      )}

      <div className="button-row">
        <button type="submit" className="button" disabled={busy}>
          {busy ? 'Saving...' : 'Save class'}
        </button>
        {onCancel && (
          <button type="button" className="button button--secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
