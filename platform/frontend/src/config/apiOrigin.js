/**
 * Express API + Socket.io origin (default port 3001).
 * Set `VITE_API_ORIGIN` in `platform/.env` if the UI cannot reach the backend
 * via same hostname as the page (e.g. tunneling or split hosts).
 */
export function getApiOrigin() {
  const raw = import.meta.env.VITE_API_ORIGIN;
  if (raw && String(raw).trim()) {
    return String(raw).replace(/\/$/, '');
  }
  return `${window.location.protocol}//${window.location.hostname}:3001`;
}
