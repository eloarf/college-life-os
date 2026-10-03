import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppShell from './AppShell.jsx';
import HomePage from '../features/home/HomePage.jsx';
import CalendarPage from '../features/calendar/CalendarPage.jsx';
import UniversityPage from '../features/university/UniversityPage.jsx';
import HabitsPage from '../features/habits/HabitsPage.jsx';
import ProgressPage from '../features/progress/ProgressPage.jsx';
import SettingsPage from '../features/settings/SettingsPage.jsx';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<HomePage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="university" element={<UniversityPage />} />
          <Route path="habits" element={<HabitsPage />} />
          <Route path="progress" element={<ProgressPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}