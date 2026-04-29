import { useRef, useState } from 'react';
import type { BuildResult, JobStatus } from '../lib/build-agent-api';
import { useDiagram } from './useDiagram';

export interface BuildAgentState {
  status: JobStatus | null;
  step: string | null;
  result: BuildResult | null;
  error: string | null;
  build: (targetNodeId: string) => void;
  retry: () => void;
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('auth_token') ?? '';
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function buildCanvasPayload() {
  const { nodes, connectors } = useDiagram.getState();
  return {
    nodes: nodes.map((n) => ({
      id: n.id,
      type: n.type,
      data: { label: n.label, ...n.config },
    })),
    edges: connectors.map((c) => ({
      id: c.id,
      source: c.sourceNodeId,
      target: c.targetNodeId,
      data: { protocol: c.protocol },
    })),
  };
}

export function useBuildAgent(): BuildAgentState {
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [step, setStep] = useState<string | null>(null);
  const [result, setResult] = useState<BuildResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastTargetRef = useRef<string | null>(null);

  function stopPolling() {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  async function startJob(targetNodeId: string) {
    stopPolling();
    setStatus(null);
    setStep(null);
    setResult(null);
    setError(null);
    lastTargetRef.current = targetNodeId;

    let jobId: string;
    try {
      const res = await fetch('/build', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          target_node_id: targetNodeId,
          canvas: buildCanvasPayload(),
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }

      const data = await res.json() as { job_id: string };
      jobId = data.job_id;
    } catch (err) {
      setStatus('failed');
      setError(err instanceof Error ? err.message : 'Unknown error');
      return;
    }

    intervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/jobs/${jobId}`, { headers: authHeaders() });
        if (!res.ok) return;
        const job = await res.json() as { status: JobStatus; step: string | null; result: BuildResult | null; error: string | null };
        setStatus(job.status);
        setStep(job.step);
        if (job.result) setResult(job.result);
        if (job.error) setError(job.error);
        if (job.status === 'done' || job.status === 'failed') {
          stopPolling();
        }
      } catch {
        // transient network errors during polling are ignored
      }
    }, 2000);
  }

  function retry() {
    if (lastTargetRef.current) {
      startJob(lastTargetRef.current);
    }
  }

  return { status, step, result, error, build: startJob, retry };
}
