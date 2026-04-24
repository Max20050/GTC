import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import {
  Server, Zap, Clock, Shield, Lock,
  Database, FileText, Bolt, MessageSquare, HardDrive,
  Monitor, Globe, ExternalLink,
} from 'lucide-react';
import type { NodeType } from '../../types/diagram';
import styles from './NodeCard.module.css';

const ICONS: Record<NodeType, React.ReactNode> = {
  microservice:   <Server size={13} />,
  serverless:     <Zap size={13} />,
  scheduled_job:  <Clock size={13} />,
  gateway:        <Shield size={13} />,
  auth_provider:  <Lock size={13} />,
  sql_db:         <Database size={13} />,
  document_store: <FileText size={13} />,
  cache:          <Bolt size={13} />,
  message_queue:  <MessageSquare size={13} />,
  object_storage: <HardDrive size={13} />,
  client_app:     <Monitor size={13} />,
  cdn:            <Globe size={13} />,
  third_party:    <ExternalLink size={13} />,
};

type NodeCategory = 'compute' | 'data' | 'external';
const CATEGORY: Record<NodeType, NodeCategory> = {
  microservice: 'compute', serverless: 'compute', scheduled_job: 'compute',
  gateway: 'compute', auth_provider: 'compute',
  sql_db: 'data', document_store: 'data', cache: 'data',
  message_queue: 'data', object_storage: 'data',
  client_app: 'external', cdn: 'external', third_party: 'external',
};

interface NodeData {
  label: string;
  sublabel?: string;
  nodeType: NodeType;
}

export const NodeCard = memo(function NodeCard({ data, selected }: NodeProps) {
  const { label, sublabel, nodeType } = data as unknown as NodeData;
  const category = CATEGORY[nodeType] ?? 'compute';

  return (
    <div className={`${styles.card} ${styles[category]} ${selected ? styles.selected : ''}`}>
      <Handle type="target" position={Position.Left} className={styles.handle} />
      <div className={styles.accent} />
      <div className={styles.body}>
        <div className={styles.header}>
          <span className={styles.icon}>{ICONS[nodeType]}</span>
          <span className={styles.label}>{label}</span>
          <span className={styles.status} />
        </div>
        {sublabel && <div className={styles.sublabel}>{sublabel}</div>}
      </div>
      <Handle type="source" position={Position.Right} className={styles.handle} />
    </div>
  );
});
