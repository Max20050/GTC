export type NodeType =
  | 'microservice'
  | 'serverless'
  | 'scheduled_job'
  | 'gateway'
  | 'auth_provider'
  | 'sql_db'
  | 'document_store'
  | 'cache'
  | 'message_queue'
  | 'object_storage'
  | 'client_app'
  | 'cdn'
  | 'third_party';

export type Protocol = 'http_rest' | 'grpc' | 'sql' | 'nosql' | 'pubsub' | 'websocket';

export interface Header {
  key: string;
  value: string;
  required: boolean;
}

export interface DiagramNode {
  id: string;
  type: NodeType;
  label: string;
  sublabel?: string;
  position: { x: number; y: number };
  size: { w: number; h: number };
  regionId?: string;
  meta: Record<string, unknown>;
}

export interface Connector {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  protocol: Protocol;
  label?: string;
  meta: {
    method?: string;
    path?: string;
    auth?: string;
    throughput?: string;
    retry?: string;
    timeout?: number;
    headers?: Header[];
    requestSchema?: object;
    responseSchema?: object;
  };
}

export interface Region {
  id: string;
  label: string;
  bounds: { x: number; y: number; w: number; h: number };
}

export interface DiagramState {
  id: string;
  name: string;
  nodes: DiagramNode[];
  connectors: Connector[];
  regions: Region[];
  viewport: { x: number; y: number; zoom: number };
}

export type SelectionType = 'node' | 'connector' | null;

export interface Selection {
  type: SelectionType;
  id: string | null;
}
