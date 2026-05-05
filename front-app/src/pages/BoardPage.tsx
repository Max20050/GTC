import { useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { Topbar } from '../components/topbar/Topbar';
import { ComponentPalette } from '../components/sidebar/ComponentPalette';
import { Canvas } from '../components/canvas/Canvas';
import { Inspector } from '../components/inspector/Inspector';
import { Statusbar } from '../components/statusbar/Statusbar';
import { GenerateModal } from '../components/generate/GenerateModal';
import { useCanvasSync } from '../hooks/useCanvasSync';
import { createEmbed } from '../lib/canvas-api';
import type { NodeType } from '../types/diagram';
import styles from './BoardPage.module.css';

export function BoardPage() {
  const { boardId = 'default', nodeId } = useParams<{ boardId: string; nodeId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const canvasId = nodeId ? `${boardId}:${nodeId}` : boardId;

  const [zoom, setZoom] = useState(1);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [isDrawingZone, setIsDrawingZone] = useState(false);

  const { initialRFNodes, initialRFEdges, loading, syncError } = useCanvasSync(canvasId);
  const embeddedNodeLabel = nodeId
    ? (location.state as { embeddedNodeLabel?: string } | null)?.embeddedNodeLabel
    : undefined;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  const handleNodeDoubleClick = useCallback((nId: string, label: string) => {
    createEmbed(boardId, nId).catch(console.error);
    navigate(`/boards/${boardId}/node/${nId}`, { state: { embeddedNodeLabel: label } });
  }, [boardId, navigate]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, activatorEvent } = event;
    const nodeType = active.data.current?.nodeType as NodeType | undefined;
    if (!nodeType) return;

    const pointerEvent = activatorEvent as PointerEvent;
    const addNode = (window as unknown as Record<string, unknown>).__canvasAddNode as
      | ((type: NodeType, x: number, y: number) => void)
      | undefined;

    if (addNode && event.over?.id === 'canvas-drop-zone') {
      const delta = event.delta;
      addNode(nodeType, pointerEvent.clientX + delta.x, pointerEvent.clientY + delta.y);
    }
  }, []);

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className={styles.app}>
        <Topbar
          onGenerateDocs={() => setGenerateOpen(true)}
          isDrawingZone={isDrawingZone}
          onToggleZoneMode={() => setIsDrawingZone((v) => !v)}
          parentBoardId={nodeId ? boardId : undefined}
          embeddedNodeLabel={embeddedNodeLabel}
          onNavigateUp={nodeId ? () => navigate(`/boards/${boardId}`) : undefined}
        />
        <div className={styles.main}>
          <ComponentPalette />
          {loading ? (
            <div className={styles.loading}>
              <span className={styles.loadingDot} />
              Loading canvas…
            </div>
          ) : (
            <Canvas
              key={canvasId}
              onZoomChange={setZoom}
              initialNodes={initialRFNodes}
              initialEdges={initialRFEdges}
              isDrawingZone={isDrawingZone}
              onZoneModeEnd={() => setIsDrawingZone(false)}
              onNodeDoubleClick={nodeId ? undefined : handleNodeDoubleClick}
            />
          )}
          <Inspector />
        </div>
        <Statusbar zoom={zoom} syncError={syncError} />
      </div>
      <GenerateModal open={generateOpen} onClose={() => setGenerateOpen(false)} />
    </DndContext>
  );
}
