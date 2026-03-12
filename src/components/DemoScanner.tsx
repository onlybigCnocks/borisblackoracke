import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { GlowCard } from "@/components/ui-boris";
import { ExternalLink, CheckCircle, XCircle, AlertTriangle, Send, Shield, Eye } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const API_BASE = import.meta.env.VITE_API_URL || "https://api.black-oracle.com";

const POLL_INTERVAL = 5000;
const TIMEOUT_MS = 20 * 60 * 1000;

interface ScanResultData {
  tier: string;
  project: string;
  scan_date: string;
  counts: { critical: number; high: number; medium: number; low: number; total: number };
  top_findings: { type: string; severity: string; file: string; description: string }[];
  more_count: number;
  social_score: number;
  social_summary: { total_accounts: number; impersonators_found: number };
  download_allowed: boolean;
}

interface ProgressData {
  stage: string;
  progress: number;
  current_file?: string;
  tail?: string[];
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

function getVerdict(counts: ScanResultData["counts"]): "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" {
  if (counts.critical >= 5) return "CRITICAL";
  if (counts.critical >= 3) return "HIGH";
  if (counts.critical >= 1) return "MEDIUM";
  return "LOW";
}

const verdictConfig: Record<string, { color: string; bg: string; border: string; label: string; labelRu: string }> = {
  CRITICAL: { color: "text-red-400", bg: "bg-red-500/15", border: "border-red-500/50", label: "CRITICAL RISK", labelRu: "КРИТИЧЕСКИЙ РИСК" },
  HIGH: { color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/40", label: "HIGH RISK", labelRu: "ВЫСОКИЙ РИСК" },
  MEDIUM: { color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/40", label: "MEDIUM RISK", labelRu: "СРЕДНИЙ РИСК" },
  LOW: { color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/40", label: "LOW RISK", labelRu: "НИЗКИЙ РИСК" },
};

function generateNarrative(result: ScanResultData, isRu: boolean): string {
  const { counts, top_findings } = result;
  const severityTypes = top_findings.map(f => f.type.toLowerCase());
  const hasReentrancy = severityTypes.some(t => t.includes("reentrancy"));
  const hasAccessControl = severityTypes.some(t => t.includes("access") || t.includes("privilege") || t.includes("admin"));
  const hasMinting = severityTypes.some(t => t.includes("mint") || t.includes("emission"));

  if (isRu) {
    let text = `Автоматический анализ выявил ${counts.total} паттернов, из которых ${counts.critical} классифицированы как критические и ${counts.high} как высокоприоритетные. `;
    if (hasAccessControl) text += "Обнаружены привилегированные функции управления с централизованным контролем. ";
    if (hasReentrancy) text += "Выявлены потенциальные уязвимости reentrancy. ";
    if (hasMinting) text += "Присутствуют функции эмиссии с ограниченным контролем. ";
    text += "Рекомендуется детальный анализ для оценки реальной эксплуатируемости.";
    return text;
  }
  let text = `Automated analysis identified ${counts.total} patterns, of which ${counts.critical} are classified as critical and ${counts.high} as high-priority. `;
  if (hasAccessControl) text += "Privileged management functions with centralized control were detected. ";
  if (hasReentrancy) text += "Potential reentrancy vulnerabilities identified. ";
  if (hasMinting) text += "Minting functions with limited access controls present. ";
  text += "Detailed analysis is recommended to assess real exploitability.";
  return text;
}

function generateObservations(result: ScanResultData, isRu: boolean): string[] {
  const obs: string[] = [];
  const types = result.top_findings.map(f => ({ type: f.type.toLowerCase(), desc: f.description, severity: f.severity }));

  const seen = new Set<string>();
  for (const f of types) {
    if (obs.length >= 6) break;
    let key = "";
    let textRu = "";
    let textEn = "";

    if ((f.type.includes("access") || f.type.includes("privilege") || f.type.includes("admin")) && !seen.has("access")) {
      key = "access"; textRu = "Обнаружены привилегированные функции управления"; textEn = "Privileged management functions detected";
    } else if (f.type.includes("reentrancy") && !seen.has("reentrancy")) {
      key = "reentrancy"; textRu = "Потенциальная уязвимость reentrancy"; textEn = "Potential reentrancy vulnerability";
    } else if ((f.type.includes("mint") || f.type.includes("emission")) && !seen.has("mint")) {
      key = "mint"; textRu = "Функции эмиссии токенов обнаружены"; textEn = "Token minting functions detected";
    } else if (f.type.includes("oracle") && !seen.has("oracle")) {
      key = "oracle"; textRu = "Зависимость от внешних оракулов"; textEn = "External oracle dependency";
    } else if ((f.type.includes("upgrade") || f.type.includes("proxy")) && !seen.has("upgrade")) {
      key = "upgrade"; textRu = "Обновляемый контракт (proxy pattern)"; textEn = "Upgradeable contract (proxy pattern)";
    } else if (f.type.includes("freeze") && !seen.has("freeze")) {
      key = "freeze"; textRu = "Возможность заморозки средств"; textEn = "Fund freeze capability";
    } else if (!seen.has(f.type)) {
      key = f.type; textRu = f.desc; textEn = f.desc;
    }

    if (key && !seen.has(key)) {
      seen.add(key);
      obs.push(isRu ? textRu : textEn);
    }
  }

  if (result.social_summary.impersonators_found > 0 && obs.length < 6) {
    obs.push(isRu
      ? `Обнаружено ${result.social_summary.impersonators_found} аккаунтов-имперсонаторов`
      : `${result.social_summary.impersonators_found} impersonator accounts detected`);
  }

  return obs;
}

const DemoScanner = () => {
  const { t, i18n } = useTranslation();
  const isRu = i18n.language === "ru";

  const [input, setInput] = useState("");
  const [state, setState] = useState<ScanState>("idle");
  const [result, setResult] = useState<ScanResultData | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [validationError, setValidationError] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [currentStep, setCurrentStep] = useState("");
  const scanStartTime = useRef<number>(0);

  const getStepText = useCallback((status: string, prog: ProgressData | null): string => {
    if (status === "queued") {
      return isRu ? "⏳ Ожидание в очереди..." : "⏳ Waiting in queue...";
    }
    if (status === "started" && prog) {
      const stage = prog.stage;
      if (stage === "fetch" || stage === "starting") {
        return isRu ? "📦 Клонирование репозитория..." : "📦 Cloning repository...";
      }
      if (stage === "analyze" || stage === "analyzing") {
        const file = prog.current_file ? `: ${prog.current_file}` : "";
        return isRu ? `🔍 Статический анализ${file}` : `🔍 Static analysis${file}`;
      }
      return isRu ? "📊 Анализ..." : "📊 Analyzing...";
    }
    return isRu ? "📊 Анализ..." : "📊 Analyzing...";
  }, [isRu]);

  const startScan = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    // Validate input
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
    setProgress(null);
    setCurrentStep(isRu ? "⏳ Ожидание в очереди..." : "⏳ Waiting in queue...");
    scanStartTime.current = Date.now();

    try {
      const res = await fetch(`${API_BASE}/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: trimmed, tier: "guest", user_id: "web-demo" }),
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
      setJobId(data.job_id);
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
    if (!jobId || state !== "scanning") return;
    const interval = setInterval(async () => {
      if (Date.now() - scanStartTime.current > TIMEOUT_MS) {
        setErrorMsg(
          isRu
            ? "Сканирование занимает больше времени, чем ожидалось. Проверьте результат в Telegram: @BlackOracleBORIS_bot"
            : "Scan is taking longer than expected. Check Telegram bot for results: @BlackOracleBORIS_bot"
        );
        setState("error");
        clearInterval(interval);
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/scan/${jobId}`);

        if (res.status === 429) {
          setErrorMsg(
            isRu
              ? "Лимит демо исчерпан. Используйте Telegram: @BlackOracleBORIS_bot"
              : "Demo limit reached. Use Telegram: @BlackOracleBORIS_bot"
          );
          setState("error");
          clearInterval(interval);
          return;
        }

        if (!res.ok) throw new Error("Poll error");
        const data = await res.json();

        if (data.status === "finished") {
          setResult(data.result as ScanResultData);
          setState("done");
          clearInterval(interval);
        } else if (data.status === "failed") {
          setErrorMsg(data.error || "Unknown error");
          setState("error");
          clearInterval(interval);
        } else {
          if (data.progress) {
            setProgress(data.progress);
          }
          setCurrentStep(getStepText(data.status, data.progress || null));
        }
      } catch {
        // keep polling on network errors
      }
    }, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [jobId, state, isRu, getStepText]);

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

          {progress && progress.progress > 0 && (
            <div className="mb-3">
              <Progress value={progress.progress * 100} className="h-2" />
              <p className="mt-1 font-mono text-xs text-muted-foreground text-right">
                {Math.round(progress.progress * 100)}%
              </p>
            </div>
          )}

          {progress?.tail && progress.tail.length > 0 && (
            <div className="mt-3 rounded-lg border border-border bg-background p-3 max-h-32 overflow-y-auto">
              {progress.tail.map((line, i) => (
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
        const verdict = getVerdict(result.counts);
        const vc = verdictConfig[verdict];
        const observations = generateObservations(result, isRu);
        const narrative = generateNarrative(result, isRu);

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
                      {isContract ? shortenAddress(input.trim()) : result.project}
                    </span>
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
                    <span>{isRu ? "Дата" : "Date"}: {result.scan_date}</span>
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
              {/* === SUMMARY NARRATIVE === */}
              <div>
                <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2 font-mono">
                  {isRu ? "Краткое заключение" : "Summary"}
                </h3>
                <p className="text-sm text-foreground/90 leading-relaxed">
                  {narrative}
                </p>
              </div>

              <div className="border-t border-dashed border-primary/20" />

              {/* === KEY OBSERVATIONS === */}
              <div>
                <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3 font-mono">
                  {isRu ? "Ключевые наблюдения" : "Key Observations"}
                </h3>
                <ul className="space-y-2">
                  {observations.map((obs, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-primary mt-0.5 shrink-0">▸</span>
                      <span className="text-foreground/80">{obs}</span>
                    </li>
                  ))}
                </ul>
                {result.more_count > 0 && (
                  <p className="mt-3 font-mono text-xs text-muted-foreground italic">
                    ...{isRu ? `и ещё ${result.more_count} находок в полном отчёте` : `and ${result.more_count} more findings in full report`}
                  </p>
                )}
              </div>

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
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle size={14} className="text-green-500 shrink-0" />
                    <span className="text-foreground/80">{isRu ? "Код контракта — проанализирован" : "Contract code — analyzed"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {result.social_summary.total_accounts > 0
                      ? <CheckCircle size={14} className="text-green-500 shrink-0" />
                      : <XCircle size={14} className="text-muted-foreground/50 shrink-0" />}
                    <span className="text-foreground/80">{isRu ? "Социальный слой" : "Social layer"} — {result.social_summary.total_accounts > 0 ? (isRu ? "проанализирован" : "analyzed") : (isRu ? "нет данных" : "no data")}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle size={14} className="text-green-500 shrink-0" />
                    <span className="text-foreground/80">{isRu ? "Холдеры — проанализированы" : "Holders — analyzed"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle size={14} className="text-green-500 shrink-0" />
                    <span className="text-foreground/80">{isRu ? "Ликвидность — проанализирована" : "Liquidity — analyzed"}</span>
                  </div>
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
