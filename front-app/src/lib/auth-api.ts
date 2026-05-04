const BASE = '/auth-api/v1/auth';

export interface AuthResponse {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
}

export interface UserInfo {
  id: string;
  email: string;
  name?: string;
}

async function post<T>(path: string, body: unknown, token?: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data as { error?: string; message?: string }).error
      ?? (data as { error?: string; message?: string }).message
      ?? `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data as T;
}

export const authApi = {
  register: (email: string, password: string) =>
    post<AuthResponse>('/register', { email, password }),

  login: (email: string, password: string) =>
    post<AuthResponse>('/login', { email, password }),

  logout: (token: string) =>
    post<void>('/logout', {}, token),

  refresh: (refreshToken: string) =>
    post<AuthResponse>('/refresh', { refresh_token: refreshToken }),

  googleLoginUrl: () => {
    const callback = `${window.location.origin}/auth/callback`;
    return `${BASE}/oauth/google?redirect_uri=${encodeURIComponent(callback)}`;
  },
};

// ── Token helpers ─────────────────────────────────────────────────────────────

export function saveTokens(res: AuthResponse) {
  localStorage.setItem('auth_token', res.access_token);
  if (res.refresh_token) localStorage.setItem('refresh_token', res.refresh_token);
}

export function clearTokens() {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('refresh_token');
}

export function getToken(): string | null {
  return localStorage.getItem('auth_token');
}
