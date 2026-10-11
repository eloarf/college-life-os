import { useState } from 'react';
import PageHeader from '../../components/PageHeader.jsx';
import ClassForm from '../schedule/ClassForm.jsx';
import SampleTimetableImporter from '../schedule/SampleTimetableImporter.jsx';
import SemesterForm from '../schedule/SemesterForm.jsx';
import SubjectForm from '../schedule/SubjectForm.jsx';
import WeeklyTimetable from '../schedule/WeeklyTimetable.jsx';
import { subjectTitle } from '../schedule/scheduleEngine.js';
import {
  describeSemesterProgress,
  formatLongDate,
  pickDefaultSemester,
} from '../schedule/scheduleView.js';
import { useScheduleData } from '../../hooks/useScheduleData.js';
import { useClock } from '../../hooks/useClock.js';
import { useSettings } from '../../hooks/useSettings.js';

const ELLIPSIS = '…';
const EN_DASH = ' – ';

export default function UniversityPage() {
  const { status, engine, message } = useScheduleData();
  const { today } = useClock();
  const [settings] = useSettings();
  const [chosenId, setChosenId] = useState('');
  const [openForm, setOpenForm] = useState('');

  const header = <PageHeader eyebrow="Academics" title="University" />;

  if (status === 'error') {
    return (
      <>
        {header}
        <div className="notice notice--error" role="alert">
          <p>The timetable could not be loaded. {message}</p>
        </div>
      </>
    );
  }
  if (status === 'loading' || !engine) {
    return (
      <>
        {header}
        <p className="eyebrow" role="status">
          {'Opening the timetable' + ELLIPSIS}
        </p>
      </>
    );
  }

  const skippedNote =
    engine.skippedCount > 0 ? (
      <p className="eyebrow">
        {engine.skippedCount +
          (engine.skippedCount === 1 ? ' saved item was' : ' saved items were') +
          ' unreadable and ignored.'}
      </p>
    ) : null;

  // ---- No semester yet: start screen ----
  if (engine.semesters.length === 0) {
    return (
      <>
        {header}
        <div className="stack">
          <section className="card stack" aria-labelledby="start-heading">
            <h2 id="start-heading">Start your timetable</h2>
            <SampleTimetableImporter />
          </section>

          <section className="card stack" aria-labelledby="scratch-heading">
            <h2 id="scratch-heading">Or start from scratch</h2>
            {openForm === 'semester' ? (
              <SemesterForm onSaved={() => setOpenForm('')} onCancel={() => setOpenForm('')} />
            ) : (
              <div className="button-row">
                <button
                  type="button"
                  className="button button--secondary"
                  onClick={() => setOpenForm('semester')}
                >
                  Create an empty semester
                </button>
              </div>
            )}
          </section>
          {skippedNote}
        </div>
      </>
    );
  }

  // ---- A semester exists ----
  const semester = engine.semesterById(chosenId) || pickDefaultSemester(engine.semesters, today);
  const progress = describeSemesterProgress(semester, today);
  const subjects = engine.subjectsForSemester(semester.id);
  const rules = engine.rulesForSemester(semester.id);

  function toggleForm(name) {
    setOpenForm((current) => (current === name ? '' : name));
  }

  return (
    <>
      {header}
      <div className="stack">
        <section className="card stack" aria-labelledby="semester-heading">
          <div className="level-row">
            <h2 id="semester-heading">Semester</h2>
            <span className="badge">{progress.label}</span>
          </div>

          {engine.semesters.length > 1 && (
            <div className="field">
              <label htmlFor="semester-select">Showing</label>
              <select
                id="semester-select"
                className="input"
                value={semester.id}
                onChange={(e) => {
                  setChosenId(e.target.value);
                  setOpenForm('');
                }}
              >
                {engine.semesters.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <p>
              <strong>{semester.name}</strong>
            </p>
            <p className="eyebrow">
              {formatLongDate(semester.startDate) + EN_DASH + formatLongDate(semester.endDate)}
            </p>
          </div>

          {openForm === 'semester' ? (
            <SemesterForm
              onSaved={(record) => {
                setChosenId(record.id);
                setOpenForm('');
              }}
              onCancel={() => setOpenForm('')}
            />
          ) : (
            <div className="button-row">
              <button
                type="button"
                className="button button--secondary"
                onClick={() => toggleForm('semester')}
              >
                Add another semester
              </button>
            </div>
          )}
        </section>

        <section className="card stack" aria-labelledby="subjects-heading">
          <h2 id="subjects-heading">Subjects</h2>
          {subjects.length === 0 ? (
            <p>No subjects in this semester yet.</p>
          ) : (
            <ul className="subject-list">
              {subjects.map((subject) => (
                <li key={subject.id} className={'subject-row sc--' + subject.color}>
                  <span className="subject-row__dot" aria-hidden="true" />
                  <span className="subject-row__text">
                    <strong>{subjectTitle(subject)}</strong>
                    {subject.name && subject.name !== subjectTitle(subject) && (
                      <span> {subject.name}</span>
                    )}
                    {subject.instructor && (
                      <span className="eyebrow subject-row__instructor">{subject.instructor}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {openForm === 'subject' ? (
            <SubjectForm
              semesterId={semester.id}
              takenColors={subjects.map((subject) => subject.color)}
              onSaved={() => setOpenForm('')}
              onCancel={() => setOpenForm('')}
            />
          ) : (
            <div className="button-row">
              <button type="button" className="button" onClick={() => toggleForm('subject')}>
                Add subject
              </button>
            </div>
          )}
        </section>

        <section className="card stack" aria-labelledby="timetable-heading">
          <h2 id="timetable-heading">Weekly classes</h2>
          <WeeklyTimetable
            rules={rules}
            subjects={subjects}
            weekStartsOn={settings.weekStartsOn}
            clockFormat={settings.clockFormat}
          />

          {openForm === 'class' ? (
            <ClassForm
              subjects={subjects}
              weekStartsOn={settings.weekStartsOn}
              onSaved={() => setOpenForm('')}
              onCancel={() => setOpenForm('')}
            />
          ) : subjects.length === 0 ? (
            <p className="eyebrow">Add a subject first, then you can add its classes.</p>
          ) : (
            <div className="button-row">
              <button type="button" className="button" onClick={() => toggleForm('class')}>
                Add class
              </button>
            </div>
          )}
        </section>
        {skippedNote}
      </div>
    </>
  );
}
