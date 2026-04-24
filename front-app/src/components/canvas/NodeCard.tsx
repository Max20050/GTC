import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import {
  Server, Database, MessageSquare, Zap,
  Cloud, Globe, Brain, Code2,
} from 'lucide-react';
import type { NodeType } from '../../types/diagram';
import styles from './NodeCard.module.css';

const ICONS: Record<NodeType, React.ReactNode> = {
  microservice:       <Server size={13} />,
  database:           <Database size={13} />,
  queue:              <MessageSquare size={13} />,
  cache:              <Zap size={13} />,
  'aws-service':      <Cloud size={13} />,
  'google-service':   <Globe size={13} />,
  'ai-model-provider':<Brain size={13} />,
  serverless:         <Code2 size={13} />,
};

type NodeCategory = 'compute' | 'data' | 'external';

const CATEGORY: Record<NodeType, NodeCategory> = {
  microservice:        'compute',
  serverless:          'compute',
  database:            'data',
  queue:               'data',
  cache:               'data',
  'aws-service':       'external',
  'google-service':    'external',
  'ai-model-provider': 'external',
};

interface NodeData {
  label: string;
  nodeType: NodeType;
  config?: Record<string, unknown>;
}

export const NodeCard = memo(function NodeCard({ data, selected }: NodeProps) {
  const { label, nodeType, config } = data as unknown as NodeData;
  const category = CATEGORY[nodeType] ?? 'compute';
  const configKeys = config ? Object.keys(config) : [];

  return (
    <div className={`${styles.card} ${styles[category]} ${selected ? styles.selected : ''}`}>
      <Handle type="target" position={Position.Left} className={styles.handle} />
      <div className={styles.accent} />
      <div className={styles.body}>
        <div className={styles.header}>
          <span className={styles.icon}>{ICONS[nodeType] ?? <Server size={13} />}</span>
          <span className={styles.label}>{label}</span>
          <span className={styles.status} />
        </div>
        {configKeys.length > 0 && (
          <div className={styles.configPreview}>
            {configKeys.slice(0, 2).map((k) => (
              <span key={k} className={styles.configChip}>
                {k}: {String(config![k]).slice(0, 12)}
              </span>
            ))}
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Right} className={styles.handle} />
    </div>
  );
});
