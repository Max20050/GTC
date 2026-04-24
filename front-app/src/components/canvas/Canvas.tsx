import { useCallback, useRef } from 'react';
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
  const store = useDiagram();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<Node>([]);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const { setNodeRef: setDropRef } = useDroppable({ id: 'canvas-drop-zone' });

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      const newEdge: Edge = {
        ...connection,
        id: store.nextConnectorId(),
        type: 'default',
        style: { stroke: PROTOCOL_COLORS.http_rest, strokeWidth: 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: PROTOCOL_COLORS.http_rest },
        label: 'HTTP REST',
        data: { protocol: 'http_rest' },
      };
      setRfEdges((eds) => addEdge(newEdge, eds));
      store.addConnector({
        id: newEdge.id,
        sourceNodeId: connection.source ?? '',
        targetNodeId: connection.target ?? '',
        protocol: 'http_rest',
        label: 'HTTP REST',
        meta: {},
      });
    },
    [store, setRfEdges]
  );

  const handleNodesChange: OnNodesChange = useCallback(
    (changes) => {
      onNodesChange(changes);
      changes.forEach((change) => {
        if (change.type === 'position' && change.position) {
          store.updateNode(change.id, { position: change.position });
        }
        if (change.type === 'remove') {
          store.removeNode(change.id);
        }
        if (change.type === 'select') {
          if (change.selected) {
            store.setSelection({ type: 'node', id: change.id });
          } else {
            store.setSelection({ type: null, id: null });
          }
        }
      });
    },
    [onNodesChange, store]
  );

  const handleEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      onEdgesChange(changes);
      changes.forEach((change) => {
        if (change.type === 'remove') {
          store.removeConnector(change.id);
        }
        if (change.type === 'select') {
          if (change.selected) {
            store.setSelection({ type: 'connector', id: change.id });
          } else {
            store.setSelection({ type: null, id: null });
          }
        }
      });
    },
    [onEdgesChange, store]
  );

  function addNodeAtPosition(nodeType: NodeType, position: { x: number; y: number }) {
    const id = store.nextNodeId();
    const newNode: Node = {
      id,
      type: 'default',
      position,
      data: { label: nodeType.replace(/_/g, ' '), nodeType, sublabel: '' },
    };
    setRfNodes((nds) => [...nds, newNode]);
    store.addNode({
      id,
      type: nodeType,
      label: nodeType.replace(/_/g, ' '),
      position,
      size: { w: 140, h: 56 },
      meta: {},
    });
    return id;
  }

  return (
    <div ref={setDropRef} className={styles.canvasWrapper}>
      <div ref={reactFlowWrapper} style={{ width: '100%', height: '100%' }}>
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={onConnect}
          nodeTypes={NODE_TYPES}
          fitView
          deleteKeyCode="Delete"
          onMoveEnd={(_, viewport) => {
            onZoomChange(viewport.zoom);
            store.setViewport(viewport);
          }}
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
      {/* Expose addNodeAtPosition for DnD integration */}
      <CanvasDnDReceiver addNode={addNodeAtPosition} wrapperRef={reactFlowWrapper} />
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

interface DnDReceiverProps {
  addNode: (type: NodeType, pos: { x: number; y: number }) => string;
  wrapperRef: React.RefObject<HTMLDivElement | null>;
}

function CanvasDnDReceiver({ addNode, wrapperRef }: DnDReceiverProps) {
  (window as unknown as Record<string, unknown>).__canvasAddNode = (
    nodeType: NodeType,
    clientX: number,
    clientY: number
  ) => {
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (!rect) return;
    addNode(nodeType, { x: clientX - rect.left - 70, y: clientY - rect.top - 28 });
  };
  return null;
}
