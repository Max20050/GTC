import { create } from 'zustand';
import {
  orgApi, teamApi, boardApi,
  type Org, type OrgMember, type Team, type TeamMember, type PersonalBoard, type CreateBoardInput,
} from '../lib/workspace-api';

// ── Local persistence helpers ─────────────────────────────────────────────────

const LS_BOARD_IDS = 'gtc_board_ids';
const LS_ORG_IDS   = 'gtc_org_ids';

function loadIds(key: string): string[] {
  try { return JSON.parse(localStorage.getItem(key) ?? '[]') as string[]; }
  catch { return []; }
}

function saveIds(key: string, ids: string[]) {
  localStorage.setItem(key, JSON.stringify(ids));
}

// ── Store types ───────────────────────────────────────────────────────────────

interface WorkspaceStore {
  // Personal boards
  boardIds: string[];
  boards: Record<string, PersonalBoard>;
  boardsLoading: boolean;
  createBoard: (input: CreateBoardInput) => Promise<PersonalBoard>;
  removeBoard: (id: string) => void;

  // Orgs
  orgIds: string[];
  orgs: Record<string, Org>;
  orgsLoading: boolean;
  fetchOrg: (orgId: string) => Promise<void>;
  createOrg: (name: string, slug: string, description?: string) => Promise<Org>;
  updateOrg: (orgId: string, data: Partial<{ name: string; description: string }>) => Promise<void>;
  deleteOrg: (orgId: string) => Promise<void>;

  // Org members
  members: Record<string, OrgMember[]>;
  membersLoading: Record<string, boolean>;
  fetchMembers: (orgId: string) => Promise<void>;
  inviteMember: (orgId: string, email: string, role: string) => Promise<void>;
  updateMemberRole: (orgId: string, userId: string, role: string) => Promise<void>;
  removeMember: (orgId: string, userId: string) => Promise<void>;

  // Teams
  teams: Record<string, Team[]>;
  teamsLoading: Record<string, boolean>;
  fetchTeams: (orgId: string) => Promise<void>;
  createTeam: (orgId: string, name: string) => Promise<Team>;
  updateTeam: (orgId: string, teamId: string, data: Partial<{ name: string }>) => Promise<void>;
  deleteTeam: (orgId: string, teamId: string) => Promise<void>;

  // Team members
  teamMembers: Record<string, TeamMember[]>;
  teamMembersLoading: Record<string, boolean>;
  fetchTeamMembers: (orgId: string, teamId: string) => Promise<void>;
  addTeamMember: (orgId: string, teamId: string, userId: string) => Promise<void>;
  updateTeamMemberRole: (orgId: string, teamId: string, userId: string, role: string) => Promise<void>;
  removeTeamMember: (orgId: string, teamId: string, userId: string) => Promise<void>;

