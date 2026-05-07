import { useCallback, useEffect, useState } from 'react';
import { getApiOrigin } from '../config/apiOrigin';

export function useCompliance({ isAuthenticated }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ regulation: '', laanc_status: '' });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (filters.regulation) params.set('regulation', filters.regulation);
      if (filters.laanc_status) params.set('laanc_status', filters.laanc_status);
      try {
        const res = await fetch(
          `${getApiOrigin()}/api/compliance?${params.toString()}`,
          { credentials: 'include' }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (active) setRecords(data);
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [isAuthenticated, filters, tick]);

  const refresh = useCallback(() => {
    setTick((t) => t + 1);
  }, []);

  const exportCsvUrl = `${getApiOrigin()}/api/compliance/export.csv`;

  return { records, loading, error, filters, setFilters, refresh, exportCsvUrl };
}
