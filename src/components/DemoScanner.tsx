import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { GlowCard } from "@/components/ui-boris";
import { ExternalLink, CheckCircle, XCircle, AlertTriangle, Send, Shield, Eye } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const API_BASE = import.meta.env.VITE_API_URL || "https://api.black-oracle.com";

const POLL_INTERVAL = 5000;
const TIMEOUT_MS = 20 * 60 * 1000;

const LS_TASK_ID = "boris_demo_taskId";
const LS_INPUT = "boris_demo_input";
const LS_START_TIME = "boris_demo_startTime";

interface DemoResult {
  target: string;
  verdict: string;
  patterns_total: number;
  patterns_critical: number;
  patterns_high: number;
  facts: string[];
  archetype?: string;
  archetype_icon?: string;
  audits_count?: number;
  liquidity?: string;
  social_accounts?: number;
  impersonators?: number;
  top10_holders_pct?: number;
  layers_scanned?: Record<string, boolean> | string[];
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

// --- Result helpers ---

function shortenAddress(addr: string): string {
  if (/^0x[0-9a-fA-F]{40}$/.test(addr)) {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  }
  if (/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(addr)) {
    return `${addr.slice(0, 5)}...${addr.slice(-4)}`;
  }
  return addr;
}

function detectNetwork(target: string): { name: string; explorer: string; icon: string } | null {
  const t = target.trim();
  if (/^0x[0-9a-fA-F]{40}$/.test(t)) {
    return { name: "Ethereum", explorer: `https://etherscan.io/address/${t}`, icon: "⟠" };
  }
  if (/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(t)) {
    return { name: "Tron", explorer: `https://tronscan.org/#/address/${t}`, icon: "◈" };
  }
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(t) && !t.includes("/")) {
    return { name: "Solana", explorer: `https://solscan.io/account/${t}`, icon: "◎" };
  }
  return null;
}

