import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { GlowCard } from "@/components/ui-boris";
import { CheckCircle, Send } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const API_BASE = import.meta.env.VITE_API_URL || "https://api.black-oracle.com";

const POLL_INTERVAL = 5000;
const TIMEOUT_MS = 20 * 60 * 1000;

const LS_TASK_ID = "boris_demo_taskId";
const LS_INPUT = "boris_demo_input";
const LS_START_TIME = "boris_demo_startTime";

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
  analyzed_files?: { shown: string[]; total: number; more: number };
  analysis_status?: Array<{
    key: string;
    label: { ru: string; en: string };
    status: "done" | "none";
    detail?: { ru: string; en: string };
  }>;
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

// --- Component ---

const DemoScanner = () => {
  const { t, i18n } = useTranslation();
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

  // Restore persisted scan on mount
  useEffect(() => {
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
  }, []);

  const startScan = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed) return;
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
      const res = await fetch(`${API_BASE}/api/demo-scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: trimmed }),
      });
      if (res.status === 429) {
        setErrorMsg(isRu ? "Лимит бесплатных сканов: 3 в сутки. Используйте Telegram-бот для полного доступа." : "Free scan limit: 3 per day. Use Telegram bot for full access.");
        setState("error"); return;
      }
      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      const newTaskId = data.task_id;
      setTaskId(newTaskId);
      localStorage.setItem(LS_TASK_ID, newTaskId);
      localStorage.setItem(LS_INPUT, trimmed);
      localStorage.setItem(LS_START_TIME, String(scanStartTime.current));
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
        const res = await fetch(`${API_BASE}/api/demo-scan/status/${taskId}`);
        if (res.status === 429) {
          setErrorMsg(isRu ? "Лимит бесплатных сканов: 3 в час. Используйте Telegram-бот для полного доступа." : "Free scan limit: 3 per hour. Use Telegram bot for full access.");
          setState("error"); clearPersistence(); clearInterval(interval); return;
        }
        if (!res.ok) throw new Error("Poll error");
        const data = await res.json();
        if (data.status === "done") {
          setResult(data as DemoScanResult);
          setState("done"); clearPersistence(); clearInterval(interval);
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

  // Clear validation error when input changes
  useEffect(() => {
    if (validationError) setValidationError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input]);

  return (
    <section id="demo-scanner" className="container mx-auto px-4 py-20">
      <h2 className="mb-2 text-3xl font-bold text-foreground md:text-4xl">
        {isRu ? "Проверь проект" : "Scan a Project"}
      </h2>
      <p className="mb-8 font-mono text-sm text-muted-foreground">
        {isRu ? "Вставь ссылку на GitHub репозиторий или адрес смарт-контракта" : "Paste a GitHub repo URL or smart contract address"}
      </p>

      {/* Input */}
      <div className="flex gap-3">
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
          onClick={startScan}
          disabled={state === "scanning" || !input.trim()}
          className="rounded-xl bg-primary px-6 py-4 font-semibold text-primary-foreground transition-all hover:bg-primary-dim btn-glow disabled:opacity-50 whitespace-nowrap"
        >
          {state === "scanning" ? (isRu ? "Анализ..." : "Analyzing...") : (isRu ? "Запустить анализ" : "Run Analysis")}
        </button>
      </div>

      {validationError && <p className="mt-2 font-mono text-xs text-red-400">{validationError}</p>}

      <p className="mt-2 font-mono text-xs text-muted-foreground">
        {isRu ? "Бесплатный GUEST-отчёт. ~3-15 мин на полный скан." : "Free GUEST report. ~3-15 min for full scan."}
      </p>

      {/* Scanning State */}
      {state === "scanning" && (
        <div className="mt-8 rounded-xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="pulse-dot absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-primary" />
            </span>
            <span className="font-mono text-sm font-semibold text-foreground">
              {isRu ? "Анализ запущен..." : "Analysis running..."}
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
            <div className="mt-3 rounded-lg border border-border bg-background p-3 max-h-32 overflow-y-auto">
              {tail.map((line, i) => (
                <p key={i} className="font-mono text-[11px] text-muted-foreground leading-relaxed">{line}</p>
              ))}
            </div>
          )}
          <p className="mt-4 font-mono text-xs text-muted-foreground">
            {isRu ? "Это реальный анализ. Полное сканирование может занять до 15 минут." : "This is a real scan. Full analysis may take up to 15 minutes."}
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

      {/* Result — Compact Teaser */}
      {state === "done" && result && <ResultTeaser result={result} isRu={isRu} />}
    </section>
  );
};

// --- Result Teaser Component ---

function ResultTeaser({ result, isRu }: { result: DemoScanResult; isRu: boolean }) {
  const lang = isRu ? "ru" : "en";
  const verdictStyle = VERDICT_STYLE[result.verdict] || VERDICT_STYLE.CLEAN;
  const layers = result.layers || {};
  const activeLayers = Object.values(layers).filter(Boolean).length;
  const totalLayers = Object.keys(layers).length;
  const facts = result.facts?.[lang] || result.facts?.en || (Array.isArray(result.facts) ? result.facts : []);
  const analyzedFiles = result.analyzed_files;
  const analysisStatus = result.analysis_status;

  return (
    <div className="mt-8 rounded-xl border border-border bg-card overflow-hidden">
      {/* Row 1 — Header */}
      <div className="border-b border-border px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg shrink-0">{result.archetype_icon}</span>
            <span className="font-mono text-sm font-bold text-foreground truncate">{result.project}</span>
            <span className="rounded-full border border-border px-2 py-0.5 font-mono text-[10px] text-muted-foreground shrink-0">
              {result.archetype_label?.[lang] || result.archetype_label?.en || result.archetype}
            </span>
            <span className="font-mono text-[11px] text-muted-foreground shrink-0">{formatDate(result.scan_date)}</span>
          </div>
          <span className={`rounded-md border px-3 py-1 font-mono text-xs font-semibold shrink-0 ${verdictStyle}`}>
            {result.verdict_label?.[lang] || result.verdict_label?.en || result.verdict}
          </span>
        </div>
        {result.intro && (
          <p className="mt-2 font-mono text-xs italic text-muted-foreground line-clamp-2">
            {result.intro?.[lang] || result.intro?.en || ""}
          </p>
        )}
        {/* Prominent disclaimer */}
        <div className="mt-3 rounded-md border-l-[3px]" style={{ borderColor: '#F59E0B', background: 'rgba(245, 158, 11, 0.08)', padding: '12px 16px' }}>
          <p className="font-mono text-[16px]" style={{ color: '#F59E0B' }}>
            {(result as any).disclaimer?.main?.[lang] || (isRu
              ? "⚠️ Это не означает эксплуатацию. Это означает наличие поверхности риска."
              : "⚠️ This does not imply exploitation. It indicates the presence of a risk surface.")}
          </p>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Row 2 — Scope stats (horizontal scroll) */}
        <div className="flex gap-2.5 overflow-x-auto pb-1" style={{ flexWrap: "nowrap" }}>
          {(result.scope?.patterns_total ?? 0) > 0 && (
            <ScopeStat value={String(result.scope.patterns_total)} label="Patterns">
              <span className="font-mono text-[9px]">
                <span className="text-red-400">{result.scope?.patterns_critical ?? 0}C</span>
                {" / "}
                <span className="text-orange-400">{result.scope?.patterns_high ?? 0}H</span>
              </span>
            </ScopeStat>
          )}
          <ScopeStat value={`${activeLayers}/${totalLayers}`} label="Layers" />

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
            <ScopeStat value={result.scope.liquidity} label="Liquidity" />
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

        {/* Analyzed Files */}
        {analyzedFiles && analyzedFiles.shown?.length > 0 && (
          <div>
            <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 font-mono">
              {isRu ? "Проанализированные файлы" : "Analyzed Files"}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
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

        {/* Analysis Completed */}
        {analysisStatus && analysisStatus.length > 0 && (
          <div>
            <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 font-mono">
              {isRu ? "Выполненный анализ" : "Analysis Completed"}
            </h3>
            <ul className="space-y-1">
              {analysisStatus.map((item) => (
                <li key={item.key} className="flex items-start gap-1.5 font-mono text-xs">
                  <span className="shrink-0">{item.status === "done" ? "✅" : "⬜"}</span>
                  <span>
                    <span className="text-foreground">{item.label?.[lang] || item.label?.en || item.key}</span>
                    {item.detail?.[lang] && (
                      <span className="ml-1.5 text-muted-foreground">{item.detail[lang]}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Observed facts */}
        <div>
          <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 font-mono">
            {isRu ? "Наблюдаемые факты" : "Observed Facts"}
          </h3>
          {facts.length > 0 ? (
            <ul className="space-y-1">
              {facts.slice(0, 3).map((fact, i) => (
                <li key={i} className="font-mono text-sm text-foreground/80">
                  <span className="text-muted-foreground mr-1.5">▸</span>{fact}
                </li>
              ))}
            </ul>
          ) : (
            <p className="font-mono text-sm text-muted-foreground italic">
              {isRu ? "Значимых паттернов не обнаружено" : "No significant patterns detected"}
            </p>
          )}
          {facts.length > 3 && (
            <p className="mt-1.5 font-mono text-xs italic text-muted-foreground">
              {isRu ? `...и ещё ${facts.length - 3}` : `...and ${facts.length - 3} more`}
            </p>
          )}
          {(result.more_count ?? 0) > 0 && (
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              +{result.more_count} {isRu ? "находок в полном отчёте" : "findings in full report"}
            </p>
          )}
          <p className="mt-2 font-mono italic text-muted-foreground" style={{ fontSize: '13px', color: '#6B7280' }}>
            ℹ️ {(result as any).disclaimer?.facts_note?.[lang] || (isRu
              ? "Некоторые факты могут быть частью архитектуры проекта или намеренных дизайн-решений."
              : "Some facts may be part of the project architecture or intentional design decisions.")}
          </p>
        </div>

        {/* CTA */}
        <div className="relative">
          <div className="absolute inset-x-0 -top-8 h-8 bg-gradient-to-b from-transparent to-card pointer-events-none" />
          <div className="relative z-10 flex flex-col items-center gap-2 pt-2">
            <a
              href="https://t.me/BlackOracleBORIS_bot"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3 font-semibold text-primary-foreground transition-all hover:bg-primary-dim btn-glow text-sm"
            >
              <Send size={16} />
              {isRu ? "Открыть полный отчёт" : "Get Full Report"}
            </a>
            <span className="font-mono text-[10px] text-muted-foreground tracking-widest">RADAR · RAW · BLACKBOX</span>
          </div>
        </div>

        {/* Row 5 — Footer disclaimer */}
        <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-4 py-2.5">
          <p className="font-mono text-[11px] text-yellow-400/80">
            {isRu
              ? "⚠️ Это не означает эксплуатацию. Это означает наличие поверхности риска."
              : "⚠️ This does not imply exploitation. It indicates risk surface."}
          </p>
        </div>
        <p className="text-center font-mono text-[10px] text-muted-foreground">
          BORIS — {isRu ? "автоматизированная система инспекции" : "automated inspection system"}
        </p>
      </div>
    </div>
  );
}

function ScopeStat({ value, label, children }: { value: string; label: string; children?: React.ReactNode }) {
  return (
    <div className="shrink-0 min-w-[80px] rounded-lg border border-border bg-background p-2.5 text-center">
      <p className="font-mono text-lg font-bold text-foreground leading-none">{value}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
      {children}
    </div>
  );
}

export default DemoScanner;
