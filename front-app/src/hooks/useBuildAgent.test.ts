import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBuildAgent } from './useBuildAgent';
import { useDiagram } from './useDiagram';
import type { BuildResult, JobState } from '../lib/build-agent-api';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function makePendingJob(jobId: string): JobState {
  return { job_id: jobId, status: 'pending', step: null, result: null, error: null };
}

function makeRunningJob(jobId: string, step: string): JobState {
  return { job_id: jobId, status: 'running', step, result: null, error: null };
}

function makeDoneJob(jobId: string, result: BuildResult): JobState {
  return { job_id: jobId, status: 'done', step: null, result, error: null };
}

function makeFailedJob(jobId: string, error: string): JobState {
  return { job_id: jobId, status: 'failed', step: null, result: null, error };
}

const SAMPLE_RESULT: BuildResult = {
  plan: [{ order: 1, title: 'Init', description: 'Set up the project' }],
  skills: [{ name: 'docker', reason: 'containerisation', docs_url: 'https://docs.docker.com' }],
  prompts: [{ filename: '01_init.txt', content: 'Initialise the service' }],
  assumptions: ['Uses PostgreSQL'],
  warnings: [],
};

function resetDiagram() {
  useDiagram.setState({
    nodes: [
      { id: 'n1', type: 'microservice', label: 'ServiceA', position: { x: 0, y: 0 }, config: { env: 'prod' } },
      { id: 'n2', type: 'database', label: 'DB', position: { x: 200, y: 0 }, config: {} },
    ],
    connectors: [
      { id: 'c1', sourceNodeId: 'n1', targetNodeId: 'n2', label: 'reads', protocol: 'database', config: {} },
    ],
    selection: { type: null, id: null },
  });
}

describe('useBuildAgent — initial state', () => {
  it('starts with all fields null', () => {
    const { result } = renderHook(() => useBuildAgent());
    expect(result.current.status).toBeNull();
    expect(result.current.step).toBeNull();
    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('exposes build and retry functions', () => {
    const { result } = renderHook(() => useBuildAgent());
    expect(typeof result.current.build).toBe('function');
    expect(typeof result.current.retry).toBe('function');
  });
});

describe('useBuildAgent — POST /build payload', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    resetDiagram();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('posts to /build with the correct target_node_id', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ job_id: 'job-1' }) })
      .mockResolvedValue({ ok: true, json: async () => makePendingJob('job-1') });

    const { result } = renderHook(() => useBuildAgent());
    await act(async () => { result.current.build('n1'); });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe('/build');
    expect(opts.method).toBe('POST');
    const body = JSON.parse(opts.body as string);
    expect(body.target_node_id).toBe('n1');
  });

  it('canvas.nodes contains all diagram nodes with id and type', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ job_id: 'job-1' }) })
      .mockResolvedValue({ ok: true, json: async () => makePendingJob('job-1') });

    const { result } = renderHook(() => useBuildAgent());
    await act(async () => { result.current.build('n1'); });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body.canvas.nodes).toHaveLength(2);
    expect(body.canvas.nodes[0]).toMatchObject({ id: 'n1', type: 'microservice' });
    expect(body.canvas.nodes[1]).toMatchObject({ id: 'n2', type: 'database' });
  });

  it('canvas.nodes[].data includes the node label and config fields', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ job_id: 'job-1' }) })
      .mockResolvedValue({ ok: true, json: async () => makePendingJob('job-1') });

    const { result } = renderHook(() => useBuildAgent());
    await act(async () => { result.current.build('n1'); });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    const n1 = body.canvas.nodes[0];
    expect(n1.data.label).toBe('ServiceA');
    expect(n1.data.env).toBe('prod');
  });

  it('canvas.edges maps connectors with source/target (not sourceNodeId/targetNodeId)', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ job_id: 'job-1' }) })
      .mockResolvedValue({ ok: true, json: async () => makePendingJob('job-1') });

    const { result } = renderHook(() => useBuildAgent());
    await act(async () => { result.current.build('n1'); });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body.canvas.edges).toHaveLength(1);
    expect(body.canvas.edges[0]).toMatchObject({
      id: 'c1',
      source: 'n1',
      target: 'n2',
      data: { protocol: 'database' },
    });
  });

  it('sends Authorization header with the stored token', async () => {
    localStorage.setItem('auth_token', 'test-jwt');
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ job_id: 'job-1' }) })
      .mockResolvedValue({ ok: true, json: async () => makePendingJob('job-1') });

    const { result } = renderHook(() => useBuildAgent());
    await act(async () => { result.current.build('n1'); });

    const headers = mockFetch.mock.calls[0][1].headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer test-jwt');
    localStorage.removeItem('auth_token');
  });
});

