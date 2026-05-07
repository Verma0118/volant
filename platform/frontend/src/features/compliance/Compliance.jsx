import { useId } from 'react';
import { useCompliance } from '../../hooks/useCompliance';

function fmtDate(val) {
  if (!val) return '—';
  return new Date(val).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
}

function fmtMins(val) {
  if (val == null) return '—';
  return `${Number(val).toFixed(1)} min`;
}

function RegBadge({ value }) {
  const label = value === 'part_135' ? 'Part 135' : 'Part 107';
  return (
    <span className={`comp-badge comp-badge--${value}`} aria-label={`Regulation: ${label}`}>
      {label}
    </span>
  );
}

function LaancBadge({ status, code }) {
  const label = status === 'authorized' ? `Auth: ${code}` : status === 'not_required' ? 'Not Required' : 'Pending';
  const mod = status === 'authorized' ? 'authorized' : status === 'not_required' ? 'not-required' : 'pending';
  return (
    <span className={`comp-badge comp-badge--laanc-${mod}`} aria-label={`LAANC: ${label}`}>
      {label}
    </span>
  );
}

function FilterBar({ filters, setFilters, filterId }) {
  return (
    <div className="comp-filters" role="search" aria-label="Filter compliance records">
      <div className="comp-filter-group">
        <label htmlFor={`${filterId}-reg`} className="comp-filter-label">Regulation</label>
        <select
          id={`${filterId}-reg`}
          className="comp-select"
          value={filters.regulation}
          onChange={(e) => setFilters((f) => ({ ...f, regulation: e.target.value }))}
        >
          <option value="">All</option>
          <option value="part_107">Part 107</option>
          <option value="part_135">Part 135</option>
        </select>
      </div>

      <div className="comp-filter-group">
        <label htmlFor={`${filterId}-laanc`} className="comp-filter-label">LAANC</label>
        <select
          id={`${filterId}-laanc`}
          className="comp-select"
          value={filters.laanc_status}
          onChange={(e) => setFilters((f) => ({ ...f, laanc_status: e.target.value }))}
        >
          <option value="">All</option>
          <option value="authorized">Authorized</option>
          <option value="not_required">Not Required</option>
        </select>
      </div>
    </div>
  );
}

export function Compliance({ isAuthenticated }) {
  const filterId = useId();
  const { records, loading, error, filters, setFilters, refresh, exportCsvUrl } = useCompliance({ isAuthenticated });

  return (
    <section className="comp-view view-panel" aria-labelledby="comp-title">
      <div className="comp-header">
        <div className="comp-header-left">
          <h1 id="comp-title" className="comp-title">Compliance Log</h1>
          <p className="comp-subtitle">Immutable flight records — FAA audit-ready</p>
        </div>
        <div className="comp-header-right">
          <button
            type="button"
            className="comp-btn comp-btn--secondary"
            onClick={refresh}
            aria-label="Refresh compliance records"
          >
            Refresh
          </button>
          <a
            href={exportCsvUrl}
            className="comp-btn comp-btn--primary"
            download="compliance_log.csv"
            aria-label="Export compliance log as CSV"
          >
            Export CSV
          </a>
        </div>
      </div>

      <FilterBar filters={filters} setFilters={setFilters} filterId={filterId} />

      {error && (
        <p className="comp-error" role="alert">{error}</p>
      )}

      {loading && (
        <p className="comp-loading" aria-live="polite" aria-busy="true">Loading records…</p>
      )}

      {!loading && !error && records.length === 0 && (
        <div className="comp-empty">
          <p>No compliance records yet. Complete a mission to generate the first entry.</p>
        </div>
      )}

      {records.length > 0 && (
        <div className="comp-table-wrap" role="region" aria-label="Compliance records table" tabIndex={0}>
          <table className="comp-table" aria-label="Flight compliance log">
            <caption className="visually-hidden">
              Immutable flight compliance records. {records.length} record{records.length !== 1 ? 's' : ''} shown.
            </caption>
            <thead>
              <tr>
                <th scope="col" className="comp-th">Tail #</th>
                <th scope="col" className="comp-th">Departed</th>
                <th scope="col" className="comp-th">Completed</th>
                <th scope="col" className="comp-th">Duration</th>
                <th scope="col" className="comp-th">Cargo</th>
                <th scope="col" className="comp-th">Regulation</th>
                <th scope="col" className="comp-th">LAANC</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id} className="comp-tr">
                  <td className="comp-td comp-td--mono">{r.tail_number}</td>
                  <td className="comp-td">{fmtDate(r.departed_at)}</td>
                  <td className="comp-td">{fmtDate(r.completed_at)}</td>
                  <td className="comp-td comp-td--mono">{fmtMins(r.flight_duration_minutes)}</td>
                  <td className="comp-td">{r.cargo_type || '—'}</td>
                  <td className="comp-td">
                    <RegBadge value={r.regulation} />
                  </td>
                  <td className="comp-td">
                    <LaancBadge status={r.laanc_status} code={r.laanc_auth_code} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
