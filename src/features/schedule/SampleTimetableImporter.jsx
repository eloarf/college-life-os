import { useState } from 'react';
import FieldError from './FieldError.jsx';
import { importSampleTimetable } from '../../data/scheduleRepository.js';
import { useClock } from '../../hooks/useClock.js';
import { buildSampleTimetable } from './sampleTimetable.js';
import { defaultSemesterDates, defaultSemesterName, validateSemester } from './scheduleModel.js';

/** Loads the Engineering Section 12 timetable into a new semester. Everything stays editable. */
export default function SampleTimetableImporter() {
  const { today } = useClock();
  const [values, setValues] = useState(() => ({
    name: defaultSemesterName(today),
    ...defaultSemesterDates(today),
  }));
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  function change(field, value) {
    setValues((previous) => ({ ...previous, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (busy) return;
    const checked = validateSemester(values);
    setErrors(checked.errors);
    setFormError('');
    if (!checked.ok) return;
    setBusy(true);
    try {
      await importSampleTimetable(buildSampleTimetable(checked.value));
    } catch (error) {
      setFormError('The timetable could not be loaded. ' + error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="stack" onSubmit={handleSubmit} noValidate aria-label="Load sample timetable">
      <p>
        Loads the Engineering Section 12 timetable: 7 subjects and 9 weekly classes with their
        colours. You choose the semester dates below. Nothing is locked, so you can change
        anything afterwards.
      </p>

      <div className="field">
        <label htmlFor="sample-name">Semester name</label>
        <input
          id="sample-name"
          className="input"
          type="text"
          maxLength={60}
          value={values.name}
          onChange={(e) => change('name', e.target.value)}
          aria-invalid={errors.name ? 'true' : undefined}
          aria-describedby={errors.name ? 'sample-name-error' : undefined}
        />
        <FieldError id="sample-name-error" message={errors.name} />
      </div>

      <div className="field">
        <label htmlFor="sample-start">First day</label>
        <input
          id="sample-start"
          className="input"
          type="date"
          value={values.startDate}
          onChange={(e) => change('startDate', e.target.value)}
          aria-invalid={errors.startDate ? 'true' : undefined}
          aria-describedby={errors.startDate ? 'sample-start-error' : undefined}
        />
        <FieldError id="sample-start-error" message={errors.startDate} />
      </div>

      <div className="field">
        <label htmlFor="sample-end">Last day</label>
        <input
          id="sample-end"
          className="input"
          type="date"
          value={values.endDate}
          onChange={(e) => change('endDate', e.target.value)}
          aria-invalid={errors.endDate ? 'true' : undefined}
          aria-describedby={errors.endDate ? 'sample-end-error' : undefined}
        />
        <FieldError id="sample-end-error" message={errors.endDate} />
      </div>

      {formError && (
        <div className="notice notice--error" role="alert">
          <p>{formError}</p>
        </div>
      )}

      <div className="button-row">
        <button type="submit" className="button" disabled={busy}>
          {busy ? 'Loading...' : 'Load Section 12 timetable'}
        </button>
      </div>
    </form>
  );
}
