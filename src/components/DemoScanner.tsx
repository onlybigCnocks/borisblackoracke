import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle, Send, ShieldAlert, Lock, Sparkles, Terminal, Download, Layers, Users, Code, Activity } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { getSavedToken, getScanExportUrl } from "@/lib/auth";

const API_BASE = import.meta.env.VITE_API_URL || "https://api.black-oracle.com";

const POLL_INTERVAL = 5000;
const TIMEOUT_MS = 20 * 60 * 1000;

const LS_TASK_ID = "boris_demo_taskId";
const LS_INPUT = "boris_demo_input";
const LS_START_TIME = "boris_demo_startTime";

const QUICK_TARGETS = [
  {
    label: "USDC Proxy",
    badge: "ERC-20",
    target: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  },
  {
    label: "Uniswap V3 Factory",
    badge: "DEX",
    target: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
  },
  {
    label: "Curve 3Pool",
    badge: "AMM",
    target: "0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7",
  },
  {
    label: "Lido stETH",
    badge: "LSD",
    target: "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84",
  },
  {
    label: "Uniswap/v4-core",
    badge: "GitHub",
    target: "https://github.com/Uniswap/v4-core",
  },
];

// --- Full API interface ---

interface DemoScanResult {
  status: "done";
  target: string;
  project: string;
  scan_date: string;
  scan_mode: "repo" | "onchain";
  archetype: string;
  archetype_icon: string;
  archetype_label?: { en: string; ru: string };
  verdict: "SIGNIFICANT_SURFACE" | "MODERATE_SURFACE" | "MINIMAL_SURFACE" | "CLEAN";
  verdict_label: { en: string; ru: string };
  intro?: { en: string; ru: string };
  scope: {
    patterns_total: number;
    patterns_critical: number;
    patterns_high: number;
    audits?: { count: number; auditors: string[]; age_days: number };
    deploy_count?: number;
    social?: { platforms_count: number; total_followers: number; impersonators: number };
    liquidity?: string;
    top10_holders_pct?: number;
    flow_analyzed?: boolean;
  };
  facts: { en: string[]; ru: string[] };
  layers: Record<string, boolean>;
  more_count: number;
  top_findings_preview?: Array<{ type: string; severity: string; file: string }>;
  exploit_surface?: {
    paths_count: number;
    preconditions_total: number;
    preconditions_matched: number;
    match_ratio: string;
    severity_breakdown: Record<string, number>;
    label: { ru: string; en: string };
  } | null;
  market?: {
    total_liquidity?: string | null;
    total_pools?: number;
    chains?: string[];
    cex_count?: number;
    wash_score?: number;
    observations?: { ru: string[]; en: string[] };
  } | null;
  governance?: {
    snapshot?: boolean;
    emergency?: boolean;
    freeze?: boolean;
    claimed_model?: string;
    observed_control?: string;
    admin_functions_count?: number;
    concentration?: string;
  } | null;
  analyzed_files?: { shown: string[]; total: number; more: number };
  analysis_status?: Array<{
    key: string;
    label: { ru: string; en: string };
    status: "done" | "none";
    detail?: { ru: string; en: string };
  }>;
  deep_dossier?: {
    viewer_tier?: string;
    download_allowed?: boolean;
    archetype?: string;
    archetype_confidence?: number;
    detected_chain?: string;
    is_verified?: boolean;
    claimed_model?: string;
    abi_surface?: Array<{
      contract_name: string;
      address: string;
      chain: string;
      total_functions: number;
      state_changing: number;
      view_pure: number;
      payable: number;
      events: number;
      privileged_count?: number;
      privileged_functions: string[];
      locked?: boolean;
    }>;
    exploit_chains?: Array<{
      title: string;
      vector: string;
      likelihood: string;
      impact: string;
      steps: string[];
      requires: string[];
      amplifiers: string[];
      score: number;
      confidence: number;
      patch: string;
      locked?: boolean;
    }>;
    holders?: {
      locked?: boolean;
      total_holders: number;
      top10_pct: number;
      real_top10_pct: number;
      pools_pct: number;
      top_holders: Array<{
        rank: number;
        address: string;
        label: string;
        percentage: number;
        holder_type: string;
        is_contract: boolean;
      }>;
    };
    structural_profile?: {
      governance: { index: number; level: string };
      code_patterns: { index: number; level: string };
      liquidity_risk: { index: number; level: string };
      holder_concentration: { index: number; level: string };
    };
    findings_full?: Array<{
      type: string;
      severity: string;
      description: string;
      file: string;
      line: number;
      code_snippet: string;
    }>;
  };
}

type ScanState = "idle" | "scanning" | "done" | "error";

// --- Input Validation ---

const PATTERNS = {
  ethAddress: /^0x[0-9a-fA-F]{40}$/,
  tronAddress: /^T[1-9A-HJ-NP-Za-km-z]{33}$/,
  solanaAddress: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
  githubUrl: /^(https?:\/\/)?(www\.)?github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+/,
  githubShort: /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/,
};

