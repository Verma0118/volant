import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DetailPanel from '../components/DetailPanel';
import StatusPill from '../components/StatusPill';
import { dedupeFleetRowsByTail } from '../utils/fleetDedupe';

function relativeTime(isoTimestamp) {
  if (!isoTimestamp) {
    return '--';
  }

  const ts = Date.parse(isoTimestamp);
  if (Number.isNaN(ts)) {
    return '--';
  }

  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diffSec <= 1) {
    return 'just now';
  }

  return `${diffSec}s ago`;
}

function formatLocation(lat, lng) {
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return '--';
  }

  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

function FleetStatus({ fleetState }) {
  const navigate = useNavigate();
  const [selectedAircraftId, setSelectedAircraftId] = useState(null);

  const rows = useMemo(() => {
    const list = Object.values(fleetState || {});
    const merged = dedupeFleetRowsByTail(list);
    return merged.sort((a, b) => a.tail_number.localeCompare(b.tail_number));
  }, [fleetState]);

  // `rows` already comes sorted by tail number; filtering preserves that order.
  const sortedRows = rows;

  const statusCounts = useMemo(() => {
    const next = { 'in-flight': 0, charging: 0, maintenance: 0, grounded: 0 };
    for (const row of rows) {
      const status = row.status || 'ready';
      if (Object.prototype.hasOwnProperty.call(next, status)) {
        next[status] += 1;
      }
    }
    return next;
  }, [rows]);

  const selectedAircraft = selectedAircraftId
    ? rows.find((row) => row.aircraft_id === selectedAircraftId)
    : null;

  return (
    <section className="view-panel" aria-labelledby="fleet-status-title">
      <div className="kpi-row" aria-label="Fleet status counts">
        <div className="kpi-card">
          <p className="kpi-card__label">In Flight</p>
          <div className="kpi-card__value-row">
            <p className="kpi-card__value">{statusCounts['in-flight']}</p>
            <span className="kpi-card__icon kpi-card__icon--inflight" aria-hidden="true">
              ✈
            </span>
          </div>
          <p className="kpi-card__sub">active flight count</p>
        </div>

        <div className="kpi-card">
          <p className="kpi-card__label">Charging</p>
          <div className="kpi-card__value-row">
            <p className="kpi-card__value">{statusCounts.charging}</p>
            <span className="kpi-card__icon kpi-card__icon--charging" aria-hidden="true">
              ϟ
            </span>
          </div>
          <p className="kpi-card__sub">number charging</p>
        </div>

        <div className="kpi-card">
          <p className="kpi-card__label">Maintenance</p>
          <div className="kpi-card__value-row">
            <p className="kpi-card__value">{statusCounts.maintenance}</p>
            <span className="kpi-card__icon kpi-card__icon--maintenance" aria-hidden="true">
              ✣
            </span>
          </div>
          <p className="kpi-card__sub">in maintenance</p>
        </div>

        <div className="kpi-card">
          <p className="kpi-card__label">Grounded</p>
          <div className="kpi-card__value-row">
            <p className="kpi-card__value">{statusCounts.grounded}</p>
            <span className="kpi-card__icon kpi-card__icon--grounded" aria-hidden="true">
              ⦻
            </span>
          </div>
          <p className="kpi-card__sub">number grounded</p>
        </div>
      </div>

      <div className="fleet-status-header">
        <div>
          <h1 id="fleet-status-title">Fleet Status</h1>
          <p className="fleet-status-subtitle">Real-time aircraft monitoring</p>
        </div>

        <button type="button" className="btn-primary fleet-status-new-mission" onClick={() => navigate('/missions')}>
          New Mission
        </button>
      </div>

      <div className="fleet-status-cards-grid" role="list" aria-label="Live aircraft cards">
        {sortedRows.length === 0 ? (
          <p className="fleet-status-empty">No aircraft online.</p>
        ) : (
          sortedRows.map((aircraft) => {
            const selected = aircraft.aircraft_id === selectedAircraftId;
            const safeBattery = Math.max(0, Math.min(100, Number(aircraft.battery_pct) || 0));

            return (
              <button
                key={aircraft.aircraft_id}
                type="button"
                role="listitem"
                className={`fleet-aircraft-card ${selected ? 'fleet-aircraft-card--selected' : ''}`}
                aria-pressed={selected}
                onClick={() =>
                  setSelectedAircraftId((current) => (current === aircraft.aircraft_id ? null : aircraft.aircraft_id))
                }
              >
                <div className="fleet-aircraft-card__top">
                  <div className="fleet-aircraft-tail">
                    <span
                      className={`fleet-aircraft-tail-dot fleet-aircraft-tail-dot--${
                        aircraft.status || 'ready'
                      }`}
                      aria-hidden="true"
                    />
                    <span className="fleet-aircraft-tail-number">{aircraft.tail_number}</span>
                    <span className="fleet-aircraft-tail-caret" aria-hidden="true" />
                  </div>

                  <StatusPill status={aircraft.status} />
                </div>

                <div className="fleet-aircraft-type">{aircraft.type ? aircraft.type.replace(/_/g, ' ') : '—'}</div>

                <div className="fleet-aircraft-metrics">
                  <div className="fleet-metric">
                    <div className="fleet-metric-label">Battery</div>
                    <div className="fleet-metric-value">{safeBattery}%</div>
                  </div>
                  <div className="fleet-metric">
                    <div className="fleet-metric-label">Altitude</div>
                    <div className="fleet-metric-value">{Math.round(aircraft.altitude_ft ?? 0)} ft</div>
                  </div>
                  <div className="fleet-metric">
                    <div className="fleet-metric-label">Speed</div>
                    <div className="fleet-metric-value">{Math.round(aircraft.speed_kts ?? 0)} kts</div>
                  </div>
                </div>

                <div className="fleet-aircraft-accentbar" aria-hidden="true">
                  <div className="fleet-aircraft-accentbar__fill" style={{ width: `${safeBattery}%` }} />
                </div>

                <div className="fleet-aircraft-footer">
                  <span className="fleet-aircraft-location">{formatLocation(aircraft.lat, aircraft.lng)}</span>
                  <span className="fleet-aircraft-updated">{relativeTime(aircraft.last_update || aircraft.timestamp)}</span>
                </div>
              </button>
            );
          })
        )}
      </div>

      {selectedAircraft ? (
        <DetailPanel
          aircraft={selectedAircraft}
          isOpen={Boolean(selectedAircraft)}
          variant="dock"
          onClose={() => setSelectedAircraftId(null)}
        />
      ) : null}
    </section>
  );
}

export default FleetStatus;
