import { useAnalytics } from '../../hooks/useAnalytics';

function fmt(n, decimals = 1) {
  if (n == null) return '—';
  return Number(n).toFixed(decimals);
}

function KpiCard({ label, value, unit }) {
  return (
    <div className="anly-kpi" aria-label={`${label}: ${value}${unit ? ' ' + unit : ''}`}>
      <span className="anly-kpi__value">{value}</span>
      {unit && <span className="anly-kpi__unit">{unit}</span>}
      <span className="anly-kpi__label">{label}</span>
    </div>
  );
}

function Bar({ pct, color }) {
  const clamped = Math.min(100, Math.max(0, Number(pct) || 0));
  return (
    <div className="anly-bar-track" aria-hidden="true">
      <div
        className="anly-bar-fill"
        style={{ width: `${clamped}%`, background: color }}
      />
    </div>
  );
}

function MissionsChart({ data }) {
  if (!data.length) {
    return <p className="anly-empty">No mission data in last 30 days.</p>;
  }
  const max = Math.max(...data.map((d) => d.mission_count), 1);
  return (
    <figure
      className="anly-chart"
      aria-label={`Missions per day, last 30 days. Peak: ${max}.`}
    >
      <div className="anly-chart__bars">
        {data.map((d) => {
          const pct = Math.max((d.mission_count / max) * 100, 2);
          const label = new Date(d.day).toLocaleDateString([], { month: 'short', day: 'numeric' });
          return (
            <div key={d.day} className="anly-chart__col" title={`${label}: ${d.mission_count}`}>
              <div
                className="anly-chart__bar"
                style={{ height: `${pct}%` }}
                aria-label={`${label}: ${d.mission_count} mission${d.mission_count !== 1 ? 's' : ''}`}
              />
            </div>
          );
        })}
      </div>
      <div className="anly-chart__labels" aria-hidden="true">
        {data.map((d) => {
          const label = new Date(d.day).toLocaleDateString([], { month: 'short', day: 'numeric' });
          return (
            <div key={d.day} className="anly-chart__label-cell">{label}</div>
          );
        })}
      </div>
    </figure>
  );
}

function AircraftTable({ rows }) {
  const maxHours = Math.max(...rows.map((r) => Number(r.flight_hours) || 0), 0.01);

  return (
    <div className="anly-table-wrap" role="region" aria-label="Aircraft utilization" tabIndex={0}>
      <table className="anly-table" aria-label="Per-aircraft utilization and battery health">
        <thead>
          <tr>
            <th scope="col" className="anly-th">Tail #</th>
            <th scope="col" className="anly-th">Type</th>
            <th scope="col" className="anly-th">Missions</th>
            <th scope="col" className="anly-th">Flight Hours</th>
            <th scope="col" className="anly-th anly-th--wide">Utilization</th>
            <th scope="col" className="anly-th">Cycles Used</th>
            <th scope="col" className="anly-th anly-th--wide">Battery Health</th>
            <th scope="col" className="anly-th">Cycles Left</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const utilPct = maxHours > 0 ? (Number(r.flight_hours) / maxHours) * 100 : 0;
            const batteryUsedPct = Number(r.battery_used_pct) || 0;
            const batteryColor =
              batteryUsedPct >= 80 ? '#ef4444' : batteryUsedPct >= 60 ? '#f59e0b' : '#22c55e';

            return (
              <tr key={r.aircraft_id} className="anly-tr">
                <td className="anly-td anly-td--mono">{r.tail_number}</td>
                <td className="anly-td">{r.type}</td>
                <td className="anly-td anly-td--mono">{r.mission_count}</td>
                <td className="anly-td anly-td--mono">{fmt(r.flight_hours, 2)}</td>
                <td className="anly-td">
                  <Bar pct={utilPct} color="var(--color-accent)" />
                  <span className="anly-bar-label">{fmt(utilPct, 0)}%</span>
                </td>
                <td className="anly-td anly-td--mono">{r.battery_cycle_count}</td>
                <td className="anly-td">
                  <Bar pct={batteryUsedPct} color={batteryColor} />
                  <span className="anly-bar-label"
                    style={{ color: batteryColor }}
                  >{fmt(batteryUsedPct, 0)}%</span>
                </td>
                <td className="anly-td anly-td--mono">{r.cycles_remaining}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function Analytics({ isAuthenticated }) {
  const { summary, aircraft, missionsByDay, loading, error } = useAnalytics({ isAuthenticated });

  return (
    <section className="anly-view view-panel" aria-labelledby="anly-title">
      <div className="anly-header">
        <h1 id="anly-title" className="anly-title">Analytics</h1>
        <p className="anly-subtitle">Fleet profitability and utilization</p>
      </div>

      {error && <p className="anly-error" role="alert">{error}</p>}
      {loading && <p className="anly-loading" aria-live="polite" aria-busy="true">Loading…</p>}

      {summary && (
        <div className="anly-kpi-row" aria-label="Fleet key metrics">
          <KpiCard
            label="Total Missions"
            value={summary.total_missions}
            unit=""
          />
          <KpiCard
            label="Total Flight Hours"
            value={fmt(summary.total_flight_hours, 1)}
            unit="hrs"
          />
          <KpiCard
            label="Avg Duration"
            value={fmt(summary.avg_duration_minutes, 1)}
            unit="min"
          />
          <KpiCard
            label="LAANC Auth Rate"
            value={summary.laanc_auth_rate_pct ?? '—'}
            unit="%"
          />
        </div>
      )}

      {missionsByDay.length > 0 && (
        <section className="anly-section" aria-labelledby="anly-chart-title">
          <h2 id="anly-chart-title" className="anly-section-title">Missions — Last 30 Days</h2>
          <MissionsChart data={missionsByDay} />
        </section>
      )}

      {aircraft.length > 0 && (
        <section className="anly-section" aria-labelledby="anly-aircraft-title">
          <h2 id="anly-aircraft-title" className="anly-section-title">Aircraft Utilization</h2>
          <AircraftTable rows={aircraft} />
        </section>
      )}

      {!loading && !error && aircraft.length === 0 && (
        <div className="anly-empty">
          <p>No data yet. Complete missions to populate analytics.</p>
        </div>
      )}
    </section>
  );
}
