import { useDraggable } from '@dnd-kit/core';
import type { NodeType } from '../../types/diagram';
import styles from './PaletteItem.module.css';

interface PaletteItemProps {
  type: NodeType;
  label: string;
  shortcut: string;
  icon: React.ReactNode;
}

export function PaletteItem({ type, label, shortcut, icon }: PaletteItemProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${type}`,
    data: { nodeType: type },
  });

  return (
    <div
      ref={setNodeRef}
      className={`${styles.item} ${isDragging ? styles.dragging : ''}`}
      {...listeners}
      {...attributes}
    >
      <span className={styles.icon}>{icon}</span>
      <span className={styles.label}>{label}</span>
      <span className={styles.shortcut}>{shortcut}</span>
    </div>
  );
}
