import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Users,
  ArrowLeftRight,
  TrendingUp,
  ShieldCheck,
  GitCompare,
  Loader2,
  Lock,
  Search,
  AlertTriangle,
} from "lucide-react";
import { getSavedUser, authHeaders, type BorisUser } from "@/lib/auth";

const API_BASE = "https://api.black-oracle.com";

type ToolId = "holders" | "funds" | "market" | "zk" | "drift";

const TIER_RANK: Record<string, number> = { GUEST: 0, RADAR: 1, RAW: 2, BLACKBOX: 3 };

const ToolsPanel = () => {
  const { i18n } = useTranslation();
  const isRu = i18n.language === "ru";
  const user = getSavedUser() as BorisUser | null;
  const tier = (user?.tier || "GUEST").toUpperCase();
  const rank = TIER_RANK[tier] ?? 0;

  const [tool, setTool] = useState<ToolId>("holders");
  const [input1, setInput1] = useState("");
  const [input2, setInput2] = useState("");
  const [chain, setChain] = useState("ethereum");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const TOOLS: Array<{
    id: ToolId;
    labelRu: string;
    labelEn: string;
    icon: any;
    minRank: number;
    placeholder: string;
  }> = [
    { id: "holders", labelRu: "Холдеры и киты", labelEn: "Holders & Whales", icon: Users, minRank: 0, placeholder: "0xA0b86991...B48" },
    { id: "market", labelRu: "Рынок и деривативы", labelEn: "Market & Derivatives", icon: TrendingUp, minRank: 0, placeholder: "BTC / ETH / SOL / PEPE" },
    { id: "funds", labelRu: "Потоки средств 14д", labelEn: "Funds Flow 14d", icon: ArrowLeftRight, minRank: 1, placeholder: "0xA0b86991...B48" },
    { id: "drift", labelRu: "Audit Drift (2 скана)", labelEn: "Audit Drift Compare", icon: GitCompare, minRank: 1, placeholder: "old task_id" },
    { id: "zk", labelRu: "ZK / Groth16 аудит", labelEn: "ZK Groth16 Audit", icon: ShieldCheck, minRank: 2, placeholder: "0x... verifier" },
  ];

  const run = async () => {
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      let path = "";
      let body: any = {};
      if (tool === "holders") {
        path = "/api/tools/holders";
        body = { address: input1.trim(), chain };
      } else if (tool === "funds") {
        path = "/api/tools/funds-flow";
        body = { address: input1.trim(), chain, days: 14 };
      } else if (tool === "market") {
        path = "/api/tools/market";
        body = { symbol: input1.trim().toUpperCase() };
      } else if (tool === "zk") {
        path = "/api/tools/zk-audit";
        body = { address: input1.trim(), chain };
      } else {
        path = "/api/tools/drift-compare";
        body = { old_task_id: input1.trim(), new_task_id: input2.trim() };
      }

      const res = await fetch(`${API_BASE}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(body),
      });
      if (res.status === 403) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || (isRu ? "Этот инструмент недоступен на вашем тарифе." : "This tool is not available on your tier."));
      }
      if (res.status === 401) {
        throw new Error(isRu ? "Требуется вход в личный кабинет." : "Sign in required.");
      }
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || `HTTP ${res.status}`);
      }
      setResult(await res.json());
    } catch (e: any) {
      setError(e.message || "Error");
    } finally {
      setLoading(false);
    }
  };

  const active = TOOLS.find((t) => t.id === tool)!;
  const locked = rank < active.minRank;

  const fmt = (n: any, digits = 2) => {
    const v = Number(n);
    if (!isFinite(v)) return "—";
    if (Math.abs(v) >= 1e9) return (v / 1e9).toFixed(2) + "B";
    if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(2) + "M";
    if (Math.abs(v) >= 1e3) return (v / 1e3).toFixed(2) + "K";
    return v.toFixed(digits);
  };

  return (
    <div className="space-y-5">
      {/* Tool selector */}
      <div className="flex flex-wrap gap-2">
        {TOOLS.map((t) => {
          const Icon = t.icon;
          const isLocked = rank < t.minRank;
          return (
            <button
              key={t.id}
              onClick={() => {
                setTool(t.id);
                setResult(null);
                setError(null);
                setInput1("");
                setInput2("");
              }}
              className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 font-mono text-xs font-semibold transition-all ${
                tool === t.id
                  ? "bg-primary text-primary-foreground shadow"
                  : "border border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon size={14} />
              <span>{isRu ? t.labelRu : t.labelEn}</span>
              {isLocked && <Lock size={11} className="opacity-70" />}
            </button>
          );
        })}
      </div>

      {/* Input form */}
      {locked ? (
        <div className="rounded-xl border border-primary/35 bg-card p-8 text-center bg-radial-red">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/40 bg-primary/15 text-primary">
            <Lock size={22} />
          </div>
          <span className="rounded-full border border-primary/40 bg-primary/15 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-primary">
            {active.minRank === 2 ? "RAW / BLACKBOX REQUIRED" : "RADAR+ REQUIRED"}
          </span>
          <p className="mx-auto mt-3 max-w-md font-mono text-xs text-muted-foreground">
            {isRu
              ? `Инструмент «${active.labelRu}» доступен начиная с тарифа ${active.minRank === 2 ? "RAW" : "RADAR"}.`
              : `"${active.labelEn}" requires ${active.minRank === 2 ? "RAW" : "RADAR"} tier or higher.`}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <input
              value={input1}
              onChange={(e) => setInput1(e.target.value)}
              placeholder={active.placeholder}
              className={`rounded-xl border border-border bg-background px-4 py-3 font-mono text-xs text-foreground outline-none focus:border-primary ${
                tool === "drift" ? "sm:col-span-2" : "sm:col-span-2"
              }`}
            />
            {tool === "drift" ? (
              <input
                value={input2}
                onChange={(e) => setInput2(e.target.value)}
                placeholder="new task_id"
                className="rounded-xl border border-border bg-background px-4 py-3 font-mono text-xs text-foreground outline-none focus:border-primary"
              />
            ) : tool === "market" ? (
              <div className="rounded-xl border border-border bg-background/60 px-4 py-3 font-mono text-xs text-muted-foreground">
                {isRu ? "Тикер монеты" : "Coin ticker"}
              </div>
            ) : (
              <select
                value={chain}
                onChange={(e) => setChain(e.target.value)}
                className="rounded-xl border border-border bg-background px-3 py-3 font-mono text-xs text-foreground outline-none focus:border-primary"
              >
                {["ethereum", "bsc", "polygon", "arbitrum", "base", "optimism"].map((c) => (
                  <option key={c} value={c}>
                    {c.toUpperCase()}
                  </option>
                ))}
              </select>
            )}
            <button
              onClick={run}
              disabled={loading || !input1}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-mono text-xs font-semibold text-primary-foreground transition-all hover:bg-primary-dim disabled:opacity-40 btn-glow"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              <span>{loading ? (isRu ? "Считаю…" : "Running…") : isRu ? "Запустить" : "Run"}</span>
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-4 font-mono text-xs text-destructive">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* RESULTS */}
      {result && tool === "market" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { k: isRu ? "Цена" : "Price", v: `$${fmt(result.snapshot?.price_usd)}` },
              { k: "24h", v: `${Number(result.snapshot?.price_change_24h ?? 0).toFixed(2)}%` },
              { k: "Volume 24h", v: `$${fmt(result.snapshot?.volume_24h)}` },
              { k: isRu ? "Капитализация" : "Market Cap", v: `$${fmt(result.snapshot?.market_cap)}` },
              { k: "Open Interest", v: `$${fmt(result.snapshot?.oi_usdt)}` },
              { k: "ΔOI 24h", v: `${Number(result.snapshot?.oi_change_24h_pct ?? 0).toFixed(2)}%` },
              { k: "Funding", v: `${(Number(result.snapshot?.funding_rate ?? 0) * 100).toFixed(4)}%` },
              { k: "Long/Short", v: fmt(result.snapshot?.long_short_ratio) },
            ].map((c, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-4">
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{c.k}</p>
                <p className="mt-1 font-mono text-lg font-bold text-foreground">{c.v}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-center gap-3">
              <span className={`rounded-full px-3 py-1 font-mono text-xs font-bold ${
                result.level === "CRITICAL" || result.level === "HIGH"
                  ? "bg-destructive/20 text-destructive border border-destructive/40"
                  : "bg-primary/15 text-primary border border-primary/40"
              }`}>
                {result.level} · {result.score}/100
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                Organic: {result.organic_probability}% · Crowd: {result.crowd_overcrowding}
              </span>
              {result.github_repo && (
                <span className="font-mono text-xs text-primary">gh: {result.github_repo}</span>
              )}
            </div>
            <p className="mt-3 font-mono text-xs text-foreground">{result.conclusion}</p>
            {result.signals?.length > 0 && (
              <div className="mt-4 space-y-2">
                {result.signals.map((s: any, i: number) => (
                  <div key={i} className="rounded-lg border border-border bg-background p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-mono text-xs font-bold text-foreground">{s.name}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">{s.category} · {s.score}</span>
                    </div>
                    <p className="mt-1 font-mono text-[11px] text-muted-foreground">{s.detail}</p>
                  </div>
                ))}
                {result.signals_total > result.signals.length && (
                  <p className="font-mono text-[11px] text-primary">
                    +{result.signals_total - result.signals.length} {isRu ? "сигналов скрыто (нужен тир выше)" : "more signals hidden (higher tier)"}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {result && tool === "holders" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { k: isRu ? "Всего холдеров" : "Total Holders", v: fmt(result.total_holders, 0) },
              { k: "Top-10", v: `${result.top10_pct}%` },
              { k: "Top-10 real", v: `${result.top10_real_pct}%` },
              { k: "Whales", v: `${result.whale_pct}%` },
            ].map((c, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-4">
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{c.k}</p>
                <p className="mt-1 font-mono text-lg font-bold text-foreground">{c.v}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className={`rounded-full px-3 py-1 font-mono text-xs font-bold border ${
                result.centralization_risk === "CRITICAL" || result.centralization_risk === "HIGH"
                  ? "bg-destructive/20 text-destructive border-destructive/40"
                  : "bg-primary/15 text-primary border-primary/40"
              }`}>
                {result.centralization_risk} · {result.centralization_score}/100
              </span>
              {result.locked && (
                <span className="inline-flex items-center gap-1 font-mono text-[10px] text-primary">
                  <Lock size={11} /> {isRu ? "адреса замаскированы [RADAR+]" : "addresses masked [RADAR+]"}
                </span>
              )}
            </div>
            <div className="space-y-1.5">
              {result.top_holders?.map((h: any) => (
                <div key={h.rank} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2">
                  <span className="w-6 font-mono text-[11px] text-muted-foreground">#{h.rank}</span>
                  <span className="flex-1 truncate font-mono text-[11px] text-foreground">{h.address}</span>
                  <span className="font-mono text-[10px] uppercase text-muted-foreground">{h.holder_type}</span>
                  <span className="w-16 text-right font-mono text-xs font-bold text-primary">{h.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {result && tool === "funds" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { k: isRu ? "Риск" : "Risk", v: `${result.risk_score}/100` },
              { k: isRu ? "Манипуляции" : "Manipulation", v: `${result.manipulation_score}/100` },
              { k: "Bot Activity", v: `${result.bot_activity_score}/100` },
              { k: "TX / адреса", v: `${fmt(result.total_transactions, 0)} / ${fmt(result.unique_addresses, 0)}` },
            ].map((c, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-4">
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{c.k}</p>
                <p className="mt-1 font-mono text-lg font-bold text-foreground">{c.v}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {result.has_wash_trading && <span className="rounded-full border border-destructive/40 bg-destructive/15 px-3 py-1 font-mono text-[10px] font-bold text-destructive">WASH TRADING</span>}
            {result.has_mixer_usage && <span className="rounded-full border border-destructive/40 bg-destructive/15 px-3 py-1 font-mono text-[10px] font-bold text-destructive">MIXER USAGE</span>}
            {result.has_bot_activity && <span className="rounded-full border border-primary/40 bg-primary/15 px-3 py-1 font-mono text-[10px] font-bold text-primary">BOT ACTIVITY</span>}
            <span className="rounded-full border border-border bg-card px-3 py-1 font-mono text-[10px] text-muted-foreground">{result.cluster_count} clusters · {result.days}d · {result.chain}</span>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-primary">{isRu ? "Сигналы" : "Signals"}</p>
            <div className="space-y-2">
              {result.signals?.map((s: any, i: number) => (
                <div key={i} className="rounded-lg border border-border bg-background p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] font-bold text-foreground">{s.type}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">{s.severity} · {s.confidence}%</span>
                  </div>
                  <p className="mt-1 font-mono text-[11px] text-muted-foreground">{s.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {result && tool === "zk" && (
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="font-mono text-xs text-foreground">
            {isRu ? "Найдено верификаторов" : "Verifiers found"}: <b>{result.verifiers_found}</b>
          </p>
          <pre className="mt-3 max-h-96 overflow-auto rounded-lg border border-border bg-background p-3 font-mono text-[10px] text-muted-foreground">
            {JSON.stringify(result.results, null, 2)}
          </pre>
        </div>
      )}

      {result && tool === "drift" && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              { k: "Δ Total", v: result.delta_total },
              { k: "Δ Critical", v: result.delta_critical },
              { k: "Δ High", v: result.delta_high },
            ].map((c, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-4 text-center">
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{c.k}</p>
                <p className={`mt-1 font-mono text-xl font-bold ${Number(c.v) > 0 ? "text-destructive" : Number(c.v) < 0 ? "text-primary" : "text-foreground"}`}>
                  {Number(c.v) > 0 ? `+${c.v}` : c.v}
                </p>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-border bg-card p-5 font-mono text-xs">
            <p className="text-muted-foreground">{result.target}</p>
            <p className="mt-1 text-foreground">{result.old_verdict} → {result.new_verdict}</p>
            {result.added_patterns?.length > 0 && (
              <p className="mt-2 text-destructive">+ {result.added_patterns.map((a: any) => `${a.type}×${a.count}`).join(", ")}</p>
            )}
            {result.resolved_patterns?.length > 0 && (
              <p className="mt-1 text-primary">− {result.resolved_patterns.map((a: any) => `${a.type}×${a.count}`).join(", ")}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ToolsPanel;
