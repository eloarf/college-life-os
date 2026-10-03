import PageHeader from '../../components/PageHeader.jsx';
import { useSettings } from '../../hooks/useSettings.js';

export default function SettingsPage() {
  const [settings, updateSettings] = useSettings();

  return (
    <>
      <PageHeader eyebrow="Preferences" title="Settings" />
      <div className="card stack">
        <div className="field">
          <label htmlFor="display-name">Your name</label>
          <input
            id="display-name"
            className="input"
            type="text"
            maxLength={40}
            value={settings.displayName}
            onChange={(e) => updateSettings({ displayName: e.target.value })}
          />
        </div>

        <div className="field">
          <label htmlFor="week-start">Week starts on</label>
          <select
            id="week-start"
            className="input"
            value={settings.weekStartsOn}
            onChange={(e) =>
              updateSettings({ weekStartsOn: Number(e.target.value) })
            }
          >
            <option value={1}>Monday</option>
            <option value={0}>Sunday</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="clock-format">Clock</label>
          <select
            id="clock-format"
            className="input"
            value={settings.clockFormat}
            onChange={(e) => updateSettings({ clockFormat: e.target.value })}
          >
            <option value="24h">24-hour</option>
            <option value="12h">12-hour</option>
          </select>
        </div>
      </div>
    </>
  );
}