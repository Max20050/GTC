import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NodeCard } from './NodeCard';

// Minimal stub for @xyflow/react Handle
vi.mock('@xyflow/react', () => ({
  Handle: () => null,
  Position: { Left: 'left', Right: 'right' },
}));

function makeProps(config: Record<string, unknown> = {}, selected = false) {
  return {
    id: 'n1',
    type: 'arch',
    selected,
    data: { label: 'My Service', nodeType: 'microservice', config },
    // minimal NodeProps stubs
    xPos: 0, yPos: 0, zIndex: 0, isConnectable: true, positionAbsoluteX: 0, positionAbsoluteY: 0,
    dragging: false, deletable: true, selectable: true, draggable: true,
  } as unknown as Parameters<typeof NodeCard>[0];
}

describe('NodeCard — embedded canvas indicator', () => {
  it('does not show embedded indicator when _hasEmbedded is absent', () => {
    render(<NodeCard {...makeProps()} />);
    expect(screen.queryByTitle(/embedded canvas/i)).toBeNull();
  });

  it('shows embedded indicator when _hasEmbedded is true', () => {
    render(<NodeCard {...makeProps({ _hasEmbedded: true })} />);
    expect(screen.getByTitle(/embedded canvas/i)).toBeInTheDocument();
  });

  it('shows label text', () => {
    render(<NodeCard {...makeProps()} />);
    expect(screen.getByText('My Service')).toBeInTheDocument();
  });
});
