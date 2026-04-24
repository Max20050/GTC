import { useEffect, useState } from 'react';
import { UserPlus, Trash2, ChevronDown } from 'lucide-react';
import { useWorkspace } from '../../hooks/useWorkspaceStore';
import { Modal } from './Modal';
import ws from './ws.module.css';
import styles from './MembersPanel.module.css';
import type { OrgMember } from '../../lib/workspace-api';

const ROLES: OrgMember['role'][] = ['owner', 'admin', 'member'];

interface MembersPanelProps {
  orgId: string;
}

export function MembersPanel({ orgId }: MembersPanelProps) {
  const members = useWorkspace((s) => s.members[orgId] ?? []);
  const loading  = useWorkspace((s) => s.membersLoading[orgId] ?? false);
  const fetchMembers    = useWorkspace((s) => s.fetchMembers);
  const inviteMember    = useWorkspace((s) => s.inviteMember);
  const updateMemberRole = useWorkspace((s) => s.updateMemberRole);
  const removeMember    = useWorkspace((s) => s.removeMember);

  const [inviteOpen, setInviteOpen] = useState(false);

  useEffect(() => { fetchMembers(orgId); }, [orgId, fetchMembers]);

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.count}>{members.length} member{members.length !== 1 ? 's' : ''}</span>
        <button className={ws.btnPrimary} onClick={() => setInviteOpen(true)}>
          <UserPlus size={13} /> Invite
        </button>
      </div>

      {loading && <div className={styles.center}><span className={ws.spinner} /></div>}

      {!loading && members.length === 0 && (
        <div className={ws.emptyState}>No members yet. Invite someone to get started.</div>
      )}

      {members.map((m) => (
        <MemberRow
          key={m.user_id}
          member={m}
          onRoleChange={(role) => updateMemberRole(orgId, m.user_id, role)}
          onRemove={() => removeMember(orgId, m.user_id)}
        />
      ))}

      <InviteModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onSubmit={(email, role) => inviteMember(orgId, email, role).then(() => setInviteOpen(false))}
      />
    </div>
  );
}

function MemberRow({
  member, onRoleChange, onRemove,
}: {
  member: OrgMember;
  onRoleChange: (role: string) => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <div className={styles.row}>
      <div className={styles.avatar}>{(member.name ?? member.email)[0].toUpperCase()}</div>
      <div className={styles.info}>
        <span className={styles.name}>{member.name ?? member.email}</span>
        {member.name && <span className={styles.email}>{member.email}</span>}
      </div>
      <div className={styles.roleWrapper}>
        {editing ? (
          <select
            className={`${ws.select} ${styles.roleSelect}`}
            defaultValue={member.role}
            autoFocus
            onBlur={(e) => { onRoleChange(e.target.value); setEditing(false); }}
            onChange={(e) => { onRoleChange(e.target.value); setEditing(false); }}
          >
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        ) : (
          <button
            className={`${ws.roleBadge} ${ws[member.role]} ${styles.roleBtn}`}
            onClick={() => setEditing(true)}
            title="Click to change role"
          >
            {member.role} <ChevronDown size={9} />
          </button>
        )}
      </div>
      <button className={ws.btnIcon} onClick={onRemove} title="Remove member">
        <Trash2 size={13} />
      </button>
    </div>
  );
}

function InviteModal({
  open, onClose, onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (email: string, role: string) => Promise<void>;
}) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true); setError('');
    try {
      await onSubmit(email.trim(), role);
      setEmail(''); setRole('member');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to invite');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Invite member">
      <form onSubmit={handleSubmit}>
        {error && <div className={ws.errorBanner}>{error}</div>}
        <div className={ws.formField}>
          <label className={ws.label}>Email address</label>
          <input
            className={ws.input}
            type="email"
            placeholder="colleague@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
          />
        </div>
        <div className={ws.formField}>
          <label className={ws.label}>Role</label>
          <select className={ws.select} value={role} onChange={(e) => setRole(e.target.value)}>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div className={ws.actions}>
          <button type="button" className={ws.btnSecondary} onClick={onClose}>Cancel</button>
          <button type="submit" className={ws.btnPrimary} disabled={loading}>
            {loading ? 'Inviting…' : 'Send invite'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
