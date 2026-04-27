export type NodeType =
  | 'microservice'
  | 'database'
  | 'queue'
  | 'cache'
  | 'aws-service'
  | 'google-service'
  | 'ai-model-provider'
  | 'serverless';

export type Protocol =
  | 'http-rest'
  | 'tcp'
  | 'message-queue'
  | 'database'
  | 'websocket'
  | 'streaming';

export interface DiagramNode {
  id: string;
  type: NodeType;
  label: string;
  position: { x: number; y: number };
  config: Record<string, unknown>;
}

export interface Connector {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  label?: string;
  protocol: Protocol;
  config: Record<string, unknown>;
}

export interface Region {
  id: string;
  label: string;
  bounds: { x: number; y: number; w: number; h: number };
}

export type SelectionType = 'node' | 'connector' | null;

export interface Selection {
  type: SelectionType;
  id: string | null;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ContractField {
  name: string;
  type: string;
}

export interface Contract {
  name: string;
  fields: ContractField[];
}

export interface Endpoint {
  method: HttpMethod;
  path: string;
  requestSchema?: string;
  responseSchema?: string;
}
