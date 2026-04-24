import { useDiagram } from '../../hooks/useDiagram';
import styles from './Statusbar.module.css';

interface StatusbarProps {
  zoom: number;
  syncError?: string | null;
}

export function Statusbar({ zoom, syncError }: StatusbarProps) {
  const lastSaved = useDiagram((s) => s.lastSaved);

  const savedText = syncError
    ? `sync error`
    : lastSaved
    ? `autosaved ${Math.round((Date.now() - lastSaved.getTime()) / 1000)}s ago`
    : 'not saved yet';

  return (
    <footer className={styles.statusbar}>
      <div className={styles.left}>
        <span className={`${styles.dot} ${syncError ? styles.dotError : ''}`} />
        <span className={syncError ? styles.error : ''}>{syncError ?? `live · ${savedText}`}</span>
      </div>
      <div className={styles.center}>
        <span>⌘+scroll to zoom · drag to pan · drag from palette to add · Del to remove</span>
      </div>
      <div className={styles.right}>
        <span>v2026.4.23 · {Math.round(zoom * 100)}%</span>
      </div>
    </footer>
  );
}
