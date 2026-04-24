// Proxied through Vite dev server to http://localhost:8082
const BASE = '';

function authHeaders() {
  const token = localStorage.getItem('canvas_token') ?? '';
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export interface ApiNode {
  id: string;
  type: string;
  label: string;
  position: { x: number; y: number };
  config: Record<string, unknown>;
}

export interface ApiEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
  protocol: string;
  config: Record<string, unknown>;
}

export interface CanvasDocument {
  canvas_id: string;
  nodes: ApiNode[];
  edges: ApiEdge[];
}

export async function fetchCanvas(canvasId: string): Promise<CanvasDocument> {
  const res = await fetch(`${BASE}/canvas/${canvasId}`, {
    headers: authHeaders(),
  });
  if (res.status === 404) throw Object.assign(new Error('not_found'), { status: 404 });
  if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
  return res.json() as Promise<CanvasDocument>;
}

export async function createCanvas(canvasId: string): Promise<CanvasDocument> {
  const res = await fetch(`${BASE}/canvas/`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ canvas_id: canvasId, nodes: [], edges: [] }),
  });
  if (!res.ok) throw new Error(`create failed: ${res.status}`);
  return res.json() as Promise<CanvasDocument>;
}

export async function saveCanvas(doc: CanvasDocument): Promise<void> {
  const res = await fetch(`${BASE}/canvas/${doc.canvas_id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(doc),
  });
  if (!res.ok) throw new Error(`save failed: ${res.status}`);
}
