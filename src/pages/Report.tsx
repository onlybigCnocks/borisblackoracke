import { useTranslation } from "react-i18next";
import { useParams, Link } from "react-router-dom";
import { RevealOnScroll, GlowCard, SectionLabel } from "@/components/ui-boris";
import { MOCK_SCAN } from "@/lib/data";
import { ArrowLeft, Download, Share2, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

const riskColors: Record<string, string> = {
  CRITICAL: "bg-primary text-primary-foreground",
  HIGH: "bg-primary-bright/20 text-primary-bright",
  MEDIUM: "bg-yellow-500/20 text-yellow-400",
  LOW: "bg-green-500/20 text-green-400",
  SAFE: "bg-muted text-muted-foreground",
};

const severityColors: Record<string, string> = {
  CRITICAL: "border-primary bg-primary/10 text-primary",
  HIGH: "border-primary-bright bg-primary-bright/10 text-primary-bright",
  MEDIUM: "border-yellow-500 bg-yellow-500/10 text-yellow-400",
  LOW: "border-green-500 bg-green-500/10 text-green-400",
};

const Report = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const scan = MOCK_SCAN;
  const [expandedFindings, setExpandedFindings] = useState<Set<string>>(new Set());

  const toggleFinding = (fid: string) => {
    setExpandedFindings(prev => {
      const next = new Set(prev);
      next.has(fid) ? next.delete(fid) : next.add(fid);
      return next;
    });
  };

  return (
    <div className="container mx-auto min-h-screen px-4 py-12">
      <RevealOnScroll>
        <Link to="/scan" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary">
          <ArrowLeft size={16} /> {t("report.back")}
        </Link>

        <div className="mb-8 flex flex-wrap items-center gap-4">
          <h1 className="text-3xl font-bold text-foreground">{scan.target}</h1>
          <span className={`rounded-lg px-4 py-1.5 text-sm font-bold ${riskColors[scan.riskLevel]}`}>
            {scan.riskLevel}
          </span>
        </div>

        <p className="mb-8 text-sm text-muted-foreground">
          {t("report.scanDate")}: {new Date(scan.date).toLocaleString()}
        </p>

        {/* Score Grid */}
        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          {(["critical", "high", "medium", "low"] as const).map((level) => {
            const colors = { critical: "text-primary", high: "text-primary-bright", medium: "text-yellow-400", low: "text-green-400" };
            return (
              <GlowCard key={level}>
                <p className="text-xs uppercase text-muted-foreground">{t(`report.${level}`)}</p>
                <p className={`mt-1 font-mono text-3xl font-bold ${colors[level]}`}>
                  {scan.findings[level]}
                </p>
              </GlowCard>
            );
          })}
        </div>

        {/* Risk Categories */}
        {scan.categories && (
          <GlowCard className="mb-8">
            <h3 className="mb-4 text-lg font-semibold text-foreground">{t("report.categories")}</h3>
            <div className="space-y-3">
              {scan.categories.map((cat) => (
                <div key={cat.name} className="flex items-center gap-4">
                  <span className="w-24 text-sm text-muted-foreground">{cat.name}</span>
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${cat.score * 10}%` }} />
                  </div>
                  <span className="font-mono text-sm text-foreground">{cat.score}</span>
                </div>
              ))}
            </div>
          </GlowCard>
        )}

        {/* Governance */}
        {scan.governance && (
          <GlowCard className="mb-8">
            <h3 className="mb-4 text-lg font-semibold text-foreground">{t("report.governance")}</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">{t("report.claimedModel")}</p>
                <p className="font-mono text-sm text-foreground">{scan.governance.claimed}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("report.observedModel")}</p>
                <p className="font-mono text-sm text-primary">{scan.governance.observed}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("report.adminScore")}</p>
                <p className="font-mono text-2xl font-bold text-primary">{scan.governance.adminScore}/10</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("report.privilegedRoles")}</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {scan.governance.roles.map((r) => (
                    <span key={r} className="rounded border border-border px-2 py-0.5 font-mono text-xs text-muted-foreground">{r}</span>
                  ))}
                </div>
              </div>
            </div>
          </GlowCard>
        )}

        {/* Findings */}
        {scan.findingsList && (
          <div className="mb-8">
            <h3 className="mb-4 text-lg font-semibold text-foreground">{t("report.findings")}</h3>
            <div className="space-y-2">
              {scan.findingsList.map((f) => (
                <div key={f.id} className="rounded-xl border border-border bg-card overflow-hidden">
                  <button
                    onClick={() => toggleFinding(f.id)}
                    className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-accent"
                  >
                    <span className={`rounded border px-2 py-0.5 font-mono text-[10px] font-bold ${severityColors[f.severity]}`}>
                      {f.severity}
                    </span>
                    <span className="flex-1 text-sm font-medium text-foreground">{f.type}</span>
                    {f.file && <span className="hidden text-xs text-muted-foreground md:block">{f.file}:{f.line}</span>}
                    {expandedFindings.has(f.id) ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                  </button>
                  {expandedFindings.has(f.id) && (
                    <div className="border-t border-border px-4 py-3">
                      <p className="text-sm text-muted-foreground">{f.description}</p>
                      {f.file && <p className="mt-2 font-mono text-xs text-muted-foreground">{f.file}:{f.line}</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <button className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary-dim">
            <RefreshCw size={16} /> {t("report.rescan")}
          </button>
          <button className="flex items-center gap-2 rounded-lg border border-border px-6 py-2.5 text-sm font-semibold text-foreground transition-all hover:border-primary hover:text-primary">
            <Download size={16} /> {t("report.download")}
          </button>
          <button className="flex items-center gap-2 rounded-lg border border-border px-6 py-2.5 text-sm font-semibold text-foreground transition-all hover:border-primary hover:text-primary">
            <Share2 size={16} /> {t("report.share")}
          </button>
        </div>
      </RevealOnScroll>
    </div>
  );
};

export default Report;
