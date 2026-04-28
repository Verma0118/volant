import { useCallback, useEffect, useState } from 'react';

const AUTH_CHANGE_EVENT = 'volant-auth-changed';
const API_BASE_URL = `${window.location.protocol}//${window.location.hostname}:3001`;

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authResolved, setAuthResolved] = useState(false);

  useEffect(() => {
    const syncSession = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/session`, {
          credentials: 'include',
        });
        setIsAuthenticated(response.ok);
      } catch {
        setIsAuthenticated(false);
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
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
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
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Best-effort logout.
    }
    setIsAuthenticated(false);
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
  }, []);

  return {
    isAuthenticated,
    authResolved,
    login,
    logout,
  };
}
