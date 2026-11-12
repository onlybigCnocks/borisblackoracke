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
  scans_today?: number;
  daily_limit?: number;
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

export interface BorisWatchlistItem {
  id: number;
  target: string;
  label: string;
  alert_on_drift: number;
  last_verdict: string;
  created_at: number;
}

export interface BorisRadarAudit {
  address: string;
  chain: string;
  name: string;
  scan_date: string;
  risk_level: string;
  risk_score: number;
  findings_critical: number;
  findings_high: number;
  findings_medium: number;
  findings_low: number;
  findings_total: number;
}

export function getSavedToken(): string | null {
  return localStorage.getItem(LS_AUTH_TOKEN);
}

export function authHeaders(): Record<string, string> {
  const tk = getSavedToken();
  return tk ? { Authorization: `Bearer ${tk}` } : {};
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

export async function apiRegister(email: string, password: string, name?: string, ref?: string) {
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name, ref: ref || undefined }),
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

export async function apiGetMe(): Promise<{
  user: BorisUser;
  scans: BorisScanRecord[];
  watchlist?: BorisWatchlistItem[];
}> {
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

export async function apiGetArchivedScan(taskId: string) {
  const res = await fetch(`${API_BASE}/api/auth/scan/${taskId}`);
  if (!res.ok) throw new Error("Scan report not found");
  return res.json();
}

export function getScanExportUrl(taskId: string): string {
  return `${API_BASE}/api/auth/scan/${taskId}/export`;
}

export async function apiAddWatchlist(target: string, label?: string): Promise<BorisWatchlistItem[]> {
  const token = getSavedToken();
  if (!token) throw new Error("Not authenticated");
  const res = await fetch(`${API_BASE}/api/auth/watchlist`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
    },
    body: JSON.stringify({ target, label }),
  });
  if (!res.ok) throw new Error("Failed to add to watchlist");
  const data = await res.json();
  return data.watchlist || [];
}

export async function apiRemoveWatchlist(id: number): Promise<void> {
  const token = getSavedToken();
  if (!token) throw new Error("Not authenticated");
  await fetch(`${API_BASE}/api/auth/watchlist/${id}`, {
    method: "DELETE",
    headers: { Authorization: "Bearer " + token },
  });
}

export async function apiGetRadarFeed(): Promise<{ audits: BorisRadarAudit[]; market_signals: any[] }> {
  const res = await fetch(`${API_BASE}/api/auth/radar-feed`);
  if (!res.ok) return { audits: [], market_signals: [] };
  return res.json();
}

export interface BorisReferral {
  code: string;
  link: string;
  commission_rate: number;
  total_invited: number;
  paid_invited: number;
  pending_payout_usd: number;
  invited: Array<{ email: string; tier: string; status: string; created_at: number }>;
  tier: string;
}

export async function apiGetReferral(): Promise<BorisReferral | null> {
  const token = getSavedToken();
  if (!token) return null;
  const res = await fetch(`${API_BASE}/api/auth/referral`, {
    headers: { Authorization: "Bearer " + token },
  });
  if (!res.ok) return null;
  return res.json();
}

export async function apiBindReferral(code: string) {
  const token = getSavedToken();
  if (!token) throw new Error("Not authenticated");
  const res = await fetch(`${API_BASE}/api/auth/referral/bind`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
    body: JSON.stringify({ code }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || "Failed to bind referral code");
  return data;
}
