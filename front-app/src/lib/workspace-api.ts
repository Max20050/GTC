// Proxied through Vite: /ws → http://localhost:8080
const BASE = '/ws';

function authHeaders() {
  const token = localStorage.getItem('auth_token') ?? '';
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw Object.assign(new Error(body || `HTTP ${res.status}`), { status: res.status });
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface Org {
  id: string;
  name: string;
  slug: string;
  description?: string;
  created_at?: string;
}

export interface OrgMember {
  user_id: string;
  email: string;
  name?: string;
  role: 'owner' | 'admin' | 'member';
  joined_at?: string;
}

export interface Team {
  id: string;
  org_id: string;
  name: string;
  slug?: string;
  created_at?: string;
}

export interface TeamMember {
  user_id: string;
  email?: string;
  name?: string;
  role: 'lead' | 'member';
}

export type Visibility = 'public' | 'private';

export interface CreateBoardInput {
  name: string;
  visibility: Visibility;
  description?: string;
  thumbnail_url?: string;
}

export interface PersonalBoard {
  id: string;
  name: string;
  description?: string;
  visibility: Visibility;
  thumbnail_url?: string;
  owner_id?: string;
  created_at?: string;
}

// ── Orgs ─────────────────────────────────────────────────────────────────────

export const orgApi = {
  create: (data: { name: string; slug: string; description?: string }) =>
    request<Org>('/orgs', { method: 'POST', body: JSON.stringify(data) }),

  get: (orgId: string) =>
    request<Org>(`/orgs/${orgId}`),

  update: (orgId: string, data: Partial<{ name: string; description: string }>) =>
    request<Org>(`/orgs/${orgId}`, { method: 'PATCH', body: JSON.stringify(data) }),

  delete: (orgId: string) =>
    request<void>(`/orgs/${orgId}`, { method: 'DELETE' }),

  listMembers: (orgId: string) =>
    request<OrgMember[]>(`/orgs/${orgId}/members`),

  inviteMember: (orgId: string, data: { email: string; role: string }) =>
    request<OrgMember>(`/orgs/${orgId}/members`, { method: 'POST', body: JSON.stringify(data) }),

  updateMemberRole: (orgId: string, userId: string, role: string) =>
    request<OrgMember>(`/orgs/${orgId}/members/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),

  removeMember: (orgId: string, userId: string) =>
    request<void>(`/orgs/${orgId}/members/${userId}`, { method: 'DELETE' }),
};

// ── Teams ────────────────────────────────────────────────────────────────────

export const teamApi = {
  list: (orgId: string) =>
    request<Team[]>(`/orgs/${orgId}/teams`),

  create: (orgId: string, data: { name: string; slug?: string }) =>
    request<Team>(`/orgs/${orgId}/teams`, { method: 'POST', body: JSON.stringify(data) }),

  get: (orgId: string, teamId: string) =>
    request<Team>(`/orgs/${orgId}/teams/${teamId}`),

  update: (orgId: string, teamId: string, data: Partial<{ name: string }>) =>
    request<Team>(`/orgs/${orgId}/teams/${teamId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (orgId: string, teamId: string) =>
    request<void>(`/orgs/${orgId}/teams/${teamId}`, { method: 'DELETE' }),

  listMembers: (orgId: string, teamId: string) =>
    request<TeamMember[]>(`/orgs/${orgId}/teams/${teamId}/members`),

  addMember: (orgId: string, teamId: string, userId: string) =>
    request<TeamMember>(`/orgs/${orgId}/teams/${teamId}/members`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    }),

  updateMemberRole: (orgId: string, teamId: string, userId: string, role: string) =>
    request<TeamMember>(`/orgs/${orgId}/teams/${teamId}/members/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),

  removeMember: (orgId: string, teamId: string, userId: string) =>
    request<void>(`/orgs/${orgId}/teams/${teamId}/members/${userId}`, { method: 'DELETE' }),
};

// ── Boards ───────────────────────────────────────────────────────────────────

export const boardApi = {
  createPersonal: (input: CreateBoardInput) =>
    request<PersonalBoard>('/boards', { method: 'POST', body: JSON.stringify(input) }),
};
