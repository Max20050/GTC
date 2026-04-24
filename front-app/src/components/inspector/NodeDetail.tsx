import { useDiagram } from '../../hooks/useDiagram';
import type { DiagramNode } from '../../types/diagram';
import styles from './Detail.module.css';

interface NodeDetailProps {
  node: DiagramNode;
}

export function NodeDetail({ node }: NodeDetailProps) {
  const updateNode = useDiagram((s) => s.updateNode);

  return (
    <div className={styles.detail}>
      <div className={styles.header}>
        <span className={styles.badge}>{node.type.replace(/_/g, ' ').toUpperCase()}</span>
        <h2 className={styles.title}>{node.label}</h2>
        <p className={styles.sub}>{node.sublabel || '—'}</p>
      </div>

      <Section label="LABEL">
        <input
          className={styles.input}
          value={node.label}
          onChange={(e) => updateNode(node.id, { label: e.target.value })}
        />
      </Section>

      <Section label="SUBLABEL">
        <input
          className={styles.input}
          placeholder="e.g. Go 1.22 · gRPC"
          value={node.sublabel ?? ''}
          onChange={(e) => updateNode(node.id, { sublabel: e.target.value })}
        />
      </Section>

      <Section label="POSITION">
        <span className={styles.mono}>
          x: {Math.round(node.position.x)} · y: {Math.round(node.position.y)}
        </span>
      </Section>

      <Section label="ID">
        <span className={styles.mono}>{node.id}</span>
      </Section>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={styles.section}>
      <span className={styles.sectionLabel}>{label}</span>
      <div className={styles.sectionValue}>{children}</div>
    </div>
  );
}
