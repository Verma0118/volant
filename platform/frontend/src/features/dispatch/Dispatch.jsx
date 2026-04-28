import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useMissionSocket } from '../../hooks/useMissionSocket';
import { StatusPill } from '../../shared/components';
import { dedupeFleetRowsByTail } from '../../utils/fleetDedupe';

const API_BASE_URL = `${window.location.protocol}//${window.location.hostname}:3001`;

const PRIORITY_LABELS = { urgent: 'Urgent', normal: 'Normal', low: 'Low' };
const PRIORITY_CLASSES = {
  urgent: 'priority-badge--urgent',
  normal: 'priority-badge--normal',
  low: 'priority-badge--low',
};

function isDispatchEligibleClient(aircraft) {
  const batt = Number(aircraft.battery_pct);
  if (!Number.isFinite(batt) || batt < 40) {
    return false;
  }
  if (aircraft.status === 'ready') {
    return true;
  }
  if (aircraft.status === 'charging' && batt >= 82) {
    return true;
  }
  return false;
}

const ACTIVE_MISSION_STATUSES = new Set(['queued', 'assigned', 'in-flight', 'conflict']);

const QUICK_FILLS = [
  {
    label: 'Pre-fill: DFW Airport → Downtown Dallas',
    origin: { lat: 32.8998, lng: -97.0403 },
    dest: { lat: 32.7767, lng: -96.797 },
  },
  {
    label: 'Pre-fill: Love Field → Alliance',
    origin: { lat: 32.8471, lng: -96.8512 },
    dest: { lat: 32.9876, lng: -97.3189 },
  },
];

