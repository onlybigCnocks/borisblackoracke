import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { RevealOnScroll, GlowCard } from "@/components/ui-boris";
import { Search, X, ExternalLink } from "lucide-react";

const EXAMPLES = ["uniswap/v3-core", "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984", "https://etherscan.io/address/0x..."];

const STAGES = ["init", "cloning", "analyzing", "governance", "social", "finalizing"] as const;

interface HistoryItem { target: string; riskLevel: string; date: string; id: string; }

const Scanner = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const [scanning, setScanning] = useState(false);
  const [stage, setStage] = useState(0);
  const [progress, setProgress] = useState(0);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    const h = localStorage.getItem("boris_scan_history");
    if (h) setHistory(JSON.parse(h));
  }, []);

  const startScan = useCallback(() => {
    if (!input.trim()) return;
    setScanning(true);
    setStage(0);
    setProgress(0);

    let p = 0;
    let s = 0;
    const interval = setInterval(() => {
      p += Math.random() * 8 + 2;
      if (p >= 100) {
        p = 100;
        clearInterval(interval);
        const id = `scan-${Date.now()}`;
        const item: HistoryItem = { target: input, riskLevel: "MEDIUM", date: new Date().toISOString(), id };
        const newHistory = [item, ...history].slice(0, 20);
        setHistory(newHistory);
        localStorage.setItem("boris_scan_history", JSON.stringify(newHistory));
        setTimeout(() => navigate(`/report/${id}`), 500);
      }
      if (p > (s + 1) * (100 / STAGES.length) && s < STAGES.length - 1) s++;
      setProgress(Math.min(p, 100));
      setStage(s);
    }, 300);

    return () => clearInterval(interval);
  }, [input, history, navigate]);

  const cancelScan = () => { setScanning(false); setProgress(0); setStage(0); };

  const riskColors: Record<string, string> = {
    CRITICAL: "text-primary", HIGH: "text-primary-bright", MEDIUM: "text-yellow-500", LOW: "text-green-500", SAFE: "text-muted-foreground",
  };

  return (
    <div className="container mx-auto min-h-screen px-4 py-12">
      <RevealOnScroll>
        <h1 className="mb-8 text-3xl font-bold text-foreground md:text-4xl">{t("scanner.title")}</h1>

        <div className="mb-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && startScan()}
                placeholder={t("scanner.placeholder")}
                className="w-full rounded-xl border border-border bg-background-secondary py-4 pl-12 pr-4 font-mono text-sm text-foreground outline-none transition-colors focus:border-primary"
                disabled={scanning}
              />
            </div>
            <button
              onClick={startScan}
              disabled={scanning || !input.trim()}
              className="rounded-xl bg-primary px-8 py-4 font-semibold text-primary-foreground transition-all hover:bg-primary-dim btn-glow disabled:opacity-50"
            >
              {t("scanner.scan")}
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <span className="text-xs text-muted-foreground">{t("scanner.examples")}</span>
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => setInput(ex)}
                className="rounded border border-border px-2 py-0.5 font-mono text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              >
                {ex.length > 30 ? ex.slice(0, 30) + "..." : ex}
              </button>
            ))}
          </div>
        </div>

        {scanning && (
          <GlowCard className="my-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-mono text-sm font-semibold text-foreground">{input}</h3>
                <p className="text-xs text-muted-foreground">{t(`scanner.stages.${STAGES[stage]}`)}</p>
              </div>
              <button onClick={cancelScan} className="rounded border border-border p-2 text-muted-foreground transition-colors hover:border-primary hover:text-primary">
                <X size={16} />
              </button>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="progress-animated h-full rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-2 text-right font-mono text-xs text-primary">{Math.round(progress)}%</p>
          </GlowCard>
        )}

        <div className="mt-12">
          <h2 className="mb-4 text-lg font-semibold text-foreground">{t("scanner.history")}</h2>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("scanner.noHistory")}</p>
          ) : (
            <div className="space-y-2">
              {history.map((h) => (
                <button
                  key={h.id}
                  onClick={() => navigate(`/report/${h.id}`)}
                  className="flex w-full items-center gap-4 rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-border-hover hover:bg-accent"
                >
                  <span className={`font-mono text-xs font-bold ${riskColors[h.riskLevel] || "text-foreground"}`}>
                    {h.riskLevel}
                  </span>
                  <span className="flex-1 truncate font-mono text-sm text-foreground">{h.target}</span>
                  <span className="text-xs text-muted-foreground">{new Date(h.date).toLocaleDateString()}</span>
                  <ExternalLink size={14} className="text-muted-foreground" />
                </button>
              ))}
            </div>
          )}
        </div>
      </RevealOnScroll>
    </div>
  );
};

export default Scanner;
