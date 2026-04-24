import { useState } from 'react';
import {
  Server, Database, MessageSquare, Zap,
  Cloud, Globe, Brain, Code2,
  Search, ChevronDown, ChevronRight,
} from 'lucide-react';
import { PaletteItem } from './PaletteItem';
import styles from './ComponentPalette.module.css';

const GROUPS = [
  {
    label: 'COMPUTE',
    items: [
      { type: 'microservice' as const,  label: 'Microservice',  shortcut: 'S', icon: <Server size={14} /> },
      { type: 'serverless' as const,    label: 'Serverless',    shortcut: 'F', icon: <Code2 size={14} /> },
    ],
  },
  {
    label: 'DATA',
    items: [
      { type: 'database' as const,      label: 'Database',      shortcut: 'D', icon: <Database size={14} /> },
      { type: 'queue' as const,         label: 'Message Queue', shortcut: 'Q', icon: <MessageSquare size={14} /> },
      { type: 'cache' as const,         label: 'Cache / KV',    shortcut: 'K', icon: <Zap size={14} /> },
    ],
  },
  {
    label: 'CLOUD & EXTERNAL',
    items: [
      { type: 'aws-service' as const,      label: 'AWS Service',      shortcut: 'A', icon: <Cloud size={14} /> },
      { type: 'google-service' as const,   label: 'Google Service',   shortcut: 'G', icon: <Globe size={14} /> },
      { type: 'ai-model-provider' as const,label: 'AI Model Provider',shortcut: 'I', icon: <Brain size={14} /> },
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
