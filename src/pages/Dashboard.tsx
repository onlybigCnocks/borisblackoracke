import { useTranslation } from "react-i18next";
import { RevealOnScroll, GlowCard, SectionTitle } from "@/components/ui-boris";
import { Link } from "react-router-dom";
import { Search, ArrowUpRight } from "lucide-react";
import { useState } from "react";

const mockUsage = [12, 8, 15, 6, 20, 10, 14];
const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const Dashboard = () => {
  const { t } = useTranslation();
  const [quickInput, setQuickInput] = useState("");
  const maxUsage = Math.max(...mockUsage);

  return (
    <div className="container mx-auto min-h-screen px-4 py-12">
      <RevealOnScroll>
        <SectionTitle>{t("dashboard.title")}</SectionTitle>

        {/* Quick Scan */}
        <div className="mb-8 flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input
              type="text"
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
              placeholder={t("dashboard.quickScan")}
              className="w-full rounded-xl border border-border bg-background-secondary py-3 pl-12 pr-4 font-mono text-sm text-foreground outline-none focus:border-primary"
            />
          </div>
          <Link to="/scan" className="rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground transition-all hover:bg-primary-dim btn-glow">
            →
          </Link>
        </div>

        {/* Stats */}
        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { label: t("dashboard.totalScans"), value: "47" },
            { label: t("dashboard.scansToday"), value: "3" },
            { label: t("dashboard.tier"), value: "GUEST" },
            { label: t("dashboard.remaining"), value: "0/3" },
          ].map((s) => (
            <GlowCard key={s.label}>
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="mt-1 font-mono text-2xl font-bold text-foreground">{s.value}</p>
            </GlowCard>
          ))}
        </div>

        {/* Usage Chart */}
        <GlowCard className="mb-8">
          <h3 className="mb-4 text-sm font-semibold text-foreground">{t("dashboard.usage")}</h3>
          <div className="flex items-end gap-2 h-32">
            {mockUsage.map((val, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t bg-primary/80 transition-all hover:bg-primary"
                  style={{ height: `${(val / maxUsage) * 100}%` }}
                />
                <span className="text-[10px] text-muted-foreground">{days[i]}</span>
              </div>
            ))}
          </div>
        </GlowCard>

        {/* Upgrade */}
        <GlowCard className="mb-8 border-primary/30">
          <h3 className="text-lg font-semibold text-foreground">{t("dashboard.upgrade")}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{t("dashboard.upgradeDesc")}</p>
          <Link
            to="/pricing"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary-dim btn-glow"
          >
            {t("nav.pricing")} <ArrowUpRight size={16} />
          </Link>
        </GlowCard>

        {/* Recent Scans */}
        <h3 className="mb-4 text-lg font-semibold text-foreground">{t("dashboard.recentScans")}</h3>
        <div className="space-y-2">
          {[
            { target: "compound-finance/compound-protocol", risk: "HIGH", date: "2025-01-15" },
            { target: "0x1f98...F984", risk: "MEDIUM", date: "2025-01-14" },
            { target: "aave/aave-v3-core", risk: "LOW", date: "2025-01-13" },
          ].map((s, i) => (
            <Link
              key={i}
              to={`/report/demo-${i}`}
              className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-all hover:border-border-hover hover:bg-accent"
            >
              <span className={`font-mono text-xs font-bold ${s.risk === "HIGH" ? "text-primary-bright" : s.risk === "MEDIUM" ? "text-yellow-400" : "text-green-400"}`}>
                {s.risk}
              </span>
              <span className="flex-1 truncate font-mono text-sm text-foreground">{s.target}</span>
              <span className="text-xs text-muted-foreground">{s.date}</span>
            </Link>
          ))}
        </div>
      </RevealOnScroll>
    </div>
  );
};

export default Dashboard;
