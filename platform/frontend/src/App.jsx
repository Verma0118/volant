import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { colors, fonts } from './design/tokens';
import { useAuth } from './hooks/useAuth';
import { useFleetSocket } from './features/realtime';
import { FleetMap } from './features/fleet-map';
import { FleetStatus } from './features/fleet-status';
import { Login } from './features/auth';
import { Dispatch } from './features/dispatch';
import { Maintenance } from './features/maintenance';
import { Compliance } from './features/compliance';
import { Analytics } from './features/analytics';
import TopNav from './components/TopNav';

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

  root.style.setProperty('--color-demo-banner-bg', colors.demo.bannerBg);
  root.style.setProperty('--color-demo-banner-border', colors.demo.bannerBorder);
  root.style.setProperty('--color-demo-pill-bg', colors.demo.pillBg);
  root.style.setProperty('--color-demo-pill-text', colors.demo.pillText);
  root.style.setProperty('--color-demo-body-text', colors.demo.bodyText);
  root.style.setProperty('--color-demo-charging-glow', colors.demo.chargingGlow);
}

function RouteTitle() {
  const location = useLocation();
  useEffect(() => {
    if (location.pathname === '/fleet' || location.pathname === '/status') {
      document.title = 'Fleet Status - Volant';
      return;
    }
    if (location.pathname === '/' || location.pathname === '/fleet-map') {
      document.title = 'Fleet Map - Volant';
      return;
    }
    if (location.pathname === '/missions' || location.pathname === '/dispatch') {
      document.title = 'Mission Dispatch - Volant';
      return;
    }
    if (location.pathname === '/compliance') {
      document.title = 'Compliance Log - Volant';
      return;
    }
    if (location.pathname === '/analytics') {
      document.title = 'Analytics - Volant';
      return;
    }
    if (location.pathname === '/maintenance') {
      document.title = 'Maintenance - Volant';
      return;
    }
    document.title = 'Volant - Fleet Ops';
  }, [location.pathname]);
  return null;
}


function AuthenticatedLayout({
  fleetState,
  connectionState,
  announcement,
  socket,
  isAuthenticated,
  csrfToken,
  onLogout,
}) {
  const location = useLocation();
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <RouteTitle />

      <div className="layout-shell">
        <TopNav connectionState={connectionState} onLogout={onLogout} />

        <main id="main-content" tabIndex={-1}>
          <div key={location.pathname} className="route-transition">
            <Routes>
              <Route
                path="/"
                element={<Navigate to="/fleet" replace />}
              />
              <Route path="/fleet" element={<FleetStatus fleetState={fleetState} />} />
              <Route
                path="/fleet-map"
                element={<FleetMap fleetState={fleetState} socket={socket} isAuthenticated={isAuthenticated} />}
              />
              <Route
                path="/missions"
                element={
                  <Dispatch socket={socket} isAuthenticated={isAuthenticated} csrfToken={csrfToken} fleetState={fleetState} />
                }
              />
              <Route path="/analytics" element={<Analytics isAuthenticated={isAuthenticated} />} />
              <Route
                path="/compliance"
                element={<Compliance isAuthenticated={isAuthenticated} />}
              />
              <Route
                path="/maintenance"
                element={<Maintenance isAuthenticated={isAuthenticated} csrfToken={csrfToken} />}
              />
              <Route path="*" element={<Navigate to="/fleet" replace />} />
            </Routes>
          </div>
        </main>
      </div>

      <div className="visually-hidden" aria-live="polite">
        {announcement}
      </div>
    </>
  );
}

function App() {
  const { isAuthenticated, authResolved, csrfToken, logout } = useAuth();
  const { fleetState, connectionState, announcement, socket } = useFleetSocket(isAuthenticated);

  useEffect(() => {
    applyThemeVariables();
  }, []);

  if (!authResolved) {
    return null;
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          authResolved && isAuthenticated ? (
            <AuthenticatedLayout
              fleetState={fleetState}
              connectionState={connectionState}
              announcement={announcement}
              socket={socket}
              isAuthenticated={isAuthenticated}
              csrfToken={csrfToken}
              onLogout={logout}
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
