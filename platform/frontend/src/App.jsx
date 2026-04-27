import { useEffect, useMemo } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { colors, fonts } from './design/tokens';
import { useAuth } from './hooks/useAuth';
import { useFleetSocket } from './features/realtime';
import { FleetMap } from './features/fleet-map';
import { FleetStatus } from './features/fleet-status';
import { Login } from './features/auth';
import { Dispatch } from './features/dispatch';
import { Sidebar } from './shared/components';
import { dedupeFleetRowsByTail } from './utils/fleetDedupe';

function applyThemeVariables() {
  const root = document.documentElement;

  root.style.setProperty('--color-bg-primary', colors.bg.primary);
  root.style.setProperty('--color-bg-secondary', colors.bg.secondary);
  root.style.setProperty('--color-bg-panel', colors.bg.panel);
  root.style.setProperty('--color-bg-border', colors.bg.border);

  root.style.setProperty('--color-text-primary', colors.text.primary);
  root.style.setProperty('--color-text-secondary', colors.text.secondary);
  root.style.setProperty('--color-text-muted', colors.text.muted);
  root.style.setProperty('--color-accent', colors.accent);

  root.style.setProperty('--color-status-inflight', colors.status.inflight);
  root.style.setProperty('--color-status-charging', colors.status.charging);
  root.style.setProperty('--color-status-maintenance', colors.status.maintenance);
  root.style.setProperty('--color-status-grounded', colors.status.grounded);
  root.style.setProperty('--color-status-ready', colors.status.ready);

  root.style.setProperty('--font-data', fonts.data);
  root.style.setProperty('--font-ui', fonts.ui);
}

function RouteTitle() {
  const location = useLocation();
  useEffect(() => {
    if (location.pathname === '/status') {
      document.title = 'Fleet Status - Volant';
      return;
    }
    if (location.pathname === '/dispatch') {
      document.title = 'Mission Dispatch - Volant';
      return;
    }
    document.title = 'Fleet Map - Volant';
  }, [location.pathname]);
  return null;
}

function AuthenticatedLayout({ fleetState, activeAircraftCount, connectionState, announcement, socket, token }) {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <RouteTitle />

      <div className="layout-shell">
        <Sidebar activeAircraftCount={activeAircraftCount} />

        <div className="content-shell">
          <header className="top-bar">
            <p className="wordmark">Volant Fleet Ops</p>
            <p className="connection-copy">
              Connection: <span>{connectionState}</span>
            </p>
          </header>

          <main id="main-content" tabIndex={-1}>
            <Routes>
              <Route
                path="/"
                element={<FleetMap fleetState={fleetState} socket={socket} token={token} />}
              />
              <Route path="/status" element={<FleetStatus fleetState={fleetState} />} />
              <Route
                path="/dispatch"
                element={<Dispatch socket={socket} token={token} fleetState={fleetState} />}
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </div>

      <div className="visually-hidden" aria-live="polite">
        {announcement}
      </div>
    </>
  );
}

function App() {
  const { token, isAuthenticated } = useAuth();
  const { fleetState, connectionState, announcement, socket } = useFleetSocket(token);
  const activeAircraftCount = useMemo(
    () => dedupeFleetRowsByTail(Object.values(fleetState)).length,
    [fleetState]
  );

  useEffect(() => {
    applyThemeVariables();
  }, []);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          isAuthenticated ? (
            <AuthenticatedLayout
              fleetState={fleetState}
              activeAircraftCount={activeAircraftCount}
              connectionState={connectionState}
              announcement={announcement}
              socket={socket}
              token={token}
            />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
}

export default App;
