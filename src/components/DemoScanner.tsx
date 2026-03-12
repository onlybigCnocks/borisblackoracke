import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { GlowCard } from "@/components/ui-boris";
import { ExternalLink, CheckCircle, XCircle, AlertTriangle, Send } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const API_BASE = import.meta.env.VITE_API_URL || "https://api.black-oracle.com";

const POLL_INTERVAL = 5000;
const TIMEOUT_MS = 20 * 60 * 1000; // 20 minutes

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

const DemoScanner = () => {
  const { t, i18n } = useTranslation();
  const isRu = i18n.language === "ru";

  const [input, setInput] = useState("");
  const [state, setState] = useState<ScanState>("idle");
  const [result, setResult] = useState<ScanResultData | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
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
    if (!input.trim()) return;
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
        body: JSON.stringify({ target: input.trim(), tier: "guest", user_id: "web-demo" }),
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
      // Timeout check
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
              ? "Лимит демо исчерпан. Используйте Telegram: @BlackOracleBot"
              : "Demo limit reached. Use Telegram: @BlackOracleBot"
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
          // queued or started
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

  const getVerdict = (counts: ScanResultData["counts"]) => {
    if (counts.critical >= 3) return "HIGH";
    if (counts.critical >= 1) return "MEDIUM";
    return "LOW";
  };

  const verdictColors: Record<string, string> = {
    HIGH: "bg-red-500 text-white",
    MEDIUM: "bg-yellow-500 text-black",
    LOW: "bg-green-500 text-black",
  };

  const verdictLabels: Record<string, string> = {
    HIGH: "HIGH RISK",
    MEDIUM: "MEDIUM RISK",
    LOW: "LOW RISK",
  };

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

          {/* Current step */}
          <div className="mb-3 flex items-center gap-3 font-mono text-sm">
            <CheckCircle size={14} className="text-green-500 shrink-0" />
            <span className="text-muted-foreground">{currentStep}</span>
          </div>

          {/* Progress bar */}
          {progress && progress.progress > 0 && (
            <div className="mb-3">
              <Progress value={progress.progress * 100} className="h-2" />
              <p className="mt-1 font-mono text-xs text-muted-foreground text-right">
                {Math.round(progress.progress * 100)}%
              </p>
            </div>
          )}

          {/* Live tail output */}
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
          {errorMsg.includes("@BlackOracleBot") && (
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

      {/* Result State */}
      {state === "done" && result && (() => {
        const verdict = getVerdict(result.counts);
        const findings = result.top_findings.slice(0, 8);

        return (
          <div className="mt-8 rounded-xl border border-primary/30 bg-card shadow-[0_0_40px_hsl(var(--primary)/0.1)] overflow-hidden">
            {/* Top bar */}
            <div className="flex items-center justify-between border-b border-border bg-card px-6 py-3">
              <span className="font-mono text-sm font-bold text-foreground">👁️ BORIS — PREVIEW</span>
              <span className={`rounded px-3 py-1 font-mono text-xs font-bold ${verdictColors[verdict]}`}>
                {verdictLabels[verdict]}
              </span>
            </div>

            {/* Body */}
            <div className="p-6 font-mono text-sm space-y-4">
              {/* Target info */}
              <div className="space-y-1">
                <p className="text-muted-foreground">
                  {isRu ? "Цель" : "Target"}: <span className="text-foreground">{result.project}</span>
                </p>
                <p className="text-muted-foreground">
                  {isRu ? "Дата" : "Date"}: <span className="text-foreground">{result.scan_date}</span>
                </p>
              </div>

              <div className="border-t border-dashed border-primary/30" />

              {/* Stats grid */}
              <div>
                <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wider">
                  {isRu ? "Масштаб анализа:" : "Analysis scope:"}
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="rounded-lg border border-border bg-background p-3">
                    <p className="text-xs text-muted-foreground">📊 {isRu ? "Паттерны" : "Patterns"}</p>
                    <p className="text-foreground font-bold">{result.counts.total} <span className="text-xs font-normal text-muted-foreground">({result.counts.critical}C / {result.counts.high}H)</span></p>
                  </div>
                  <div className="rounded-lg border border-border bg-background p-3">
                    <p className="text-xs text-muted-foreground">📨 {isRu ? "Соцсети" : "Social"}</p>
                    <p className="text-foreground font-bold">
                      {result.social_summary.total_accounts} {isRu ? "акк." : "acc."}
                      <span className="text-xs font-normal text-muted-foreground ml-1">
                        ({result.social_summary.impersonators_found} {isRu ? "имперс." : "impers."})
                      </span>
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-background p-3">
                    <p className="text-xs text-muted-foreground">🎯 {isRu ? "Соц. скор" : "Social score"}</p>
                    <p className="text-foreground font-bold">{result.social_score}/100</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-dashed border-primary/30" />

              {/* Findings */}
              <div>
                <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">
                  {isRu ? "Топ находки:" : "Top findings:"}
                </p>
                <ul className="space-y-1">
                  {findings.map((f, i) => (
                    <li key={i} className="text-xs text-muted-foreground">
                      • <span className={f.severity === "CRITICAL" ? "text-red-400 font-bold" : f.severity === "HIGH" ? "text-orange-400 font-semibold" : "text-yellow-400"}>{f.severity}</span>: {f.description} <span className="text-muted-foreground/60">({f.file})</span>
                    </li>
                  ))}
                </ul>
                {result.more_count > 0 && (
                  <p className="mt-2 text-xs text-muted-foreground italic">
                    ...{isRu ? `и ещё ${result.more_count} находок в полном отчёте` : `and ${result.more_count} more findings in full report`}
                  </p>
                )}
              </div>

              <div className="border-t border-dashed border-primary/30" />

              {/* Warning */}
              <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
                <p className="text-xs text-yellow-400">
                  <AlertTriangle size={14} className="inline mr-1" />
                  {isRu
                    ? "Это не означает эксплуатацию. Это означает наличие поверхности риска."
                    : "This does not mean exploitation. It means the presence of a risk surface."}
                </p>
              </div>

              <div className="border-t-2 border-primary/50" />

              {/* Upgrade cards */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-lg border-l-4 border-l-yellow-500 border border-border bg-background p-4">
                  <p className="font-bold text-foreground mb-2">🔒 RADAR</p>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    <li>• {isRu ? "Карта рисков по доменам" : "Risk map by domains"}</li>
                    <li>• {isRu ? "Governance и admin breakdown" : "Governance & admin breakdown"}</li>
                    <li>• {isRu ? "Аудит drift и покрытие" : "Audit drift & coverage"}</li>
                    <li>• {isRu ? "Социальный профиль" : "Social profile"}</li>
                  </ul>
                </div>
                <div className="rounded-lg border-l-4 border-l-orange-500 border border-border bg-background p-4">
                  <p className="font-bold text-foreground mb-2">📋 RAW</p>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    <li>• {isRu ? "Полный список находок с номерами строк" : "Full findings list with line numbers"}</li>
                    <li>• {isRu ? "Все детекторы без фильтрации" : "All detectors unfiltered"}</li>
                    <li>• {isRu ? "Холдеры, ликвидность, деплойменты" : "Holders, liquidity, deployments"}</li>
                    <li>• {isRu ? "Технический дамп — только факты" : "Technical dump — facts only"}</li>
                  </ul>
                </div>
                <div className="rounded-lg border-l-4 border-l-primary border border-primary/30 bg-background p-4 shadow-[0_0_20px_hsl(var(--primary)/0.15)]">
                  <p className="font-bold text-foreground mb-2">🔥 BLACKBOX</p>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    <li>• {isRu ? "file:line всех уязвимостей" : "file:line of all vulnerabilities"}</li>
                    <li>• {isRu ? "Пошаговые exploit paths" : "Step-by-step exploit paths"}</li>
                    <li>• {isRu ? "Полный инженерный разбор" : "Full engineering breakdown"}</li>
                    <li>• {isRu ? "Fund flow и акторы" : "Fund flow & actors"}</li>
                  </ul>
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
                  {isRu ? "Получить полный отчёт в Telegram" : "Get Full Report in Telegram"}
                </a>
              </div>

              {/* Footer */}
              <div className="border-t border-border pt-3 text-center">
                <p className="text-[10px] text-muted-foreground">
                  Tier: 👁️ GUEST | BORIS — {isRu ? "автоматизированная система инспекции" : "automated inspection system"}.
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
