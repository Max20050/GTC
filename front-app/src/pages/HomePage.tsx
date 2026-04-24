import { Plus, Cpu, LayoutGrid } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import styles from './HomePage.module.css';

const DEMO_BOARDS = [
  { id: 'demo-1', name: 'E-Commerce Platform', updatedAt: '2h ago' },
  { id: 'demo-2', name: 'Auth Service Architecture', updatedAt: '1d ago' },
  { id: 'demo-3', name: 'Data Pipeline', updatedAt: '3d ago' },
];

export function HomePage() {
  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <div className={styles.logo}>
          <Cpu size={18} color="var(--accent-blue)" />
          <span>Graph to Code</span>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <LayoutGrid size={14} />
            <h2>My boards</h2>
          </div>
          <div className={styles.grid}>
            <button className={styles.newBoard} onClick={() => navigate('/boards/new')}>
              <Plus size={20} />
              <span>New board</span>
            </button>
            {DEMO_BOARDS.map((b) => (
              <button
                key={b.id}
                className={styles.boardCard}
                onClick={() => navigate(`/boards/${b.id}`)}
              >
                <div className={styles.boardPreview} />
                <div className={styles.boardInfo}>
                  <span className={styles.boardName}>{b.name}</span>
                  <span className={styles.boardMeta}>{b.updatedAt}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
