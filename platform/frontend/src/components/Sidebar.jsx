import { NavLink } from 'react-router-dom';

const LOCKED_ITEMS = [
  'Maintenance',
  'Analytics',
];

function Sidebar({ activeAircraftCount }) {
  return (
    <aside className="sidebar" aria-label="Application sidebar">
      <div>
        <p className="sidebar-wordmark">Volant</p>

        <nav aria-label="Primary">
          <ul className="sidebar-nav-list">
            <li>
              <NavLink to="/" end className="sidebar-link">
                Fleet Map
              </NavLink>
            </li>
            <li>
              <NavLink to="/status" className="sidebar-link">
                Fleet Status
              </NavLink>
            </li>
            <li>
              <NavLink to="/dispatch" className="sidebar-link">
                Mission Dispatch
              </NavLink>
            </li>
            {LOCKED_ITEMS.map((label) => (
              <li key={label}>
                <span className="sidebar-link sidebar-link--locked">
                  <span aria-hidden="true" className="lock-icon">
                    🔒
                  </span>
                  <span>{label}</span>
                  <span className="sidebar-locked-copy">Locked</span>
                </span>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="sidebar-footer">
        <p className="sidebar-live-count" aria-live="polite">
          <span className="live-dot" aria-hidden="true" />
          Live aircraft: {activeAircraftCount}
        </p>
        <p className="sidebar-operator">Operator: DFW Air Ops</p>
      </div>
    </aside>
  );
}

export default Sidebar;
