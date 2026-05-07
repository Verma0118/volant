import { useId, useState } from 'react';
import { useMaintenance } from '../../hooks/useMaintenance';

const EVENT_TYPES = ['scheduled', 'unscheduled', 'inspection', 'note'];

function fmtMinutes(mins) {
  if (mins == null || Number.isNaN(Number(mins))) return '—';
  const m = Number(mins);
  const h = Math.floor(m / 60);
  const rem = Math.round(m % 60);
  if (h === 0) return `${rem}m`;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
}

function fmtDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

function EventBadge({ type }) {
  return (
    <span className={`maint-event-badge maint-event-badge--${type}`} aria-label={`Event type: ${type}`}>
      {type}
    </span>
  );
}

function DueRow({ item }) {
  const desc = item.kind === 'hours'
    ? `${fmtMinutes(item.due_after_minutes)} flight time`
    : item.kind === 'battery_cycles'
    ? `${item.due_after_minutes} cycles`
    : fmtDate(item.due_at);

  return (
    <li className="maint-due-row">
      <span className="maint-due-kind">{item.kind.replace('_', ' ')}</span>
      <span className="maint-due-label">{item.label || '—'}</span>
      <span className="maint-due-desc">{desc}</span>
    </li>
  );
}

function LogEventForm({ onSubmit, onCancel }) {
  const uid = useId();
  const [fields, setFields] = useState({ eventType: 'scheduled', summary: '', details: '' });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const set = (key) => (e) => setFields((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    const result = await onSubmit({
      eventType: fields.eventType,
      summary: fields.summary.trim(),
      details: fields.details.trim() || null,
    });
    setSubmitting(false);
    if (result.ok) {
      setFields({ eventType: 'scheduled', summary: '', details: '' });
    } else {
      setFormError(result.error);
    }
  };

  return (
    <form className="maint-log-form" onSubmit={handleSubmit} aria-label="Log maintenance event">
      <h3 className="maint-log-form__title">Log Event</h3>

      <div className="maint-form-row">
        <label className="maint-form-label" htmlFor={`${uid}-type`}>Event type</label>
        <select
          id={`${uid}-type`}
          className="maint-form-select"
          value={fields.eventType}
          onChange={set('eventType')}
          required
        >
          {EVENT_TYPES.map((t) => (
            <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
          ))}
        </select>
      </div>

      <div className="maint-form-row">
        <label className="maint-form-label" htmlFor={`${uid}-summary`}>Summary</label>
        <input
          id={`${uid}-summary`}
          type="text"
          className="maint-form-input"
          value={fields.summary}
          onChange={set('summary')}
          maxLength={200}
          required
          placeholder="e.g. 100-hour inspection complete"
        />
      </div>

      <div className="maint-form-row">
        <label className="maint-form-label" htmlFor={`${uid}-details`}>Details (optional)</label>
        <textarea
          id={`${uid}-details`}
          className="maint-form-textarea"
          value={fields.details}
          onChange={set('details')}
          rows={3}
          placeholder="Additional notes..."
        />
      </div>

      {formError && (
        <p className="maint-form-error" role="alert">{formError}</p>
      )}

      <div className="maint-form-actions">
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? 'Saving…' : 'Save Event'}
        </button>
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function DetailPane({ detail, loading, onLogEvent }) {
  const [showForm, setShowForm] = useState(false);

  const handleSubmit = async (data) => {
    const result = await onLogEvent(data);
    if (result.ok) setShowForm(false);
    return result;
  };

  if (loading) {
    return (
      <div className="maint-detail-pane" aria-busy="true">
        <p className="maint-detail-loading">Loading…</p>
      </div>
    );
  }

  if (!detail) return null;

  return (
    <section className="maint-detail-pane" aria-label={`Maintenance detail for ${detail.tail_number}`}>
      <div className="maint-detail-header">
        <div>
          <h2 className="maint-detail-tail">{detail.tail_number}</h2>
          <p className="maint-detail-model">{detail.model || '—'}</p>
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={() => setShowForm((v) => !v)}
          aria-expanded={showForm}
        >
          {showForm ? 'Cancel' : 'Log Event'}
        </button>
      </div>

      <dl className="maint-stats-list">
        <div className="maint-stat">
          <dt>Flight hours</dt>
          <dd>{fmtMinutes(detail.total_flight_minutes)}</dd>
        </div>
        <div className="maint-stat">
          <dt>Battery cycles</dt>
          <dd>{detail.battery_cycle_count ?? '—'}</dd>
        </div>
        <div className="maint-stat">
          <dt>Last maintenance</dt>
          <dd>{fmtDate(detail.last_maintenance_at)}</dd>
        </div>
      </dl>

      {showForm && (
        <LogEventForm onSubmit={handleSubmit} onCancel={() => setShowForm(false)} />
      )}

      {detail.due && detail.due.length > 0 && (
        <div className="maint-due-section">
          <h3 className="maint-section-title">Upcoming Due</h3>
          <ul className="maint-due-list" aria-label="Maintenance due items">
            {detail.due.map((item) => <DueRow key={item.id} item={item} />)}
          </ul>
        </div>
      )}

      <div className="maint-events-section">
        <h3 className="maint-section-title">Event Log</h3>
        {detail.events && detail.events.length > 0 ? (
          <ul className="maint-events-list" aria-label="Maintenance events">
            {detail.events.map((ev) => (
              <li key={ev.id} className="maint-event-row">
                <div className="maint-event-meta">
                  <EventBadge type={ev.event_type} />
                  <span className="maint-event-date">{fmtDateTime(ev.performed_at)}</span>
                </div>
                <p className="maint-event-summary">{ev.summary}</p>
                {ev.details && <p className="maint-event-details">{ev.details}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="maint-empty">No events logged.</p>
        )}
      </div>
    </section>
  );
}

export function Maintenance({ isAuthenticated, csrfToken }) {
  const {
    fleetSummary,
    loading,
    error,
    selectedId,
    setSelectedId,
    detail,
    detailLoading,
    logEvent,
  } = useMaintenance({ isAuthenticated, csrfToken });

  return (
    <section className="view-panel maint-view" aria-labelledby="maint-title">
      <div className="maint-fleet-col">
        <div className="maint-fleet-header">
          <h1 id="maint-title">Maintenance</h1>
          <p className="fleet-status-subtitle">Flight hours · Battery cycles · Event log</p>
        </div>

        {error && <p className="maint-error" role="alert">{error}</p>}

        {loading && !fleetSummary.length ? (
          <p className="maint-empty" aria-busy="true">Loading fleet…</p>
        ) : (
          <div className="maint-table-wrap">
            <table className="maint-table" aria-label="Fleet maintenance overview">
              <thead>
                <tr>
                  <th scope="col">Tail</th>
                  <th scope="col">Flight hrs</th>
                  <th scope="col">Cycles</th>
                  <th scope="col">Last maint.</th>
                  <th scope="col">Due</th>
                </tr>
              </thead>
              <tbody>
                {fleetSummary.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="maint-empty">No aircraft found.</td>
                  </tr>
                ) : (
                  fleetSummary.map((row) => (
                    <tr
                      key={row.aircraft_id}
                      className={`maint-table-row${selectedId === row.aircraft_id ? ' maint-table-row--selected' : ''}`}
                      onClick={() => setSelectedId(row.aircraft_id === selectedId ? null : row.aircraft_id)}
                      aria-selected={selectedId === row.aircraft_id}
                      tabIndex={0}
                      role="button"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedId(row.aircraft_id === selectedId ? null : row.aircraft_id);
                        }
                      }}
                    >
                      <td className="maint-col-tail">{row.tail_number}</td>
                      <td>{fmtMinutes(row.total_flight_minutes)}</td>
                      <td>{row.battery_cycle_count ?? '—'}</td>
                      <td>{fmtDate(row.last_maintenance_at)}</td>
                      <td>
                        {Number(row.due_count) > 0 ? (
                          <span className="maint-due-badge">{row.due_count}</span>
                        ) : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedId && (
        <DetailPane
          detail={detail}
          loading={detailLoading}
          onLogEvent={logEvent}
        />
      )}
    </section>
  );
}