const verdictConfig: Record<string, { color: string; bg: string; border: string; label: string; labelRu: string }> = {
  CRITICAL: { color: "text-red-400", bg: "bg-red-500/15", border: "border-red-500/50", label: "CRITICAL RISK", labelRu: "КРИТИЧЕСКИЙ РИСК" },
  HIGH: { color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/40", label: "HIGH RISK", labelRu: "ВЫСОКИЙ РИСК" },
  MEDIUM: { color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/40", label: "MEDIUM RISK", labelRu: "СРЕДНИЙ РИСК" },
  LOW: { color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/40", label: "LOW RISK", labelRu: "НИЗКИЙ РИСК" },
};

function clearPersistence() {
  localStorage.removeItem(LS_TASK_ID);
  localStorage.removeItem(LS_INPUT);
  localStorage.removeItem(LS_START_TIME);
}

const DemoScanner = () => {
  const { t, i18n } = useTranslation();
  const isRu = i18n.language === "ru";

  const [input, setInput] = useState("");
  const [state, setState] = useState<ScanState>("idle");
  const [result, setResult] = useState<DemoResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [validationError, setValidationError] = useState("");
  const [taskId, setTaskId] = useState<string | null>(null);
  const [progressValue, setProgressValue] = useState(0);
  const [tail, setTail] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState("");
  const scanStartTime = useRef<number>(0);

  const getStepText = useCallback((step: string): string => {
    switch (step) {
      case "queued":
        return isRu ? "⏳ Ожидание в очереди..." : "⏳ Waiting in queue...";
      case "cloning":
        return isRu ? "📦 Загрузка исходного кода..." : "📦 Fetching source code...";
      case "static_analysis":
        return isRu ? "🔍 Статический анализ" : "🔍 Static analysis";
      case "done":
        return isRu ? "✅ Завершено" : "✅ Complete";
      default:
        return isRu ? "📊 Анализ..." : "📊 Analyzing...";
    }
  }, [isRu]);

  // Restore persisted scan on mount
  useEffect(() => {
    const savedTaskId = localStorage.getItem(LS_TASK_ID);
    const savedInput = localStorage.getItem(LS_INPUT);
    const savedStartTime = localStorage.getItem(LS_START_TIME);

    if (savedTaskId && savedInput) {
      const startTime = savedStartTime ? parseInt(savedStartTime, 10) : Date.now();
      if (Date.now() - startTime > TIMEOUT_MS) {
        clearPersistence();
        return;
      }
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
      setValidationError(
        isRu
          ? "Введите адрес контракта (0x...) или ссылку на GitHub репозиторий"
          : "Enter a contract address (0x...) or a GitHub repository link"
      );
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
        setErrorMsg(
          isRu
            ? "Лимит демо исчерпан. Используйте Telegram: @BlackOracleBORIS_bot"
            : "Demo limit reached. Use Telegram: @BlackOracleBORIS_bot"
        );
        setState("error");
        return;
      }

      if (!res.ok) throw new Error("API error");

      const data = await res.json();
      const newTaskId = data.task_id;
      setTaskId(newTaskId);

      // Persist to localStorage
      localStorage.setItem(LS_TASK_ID, newTaskId);
      localStorage.setItem(LS_INPUT, trimmed);
      localStorage.setItem(LS_START_TIME, String(scanStartTime.current));
    } catch {
      setErrorMsg(
        isRu
          ? "⚠️ Сервер анализа недоступен. Telegram: @BlackOracleBORIS_bot"
          : "⚠️ Analysis server unavailable. Telegram: @BlackOracleBORIS_bot"
      );
      setState("error");
    }
  }, [input, isRu]);

  // Poll for results
  useEffect(() => {
    if (!taskId || state !== "scanning") return;
    const interval = setInterval(async () => {
      if (Date.now() - scanStartTime.current > TIMEOUT_MS) {
        setErrorMsg(
          isRu
            ? "Сканирование занимает больше времени, чем ожидалось. Проверьте результат в Telegram: @BlackOracleBORIS_bot"
            : "Scan is taking longer than expected. Check Telegram bot for results: @BlackOracleBORIS_bot"
        );
        setState("error");
        clearPersistence();
        clearInterval(interval);
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/api/demo-scan/status/${taskId}`);

        if (res.status === 429) {
          setErrorMsg(
            isRu
              ? "Лимит демо исчерпан. Используйте Telegram: @BlackOracleBORIS_bot"
              : "Demo limit reached. Use Telegram: @BlackOracleBORIS_bot"
          );
          setState("error");
          clearPersistence();
          clearInterval(interval);
          return;
        }

        if (!res.ok) throw new Error("Poll error");
        const data = await res.json();

        if (data.status === "done") {
          setResult(data as DemoResult);
          setState("done");
          clearPersistence();
          clearInterval(interval);
        } else if (data.status === "error") {
          setErrorMsg(data.message || "Unknown error");
          setState("error");
          clearPersistence();
          clearInterval(interval);
        } else if (data.status === "scanning") {
          if (typeof data.progress === "number") {
            setProgressValue(data.progress);
          }
          if (Array.isArray(data.tail)) {
            setTail(data.tail);
          }
          if (data.step) {
            setCurrentStep(getStepText(data.step));
          }
        }
      } catch {
        // keep polling on network errors
      }
    }, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [taskId, state, isRu, getStepText]);

  // Clear validation error when input changes
  useEffect(() => {
    if (validationError) setValidationError("");
  }, [input]);

  const network = result ? detectNetwork(input.trim()) : null;
  const isContract = /^(0x[0-9a-fA-F]{40}|T[1-9A-HJ-NP-Za-km-z]{33}|[1-9A-HJ-NP-Za-km-z]{32,44})$/.test(input.trim());
  const isGithub = PATTERNS.githubUrl.test(input.trim()) || PATTERNS.githubShort.test(input.trim());

  return (
    <section id="demo-scanner" className="container mx-auto px-4 py-20">
      <h2 className="mb-2 text-3xl font-bold text-foreground md:text-4xl">
        {isRu ? "Проверь проект" : "Scan a Project"}
      </h2>
      <p className="mb-8 font-mono text-sm text-muted-foreground">
        {isRu
          ? "Вставь ссылку на GitHub репозиторий или адрес смарт-контракта"
          : "Paste a GitHub repo URL or smart contract address"}
      </p>

      {/* Input */}
      <div className="flex gap-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && startScan()}
          placeholder={
            isRu
              ? "github.com/protocol/repo или 0x1234...abcd"
              : "github.com/protocol/repo or 0x1234...abcd"
          }
          disabled={state === "scanning"}
          className="flex-1 rounded-xl border border-border bg-card py-4 px-5 font-mono text-sm text-foreground outline-none transition-all focus:border-primary focus:shadow-[0_0_20px_hsl(var(--primary)/0.3)] disabled:opacity-50"
        />
        <button
          onClick={startScan}
          disabled={state === "scanning" || !input.trim()}
          className="rounded-xl bg-primary px-6 py-4 font-semibold text-primary-foreground transition-all hover:bg-primary-dim btn-glow disabled:opacity-50 whitespace-nowrap"
        >
          {state === "scanning"
            ? isRu ? "Анализ..." : "Analyzing..."
            : isRu ? "Запустить анализ" : "Run Analysis"}
        </button>
      </div>

      {/* Validation error */}
      {validationError && (
        <p className="mt-2 font-mono text-xs text-red-400">{validationError}</p>
      )}

      <p className="mt-2 font-mono text-xs text-muted-foreground">
        {isRu
          ? "Бесплатный GUEST-отчёт. ~3-15 мин на полный скан."
          : "Free GUEST report. ~3-15 min for full scan."}
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
              <p className="mt-1 font-mono text-xs text-muted-foreground text-right">
                {Math.round(progressValue * 100)}%
              </p>
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
            {isRu
              ? "Это реальный анализ. Полное сканирование может занять до 15 минут."
              : "This is a real scan. Full analysis may take up to 15 minutes."}
          </p>
        </div>
      )}

      {/* Error State */}
      {state === "error" && (
        <div className="mt-8 rounded-xl border border-red-500/50 bg-red-500/10 p-6">
          <p className="font-mono text-sm text-red-400">{errorMsg}</p>
          {errorMsg.includes("@BlackOracleBORIS_bot") && (
            <a
              href="https://t.me/BlackOracleBORIS_bot"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-2 font-mono text-sm text-primary hover:underline"
            >
              <Send size={14} /> @BlackOracleBORIS_bot
            </a>
          )}
        </div>
      )}

      {/* Result State — Redesigned GUEST Report */}
      {state === "done" && result && (() => {
        const verdict = result.verdict?.toUpperCase() || "LOW";
        const vc = verdictConfig[verdict] || verdictConfig.LOW;

        return (
          <div className="mt-8 rounded-xl border border-primary/30 bg-card shadow-[0_0_40px_hsl(var(--primary)/0.1)] overflow-hidden">
            {/* === HEADER === */}
            <div className="border-b border-border bg-card px-6 py-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-2">
                  {/* Target */}
                  <div className="flex items-center gap-2">
                    <Eye size={16} className="text-primary shrink-0" />
                    <span className="font-mono text-lg font-bold text-foreground">
                      {isContract ? shortenAddress(input.trim()) : (result.target || input.trim())}
                    </span>
                    {result.archetype && (
                      <span className="rounded border border-border px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                        {result.archetype_icon || ""} {result.archetype}
                      </span>
                    )}
                  </div>

                  {/* Network / Source */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground font-mono">
                    {network && (
                      <a
                        href={network.explorer}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 hover:text-primary transition-colors"
                      >
                        <span>{network.icon}</span> {network.name}
                        <ExternalLink size={10} />
                      </a>
                    )}
                    {isGithub && (
                      <a
                        href={input.trim().startsWith("http") ? input.trim() : `https://github.com/${input.trim()}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 hover:text-primary transition-colors"
                      >
                        GitHub <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                </div>

                {/* Verdict Badge */}
                <div className={`self-start rounded-lg px-4 py-2 font-mono text-sm font-bold ${vc.bg} ${vc.border} border ${vc.color}`}>
                  <Shield size={14} className="inline mr-1.5 -mt-0.5" />
                  {isRu ? vc.labelRu : vc.label}
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* === SUMMARY === */}
              <div>
                <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2 font-mono">
                  {isRu ? "Краткое заключение" : "Summary"}
                </h3>
                <p className="text-sm text-foreground/90 leading-relaxed">
                  {isRu
                    ? `Автоматический анализ выявил ${result.patterns_total} паттернов, из которых ${result.patterns_critical} классифицированы как критические и ${result.patterns_high} как высокоприоритетные. Рекомендуется детальный анализ для оценки реальной эксплуатируемости.`
                    : `Automated analysis identified ${result.patterns_total} patterns, of which ${result.patterns_critical} are classified as critical and ${result.patterns_high} as high-priority. Detailed analysis is recommended to assess real exploitability.`}
                </p>
              </div>

              <div className="border-t border-dashed border-primary/20" />

              {/* === KEY OBSERVATIONS === */}
              {result.facts && result.facts.length > 0 && (
                <div>
                  <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3 font-mono">
                    {isRu ? "Ключевые наблюдения" : "Key Observations"}
                  </h3>
                  <ul className="space-y-2">
                    {result.facts.slice(0, 8).map((fact, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="text-primary mt-0.5 shrink-0">▸</span>
                        <span className="text-foreground/80">{fact}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="border-t border-dashed border-primary/20" />

              {/* === WARNING === */}
              <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
                <p className="text-xs text-yellow-400">
                  <AlertTriangle size={14} className="inline mr-1.5" />
                  {isRu
                    ? "Это не означает эксплуатацию. Это означает наличие поверхности риска."
                    : "This does not imply exploitation. It indicates risk surface."}
                </p>
              </div>

              <div className="border-t border-dashed border-primary/20" />

              {/* === ANALYSIS SCOPE === */}
              <div>
                <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3 font-mono">
                  {isRu ? "Проведённый анализ" : "Analysis Scope"}
                </h3>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {(result.layers_scanned && result.layers_scanned.length > 0
                    ? result.layers_scanned
                    : ["code", "social", "holders", "liquidity"]
                  ).map((layer, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <CheckCircle size={14} className="text-green-500 shrink-0" />
                      <span className="text-foreground/80 capitalize">{layer} — {isRu ? "проанализирован" : "analyzed"}</span>
                    </div>
                  ))}
                </div>

                {/* Extra stats */}
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {result.social_accounts != null && (
                    <div className="rounded-lg border border-border bg-background p-3 text-center">
                      <p className="font-mono text-lg font-bold text-foreground">{result.social_accounts}</p>
                      <p className="text-[10px] text-muted-foreground">{isRu ? "Соц. аккаунтов" : "Social accounts"}</p>
                    </div>
                  )}
                  {result.impersonators != null && result.impersonators > 0 && (
                    <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-center">
                      <p className="font-mono text-lg font-bold text-red-400">{result.impersonators}</p>
                      <p className="text-[10px] text-muted-foreground">{isRu ? "Имперсонаторов" : "Impersonators"}</p>
                    </div>
                  )}
                  {result.top10_holders_pct != null && (
                    <div className="rounded-lg border border-border bg-background p-3 text-center">
                      <p className="font-mono text-lg font-bold text-foreground">{result.top10_holders_pct}%</p>
                      <p className="text-[10px] text-muted-foreground">{isRu ? "Top-10 холдеров" : "Top-10 holders"}</p>
                    </div>
                  )}
                  {result.audits_count != null && (
                    <div className="rounded-lg border border-border bg-background p-3 text-center">
                      <p className="font-mono text-lg font-bold text-foreground">{result.audits_count}</p>
                      <p className="text-[10px] text-muted-foreground">{isRu ? "Аудитов" : "Audits"}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t-2 border-primary/40" />

              {/* === UPGRADE CARDS === */}
              <div>
                <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-4 font-mono">
                  {isRu ? "Доступно в полном отчёте" : "Available in Full Report"}
                </h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="rounded-lg border-l-4 border-l-yellow-500 border border-border bg-background p-4">
                    <p className="font-bold text-foreground mb-2">🔒 RADAR</p>
                    <ul className="space-y-1 text-xs text-muted-foreground">
                      <li>• {isRu ? "Карта рисков, концентрация холдеров" : "Risk map, holder concentration"}</li>
                      <li>• {isRu ? "Wash trading, ликвидность пулов" : "Wash trading, liquidity pools"}</li>
                      <li>• {isRu ? "Governance и admin breakdown" : "Governance & admin breakdown"}</li>
                      <li>• {isRu ? "Аудит drift и покрытие" : "Audit drift & coverage"}</li>
                    </ul>
                  </div>
                  <div className="rounded-lg border-l-4 border-l-orange-500 border border-border bg-background p-4">
                    <p className="font-bold text-foreground mb-2">📋 RAW</p>
                    <ul className="space-y-1 text-xs text-muted-foreground">
                      <li>• {isRu ? "Полный список находок с номерами строк" : "Full findings with line numbers"}</li>
                      <li>• {isRu ? "Все детекторы без фильтрации" : "All detectors unfiltered"}</li>
                      <li>• {isRu ? "Холдеры, ликвидность, деплойменты" : "Holders, liquidity, deployments"}</li>
                      <li>• {isRu ? "Технический дамп — только факты" : "Technical dump — facts only"}</li>
                    </ul>
                  </div>
                  <div className="rounded-lg border-l-4 border-l-primary border border-primary/30 bg-background p-4 shadow-[0_0_20px_hsl(var(--primary)/0.15)]">
                    <p className="font-bold text-foreground mb-2">🔥 BLACKBOX</p>
                    <ul className="space-y-1 text-xs text-muted-foreground">
                      <li>• {isRu ? "Пошаговые exploit paths" : "Step-by-step exploit paths"}</li>
                      <li>• {isRu ? "Pool-by-pool анализ" : "Pool-by-pool analysis"}</li>
                      <li>• {isRu ? "CEX листинги, кластеры адресов" : "CEX listings, address clusters"}</li>
                      <li>• {isRu ? "Полный инженерный разбор" : "Full engineering breakdown"}</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* CTA */}
              <div className="text-center pt-2">
                <a
                  href="https://t.me/BlackOracleBORIS_bot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 rounded-xl bg-primary px-10 py-4 font-semibold text-primary-foreground transition-all hover:bg-primary-dim btn-glow text-base"
                >
                  <Send size={18} />
                  {isRu ? "Открыть полный отчёт в Telegram" : "Get Full Report in Telegram"}
                </a>
              </div>

              {/* Footer */}
              <div className="border-t border-border pt-3 text-center">
                <p className="text-[10px] text-muted-foreground">
                  BORIS — {isRu
                    ? "автоматизированная система инспекции. Отчёт носит информационный характер. Интерпретация — ответственность читателя."
                    : "automated inspection system. Report is informational. Interpretation is reader's responsibility."}
                </p>
              </div>
            </div>
          </div>
        );
      })()}
    </section>
  );
};

export default DemoScanner;
