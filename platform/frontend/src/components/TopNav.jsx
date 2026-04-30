import { NavLink } from 'react-router-dom';
import { useEffect, useState } from 'react';

function formatClock(d) {
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function TopNav({ connectionState, onLogout }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const statusText = connectionState === 'connected' ? 'All systems operational' : 'Systems operating (degraded)';

  return (
    <header className="topnav" aria-label="Primary navigation">
      <div className="topnav-brand">
        <p className="topnav-brand__name">Volant</p>
        <p className="topnav-brand__sub">Fleet Operations</p>
      </div>

      <nav className="topnav-links" aria-label="Sections">
        <NavLink
          to="/fleet"
          end
          className={({ isActive }) => `topnav-link ${isActive ? 'topnav-link--active' : ''}`}
        >
          Fleet
        </NavLink>
        <NavLink
          to="/fleet-map"
          className={({ isActive }) => `topnav-link ${isActive ? 'topnav-link--active' : ''}`}
        >
          Fleet Map
        </NavLink>
        <NavLink
          to="/missions"
          className={({ isActive }) => `topnav-link ${isActive ? 'topnav-link--active' : ''}`}
        >
          Missions
        </NavLink>
        <NavLink
          to="/analytics"
          className={({ isActive }) => `topnav-link ${isActive ? 'topnav-link--active' : ''}`}
        >
          Analytics
        </NavLink>
        <NavLink
          to="/maintenance"
          className={({ isActive }) => `topnav-link ${isActive ? 'topnav-link--active' : ''}`}
        >
          Maintenance
        </NavLink>
      </nav>

      <div className="topnav-right" aria-label="System status">
        <p className="topnav-status">
          <span className="topnav-status__dot" aria-hidden="true" />
          {statusText}
        </p>
        <p className="topnav-time">{formatClock(now)}</p>
        <button type="button" className="topnav-logout" onClick={onLogout}>
          Logout
        </button>
      </div>
    </header>
  );
}

export default TopNav;

