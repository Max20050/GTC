import { create } from 'zustand';
import type { DiagramNode, Connector, Region, Selection } from '../types/diagram';

let nodeCounter = 0;
let connectorCounter = 0;

interface DiagramStore {
  id: string;
  name: string;
  nodes: DiagramNode[];
  connectors: Connector[];
  regions: Region[];
  viewport: { x: number; y: number; zoom: number };
  selection: Selection;
  lastSaved: Date | null;

  setNodes: (nodes: DiagramNode[]) => void;
  addNode: (node: DiagramNode) => void;
  updateNode: (id: string, patch: Partial<DiagramNode>) => void;
  removeNode: (id: string) => void;

  setConnectors: (connectors: Connector[]) => void;
  addConnector: (connector: Connector) => void;
  updateConnector: (id: string, patch: Partial<Connector>) => void;
  removeConnector: (id: string) => void;

  addRegion: (region: Region) => void;
  removeRegion: (id: string) => void;

  setViewport: (viewport: { x: number; y: number; zoom: number }) => void;
  setSelection: (selection: Selection) => void;
  setName: (name: string) => void;
  markSaved: () => void;

  nextNodeId: () => string;
  nextConnectorId: () => string;
}

export const useDiagram = create<DiagramStore>((set) => ({
  id: crypto.randomUUID(),
  name: 'Untitled Architecture',
  nodes: [],
  connectors: [],
  regions: [],
  viewport: { x: 0, y: 0, zoom: 1 },
  selection: { type: null, id: null },
  lastSaved: null,

  setNodes: (nodes) => set({ nodes }),
  addNode: (node) => set((s) => ({ nodes: [...s.nodes, node] })),
  updateNode: (id, patch) =>
    set((s) => ({ nodes: s.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)) })),
  removeNode: (id) =>
    set((s) => ({
      nodes: s.nodes.filter((n) => n.id !== id),
      connectors: s.connectors.filter((c) => c.sourceNodeId !== id && c.targetNodeId !== id),
      selection: s.selection.id === id ? { type: null, id: null } : s.selection,
    })),

  setConnectors: (connectors) => set({ connectors }),
  addConnector: (connector) => set((s) => ({ connectors: [...s.connectors, connector] })),
  updateConnector: (id, patch) =>
    set((s) => ({ connectors: s.connectors.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
  removeConnector: (id) =>
    set((s) => ({
      connectors: s.connectors.filter((c) => c.id !== id),
      selection: s.selection.id === id ? { type: null, id: null } : s.selection,
    })),

  addRegion: (region) => set((s) => ({ regions: [...s.regions, region] })),
  removeRegion: (id) => set((s) => ({ regions: s.regions.filter((r) => r.id !== id) })),

  setViewport: (viewport) => set({ viewport }),
  setSelection: (selection) => set({ selection }),
  setName: (name) => set({ name }),
  markSaved: () => set({ lastSaved: new Date() }),

  nextNodeId: () => `node-${++nodeCounter}`,
  nextConnectorId: () => `conn-${++connectorCounter}`,
}));
