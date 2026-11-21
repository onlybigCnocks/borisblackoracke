import { useEffect, useRef, useState } from "react";
import { authHeaders } from "@/lib/auth";

const API = import.meta.env.VITE_API_URL || "https://api.black-oracle.com";
const KEYS = { zk: "zk_mass_scanner", soroban: "soroban_radar", contracts: "explorer_contracts", defillama: "defillama_radar" } as const;
export type ControlledRadar = keyof typeof KEYS;
type Telemetry = { running?: boolean | null; total_verifiers?: number; alerts_total?: number; watchlist_monitored?: number; archetypes_classified?: number; total_contracts?: number; total_protocols?: number; by_chain?: Record<string, number> };

async function request(path: string, signal: AbortSignal, body?: object) {
  const response = await fetch(`${API}/api/tools/${path}`, {
    method: body ? "POST" : "GET", signal,
    headers: { ...authHeaders(), ...(body ? { "Content-Type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json();
  if (!response.ok || (body && data.ok !== true) || (!body && !data.daemons)) throw new Error(data.detail || data.error || `HTTP ${response.status}`);
  return data;
}

export default function RadarDaemonDeck({ radar, isRu, onChain }: { radar: ControlledRadar; isRu: boolean; onChain: (chain: string) => void }) {
  const [data, setData] = useState<Telemetry | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const current = useRef<AbortController | null>(null);
  const serial = useRef(0);
  const controlling = useRef(false);

  const refresh = async () => {
    if (controlling.current) return;
    current.current?.abort();
    const controller = new AbortController(); current.current = controller;
    const generation = ++serial.current;
    const timer = window.setTimeout(() => controller.abort(), 15000);
    try {
      const result = await request("radars/status", controller.signal);
      const telemetry = result.daemons?.[KEYS[radar]];
      if (!telemetry || typeof telemetry.running !== "boolean") throw new Error(isRu ? "Статус процесса неизвестен. Управление временно недоступно." : "Process state unknown. Controls temporarily unavailable.");
      if (generation !== serial.current) return;
      setData(telemetry); setError(""); setCheckedAt(new Date().toLocaleTimeString());
    } catch (e) {
      if (generation !== serial.current) return;
      setData(null); setError(e instanceof Error ? e.message : String(e));
    } finally { window.clearTimeout(timer); }
  };

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => { if (!document.hidden) void refresh(); }, 30000);
    return () => { ++serial.current; current.current?.abort(); window.clearInterval(timer); };
  }, [radar]);

  const control = async () => {
    if (controlling.current || typeof data?.running !== "boolean") return;
    controlling.current = true; setBusy(true); setError("");
    ++serial.current; current.current?.abort();
    const generation = serial.current;
    const controller = new AbortController(); current.current = controller;
    const timer = window.setTimeout(() => controller.abort(), 30000);
    try {
      const expected = !data.running;
      await request("radars/control", controller.signal, { radar, action: expected ? "start" : "stop" });
      const result = await request("radars/status", controller.signal);
      const telemetry = result.daemons?.[KEYS[radar]];
      if (typeof telemetry?.running !== "boolean" || telemetry.running !== expected) throw new Error(isRu ? "Сервер не подтвердил изменение состояния" : "Server did not confirm the state change");
      if (generation !== serial.current) return;
      setData(telemetry); setCheckedAt(new Date().toLocaleTimeString());
    } catch (e) {
      if (generation !== serial.current) return;
      setData(null); setError(e instanceof Error ? e.message : String(e));
    } finally { window.clearTimeout(timer); controlling.current = false; if (generation === serial.current) setBusy(false); }
  };

  const titles = { zk: "ZK Radar", soroban: "Stellar / Soroban", contracts: "Verified Contracts", defillama: "Protocol Radar" };
  const metrics: [string, number | undefined][] = radar === "soroban" ? [
    [isRu ? "Наблюдаемые активы" : "Monitored assets", data?.watchlist_monitored],
    [isRu ? "Архетипы" : "Archetypes", data?.archetypes_classified],
    [isRu ? "Алерты" : "Alerts", data?.alerts_total],
  ] : [[isRu ? "В реестре" : "Indexed", radar === "zk" ? data?.total_verifiers : radar === "contracts" ? data?.total_contracts : data?.total_protocols]];
  const chains = Object.entries(data?.by_chain || {}).filter(([, count]) => Number.isFinite(count) && count >= 0).sort((a,b) => b[1]-a[1]);
  const max = Math.max(1, ...chains.map(([, count]) => count));
  return <section aria-label={`${titles[radar]} control`} className="rounded-xl border border-primary/35 bg-card p-4 space-y-3 font-mono">
    <div className="flex flex-wrap justify-between items-center gap-3">
      <div><h3 className="text-sm font-bold text-primary">{titles[radar]} · LIVE CONTROL</h3><p className="text-xs text-muted-foreground">{isRu ? "Состояние процесса, не гарантия успешного сканирования" : "Process state, not proof of scanning progress"}</p></div>
      <div className="flex gap-2">
        <button type="button" disabled={busy || typeof data?.running !== "boolean"} onClick={() => void control()} className="rounded-lg border border-primary px-3 py-2 text-xs text-primary disabled:opacity-50">
          {busy ? (isRu ? "Проверка…" : "Checking…") : typeof data?.running !== "boolean" ? (isRu ? "Статус неизвестен" : "State unknown") : data.running ? (isRu ? "● Работает · Стоп" : "● Running · Stop") : (isRu ? "○ Пауза · Старт" : "○ Paused · Start")}
        </button>
        <button type="button" disabled={busy} onClick={() => void refresh()} className="rounded-lg border border-border px-3 py-2 text-xs disabled:opacity-50">{isRu ? "Обновить статус" : "Refresh status"}</button>
      </div>
    </div>
    {error && <p role="alert" className="text-xs text-destructive">⚠ {error}</p>}
    <div className="flex flex-wrap gap-3">{metrics.map(([label, value]) => <div key={label} className="rounded-lg border border-border px-3 py-2"><div className="text-[10px] text-muted-foreground">{label}</div><strong className="text-lg">{typeof value === "number" ? value.toLocaleString() : "—"}</strong></div>)}</div>
    {chains.length > 0 && <div className="grid gap-2 sm:grid-cols-2">{chains.map(([chain, count]) => <button type="button" key={chain} onClick={() => onChain(chain)} className="text-left rounded-lg border border-border px-3 py-2 hover:border-primary">
      <span className="flex justify-between text-xs"><span>{chain}</span><span>{count.toLocaleString()}</span></span>
      <span className="block mt-2 h-1.5 rounded bg-muted"><span className="block h-full rounded bg-primary transition-all duration-500 motion-reduce:transition-none" style={{width:`${count / max * 100}%`}} /></span>
    </button>)}</div>}
    <p className="text-[10px] text-muted-foreground">{checkedAt ? `${isRu ? "Проверено" : "Checked"}: ${checkedAt} · ` : ""}{isRu ? "Обновление каждые 30 с. Нет данных — не ноль. Наблюдение не означает безопасность." : "Refresh every 30s. Missing data is not zero. Monitoring does not imply safety."}</p>
  </section>;
}
