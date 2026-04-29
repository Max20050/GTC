import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GenerateModal } from './GenerateModal';
import { useDiagram } from '../../hooks/useDiagram';
import type { BuildAgentState } from '../../hooks/useBuildAgent';
import type { BuildResult } from '../../lib/build-agent-api';

// Mock framer-motion to avoid animation complexity in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) =>
      React.createElement('div', props, children),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
}));

// Mock useBuildAgent so we control its state per test
const mockBuild = vi.fn();
const mockRetry = vi.fn();
let agentState: BuildAgentState = {
  status: null, step: null, result: null, error: null,
  build: mockBuild, retry: mockRetry,
};

vi.mock('../../hooks/useBuildAgent', () => ({
  useBuildAgent: () => agentState,
}));

const SAMPLE_RESULT: BuildResult = {
  plan: [
    { order: 1, title: 'Set up project', description: 'Scaffold the repository structure' },
    { order: 2, title: 'Add DB layer', description: 'Integrate PostgreSQL with SQLAlchemy' },
  ],
  skills: [],
  prompts: [
    { filename: '01_setup.txt', content: 'Set up the FastAPI project' },
    { filename: '02_db.txt', content: 'Add SQLAlchemy models' },
  ],
  assumptions: ['Uses Python'],
  warnings: [],
};

const RESULT_WITH_WARNINGS: BuildResult = {
  ...SAMPLE_RESULT,
  warnings: ['Skills recommendation failed: timeout'],
};

function selectNode(nodeId: string) {
  useDiagram.setState({ selection: { type: 'node', id: nodeId } });
}

function clearSelection() {
  useDiagram.setState({ selection: { type: null, id: null } });
}

describe('GenerateModal', () => {
  beforeEach(() => {
    mockBuild.mockReset();
    mockRetry.mockReset();
    agentState = { status: null, step: null, result: null, error: null, build: mockBuild, retry: mockRetry };
    clearSelection();
  });

  it('renders when open is true', () => {
    render(<GenerateModal open={true} onClose={() => {}} />);
    expect(screen.getByRole('heading', { name: /build/i })).toBeInTheDocument();
  });

  it('does not render when open is false', () => {
    render(<GenerateModal open={false} onClose={() => {}} />);
    expect(screen.queryByRole('heading', { name: /build/i })).not.toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<GenerateModal open={true} onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('Build button calls build() with the selected node id from Zustand', async () => {
    const user = userEvent.setup();
    selectNode('node-abc');
    render(<GenerateModal open={true} onClose={() => {}} />);
    await user.click(screen.getByRole('button', { name: /build/i }));
    expect(mockBuild).toHaveBeenCalledWith('node-abc');
  });

  it('Build button is disabled while job is running', () => {
    agentState = { ...agentState, status: 'running' };
    render(<GenerateModal open={true} onClose={() => {}} />);
    expect(screen.getByRole('button', { name: /build/i })).toBeDisabled();
  });

  it('shows "Generating plan..." label when step is generating_plan', () => {
    agentState = { ...agentState, status: 'running', step: 'generating_plan' };
    render(<GenerateModal open={true} onClose={() => {}} />);
    expect(screen.getByText(/generating plan/i)).toBeInTheDocument();
  });

  it('shows "Recommending skills..." label when step is recommending_skills', () => {
    agentState = { ...agentState, status: 'running', step: 'recommending_skills' };
    render(<GenerateModal open={true} onClose={() => {}} />);
    expect(screen.getByText(/recommending skills/i)).toBeInTheDocument();
  });

  it('renders plan step titles when job is done', () => {
    agentState = { ...agentState, status: 'done', result: SAMPLE_RESULT };
    render(<GenerateModal open={true} onClose={() => {}} />);
    expect(screen.getByText('Set up project')).toBeInTheDocument();
    expect(screen.getByText('Add DB layer')).toBeInTheDocument();
  });

  it('renders numbered prompt file names when job is done', () => {
    agentState = { ...agentState, status: 'done', result: SAMPLE_RESULT };
    render(<GenerateModal open={true} onClose={() => {}} />);
    expect(screen.getByText('01_setup.txt')).toBeInTheDocument();
    expect(screen.getByText('02_db.txt')).toBeInTheDocument();
  });

  it('does NOT show a retry button when warnings is empty', () => {
    agentState = { ...agentState, status: 'done', result: SAMPLE_RESULT };
    render(<GenerateModal open={true} onClose={() => {}} />);
    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
  });

  it('shows a retry button when warnings array is non-empty', () => {
    agentState = { ...agentState, status: 'done', result: RESULT_WITH_WARNINGS };
    render(<GenerateModal open={true} onClose={() => {}} />);
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('clicking retry calls retry()', async () => {
    const user = userEvent.setup();
    agentState = { ...agentState, status: 'done', result: RESULT_WITH_WARNINGS };
    render(<GenerateModal open={true} onClose={() => {}} />);
    await user.click(screen.getByRole('button', { name: /retry/i }));
    expect(mockRetry).toHaveBeenCalled();
  });

  it('shows error message when job fails', () => {
    agentState = { ...agentState, status: 'failed', error: 'LLM timeout' };
    render(<GenerateModal open={true} onClose={() => {}} />);
    expect(screen.getByText(/LLM timeout/i)).toBeInTheDocument();
  });

  it('shows a retry button when job fails', () => {
    agentState = { ...agentState, status: 'failed', error: 'something went wrong' };
    render(<GenerateModal open={true} onClose={() => {}} />);
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });
});