function isValidTarget(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) return false;
  return (
    PATTERNS.ethAddress.test(trimmed) ||
    PATTERNS.tronAddress.test(trimmed) ||
    PATTERNS.solanaAddress.test(trimmed) ||
    PATTERNS.githubUrl.test(trimmed) ||
    PATTERNS.githubShort.test(trimmed)
  );
}

function clearPersistence() {
  localStorage.removeItem(LS_TASK_ID);
  localStorage.removeItem(LS_INPUT);
  localStorage.removeItem(LS_START_TIME);
}

function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-CA"); // YYYY-MM-DD
  } catch {
    return iso;
  }
}

const VERDICT_STYLE: Record<string, string> = {
  SIGNIFICANT_SURFACE: "border-amber-500/60 bg-amber-500/15 text-amber-400",
  MODERATE_SURFACE: "border-yellow-500/60 bg-yellow-500/15 text-yellow-400",
  MINIMAL_SURFACE: "border-green-500/60 bg-green-500/15 text-green-400",
  CLEAN: "border-green-500/60 bg-green-500/15 text-green-400",
};

const SEVERITY_BADGE: Record<string, string> = {
  CRITICAL: "border-red-500/50 bg-red-500/15 text-red-400",
  HIGH: "border-orange-500/50 bg-orange-500/15 text-orange-400",
  MEDIUM: "border-yellow-500/50 bg-yellow-500/15 text-yellow-400",
  LOW: "border-blue-500/50 bg-blue-500/15 text-blue-400",
};

// --- Component ---

