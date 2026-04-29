export interface PlanStep {
  order: number;
  title: string;
  description: string;
}

export interface PromptFile {
  filename: string;
  content: string;
}

export interface SkillRecommendation {
  name: string;
  reason: string;
  docs_url: string;
}

export interface BuildResult {
  plan: PlanStep[];
  skills: SkillRecommendation[];
  prompts: PromptFile[];
  assumptions: string[];
  warnings: string[];
}

export type JobStatus = 'pending' | 'running' | 'done' | 'failed';

export interface JobState {
  job_id: string;
  status: JobStatus;
  step: string | null;
  result: BuildResult | null;
  error: string | null;
}

export interface CanvasNode {
  id: string;
  type: string;
  data: Record<string, unknown>;
}

export interface CanvasEdge {
  id: string;
  source: string;
  target: string;
  data: { protocol?: string };
}

export interface CanvasPayload {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}
