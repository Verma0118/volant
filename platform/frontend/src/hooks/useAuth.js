import { useCallback, useEffect, useState } from 'react';
import { getApiOrigin } from '../config/apiOrigin.js';

const AUTH_CHANGE_EVENT = 'volant-auth-changed';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authResolved, setAuthResolved] = useState(false);
  const [csrfToken, setCsrfToken] = useState('');

  useEffect(() => {
    const syncSession = async () => {
      try {
        const response = await fetch(`${getApiOrigin()}/api/auth/session`, {
          credentials: 'include',
        });
        setIsAuthenticated(response.ok);
        const payload = await response.json().catch(() => ({}));
        setCsrfToken(response.ok ? payload.csrfToken || '' : '');
      } catch {
        setIsAuthenticated(false);
        setCsrfToken('');
      } finally {
        setAuthResolved(true);
      }
    };

    const onAuthChanged = () => {
      syncSession();
    };

    window.addEventListener(AUTH_CHANGE_EVENT, onAuthChanged);
    syncSession();
    return () => {
      window.removeEventListener(AUTH_CHANGE_EVENT, onAuthChanged);
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const response = await fetch(`${getApiOrigin()}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || 'Invalid credentials');
    }

    setIsAuthenticated(true);
    setCsrfToken(payload.csrfToken || '');
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch(`${getApiOrigin()}/api/auth/logout`, {
        method: 'POST',
        headers: csrfToken ? { 'x-csrf-token': csrfToken } : {},
        credentials: 'include',
      });
    } catch {
      // Best-effort logout.
    }
    setIsAuthenticated(false);
    setCsrfToken('');
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
  }, [csrfToken]);

  return {
    isAuthenticated,
    authResolved,
    csrfToken,
    login,
    logout,
  };
}
