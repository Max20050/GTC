import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Cpu } from 'lucide-react';
import { authApi, saveTokens } from '../lib/auth-api';
import styles from './AuthPage.module.css';

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError('');
    try {
      const res = await authApi.login(email, password);
      saveTokens(res);
      navigate('/home');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  function handleGoogleLogin() {
    window.location.href = authApi.googleLoginUrl();
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <Cpu size={26} color="var(--accent-blue)" />
          <span>Graph to Code</span>
        </div>

        <h1 className={styles.title}>Sign in</h1>

        {error && <div className={styles.error}>{error}</div>}

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.label}>
            Email
            <input
              className={styles.input}
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label className={styles.label}>
            Password
            <input
              className={styles.input}
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          <button className={styles.submit} type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className={styles.divider}><span>or</span></div>

        <button className={styles.googleBtn} type="button" onClick={handleGoogleLogin}>
          <GoogleIcon />
          Continue with Google
        </button>

        <p className={styles.footer}>
          No account? <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" fill="none">
      <path d="M43.6 24.5c0-1.5-.1-3-.4-4.5H24v8.5h11c-.5 2.5-2 4.7-4.1 6.1v5h6.6c3.9-3.6 6.1-8.9 6.1-15.1z" fill="#4285F4"/>
      <path d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.6-5c-1.8 1.2-4.1 2-6.9 2-5.3 0-9.8-3.6-11.4-8.4H4.9v5.2C8.3 39.5 15.6 44 24 44z" fill="#34A853"/>
      <path d="M12.6 27.7c-.4-1.2-.6-2.4-.6-3.7s.2-2.5.6-3.7v-5.2H4.9C3.5 17.8 3 20.8 3 24s.5 6.2 1.9 8.9l7.7-5.2z" fill="#FBBC05"/>
      <path d="M24 9.9c3 0 5.7 1 7.8 3l5.8-5.8C33.9 3.8 29.4 2 24 2 15.6 2 8.3 6.5 4.9 13.1l7.7 5.2C14.2 13.5 18.7 9.9 24 9.9z" fill="#EA4335"/>
    </svg>
  );
}
