import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertTriangle, ArrowUpRight, Share2, Loader2, Shield } from "lucide-react";

const API_BASE = "https://api.black-oracle.com";

const Report = () => {
  const { id } = useParams();
  const { i18n } = useTranslation();
  const lang = i18n.language === "ru" ? "ru" : "en";
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`${API_BASE}/api/report/${id}`)
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.detail || `HTTP ${r.status}`);
        setData(j);
      })
      .catch((e) => setError(e.message));
  }, [id]);

  const share = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (error) {
    return (
      <div className="container mx-auto min-h-screen px-4 py-24">
        <div className="mx-auto max-w-lg rounded-xl border border-destructive/40 bg-card p-8 text-center">
          <AlertTriangle className="mx-auto mb-3 text-destructive" size={30} />
          <p className="font-mono text-sm text-foreground">{error}</p>
          <Link to="/" className="mt-4 inline-block rounded-lg bg-primary px-5 py-2 font-mono text-xs font-semibold text-primary-foreground">
            {lang === "ru" ? "На главную" : "Back home"}
          </Link>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={28} />
      </div>
    );
  }

  const r = data.report || {};
  const sc = r.scope || {};
  const label = (v: any) => (typeof v === "string" ? v : v?.[lang] || v?.en || "");
  const verdictColor =
    r.verdict === "SIGNIFICANT_SURFACE" ? "text-destructive border-destructive/40" : "text-primary border-primary/40";

  return (
    <div className="container mx-auto min-h-screen px-4 py-24">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                BORIS // PUBLIC REPORT
              </p>
              <h1 className="mt-1 truncate font-mono text-xl font-bold text-foreground">
                {r.project || data.target}
              </h1>
              <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">{data.target}</p>
            </div>
            <button
              onClick={share}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 font-mono text-xs text-muted-foreground hover:border-primary hover:text-primary"
            >
              <Share2 size={13} />
              <span>{copied ? (lang === "ru" ? "Скопировано" : "Copied") : lang === "ru" ? "Поделиться" : "Share"}</span>
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className={`rounded border px-2.5 py-1 font-mono text-[10px] font-bold ${verdictColor}`}>
              {r.verdict || "REPORT"}
            </span>
            {r.archetype && (
              <span className="rounded border border-border px-2.5 py-1 font-mono text-[10px] text-muted-foreground">
                {r.archetype_icon} {label(r.archetype_label) || r.archetype}
              </span>
            )}
            <span className="rounded border border-border px-2.5 py-1 font-mono text-[10px] text-muted-foreground">
              {String(data.task_id).slice(0, 8)}
            </span>
          </div>

          {r.intro && <p className="mt-4 font-mono text-xs leading-relaxed text-muted-foreground">{label(r.intro)}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { k: lang === "ru" ? "Паттерны" : "Patterns", v: sc.patterns_total ?? 0 },
            { k: "Critical", v: sc.patterns_critical ?? 0 },
            { k: "High", v: sc.patterns_high ?? 0 },
            { k: lang === "ru" ? "Ликвидность" : "Liquidity", v: sc.liquidity || "—" },
          ].map((c, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4">
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{c.k}</p>
              <p className="mt-1 font-mono text-lg font-bold text-foreground">{c.v}</p>
            </div>
          ))}
        </div>

        {Array.isArray(r.top_findings_preview) && r.top_findings_preview.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="mb-3 font-mono text-[10px] uppercase tracking-wider text-primary">
              {lang === "ru" ? "Обнаруженные сигнатуры (превью)" : "Detected Signatures (Preview)"}
            </p>
            <div className="space-y-2">
              {r.top_findings_preview.map((f: any, i: number) => (
                <div key={i} className="rounded-lg border border-border bg-background p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-xs font-bold text-foreground">
                      {f.title || f.name || f.pattern}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {f.severity} {f.file ? `· ${f.file}` : ""}
                    </span>
                  </div>
                  {f.summary && <p className="mt-1 font-mono text-[11px] text-muted-foreground">{f.summary}</p>}
                </div>
              ))}
            </div>
            {r.more_count ? (
              <p className="mt-2 font-mono text-[11px] text-primary">
                +{r.more_count} {lang === "ru" ? "паттернов скрыто" : "patterns hidden"}
              </p>
            ) : null}
          </div>
        )}

        <div className="rounded-2xl border border-primary/40 bg-card p-6 text-center bg-radial-red">
          <Shield className="mx-auto mb-2 text-primary" size={26} />
          <p className="font-mono text-sm font-bold text-foreground">
            {lang === "ru" ? "Нужен полный отчёт?" : "Need the full report?"}
          </p>
          <p className="mx-auto mt-1 max-w-md font-mono text-[11px] text-muted-foreground">
            {lang === "ru"
              ? "Полные цепочки эксплуатации, file:line по каждому паттерну, холдеры без маскировки и JSON-экспорт доступны с тарифа RADAR."
              : "Full exploit chains, file:line for every pattern, unmasked holders and JSON export require RADAR tier."}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Link
              to="/pricing"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2.5 font-mono text-xs font-semibold text-primary-foreground btn-glow"
            >
              {lang === "ru" ? "Открыть RADAR" : "Unlock RADAR"}
              <ArrowUpRight size={13} />
            </Link>
            <Link
              to="/auth"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-5 py-2.5 font-mono text-xs font-semibold text-foreground hover:border-primary"
            >
              {lang === "ru" ? "Создать кабинет" : "Create cabinet"}
            </Link>
          </div>
        </div>

        <p className="text-center font-mono text-[10px] text-muted-foreground">
          {r.disclaimer || "BORIS — structural analysis, not an investment recommendation."}
        </p>
      </div>
    </div>
  );
};

export default Report;
