import { useEffect, useId, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function Login() {
  const headingId = useId();
  const errorId = useId();
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = 'Sign In - Volant';
  }, []);

  if (isAuthenticated) return <Navigate to="/" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-shell">
      <div className="login-card">
        <h1 id={headingId} className="login-logo">Volant</h1>
        <p className="login-sub">Fleet Operations Platform</p>

        <form
          onSubmit={handleSubmit}
          aria-labelledby={headingId}
          noValidate
          className="login-form"
        >
          <div className="form-field">
            <label htmlFor="login-email" className="field-label">Email</label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              className="field-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              aria-describedby={error ? errorId : undefined}
            />
          </div>

          <div className="form-field">
            <label htmlFor="login-password" className="field-label">Password</label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              className="field-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              aria-describedby={error ? errorId : undefined}
            />
          </div>

          {/* Always in DOM — role="alert" announces when content changes */}
          <p id={errorId} role="alert" aria-atomic="true" className="login-error">
            {error}
          </p>

          <button
            type="submit"
            className="btn-primary"
            disabled={submitting}
            aria-busy={submitting}
          >
            {submitting ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="login-hint">
          Demo: <code>dispatcher@volant.demo</code> / <code>dispatch123</code>
        </p>
      </div>
    </div>
  );
}
