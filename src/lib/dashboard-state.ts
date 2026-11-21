import { useCallback, useState } from "react";

const DASHBOARD_TABS = ["history", "tools", "watchlist", "radar", "referral", "billing"] as const;
export type DashboardTab = typeof DASHBOARD_TABS[number];

function isDashboardTab(value: unknown): value is DashboardTab {
  return typeof value === "string" && DASHBOARD_TABS.some((tab) => tab === value);
}

function restoreTab(key: string | null, search: string, hash: string): DashboardTab {
  const params = new URLSearchParams(search);
  const explicit = params.get("tab");
  if (isDashboardTab(explicit)) return explicit;
  const anchor = hash.replace(/^#/, "");
  if (isDashboardTab(anchor)) return anchor;
  // Restoring the receipt panel never opens checkout or initiates a payment.
  if (params.get("paid_inv")) return "billing";
  try {
    const saved = key ? window.localStorage.getItem(key) : null;
    if (isDashboardTab(saved)) return saved;
  } catch { /* Denied storage must not prevent navigation. */ }
  return "history";
}

/** Persist only the panel name, never inputs, results or credentials. */
export function useDashboardTab(userId?: string, search = "", hash = "") {
  const key = userId ? `boris_dashboard_tab:v1:${encodeURIComponent(userId)}` : null;
  const [selection, setSelection] = useState(() => ({ key, search, hash, tab: restoreTab(key, search, hash) }));
  let tab = selection.tab;
  if (selection.key !== key || selection.search !== search || selection.hash !== hash) {
    // Reset before committing: never save the old user's panel under the new identity.
    tab = restoreTab(key, search, hash);
    setSelection({ key, search, hash, tab });
  }
  const selectTab = useCallback((next: DashboardTab) => {
    if (!isDashboardTab(next)) return;
    setSelection({ key, search, hash, tab: next });
    try {
      if (key) window.localStorage.setItem(key, next);
    } catch { /* In-memory selection works when storage is unavailable. */ }
  }, [key, search, hash]);
  return [tab, selectTab] as const;
}
