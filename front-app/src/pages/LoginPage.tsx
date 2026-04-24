import { Cpu } from 'lucide-react';
import styles from './AuthPage.module.css';

export function LoginPage() {
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <Cpu size={28} color="var(--accent-blue)" />
          <span>Graph to Code</span>
        </div>
        <h1 className={styles.title}>Sign in</h1>
        <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
          <label className={styles.label}>
            Email
            <input className={styles.input} type="email" placeholder="you@example.com" autoComplete="email" />
          </label>
          <label className={styles.label}>
            Password
            <input className={styles.input} type="password" placeholder="••••••••" autoComplete="current-password" />
          </label>
          <button className={styles.submit} type="submit">Continue</button>
        </form>
        <p className={styles.footer}>
          No account? <a href="/register">Register</a>
        </p>
      </div>
    </div>
  );
}
