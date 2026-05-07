import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import RoutePreviewMap from '../../components/RoutePreviewMap';
import { useMissionSocket } from '../../hooks/useMissionSocket';
import { StatusPill } from '../../shared/components';
import { dedupeFleetRowsByTail } from '../../utils/fleetDedupe';
import {
  DISPATCH_CRUISE_KTS,
  estimateFlightMinutes,
  formatDurationMinutes,
  haversineNm,
  parseDestinationCoords,
  parseRouteCoords,
} from '../../utils/routePreview';
import { getApiOrigin } from '../../config/apiOrigin.js';

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
/** Open missions can be cleared from the queue (not in-flight — use ops workflow). */
const CANCELLABLE_STATUSES = new Set(['queued', 'conflict', 'assigned']);

function missionCanCancel(m) {
  return Boolean(m && CANCELLABLE_STATUSES.has(m.status));
}

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

function shortMissionId(id) {
  if (!id || typeof id !== 'string') return '—';
  return id.length > 10 ? `${id.slice(0, 8)}…` : id;
}

function groupKey(m) {
  return [
    m.status,
    m.priority,
    (m.tail_number || '').trim(),
    (m.cargo_type || '').trim(),
    (m.conflict_reason || '').trim(),
  ].join('\u001f');
}

export default function Dispatch({ socket, isAuthenticated, csrfToken, fleetState }) {
  const { missionsList } = useMissionSocket(socket, isAuthenticated);

  const routeSectionId = useId();
  const previewSectionId = useId();
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
  const [queueFilter, setQueueFilter] = useState('all');
  const [queueActionError, setQueueActionError] = useState('');
  const [cancelBusy, setCancelBusy] = useState(false);
  const [routePreviewOpen, setRoutePreviewOpen] = useState(false);
  const [routeApproved, setRouteApproved] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [selectedTail, setSelectedTail] = useState('');
  const clearTimerRef = useRef(null);

  const availableAircraft = useMemo(() => {
    const merged = dedupeFleetRowsByTail(Object.values(fleetState || {}));
    return merged
      .filter(isDispatchEligibleClient)
      .sort((a, b) => a.tail_number.localeCompare(b.tail_number));
  }, [fleetState]);

  const previewAircraft = useMemo(() => {
    if (!availableAircraft.length) return null;
    if (selectedTail) {
      const found = availableAircraft.find((a) => a.tail_number === selectedTail);
      if (found) return found;
    }
    return availableAircraft[0];
  }, [availableAircraft, selectedTail]);

  const missionsActive = useMemo(
    () => missionsList.filter((m) => ACTIVE_MISSION_STATUSES.has(m.status)),
    [missionsList]
  );

  const missionsRecentDone = useMemo(
    () => missionsList.filter((m) => m.status === 'completed').slice(0, 12),
    [missionsList]
  );
  const urgentActiveCount = useMemo(
    () => missionsActive.filter((m) => m.priority === 'urgent').length,
    [missionsActive]
  );

  const queuedCount = useMemo(
    () => missionsActive.filter((m) => m.status === 'queued').length,
    [missionsActive]
  );

  const groupedActive = useMemo(() => {
    const map = new Map();
    for (const m of missionsActive) {
      const k = groupKey(m);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(m);
    }
    const rows = Array.from(map.entries()).map(([key, items]) => {
      const sample = items[0];
      const latest = items.reduce((best, cur) => {
        const t = new Date(cur.dispatched_at || 0).getTime();
        const bt = new Date(best.dispatched_at || 0).getTime();
        return t > bt ? cur : best;
      }, sample);
      return { key, items, sample: latest, count: items.length };
    });
    rows.sort((a, b) => {
      const ua = a.sample.priority === 'urgent' ? 0 : 1;
      const ub = b.sample.priority === 'urgent' ? 0 : 1;
      if (ua !== ub) return ua - ub;
      return (
        new Date(b.sample.dispatched_at || 0) - new Date(a.sample.dispatched_at || 0)
      );
    });
    return rows;
  }, [missionsActive]);

  const filteredGrouped = useMemo(() => {
    if (queueFilter === 'urgent') {
      return groupedActive.filter((g) => g.sample.priority === 'urgent');
    }
    return groupedActive;
  }, [groupedActive, queueFilter]);

  /** Preview path: live aircraft position → destination (straight-line). */
  const routeMetrics = useMemo(() => {
    const dest = parseDestinationCoords(form);
    if (!previewAircraft || !dest) return null;
    const startLat = Number(previewAircraft.lat);
    const startLng = Number(previewAircraft.lng);
    if (!Number.isFinite(startLat) || !Number.isFinite(startLng)) return null;
    const nm = haversineNm(startLat, startLng, dest.dLat, dest.dLng);
    const etaMin = estimateFlightMinutes(nm);
    return {
      startLat,
      startLng,
      tail: previewAircraft.tail_number || '',
      dLat: dest.dLat,
      dLng: dest.dLng,
      nm,
      km: nm * 1.852,
      etaMin,
    };
  }, [form, previewAircraft]);

  useEffect(() => {
    document.title = 'Mission Dispatch - Volant';
    return () => {
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    };
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      setRouteApproved(false);
      setRoutePreviewOpen(false);
    });
  }, [form.dest_lat, form.dest_lng, selectedTail]);

  const setField = (key) => (e) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const applyQuickFill = (fill) => {
    setPreviewError('');
    setForm((prev) => ({
      ...prev,
      origin_lat: String(fill.origin.lat),
      origin_lng: String(fill.origin.lng),
      dest_lat: String(fill.dest.lat),
      dest_lng: String(fill.dest.lng),
    }));
  };

  const handlePredictedPath = () => {
    setPreviewError('');
    if (availableAircraft.length === 0) {
      setPreviewError('No dispatchable aircraft — wait for readiness.');
      setRoutePreviewOpen(false);
      return;
    }
    if (!previewAircraft) {
      setPreviewError('Select an aircraft.');
      setRoutePreviewOpen(false);
      return;
    }
    const dest = parseDestinationCoords(form);
    if (!dest) {
      setPreviewError('Enter valid destination latitude and longitude.');
      setRoutePreviewOpen(false);
      return;
    }
    const lat = Number(previewAircraft.lat);
    const lng = Number(previewAircraft.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setPreviewError('Selected aircraft has no live position yet.');
      setRoutePreviewOpen(false);
      return;
    }
    setRouteApproved(false);
    setRoutePreviewOpen(true);
  };

  const handleApproveRoute = () => {
    if (!routeMetrics) return;
    setForm((prev) => ({
      ...prev,
      origin_lat: String(routeMetrics.startLat),
      origin_lng: String(routeMetrics.startLng),
    }));
    setRouteApproved(true);
  };

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setErrorMsg('');
      setSuccessMsg('');
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);

      if (!routeApproved) {
        setErrorMsg('Review the predicted path on the right, then approve before dispatching.');
        return;
      }

      setSubmitting(true);

      if (availableAircraft.length === 0) {
        setErrorMsg(
          'No aircraft currently dispatchable. Need battery ≥40% and status ready, or charging ≥82%.'
        );
        setSubmitting(false);
        return;
      }

      const coords = parseRouteCoords(form);
      if (!coords) {
        setErrorMsg('Enter valid coordinates for origin and destination.');
        setSubmitting(false);
        return;
      }

      try {
        const res = await fetch(`${getApiOrigin()}/api/missions`, {
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
        setRouteApproved(false);
        setRoutePreviewOpen(false);
      } catch {
        setErrorMsg('Network error — retry');
      } finally {
        setSubmitting(false);
      }
    },
    [availableAircraft.length, csrfToken, form, routeApproved],
  );

  const canDispatch =
    routeApproved && availableAircraft.length > 0 && parseRouteCoords(form) !== null;

  const cancelMissionById = useCallback(
    async (missionId) => {
      const res = await fetch(
        `${getApiOrigin()}/api/missions/${encodeURIComponent(missionId)}/cancel`,
        {
          method: 'PATCH',
          headers: {
            'x-csrf-token': csrfToken,
          },
          credentials: 'include',
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || `Could not cancel (${res.status})`);
      }
    },
    [csrfToken]
  );

  const handleCancelGroup = useCallback(
    async (items) => {
      const ids = items.filter(missionCanCancel).map((m) => m.mission_id).filter(Boolean);
      if (!ids.length) return;
      setQueueActionError('');
      setCancelBusy(true);
      try {
        for (const id of ids) {
          await cancelMissionById(id);
        }
      } catch (err) {
        setQueueActionError(err instanceof Error ? err.message : 'Cancel failed');
      } finally {
        setCancelBusy(false);
      }
    },
    [cancelMissionById]
  );

  const handleCancelAllQueued = useCallback(async () => {
    const ids = missionsActive
      .filter((m) => m.status === 'queued')
      .map((m) => m.mission_id)
      .filter(Boolean);
    if (!ids.length) return;
    setQueueActionError('');
    setCancelBusy(true);
    try {
      for (const id of ids) {
        await cancelMissionById(id);
      }
    } catch (err) {
      setQueueActionError(err instanceof Error ? err.message : 'Cancel failed');
    } finally {
      setCancelBusy(false);
    }
  }, [cancelMissionById, missionsActive]);

  const OPEN_MISSIONS_HELP =
    'Any mission not finished yet: queued (waiting for aircraft), assigned, in flight, or conflict — not “dispatched count.” Cancel queued rows to remove them from this list.';

  return (
    <div className="dispatch-page">
      <header className="dispatch-header">
        <div>
          <h1 className="dispatch-header__title">Mission Dispatch</h1>
          <p className="dispatch-header__sub">Create routes and monitor the queue without noise.</p>
        </div>
        <div className="dispatch-stat-bar" aria-label="Mission stats">
          <div className="dispatch-stat-bar__item">
            <span className="dispatch-stat-bar__label">Dispatchable</span>
            <span className="dispatch-stat-bar__value">{availableAircraft.length}</span>
          </div>
          <span className="dispatch-stat-bar__sep" aria-hidden="true" />
          <div
            className="dispatch-stat-bar__item"
            title={OPEN_MISSIONS_HELP}
          >
            <span className="dispatch-stat-bar__label">Open</span>
            <span className="dispatch-stat-bar__value">{missionsActive.length}</span>
          </div>
          <span className="dispatch-stat-bar__sep" aria-hidden="true" />
          <div className="dispatch-stat-bar__item">
            <span className="dispatch-stat-bar__label">Urgent</span>
            <span className="dispatch-stat-bar__value">{urgentActiveCount}</span>
          </div>
          <span className="dispatch-stat-bar__sep" aria-hidden="true" />
          <div className="dispatch-stat-bar__item">
            <span className="dispatch-stat-bar__label">Completed</span>
            <span className="dispatch-stat-bar__value">{missionsRecentDone.length}</span>
          </div>
        </div>
      </header>

      <div className="dispatch-layout">
        <section
          className="dispatch-panel dispatch-compose-panel dispatch-surface--sharp"
          aria-labelledby="dispatch-form-heading"
        >
          <h2 id="dispatch-form-heading" className="panel-heading">New mission</h2>

          <div className="dispatch-availability dispatch-availability--compact" aria-live="polite" aria-atomic="true">
            <p className="dispatch-availability__title">
              {availableAircraft.length} aircraft ready
              {availableAircraft.length > 0 ? (
                <span className="dispatch-availability__tails">
                  {' '}
                  · {availableAircraft.map((a) => a.tail_number).join(', ')}
                </span>
              ) : null}
            </p>
            <p className="dispatch-availability__rule">
              Battery ≥40% · ready, or charging ≥82%
            </p>
          </div>

          {availableAircraft.length > 1 ? (
            <div className="form-field">
              <label htmlFor="dispatch-aircraft" className="field-label">
                Aircraft for preview & dispatch
              </label>
              <select
                id="dispatch-aircraft"
                className="field-input field-select"
                value={previewAircraft?.tail_number ?? ''}
                onChange={(e) => setSelectedTail(e.target.value)}
              >
                {availableAircraft.map((a) => (
                  <option key={a.tail_number} value={a.tail_number}>
                    {a.tail_number}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="dispatch-quick-fills">
            {QUICK_FILLS.map((fill) => (
              <button
                key={fill.label}
                type="button"
                className="btn-secondary btn-sm dispatch-quick-btn"
                aria-label={fill.label}
                onClick={() => applyQuickFill(fill)}
              >
                {fill.label.replace('Pre-fill: ', '')}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} noValidate className="dispatch-form" aria-label="Mission creation">
            <div
              className="dispatch-route dispatch-route--minimal"
              role="group"
              aria-labelledby={routeSectionId}
            >
              <p id={routeSectionId} className="dispatch-route__heading dispatch-route__heading--minimal">
                Route
              </p>
              <p className="dispatch-route__hint">
                Preview uses live aircraft position → destination. Origin fields update when you approve.
              </p>
              <div className="dispatch-route__quad-head" aria-hidden="true">
                <span>O lat</span>
                <span>O lng</span>
                <span>D lat</span>
                <span>D lng</span>
              </div>
              <div className="dispatch-route__quad">
                <input
                  id="origin-lat"
                  type="number"
                  step="0.0001"
                  min="-90"
                  max="90"
                  className="field-input field-input--mono field-input--compact"
                  placeholder="32.90"
                  value={form.origin_lat}
                  onChange={setField('origin_lat')}
                  required
                  aria-label="Origin latitude"
                />
                <input
                  id="origin-lng"
                  type="number"
                  step="0.0001"
                  min="-180"
                  max="180"
                  className="field-input field-input--mono field-input--compact"
                  placeholder="-97.04"
                  value={form.origin_lng}
                  onChange={setField('origin_lng')}
                  required
                  aria-label="Origin longitude"
                />
                <input
                  id="dest-lat"
                  type="number"
                  step="0.0001"
                  min="-90"
                  max="90"
                  className="field-input field-input--mono field-input--compact"
                  placeholder="32.78"
                  value={form.dest_lat}
                  onChange={setField('dest_lat')}
                  required
                  aria-label="Destination latitude"
                />
                <input
                  id="dest-lng"
                  type="number"
                  step="0.0001"
                  min="-180"
                  max="180"
                  className="field-input field-input--mono field-input--compact"
                  placeholder="-96.80"
                  value={form.dest_lng}
                  onChange={setField('dest_lng')}
                  required
                  aria-label="Destination longitude"
                />
              </div>
            </div>

            <div className="dispatch-form-meta">
              <div className="form-field">
                <label htmlFor="cargo-type" className="field-label">
                  Cargo
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

            <p id={successId} role="status" aria-live="polite" aria-atomic="true" className="dispatch-success">
              {successMsg}
            </p>
            <p id={errorId} role="alert" aria-live="assertive" aria-atomic="true" className="dispatch-error">
              {errorMsg}
            </p>

            <div className="dispatch-actions dispatch-actions--stack">
              <button
                type="button"
                className="btn-secondary dispatch-actions__preview"
                disabled={availableAircraft.length === 0}
                onClick={handlePredictedPath}
              >
                Predicted flight path
              </button>
            </div>

            {routePreviewOpen && routeMetrics && !routeApproved ? (
              <p className="dispatch-review-hint">
                Review the map and metrics on the right, then approve the route.
              </p>
            ) : null}

            {routePreviewOpen && routeMetrics && !routeApproved ? (
              <button type="button" className="btn-primary dispatch-approve" onClick={handleApproveRoute}>
                Approve route
              </button>
            ) : null}

            <div className="dispatch-actions">
              <button
                type="submit"
                className="btn-primary dispatch-actions__submit"
                disabled={submitting || !canDispatch}
                aria-busy={submitting}
              >
                {submitting
                  ? 'Dispatching…'
                  : availableAircraft.length === 0
                    ? 'Waiting for aircraft'
                    : !routeApproved
                      ? 'Approve route first'
                      : !parseRouteCoords(form)
                        ? 'Fix coordinates'
                        : 'Dispatch mission'}
              </button>
            </div>

            {previewError ? (
              <p className="dispatch-preview-error" role="alert">
                {previewError}
              </p>
            ) : null}
          </form>
        </section>

        <section
          className="dispatch-panel dispatch-queue-panel dispatch-surface--sharp"
          aria-labelledby="mission-queue-heading"
        >
          <div className="dispatch-queue-head">
            <div>
              <h2 id="mission-queue-heading" className="panel-heading">
                Mission queue
              </h2>
              <p className="dispatch-queue-lede" title={OPEN_MISSIONS_HELP}>
                {missionsActive.length} open
                {filteredGrouped.length < groupedActive.length
                  ? ` · ${filteredGrouped.length} shown`
                  : ''}
              </p>
            </div>
            <div className="dispatch-queue-head__actions">
              {queuedCount > 0 ? (
                <button
                  type="button"
                  className="btn-secondary btn-sm dispatch-queue-cancel-all"
                  disabled={cancelBusy || !csrfToken}
                  aria-busy={cancelBusy}
                  onClick={() => handleCancelAllQueued()}
                >
                  {cancelBusy ? 'Cancelling…' : `Cancel all queued (${queuedCount})`}
                </button>
              ) : null}
              <div className="dispatch-queue-filters" role="group" aria-label="Queue filter">
                <button
                  type="button"
                  className={`dispatch-filter ${queueFilter === 'all' ? 'dispatch-filter--active' : ''}`}
                  onClick={() => setQueueFilter('all')}
                >
                  All
                </button>
                <button
                  type="button"
                  className={`dispatch-filter ${queueFilter === 'urgent' ? 'dispatch-filter--active' : ''}`}
                  onClick={() => setQueueFilter('urgent')}
                >
                  Urgent
                </button>
              </div>
            </div>
          </div>

          {queueActionError ? (
            <p className="dispatch-queue-error" role="alert">
              {queueActionError}
            </p>
          ) : null}

          <div className="dispatch-queue-scroll">
            <ul className="mission-table" aria-label="Missions in progress">
              {missionsActive.length === 0 ? (
                <li className="queue-empty">No open missions — dispatch when aircraft are available.</li>
              ) : filteredGrouped.length === 0 ? (
                <li className="queue-empty">No missions match this filter.</li>
              ) : (
                filteredGrouped.map(({ key, items, sample, count }) => {
                  const cancellable = items.filter(missionCanCancel);
                  const showCancel = cancellable.length > 0;
                  return (
                  <li key={key} className="mission-group">
                    <div className="mission-row">
                      <div className="mission-row__badges">
                        <StatusPill status={sample.status} />
                        <span
                          className={`priority-badge ${
                            PRIORITY_CLASSES[sample.priority] || PRIORITY_CLASSES.normal
                          }`}
                        >
                          {PRIORITY_LABELS[sample.priority] || sample.priority}
                        </span>
                        {count > 1 ? (
                          <span className="mission-row__dup" title={`${count} identical entries`}>
                            ×{count}
                          </span>
                        ) : null}
                      </div>
                      <div className="mission-row__main">
                        <span className="mission-row__tail">{sample.tail_number || 'Unassigned'}</span>
                        <span className="mission-row__sep" aria-hidden="true">
                          ·
                        </span>
                        <span className="mission-row__cargo">{sample.cargo_type || '—'}</span>
                        {sample.conflict_reason ? (
                          <span className="mission-row__conflict" title={sample.conflict_reason}>
                            {sample.conflict_reason}
                          </span>
                        ) : null}
                      </div>
                      <time
                        className="mission-row__time"
                        dateTime={sample.dispatched_at}
                        title={sample.dispatched_at}
                      >
                        {relativeTime(sample.dispatched_at)}
                      </time>
                      <div className="mission-row__actions">
                        {showCancel ? (
                          <button
                            type="button"
                            className="btn-secondary btn-sm mission-row__cancel"
                            disabled={cancelBusy || !csrfToken}
                            aria-busy={cancelBusy}
                            aria-label={
                              cancellable.length > 1
                                ? `Cancel ${cancellable.length} missions in this row`
                                : 'Cancel mission'
                            }
                            onClick={() => handleCancelGroup(items)}
                          >
                            Cancel{cancellable.length > 1 ? ` (${cancellable.length})` : ''}
                          </button>
                        ) : null}
                      </div>
                    </div>
                    {count > 1 ? (
                      <details className="mission-group__details">
                        <summary className="mission-group__summary">
                          Mission IDs ({count})
                        </summary>
                        <ul className="mission-group__ids">
                          {items.map((m) => (
                            <li key={m.mission_id}>
                              <code>{shortMissionId(m.mission_id)}</code>
                            </li>
                          ))}
                        </ul>
                      </details>
                    ) : null}
                  </li>
                  );
                })
              )}
            </ul>
          </div>

          {missionsRecentDone.length > 0 ? (
            <details className="dispatch-recent">
              <summary className="dispatch-recent__summary">
                Recently completed
                <span className="dispatch-recent__count">{missionsRecentDone.length}</span>
              </summary>
              <ul className="mission-table mission-table--compact" aria-label="Recently completed missions">
                {missionsRecentDone.map((mission) => (
                  <li key={`done-${mission.mission_id}`} className="mission-group mission-group--done">
                    <div className="mission-row mission-row--compact">
                      <div className="mission-row__badges">
                        <StatusPill status={mission.status} />
                        <span
                          className={`priority-badge ${
                            PRIORITY_CLASSES[mission.priority] || PRIORITY_CLASSES.normal
                          }`}
                        >
                          {PRIORITY_LABELS[mission.priority] || mission.priority}
                        </span>
                      </div>
                      <div className="mission-row__main">
                        <span className="mission-row__tail">{mission.tail_number || 'Unassigned'}</span>
                      </div>
                      <time
                        className="mission-row__time"
                        dateTime={mission.dispatched_at}
                        title={mission.dispatched_at}
                      >
                        {relativeTime(mission.dispatched_at)}
                      </time>
                    </div>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}

          {routePreviewOpen && routeMetrics ? (
            <section
              className="dispatch-preview-block dispatch-surface--sharp"
              aria-labelledby={previewSectionId}
            >
              <h3 id={previewSectionId} className="dispatch-preview-block__title">
                Route preview
              </h3>
              <p className="dispatch-preview-aircraft">
                From <strong>{routeMetrics.tail}</strong>
                <span className="dispatch-preview-aircraft__sub"> (live position)</span>
              </p>
              <RoutePreviewMap
                originLat={routeMetrics.startLat}
                originLng={routeMetrics.startLng}
                destLat={routeMetrics.dLat}
                destLng={routeMetrics.dLng}
              />
              <dl className="dispatch-preview-stats">
                <div className="dispatch-preview-stat">
                  <dt>Distance</dt>
                  <dd>
                    {routeMetrics.nm.toFixed(1)} nm
                    <span className="dispatch-preview-stats__sub"> ({routeMetrics.km.toFixed(1)} km)</span>
                  </dd>
                </div>
                <div className="dispatch-preview-stat">
                  <dt>Est. flight time</dt>
                  <dd>{formatDurationMinutes(routeMetrics.etaMin)}</dd>
                </div>
              </dl>
              <p className="dispatch-preview-note">
                Straight-line path · cruise {DISPATCH_CRUISE_KTS} kt (demo estimate only).
              </p>
            </section>
          ) : null}
        </section>
      </div>
    </div>
  );
}
