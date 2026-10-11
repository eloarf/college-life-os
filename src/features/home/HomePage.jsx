import PageHeader from '../../components/PageHeader.jsx';
import ProgressBar from '../../components/ProgressBar.jsx';
import TodayClasses from '../schedule/TodayClasses.jsx';
import { useSettings } from '../../hooks/useSettings.js';
import { useDatabaseStatus } from '../../hooks/useDatabaseStatus.js';
import { formatDateKey, todayKey } from '../../utils/dates.js';

const ELLIPSIS = '…';
const DOT = '·';
const DASH = '—';

function greetingFor(hour) {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function DatabaseStamp({ status }) {
  if (status.state === 'loading') {
    return <span className="stamp stamp--wait">{'Checking vault' + ELLIPSIS}</span>;
  }
  if (status.state === 'error') {
    return <span className="stamp stamp--warn">Vault unavailable</span>;
  }
  return <span className="stamp stamp--ok">Vault open</span>;
}

export default function HomePage() {
  const [settings] = useSettings();
  const dbStatus = useDatabaseStatus();

  const now = new Date();
  const dateText = formatDateKey(todayKey(now));
  const title = greetingFor(now.getHours()) + ', ' + settings.displayName;

  return (
    <div className="stack">
      <PageHeader eyebrow={dateText} title={title} />

      <section className="card card--dark" aria-label="Level and experience">
        <div className="level-row">
          <span className="level-row__level">LEVEL 1</span>
          <span className="badge">Novice</span>
        </div>
        <ProgressBar value={0} max={100} label="Experience points" />
        <p className="eyebrow" style={{ marginTop: 8 }}>
          {'0 / 100 XP ' + DOT + ' the XP engine arrives in a later chunk'}
        </p>
      </section>

      <section className="grid-3" aria-label="Today at a glance">
        <div className="stat">
          <span className="stat__value">{DASH}</span>
          <span className="eyebrow">Streak</span>
        </div>
        <div className="stat">
          <span className="stat__value">{DASH}</span>
          <span className="eyebrow">Today</span>
        </div>
        <div className="stat">
          <span className="stat__value">{DASH}</span>
          <span className="eyebrow">Freezes</span>
        </div>
      </section>

      <section className="card" aria-labelledby="schedule-heading">
        <h2 id="schedule-heading" style={{ marginBottom: 12 }}>
          Today&apos;s schedule
        </h2>
        <TodayClasses />
      </section>

      <section className="card card--pink" aria-labelledby="vault-heading">
        <div className="level-row">
          <h2 id="vault-heading">The Vault</h2>
          <DatabaseStamp status={dbStatus} />
        </div>
        {dbStatus.state === 'ready' && (
          <p>
            Database v{dbStatus.version} with {dbStatus.storeCount} shelves.{' '}
            {dbStatus.persisted
              ? 'Storage is marked persistent.'
              : 'The browser has not guaranteed persistent storage yet. Installing the app as a PWA improves this.'}
          </p>
        )}
        {dbStatus.state === 'error' && (
          <p>Could not open local storage: {dbStatus.message}</p>
        )}
        {dbStatus.state === 'loading' && <p>{'Opening the database' + ELLIPSIS}</p>}
      </section>
    </div>
  );
}
