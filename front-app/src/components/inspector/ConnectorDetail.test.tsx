import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConnectorDetail } from './ConnectorDetail';
import type { Connector, DiagramNode, Endpoint, Contract } from '../../types/diagram';

function makeConnector(overrides: Partial<Connector> = {}): Connector {
  return {
    id: 'c1',
    sourceNodeId: 'src',
    targetNodeId: 'tgt',
    protocol: 'http-rest',
    config: {},
    ...overrides,
  };
}

function makeNodes(tgtEndpoints?: Endpoint[], tgtContracts?: Contract[]): DiagramNode[] {
  return [
    { id: 'src', type: 'microservice', label: 'Caller', position: { x: 0, y: 0 }, config: {} },
    {
      id: 'tgt', type: 'microservice', label: 'Target', position: { x: 0, y: 0 },
      config: {
        ...(tgtEndpoints ? { _endpoints: tgtEndpoints } : {}),
        ...(tgtContracts ? { _contracts: tgtContracts } : {}),
      },
    },
  ];
}

// Wrap in a mock Zustand store stub — ConnectorDetail calls useDiagram internally.
// We stub it by providing updateConnector through the mock.
vi.mock('../../hooks/useDiagram', () => ({
  useDiagram: (selector: (s: unknown) => unknown) => {
    const state = { updateConnector: vi.fn() };
    return selector(state);
  },
}));

describe('ConnectorDetail — endpoint picker', () => {
  it('does not show endpoint picker when target has no endpoints', () => {
    render(<ConnectorDetail connector={makeConnector()} nodes={makeNodes()} />);
    expect(screen.queryByRole('combobox', { name: /endpoint/i })).toBeNull();
  });

  it('shows endpoint picker when target node has endpoints', () => {
    const endpoints: Endpoint[] = [{ method: 'GET', path: '/users' }];
    render(<ConnectorDetail connector={makeConnector()} nodes={makeNodes(endpoints)} />);
    expect(screen.getByRole('combobox', { name: /endpoint/i })).toBeInTheDocument();
  });

  it('populates picker with all target endpoints', () => {
    const endpoints: Endpoint[] = [
      { method: 'GET', path: '/users' },
      { method: 'POST', path: '/orders' },
    ];
    render(<ConnectorDetail connector={makeConnector()} nodes={makeNodes(endpoints)} />);
    expect(screen.getByText('GET /users')).toBeInTheDocument();
    expect(screen.getByText('POST /orders')).toBeInTheDocument();
  });

  it('shows contract preview when an endpoint with schemas is selected', () => {
    const contracts: Contract[] = [
      { name: 'UserPayload', fields: [{ name: 'id', type: 'string' }] },
    ];
    const endpoints: Endpoint[] = [
      { method: 'POST', path: '/users', requestSchema: 'UserPayload' },
    ];
    const connector = makeConnector({ config: { _selectedEndpoint: 0 } });
    render(<ConnectorDetail connector={connector} nodes={makeNodes(endpoints, contracts)} />);
    expect(screen.getByText('UserPayload')).toBeInTheDocument();
  });

  it('shows field details inside contract preview', () => {
    const contracts: Contract[] = [
      { name: 'UserPayload', fields: [{ name: 'id', type: 'string' }, { name: 'email', type: 'string' }] },
    ];
    const endpoints: Endpoint[] = [
      { method: 'POST', path: '/users', requestSchema: 'UserPayload' },
    ];
    const connector = makeConnector({ config: { _selectedEndpoint: 0 } });
    render(<ConnectorDetail connector={connector} nodes={makeNodes(endpoints, contracts)} />);
    expect(screen.getByText(/id/)).toBeInTheDocument();
    expect(screen.getByText(/email/)).toBeInTheDocument();
  });
});
