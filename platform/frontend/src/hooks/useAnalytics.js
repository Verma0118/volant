import { useEffect, useState } from 'react';
import { getApiOrigin } from '../config/apiOrigin';

export function useAnalytics({ isAuthenticated }) {
  const [summary, setSummary] = useState(null);
  const [aircraft, setAircraft] = useState([]);
  const [missionsByDay, setMissionsByDay] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    let active = true;

    (async () => {
      if (active) setLoading(true);
      if (active) setError(null);
      try {
        const base = getApiOrigin();
        const [sRes, aRes, mRes] = await Promise.all([
          fetch(`${base}/api/analytics/summary`, { credentials: 'include' }),
          fetch(`${base}/api/analytics/aircraft`, { credentials: 'include' }),
          fetch(`${base}/api/analytics/missions-by-day`, { credentials: 'include' }),
        ]);

        if (!sRes.ok || !aRes.ok || !mRes.ok) throw new Error('Analytics fetch failed');

        const [s, a, m] = await Promise.all([sRes.json(), aRes.json(), mRes.json()]);
        if (active) {
          setSummary(s);
          setAircraft(a);
          setMissionsByDay(m);
        }
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => { active = false; };
  }, [isAuthenticated]);

  return { summary, aircraft, missionsByDay, loading, error };
}