const DemoScanner = () => {
  const { i18n } = useTranslation();
  const isRu = i18n.language === "ru";

  const [input, setInput] = useState("");
  const [state, setState] = useState<ScanState>("idle");
  const [result, setResult] = useState<DemoScanResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [validationError, setValidationError] = useState("");
  const [taskId, setTaskId] = useState<string | null>(null);
  const [progressValue, setProgressValue] = useState(0);
  const [tail, setTail] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState("");
  const scanStartTime = useRef<number>(0);

  const getStepText = useCallback((step: string): string => {
    switch (step) {
      case "queued": return isRu ? "⏳ Ожидание в очереди..." : "⏳ Waiting in queue...";
      case "cloning": return isRu ? "📦 Загрузка исходного кода..." : "📦 Fetching source code...";
      case "static_analysis": return isRu ? "🔍 Статический анализ" : "🔍 Static analysis";
      case "done": return isRu ? "✅ Завершено" : "✅ Complete";
      default: return isRu ? "📊 Анализ..." : "📊 Analyzing...";
    }
  }, [isRu]);

  // Restore persisted scan or prefilled target on mount
  useEffect(() => {
    const prefill = localStorage.getItem("boris_prefill_target");
    if (prefill) {
      localStorage.removeItem("boris_prefill_target");
      setInput(prefill);
    }
    const savedTaskId = localStorage.getItem(LS_TASK_ID);
    const savedInput = localStorage.getItem(LS_INPUT);
    const savedStartTime = localStorage.getItem(LS_START_TIME);
    if (savedTaskId && savedInput) {
      const startTime = savedStartTime ? parseInt(savedStartTime, 10) : Date.now();
      if (Date.now() - startTime > TIMEOUT_MS) { clearPersistence(); return; }
      setInput(savedInput);
      setTaskId(savedTaskId);
      setState("scanning");
      scanStartTime.current = startTime;
      setCurrentStep(isRu ? "⏳ Ожидание в очереди..." : "⏳ Waiting in queue...");
    }
  }, [isRu]);

  const startScan = useCallback(async (overrideTarget?: string) => {
    const raw = typeof overrideTarget === "string" ? overrideTarget : input;
    const trimmed = raw.trim();
    if (!trimmed) return;
    if (typeof overrideTarget === "string") {
      setInput(trimmed);
    }
    if (!isValidTarget(trimmed)) {
      setValidationError(isRu
        ? "Введите адрес контракта (0x...) или ссылку на GitHub репозиторий"
        : "Enter a contract address (0x...) or a GitHub repository link");
      return;
    }
    setValidationError("");
    setState("scanning");
    setResult(null);
    setErrorMsg("");
    setProgressValue(0);
    setTail([]);
    setCurrentStep(isRu ? "⏳ Ожидание в очереди..." : "⏳ Waiting in queue...");
    scanStartTime.current = Date.now();

    try {
      const authToken = getSavedToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }
      const res = await fetch(`${API_BASE}/api/demo-scan`, {
        method: "POST",
        headers,
        body: JSON.stringify({ target: trimmed }),
      });
      if (res.status === 429) {
        const errData = await res.json().catch(() => ({}));
        setErrorMsg(
          errData.detail ||
            (isRu
              ? "Суточный лимит сканов исчерпан (GUEST: 3 в сутки). Повысьте тариф для расширения квоты."
              : "Daily scan quota reached (GUEST: 3 per 24h). Upgrade tier for more scans.")
        );
        setState("error"); return;
      }
      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      const newTaskId = data.task_id;
      setTaskId(newTaskId);
      localStorage.setItem(LS_TASK_ID, newTaskId);
      localStorage.setItem(LS_INPUT, trimmed);
      localStorage.setItem(LS_START_TIME, String(scanStartTime.current));
      window.dispatchEvent(new Event("boris-scan-started"));
    } catch {
      setErrorMsg(isRu ? "⚠️ Сервер анализа недоступен. Telegram: @BlackOracleBORIS_bot" : "⚠️ Analysis server unavailable. Telegram: @BlackOracleBORIS_bot");
      setState("error");
    }
  }, [input, isRu]);

  // Poll for results
  useEffect(() => {
    if (!taskId || state !== "scanning") return;
    const interval = setInterval(async () => {
      if (Date.now() - scanStartTime.current > TIMEOUT_MS) {
        setErrorMsg(isRu ? "Сканирование занимает больше времени, чем ожидалось. Проверьте результат в Telegram: @BlackOracleBORIS_bot" : "Scan is taking longer than expected. Check Telegram bot for results: @BlackOracleBORIS_bot");
        setState("error"); clearPersistence(); clearInterval(interval); return;
      }
      try {
        const authToken = getSavedToken();
        const pollHeaders: Record<string, string> = {};
        if (authToken) pollHeaders["Authorization"] = `Bearer ${authToken}`;
        const res = await fetch(`${API_BASE}/api/demo-scan/status/${taskId}`, { headers: pollHeaders });
        if (res.status === 429) {
          setErrorMsg(isRu ? "Лимит бесплатных сканов: 3 в час. Используйте Telegram-бот для полного доступа." : "Free scan limit: 3 per hour. Use Telegram bot for full access.");
          setState("error"); clearPersistence(); clearInterval(interval); return;
        }
        if (!res.ok) throw new Error("Poll error");
        const data = await res.json();
        if (data.status === "done") {
          setResult(data as DemoScanResult);
          setState("done"); clearPersistence(); clearInterval(interval);
          window.dispatchEvent(new Event("boris-scan-done"));
        } else if (data.status === "error") {
          setErrorMsg(data.message || "Unknown error");
          setState("error"); clearPersistence(); clearInterval(interval);
        } else if (data.status === "scanning") {
          if (typeof data.progress === "number") setProgressValue(data.progress);
          if (Array.isArray(data.tail)) setTail(data.tail);
          if (data.step) setCurrentStep(getStepText(data.step));
        }
      } catch { /* keep polling */ }
    }, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [taskId, state, isRu, getStepText]);

  // Listen to custom event from Cabinet History ("Open Report")
  useEffect(() => {
    const onLoadArchived = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.result) {
        setInput(detail.result.target || "");
        setTaskId(detail.taskId || null);
        setResult(detail.result as DemoScanResult);
        setState("done");
      }
    };
    window.addEventListener("boris-load-archived-scan", onLoadArchived);
    return () => window.removeEventListener("boris-load-archived-scan", onLoadArchived);
  }, []);

  // Clear validation error when input changes
  useEffect(() => {
    if (validationError) setValidationError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input]);

  return (
    <section id="demo-scanner" className="container mx-auto px-4 py-20">
      <div className="mb-2 flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-primary">
        <Terminal size={14} />
        <span>{isRu ? "Интерактивный песочный скан" : "Interactive Live Sandbox"}</span>
      </div>
      <h2 className="mb-2 text-3xl font-bold text-foreground md:text-4xl">
        {isRu ? "Проверь проект" : "Scan a Project"}
      </h2>
      <p className="mb-6 font-mono text-sm text-muted-foreground">
        {isRu ? "Вставь ссылку на GitHub репозиторий или адрес смарт-контракта (EVM / Solana / Tron)" : "Paste a GitHub repo URL or smart contract address (EVM / Solana / Tron)"}
      </p>

      {/* Input */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && startScan()}
          placeholder={isRu ? "github.com/protocol/repo или 0x1234...abcd" : "github.com/protocol/repo or 0x1234...abcd"}
          disabled={state === "scanning"}
          className="flex-1 rounded-xl border border-border bg-card py-4 px-5 font-mono text-sm text-foreground outline-none transition-all focus:border-primary focus:shadow-[0_0_20px_hsl(var(--primary)/0.3)] disabled:opacity-50"
        />
        <button
          onClick={() => startScan()}
          disabled={state === "scanning" || !input.trim()}
          className="rounded-xl bg-primary px-8 py-4 font-semibold text-primary-foreground transition-all hover:bg-primary-dim btn-glow disabled:opacity-50 whitespace-nowrap"
        >
          {state === "scanning" ? (isRu ? "Анализ..." : "Analyzing...") : (isRu ? "Запустить анализ" : "Run Analysis")}
        </button>
      </div>

      {validationError && <p className="mt-2 font-mono text-xs text-red-400">{validationError}</p>}

      {/* Quick Presets */}
      <div className="mt-3.5 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground mr-1">
          <Sparkles size={12} className="text-primary" />
          {isRu ? "Быстрый тест:" : "Quick presets:"}
        </span>
        {QUICK_TARGETS.map((p) => {
          const active = input.trim().toLowerCase() === p.target.toLowerCase();
          return (
            <button
              key={p.label}
              type="button"
              disabled={state === "scanning"}
              onClick={() => setInput(p.target)}
              className={`group inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-mono text-xs transition-all disabled:opacity-40 ${
                active
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border bg-card/70 text-muted-foreground hover:border-primary/60 hover:text-foreground"
              }`}
            >
              <span>{p.label}</span>
              <span className="rounded bg-background/80 px-1.5 py-0.2 text-[10px] text-muted-foreground group-hover:text-primary">
                {p.badge}
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-2.5 font-mono text-xs text-muted-foreground">
        {isRu ? "Бесплатный GUEST-тизер (поверхность риска и ключевые сигналы). ~1–5 мин на скан." : "Free GUEST teaser (risk surface & top signals). ~1–5 min per scan."}
      </p>

      {/* Scanning State */}
      {state === "scanning" && (
        <div className="mt-8 rounded-xl border border-primary/30 bg-card p-6 shadow-[0_0_30px_hsl(var(--primary)/0.08)]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="pulse-dot absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-primary" />
              </span>
              <span className="font-mono text-sm font-semibold text-foreground">
                {isRu ? "БОРИС сканирует цель..." : "BORIS is scanning target..."}
              </span>
            </div>
            <span className="rounded border border-border bg-background px-2 py-0.5 font-mono text-[11px] text-muted-foreground truncate max-w-[240px]">
              {input}
            </span>
          </div>
          <div className="mb-3 flex items-center gap-3 font-mono text-sm">
            <CheckCircle size={14} className="text-green-500 shrink-0" />
            <span className="text-muted-foreground">{currentStep}</span>
          </div>
          {progressValue > 0 && (
            <div className="mb-3">
              <Progress value={progressValue * 100} className="h-2" />
              <p className="mt-1 font-mono text-xs text-muted-foreground text-right">{Math.round(progressValue * 100)}%</p>
            </div>
          )}
          {tail.length > 0 && (
            <div className="mt-3 rounded-lg border border-border bg-background/90 p-3.5 max-h-36 overflow-y-auto font-mono text-[11px] text-muted-foreground space-y-1">
              {tail.map((line, i) => (
                <p key={i} className="leading-relaxed">
                  <span className="text-primary/70 mr-2">›</span>
                  {line}
                </p>
              ))}
            </div>
          )}
          <p className="mt-4 font-mono text-xs text-muted-foreground">
            {isRu ? "Запущены реальные анализаторы (AST, Slither/Semgrep, On-Chain Граф). Подождите завершения." : "Real engines active (AST, Slither/Semgrep, On-Chain Graph). Please wait."}
          </p>
        </div>
      )}

      {/* Error State */}
      {state === "error" && (
        <div className="mt-8 rounded-xl border-l-[3px] p-5" style={{ borderColor: '#F59E0B', background: 'rgba(245, 158, 11, 0.08)' }}>
          <p className="font-mono text-sm" style={{ color: '#F59E0B' }}>{errorMsg}</p>
          <a href="https://t.me/BlackOracleBORIS_bot" target="_blank" rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-2 font-mono text-sm text-primary hover:underline">
            <Send size={14} /> @BlackOracleBORIS_bot
          </a>
        </div>
      )}

      {/* Result — Compact Teaser + Deep Dossier */}
      {state === "done" && result && <ResultTeaser result={result} isRu={isRu} taskId={taskId} />}
    </section>
  );
};

// --- Result Teaser Component ---

export function ResultTeaser({ result, isRu, taskId }: { result: DemoScanResult; isRu: boolean; taskId?: string | null }) {
  const lang = isRu ? "ru" : "en";
  const verdictStyle = VERDICT_STYLE[result.verdict] || VERDICT_STYLE.CLEAN;
  const layers = result.layers || {};
  const activeLayers = Object.values(layers).filter(Boolean).length;
  const totalLayers = Object.keys(layers).length;
  const facts = result.facts?.[lang] || result.facts?.en || (Array.isArray(result.facts) ? result.facts : []);
  const analyzedFiles = result.analyzed_files;
  const analysisStatus = result.analysis_status;
  const topFindings = result.top_findings_preview || [];
  const exploitSurface = result.exploit_surface;
  const governance = result.governance;

  return (
    <div className="mt-8 rounded-xl border border-border bg-card overflow-hidden shadow-xl">
      {/* Row 1 — Header */}
      <div className="border-b border-border bg-background/40 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xl shrink-0">{result.archetype_icon}</span>
            <span className="font-mono text-base font-bold text-foreground truncate">{result.project}</span>
            <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-primary shrink-0">
              {result.archetype_label?.[lang] || result.archetype_label?.en || result.archetype}
            </span>
            <span className="font-mono text-[11px] text-muted-foreground shrink-0">{formatDate(result.scan_date)}</span>
          </div>
          <span className={`rounded-md border px-3 py-1 font-mono text-xs font-semibold shrink-0 ${verdictStyle}`}>
            {result.verdict_label?.[lang] || result.verdict_label?.en || result.verdict}
          </span>
        </div>
        {result.intro && (
          <p className="mt-2.5 font-mono text-xs text-muted-foreground leading-relaxed">
            {result.intro?.[lang] || result.intro?.en || ""}
          </p>
        )}
      </div>

      <div className="p-5 space-y-6">
        {/* Row 2 — Scope stats (horizontal scroll) */}
        <div className="flex gap-2.5 overflow-x-auto pb-1" style={{ flexWrap: "nowrap" }}>
          {(result.scope?.patterns_total ?? 0) > 0 && (
            <ScopeStat value={String(result.scope.patterns_total)} label={isRu ? "Паттернов" : "Patterns"}>
              <span className="font-mono text-[10px]">
                <span className="text-red-400 font-semibold">{result.scope?.patterns_critical ?? 0}C</span>
                {" / "}
                <span className="text-orange-400 font-semibold">{result.scope?.patterns_high ?? 0}H</span>
              </span>
            </ScopeStat>
          )}
          <ScopeStat value={`${activeLayers}/${totalLayers}`} label={isRu ? "Слоёв" : "Layers"} />

          {exploitSurface && exploitSurface.paths_count > 0 && (
            <ScopeStat value={String(exploitSurface.paths_count)} label={isRu ? "Цепочки атак" : "Exploit Chains"}>
              <span className="font-mono text-[9px] text-amber-400">modeled</span>
            </ScopeStat>
          )}

          {result.scope?.social && result.scope.social.total_followers > 0 && (
            <ScopeStat value={formatFollowers(result.scope.social.total_followers)} label="Followers">
              {result.scope.social.impersonators > 0 && (
                <span className="font-mono text-[9px] text-red-400">{result.scope.social.impersonators} impersonators</span>
              )}
            </ScopeStat>
          )}

          {result.scope?.audits && result.scope.audits.count > 0 && (
            <div className="shrink-0 min-w-[100px] rounded-lg border border-border bg-background p-2.5 text-center">
              <p className="font-mono text-lg font-bold text-foreground leading-none">{result.scope.audits.count}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Audits</p>
              <div className="mt-1 flex flex-wrap justify-center gap-0.5">
                {result.scope.audits.auditors?.slice(0, 3).map((a) => (
                  <span key={a} className="rounded-full border border-border px-1.5 font-mono text-[8px] text-muted-foreground">{a}</span>
                ))}
                {(result.scope.audits.auditors?.length ?? 0) > 3 && (
                  <span className="font-mono text-[8px] text-muted-foreground">+{result.scope.audits.auditors!.length - 3}</span>
                )}
              </div>
              {(result.scope.audits.age_days ?? 0) > 365 && (
                <span className="font-mono text-[9px] text-amber-400">{result.scope.audits.age_days}d ago</span>
              )}
            </div>
          )}

          {result.scope?.liquidity && (
            <ScopeStat value={result.scope.liquidity} label={isRu ? "Ликвидность" : "Liquidity"} />
          )}

          {result.scope?.top10_holders_pct != null && result.scope.top10_holders_pct > 0 && (
            <ScopeStat value={`${result.scope.top10_holders_pct}%`} label="Top-10 Holders">
              {result.scope.top10_holders_pct > 80 && (
                <span className="font-mono text-[9px] text-amber-400">concentrated</span>
              )}
            </ScopeStat>
          )}

          {result.scope?.deploy_count != null && result.scope.deploy_count > 0 && (
            <ScopeStat value={String(result.scope.deploy_count)} label="Deploys" />
          )}
        </div>

        {/* Top Findings Preview (Surface Teaser without line numbers/PoC) */}
        {topFindings.length > 0 && (
          <div className="rounded-xl border border-primary/25 bg-background/60 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-foreground font-mono font-semibold">
                <ShieldAlert size={14} className="text-primary" />
                {isRu ? "Обнаруженные сигнатуры (Превью)" : "Detected Signatures (Preview)"}
              </h3>
              <span className="inline-flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
                <Lock size={11} className="text-primary" />
                {isRu ? "Строки кода и PoC скрыты" : "Lines & PoC locked"}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {topFindings.map((f, i) => {
                const badgeStyle = SEVERITY_BADGE[f.severity?.toUpperCase()] || SEVERITY_BADGE.LOW;
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-xs font-semibold text-foreground truncate">{f.type}</p>
                      <p className="font-mono text-[10px] text-muted-foreground truncate">
                        {f.file ? `${f.file} · line ███` : "contract · line ███"}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded border px-2 py-0.5 font-mono text-[10px] font-bold ${badgeStyle}`}>
                      {f.severity}
                    </span>
                  </div>
                );
              })}
            </div>
            {(result.more_count ?? 0) > 0 && (
              <p className="mt-2.5 font-mono text-xs text-primary/90">
                + {result.more_count} {isRu ? "дополнительных паттернов и граф вызовов доступны в полном отчёте" : "additional patterns & call-graph available in full report"}
              </p>
            )}
          </div>
        )}

        {/* Exploit Surface + Governance flags teaser */}
        {(exploitSurface || governance) && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {exploitSurface && exploitSurface.paths_count > 0 && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3.5">
                <p className="font-mono text-[10px] uppercase tracking-wider text-amber-400">
                  {isRu ? "Моделирование векторов атаки" : "Attack Vector Modeling"}
                </p>
                <p className="mt-1 font-mono text-xs font-semibold text-foreground">
                  ⚡ {exploitSurface.label?.[lang] || exploitSurface.label?.en}
                </p>
                <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                  {isRu ? "Детализация цепочки транзакций доступна в BLACKBOX-отчёте." : "Transaction chain breakdown available in BLACKBOX report."}
                </p>
              </div>
            )}
            {governance && (governance.emergency || governance.freeze || (governance.admin_functions_count ?? 0) > 0) && (
              <div className="rounded-lg border border-border bg-background/60 p-3.5">
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {isRu ? "Контур привилегий и управления" : "Governance & Privilege Surface"}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5 font-mono text-[11px]">
                  {governance.emergency && (
                    <span className="rounded border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-amber-300">
                      Emergency Drain / Pause
                    </span>
                  )}
                  {governance.freeze && (
                    <span className="rounded border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-amber-300">
                      Blacklist / Freeze
                    </span>
                  )}
                  {(governance.admin_functions_count ?? 0) > 0 && (
                    <span className="rounded border border-border bg-card px-2 py-0.5 text-foreground">
                      {governance.admin_functions_count} {isRu ? "admin-функций" : "admin functions"}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Analyzed Files & Completed Engines side by side */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {analyzedFiles && analyzedFiles.shown?.length > 0 && (
            <div>
              <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 font-mono">
                {isRu ? "Затронутые модули" : "Inspected Modules"}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                {analyzedFiles.shown.map((file, i) => (
                  <p key={i} className="font-mono text-[11px] text-muted-foreground truncate">
                    📄 {file}
                  </p>
                ))}
              </div>
              {analyzedFiles.more > 0 && (
                <p className="mt-1.5 font-mono text-xs italic text-muted-foreground">
                  {isRu ? `...и ещё ${analyzedFiles.more} файлов` : `...and ${analyzedFiles.more} more files`}
                </p>
              )}
            </div>
          )}

          {analysisStatus && analysisStatus.length > 0 && (
            <div>
              <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 font-mono">
                {isRu ? "Отработавшие контуры" : "Executed Pipelines"}
              </h3>
              <ul className="space-y-1">
                {analysisStatus.map((item) => (
                  <li key={item.key} className="flex items-start gap-1.5 font-mono text-xs">
                    <span className="shrink-0">{item.status === "done" ? "✅" : "⬜"}</span>
                    <span>
                      <span className="text-foreground">{item.label?.[lang] || item.label?.en || item.key}</span>
                      {item.detail?.[lang] && (
                        <span className="ml-1.5 text-muted-foreground">({item.detail[lang]})</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Observed facts */}
        <div>
          <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 font-mono">
            {isRu ? "Наблюдаемые факты" : "Observed Facts"}
          </h3>
          {facts.length > 0 ? (
            <ul className="space-y-1">
              {facts.slice(0, 4).map((fact, i) => (
                <li key={i} className="font-mono text-sm text-foreground/85">
                  <span className="text-primary mr-1.5">▸</span>{fact}
                </li>
              ))}
            </ul>
          ) : (
            <p className="font-mono text-sm text-muted-foreground italic">
              {isRu ? "Явных аномалий на базовом уровне не выявлено" : "No surface-level anomalies detected"}
            </p>
          )}
          {facts.length > 4 && (
            <p className="mt-1.5 font-mono text-xs italic text-muted-foreground">
              {isRu ? `...и ещё ${facts.length - 4}` : `...and ${facts.length - 4} more`}
            </p>
          )}
        </div>

        {/* ==================== 8-SECTION DEEP ENGINEERING DOSSIER ==================== */}
        {result.deep_dossier && (
          <div className="space-y-5 border-t border-border pt-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-primary font-bold">
                <Layers size={15} />
                <span>
                  {isRu
                    ? "Инженерная декомпозиция поверхности (8 слоёв)"
                    : "Engineering Surface Decomposition (8 Layers)"}
                </span>
              </div>
              {taskId && result.deep_dossier.download_allowed ? (
                <a
                  href={getScanExportUrl(taskId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 font-mono text-xs font-semibold text-primary transition-all hover:bg-primary/20"
                >
                  <Download size={13} />
                  <span>{isRu ? "Скачать JSON-досье" : "Export JSON Dossier"}</span>
                </a>
              ) : (
                <a
                  href="/pricing"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 font-mono text-xs text-muted-foreground transition-all hover:border-primary hover:text-primary"
                >
                  <Lock size={12} className="text-primary" />
                  <span>{isRu ? "JSON-экспорт [с тарифа RADAR]" : "JSON Export [RADAR+ Tier]"}</span>
                </a>
              )}
            </div>

            {/* 1. Structural Profile (4 Risk Indices) */}
            {result.deep_dossier.structural_profile && (
              <div className="rounded-xl border border-border bg-background/60 p-4">
                <h4 className="mb-3 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                  <Activity size={13} className="text-primary" />
                  {isRu ? "8️⃣ Структурный профиль индексов риска" : "8️⃣ Structural Risk Index Profile"}
                </h4>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    {
                      label: "Governance",
                      data: result.deep_dossier.structural_profile.governance,
                    },
                    {
                      label: "Code Patterns",
                      data: result.deep_dossier.structural_profile.code_patterns,
                    },
                    {
                      label: "Liquidity Risk",
                      data: result.deep_dossier.structural_profile.liquidity_risk,
                    },
                    {
                      label: "Holder Conc.",
                      data: result.deep_dossier.structural_profile.holder_concentration,
                    },
                  ].map((item) => {
                    const isHigh = item.data.index >= 60;
                    const isMod = item.data.index >= 25 && item.data.index < 60;
                    const barColor = isHigh ? "bg-red-500" : isMod ? "bg-amber-500" : "bg-green-500";
                    const textColor = isHigh ? "text-red-400" : isMod ? "text-amber-400" : "text-green-400";
                    return (
                      <div key={item.label} className="rounded-lg border border-border bg-card p-3">
                        <div className="flex items-center justify-between font-mono text-xs">
                          <span className="text-muted-foreground">{item.label}</span>
                          <span className={`font-bold uppercase ${textColor}`}>{item.data.level}</span>
                        </div>
                        <p className="mt-1 font-mono text-xl font-bold text-foreground">
                          {item.data.index}
                          <span className="text-xs font-normal text-muted-foreground">/100</span>
                        </p>
                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-background">
                          <div
                            className={`h-full rounded-full ${barColor}`}
                            style={{ width: `${Math.max(4, Math.min(100, item.data.index))}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. ABI Surface Map & Privileged Functions */}
            {result.deep_dossier.abi_surface && result.deep_dossier.abi_surface.length > 0 && (
              <div className="rounded-xl border border-border bg-background/60 p-4">
                <h4 className="mb-3 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                  <Code size={13} className="text-primary" />
                  {isRu ? "🔧 Карта ABI-поверхности и привилегированных вызовов" : "🔧 ABI Surface Map & Privileged Calls"}
                </h4>
                <div className="space-y-3">
                  {result.deep_dossier.abi_surface.map((abi, idx) => (
                    <div key={idx} className="rounded-lg border border-border bg-card p-3.5 font-mono text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-bold text-foreground">
                          {abi.contract_name} <span className="text-primary">[{abi.chain.toUpperCase()}]</span>
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          Functions: <strong className="text-foreground">{abi.total_functions}</strong> · State-changing:{" "}
                          <strong className="text-foreground">{abi.state_changing}</strong> · View:{" "}
                          <strong className="text-foreground">{abi.view_pure}</strong> · Events:{" "}
                          <strong className="text-foreground">{abi.events}</strong>
                        </span>
                      </div>
                      {abi.privileged_functions && abi.privileged_functions.length > 0 && (
                        <div className="mt-2.5">
                          <span className="text-[10px] uppercase tracking-wider text-red-400">
                            {isRu ? "🔴 Привилегированные функции (Admin / Mint / Burn / Drain):" : "🔴 Privileged Functions:"}
                          </span>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {abi.privileged_functions.map((fn, j) => (
                              <span
                                key={j}
                                className="rounded border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-[11px] text-red-300"
                              >
                                {fn}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. Condition Chains (Attack Vector Breakdown) */}
            {result.deep_dossier.exploit_chains && result.deep_dossier.exploit_chains.length > 0 && (
              <div className="rounded-xl border border-amber-500/35 bg-amber-500/5 p-4">
                <h4 className="mb-3 font-mono text-[11px] uppercase tracking-wider text-amber-400 font-semibold">
                  {isRu ? "3️⃣ Цепочки условий и сценарии риска" : "3️⃣ Condition Chains & Risk Scenarios"}
                </h4>
                <div className="space-y-3">
                  {result.deep_dossier.exploit_chains.map((ch, idx) => (
                    <div key={idx} className="rounded-lg border border-border bg-card p-3.5 font-mono text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-bold text-foreground">
                          Chain #{idx + 1}: {ch.title}
                        </span>
                        <div className="flex items-center gap-2 text-[11px]">
                          <span className="rounded border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-amber-300">
                            Vector: {ch.vector}
                          </span>
                          <span className="text-muted-foreground">
                            Score: <strong className="text-foreground">{ch.score}</strong> · Confidence:{" "}
                            <strong className="text-primary">{ch.confidence}%</strong>
                          </span>
                        </div>
                      </div>
                      {ch.steps && ch.steps.length > 0 && (
                        <ul className="mt-2.5 space-y-1 text-[11px] text-muted-foreground">
                          {ch.steps.map((st, sIdx) => (
                            <li key={sIdx}>
                              <span className="text-amber-400 mr-1.5">Condition {sIdx + 1}:</span>
                              {st}
                            </li>
                          ))}
                        </ul>
                      )}
                      {ch.impact && (
                        <p className="mt-2 text-[11px] text-foreground/90">
                          <span className="text-primary font-semibold">Impact: </span>
                          {ch.impact}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. Top-10 Holders & Liquidity Pool Distribution */}
            {result.deep_dossier.holders &&
              result.deep_dossier.holders.top_holders &&
              result.deep_dossier.holders.top_holders.length > 0 && (
                <div className="rounded-xl border border-border bg-background/60 p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h4 className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                      <Users size={13} className="text-primary" />
                      {isRu ? "7️⃣ Распределение холдеров и пулов" : "7️⃣ Holder & Pool Distribution"}
                    </h4>
                    <div className="flex items-center gap-3 font-mono text-xs">
                      <span>
                        Top-10: <strong className="text-foreground">{result.deep_dossier.holders.top10_pct}%</strong>
                      </span>
                      <span>
                        {isRu ? "Реальн. (без пулов):" : "Real (ex-pools):"}{" "}
                        <strong className="text-amber-400">{result.deep_dossier.holders.real_top10_pct}%</strong>
                      </span>
                      <span>
                        🏊 Pools: <strong className="text-cyan-400">{result.deep_dossier.holders.pools_pct}%</strong>
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {result.deep_dossier.holders.top_holders.slice(0, 10).map((h) => {
                      const icon = h.holder_type === "pool" ? "🏊" : h.percentage >= 5 ? "🐋" : "👤";
                      const shortAddr =
                        h.address.length > 16 ? `${h.address.slice(0, 10)}…${h.address.slice(-6)}` : h.address;
                      return (
                        <div
                          key={h.rank}
                          className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2 font-mono text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-6 text-muted-foreground">#{h.rank}</span>
                            <span>{icon}</span>
                            <span className="text-foreground truncate">{shortAddr}</span>
                            <span className="rounded border border-border bg-background px-2 py-0.5 text-[10px] text-muted-foreground truncate max-w-[220px]">
                              {h.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="hidden sm:block w-24 h-1.5 rounded-full bg-background overflow-hidden">
                              <div
                                className="h-full bg-primary"
                                style={{ width: `${Math.min(100, h.percentage)}%` }}
                              />
                            </div>
                            <span className="w-14 text-right font-bold text-foreground">{h.percentage}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
          </div>
        )}

        {/* CTA */}
        <div className="rounded-xl border border-primary/40 bg-radial-red p-5 text-center">
          <p className="font-mono text-xs text-foreground mb-1 font-semibold">
            {isRu
              ? "Полная расшифровка уязвимостей, точные строки кода, граф транзакций и проверка контракта в 1 клик:"
              : "Full vulnerability breakdown, exact code lines, transaction graph & deep audit in 1 click:"}
          </p>
          <p className="font-mono text-[11px] text-muted-foreground mb-4">
            {isRu
              ? "Заберите полный отчёт (RADAR / RAW / BLACKBOX) в официальном Telegram-терминале BORIS"
              : "Unlock the complete report (RADAR / RAW / BLACKBOX) in the official BORIS Telegram terminal"}
          </p>
          <a
            href="https://t.me/BlackOracleBORIS_bot"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3 font-semibold text-primary-foreground transition-all hover:bg-primary-dim btn-glow text-sm"
          >
            <Send size={16} />
            {isRu ? "Открыть полный отчёт в Telegram" : "Unlock Full Report in Telegram"}
          </a>
        </div>

        {/* Single clean disclaimer at bottom */}
        <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-4 py-2.5 flex items-center justify-between gap-2 flex-wrap">
          <p className="font-mono text-[11px] text-yellow-400/80">
            {(result as any).disclaimer?.main?.[lang] || (isRu
              ? "⚠️ Наличие поверхности риска не означает активную эксплуатацию. Часть паттернов может быть архитектурным решением."
              : "⚠️ Risk surface presence does not imply active exploitation. Some patterns may be intentional design choices.")}
          </p>
          <span className="font-mono text-[10px] text-muted-foreground">BORIS v2.4</span>
        </div>
      </div>
    </div>
  );
}

function ScopeStat({ value, label, children }: { value: string; label: string; children?: React.ReactNode }) {
  return (
    <div className="shrink-0 min-w-[90px] rounded-lg border border-border bg-background p-2.5 text-center">
      <p className="font-mono text-lg font-bold text-foreground leading-none">{value}</p>
      <p className="text-[10px] text-muted-foreground mt-1">{label}</p>
      {children}
    </div>
  );
}

export default DemoScanner;
