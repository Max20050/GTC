import styles from './DocPreview.module.css';
import type { DocFormat } from '../../lib/diagram-to-prompt';

interface DocPreviewProps {
  content: string;
  format: DocFormat;
}

export function DocPreview({ content, format: _format }: DocPreviewProps) {
  if (!content) {
    return (
      <div className={styles.empty}>
        <p>Generated output will appear here.</p>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <pre className={styles.pre}><code>{content}</code></pre>
    </div>
  );
}
