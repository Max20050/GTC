import { describe, it, expect, beforeEach } from 'vitest';
import { useDiagram } from './useDiagram';
import type { DiagramNode, Connector } from '../types/diagram';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function makeNode(id: string, label: string): DiagramNode {
  return { id, type: 'microservice', label, position: { x: 0, y: 0 }, config: {} };
}

function makeConnector(id: string, label = ''): Connector {
  return { id, sourceNodeId: 'a', targetNodeId: 'b', label, protocol: 'http-rest', config: {} };
}

function resetStore() {
  useDiagram.setState({ nodes: [], connectors: [], regions: [], selection: { type: null, id: null } });
}

// ── ID Generation ────────────────────────────────────────────────────────────

describe('ID generation — UUID format', () => {
  it('nextNodeId returns a UUID', () => {
    expect(useDiagram.getState().nextNodeId()).toMatch(UUID_REGEX);
  });

  it('nextConnectorId returns a UUID', () => {
    expect(useDiagram.getState().nextConnectorId()).toMatch(UUID_REGEX);
  });

  it('nextZoneId returns a UUID', () => {
    expect(useDiagram.getState().nextZoneId()).toMatch(UUID_REGEX);
  });

  it('nextNodeId never returns node-N format', () => {
    const id = useDiagram.getState().nextNodeId();
    expect(id).not.toMatch(/^node-\d+$/);
  });

  it('nextConnectorId never returns conn-N format', () => {
    const id = useDiagram.getState().nextConnectorId();
    expect(id).not.toMatch(/^conn-\d+$/);
  });

  it('nextZoneId never returns zone-N format', () => {
    const id = useDiagram.getState().nextZoneId();
    expect(id).not.toMatch(/^zone-\d+$/);
  });
});

describe('ID generation — uniqueness', () => {
  it('nextNodeId produces 10 distinct IDs in rapid succession', () => {
    const ids = Array.from({ length: 10 }, () => useDiagram.getState().nextNodeId());
    expect(new Set(ids).size).toBe(10);
  });

  it('nextConnectorId produces 10 distinct IDs in rapid succession', () => {
    const ids = Array.from({ length: 10 }, () => useDiagram.getState().nextConnectorId());
    expect(new Set(ids).size).toBe(10);
  });
});

// ── addNode collision safety ──────────────────────────────────────────────────

describe('addNode', () => {
  beforeEach(resetStore);

  it('appends a node when the ID is new', () => {
    useDiagram.getState().addNode(makeNode('node-1', 'A'));
    expect(useDiagram.getState().nodes).toHaveLength(1);
  });

  it('replaces the existing entry when called with a duplicate ID', () => {
    useDiagram.getState().addNode(makeNode('node-1', 'A'));
    useDiagram.getState().addNode(makeNode('node-1', 'B'));
    const { nodes } = useDiagram.getState();
    expect(nodes).toHaveLength(1);
    expect(nodes[0].label).toBe('B');
  });

  it('adding a 4th node to a canvas with 3 existing nodes produces exactly 4 distinct nodes', () => {
    useDiagram.setState({
      nodes: [makeNode('node-1', 'E1'), makeNode('node-2', 'E2'), makeNode('node-3', 'E3')],
    });
    const { nextNodeId, addNode } = useDiagram.getState();
    addNode(makeNode(nextNodeId(), 'New'));
    const { nodes } = useDiagram.getState();
    expect(nodes).toHaveLength(4);
    expect(new Set(nodes.map((n) => n.id)).size).toBe(4);
  });

  it('none of the 3 existing nodes are mutated when a new node is added', () => {
    useDiagram.setState({
      nodes: [makeNode('node-1', 'E1'), makeNode('node-2', 'E2'), makeNode('node-3', 'E3')],
    });
    const { nextNodeId, addNode } = useDiagram.getState();
    addNode(makeNode(nextNodeId(), 'New'));
    const labels = useDiagram.getState().nodes.map((n) => n.label);
    expect(labels).toContain('E1');
    expect(labels).toContain('E2');
    expect(labels).toContain('E3');
  });
});

// ── addConnector collision safety ─────────────────────────────────────────────

describe('addConnector', () => {
  beforeEach(resetStore);

  it('appends a connector when the ID is new', () => {
    useDiagram.getState().addConnector(makeConnector('conn-1', 'first'));
    expect(useDiagram.getState().connectors).toHaveLength(1);
  });

  it('replaces the existing entry when called with a duplicate ID', () => {
    useDiagram.getState().addConnector(makeConnector('conn-1', 'first'));
    useDiagram.getState().addConnector(makeConnector('conn-1', 'second'));
    const { connectors } = useDiagram.getState();
    expect(connectors).toHaveLength(1);
    expect(connectors[0].label).toBe('second');
  });
});
