import { useState } from 'react';
import {
  Server, Zap, Clock, Shield, Lock,
  Database, FileText, Bolt, MessageSquare, HardDrive,
  Monitor, Globe, ExternalLink,
  Search, ChevronDown, ChevronRight
} from 'lucide-react';
import { PaletteItem } from './PaletteItem';
import styles from './ComponentPalette.module.css';

const GROUPS = [
  {
    label: 'COMPUTE',
    items: [
      { type: 'microservice' as const, label: 'Microservice', shortcut: 'S', icon: <Server size={14} /> },
      { type: 'serverless' as const, label: 'Serverless', shortcut: 'F', icon: <Zap size={14} /> },
      { type: 'scheduled_job' as const, label: 'Scheduled Job', shortcut: 'T', icon: <Clock size={14} /> },
      { type: 'gateway' as const, label: 'Gateway / LB', shortcut: 'G', icon: <Shield size={14} /> },
      { type: 'auth_provider' as const, label: 'Auth Provider', shortcut: 'A', icon: <Lock size={14} /> },
    ],
  },
  {
    label: 'DATA',
    items: [
      { type: 'sql_db' as const, label: 'SQL Database', shortcut: 'D', icon: <Database size={14} /> },
      { type: 'document_store' as const, label: 'Document Store', shortcut: 'N', icon: <FileText size={14} /> },
      { type: 'cache' as const, label: 'Cache / KV', shortcut: 'K', icon: <Bolt size={14} /> },
      { type: 'message_queue' as const, label: 'Message Queue', shortcut: 'Q', icon: <MessageSquare size={14} /> },
      { type: 'object_storage' as const, label: 'Object Storage', shortcut: 'O', icon: <HardDrive size={14} /> },
    ],
  },
  {
    label: 'EDGE & EXTERNAL',
    items: [
      { type: 'client_app' as const, label: 'Client App', shortcut: 'C', icon: <Monitor size={14} /> },
      { type: 'cdn' as const, label: 'CDN', shortcut: 'E', icon: <Globe size={14} /> },
      { type: 'third_party' as const, label: '3rd-party', shortcut: 'X', icon: <ExternalLink size={14} /> },
    ],
  },
];

export function ComponentPalette() {
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const filtered = search.trim()
    ? GROUPS.map((g) => ({
        ...g,
        items: g.items.filter((item) =>
          item.label.toLowerCase().includes(search.toLowerCase())
        ),
      })).filter((g) => g.items.length > 0)
    : GROUPS;

  return (
    <aside className={styles.palette}>
      <div className={styles.searchWrapper}>
        <Search size={12} className={styles.searchIcon} />
        <input
          className={styles.search}
          placeholder="Search components..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className={styles.groups}>
        {filtered.map((group) => {
          const isCollapsed = collapsed[group.label];
          return (
            <div key={group.label} className={styles.group}>
              <button
                className={styles.groupHeader}
                onClick={() =>
                  setCollapsed((prev) => ({ ...prev, [group.label]: !prev[group.label] }))
                }
              >
                {isCollapsed ? <ChevronRight size={10} /> : <ChevronDown size={10} />}
                <span>{group.label}</span>
                <span className={styles.count}>{group.items.length}</span>
              </button>
              {!isCollapsed && (
                <div className={styles.items}>
                  {group.items.map((item) => (
                    <PaletteItem key={item.type} {...item} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
