import { Cpu } from 'lucide-react';
import styles from './AuthPage.module.css';

export function RegisterPage() {
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <Cpu size={28} color="var(--accent-blue)" />
          <span>Graph to Code</span>
        </div>
        <h1 className={styles.title}>Create account</h1>
        <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
          <label className={styles.label}>
            Name
            <input className={styles.input} type="text" placeholder="Your name" autoComplete="name" />
          </label>
          <label className={styles.label}>
            Email
            <input className={styles.input} type="email" placeholder="you@example.com" autoComplete="email" />
          </label>
          <label className={styles.label}>
            Password
            <input className={styles.input} type="password" placeholder="••••••••" autoComplete="new-password" />
          </label>
          <button className={styles.submit} type="submit">Create account</button>
        </form>
        <p className={styles.footer}>
          Have an account? <a href="/login">Sign in</a>
        </p>
      </div>
    </div>
  );
}
