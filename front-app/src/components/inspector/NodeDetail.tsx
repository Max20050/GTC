import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useDiagram } from '../../hooks/useDiagram';
import type { DiagramNode, NodeType } from '../../types/diagram';
import styles from './Detail.module.css';

const NODE_TYPES: NodeType[] = [
  'microservice', 'database', 'queue', 'cache',
  'aws-service', 'google-service', 'ai-model-provider', 'serverless',
];

const CONFIG_HINTS: Record<NodeType, Record<string, string>> = {
  microservice:        { language: 'Go', port: '8080', replicas: '2' },
  database:            { engine: 'PostgreSQL', version: '15', port: '5432' },
  queue:               { broker: 'RabbitMQ', exchange: 'events' },
  cache:               { engine: 'Redis', port: '6379', ttl: '3600' },
  'aws-service':       { service_name: 'S3', region: 'us-east-1' },
  'google-service':    { service_name: 'BigQuery', region: 'us-central1' },
  'ai-model-provider': { provider: 'OpenAI', model: 'gpt-4o' },
  serverless:          { runtime: 'python3.12', memory: '512', timeout: '30' },
};

interface NodeDetailProps {
  node: DiagramNode;
}

export function NodeDetail({ node }: NodeDetailProps) {
  const updateNode = useDiagram((s) => s.updateNode);
  const [newKey, setNewKey] = useState('');
  const [newVal, setNewVal] = useState('');

  const hints = CONFIG_HINTS[node.type] ?? {};
  const unusedHints = Object.keys(hints).filter((k) => !(k in node.config));

  function setConfig(key: string, value: string) {
    let parsed: unknown = value;
    if (value === 'true') parsed = true;
    else if (value === 'false') parsed = false;
    else if (value !== '' && !isNaN(Number(value))) parsed = Number(value);
    updateNode(node.id, { config: { ...node.config, [key]: parsed } });
  }

  function removeConfig(key: string) {
    const next = { ...node.config };
    delete next[key];
    updateNode(node.id, { config: next });
  }

  function addEntry() {
    if (!newKey.trim()) return;
    setConfig(newKey.trim(), newVal.trim());
    setNewKey('');
    setNewVal('');
  }

  function addHint(key: string) {
    setConfig(key, String(hints[key]));
  }

  return (
    <div className={styles.detail}>
      <div className={styles.header}>
        <span className={styles.badge}>{node.type}</span>
        <h2 className={styles.title}>{node.label}</h2>
      </div>

      <Section label="LABEL">
        <input
          className={styles.input}
          value={node.label}
          onChange={(e) => updateNode(node.id, { label: e.target.value })}
        />
      </Section>

      <Section label="TYPE">
        <select
          className={styles.select}
          value={node.type}
          onChange={(e) => updateNode(node.id, { type: e.target.value as NodeType })}
        >
          {NODE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </Section>

      <Section label="CONFIGURATION">
        <div className={styles.configTable}>
          {Object.entries(node.config).map(([k, v]) => (
            <div key={k} className={styles.configRow}>
              <span className={styles.configKey}>{k}</span>
              <input
                className={styles.configVal}
                value={String(v)}
                onChange={(e) => setConfig(k, e.target.value)}
              />
              <button className={styles.removeBtn} onClick={() => removeConfig(k)}>
                <Trash2 size={11} />
              </button>
            </div>
          ))}

          {/* Add new key-value */}
          <div className={styles.configRow}>
            <input
              className={styles.configKey}
              placeholder="key"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addEntry()}
            />
            <input
              className={styles.configVal}
              placeholder="value"
              value={newVal}
              onChange={(e) => setNewVal(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addEntry()}
            />
            <button className={styles.addBtn} onClick={addEntry}>
              <Plus size={11} />
            </button>
          </div>
        </div>

        {/* Suggested fields for this node type */}
        {unusedHints.length > 0 && (
          <div className={styles.hints}>
            <span className={styles.hintsLabel}>Suggestions</span>
            <div className={styles.hintChips}>
              {unusedHints.map((k) => (
                <button key={k} className={styles.hintChip} onClick={() => addHint(k)}>
                  + {k}
                </button>
              ))}
            </div>
          </div>
        )}
      </Section>

      <Section label="POSITION">
        <span className={styles.mono}>
          x {Math.round(node.position.x)} · y {Math.round(node.position.y)}
        </span>
      </Section>
    </div>
  );
}

export function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={styles.section}>
      <span className={styles.sectionLabel}>{label}</span>
      <div className={styles.sectionValue}>{children}</div>
    </div>
  );
}
