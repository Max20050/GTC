import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EndpointsEditor } from './EndpointsEditor';
import type { Endpoint, Contract, DiagramNode, NodeType } from '../../types/diagram';

function makeNode(type: NodeType, endpoints: Endpoint[] = [], contracts: Contract[] = []): DiagramNode {
  return {
    id: 'n1',
    type,
    label: 'Svc',
    position: { x: 0, y: 0 },
    config: { _endpoints: endpoints, _contracts: contracts } as Record<string, unknown>,
  };
}

function StatefulEditor({ node: initial }: { node: DiagramNode }) {
  const [node, setNode] = React.useState(initial);
  return (
    <EndpointsEditor
      node={node}
      onChange={(eps) => setNode((n) => ({ ...n, config: { ...n.config, _endpoints: eps } }))}
    />
  );
}

describe('EndpointsEditor', () => {
  let spy: ReturnType<typeof vi.fn>;
  let onChange: (endpoints: Endpoint[]) => void;

  beforeEach(() => {
    spy = vi.fn();
    onChange = spy as unknown as (endpoints: Endpoint[]) => void;
  });

  it('renders for microservice nodes', () => {
    render(<EndpointsEditor node={makeNode('microservice')} onChange={onChange} />);
    expect(screen.getByRole('button', { name: /add endpoint/i })).toBeInTheDocument();
  });

  it('renders for serverless nodes', () => {
    render(<EndpointsEditor node={makeNode('serverless')} onChange={onChange} />);
    expect(screen.getByRole('button', { name: /add endpoint/i })).toBeInTheDocument();
  });

  it('renders for aws-service nodes with API Gateway service_name', () => {
    const node: DiagramNode = {
      id: 'n1', type: 'aws-service', label: 'GW',
      position: { x: 0, y: 0 },
      config: { service_name: 'API Gateway', _endpoints: [], _contracts: [] },
    };
    render(<EndpointsEditor node={node} onChange={onChange} />);
    expect(screen.getByRole('button', { name: /add endpoint/i })).toBeInTheDocument();
  });

  it('is hidden for database nodes', () => {
    const { container } = render(<EndpointsEditor node={makeNode('database')} onChange={onChange} />);
    expect(container.firstChild).toBeNull();
  });

  it('is hidden for aws-service nodes that are not API Gateway', () => {
    const node: DiagramNode = {
      id: 'n1', type: 'aws-service', label: 'S3',
      position: { x: 0, y: 0 },
      config: { service_name: 'S3', _endpoints: [], _contracts: [] },
    };
    const { container } = render(<EndpointsEditor node={node} onChange={onChange} />);
    expect(container.firstChild).toBeNull();
  });

  it('adds a new endpoint when "Add endpoint" is clicked', async () => {
    const user = userEvent.setup();
    render(<EndpointsEditor node={makeNode('microservice')} onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: /add endpoint/i }));
    const added: Endpoint[] = spy.mock.calls[0][0];
    expect(added).toHaveLength(1);
    expect(added[0]).toMatchObject({ method: 'GET', path: '/' });
  });

  it('renders existing endpoints', () => {
    const endpoints: Endpoint[] = [{ method: 'POST', path: '/users' }];
    render(<EndpointsEditor node={makeNode('microservice', endpoints)} onChange={onChange} />);
    expect(screen.getByDisplayValue('/users')).toBeInTheDocument();
  });

  it('removes an endpoint when its remove button is clicked', async () => {
    const user = userEvent.setup();
    const endpoints: Endpoint[] = [
      { method: 'GET', path: '/users' },
      { method: 'POST', path: '/orders' },
    ];
    render(<EndpointsEditor node={makeNode('microservice', endpoints)} onChange={onChange} />);
    const removeBtns = screen.getAllByRole('button', { name: /remove endpoint/i });
    await user.click(removeBtns[0]);
    const updated: Endpoint[] = spy.mock.calls[0][0];
    expect(updated).toHaveLength(1);
    expect(updated[0].path).toBe('/orders');
  });

  it('updates path when path input changes', async () => {
    const user = userEvent.setup();
    render(<StatefulEditor node={makeNode('microservice', [{ method: 'GET', path: '/' }])} />);
    const pathInput = screen.getByDisplayValue('/');
    await user.clear(pathInput);
    await user.type(pathInput, '/users');
    expect(screen.getByDisplayValue('/users')).toBeInTheDocument();
  });

  it('populates schema selectors from node contracts', () => {
    const contracts: Contract[] = [{ name: 'User', fields: [] }, { name: 'Order', fields: [] }];
    const endpoints: Endpoint[] = [{ method: 'POST', path: '/users' }];
    render(<EndpointsEditor node={makeNode('microservice', endpoints, contracts)} onChange={onChange} />);
    const selects = screen.getAllByRole('combobox');
    const options = Array.from(selects[1].querySelectorAll('option')).map((o) => o.textContent);
    expect(options).toContain('User');
    expect(options).toContain('Order');
  });
});
