import { useEffect } from "react";
import { authHeaders, getSavedToken, getSavedUser } from "./auth";
export const WATCH_CHAINS = ["ethereum", "bsc", "polygon", "arbitrum", "optimism", "base", "avalanche", "gnosis", "linea", "scroll", "mantle", "blast", "fantom", "celo", "zksync"];
export function normalizeWatchChain(chain?: string) {
 const key = (chain || "").toLowerCase();
 const aliases: Record<string, string> = { eth: "ethereum", mainnet: "ethereum", bnb: "bsc", matic: "polygon", arb: "arbitrum", opt: "optimism", avax: "avalanche", xdai: "gnosis", ftm: "fantom" };
 return WATCH_CHAINS.includes(aliases[key] || key) ? aliases[key] || key : "";
}
export function watchKind(target: string): WatchKind | undefined {
 const raw = target.trim();
 if (/^0x[0-9a-fA-F]{40}$/.test(raw)) return "contract";
 const repo = /^(?:https:\/\/github\.com\/)?([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+?)(?:\.git)?\/?$/.exec(raw);
 if (repo && !repo[1].includes("..")) return "repo";
}
export function canWatch(tier = getSavedUser()?.tier) { return ["RADAR", "RAW", "BLACKBOX"].includes(tier || ""); }
export function useWatchAuth(onChange: () => void) { useEffect(() => { window.addEventListener("boris-auth-change", onChange); return () => window.removeEventListener("boris-auth-change", onChange); }, [onChange]); }
const API_BASE = import.meta.env.VITE_API_URL || "https://api.black-oracle.com";
export type WatchKind = "repo" | "contract";
export interface WatchTarget { target: string; kind?: WatchKind; chain?: string; label?: string; monitor_holders?: boolean }
export interface WatchItem extends WatchTarget { id: number; interval_minutes: number; paused: boolean; last_verdict: string; last_checked_at?: number | string | null; last_changed_at?: number | string | null; last_error?: string | null }
export interface WatchEvent { id: number; target_id: number; event_type: string; title: string; created_at: number | string; details?: unknown }
export interface WatchSnapshot { watchlist: WatchItem[]; events: WatchEvent[] }
export const WATCH_INTERVALS = [5, 15, 30, 60, 180, 360, 720, 1440];
export async function watchRequest(method: string, body?: object, id?: number): Promise<WatchSnapshot> {
 if (!getSavedToken()) throw new Error("Not authenticated");
 const res = await fetch(`${API_BASE}/api/auth/watchlist${id === undefined ? "" : `/${id}`}`, {
  method, headers: { ...authHeaders(), "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}),
 });
 const data = await res.json().catch(() => null);
 if (!res.ok || data?.ok === false || data?.error || data?.status === "error" || !Array.isArray(data?.watchlist) || !Array.isArray(data?.events)) {
  throw new Error(typeof data?.detail === "string" ? data.detail : `Watchlist request failed (${res.status})`);
 }
 if (!data.watchlist.every((item: WatchItem) => item && Number.isInteger(item.id) && typeof item.target === "string" && (item.kind === "repo" || item.kind === "contract")) || !data.events.every((event: WatchEvent) => event && Number.isInteger(event.id) && Number.isInteger(event.target_id) && typeof event.title === "string" && typeof event.event_type === "string")) throw new Error("Invalid watchlist response");
 return data;
}