describe('useBuildAgent — polling', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    resetDiagram();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('status transitions to running while the job is in progress', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ job_id: 'job-1' }) })
      .mockResolvedValue({ ok: true, json: async () => makeRunningJob('job-1', 'generating_plan') });

    const { result } = renderHook(() => useBuildAgent());
    await act(async () => { result.current.build('n1'); });
    await act(async () => { vi.advanceTimersByTime(2000); });

    expect(result.current.status).toBe('running');
  });

  it('step is "generating_plan" when the server reports that step', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ job_id: 'job-1' }) })
      .mockResolvedValue({ ok: true, json: async () => makeRunningJob('job-1', 'generating_plan') });

    const { result } = renderHook(() => useBuildAgent());
    await act(async () => { result.current.build('n1'); });
    await act(async () => { vi.advanceTimersByTime(2000); });

    expect(result.current.step).toBe('generating_plan');
  });

  it('result is populated and status is done when the job completes', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ job_id: 'job-1' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => makeRunningJob('job-1', 'generating_plan') })
      .mockResolvedValue({ ok: true, json: async () => makeDoneJob('job-1', SAMPLE_RESULT) });

    const { result } = renderHook(() => useBuildAgent());
    await act(async () => { result.current.build('n1'); });
    await act(async () => { vi.advanceTimersByTime(2000); }); // poll 1 → running
    await act(async () => { vi.advanceTimersByTime(2000); }); // poll 2 → done

    expect(result.current.status).toBe('done');
    expect(result.current.result).toEqual(SAMPLE_RESULT);
    expect(result.current.error).toBeNull();
  });

  it('error is set and status is failed when the job fails', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ job_id: 'job-1' }) })
      .mockResolvedValue({ ok: true, json: async () => makeFailedJob('job-1', 'LLM timeout') });

    const { result } = renderHook(() => useBuildAgent());
    await act(async () => { result.current.build('n1'); });
    await act(async () => { vi.advanceTimersByTime(2000); });

    expect(result.current.status).toBe('failed');
    expect(result.current.error).toBe('LLM timeout');
  });

  it('polling stops (no more fetch calls) after status reaches done', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ job_id: 'job-1' }) })
      .mockResolvedValue({ ok: true, json: async () => makeDoneJob('job-1', SAMPLE_RESULT) });

    const { result } = renderHook(() => useBuildAgent());
    await act(async () => { result.current.build('n1'); });
    await act(async () => { vi.advanceTimersByTime(2000); }); // poll → done, interval cleared

    const callsAtDone = mockFetch.mock.calls.length;
    await act(async () => { vi.advanceTimersByTime(6000); }); // 3 more intervals worth
    expect(mockFetch.mock.calls.length).toBe(callsAtDone);
  });

  it('polling stops after status reaches failed', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ job_id: 'job-1' }) })
      .mockResolvedValue({ ok: true, json: async () => makeFailedJob('job-1', 'error') });

    const { result } = renderHook(() => useBuildAgent());
    await act(async () => { result.current.build('n1'); });
    await act(async () => { vi.advanceTimersByTime(2000); }); // poll → failed, interval cleared

    const callsAtFailed = mockFetch.mock.calls.length;
    await act(async () => { vi.advanceTimersByTime(6000); });
    expect(mockFetch.mock.calls.length).toBe(callsAtFailed);
  });

  it('polls GET /jobs/{job_id} using the job id returned from POST', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ job_id: 'abc-123' }) })
      .mockResolvedValue({ ok: true, json: async () => makePendingJob('abc-123') });

    const { result } = renderHook(() => useBuildAgent());
    await act(async () => { result.current.build('n1'); });
    await act(async () => { vi.advanceTimersByTime(2000); });

    expect(mockFetch.mock.calls[1][0]).toBe('/jobs/abc-123');
  });
});

describe('useBuildAgent — error handling', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    resetDiagram();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sets error when POST /build returns a non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, text: async () => 'Unauthorized', status: 401 });

    const { result } = renderHook(() => useBuildAgent());
    await act(async () => { result.current.build('n1'); });

    expect(result.current.error).toBeTruthy();
    expect(result.current.status).toBe('failed');
  });

  it('sets error when POST /build throws a network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network error'));

    const { result } = renderHook(() => useBuildAgent());
    await act(async () => { result.current.build('n1'); });

    expect(result.current.error).toBe('network error');
    expect(result.current.status).toBe('failed');
  });
});

describe('useBuildAgent — retry', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    resetDiagram();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('retry re-triggers POST /build with the same target_node_id', async () => {
    // First build — fails
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ job_id: 'job-1' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => makeFailedJob('job-1', 'timeout') });

    const { result } = renderHook(() => useBuildAgent());
    await act(async () => { result.current.build('n1'); });
    await act(async () => { vi.advanceTimersByTime(2000); });
    expect(result.current.status).toBe('failed');

    // Retry
    mockFetch.mockReset();
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ job_id: 'job-2' }) })
      .mockResolvedValue({ ok: true, json: async () => makePendingJob('job-2') });

    await act(async () => { result.current.retry(); });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body.target_node_id).toBe('n1');
  });

  it('retry resets error and status to null before the new job runs', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ job_id: 'job-1' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => makeFailedJob('job-1', 'err') });

    const { result } = renderHook(() => useBuildAgent());
    await act(async () => { result.current.build('n1'); });
    await act(async () => { vi.advanceTimersByTime(2000); });
    expect(result.current.status).toBe('failed');

    // Set up slow response so we can catch the intermediate state
    let resolveBuild!: (v: unknown) => void;
    const buildPromise = new Promise((r) => { resolveBuild = r; });
    mockFetch.mockReturnValueOnce(buildPromise);

    act(() => { result.current.retry(); });
    // Before the mock resolves, the state should be reset
    expect(result.current.status).toBeNull();
    expect(result.current.error).toBeNull();

    // Clean up
    resolveBuild({ ok: true, json: async () => ({ job_id: 'job-2' }) });
    await act(async () => {});
  });
});
