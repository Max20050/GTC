import { useCallback, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Background,
  MiniMap,
  Controls,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type Node,
  type OnConnect,
  type OnNodesChange,
  type OnEdgesChange,
  BackgroundVariant,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useDroppable } from '@dnd-kit/core';
import { NodeCard } from './NodeCard';
import { useDiagram } from '../../hooks/useDiagram';
import type { NodeType, Protocol } from '../../types/diagram';
import styles from './Canvas.module.css';

const NODE_TYPES = { default: NodeCard };

const PROTOCOL_COLORS: Record<Protocol, string> = {
  http_rest: '#00d4aa',
  grpc:      '#4a9eff',
  sql:       '#34d058',
  nosql:     '#f0883e',
  pubsub:    '#e3b341',
  websocket: '#d2a8ff',
};

interface CanvasProps {
  onZoomChange: (zoom: number) => void;
}

export function Canvas({ onZoomChange }: CanvasProps) {
  // Select only stable action functions — never causes re-renders
  const addNode      = useDiagram((s) => s.addNode);
  const updateNode   = useDiagram((s) => s.updateNode);
  const removeNode   = useDiagram((s) => s.removeNode);
  const addConnector = useDiagram((s) => s.addConnector);
  const removeConnector = useDiagram((s) => s.removeConnector);
  const setSelection = useDiagram((s) => s.setSelection);
  const setViewport  = useDiagram((s) => s.setViewport);
  const nextNodeId   = useDiagram((s) => s.nextNodeId);
  const nextConnectorId = useDiagram((s) => s.nextConnectorId);

  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<Node>([]);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const { setNodeRef: setDropRef } = useDroppable({ id: 'canvas-drop-zone' });

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      const newEdge: Edge = {
        ...connection,
        id: nextConnectorId(),
        type: 'default',
        style: { stroke: PROTOCOL_COLORS.http_rest, strokeWidth: 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: PROTOCOL_COLORS.http_rest },
        label: 'HTTP REST',
        data: { protocol: 'http_rest' },
      };
      setRfEdges((eds) => addEdge(newEdge, eds));
      addConnector({
        id: newEdge.id,
        sourceNodeId: connection.source ?? '',
        targetNodeId: connection.target ?? '',
        protocol: 'http_rest',
        label: 'HTTP REST',
        meta: {},
      });
    },
    [nextConnectorId, setRfEdges, addConnector]
  );

  const handleNodesChange: OnNodesChange = useCallback(
    (changes) => {
      onNodesChange(changes);
      for (const change of changes) {
        if (change.type === 'position' && change.position) {
          updateNode(change.id, { position: change.position });
        } else if (change.type === 'remove') {
          removeNode(change.id);
        } else if (change.type === 'select') {
          setSelection(change.selected
            ? { type: 'node', id: change.id }
            : { type: null, id: null }
          );
        }
      }
    },
    [onNodesChange, updateNode, removeNode, setSelection]
  );

  const handleEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      onEdgesChange(changes);
      for (const change of changes) {
        if (change.type === 'remove') {
          removeConnector(change.id);
        } else if (change.type === 'select') {
          setSelection(change.selected
            ? { type: 'connector', id: change.id }
            : { type: null, id: null }
          );
        }
      }
    },
    [onEdgesChange, removeConnector, setSelection]
  );

  const handleMoveEnd = useCallback(
    (_: unknown, viewport: { x: number; y: number; zoom: number }) => {
      onZoomChange(viewport.zoom);
      setViewport(viewport);
    },
    [onZoomChange, setViewport]
  );

  const addNodeAtPosition = useCallback(
    (nodeType: NodeType, position: { x: number; y: number }) => {
      const id = nextNodeId();
      const newNode: Node = {
        id,
        type: 'default',
        position,
        data: { label: nodeType.replace(/_/g, ' '), nodeType, sublabel: '' },
      };
      setRfNodes((nds) => [...nds, newNode]);
      addNode({
        id,
        type: nodeType,
        label: nodeType.replace(/_/g, ' '),
        position,
        size: { w: 140, h: 56 },
        meta: {},
      });
      return id;
    },
    [nextNodeId, setRfNodes, addNode]
  );

  // Expose addNodeAtPosition for DnD in a side-effect, not during render
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__canvasAddNode = (
      nodeType: NodeType,
      clientX: number,
      clientY: number
    ) => {
      const rect = reactFlowWrapper.current?.getBoundingClientRect();
      if (!rect) return;
      addNodeAtPosition(nodeType, { x: clientX - rect.left - 70, y: clientY - rect.top - 28 });
    };
  }, [addNodeAtPosition]);

  return (
    <div ref={setDropRef} className={styles.canvasWrapper}>
      <div ref={reactFlowWrapper} style={{ width: '100%', height: '100%' }}>
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={onConnect}
          onMoveEnd={handleMoveEnd}
          nodeTypes={NODE_TYPES}
          fitView
          deleteKeyCode="Delete"
          style={{ background: 'var(--bg-canvas)' }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={24}
            size={1}
            color="rgba(255,255,255,0.04)"
          />
          <MiniMap
            style={{ background: 'var(--bg-panel)' }}
            nodeColor="var(--bg-card-hover)"
            maskColor="rgba(10,12,15,0.7)"
          />
          <Controls
            style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)' }}
          />
          <ConnectorLegend />
        </ReactFlow>
      </div>
    </div>
  );
}

function ConnectorLegend() {
  const entries: { label: string; color: string }[] = [
    { label: 'HTTP REST', color: '#00d4aa' },
    { label: 'gRPC',      color: '#4a9eff' },
    { label: 'SQL',       color: '#34d058' },
    { label: 'NoSQL',     color: '#f0883e' },
    { label: 'Pub/Sub',   color: '#e3b341' },
    { label: 'WebSocket', color: '#d2a8ff' },
  ];
  return (
    <div className={styles.legend}>
      {entries.map((e) => (
        <span key={e.label} className={styles.legendItem}>
          <span className={styles.legendDot} style={{ background: e.color }} />
          {e.label}
        </span>
      ))}
    </div>
  );
}
