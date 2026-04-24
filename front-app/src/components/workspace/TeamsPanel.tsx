import { useEffect, useState } from 'react';
import { Plus, Trash2, Users, ChevronRight, ChevronLeft, Pencil, UserPlus, ChevronDown } from 'lucide-react';
import { useWorkspace } from '../../hooks/useWorkspaceStore';
import { Modal } from './Modal';
import ws from './ws.module.css';
import styles from './TeamsPanel.module.css';
import type { Team, TeamMember } from '../../lib/workspace-api';

interface TeamsPanelProps {
  orgId: string;
}

export function TeamsPanel({ orgId }: TeamsPanelProps) {
  const teams        = useWorkspace((s) => s.teams[orgId] ?? []);
  const loading      = useWorkspace((s) => s.teamsLoading[orgId] ?? false);
  const fetchTeams   = useWorkspace((s) => s.fetchTeams);
  const createTeam   = useWorkspace((s) => s.createTeam);
  const deleteTeam   = useWorkspace((s) => s.deleteTeam);

  const [createOpen, setCreateOpen] = useState(false);
  const [activeTeam, setActiveTeam] = useState<Team | null>(null);

  useEffect(() => { fetchTeams(orgId); }, [orgId, fetchTeams]);

  if (activeTeam) {
    return (
      <TeamDetail
        orgId={orgId}
        team={activeTeam}
        onBack={() => setActiveTeam(null)}
      />
    );
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.count}>{teams.length} team{teams.length !== 1 ? 's' : ''}</span>
        <button className={ws.btnPrimary} onClick={() => setCreateOpen(true)}>
          <Plus size={13} /> New team
        </button>
      </div>

      {loading && <div className={styles.center}><span className={ws.spinner} /></div>}

      {!loading && teams.length === 0 && (
        <div className={ws.emptyState}>No teams yet. Create one to organize members.</div>
      )}

      <div className={styles.grid}>
        {teams.map((team) => (
          <TeamCard
            key={team.id}
            team={team}
            orgId={orgId}
            onClick={() => setActiveTeam(team)}
            onDelete={() => deleteTeam(orgId, team.id)}
          />
        ))}
      </div>

      <CreateTeamModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={(name) => createTeam(orgId, name).then(() => setCreateOpen(false))}
      />
    </div>
  );
}

function TeamCard({
  team, orgId, onClick, onDelete,
}: {
  team: Team;
  orgId: string;
  onClick: () => void;
  onDelete: () => void;
}) {
  const memberCount = useWorkspace((s) => s.teamMembers[`${orgId}:${team.id}`]?.length ?? null);

  return (
    <div className={styles.card}>
      <button className={styles.cardBody} onClick={onClick}>
        <div className={styles.cardIcon}><Users size={16} /></div>
        <div className={styles.cardInfo}>
          <span className={styles.cardName}>{team.name}</span>
          {memberCount !== null && (
            <span className={styles.cardMeta}>{memberCount} member{memberCount !== 1 ? 's' : ''}</span>
          )}
        </div>
        <ChevronRight size={14} className={styles.chevron} />
      </button>
      <button
        className={`${ws.btnIcon} ${styles.deleteBtn}`}
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        title="Delete team"
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}

function TeamDetail({
  orgId, team, onBack,
}: {
  orgId: string;
  team: Team;
  onBack: () => void;
}) {
  const updateTeam      = useWorkspace((s) => s.updateTeam);
  const teamMembers     = useWorkspace((s) => s.teamMembers[`${orgId}:${team.id}`] ?? []);
  const membersLoading  = useWorkspace((s) => s.teamMembersLoading[`${orgId}:${team.id}`] ?? false);
  const fetchTeamMembers  = useWorkspace((s) => s.fetchTeamMembers);
  const addTeamMember     = useWorkspace((s) => s.addTeamMember);
  const updateTeamMemberRole = useWorkspace((s) => s.updateTeamMemberRole);
  const removeTeamMember  = useWorkspace((s) => s.removeTeamMember);

  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(team.name);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => { fetchTeamMembers(orgId, team.id); }, [orgId, team.id, fetchTeamMembers]);

  function saveName() {
    if (nameVal.trim() && nameVal !== team.name) {
      updateTeam(orgId, team.id, { name: nameVal.trim() });
    }
    setEditingName(false);
  }

  return (
    <div className={styles.panel}>
      <div className={styles.detailHeader}>
        <button className={styles.backBtn} onClick={onBack}>
          <ChevronLeft size={14} /> Teams
        </button>
        <div className={styles.teamNameRow}>
          {editingName ? (
            <input
              className={`${ws.input} ${styles.nameInput}`}
              value={nameVal}
              onChange={(e) => setNameVal(e.target.value)}
              onBlur={saveName}
              onKeyDown={(e) => e.key === 'Enter' && saveName()}
              autoFocus
            />
          ) : (
            <>
              <h3 className={styles.teamName}>{team.name}</h3>
              <button className={ws.btnIcon} onClick={() => setEditingName(true)}>
                <Pencil size={12} />
              </button>
            </>
          )}
        </div>
      </div>

      <div className={styles.header}>
        <span className={styles.count}>{teamMembers.length} member{teamMembers.length !== 1 ? 's' : ''}</span>
        <button className={ws.btnPrimary} onClick={() => setAddOpen(true)}>
          <UserPlus size={13} /> Add member
        </button>
      </div>

      {membersLoading && <div className={styles.center}><span className={ws.spinner} /></div>}
      {!membersLoading && teamMembers.length === 0 && (
        <div className={ws.emptyState}>No members in this team yet.</div>
      )}

      {teamMembers.map((m) => (
        <TeamMemberRow
          key={m.user_id}
          member={m}
          onRoleChange={(role) => updateTeamMemberRole(orgId, team.id, m.user_id, role)}
          onRemove={() => removeTeamMember(orgId, team.id, m.user_id)}
        />
      ))}

      <AddTeamMemberModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={(userId) => addTeamMember(orgId, team.id, userId).then(() => setAddOpen(false))}
      />
    </div>
  );
}

