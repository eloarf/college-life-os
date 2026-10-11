import { useState } from 'react';
import FieldError from './FieldError.jsx';
import { addSubject } from '../../data/scheduleRepository.js';
import { DEFAULT_SUBJECT_COLOR, SUBJECT_COLORS, validateSubject } from './scheduleModel.js';

function firstFreeColor(takenColors) {
  const free = SUBJECT_COLORS.find((color) => !takenColors.includes(color.id));
  return free ? free.id : DEFAULT_SUBJECT_COLOR;
}

/**
 * Adds a subject to one semester.
 * takenColors: colours already used in this semester, so a new subject starts with a different one.
 */
export default function SubjectForm({ semesterId, takenColors, onSaved, onCancel }) {
  const [values, setValues] = useState(() => ({
    code: '',
    name: '',
    instructor: '',
    notes: '',
    color: firstFreeColor(takenColors || []),
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
    const result = validateSubject({ ...values, semesterId });
    setErrors(result.errors);
    setFormError('');
    if (!result.ok) return;
    setBusy(true);
    try {
      const record = await addSubject(result.value);
      if (onSaved) onSaved(record);
    } catch (error) {
      setFormError('The subject could not be saved. ' + error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="stack" onSubmit={handleSubmit} noValidate aria-label="New subject">
      <div className="field">
        <label htmlFor="subject-code">Course code</label>
        <input
          id="subject-code"
          className="input"
          type="text"
          maxLength={20}
          placeholder="For example MATH1007"
          value={values.code}
          onChange={(e) => change('code', e.target.value)}
          aria-invalid={errors.code ? 'true' : undefined}
          aria-describedby={errors.code ? 'subject-code-error' : undefined}
        />
        <FieldError id="subject-code-error" message={errors.code} />
      </div>

      <div className="field">
        <label htmlFor="subject-name">Course name</label>
        <input
          id="subject-name"
          className="input"
          type="text"
          maxLength={80}
          placeholder="For example Mathematics for Natural Science"
          value={values.name}
          onChange={(e) => change('name', e.target.value)}
          aria-invalid={errors.name ? 'true' : undefined}
          aria-describedby={errors.name ? 'subject-name-error' : undefined}
        />
        <FieldError id="subject-name-error" message={errors.name} />
      </div>

      <div className="field">
        <label htmlFor="subject-instructor">Instructor (optional)</label>
        <input
          id="subject-instructor"
          className="input"
          type="text"
          maxLength={80}
          value={values.instructor}
          onChange={(e) => change('instructor', e.target.value)}
          aria-invalid={errors.instructor ? 'true' : undefined}
          aria-describedby={errors.instructor ? 'subject-instructor-error' : undefined}
        />
        <FieldError id="subject-instructor-error" message={errors.instructor} />
      </div>

      <fieldset className="field color-picker">
        <legend>Colour</legend>
        <div className="color-picker__row">
          {SUBJECT_COLORS.map((color) => (
            <label
              key={color.id}
              className={
                'color-swatch sc--' + color.id + (values.color === color.id ? ' is-selected' : '')
              }
            >
              <input
                type="radio"
                name="subject-color"
                value={color.id}
                checked={values.color === color.id}
                onChange={() => change('color', color.id)}
                className="visually-hidden"
              />
              <span className="color-swatch__dot" aria-hidden="true" />
              <span className="color-swatch__name">{color.label}</span>
            </label>
          ))}
        </div>
        <FieldError message={errors.color} />
      </fieldset>

      <div className="field">
        <label htmlFor="subject-notes">Notes (optional)</label>
        <textarea
          id="subject-notes"
          className="input"
          rows={3}
          maxLength={500}
          value={values.notes}
          onChange={(e) => change('notes', e.target.value)}
          aria-invalid={errors.notes ? 'true' : undefined}
          aria-describedby={errors.notes ? 'subject-notes-error' : undefined}
        />
        <FieldError id="subject-notes-error" message={errors.notes} />
      </div>

      {formError && (
        <div className="notice notice--error" role="alert">
          <p>{formError}</p>
        </div>
      )}
      <FieldError message={errors.semesterId} />

      <div className="button-row">
        <button type="submit" className="button" disabled={busy}>
          {busy ? 'Saving...' : 'Save subject'}
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
