import { useState } from 'react';
import {
  downloadBackup,
  readBackupFile,
  restoreBackup,
  runStorageSelfTest,
} from '../../data/backupService.js';
import { summarizeBackup } from '../../data/backupFormat.js';

const SHELF_LABELS = {
  semesters: 'Semesters',
  subjects: 'Subjects',
  scheduleRules: 'Class rules',
  scheduleExceptions: 'Class changes',
  attendance: 'Attendance',
  assignments: 'Assignments',
  exams: 'Exams',
  topics: 'Study topics',
  studySessions: 'Study sessions',
  habits: 'Habits',
  habitCompletions: 'Habit check-ins',
  goals: 'Goals',
  projects: 'Projects',
  quests: 'Quests',
  xpEvents: 'XP history',
  streakFreezes: 'Streak freezes',
  reminders: 'Reminders',
  meta: 'App notes',
};

function shelfLabel(storeName) {
  return SHELF_LABELS[storeName] || storeName;
}

function describeExportDate(exportedAt) {
  if (!exportedAt) return 'Made on an unknown date';
  const date = new Date(exportedAt);
  if (Number.isNaN(date.getTime())) return 'Made on an unknown date';
  return 'Made on ' + date.toLocaleString();
}

export default function BackupPanel() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [preview, setPreview] = useState(null);

  async function handleExport() {
    setBusy(true);
    setMessage(null);
    try {
      const summary = await downloadBackup();
      setMessage({
        tone: 'ok',
        lines: ['Backup downloaded with ' + summary.totalRecords + ' records.'],
      });
    } catch (error) {
      setMessage({ tone: 'error', lines: ['The backup could not be created. ' + error.message] });
    } finally {
      setBusy(false);
    }
  }

  async function handleFileChosen(event) {
    const file = event.target.files && event.target.files[0];
    event.target.value = ''; // lets you pick the same file again later
    if (!file) return;

    setBusy(true);
    setMessage(null);
    setPreview(null);
    try {
      const result = await readBackupFile(file);
      if (!result.ok) {
        setMessage({ tone: 'error', lines: result.errors });
      } else {
        setPreview({
          fileName: file.name,
          backup: result.backup,
          summary: summarizeBackup(result.backup),
          warnings: result.warnings,
        });
      }
    } catch (error) {
      setMessage({ tone: 'error', lines: ['That file could not be read. ' + error.message] });
    } finally {
      setBusy(false);
    }
  }

  async function handleRestore() {
    if (!preview) return;
    setBusy(true);
    setMessage(null);
    try {
      const result = await restoreBackup(preview.backup);
      setPreview(null);
      setMessage({
        tone: 'ok',
        lines: [
          'Restored ' + result.recordsRestored + ' records across ' + result.shelvesRestored + ' shelves.',
        ],
      });
    } catch (error) {
      setMessage({ tone: 'error', lines: [error.message] });
    } finally {
      setBusy(false);
    }
  }

  async function handleSelfTest() {
    setBusy(true);
    setMessage(null);
    try {
      const passed = await runStorageSelfTest();
      setMessage(
        passed
          ? { tone: 'ok', lines: ['Storage check passed. Data is saved and read back correctly.'] }
          : { tone: 'error', lines: ['Storage check failed. Data was written but could not be read back.'] }
      );
    } catch (error) {
      setMessage({ tone: 'error', lines: ['Storage check could not run. ' + error.message] });
    } finally {
      setBusy(false);
    }
  }

  const messageClass =
    message && message.tone === 'error' ? 'notice notice--error' : 'notice notice--ok';

  return (
    <section className="card stack" aria-labelledby="backup-heading">
      <h2 id="backup-heading">Backup and restore</h2>
      <p>
        Your data is stored only on this device. Download a backup regularly, and
        before you clear browser data or uninstall the app.
      </p>

      <div className="button-row">
        <button type="button" className="button" onClick={handleExport} disabled={busy}>
          Download backup
        </button>
        <button
          type="button"
          className="button button--secondary"
          onClick={handleSelfTest}
          disabled={busy}
        >
          Run storage check
        </button>
      </div>

      <div className="field">
        <label htmlFor="backup-file">Restore from a backup file</label>
        <input
          id="backup-file"
          className="input"
          type="file"
          accept=".json,application/json"
          onChange={handleFileChosen}
          disabled={busy}
        />
      </div>

      {message && (
        <div
          className={messageClass}
          role={message.tone === 'error' ? 'alert' : 'status'}
        >
          {message.lines.map((line, index) => (
            <p key={index}>{line}</p>
          ))}
        </div>
      )}

      {preview && (
        <div className="notice" aria-live="polite">
          <h3>Restore “{preview.fileName}”?</h3>
          <p>{describeExportDate(preview.backup.exportedAt)}</p>
          <ul className="count-list">
            {preview.summary.counts.map((row) => (
              <li key={row.store}>
                <span>{shelfLabel(row.store)}</span>
                <strong>{row.count}</strong>
              </li>
            ))}
          </ul>
          {preview.warnings.map((warning, index) => (
            <p key={index}>{warning}</p>
          ))}
          <p>
            This replaces the current contents of the shelves listed above. Shelves
            missing from the file are kept as they are. This cannot be undone, so
            download a backup of the current data first if you are unsure.
          </p>
          <div className="button-row">
            <button
              type="button"
              className="button button--danger"
              onClick={handleRestore}
              disabled={busy}
            >
              Replace data with this backup
            </button>
            <button
              type="button"
              className="button button--secondary"
              onClick={() => setPreview(null)}
              disabled={busy}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}