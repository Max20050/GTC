import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContractsEditor } from './ContractsEditor';
import type { Contract, DiagramNode } from '../../types/diagram';

function StatefulEditor({ initial }: { initial: Contract[] }) {
  const [contracts, setContracts] = React.useState(initial);
  const node: DiagramNode = {
    id: 'n1', type: 'microservice', label: 'S', position: { x: 0, y: 0 },
    config: { _contracts: contracts },
  };
  return <ContractsEditor node={node} onChange={setContracts} />;
}

function makeNode(contracts: Contract[] = []) {
  return {
    id: 'n1',
    type: 'microservice' as const,
    label: 'My Service',
    position: { x: 0, y: 0 },
    config: { _contracts: contracts } as Record<string, unknown>,
  };
}

describe('ContractsEditor', () => {
  let spy: ReturnType<typeof vi.fn>;
  let onChange: (contracts: Contract[]) => void;

  beforeEach(() => {
    spy = vi.fn();
    onChange = spy as unknown as (contracts: Contract[]) => void;
  });

  it('renders an empty state message when no contracts exist', () => {
    render(<ContractsEditor node={makeNode()} onChange={onChange} />);
    expect(screen.getByText(/no contracts/i)).toBeInTheDocument();
  });

  it('renders existing contract names', () => {
    const contracts: Contract[] = [
      { name: 'User', fields: [{ name: 'id', type: 'string' }] },
    ];
    render(<ContractsEditor node={makeNode(contracts)} onChange={onChange} />);
    expect(screen.getByDisplayValue('User')).toBeInTheDocument();
  });

  it('renders existing fields of a contract', () => {
    const contracts: Contract[] = [
      { name: 'User', fields: [{ name: 'id', type: 'string' }, { name: 'age', type: 'number' }] },
    ];
    render(<ContractsEditor node={makeNode(contracts)} onChange={onChange} />);
    expect(screen.getByDisplayValue('id')).toBeInTheDocument();
    expect(screen.getByDisplayValue('string')).toBeInTheDocument();
  });

  it('adds a new contract when "Add struct" is clicked', async () => {
    const user = userEvent.setup();
    render(<ContractsEditor node={makeNode()} onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: /add struct/i }));
    expect(spy).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ name: expect.any(String), fields: [] }),
      ])
    );
  });

  it('removes a contract when its remove button is clicked', async () => {
    const user = userEvent.setup();
    const contracts: Contract[] = [
      { name: 'User', fields: [] },
      { name: 'Order', fields: [] },
    ];
    render(<ContractsEditor node={makeNode(contracts)} onChange={onChange} />);
    const removeButtons = screen.getAllByRole('button', { name: /remove contract/i });
    await user.click(removeButtons[0]);
    const updated: Contract[] = spy.mock.calls[0][0];
    expect(updated).toHaveLength(1);
    expect(updated[0].name).toBe('Order');
  });

  it('adds a field to an existing contract', async () => {
    const user = userEvent.setup();
    const contracts: Contract[] = [{ name: 'User', fields: [] }];
    render(<ContractsEditor node={makeNode(contracts)} onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: /add field/i }));
    const updated: Contract[] = spy.mock.calls[0][0];
    expect(updated[0].fields).toHaveLength(1);
  });

  it('removes a field from a contract', async () => {
    const user = userEvent.setup();
    const contracts: Contract[] = [
      { name: 'User', fields: [{ name: 'id', type: 'string' }] },
    ];
    render(<ContractsEditor node={makeNode(contracts)} onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: /remove field/i }));
    const updated: Contract[] = spy.mock.calls[0][0];
    expect(updated[0].fields).toHaveLength(0);
  });

  it('updates a field name when the name input changes', async () => {
    const user = userEvent.setup();
    const contracts: Contract[] = [
      { name: 'User', fields: [{ name: 'id', type: 'string' }] },
    ];
    render(<StatefulEditor initial={contracts} />);
    const nameInput = screen.getByDisplayValue('id');
    await user.clear(nameInput);
    await user.type(nameInput, 'userId');
    expect(screen.getByDisplayValue('userId')).toBeInTheDocument();
  });

  it('updates a field type when the type input changes', async () => {
    const user = userEvent.setup();
    const contracts: Contract[] = [
      { name: 'User', fields: [{ name: 'id', type: 'string' }] },
    ];
    render(<StatefulEditor initial={contracts} />);
    const typeInput = screen.getByDisplayValue('string');
    await user.clear(typeInput);
    await user.type(typeInput, 'number');
    expect(screen.getByDisplayValue('number')).toBeInTheDocument();
  });
});
