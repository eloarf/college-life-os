import { NavLink, Link, Outlet } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import { NAV_ITEMS, SETTINGS_ITEM } from './navItems.js';

function Brand() {
  return (
    <Link to="/" className="brand" aria-label="College Life OS, home">
      <span className="brand__crest" aria-hidden="true">CL</span>
      <span className="brand__name">
        College Life
        <small>Grand Hotel Edition</small>
      </span>
    </Link>
  );
}

function NavItem({ item }) {
  return (
    <NavLink to={item.path} end={item.path === '/'} className="nav-link">
      <Icon name={item.icon} />
      <span>{item.label}</span>
    </NavLink>
  );
}

export default function AppShell() {
  const skipToContent = () => document.getElementById('main')?.focus();

  return (
    <div className="shell">
      <button type="button" className="skip-link" onClick={skipToContent}>
        Skip to content
      </button>

      {/* Desktop sidebar */}
      <aside className="sidebar">
        <Brand />
        <nav aria-label="Primary">
          <ul className="sidebar__list">
            {[...NAV_ITEMS, SETTINGS_ITEM].map((item) => (
              <li key={item.path}>
                <NavItem item={item} />
              </li>
            ))}
          </ul>
        </nav>
        <div className="sidebar__spacer" />
        <p className="eyebrow">Concierge: at your service</p>
      </aside>

      <div className="shell__body">
        <div className="awning" aria-hidden="true" />
        {/* Phone top bar */}
        <header className="topbar">
          <Brand />
          <Link to={SETTINGS_ITEM.path} className="topbar__link" aria-label="Settings">
            <Icon name="gear" />
          </Link>
        </header>

        <main id="main" tabIndex={-1} className="main">
          <Outlet />
        </main>
      </div>

      {/* Phone bottom nav */}
      <nav className="bottom-nav" aria-label="Primary">
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.path} item={item} />
        ))}
      </nav>
    </div>
  );
}