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
import { ZoneLayer } from './ZoneLayer';
import { DrawZoneOverlay } from './DrawZoneOverlay';
import { useDiagram } from '../../hooks/useDiagram';
import type { NodeType, Protocol } from '../../types/diagram';
import styles from './Canvas.module.css';

// 'arch' avoids React Flow's .react-flow__node-default white background
const NODE_TYPES = { arch: NodeCard };

const PROTOCOL_COLORS: Record<Protocol, string> = {
  'http-rest':     '#00d4aa',
  'tcp':           '#a78bfa',
  'message-queue': '#e3b341',
  'database':      '#34d058',
  'websocket':     '#d2a8ff',
  'streaming':     '#f0883e',
};

interface CanvasProps {
  onZoomChange: (zoom: number) => void;
  initialNodes?: Node[];
  initialEdges?: Edge[];
  isDrawingZone?: boolean;
  onZoneModeEnd?: () => void;
  onNodeDoubleClick?: (nodeId: string, label: string) => void;
}

export function Canvas({ onZoomChange, initialNodes = [], initialEdges = [], isDrawingZone = false, onZoneModeEnd, onNodeDoubleClick }: CanvasProps) {
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
  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<Node>(initialNodes);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState<Edge>(initialEdges);

  const { setNodeRef: setDropRef } = useDroppable({ id: 'canvas-drop-zone' });

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      const protocol: Protocol = 'http-rest';
      const color = PROTOCOL_COLORS[protocol];
      const newEdge: Edge = {
        ...connection,
        id: nextConnectorId(),
        type: 'smoothstep',
        style: { stroke: color, strokeWidth: 1.5, opacity: 0.8 },
        markerEnd: { type: MarkerType.ArrowClosed, color },
        label: 'HTTP REST',
        data: { protocol, config: {} },
      };
      setRfEdges((eds) => addEdge(newEdge, eds));
      addConnector({
        id: newEdge.id,
        sourceNodeId: connection.source ?? '',
        targetNodeId: connection.target ?? '',
        label: 'HTTP REST',
        protocol,
        config: {},
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
        type: 'arch',
        position,
        data: { label: nodeType.replace(/-/g, ' '), nodeType, config: {} },
      };
      setRfNodes((nds) => [...nds, newNode]);
      addNode({
        id,
        type: nodeType,
        label: nodeType.replace(/-/g, ' '),
        position,
        config: {},
      });
    },
    [nextNodeId, setRfNodes, addNode]
  );

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
          onNodeDoubleClick={(_, node) => {
            const label = String((node.data as { label?: string }).label ?? '');
            onNodeDoubleClick?.(node.id, label);
          }}
          nodeTypes={NODE_TYPES}
          fitView
          deleteKeyCode="Delete"
          panOnDrag={!isDrawingZone}
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
          <Controls />
          <ConnectorLegend />
          <ZoneLayer />
          <DrawZoneOverlay active={isDrawingZone} onDone={() => onZoneModeEnd?.()} />
        </ReactFlow>
      </div>
    </div>
  );
}

function ConnectorLegend() {
  const entries = [
    { label: 'HTTP REST',    color: '#00d4aa' },
    { label: 'TCP',          color: '#a78bfa' },
    { label: 'Msg Queue',    color: '#e3b341' },
    { label: 'Database',     color: '#34d058' },
    { label: 'WebSocket',    color: '#d2a8ff' },
    { label: 'Streaming',    color: '#f0883e' },
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
