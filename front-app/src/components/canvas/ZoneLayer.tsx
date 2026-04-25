import { useViewport } from '@xyflow/react';
import { useDiagram } from '../../hooks/useDiagram';
import styles from './ZoneLayer.module.css';

export function ZoneLayer() {
  const regions = useDiagram((s) => s.regions);
  const { x, y, zoom } = useViewport();

  if (regions.length === 0) return null;

  return (
    <div className={styles.layer}>
      {regions.map((r) => (
        <div
          key={r.id}
          className={styles.zone}
          style={{
            left: r.bounds.x * zoom + x,
            top: r.bounds.y * zoom + y,
            width: r.bounds.w * zoom,
            height: r.bounds.h * zoom,
          }}
        >
          {r.label && <span className={styles.label}>{r.label}</span>}
        </div>
      ))}
    </div>
  );
}
