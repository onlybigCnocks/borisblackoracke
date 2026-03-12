import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { GlowCard } from "@/components/ui-boris";
import { ExternalLink, CheckCircle, XCircle, AlertTriangle, Send } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "https://boris-api.example.com";

interface ScanResult {
  target: string;
  source_url: string;
  archetype: string;
  archetype_icon: string;
  verdict: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "SAFE";
  patterns_total: number;
  patterns_critical: number;
  patterns_high: number;
  audits_count: number;
  audit_age_days: number;
  liquidity: string;
  social_accounts: number;
  impersonators: number;
  top10_holders_pct: number;
  facts: string[];
  layers_scanned: {
    social: boolean;
    audit: boolean;
    fund_flow: boolean;
    liquidity: boolean;
  };
}

type ScanState = "idle" | "scanning" | "done" | "error";

const SCAN_STEPS_EN = [
  "📦 Cloning repository...",
  "🔍 Static code analysis...",
  "🔗 On-chain reconnaissance...",
  "📱 Social intelligence...",
  "🛡️ Audit verification...",
  "📊 Data correlation...",
];

const SCAN_STEPS_RU = [
  "📦 Клонирование репозитория...",
  "🔍 Статический анализ кода...",
  "🔗 On-chain разведка...",
  "📱 Социальная разведка...",
  "🛡️ Проверка аудитов...",
  "📊 Корреляция данных...",
];

