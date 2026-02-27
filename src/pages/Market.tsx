import { useState } from "react";
import { useTranslation } from "react-i18next";
import { RevealOnScroll, GlowCard, SectionTitle } from "@/components/ui-boris";
import { Search, TrendingUp } from "lucide-react";

const mockResults = [
  { symbol: "BTC", score: 42, level: "MEDIUM", signals: ["OI divergence detected", "Funding rate elevated", "Liquidation cluster at $62k"], date: "2025-01-15" },
  { symbol: "ETH", score: 28, level: "LOW", signals: ["Stable OI", "Balanced long/short ratio"], date: "2025-01-15" },
  { symbol: "PEPE", score: 78, level: "HIGH", signals: ["Extreme crowding", "Whale accumulation", "Wash trading detected", "Liquidity fragmented"], date: "2025-01-14" },
];

const Market = () => {
  const { t } = useTranslation();
  const [input, setInput] = useState("");
  const [results, setResults] = useState(mockResults);

  const levelColors: Record<string, string> = {
    CRITICAL: "text-primary", HIGH: "text-primary-bright", MEDIUM: "text-yellow-400", LOW: "text-green-400",
  };

  return (
    <div className="container mx-auto min-h-screen px-4 py-12">
      <RevealOnScroll>
        <SectionTitle>{t("market.title")}</SectionTitle>

        <div className="mb-8 flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("market.placeholder")}
              className="w-full rounded-xl border border-border bg-background-secondary py-4 pl-12 pr-4 font-mono text-sm text-foreground outline-none focus:border-primary"
            />
          </div>
          <button className="rounded-xl bg-primary px-8 py-4 font-semibold text-primary-foreground transition-all hover:bg-primary-dim btn-glow">
            {t("market.scan")}
          </button>
        </div>

        <div className="mb-8 flex items-center gap-3">
          <TrendingUp size={18} className="text-primary" />
          <span className="text-sm font-medium text-foreground">{t("market.trending")}:</span>
          {[5, 10, 20].map((n) => (
            <button key={n} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:border-primary hover:text-primary">
              {t("market.trendScan")} {n}
            </button>
          ))}
        </div>

        <h3 className="mb-4 text-lg font-semibold text-foreground">{t("market.history")}</h3>
        <div className="space-y-3">
          {results.map((r, i) => (
            <GlowCard key={i}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="font-mono text-lg font-bold text-foreground">{r.symbol}</h3>
                    <span className={`font-mono text-xs font-bold ${levelColors[r.level]}`}>{r.level}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {r.signals.map((s, j) => (
                      <span key={j} className="rounded border border-border px-2 py-0.5 text-[10px] text-muted-foreground">{s}</span>
                    ))}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-mono text-2xl font-bold text-primary">{r.score}</p>
                  <p className="text-[10px] text-muted-foreground">{r.date}</p>
                </div>
              </div>
            </GlowCard>
          ))}
        </div>
      </RevealOnScroll>
    </div>
  );
};

export default Market;
