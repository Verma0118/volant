import { useCallback, useEffect, useState } from 'react';
import { getApiOrigin } from '../config/apiOrigin.js';

export function useMaintenance({ isAuthenticated, csrfToken }) {
  const [fleetSummary, setFleetSummary] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`${getApiOrigin()}/api/maintenance`, { credentials: 'include' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (active) setFleetSummary(data);
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [isAuthenticated]);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!selectedId) {
        setDetail(null);
        return;
      }
      setDetailLoading(true);
      setDetail(null);
      try {
        const res = await fetch(
          `${getApiOrigin()}/api/maintenance/aircraft/${selectedId}`,
          { credentials: 'include' }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (active) setDetail(data);
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setDetailLoading(false);
      }
    })();
    return () => { active = false; };
  }, [selectedId]);

  const refreshFleet = useCallback(async () => {
    try {
      const res = await fetch(`${getApiOrigin()}/api/maintenance`, { credentials: 'include' });
      if (!res.ok) return;
      setFleetSummary(await res.json());
    } catch { /* silent background refresh */ }
  }, []);

  const refreshDetail = useCallback(async (aircraftId) => {
    try {
      const res = await fetch(
        `${getApiOrigin()}/api/maintenance/aircraft/${aircraftId}`,
        { credentials: 'include' }
      );
      if (!res.ok) return;
      setDetail(await res.json());
    } catch { /* silent background refresh */ }
  }, []);

  const logEvent = useCallback(async ({ eventType, summary, details, performedAt }) => {
    if (!selectedId) return { ok: false, error: 'No aircraft selected' };
    const headers = { 'Content-Type': 'application/json' };
    if (csrfToken) headers['x-csrf-token'] = csrfToken;

    try {
      const res = await fetch(
        `${getApiOrigin()}/api/maintenance/aircraft/${selectedId}/events`,
        {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify({
            event_type: eventType,
            summary,
            details,
            performed_at: performedAt,
          }),
        }
      );
      const body = await res.json();
      if (!res.ok) return { ok: false, error: body.error || 'Failed to log event' };

      await Promise.all([refreshFleet(), refreshDetail(selectedId)]);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }, [selectedId, csrfToken, refreshFleet, refreshDetail]);

  return {
    fleetSummary,
    loading,
    error,
    selectedId,
    setSelectedId,
    detail,
    detailLoading,
    logEvent,
    refresh: refreshFleet,
  };
}
