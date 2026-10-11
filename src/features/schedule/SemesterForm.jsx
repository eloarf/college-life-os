import { useState } from 'react';
import FieldError from './FieldError.jsx';
import { addSemester } from '../../data/scheduleRepository.js';
import { useClock } from '../../hooks/useClock.js';
import { defaultSemesterDates, defaultSemesterName, validateSemester } from './scheduleModel.js';

/** Creates an empty semester. onSaved receives the saved record. */
export default function SemesterForm({ onSaved, onCancel }) {
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
    const result = validateSemester(values);
    setErrors(result.errors);
    setFormError('');
    if (!result.ok) return;
    setBusy(true);
    try {
      const record = await addSemester(result.value);
      if (onSaved) onSaved(record);
    } catch (error) {
      setFormError('The semester could not be saved. ' + error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="stack" onSubmit={handleSubmit} noValidate aria-label="New semester">
      <div className="field">
        <label htmlFor="semester-name">Semester name</label>
        <input
          id="semester-name"
          className="input"
          type="text"
          maxLength={60}
          value={values.name}
          onChange={(e) => change('name', e.target.value)}
          aria-invalid={errors.name ? 'true' : undefined}
          aria-describedby={errors.name ? 'semester-name-error' : undefined}
        />
        <FieldError id="semester-name-error" message={errors.name} />
      </div>

      <div className="field">
        <label htmlFor="semester-start">First day</label>
        <input
          id="semester-start"
          className="input"
          type="date"
          value={values.startDate}
          onChange={(e) => change('startDate', e.target.value)}
          aria-invalid={errors.startDate ? 'true' : undefined}
          aria-describedby={errors.startDate ? 'semester-start-error' : undefined}
        />
        <FieldError id="semester-start-error" message={errors.startDate} />
      </div>

      <div className="field">
        <label htmlFor="semester-end">Last day</label>
        <input
          id="semester-end"
          className="input"
          type="date"
          value={values.endDate}
          onChange={(e) => change('endDate', e.target.value)}
          aria-invalid={errors.endDate ? 'true' : undefined}
          aria-describedby={errors.endDate ? 'semester-end-error' : undefined}
        />
        <FieldError id="semester-end-error" message={errors.endDate} />
      </div>

      {formError && (
        <div className="notice notice--error" role="alert">
          <p>{formError}</p>
        </div>
      )}

      <div className="button-row">
        <button type="submit" className="button" disabled={busy}>
          {busy ? 'Saving...' : 'Save semester'}
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
