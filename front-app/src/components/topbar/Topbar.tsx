import { History, Share2, Play, Rocket, Cpu, SquareDashed, ChevronRight } from 'lucide-react';
import { useDiagram } from '../../hooks/useDiagram';
import styles from './Topbar.module.css';

interface TopbarProps {
  onGenerateDocs: () => void;
  isDrawingZone?: boolean;
  onToggleZoneMode?: () => void;
  parentBoardId?: string;
  embeddedNodeLabel?: string;
  onNavigateUp?: () => void;
}

export function Topbar({ onGenerateDocs, isDrawingZone = false, onToggleZoneMode, parentBoardId, embeddedNodeLabel, onNavigateUp }: TopbarProps) {
  const name = useDiagram((s) => s.name);
  const nodes = useDiagram((s) => s.nodes);
  const connectors = useDiagram((s) => s.connectors);
  const regions = useDiagram((s) => s.regions);
  const setName = useDiagram((s) => s.setName);

  return (
    <header className={styles.topbar}>
      <div className={styles.left}>
        <Cpu size={18} color="var(--accent-blue)" />
        <span className={styles.breadcrumb}>
          <span className={styles.muted}>workspace</span>
          <span className={styles.sep}>/</span>
          {parentBoardId ? (
            <>
              <button className={styles.breadcrumbLink} onClick={onNavigateUp}>
                {name}
              </button>
              <ChevronRight size={12} className={styles.sepIcon} />
              <span className={styles.muted}>{embeddedNodeLabel ?? 'embedded'}</span>
            </>
          ) : (
            <input
              className={styles.nameInput}
              value={name}
              onChange={(e) => setName(e.target.value)}
              spellCheck={false}
            />
          )}
        </span>
      </div>

      <div className={styles.center}>
        <Chip label={`${nodes.length} nodes`} />
        <Chip label={`${connectors.length} connectors`} />
        <Chip label={`${regions.length} regions`} />
      </div>

      <div className={styles.right}>
        <button
          className={isDrawingZone ? styles.btnActive : styles.btnSecondary}
          onClick={onToggleZoneMode}
          title="Draw a zone rectangle on the canvas"
        >
          <SquareDashed size={14} /> Zone
        </button>
        <button className={styles.btnSecondary}>
          <History size={14} /> History
        </button>
        <button className={styles.btnSecondary}>
          <Share2 size={14} /> Share
        </button>
        <button className={styles.btnSecondary}>
          <Play size={14} /> Simulate
        </button>
        <button className={styles.btnPrimary} onClick={onGenerateDocs}>
          <Rocket size={14} /> Generate Docs
        </button>
      </div>
    </header>
  );
}

function Chip({ label }: { label: string }) {
  return <span className={styles.chip}>{label}</span>;
}
