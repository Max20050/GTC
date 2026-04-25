import { useState, useRef, useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useDiagram } from '../../hooks/useDiagram';

interface Props {
  active: boolean;
  onDone: () => void;
}

export function DrawZoneOverlay({ active, onDone }: Props) {
  const { screenToFlowPosition } = useReactFlow();
  const addRegion = useDiagram((s) => s.addRegion);
  const nextZoneId = useDiagram((s) => s.nextZoneId);

  const overlayRef = useRef<HTMLDivElement>(null);
  const startClientRef = useRef<{ x: number; y: number } | null>(null);
  const [preview, setPreview] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  function toOverlayPos(clientX: number, clientY: number) {
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return { x: clientX, y: clientY };
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    overlayRef.current?.setPointerCapture(e.pointerId);
    startClientRef.current = { x: e.clientX, y: e.clientY };
    const pos = toOverlayPos(e.clientX, e.clientY);
    setPreview({ x: pos.x, y: pos.y, w: 0, h: 0 });
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!startClientRef.current) return;
    const start = toOverlayPos(startClientRef.current.x, startClientRef.current.y);
    const cur = toOverlayPos(e.clientX, e.clientY);
    setPreview({
      x: Math.min(start.x, cur.x),
      y: Math.min(start.y, cur.y),
      w: Math.abs(cur.x - start.x),
      h: Math.abs(cur.y - start.y),
    });
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!startClientRef.current) return;
    const startFlow = screenToFlowPosition({ x: startClientRef.current.x, y: startClientRef.current.y });
    const endFlow = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    const bounds = {
      x: Math.min(startFlow.x, endFlow.x),
      y: Math.min(startFlow.y, endFlow.y),
      w: Math.abs(endFlow.x - startFlow.x),
      h: Math.abs(endFlow.y - startFlow.y),
    };
    if (bounds.w > 20 && bounds.h > 20) {
      const id = nextZoneId();
      const num = id.replace('zone-', '');
      addRegion({ id, label: `Zone ${num}`, bounds });
    }
    startClientRef.current = null;
    setPreview(null);
    onDone();
  }, [screenToFlowPosition, addRegion, nextZoneId, onDone]);

  if (!active) return null;

  return (
    <div
      ref={overlayRef}
      style={{ position: 'absolute', inset: 0, cursor: 'crosshair', zIndex: 1000 }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {preview && preview.w > 4 && preview.h > 4 && (
        <div
          style={{
            position: 'absolute',
            left: preview.x,
            top: preview.y,
            width: preview.w,
            height: preview.h,
            border: '2px dashed rgba(255,255,255,0.45)',
            borderRadius: 4,
            background: 'rgba(255,255,255,0.03)',
            pointerEvents: 'none',
            boxSizing: 'border-box',
          }}
        />
      )}
    </div>
  );
}
