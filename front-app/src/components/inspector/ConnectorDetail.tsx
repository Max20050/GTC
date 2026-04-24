import { useDiagram } from '../../hooks/useDiagram';
import type { Connector, DiagramNode, Protocol } from '../../types/diagram';
import { Section } from './NodeDetail';
import styles from './Detail.module.css';

const PROTOCOL_LABELS: Record<Protocol, string> = {
  'http-rest':     'HTTP REST',
  'tcp':           'TCP',
  'message-queue': 'Message Queue',
  'database':      'Database',
  'websocket':     'WebSocket',
  'streaming':     'Streaming',
};

const PROTOCOL_COLORS: Record<Protocol, string> = {
  'http-rest':     '#00d4aa',
  'tcp':           '#a78bfa',
  'message-queue': '#e3b341',
  'database':      '#34d058',
  'websocket':     '#d2a8ff',
  'streaming':     '#f0883e',
};

interface ConnectorDetailProps {
  connector: Connector;
  nodes: DiagramNode[];
}

export function ConnectorDetail({ connector, nodes }: ConnectorDetailProps) {
  const updateConnector = useDiagram((s) => s.updateConnector);
  const src = nodes.find((n) => n.id === connector.sourceNodeId);
  const tgt = nodes.find((n) => n.id === connector.targetNodeId);

  function setConfig(patch: Record<string, unknown>) {
    updateConnector(connector.id, { config: { ...connector.config, ...patch } });
  }

  return (
    <div className={styles.detail}>
      <div className={styles.header}>
        <span
          className={styles.badge}
          style={{ color: PROTOCOL_COLORS[connector.protocol], borderColor: PROTOCOL_COLORS[connector.protocol] }}
        >
          {PROTOCOL_LABELS[connector.protocol]}
        </span>
        <h2 className={styles.title}>{connector.label ?? connector.protocol}</h2>
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

      <Section label="LABEL">
        <input
          className={styles.input}
          placeholder="Connection label"
          value={connector.label ?? ''}
          onChange={(e) => updateConnector(connector.id, { label: e.target.value })}
        />
      </Section>

      {connector.protocol === 'http-rest' && (
        <HttpRestConfig config={connector.config} onChange={setConfig} />
      )}
      {connector.protocol === 'message-queue' && (
        <MessageQueueConfig config={connector.config} onChange={setConfig} />
      )}
      {connector.protocol === 'database' && (
        <DatabaseConfig config={connector.config} onChange={setConfig} />
      )}
      {(connector.protocol === 'tcp' || connector.protocol === 'websocket' || connector.protocol === 'streaming') && (
        <Section label="NOTES">
          <textarea
            className={styles.textarea}
            placeholder="Add any notes about this connection..."
            value={String(connector.config.notes ?? '')}
            onChange={(e) => setConfig({ notes: e.target.value })}
          />
        </Section>
      )}
    </div>
  );
}

function HttpRestConfig({
  config, onChange,
}: {
  config: Record<string, unknown>;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  const headersStr = config.headers
    ? JSON.stringify(config.headers, null, 2)
    : '';
  const payloadStr = config.payload
    ? JSON.stringify(config.payload, null, 2)
    : '';

  function parseJson(str: string): unknown {
    try { return JSON.parse(str); } catch { return str; }
  }

  return (
    <>
      <Section label="METHOD">
        <select
          className={styles.select}
          value={String(config.method ?? 'GET')}
          onChange={(e) => onChange({ method: e.target.value })}
        >
          {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </Section>

      <Section label="HEADERS (JSON)">
        <textarea
          className={styles.textarea}
          placeholder={'{\n  "Authorization": "Bearer $TOKEN"\n}'}
          defaultValue={headersStr}
          onBlur={(e) => onChange({ headers: parseJson(e.target.value) })}
        />
      </Section>

      <Section label="PAYLOAD (JSON)">
        <textarea
          className={styles.textarea}
          placeholder={'{\n  "key": "value"\n}'}
          defaultValue={payloadStr}
          onBlur={(e) => onChange({ payload: parseJson(e.target.value) })}
        />
      </Section>

      <Section label="EXPECTED RESPONSE (JSON)">
        <textarea
          className={styles.textarea}
          placeholder={'{\n  "id": "string"\n}'}
          defaultValue={config.expected_response ? JSON.stringify(config.expected_response, null, 2) : ''}
          onBlur={(e) => onChange({ expected_response: parseJson(e.target.value) })}
        />
      </Section>
    </>
  );
}

function MessageQueueConfig({
  config, onChange,
}: {
  config: Record<string, unknown>;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  return (
    <>
      <Section label="QUEUE NAME">
        <input
          className={styles.input}
          placeholder="order.created"
          value={String(config.queue_name ?? '')}
          onChange={(e) => onChange({ queue_name: e.target.value })}
        />
      </Section>
      <Section label="ACTION">
        <select
          className={styles.select}
          value={String(config.action ?? 'publish')}
          onChange={(e) => onChange({ action: e.target.value })}
        >
          <option value="publish">Publish</option>
          <option value="consume">Consume</option>
        </select>
      </Section>
    </>
  );
}

function DatabaseConfig({
  config, onChange,
}: {
  config: Record<string, unknown>;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  return (
    <Section label="QUERY">
      <textarea
        className={styles.textarea}
        placeholder="SELECT * FROM users WHERE id = $1"
        value={String(config.query ?? '')}
        onChange={(e) => onChange({ query: e.target.value })}
      />
    </Section>
  );
}
