import { useEffect, useMemo, useRef, useState } from 'react';
import BatteryBar from './BatteryBar';
import StatusPill from './StatusPill';

function formatNumber(value) {
  if (typeof value !== 'number') {
    return '--';
  }

  return new Intl.NumberFormat('en-US').format(Math.round(value));
}

function formatPosition(lat, lng) {
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return '--';
  }

  const latLabel = `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}`;
  const lngLabel = `${Math.abs(lng).toFixed(4)}° ${lng >= 0 ? 'E' : 'W'}`;
  return `${latLabel}, ${lngLabel}`;
}

function relativeTime(isoTimestamp, nowMs) {
  if (!isoTimestamp) {
    return 'No live timestamp';
  }

  const ts = Date.parse(isoTimestamp);
  if (Number.isNaN(ts)) {
    return 'Unknown update time';
  }

  const diffSec = Math.max(0, Math.floor((nowMs - ts) / 1000));
  if (diffSec <= 1) {
    return 'Updated just now';
  }

  return `Updated ${diffSec}s ago`;
}

function DetailPanel({ aircraft, isOpen, onClose }) {
  const closeButtonRef = useRef(null);
  const [nowMs, setNowMs] = useState(0);

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

    const tick = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    window.addEventListener('keydown', handleEscape);

    return () => {
      clearInterval(tick);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  const detailRows = useMemo(() => {
    if (!aircraft) {
      return [];
    }

    return [
      { label: 'Altitude', value: `${formatNumber(aircraft.altitude_ft)} ft` },
      { label: 'Speed', value: `${formatNumber(aircraft.speed_kts)} kts` },
      { label: 'Heading', value: `${formatNumber(aircraft.heading_deg)}°` },
      { label: 'Position', value: formatPosition(aircraft.lat, aircraft.lng) },
      {
        label: 'Type',
        value: `${(aircraft.type || '--').toString().toUpperCase()} — ${aircraft.model || '--'}`,
      },
      { label: 'Operator', value: aircraft.operator || aircraft.operator_name || '--' },
      {
        label: 'Last update',
        value: relativeTime(aircraft.last_update || aircraft.timestamp, nowMs),
      },
    ];
  }, [aircraft, nowMs]);

  return (
    <>
      <button
        type="button"
        className={`detail-panel-backdrop ${isOpen ? 'detail-panel-backdrop--open' : ''}`}
        onClick={onClose}
        aria-label="Close aircraft details"
      />

      <aside
        className={`detail-panel ${isOpen ? 'detail-panel--open' : ''}`}
        aria-labelledby="detail-panel-title"
      >
        {aircraft ? (
          <>
            <div className="detail-panel-header">
              <div>
                <h2 id="detail-panel-title" className="detail-panel-tail">
                  {aircraft.tail_number}
                </h2>
                <StatusPill status={aircraft.status} />
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

            <section className="detail-section" aria-label="Battery status">
              <p className="detail-label">Battery</p>
              <BatteryBar batteryPct={aircraft.battery_pct} />
            </section>

            <dl className="detail-grid">
              {detailRows.map((row) => (
                <div key={row.label} className="detail-row">
                  <dt className="detail-label">{row.label}</dt>
                  <dd className="detail-value">{row.value}</dd>
                </div>
              ))}
            </dl>
          </>
        ) : (
          <p className="detail-empty">Select an aircraft to inspect live details.</p>
        )}
      </aside>
    </>
  );
}

export default DetailPanel;
