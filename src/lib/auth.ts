const API_BASE = import.meta.env.VITE_API_URL || "https://api.black-oracle.com";

export const LS_AUTH_TOKEN = "boris_auth_token";
export const LS_AUTH_USER = "boris_auth_user";

export interface BorisUser {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  tier: "GUEST" | "RADAR" | "RAW" | "BLACKBOX" | string;
  api_key: string;
  scans_total: number;
  auth_provider: "email" | "google";
  created_at: number;
}

export interface BorisScanRecord {
  task_id: string;
  target: string;
  project?: string;
  verdict?: string;
  patterns_total: number;
  patterns_critical: number;
  patterns_high: number;
  created_at: number;
}

export function getSavedToken(): string | null {
  return localStorage.getItem(LS_AUTH_TOKEN);
}

export function getSavedUser(): BorisUser | null {
  try {
    const raw = localStorage.getItem(LS_AUTH_USER);
    return raw ? (JSON.parse(raw) as BorisUser) : null;
  } catch {
    return null;
  }
}

export function saveAuthSession(token: string, user: BorisUser) {
  localStorage.setItem(LS_AUTH_TOKEN, token);
  localStorage.setItem(LS_AUTH_USER, JSON.stringify(user));
  window.dispatchEvent(new Event("boris-auth-change"));
}

export function clearAuthSession() {
  localStorage.removeItem(LS_AUTH_TOKEN);
  localStorage.removeItem(LS_AUTH_USER);
  window.dispatchEvent(new Event("boris-auth-change"));
}

export async function apiRegister(email: string, password: string, name?: string) {
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || "Registration failed");
  }
  saveAuthSession(data.token, data.user);
  return data as { token: string; user: BorisUser };
}

export async function apiLogin(email: string, password: string) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || "Invalid credentials");
  }
  saveAuthSession(data.token, data.user);
  return data as { token: string; user: BorisUser };
}

export async function apiGoogleAuth(payload: { credential?: string; access_token?: string }) {
  const res = await fetch(`${API_BASE}/api/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || "Google authentication failed");
  }
  saveAuthSession(data.token, data.user);
  return data as { token: string; user: BorisUser };
}

export async function apiGetMe(): Promise<{ user: BorisUser; scans: BorisScanRecord[] }> {
  const token = getSavedToken();
  if (!token) throw new Error("Not authenticated");
  const res = await fetch(`${API_BASE}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) {
    clearAuthSession();
    throw new Error("Session expired");
  }
  if (!res.ok) throw new Error("Failed to fetch cabinet profile");
  const data = await res.json();
  if (data.user) {
    localStorage.setItem(LS_AUTH_USER, JSON.stringify(data.user));
  }
  return data;
}

export async function apiRotateKey(): Promise<string> {
  const token = getSavedToken();
  if (!token) throw new Error("Not authenticated");
  const res = await fetch(`${API_BASE}/api/auth/rotate-key`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to rotate key");
  const data = await res.json();
  const current = getSavedUser();
  if (current && data.api_key) {
    saveAuthSession(token, { ...current, api_key: data.api_key });
  }
  return data.api_key;
}
