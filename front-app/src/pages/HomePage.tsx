import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Cpu, LayoutGrid, Building2, ExternalLink, Trash2 } from 'lucide-react';
import { useWorkspace } from '../hooks/useWorkspaceStore';
import { Modal } from '../components/workspace/Modal';
import ws from '../components/workspace/ws.module.css';
import styles from './HomePage.module.css';

export function HomePage() {
  const navigate = useNavigate();
  const init = useWorkspace((s) => s.init);

  const [boardModalOpen, setBoardModalOpen] = useState(false);
  const [orgModalOpen, setOrgModalOpen] = useState(false);

  // Load known orgs from API on mount
  useEffect(() => { init(); }, [init]);

  return (
    <div className={styles.page}>
      <header className={styles.topnav}>
        <div className={styles.logo}>
          <Cpu size={18} color="var(--accent-blue)" />
          <span>Graph to Code</span>
        </div>
      </header>

      <main className={styles.main}>
        {/* ── Personal Boards ── */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitle}>
              <LayoutGrid size={14} />
              <h2>My boards</h2>
            </div>
            <button className={ws.btnPrimary} onClick={() => setBoardModalOpen(true)}>
              <Plus size={13} /> New board
            </button>
          </div>
          <BoardsGrid onNew={() => setBoardModalOpen(true)} />
        </section>

        {/* ── Organizations ── */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitle}>
              <Building2 size={14} />
              <h2>Organizations</h2>
            </div>
            <button className={ws.btnPrimary} onClick={() => setOrgModalOpen(true)}>
              <Plus size={13} /> New org
            </button>
          </div>
          <OrgsList onNew={() => setOrgModalOpen(true)} />
        </section>
      </main>

      <CreateBoardModal
        open={boardModalOpen}
        onClose={() => setBoardModalOpen(false)}
        onCreated={(boardId) => navigate(`/boards/${boardId}`)}
      />

      <CreateOrgModal
        open={orgModalOpen}
        onClose={() => setOrgModalOpen(false)}
        onCreated={(orgId) => navigate(`/org/${orgId}`)}
      />
    </div>
  );
}

// ── Boards grid ────────────────────────────────────────────────────────────────

function BoardsGrid({ onNew }: { onNew: () => void }) {
  const navigate  = useNavigate();
  const boardIds  = useWorkspace((s) => s.boardIds);
  const boards    = useWorkspace((s) => s.boards);
  const removeBoard = useWorkspace((s) => s.removeBoard);

  if (boardIds.length === 0) {
    return (
      <div className={styles.emptyCard} onClick={onNew}>
        <Plus size={20} />
        <span>Create your first board</span>
      </div>
    );
  }

  return (
    <div className={styles.boardGrid}>
      {boardIds.map((id) => {
        const board = boards[id];
        return (
          <div key={id} className={styles.boardCard}>
            <button
              className={styles.boardPreview}
              onClick={() => navigate(`/boards/${id}`)}
              title="Open board"
            >
              <div className={styles.boardPreviewDots} />
            </button>
            <div className={styles.boardFooter}>
              <div className={styles.boardInfo}>
                <span className={styles.boardName}>{board?.name ?? id}</span>
                {board?.created_at && (
                  <span className={styles.boardMeta}>
                    {new Date(board.created_at).toLocaleDateString()}
                  </span>
                )}
              </div>
              <div className={styles.boardActions}>
                <button
                  className={styles.boardActionBtn}
                  onClick={() => navigate(`/boards/${id}`)}
                  title="Open"
                >
                  <ExternalLink size={12} />
                </button>
                <button
                  className={`${styles.boardActionBtn} ${styles.boardDeleteBtn}`}
                  onClick={() => removeBoard(id)}
                  title="Remove from list"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          </div>
        );
      })}

      <button className={styles.newBoardCard} onClick={onNew}>
        <Plus size={18} />
        <span>New board</span>
      </button>
    </div>
  );
}

// ── Orgs list ─────────────────────────────────────────────────────────────────