function TeamMemberRow({
  member, onRoleChange, onRemove,
}: {
  member: TeamMember;
  onRoleChange: (role: string) => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <div className={styles.memberRow}>
      <div className={styles.avatar}>{(member.name ?? member.email ?? member.user_id)[0].toUpperCase()}</div>
      <div className={styles.memberInfo}>
        <span className={styles.memberName}>{member.name ?? member.email ?? member.user_id}</span>
        {member.email && member.name && <span className={styles.memberEmail}>{member.email}</span>}
      </div>
      {editing ? (
        <select
          className={`${ws.select} ${styles.roleSelect}`}
          defaultValue={member.role}
          autoFocus
          onBlur={(e) => { onRoleChange(e.target.value); setEditing(false); }}
          onChange={(e) => { onRoleChange(e.target.value); setEditing(false); }}
        >
          <option value="lead">lead</option>
          <option value="member">member</option>
        </select>
      ) : (
        <button
          className={`${ws.roleBadge} ${ws[member.role]} ${styles.roleBtn}`}
          onClick={() => setEditing(true)}
        >
          {member.role} <ChevronDown size={9} />
        </button>
      )}
      <button className={ws.btnIcon} onClick={onRemove} title="Remove from team">
        <Trash2 size={13} />
      </button>
    </div>
  );
}

function CreateTeamModal({
  open, onClose, onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true); setError('');
    try { await onSubmit(name.trim()); setName(''); }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed'); }
    finally { setLoading(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title="Create team">
      <form onSubmit={handleSubmit}>
        {error && <div className={ws.errorBanner}>{error}</div>}
        <div className={ws.formField}>
          <label className={ws.label}>Team name</label>
          <input
            className={ws.input}
            placeholder="e.g. Engineering"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>
        <div className={ws.actions}>
          <button type="button" className={ws.btnSecondary} onClick={onClose}>Cancel</button>
          <button type="submit" className={ws.btnPrimary} disabled={loading}>
            {loading ? 'Creating…' : 'Create team'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function AddTeamMemberModal({
  open, onClose, onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (userId: string) => Promise<void>;
}) {
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId.trim()) return;
    setLoading(true); setError('');
    try { await onSubmit(userId.trim()); setUserId(''); }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed'); }
    finally { setLoading(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add team member">
      <form onSubmit={handleSubmit}>
        {error && <div className={ws.errorBanner}>{error}</div>}
        <div className={ws.formField}>
          <label className={ws.label}>User ID</label>
          <input
            className={ws.input}
            placeholder="user_abc123"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            autoFocus
          />
        </div>
        <div className={ws.actions}>
          <button type="button" className={ws.btnSecondary} onClick={onClose}>Cancel</button>
          <button type="submit" className={ws.btnPrimary} disabled={loading}>
            {loading ? 'Adding…' : 'Add member'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
