import { useDiagram } from '../../hooks/useDiagram';
import type { Connector, DiagramNode, Protocol } from '../../types/diagram';
import styles from './Detail.module.css';

const PROTOCOL_LABELS: Record<Protocol, string> = {
  http_rest: 'REST',
  grpc:      'gRPC',
  sql:       'SQL',
  nosql:     'NoSQL',
  pubsub:    'Pub/Sub',
  websocket: 'WebSocket',
};

const PROTOCOL_COLORS: Record<Protocol, string> = {
  http_rest: 'var(--accent-cyan)',
  grpc:      'var(--accent-blue)',
  sql:       'var(--accent-green)',
  nosql:     'var(--accent-orange)',
  pubsub:    'var(--accent-yellow)',
  websocket: 'var(--accent-pink)',
};

interface ConnectorDetailProps {
  connector: Connector;
  nodes: DiagramNode[];
}

export function ConnectorDetail({ connector, nodes }: ConnectorDetailProps) {
  const updateConnector = useDiagram((s) => s.updateConnector);
  const src = nodes.find((n) => n.id === connector.sourceNodeId);
  const tgt = nodes.find((n) => n.id === connector.targetNodeId);

  return (
    <div className={styles.detail}>
      <div className={styles.header}>
        <span
          className={styles.badge}
          style={{ color: PROTOCOL_COLORS[connector.protocol], borderColor: PROTOCOL_COLORS[connector.protocol] }}
        >
          {PROTOCOL_LABELS[connector.protocol]}
        </span>
        <h2 className={styles.title}>{connector.meta.method ?? 'GET'} {connector.meta.path ?? '/'}</h2>
        <p className={styles.sub}>{src?.label ?? '?'} → {tgt?.label ?? '?'}</p>
      </div>

      <Section label="PROTOCOL">
        <select
          className={styles.select}
          value={connector.protocol}
          onChange={(e) => updateConnector(connector.id, { protocol: e.target.value as Protocol })}
        >
          {(Object.keys(PROTOCOL_LABELS) as Protocol[]).map((p) => (
            <option key={p} value={p}>{PROTOCOL_LABELS[p]}</option>
          ))}
        </select>
      </Section>

      <Section label="METHOD">
        <input
          className={styles.input}
          placeholder="POST"
          value={connector.meta.method ?? ''}
          onChange={(e) =>
            updateConnector(connector.id, { meta: { ...connector.meta, method: e.target.value } })
          }
        />
      </Section>

      <Section label="PATH">
        <input
          className={styles.input}
          placeholder="/v1/resource"
          value={connector.meta.path ?? ''}
          onChange={(e) =>
            updateConnector(connector.id, { meta: { ...connector.meta, path: e.target.value } })
          }
        />
      </Section>

      <Section label="AUTH">
        <input
          className={styles.input}
          placeholder="Bearer JWT"
          value={connector.meta.auth ?? ''}
          onChange={(e) =>
            updateConnector(connector.id, { meta: { ...connector.meta, auth: e.target.value } })
          }
        />
      </Section>

      <Section label="THROUGHPUT">
        <input
          className={styles.input}
          placeholder="160 req/s · p95 42ms"
          value={connector.meta.throughput ?? ''}
          onChange={(e) =>
            updateConnector(connector.id, { meta: { ...connector.meta, throughput: e.target.value } })
          }
        />
      </Section>

      <Section label="TIMEOUT">
        <input
          className={styles.input}
          type="number"
          placeholder="2000"
          value={connector.meta.timeout ?? ''}
          onChange={(e) =>
            updateConnector(connector.id, { meta: { ...connector.meta, timeout: Number(e.target.value) } })
          }
        />
      </Section>

      <Section label="RETRY">
        <input
          className={styles.input}
          placeholder="exponential · max 3"
          value={connector.meta.retry ?? ''}
          onChange={(e) =>
            updateConnector(connector.id, { meta: { ...connector.meta, retry: e.target.value } })
          }
        />
      </Section>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={styles.section}>
      <span className={styles.sectionLabel}>{label}</span>
      <div className={styles.sectionValue}>{children}</div>
    </div>
  );
}