function relativeTime(isoString) {
  if (!isoString) return '—';
  const diffMs = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

export default function Dispatch({ socket, isAuthenticated, csrfToken, fleetState }) {
  const { missionsList } = useMissionSocket(socket, isAuthenticated);

  const originLegendId = useId();
  const destLegendId = useId();
  const successId = useId();
  const errorId = useId();

  const [form, setForm] = useState({
    origin_lat: '',
    origin_lng: '',
    dest_lat: '',
    dest_lng: '',
    cargo_type: 'medical',
    priority: 'normal',
  });
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const clearTimerRef = useRef(null);
  const availableAircraft = useMemo(() => {
    const merged = dedupeFleetRowsByTail(Object.values(fleetState || {}));
    return merged
      .filter(isDispatchEligibleClient)
      .sort((a, b) => a.tail_number.localeCompare(b.tail_number));
  }, [fleetState]);

  const missionsActive = useMemo(
    () => missionsList.filter((m) => ACTIVE_MISSION_STATUSES.has(m.status)),
    [missionsList]
  );

  const missionsRecentDone = useMemo(
    () => missionsList.filter((m) => m.status === 'completed').slice(0, 12),
    [missionsList]
  );

  useEffect(() => {
    document.title = 'Mission Dispatch - Volant';
    return () => {
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    };
  }, []);

  const setField = (key) => (e) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const applyQuickFill = (fill) => {
    setForm((prev) => ({
      ...prev,
      origin_lat: String(fill.origin.lat),
      origin_lng: String(fill.origin.lng),
      dest_lat: String(fill.dest.lat),
      dest_lng: String(fill.dest.lng),
    }));
  };

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setErrorMsg('');
      setSuccessMsg('');
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
      setSubmitting(true);

      if (availableAircraft.length === 0) {
        setErrorMsg(
          'No aircraft currently dispatchable. Need battery ≥40% and status ready, or charging ≥82%.'
        );
        setSubmitting(false);
        return;
      }

      try {
        const res = await fetch(`${API_BASE_URL}/api/missions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-csrf-token': csrfToken,
          },
          credentials: 'include',
          body: JSON.stringify({
            origin_lat: Number(form.origin_lat),
            origin_lng: Number(form.origin_lng),
            dest_lat: Number(form.dest_lat),
            dest_lng: Number(form.dest_lng),
            cargo_type: form.cargo_type,
            priority: form.priority,
          }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          const reason =
            data?.mission?.conflict_reason || data?.error || 'Dispatch failed';
          setErrorMsg(reason);
          return;
        }

        const tail = data?.mission?.tail_number || data?.tail_number || data?.aircraft?.tail_number;
        setSuccessMsg(tail ? `Mission dispatched — ${tail} assigned` : 'Mission dispatched');
        clearTimerRef.current = setTimeout(() => setSuccessMsg(''), 4000);
      } catch {
        setErrorMsg('Network error — retry');
      } finally {
        setSubmitting(false);
      }
    },
    [availableAircraft.length, csrfToken, form],
  );

  return (
    <div className="dispatch-layout">
      {/* ── Left: mission creation ── */}
      <section
        className="dispatch-panel"
        aria-labelledby="dispatch-form-heading"
      >
        <h2 id="dispatch-form-heading" className="panel-heading">
          New Mission
        </h2>

        <div className="dispatch-availability" aria-live="polite" aria-atomic="true">
          <p className="dispatch-availability__title">
            Dispatchable aircraft now: {availableAircraft.length}
          </p>
          <p className="dispatch-availability__rule">
            Rule: battery {'>='} 40% and (status ready, or charging {'>='} 82%)
          </p>
          <p className="dispatch-availability__list">
            {availableAircraft.length > 0
              ? availableAircraft.map((aircraft) => aircraft.tail_number).join(', ')
              : 'None available yet. Wait for simulator cycle.'}
          </p>
        </div>

        <div className="dispatch-quick-fills">
          {QUICK_FILLS.map((fill) => (
            <button
              key={fill.label}
              type="button"
              className="btn-secondary btn-sm"
              aria-label={fill.label}
              onClick={() => applyQuickFill(fill)}
            >
              {fill.label.replace('Pre-fill: ', '')}
            </button>
          ))}
        </div>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="dispatch-form"
          aria-label="Mission creation"
        >
          <fieldset className="form-fieldset">
            <legend id={originLegendId} className="fieldset-legend">
              Origin
            </legend>
            <div className="field-row">
              <div className="form-field">
                <label htmlFor="origin-lat" className="field-label">
                  Latitude
                </label>
                <input
                  id="origin-lat"
                  type="number"
                  step="0.0001"
                  min="-90"
                  max="90"
                  className="field-input field-input--mono"
                  value={form.origin_lat}
                  onChange={setField('origin_lat')}
                  required
                />
              </div>
              <div className="form-field">
                <label htmlFor="origin-lng" className="field-label">
                  Longitude
                </label>
                <input
                  id="origin-lng"
                  type="number"
                  step="0.0001"
                  min="-180"
                  max="180"
                  className="field-input field-input--mono"
                  value={form.origin_lng}
                  onChange={setField('origin_lng')}
                  required
                />
              </div>
            </div>
          </fieldset>

          <fieldset className="form-fieldset">
            <legend id={destLegendId} className="fieldset-legend">
              Destination
            </legend>
            <div className="field-row">
              <div className="form-field">
                <label htmlFor="dest-lat" className="field-label">
                  Latitude
                </label>
                <input
                  id="dest-lat"
                  type="number"
                  step="0.0001"
                  min="-90"
                  max="90"
                  className="field-input field-input--mono"
                  value={form.dest_lat}
                  onChange={setField('dest_lat')}
                  required
                />
              </div>
              <div className="form-field">
                <label htmlFor="dest-lng" className="field-label">
                  Longitude
                </label>
                <input
                  id="dest-lng"
                  type="number"
                  step="0.0001"
                  min="-180"
                  max="180"
                  className="field-input field-input--mono"
                  value={form.dest_lng}
                  onChange={setField('dest_lng')}
                  required
                />
              </div>
            </div>
          </fieldset>

          <div className="field-row">
            <div className="form-field">
              <label htmlFor="cargo-type" className="field-label">
                Cargo Type
              </label>
              <select
                id="cargo-type"
                className="field-input field-select"
                value={form.cargo_type}
                onChange={setField('cargo_type')}
              >
                <option value="medical">Medical</option>
                <option value="package">Package</option>
                <option value="inspection">Inspection</option>
                <option value="passenger">Passenger</option>
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="priority" className="field-label">
                Priority
              </label>
              <select
                id="priority"
                className="field-input field-select"
                value={form.priority}
                onChange={setField('priority')}
              >
                <option value="urgent">Urgent</option>
                <option value="normal">Normal</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          {/* Always in DOM for screen reader continuity */}
          <p
            id={successId}
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="dispatch-success"
          >
            {successMsg}
          </p>
          <p
            id={errorId}
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
            className="dispatch-error"
          >
            {errorMsg}
          </p>

          <button
            type="submit"
            className="btn-primary"
            disabled={submitting || availableAircraft.length === 0}
            aria-busy={submitting}
          >
            {submitting
              ? 'Dispatching…'
              : availableAircraft.length === 0
                ? 'Waiting for Available Aircraft'
                : 'Dispatch Mission'}
          </button>
        </form>
      </section>

      {/* ── Right: mission queue ── */}
      <section
        className="dispatch-panel dispatch-queue-panel"
        aria-labelledby="mission-queue-heading"
      >
        <h2 id="mission-queue-heading" className="panel-heading">
          Mission queue
        </h2>

        <h3 className="mission-queue-subheading">In progress</h3>
        <ul
          className="mission-list"
          aria-label="Missions in progress"
          aria-live="polite"
          aria-relevant="additions text"
        >
          {missionsActive.length === 0 ? (
            <li className="queue-empty">None in flight — dispatch when aircraft are available</li>
          ) : (
            missionsActive.map((mission) => (
              <li key={mission.mission_id} className="mission-card">
                <div className="mission-card__top">
                  <StatusPill status={mission.status} />
                  <span
                    className={`priority-badge ${PRIORITY_CLASSES[mission.priority] || PRIORITY_CLASSES.normal}`}
                  >
                    {PRIORITY_LABELS[mission.priority] || mission.priority}
                  </span>
                  <time
                    className="mission-time"
                    dateTime={mission.dispatched_at}
                    title={mission.dispatched_at}
                  >
                    {relativeTime(mission.dispatched_at)}
                  </time>
                </div>
                <div className="mission-card__bottom">
                  <span className="mission-tail">
                    {mission.tail_number || 'Unassigned'}
                  </span>
                  {mission.cargo_type && (
                    <span className="mission-cargo">{mission.cargo_type}</span>
                  )}
                  {mission.conflict_reason && (
                    <span className="mission-conflict">
                      {mission.conflict_reason}
                    </span>
                  )}
                </div>
              </li>
            ))
          )}
        </ul>

        {missionsRecentDone.length > 0 ? (
          <>
            <h3 className="mission-queue-subheading mission-queue-subheading--secondary">
              Recently completed
            </h3>
            <ul className="mission-list mission-list--secondary" aria-label="Recently completed missions">
              {missionsRecentDone.map((mission) => (
                <li key={`done-${mission.mission_id}`} className="mission-card mission-card--done">
                  <div className="mission-card__top">
                    <StatusPill status={mission.status} />
                    <span
                      className={`priority-badge ${PRIORITY_CLASSES[mission.priority] || PRIORITY_CLASSES.normal}`}
                    >
                      {PRIORITY_LABELS[mission.priority] || mission.priority}
                    </span>
                    <time
                      className="mission-time"
                      dateTime={mission.dispatched_at}
                      title={mission.dispatched_at}
                    >
                      {relativeTime(mission.dispatched_at)}
                    </time>
                  </div>
                  <div className="mission-card__bottom">
                    <span className="mission-tail">
                      {mission.tail_number || 'Unassigned'}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </section>
    </div>
  );
}
