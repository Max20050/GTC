import { useState, useEffect, useRef, useCallback } from 'react';
import type { Node, Edge } from '@xyflow/react';
import { MarkerType } from '@xyflow/react';
import { fetchCanvas, createCanvas, saveCanvas, type ApiNode, type ApiEdge } from '../lib/canvas-api';
import { useDiagram } from './useDiagram';
import type { DiagramNode, Connector, Protocol } from '../types/diagram';

const PROTOCOL_COLORS: Record<string, string> = {
  'http-rest':     '#00d4aa',
  'tcp':           '#a78bfa',
  'message-queue': '#e3b341',
  'database':      '#34d058',
  'websocket':     '#d2a8ff',
  'streaming':     '#f0883e',
};

function apiNodeToStore(n: ApiNode): DiagramNode {
  return {
    id: n.id,
    type: n.type as DiagramNode['type'],
    label: n.label,
    position: n.position,
    config: n.config ?? {},
  };
}

function apiEdgeToStore(e: ApiEdge): Connector {
  return {
    id: e.id,
    sourceNodeId: e.from,
    targetNodeId: e.to,
    label: e.label,
    protocol: (e.protocol as Protocol) ?? 'http-rest',
    config: e.config ?? {},
  };
}

function apiNodeToRF(n: ApiNode): Node {
  return {
    id: n.id,
    type: 'arch',
    position: n.position,
    data: { label: n.label, nodeType: n.type, config: n.config ?? {} },
  };
}

function apiEdgeToRF(e: ApiEdge): Edge {
  const color = PROTOCOL_COLORS[e.protocol] ?? '#8b95a3';
  return {
    id: e.id,
    source: e.from,
    target: e.to,
    type: 'smoothstep',
    label: e.label ?? e.protocol,
    style: { stroke: color, strokeWidth: 1.5, opacity: 0.8 },
    markerEnd: { type: MarkerType.ArrowClosed, color },
    data: { protocol: e.protocol, config: e.config ?? {} },
  };
}

function storeNodeToApi(n: DiagramNode): ApiNode {
  return { id: n.id, type: n.type, label: n.label, position: n.position, config: n.config };
}

function storeConnectorToApi(c: Connector): ApiEdge {
  return {
    id: c.id,
    from: c.sourceNodeId,
    to: c.targetNodeId,
    label: c.label,
    protocol: c.protocol,
    config: c.config,
  };
}

function debounce<T extends unknown[]>(fn: (...args: T) => void, ms: number) {
  let timer: ReturnType<typeof setTimeout>;
  const debouncedFn = (...args: T) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
  debouncedFn.cancel = () => clearTimeout(timer);
  return debouncedFn;
}

export function useCanvasSync(canvasId: string) {
  const [initialRFNodes, setInitialRFNodes] = useState<Node[]>([]);
  const [initialRFEdges, setInitialRFEdges] = useState<Edge[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);

  const setNodes = useDiagram((s) => s.setNodes);
  const setConnectors = useDiagram((s) => s.setConnectors);
  const markSaved = useDiagram((s) => s.markSaved);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        let doc = await fetchCanvas(canvasId).catch(async (err: unknown) => {
          if ((err as { status?: number }).status === 404) {
            return createCanvas(canvasId);
          }
          throw err;
        });

        if (cancelled) return;

        setNodes(doc.nodes.map(apiNodeToStore));
        setConnectors(doc.edges.map(apiEdgeToStore));
        setInitialRFNodes(doc.nodes.map(apiNodeToRF));
        setInitialRFEdges(doc.edges.map(apiEdgeToRF));
        markSaved();
      } catch (err) {
        if (!cancelled) {
          setSyncError(err instanceof Error ? err.message : 'Failed to load canvas');
          // Still show an empty canvas so the user can work offline
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [canvasId, setNodes, setConnectors, markSaved]);

  const saveRef = useRef(
    debounce((nodes: DiagramNode[], connectors: Connector[]) => {
      saveCanvas({
        canvas_id: canvasId,
        nodes: nodes.map(storeNodeToApi),
        edges: connectors.map(storeConnectorToApi),
      })
        .then(() => useDiagram.getState().markSaved())
        .catch((err: unknown) => console.error('Auto-save failed:', err));
    }, 1500)
  );

  // Subscribe to Zustand changes and auto-save (imperative — no React render cycle)
  useEffect(() => {
    const unsub = useDiagram.subscribe((state) => {
      if (!loading) {
        saveRef.current(state.nodes, state.connectors);
      }
    });
    return () => {
      unsub();
      saveRef.current.cancel();
    };
  }, [loading]);

  const forceManualSave = useCallback(() => {
    const { nodes, connectors } = useDiagram.getState();
    saveCanvas({
      canvas_id: canvasId,
      nodes: nodes.map(storeNodeToApi),
      edges: connectors.map(storeConnectorToApi),
    })
      .then(() => useDiagram.getState().markSaved())
      .catch(console.error);
  }, [canvasId]);

  return { initialRFNodes, initialRFEdges, loading, syncError, forceManualSave };
}
