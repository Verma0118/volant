import { useCallback, useEffect, useState } from 'react';

const TOKEN_STORAGE_KEY = 'volant_token';
const AUTH_CHANGE_EVENT = 'volant-auth-changed';
const API_BASE_URL = `${window.location.protocol}//${window.location.hostname}:3001`;

export function useAuth() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_STORAGE_KEY) || '');

  useEffect(() => {
    const syncFromStorage = () => {
      setToken(localStorage.getItem(TOKEN_STORAGE_KEY) || '');
    };

    const onStorage = (event) => {
      if (event.key === TOKEN_STORAGE_KEY) {
        setToken(event.newValue || '');
      }
    };

    const onAuthChanged = () => {
      syncFromStorage();
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener(AUTH_CHANGE_EVENT, onAuthChanged);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(AUTH_CHANGE_EVENT, onAuthChanged);
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.token) {
      throw new Error(payload.error || 'Invalid credentials');
    }

    localStorage.setItem(TOKEN_STORAGE_KEY, payload.token);
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
    setToken(payload.token);
    return payload.token;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
    setToken('');
  }, []);

  return {
    token,
    isAuthenticated: Boolean(token),
    login,
    logout,
  };
}
