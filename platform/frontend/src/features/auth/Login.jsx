import { useEffect, useId, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function Login() {
  const formHeadingId = useId();
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

  if (isAuthenticated) return <Navigate to="/fleet" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      navigate('/fleet', { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-page__atmosphere" aria-hidden="true">
        <div className="login-page__wash" />
        <div className="login-page__bloom login-page__bloom--1" />
        <div className="login-page__bloom login-page__bloom--2" />
        <div className="login-page__bloom login-page__bloom--3" />
        <div className="login-page__bloom login-page__bloom--4" />
        <div className="login-page__aurora" />
        <div className="login-page__mesh" />
        <div className="login-page__mesh-alt" />
        <div className="login-page__sheen" />
        <div className="login-page__veil" />
      </div>

      <header className="login-page__ribbon">
        <div className="login-page__ribbon-inner">
          <div className="login-page__brand">
            <span className="login-page__wordmark">Volant</span>
            <span className="login-page__tag">Fleet operations</span>
          </div>
          <p className="login-page__live">
            <span className="login-page__live-dot" aria-hidden="true" />
            <span>Connected</span>
          </p>
        </div>
      </header>

      <div className="login-page__body">
        <section className="login-page__auth" aria-labelledby={formHeadingId}>
          <h1 id={formHeadingId} className="login-page__form-title">
            Sign in
          </h1>

          <form
            onSubmit={handleSubmit}
            aria-labelledby={formHeadingId}
            noValidate
            className="login-page__form"
          >
            <div className="login-page__field">
              <label htmlFor="login-email" className="login-page__label">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                className="login-page__input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                aria-invalid={error ? 'true' : undefined}
                aria-describedby={error ? errorId : undefined}
              />
            </div>

            <div className="login-page__field">
              <label htmlFor="login-password" className="login-page__label">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                className="login-page__input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                aria-invalid={error ? 'true' : undefined}
                aria-describedby={error ? errorId : undefined}
              />
            </div>

            <p id={errorId} role="alert" aria-atomic="true" className="login-page__error">
              {error}
            </p>

            <button
              type="submit"
              className="btn-primary login-page__submit"
              disabled={submitting}
              aria-busy={submitting}
            >
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="login-page__hint">
            Demo <code>dispatcher@volant.demo</code> · <code>dispatch123</code>
          </p>
        </section>
      </div>
    </div>
  );
}
