import { useMemo, useState } from 'react';
import BatteryBar from '../components/BatteryBar';
import DetailPanel from '../components/DetailPanel';
import StatusPill from '../components/StatusPill';
import { dedupeFleetRowsByTail } from '../utils/fleetDedupe';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'in-flight', label: 'In-Flight' },
  { id: 'charging', label: 'Charging' },
  { id: 'maintenance', label: 'Maintenance' },
  { id: 'grounded', label: 'Grounded' },
];

const SORTABLE_COLUMNS = {
  tail_number: (row) => row.tail_number || '',
  type: (row) => row.type || '',
  status: (row) => row.status || '',
  battery_pct: (row) => Number(row.battery_pct ?? -1),
  altitude_ft: (row) => Number(row.altitude_ft ?? -1),
  speed_kts: (row) => Number(row.speed_kts ?? -1),
  timestamp: (row) => Date.parse(row.last_update || row.timestamp || 0) || 0,
};

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
  const [activeFilter, setActiveFilter] = useState('all');
  const [sortKey, setSortKey] = useState('tail_number');
  const [sortDirection, setSortDirection] = useState('asc');
  const [selectedAircraftId, setSelectedAircraftId] = useState(null);

  const rows = useMemo(() => {
    const list = Object.values(fleetState || {});
    const merged = dedupeFleetRowsByTail(list);
    return merged.sort((a, b) => a.tail_number.localeCompare(b.tail_number));
  }, [fleetState]);

  const counts = useMemo(() => {
    const next = { all: rows.length };
    for (const row of rows) {
      const status = row.status || 'unknown';
      next[status] = (next[status] || 0) + 1;
    }
    return next;
  }, [rows]);

  const filteredRows = useMemo(() => {
    if (activeFilter === 'all') {
      return rows;
    }

    return rows.filter((row) => row.status === activeFilter);
  }, [rows, activeFilter]);

  const sortedRows = useMemo(() => {
    const selector = SORTABLE_COLUMNS[sortKey] || SORTABLE_COLUMNS.tail_number;
    const sorted = [...filteredRows].sort((a, b) => {
      const left = selector(a);
      const right = selector(b);
      if (left < right) {
        return -1;
      }
      if (left > right) {
        return 1;
      }
      return 0;
    });

    if (sortDirection === 'desc') {
      sorted.reverse();
    }

    return sorted;
  }, [filteredRows, sortDirection, sortKey]);

  const selectedAircraft = selectedAircraftId
    ? rows.find((row) => row.aircraft_id === selectedAircraftId)
    : null;

  const requestSort = (key) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortKey(key);
    setSortDirection('asc');
  };

  return (
    <section className="view-panel" aria-labelledby="fleet-status-title">
      <h1 id="fleet-status-title">Fleet Status</h1>

      <div className="status-filter-row" role="toolbar" aria-label="Fleet status filters">
        {FILTERS.map((filter) => {
          const count = counts[filter.id] || 0;
          const active = activeFilter === filter.id;

          return (
            <button
              key={filter.id}
              type="button"
              className={`status-filter-pill ${active ? 'status-filter-pill--active' : ''}`}
              onClick={() => setActiveFilter(filter.id)}
              aria-pressed={active}
            >
              {filter.label}
              <span className="status-filter-count">{count}</span>
            </button>
          );
        })}
      </div>

      <table className="status-table">
        <caption className="visually-hidden">Live fleet status table</caption>
        <thead>
          <tr>
            <th scope="col" aria-sort={sortKey === 'tail_number' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}>
              <button type="button" className="status-sort-button" onClick={() => requestSort('tail_number')}>
                Tail #
              </button>
            </th>
            <th scope="col" aria-sort={sortKey === 'type' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}>
              <button type="button" className="status-sort-button" onClick={() => requestSort('type')}>
                Type
              </button>
            </th>
            <th scope="col" aria-sort={sortKey === 'status' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}>
              <button type="button" className="status-sort-button" onClick={() => requestSort('status')}>
                Status
              </button>
            </th>
            <th scope="col" aria-sort={sortKey === 'battery_pct' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}>
              <button type="button" className="status-sort-button" onClick={() => requestSort('battery_pct')}>
                Battery
              </button>
            </th>
            <th scope="col" aria-sort={sortKey === 'altitude_ft' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}>
              <button type="button" className="status-sort-button" onClick={() => requestSort('altitude_ft')}>
                Altitude
              </button>
            </th>
            <th scope="col" aria-sort={sortKey === 'speed_kts' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}>
              <button type="button" className="status-sort-button" onClick={() => requestSort('speed_kts')}>
                Speed
              </button>
            </th>
            <th scope="col">Location</th>
            <th scope="col" aria-sort={sortKey === 'timestamp' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}>
              <button type="button" className="status-sort-button" onClick={() => requestSort('timestamp')}>
                Last update
              </button>
            </th>
            <th scope="col">Details</th>
          </tr>
        </thead>
        <tbody>
          {sortedRows.length === 0 ? (
            <tr>
              <td colSpan={9}>No aircraft in this filter.</td>
            </tr>
          ) : (
            sortedRows.map((aircraft) => (
              <tr key={aircraft.aircraft_id}>
                <td>{aircraft.tail_number}</td>
                <td>{(aircraft.type || '--').toUpperCase()}</td>
                <td>
                  <StatusPill status={aircraft.status} />
                </td>
                <td>
                  <BatteryBar batteryPct={aircraft.battery_pct} />
                </td>
                <td>{Math.round(aircraft.altitude_ft ?? 0)} ft</td>
                <td>{Math.round(aircraft.speed_kts ?? 0)} kts</td>
                <td>{formatLocation(aircraft.lat, aircraft.lng)}</td>
                <td>{relativeTime(aircraft.last_update || aircraft.timestamp)}</td>
                <td>
                  <button
                    type="button"
                    className="status-detail-button"
                    onClick={() => setSelectedAircraftId(aircraft.aircraft_id)}
                  >
                    Open
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <DetailPanel
        aircraft={selectedAircraft}
        isOpen={Boolean(selectedAircraft)}
        onClose={() => setSelectedAircraftId(null)}
      />
    </section>
  );
}

export default FleetStatus;