  // Init
  init: () => Promise<void>;
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useWorkspace = create<WorkspaceStore>((set, get) => ({
  boardIds: loadIds(LS_BOARD_IDS),
  boards: {},
  boardsLoading: false,

  createBoard: async (input) => {
    const board = await boardApi.createPersonal(input);
    set((s) => {
      const ids = [board.id, ...s.boardIds.filter((id) => id !== board.id)];
      saveIds(LS_BOARD_IDS, ids);
      return { boardIds: ids, boards: { ...s.boards, [board.id]: board } };
    });
    return board;
  },

  removeBoard: (id) => {
    set((s) => {
      const ids = s.boardIds.filter((i) => i !== id);
      saveIds(LS_BOARD_IDS, ids);
      const { [id]: _removed, ...rest } = s.boards;
      return { boardIds: ids, boards: rest };
    });
  },

  // ── Orgs ───────────────────────────────────────────────────────────────────

  orgIds: loadIds(LS_ORG_IDS),
  orgs: {},
  orgsLoading: false,

  fetchOrg: async (orgId) => {
    const org = await orgApi.get(orgId);
    set((s) => ({ orgs: { ...s.orgs, [orgId]: org } }));
  },

  createOrg: async (name, slug, description) => {
    const org = await orgApi.create({ name, slug, description });
    set((s) => {
      const ids = [org.id, ...s.orgIds.filter((id) => id !== org.id)];
      saveIds(LS_ORG_IDS, ids);
      return { orgIds: ids, orgs: { ...s.orgs, [org.id]: org } };
    });
    return org;
  },

  updateOrg: async (orgId, data) => {
    const updated = await orgApi.update(orgId, data);
    set((s) => ({ orgs: { ...s.orgs, [orgId]: updated } }));
  },

  deleteOrg: async (orgId) => {
    await orgApi.delete(orgId);
    set((s) => {
      const ids = s.orgIds.filter((id) => id !== orgId);
      saveIds(LS_ORG_IDS, ids);
      const { [orgId]: _removed, ...rest } = s.orgs;
      return { orgIds: ids, orgs: rest };
    });
  },

  // ── Org Members ────────────────────────────────────────────────────────────

  members: {},
  membersLoading: {},

  fetchMembers: async (orgId) => {
    set((s) => ({ membersLoading: { ...s.membersLoading, [orgId]: true } }));
    try {
      const list = await orgApi.listMembers(orgId);
      set((s) => ({ members: { ...s.members, [orgId]: list } }));
    } finally {
      set((s) => ({ membersLoading: { ...s.membersLoading, [orgId]: false } }));
    }
  },

  inviteMember: async (orgId, email, role) => {
    const member = await orgApi.inviteMember(orgId, { email, role });
    set((s) => ({
      members: { ...s.members, [orgId]: [...(s.members[orgId] ?? []), member] },
    }));
  },

  updateMemberRole: async (orgId, userId, role) => {
    await orgApi.updateMemberRole(orgId, userId, role);
    set((s) => ({
      members: {
        ...s.members,
        [orgId]: (s.members[orgId] ?? []).map((m) =>
          m.user_id === userId ? { ...m, role: role as OrgMember['role'] } : m
        ),
      },
    }));
  },

  removeMember: async (orgId, userId) => {
    await orgApi.removeMember(orgId, userId);
    set((s) => ({
      members: {
        ...s.members,
        [orgId]: (s.members[orgId] ?? []).filter((m) => m.user_id !== userId),
      },
    }));
  },

  // ── Teams ──────────────────────────────────────────────────────────────────

  teams: {},
  teamsLoading: {},

  fetchTeams: async (orgId) => {
    set((s) => ({ teamsLoading: { ...s.teamsLoading, [orgId]: true } }));
    try {
      const list = await teamApi.list(orgId);
      set((s) => ({ teams: { ...s.teams, [orgId]: list } }));
    } finally {
      set((s) => ({ teamsLoading: { ...s.teamsLoading, [orgId]: false } }));
    }
  },

  createTeam: async (orgId, name) => {
    const team = await teamApi.create(orgId, { name });
    set((s) => ({
      teams: { ...s.teams, [orgId]: [...(s.teams[orgId] ?? []), team] },
    }));
    return team;
  },

  updateTeam: async (orgId, teamId, data) => {
    const updated = await teamApi.update(orgId, teamId, data);
    set((s) => ({
      teams: {
        ...s.teams,
        [orgId]: (s.teams[orgId] ?? []).map((t) => (t.id === teamId ? updated : t)),
      },
    }));
  },

  deleteTeam: async (orgId, teamId) => {
    await teamApi.delete(orgId, teamId);
    set((s) => ({
      teams: {
        ...s.teams,
        [orgId]: (s.teams[orgId] ?? []).filter((t) => t.id !== teamId),
      },
      teamMembers: (() => {
        const key = `${orgId}:${teamId}`;
        const { [key]: _removed, ...rest } = s.teamMembers;
        return rest;
      })(),
    }));
  },

  // ── Team Members ───────────────────────────────────────────────────────────

  teamMembers: {},
  teamMembersLoading: {},

  fetchTeamMembers: async (orgId, teamId) => {
    const key = `${orgId}:${teamId}`;
    set((s) => ({ teamMembersLoading: { ...s.teamMembersLoading, [key]: true } }));
    try {
      const list = await teamApi.listMembers(orgId, teamId);
      set((s) => ({ teamMembers: { ...s.teamMembers, [key]: list } }));
    } finally {
      set((s) => ({ teamMembersLoading: { ...s.teamMembersLoading, [key]: false } }));
    }
  },

  addTeamMember: async (orgId, teamId, userId) => {
    const member = await teamApi.addMember(orgId, teamId, userId);
    const key = `${orgId}:${teamId}`;
    set((s) => ({
      teamMembers: {
        ...s.teamMembers,
        [key]: [...(s.teamMembers[key] ?? []), member],
      },
    }));
  },

  updateTeamMemberRole: async (orgId, teamId, userId, role) => {
    await teamApi.updateMemberRole(orgId, teamId, userId, role);
    const key = `${orgId}:${teamId}`;
    set((s) => ({
      teamMembers: {
        ...s.teamMembers,
        [key]: (s.teamMembers[key] ?? []).map((m) =>
          m.user_id === userId ? { ...m, role: role as TeamMember['role'] } : m
        ),
      },
    }));
  },

  removeTeamMember: async (orgId, teamId, userId) => {
    await teamApi.removeMember(orgId, teamId, userId);
    const key = `${orgId}:${teamId}`;
    set((s) => ({
      teamMembers: {
        ...s.teamMembers,
        [key]: (s.teamMembers[key] ?? []).filter((m) => m.user_id !== userId),
      },
    }));
  },

  // ── Init ──────────────────────────────────────────────────────────────────

  init: async () => {
    const { orgIds, fetchOrg } = get();
    await Promise.allSettled(orgIds.map(fetchOrg));
  },
}));
