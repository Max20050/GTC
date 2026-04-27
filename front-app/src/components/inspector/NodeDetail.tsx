import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useDiagram } from '../../hooks/useDiagram';
import type { DiagramNode, NodeType, Contract, Endpoint } from '../../types/diagram';
import { ContractsEditor } from './ContractsEditor';
import { EndpointsEditor } from './EndpointsEditor';
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

const AWS_SERVICES = [
  'EC2', 'S3', 'Lambda', 'RDS', 'DynamoDB', 'SQS', 'SNS',
  'API Gateway', 'ECS', 'EKS', 'CloudFront', 'ElastiCache',
];
const AWS_REGIONS = [
  'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
  'eu-west-1', 'eu-west-2', 'eu-central-1',
  'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1',
];
const GOOGLE_SERVICES = [
  'Compute Engine', 'Cloud Storage', 'Cloud Run', 'BigQuery',
  'Cloud SQL', 'Pub/Sub', 'Cloud Functions', 'GKE', 'Vertex AI', 'Cloud Spanner',
];
const GOOGLE_REGIONS = [
  'us-central1', 'us-east1', 'us-west1',
  'europe-west1', 'europe-west2',
  'asia-east1', 'asia-southeast1', 'australia-southeast1',
];

const AWS_SERVICE_HINTS: Record<string, Record<string, string>> = {
  'EC2':         { instance_type: 't3.medium', key_pair: 'my-key' },
  'S3':          { bucket_name: 'my-bucket', access_control: 'private' },
  'Lambda':      { runtime: 'python3.12', memory: '512', timeout: '30', handler: 'index.handler' },
  'RDS':         { engine: 'postgresql', db_name: 'mydb', port: '5432', instance_class: 'db.t3.micro' },
  'DynamoDB':    { table_name: 'my-table', billing_mode: 'PAY_PER_REQUEST', partition_key: 'id' },
  'SQS':         { queue_type: 'Standard', visibility_timeout: '30' },
  'SNS':         { topic_name: 'my-topic', protocol: 'https' },
  'API Gateway': { api_type: 'REST', stage: 'prod', auth: 'none' },
  'ECS':         { cluster: 'my-cluster', launch_type: 'FARGATE', cpu: '256', memory: '512' },
  'EKS':         { cluster_name: 'my-cluster', node_type: 't3.medium', nodes: '2' },
  'CloudFront':  { price_class: 'PriceClass_100', https_only: 'true' },
  'ElastiCache': { engine: 'redis', node_type: 'cache.t3.micro' },
};
const GOOGLE_SERVICE_HINTS: Record<string, Record<string, string>> = {
  'Compute Engine': { machine_type: 'e2-medium', zone: 'us-central1-a' },
  'Cloud Storage':  { bucket_name: 'my-bucket', storage_class: 'STANDARD' },
  'Cloud Run':      { cpu: '1', memory: '512Mi', concurrency: '80' },
  'BigQuery':       { dataset: 'my_dataset', table: 'my_table' },
  'Cloud SQL':      { database_version: 'POSTGRES_15', tier: 'db-n1-standard-1', db_name: 'mydb' },
  'Pub/Sub':        { topic_id: 'my-topic', subscription_id: 'my-sub' },
  'Cloud Functions':{ runtime: 'python310', memory: '256MB', timeout: '60s', trigger: 'http' },
  'GKE':            { cluster_name: 'my-cluster', node_type: 'e2-medium', nodes: '3' },
  'Vertex AI':      { model: 'gemini-pro', endpoint: '' },
  'Cloud Spanner':  { instance_id: 'my-instance', database_id: 'my-db' },
};

function getFieldOptions(nodeType: NodeType, key: string): string[] | null {
  if (nodeType === 'aws-service') {
    if (key === 'service_name') return AWS_SERVICES;
    if (key === 'region') return AWS_REGIONS;
  }
  if (nodeType === 'google-service') {
    if (key === 'service_name') return GOOGLE_SERVICES;
    if (key === 'region') return GOOGLE_REGIONS;
  }
  return null;
}

interface NodeDetailProps {
  node: DiagramNode;
}

export function NodeDetail({ node }: NodeDetailProps) {
  const updateNode = useDiagram((s) => s.updateNode);
  const [newKey, setNewKey] = useState('');
  const [newVal, setNewVal] = useState('');

  const hints = CONFIG_HINTS[node.type] ?? {};
  const unusedHints = Object.keys(hints).filter((k) => !(k in node.config) && !k.startsWith('_'));

  const serviceName = String(node.config.service_name ?? '');
  const serviceSpecificHints =
    node.type === 'aws-service'
      ? (AWS_SERVICE_HINTS[serviceName] ?? {})
      : node.type === 'google-service'
        ? (GOOGLE_SERVICE_HINTS[serviceName] ?? {})
        : {};
  const unusedServiceHints = Object.keys(serviceSpecificHints).filter(
    (k) => !(k in node.config) && !(k in hints)
  );

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

      <Section label="CONTRACTS">
        <ContractsEditor
          node={node}
          onChange={(contracts: Contract[]) =>
            updateNode(node.id, { config: { ...node.config, _contracts: contracts } })
          }
        />
      </Section>

      <Section label="ENDPOINTS">
        <EndpointsEditor
          node={node}
          onChange={(endpoints: Endpoint[]) =>
            updateNode(node.id, { config: { ...node.config, _endpoints: endpoints } })
          }
        />
      </Section>

      <Section label="CONFIGURATION">
        <div className={styles.configTable}>
          {Object.entries(node.config).filter(([k]) => !k.startsWith('_')).map(([k, v]) => {
            const options = getFieldOptions(node.type, k);
            return (
              <div key={k} className={styles.configRow}>
                <span className={styles.configKey}>{k}</span>
                {options ? (
                  <select
                    className={styles.configVal}
                    value={String(v)}
                    onChange={(e) => setConfig(k, e.target.value)}
                    style={{ cursor: 'pointer' }}
                  >
                    {options.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    className={styles.configVal}
                    value={String(v)}
                    onChange={(e) => setConfig(k, e.target.value)}
                  />
                )}
                <button className={styles.removeBtn} onClick={() => removeConfig(k)}>
                  <Trash2 size={11} />
                </button>
              </div>
            );
          })}

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
        {unusedServiceHints.length > 0 && (
          <div className={styles.hints}>
            <span className={styles.hintsLabel}>{serviceName} fields</span>
            <div className={styles.hintChips}>
              {unusedServiceHints.map((k) => (
                <button
                  key={k}
                  className={styles.hintChip}
                  onClick={() => setConfig(k, String(serviceSpecificHints[k]))}
                >
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
