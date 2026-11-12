import { useState } from "react";
import { useTranslation } from "react-i18next";
import { RevealOnScroll, GlowCard, SectionTitle } from "@/components/ui-boris";
import { Search, TrendingUp, Loader2, AlertTriangle, Lock } from "lucide-react";
import { authHeaders } from "@/lib/auth";

const API_BASE = "https://api.black-oracle.com";

const QUICK = ["BTC", "ETH", "SOL", "PEPE", "DOGE", "SUI", "ARB", "TIA"];

const fmt = (n: any, digits = 2) => {
  const v = Number(n);
  if (!isFinite(v) || n === null) return "—";
  if (Math.abs(v) >= 1e9) return (v / 1e9).toFixed(2) + "B";
  if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(2) + "M";
  if (Math.abs(v) >= 1e3) return (v / 1e3).toFixed(2) + "K";
  return v.toFixed(digits);
};

const Market = () => {
  const { t, i18n } = useTranslation();
  const isRu = i18n.language === "ru";
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [res, setRes] = useState<any>(null);

  const levelColor = (lv: string) =>
    lv === "CRITICAL" || lv === "HIGH" ? "text-destructive" : lv === "MEDIUM" ? "text-yellow-400" : "text-primary";

  const scan = async (sym?: string) => {
    const symbol = (sym || input).trim().toUpperCase().replace("$", "");
    if (!symbol) return;
    setInput(symbol);
    setLoading(true);
    setError(null);
    setRes(null);
    try {
      const r = await fetch(`${API_BASE}/api/tools/market`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ symbol }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.detail || `HTTP ${r.status}`);
      }
      setRes(await r.json());
    } catch (e: any) {
      setError(e.message || "Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto min-h-screen px-4 py-12 relative">
      <RevealOnScroll>
        <SectionTitle>{t("market.title")}</SectionTitle>

        <div className="mb-4 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && scan()}
              placeholder={isRu ? "Тикер монеты — BTC, ETH, PEPE, SUI…" : "Coin ticker — BTC, ETH, PEPE, SUI…"}
              className="w-full rounded-xl border border-border bg-background-secondary py-4 pl-12 pr-4 font-mono text-sm text-foreground outline-none focus:border-primary"
            />
          </div>
          <button
            onClick={() => scan()}
            disabled={loading || !input.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-8 py-4 font-semibold text-primary-foreground transition-all hover:bg-primary-dim disabled:opacity-40 btn-glow"
          >
            {loading ? <Loader2 size={17} className="animate-spin" /> : <TrendingUp size={17} />}
            <span>{loading ? (isRu ? "Сканирую…" : "Scanning…") : t("market.scan")}</span>
          </button>
        </div>

        <div className="mb-8 flex flex-wrap items-center gap-2">
          {QUICK.map((q) => (
            <button
              key={q}
              onClick={() => scan(q)}
              disabled={loading}
              className="rounded-lg border border-border bg-card px-3 py-1.5 font-mono text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
            >
              ${q}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-6 flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-4 font-mono text-xs text-destructive">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {res && (
          <div className="space-y-5">
            <GlowCard>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="font-mono text-2xl font-bold text-foreground">${res.symbol}</h3>
                    <span className={`font-mono text-xs font-bold ${levelColor(res.level)}`}>{res.level}</span>
                    <span className="rounded border border-border px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                      conf {res.confidence}%
                    </span>
                  </div>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    {isRu ? "Манипуляции" : "Manipulation"} {res.manipulation_risk} ·{" "}
                    {isRu ? "Фундамент" : "Fundamentals"} {res.fundamental_weakness} · Crowd {res.crowd_overcrowding} · Organic {res.organic_probability}%
                  </p>
                </div>
                <div className="text-right">
                  <p className={`font-mono text-3xl font-bold ${levelColor(res.level)}`}>{res.score}</p>
                  <p className="font-mono text-[10px] uppercase text-muted-foreground">risk score</p>
                </div>
              </div>
              <p className="mt-3 font-mono text-xs text-foreground">{res.conclusion}</p>
              {res.github_repo && (
                <p className="mt-1 font-mono text-[11px] text-primary">GitHub: {res.github_repo}</p>
              )}
            </GlowCard>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { k: isRu ? "Цена" : "Price", v: `$${fmt(res.snapshot?.price_usd)}` },
                { k: "24h", v: `${Number(res.snapshot?.price_change_24h ?? 0).toFixed(2)}%` },
                { k: "7d", v: `${Number(res.snapshot?.price_change_7d ?? 0).toFixed(2)}%` },
                { k: isRu ? "Капитализация" : "Mkt Cap", v: `$${fmt(res.snapshot?.market_cap)}` },
                { k: "Volume 24h", v: `$${fmt(res.snapshot?.volume_24h)}` },
                { k: "Open Interest", v: `$${fmt(res.snapshot?.oi_usdt)}` },
                { k: "ΔOI 24h", v: `${Number(res.snapshot?.oi_change_24h_pct ?? 0).toFixed(2)}%` },
                { k: "Funding", v: `${(Number(res.snapshot?.funding_rate ?? 0) * 100).toFixed(4)}%` },
              ].map((c, i) => (
                <div key={i} className="rounded-xl border border-border bg-card p-4">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{c.k}</p>
                  <p className="mt-1 font-mono text-base font-bold text-foreground">{c.v}</p>
                </div>
              ))}
            </div>

            {res.signals?.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-5">
                <p className="mb-3 font-mono text-[10px] uppercase tracking-wider text-primary">
                  {isRu ? `Сигналы (${res.signals_total})` : `Signals (${res.signals_total})`}
                </p>
                <div className="space-y-2">
                  {res.signals.map((s: any, i: number) => (
                    <div key={i} className="rounded-lg border border-border bg-background p-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-mono text-xs font-bold text-foreground">{s.name}</span>
                        <span className="font-mono text-[10px] text-muted-foreground">{s.category} · {s.score}</span>
                      </div>
                      <p className="mt-1 font-mono text-[11px] text-muted-foreground">{s.detail}</p>
                    </div>
                  ))}
                </div>
                {res.signals_total > res.signals.length && (
                  <p className="mt-2 inline-flex items-center gap-1 font-mono text-[11px] text-primary">
                    <Lock size={11} /> +{res.signals_total - res.signals.length}{" "}
                    {isRu ? "сигналов скрыто — нужен RADAR+" : "more hidden — RADAR+ required"}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {!res && !loading && !error && (
          <div className="rounded-xl border border-border bg-card p-10 text-center">
            <TrendingUp className="mx-auto mb-3 text-muted-foreground" size={30} />
            <p className="font-mono text-sm text-foreground">
              {isRu ? "Введите тикер и запустите сканирование" : "Enter a ticker and launch a scan"}
            </p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              {isRu
                ? "Open Interest, фандинг, ликвидации, long/short ratio, глубина стакана ±2% и кросс-биржевые расхождения."
                : "Open Interest, funding, liquidations, long/short ratio, ±2% orderbook depth and cross-exchange divergence."}
            </p>
          </div>
        )}
      </RevealOnScroll>
    </div>
  );
};

export default Market;
