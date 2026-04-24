import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Pencil, Trash2, Users, GitBranch } from 'lucide-react';
import { useWorkspace } from '../hooks/useWorkspaceStore';
import { MembersPanel } from '../components/workspace/MembersPanel';
import { TeamsPanel } from '../components/workspace/TeamsPanel';
import { Modal } from '../components/workspace/Modal';
import ws from '../components/workspace/ws.module.css';
import styles from './OrgPage.module.css';

type Tab = 'teams' | 'members';

export function OrgPage() {
  const { orgId = '' } = useParams<{ orgId: string }>();
  const navigate = useNavigate();

  const org         = useWorkspace((s) => s.orgs[orgId]);
  const fetchOrg    = useWorkspace((s) => s.fetchOrg);
  const updateOrg   = useWorkspace((s) => s.updateOrg);
  const deleteOrg   = useWorkspace((s) => s.deleteOrg);

  const [tab, setTab]           = useState<Tab>('teams');
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    fetchOrg(orgId).catch((err: unknown) =>
      setLoadError(err instanceof Error ? err.message : 'Failed to load org')
    );
  }, [orgId, fetchOrg]);

  if (loadError) {
    return (
      <div className={styles.page}>
        <div className={styles.errorCenter}>
          <p className={styles.errorText}>{loadError}</p>
          <Link to="/home" className={ws.btnSecondary}>← Back to home</Link>
        </div>
      </div>
    );
  }

  if (!org) {
    return (
      <div className={styles.page}>
        <div className={styles.errorCenter}><span className={ws.spinner} /></div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Top nav */}
      <header className={styles.topnav}>
        <Link to="/home" className={styles.backLink}>
          <ArrowLeft size={14} /> Home
        </Link>
      </header>

      <div className={styles.content}>
        {/* Org header */}
        <div className={styles.orgHeader}>
          <div className={styles.orgMeta}>
            <h1 className={styles.orgName}>{org.name}</h1>
            {org.description && <p className={styles.orgDesc}>{org.description}</p>}
            <span className={styles.orgSlug}>/{org.slug}</span>
          </div>
          <div className={styles.orgActions}>
            <button className={ws.btnSecondary} onClick={() => setEditOpen(true)}>
              <Pencil size={13} /> Edit
            </button>
            <button className={ws.btnDanger} onClick={() => setDeleteOpen(true)}>
              <Trash2 size={13} /> Delete
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${tab === 'teams' ? styles.tabActive : ''}`}
            onClick={() => setTab('teams')}
          >
            <GitBranch size={13} /> Teams
          </button>
          <button
            className={`${styles.tab} ${tab === 'members' ? styles.tabActive : ''}`}
            onClick={() => setTab('members')}
          >
            <Users size={13} /> Members
          </button>
        </div>

        {/* Panel */}
        <div className={styles.panel}>
          {tab === 'teams'   && <TeamsPanel orgId={orgId} />}
          {tab === 'members' && <MembersPanel orgId={orgId} />}
        </div>
      </div>

      {/* Edit modal */}
      <EditOrgModal
        open={editOpen}
        name={org.name}
        description={org.description ?? ''}
        onClose={() => setEditOpen(false)}
        onSubmit={(name, desc) =>
          updateOrg(orgId, { name, description: desc }).then(() => setEditOpen(false))
        }
      />

      {/* Delete confirmation */}
      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete organisation" width={380}>
        <p className={styles.confirmText}>
          This will permanently delete <strong>{org.name}</strong> and all its teams.
          This action cannot be undone.
        </p>
        <div className={ws.actions}>
          <button className={ws.btnSecondary} onClick={() => setDeleteOpen(false)}>Cancel</button>
          <button
            className={ws.btnDanger}
            onClick={() => deleteOrg(orgId).then(() => navigate('/home'))}
          >
            Delete organisation
          </button>
        </div>
      </Modal>
    </div>
  );
}

function EditOrgModal({
  open, name, description, onClose, onSubmit,
}: {
  open: boolean;
  name: string;
  description: string;
  onClose: () => void;
  onSubmit: (name: string, description: string) => Promise<void>;
}) {
  const [nameVal, setNameVal] = useState(name);
  const [descVal, setDescVal] = useState(description);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { setNameVal(name); setDescVal(description); }, [name, description]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nameVal.trim()) return;
    setLoading(true); setError('');
    try { await onSubmit(nameVal.trim(), descVal.trim()); }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to update'); }
    finally { setLoading(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit organisation">
      <form onSubmit={handleSubmit}>
        {error && <div className={ws.errorBanner}>{error}</div>}
        <div className={ws.formField}>
          <label className={ws.label}>Name</label>
          <input
            className={ws.input}
            value={nameVal}
            onChange={(e) => setNameVal(e.target.value)}
            autoFocus
          />
        </div>
        <div className={ws.formField}>
          <label className={ws.label}>Description</label>
          <textarea
            className={ws.textarea}
            value={descVal}
            onChange={(e) => setDescVal(e.target.value)}
          />
        </div>
        <div className={ws.actions}>
          <button type="button" className={ws.btnSecondary} onClick={onClose}>Cancel</button>
          <button type="submit" className={ws.btnPrimary} disabled={loading}>
            {loading ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