function OrgsList({ onNew }: { onNew: () => void }) {
  const navigate = useNavigate();
  const orgIds   = useWorkspace((s) => s.orgIds);
  const orgs     = useWorkspace((s) => s.orgs);

  if (orgIds.length === 0) {
    return (
      <div className={styles.emptyCard} onClick={onNew}>
        <Building2 size={20} />
        <span>Create your first organisation</span>
      </div>
    );
  }

  return (
    <div className={styles.orgList}>
      {orgIds.map((id) => {
        const org = orgs[id];
        return (
          <button
            key={id}
            className={styles.orgRow}
            onClick={() => navigate(`/org/${id}`)}
          >
            <div className={styles.orgAvatar}>
              {(org?.name ?? id)[0].toUpperCase()}
            </div>
            <div className={styles.orgRowInfo}>
              <span className={styles.orgRowName}>{org?.name ?? id}</span>
              {org?.description && (
                <span className={styles.orgRowDesc}>{org.description}</span>
              )}
            </div>
            <span className={styles.orgRowSlug}>/{org?.slug ?? id}</span>
            <ExternalLink size={13} className={styles.orgRowArrow} />
          </button>
        );
      })}
    </div>
  );
}

// ── Modals ────────────────────────────────────────────────────────────────────

function CreateBoardModal({
  open, onClose, onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const createBoard = useWorkspace((s) => s.createBoard);
  const [name, setName]             = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'private'>('private');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true); setError('');
    try {
      const board = await createBoard({
        name: name.trim(),
        visibility,
        description: description.trim() || undefined,
      });
      setName(''); setDescription(''); setVisibility('private');
      onCreated(board.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create board');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New board" width={440}>
      <form onSubmit={handleSubmit}>
        {error && <div className={ws.errorBanner}>{error}</div>}
        <div className={ws.formField}>
          <label className={ws.label}>Board name</label>
          <input
            className={ws.input}
            placeholder="e.g. E-Commerce Platform"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            required
          />
        </div>
        <div className={ws.formField}>
          <label className={ws.label}>Description (optional)</label>
          <textarea
            className={ws.textarea}
            placeholder="What is this architecture for?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className={ws.formField}>
          <label className={ws.label}>Visibility</label>
          <select
            className={ws.select}
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as 'public' | 'private')}
          >
            <option value="private">Private — only you</option>
            <option value="public">Public — anyone with the link</option>
          </select>
        </div>
        <div className={ws.actions}>
          <button type="button" className={ws.btnSecondary} onClick={onClose}>Cancel</button>
          <button type="submit" className={ws.btnPrimary} disabled={loading || !name.trim()}>
            {loading ? 'Creating…' : 'Create board'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function CreateOrgModal({
  open, onClose, onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const createOrg = useWorkspace((s) => s.createOrg);
  const [name, setName]   = useState('');
  const [slug, setSlug]   = useState('');
  const [desc, setDesc]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function slugify(val: string) {
    return val.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;
    setLoading(true); setError('');
    try {
      const org = await createOrg(name.trim(), slug.trim(), desc.trim() || undefined);
      setName(''); setSlug(''); setDesc('');
      onCreated(org.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create organisation');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New organisation" width={460}>
      <form onSubmit={handleSubmit}>
        {error && <div className={ws.errorBanner}>{error}</div>}
        <div className={ws.formField}>
          <label className={ws.label}>Organisation name</label>
          <input
            className={ws.input}
            placeholder="e.g. Acme Corp"
            value={name}
            onChange={(e) => { setName(e.target.value); if (!slug) setSlug(slugify(e.target.value)); }}
            autoFocus
          />
        </div>
        <div className={ws.formField}>
          <label className={ws.label}>Slug</label>
          <input
            className={ws.input}
            placeholder="acme-corp"
            value={slug}
            onChange={(e) => setSlug(slugify(e.target.value))}
          />
        </div>
        <div className={ws.formField}>
          <label className={ws.label}>Description (optional)</label>
          <textarea
            className={ws.textarea}
            placeholder="What does this organisation build?"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
        </div>
        <div className={ws.actions}>
          <button type="button" className={ws.btnSecondary} onClick={onClose}>Cancel</button>
          <button type="submit" className={ws.btnPrimary} disabled={loading || !name || !slug}>
            {loading ? 'Creating…' : 'Create organisation'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