const DemoScanner = () => {
  const { t, i18n } = useTranslation();
  const isRu = i18n.language === "ru";

  const [input, setInput] = useState("");
  const [state, setState] = useState<ScanState>("idle");
  const [visibleSteps, setVisibleSteps] = useState<number[]>([]);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [taskId, setTaskId] = useState<string | null>(null);

  const steps = isRu ? SCAN_STEPS_RU : SCAN_STEPS_EN;

  const startScan = useCallback(async () => {
    if (!input.trim()) return;
    setState("scanning");
    setVisibleSteps([]);
    setResult(null);
    setErrorMsg("");

    try {
      const res = await fetch(`${API_BASE}/api/demo-scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: input.trim() }),
      });

      if (!res.ok) throw new Error("API error");

      const data = await res.json();
      setTaskId(data.task_id);
    } catch {
      setErrorMsg(
        isRu
          ? "⚠️ Сервер анализа недоступен. Используйте Telegram бот: @BlackOracleBot"
          : "⚠️ Analysis server unavailable. Use Telegram bot: @BlackOracleBot"
      );
      setState("error");
    }
  }, [input, isRu]);

  // Animate steps appearing
  useEffect(() => {
    if (state !== "scanning") return;
    let step = 0;
    const interval = setInterval(() => {
      if (step < steps.length) {
        setVisibleSteps((prev) => [...prev, step]);
        step++;
      } else {
        clearInterval(interval);
      }
    }, 2500);
    return () => clearInterval(interval);
  }, [state, steps.length]);

  // Poll for results
  useEffect(() => {
    if (!taskId || state !== "scanning") return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/demo-scan/status/${taskId}`);
        if (!res.ok) throw new Error("Poll error");
        const data = await res.json();

        if (data.status === "done") {
          setResult(data as ScanResult);
          setState("done");
          clearInterval(interval);
        } else if (data.status === "error") {
          setErrorMsg(data.message || "Unknown error");
          setState("error");
          clearInterval(interval);
        }
      } catch {
        // keep polling
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [taskId, state]);

  const verdictColors: Record<string, string> = {
    CRITICAL: "bg-red-600 text-white",
    HIGH: "bg-red-500 text-white",
    MEDIUM: "bg-yellow-500 text-black",
    LOW: "bg-green-500 text-black",
    SAFE: "bg-green-600 text-white",
  };

  const verdictLabels: Record<string, string> = {
    CRITICAL: "CRITICAL RISK",
    HIGH: "HIGH RISK",
    MEDIUM: "MEDIUM RISK",
    LOW: "LOW RISK",
    SAFE: "SAFE",
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
          <div className="space-y-2">
            {steps.map((step, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 font-mono text-sm transition-all duration-500 ${
                  visibleSteps.includes(i) ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 h-0 overflow-hidden"
                }`}
              >
                <CheckCircle size={14} className="text-green-500 shrink-0" />
                <span className="text-muted-foreground">{step}</span>
              </div>
            ))}
          </div>
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
              href="https://t.me/BlackOracleBot"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-2 font-mono text-sm text-primary hover:underline"
            >
              <Send size={14} /> @BlackOracleBot
            </a>
          )}
        </div>
      )}

      {/* Result State */}
      {state === "done" && result && (
        <div className="mt-8 rounded-xl border border-primary/30 bg-card shadow-[0_0_40px_hsl(var(--primary)/0.1)] overflow-hidden">
          {/* Top bar */}
          <div className="flex items-center justify-between border-b border-border bg-card px-6 py-3">
            <span className="font-mono text-sm font-bold text-foreground">👁️ BORIS — PREVIEW</span>
            <span className={`rounded px-3 py-1 font-mono text-xs font-bold ${verdictColors[result.verdict] || "bg-muted text-foreground"}`}>
              {verdictLabels[result.verdict] || result.verdict}
            </span>
          </div>

          {/* Body */}
          <div className="p-6 font-mono text-sm space-y-4">
            {/* Target info */}
            <div className="space-y-1">
              <p className="text-muted-foreground">
                {isRu ? "Цель" : "Target"}: <span className="text-foreground">{result.target}</span>
              </p>
              <p className="text-muted-foreground">
                {isRu ? "Источник" : "Source"}:{" "}
                <a href={result.source_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                  GitHub <ExternalLink size={12} />
                </a>
              </p>
              <p className="text-muted-foreground">
                🏗 {isRu ? "Тип" : "Type"}: <span className="text-foreground">{result.archetype_icon} {result.archetype}</span>
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
                  <p className="text-foreground font-bold">{result.patterns_total} <span className="text-xs font-normal text-muted-foreground">({result.patterns_critical}C / {result.patterns_high}H)</span></p>
                </div>
                <div className="rounded-lg border border-border bg-background p-3">
                  <p className="text-xs text-muted-foreground">🛡️ {isRu ? "Аудиты" : "Audits"}</p>
                  <p className="text-foreground font-bold">{result.audits_count} <span className="text-xs font-normal text-muted-foreground">({result.audit_age_days}d)</span></p>
                </div>
                <div className="rounded-lg border border-border bg-background p-3">
                  <p className="text-xs text-muted-foreground">💧 {isRu ? "Ликвидность" : "Liquidity"}</p>
                  <p className="text-foreground font-bold">{result.liquidity}</p>
                </div>
                <div className="rounded-lg border border-border bg-background p-3">
                  <p className="text-xs text-muted-foreground">📨 {isRu ? "Соцсети" : "Social"}</p>
                  <p className="text-foreground font-bold">{result.social_accounts} <span className="text-xs font-normal text-muted-foreground">{isRu ? "проанализировано" : "analyzed"}</span></p>
                </div>
                <div className="rounded-lg border border-border bg-background p-3">
                  <p className="text-xs text-muted-foreground">👥 Top-10 {isRu ? "холдеров" : "holders"}</p>
                  <p className="text-foreground font-bold">{result.top10_holders_pct}%</p>
                </div>
              </div>
            </div>

            <div className="border-t border-dashed border-primary/30" />

            {/* Facts */}
            <div>
              <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">
                {isRu ? "Наблюдаемые факты:" : "Observed facts:"}
              </p>
              <ul className="space-y-1">
                {result.facts.map((f, i) => (
                  <li key={i} className="text-xs text-muted-foreground">• {f}</li>
                ))}
              </ul>
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

            <div className="border-t border-dashed border-primary/30" />

            {/* Layers scanned */}
            <div>
              <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">
                {isRu ? "Проведённый анализ:" : "Analysis performed:"}
              </p>
              <div className="space-y-1 text-xs">
                {[
                  { key: "social", icon: "📱", ru: "Социальный слой", en: "Social layer" },
                  { key: "audit", icon: "🛡️", ru: "Аудит-контекст", en: "Audit context" },
                  { key: "fund_flow", icon: "🔗", ru: "Fund flow", en: "Fund flow" },
                  { key: "liquidity", icon: "💧", ru: "Ликвидность и биржи", en: "Liquidity & exchanges" },
                ].map((layer) => {
                  const done = result.layers_scanned[layer.key as keyof typeof result.layers_scanned];
                  return (
                    <div key={layer.key} className="flex items-center gap-2 text-muted-foreground">
                      {done ? <CheckCircle size={12} className="text-green-500" /> : <XCircle size={12} className="text-red-500" />}
                      {layer.icon} {isRu ? layer.ru : layer.en} — {isRu ? (done ? "проанализирован" : "нет данных") : (done ? "analyzed" : "no data")}
                    </div>
                  );
                })}
              </div>
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
                href="https://t.me/BlackOracleBot"
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
      )}
    </section>
  );
};

export default DemoScanner;
