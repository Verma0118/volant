import { useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

// (intentionally no formatting helpers here; telemetry tiles format directly)

function DetailPanel({ aircraft, isOpen, onClose, variant = 'overlay' }) {
  const isDock = variant === 'dock';
  const navigate = useNavigate();
  const closeButtonRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    closeButtonRef.current?.focus();

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  const telemetry = useMemo(() => {
    if (!aircraft) return null;

    const batteryPct = Math.max(0, Math.min(100, Number(aircraft.battery_pct) || 0));
    const altitudeFt = Math.round(aircraft.altitude_ft ?? 0);
    const speedKts = Math.round(aircraft.speed_kts ?? 0);
    const status = aircraft.status || 'ready';

    const statusLabel =
      status === 'in-flight'
        ? 'Active'
        : status === 'charging'
          ? 'Charging'
          : status === 'maintenance'
            ? 'Maintenance'
            : status === 'grounded'
              ? 'Grounded'
              : 'Ready';

    return { batteryPct, altitudeFt, speedKts, status, statusLabel };
  }, [aircraft]);

  return (
    <>
      {!isDock && (
        <button
          type="button"
          className={`detail-panel-backdrop ${isOpen ? 'detail-panel-backdrop--open' : ''}`}
          onClick={onClose}
          aria-label="Close aircraft details"
        />
      )}

      <aside
        className={`detail-panel ${isOpen ? 'detail-panel--open' : ''} ${isDock ? 'detail-panel--dock' : ''}`}
        aria-labelledby="detail-panel-title"
      >
        {aircraft && telemetry ? (
          <>
            <div className="detail-panel-header">
              <div>
                <h2 id="detail-panel-title" className="detail-panel-tail">
                  {aircraft.tail_number}
                </h2>
                <p className="detail-panel-subtitle">Detailed telemetry</p>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                className="detail-panel-close"
                onClick={onClose}
                aria-label="Close aircraft details"
              >
                ×
              </button>
            </div>

            <section className="detail-telemetry-grid" aria-label="Telemetry metrics">
              <div className="detail-telemetry-card">
                <p className="detail-telemetry-label">Status</p>
                <div className="detail-telemetry-value-row">
                  <span
                    className={`telemetry-status-dot telemetry-status-dot--${telemetry.status}`}
                    aria-hidden="true"
                  />
                  <p className="detail-telemetry-value">{telemetry.statusLabel}</p>
                </div>
              </div>

              <div className="detail-telemetry-card">
                <p className="detail-telemetry-label">Battery Level</p>
                <p className="detail-telemetry-value">
                  {telemetry.batteryPct}%
                </p>
              </div>

              <div className="detail-telemetry-card">
                <p className="detail-telemetry-label">Altitude MSL</p>
                <p className="detail-telemetry-value">{telemetry.altitudeFt} ft</p>
              </div>

              <div className="detail-telemetry-card">
                <p className="detail-telemetry-label">Ground Speed</p>
                <p className="detail-telemetry-value">{telemetry.speedKts} kts</p>
              </div>
            </section>

            <div className="detail-actions" role="group" aria-label="Detail actions">
              <button
                type="button"
                className="btn-secondary detail-action-btn"
                onClick={() => {
                  navigate('/fleet-map', {
                    state: { aircraftId: aircraft.aircraft_id },
                  });
                  onClose();
                }}
              >
                View on Map
              </button>
              <button
                type="button"
                className="btn-primary detail-action-btn"
                onClick={() => navigate('/missions')}
              >
                Send Command
              </button>
            </div>
          </>
        ) : (
          <p className="detail-empty">Select an aircraft to inspect live details.</p>
        )}
      </aside>
    </>
  );
}

export default DetailPanel;
