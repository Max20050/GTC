import { Plus, Trash2 } from 'lucide-react';
import type { DiagramNode, Endpoint, Contract, HttpMethod, NodeType } from '../../types/diagram';
import styles from './Detail.module.css';

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

const HTTP_NODE_TYPES: NodeType[] = ['microservice', 'serverless'];

function isHttpNode(node: DiagramNode): boolean {
  if (HTTP_NODE_TYPES.includes(node.type)) return true;
  if (node.type === 'aws-service' && String(node.config.service_name ?? '') === 'API Gateway') return true;
  return false;
}

interface Props {
  node: DiagramNode;
  onChange: (endpoints: Endpoint[]) => void;
}

export function EndpointsEditor({ node, onChange }: Props) {
  if (!isHttpNode(node)) return null;

  const endpoints = (node.config._endpoints as Endpoint[] | undefined) ?? [];
  const contracts = (node.config._contracts as Contract[] | undefined) ?? [];
  const contractNames = contracts.map((c) => c.name);

  function addEndpoint() {
    onChange([...endpoints, { method: 'GET', path: '/' }]);
  }

  function removeEndpoint(idx: number) {
    onChange(endpoints.filter((_, i) => i !== idx));
  }

  function updateEndpoint(idx: number, patch: Partial<Endpoint>) {
    onChange(endpoints.map((e, i) => (i === idx ? { ...e, ...patch } : e)));
  }

  return (
    <div className={styles.endpointsEditor}>
      {endpoints.map((ep, i) => (
        <div key={i} className={styles.endpointRow}>
          <select
            className={styles.methodSelect}
            value={ep.method}
            onChange={(e) => updateEndpoint(i, { method: e.target.value as HttpMethod })}
            aria-label="HTTP method"
          >
            {HTTP_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>

          <input
            className={styles.pathInput}
            value={ep.path}
            onChange={(e) => updateEndpoint(i, { path: e.target.value })}
            aria-label="Endpoint path"
            placeholder="/path"
          />

          <select
            className={styles.schemaSelect}
            value={ep.requestSchema ?? ''}
            onChange={(e) => updateEndpoint(i, { requestSchema: e.target.value || undefined })}
            aria-label="Request schema"
          >
            <option value="">— req —</option>
            {contractNames.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>

          <select
            className={styles.schemaSelect}
            value={ep.responseSchema ?? ''}
            onChange={(e) => updateEndpoint(i, { responseSchema: e.target.value || undefined })}
            aria-label="Response schema"
          >
            <option value="">— res —</option>
            {contractNames.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>

          <button
            className={styles.removeBtn}
            aria-label="Remove endpoint"
            onClick={() => removeEndpoint(i)}
          >
            <Trash2 size={11} />
          </button>
        </div>
      ))}

      <button className={styles.addEndpointBtn} onClick={addEndpoint}>
        <Plus size={11} /> Add endpoint
      </button>
    </div>
  );
}
