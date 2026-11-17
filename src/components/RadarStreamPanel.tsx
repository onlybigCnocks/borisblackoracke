import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  Radar,
  Search,
  Lock,
  ArrowUpRight,
  Bell,
  Eye,
  Loader2,
  Zap,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import {
  apiGetRadarFeed,
  apiUpdateRadarSettings,
  apiEnrichDefillama,
  apiRunGithubOmniHarvest,
  type BorisUser,
} from "@/lib/auth";

interface Props {
  user: BorisUser | null;
  onOpenDossier: (taskId: string) => void;
  onPrefillScan: (target: string) => void;
}

type RadarTab = "github" | "defillama" | "contracts" | "soroban" | "zk" | "audits_base";

const RadarStreamPanel = ({ user, onOpenDossier, onPrefillScan }: Props) => {
  const { i18n } = useTranslation();
  const isRu = i18n.language === "ru";

  const [tab, setTab] = useState<RadarTab>("github");
  const [chain, setChain] = useState<string>("all");
  const [ghVertical, setGhVertical] = useState<string>("ALL");
  const [ospecFilter, setOspecFilter] = useState<string>("ALL");
  const [omniRunning, setOmniRunning] = useState<boolean>(false);
  const [omniBanner, setOmniBanner] = useState<string | null>(null);
  const [query, setQuery] = useState<string>("");
  const [minScore, setMinScore] = useState<number>(0);

  // Pagination state (default 10 per page with selector 10 / 20 / 50)
  const [page, setPage] = useState<number>(1);
  const [perPage, setPerPage] = useState<number>(10);

  const [loading, setLoading] = useState<boolean>(true);
  const [feed, setFeed] = useState<any>({
    stats: {},
    items: [],
    locked: false,
    page: 1,
    per_page: 10,
    total: 0,
    total_pages: 1,
  });

  // Telegram Radar Alert Settings (synced with users_db.json)
  const tgMeta = user?.tg_meta || {};
  const [ghAlerts, setGhAlerts] = useState<boolean>(Boolean(tgMeta.radar_alerts_enabled));
  const [defiAlerts, setDefiAlerts] = useState<boolean>(Boolean(tgMeta.defillama_alerts_enabled));
  const [explAlerts, setExplAlerts] = useState<boolean>(Boolean(tgMeta.explorer_alerts_enabled));
  const [savingAlerts, setSavingAlerts] = useState<boolean>(false);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

  // DeFiLlama 1-click enricher state (mirrors Telegram disc_defi_view_ / disc_defi_enrich_)
  const [enrichLoadingSlug, setEnrichLoadingSlug] = useState<string | null>(null);
  const [enrichedProtocols, setEnrichedProtocols] = useState<Record<string, any>>({});
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);

  const handleEnrichDefillama = async (slug: string) => {
    if (expandedSlug === slug && enrichedProtocols[slug]) {
      setExpandedSlug(null);
      return;
    }
    setExpandedSlug(slug);
    if (enrichedProtocols[slug]) return;
    setEnrichLoadingSlug(slug);
    try {
      const data = await apiEnrichDefillama(slug);
      setEnrichedProtocols((prev) => ({ ...prev, [slug]: data }));
    } catch (e: any) {
      setEnrichedProtocols((prev) => ({ ...prev, [slug]: { error: e.message } }));
    } finally {
      setEnrichLoadingSlug(null);
    }
  };

  useEffect(() => {
    if (user?.tg_meta) {
      setGhAlerts(Boolean(user.tg_meta.radar_alerts_enabled));
      setDefiAlerts(Boolean(user.tg_meta.defillama_alerts_enabled));
      setExplAlerts(Boolean(user.tg_meta.explorer_alerts_enabled));
    }
  }, [user?.tg_meta]);

  const loadFeed = async (override?: {
    t?: RadarTab;
    c?: string;
    v?: string;
    of?: string;
    q?: string;
    ms?: number;
    p?: number;
    pp?: number;
  }) => {
    setLoading(true);
    try {
      const data = await apiGetRadarFeed({
        tab: override?.t ?? tab,
        chain: override?.c ?? chain,
        vertical: override?.v ?? ghVertical,
        ospec_filter: override?.of ?? ospecFilter,
        q: override?.q ?? query,
        min_score: override?.ms ?? minScore,
        page: override?.p ?? page,
        per_page: override?.pp ?? perPage,
      });
      setFeed(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeed({ t: tab, c: chain, v: ghVertical, of: ospecFilter, p: page, pp: perPage });
  }, [tab, chain, ghVertical, ospecFilter, page, perPage]);

  const handleRunOmniHarvest = async () => {
    if (!isPaid) {
      window.dispatchEvent(new CustomEvent("boris-open-checkout", { detail: { tier: "radar" } }));
      return;
    }
    setOmniRunning(true);
    setOmniBanner(null);
    try {
      const res = await apiRunGithubOmniHarvest(ghVertical);
      const added = Number(res?.harvest?.total_new || 0);
      const qPending = Number(res?.pipeline_stats?.ospec_pending || 0);
      setOmniBanner(
        isRu
          ? `✅ Omni-Harvester завершил прогон (${ghVertical}): +${added} новых репо отсортировано и передано в конвейер OSPEC (в очереди OSPEC: ${qPending})`
          : `✅ Omni-Harvester pass complete (${ghVertical}): +${added} new repos classified & queued into OSPEC (OSPEC queue: ${qPending})`
      );
      setPage(1);
      await loadFeed({ t: "github", v: ghVertical, of: ospecFilter, p: 1 });
    } catch (e: any) {
      setOmniBanner(`⚠️ ${e.message}`);
    } finally {
      setOmniRunning(false);
    }
  };

  const handleToggleAlert = async (field: "gh" | "defi" | "expl") => {
    if (!user?.tg_id) return;
    setSavingAlerts(true);
    setAlertMsg(null);
    const nextGh = field === "gh" ? !ghAlerts : ghAlerts;
    const nextDefi = field === "defi" ? !defiAlerts : defiAlerts;
    const nextExpl = field === "expl" ? !explAlerts : explAlerts;
    try {
      await apiUpdateRadarSettings({
        radar_alerts_enabled: nextGh,
        defillama_alerts_enabled: nextDefi,
        explorer_alerts_enabled: nextExpl,
      });
      setGhAlerts(nextGh);
      setDefiAlerts(nextDefi);
      setExplAlerts(nextExpl);
      setAlertMsg(isRu ? "✅ Настройки ТГ-алертов обновлены" : "✅ Telegram radar alerts updated");
      setTimeout(() => setAlertMsg(null), 2500);
    } catch (e: any) {
      setAlertMsg(`⚠️ ${e.message}`);
    } finally {
      setSavingAlerts(false);
    }
  };

  const fmt = (n: any) => {
    const v = Number(n);
    if (!isFinite(v)) return "0";
    return v.toLocaleString();
  };

  const stats = feed?.stats || {};
  const totalItems = Number(feed?.total || 0);
  const totalPages = Math.max(1, Number(feed?.total_pages || 1));
  const currentPage = Math.min(totalPages, Math.max(1, Number(feed?.page || page)));

  const userTier = (user?.tier || "GUEST").toUpperCase();
  const isPaid = ["RADAR", "RAW", "BLACKBOX"].includes(userTier);
  const isDeep = ["RAW", "BLACKBOX"].includes(userTier);

  const TABS: Array<{
    id: RadarTab;
    labelRu: string;
    labelEn: string;
    tierBadge: string;
    lockedForUser: boolean;
  }> = [
    {
      id: "github",
      labelRu: "🔥 GitHub Репо",
      labelEn: "🔥 GitHub Repos",
      tierBadge: "FREE",
      lockedForUser: false,
    },
    {
      id: "defillama",
      labelRu: "📊 DeFiLlama",
      labelEn: "📊 DeFiLlama",
      tierBadge: "RADAR+",
      lockedForUser: !isPaid,
    },
    {
      id: "contracts",
      labelRu: "🔗 Верифицированные контракты",
      labelEn: "🔗 Verified Contracts",
      tierBadge: "RADAR+",
      lockedForUser: !isPaid,
    },
    {
      id: "soroban",
      labelRu: "🛡️ Soroban / Stellar",
      labelEn: "🛡️ Soroban Radar",
      tierBadge: "RADAR+",
      lockedForUser: !isPaid,
    },
    {
      id: "zk",
      labelRu: "🔐 ZK Groth16",
      labelEn: "🔐 ZK Groth16",
      tierBadge: "RAW+",
      lockedForUser: !isDeep,
    },
    {
      id: "audits_base",
      labelRu: "📚 Архив аудитов (10.5K)",
      labelEn: "📚 Audit Archive (10.5K)",
      tierBadge: "RADAR+",
      lockedForUser: !isPaid,
    },
  ];

  const getPageNumbers = (): Array<number | string> => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: Array<number | string> = [1];
    const start = Math.max(2, currentPage - 2);
    const end = Math.min(totalPages - 1, currentPage + 2);
    if (start > 2) pages.push("...");
    for (let p = start; p <= end; p++) pages.push(p);
    if (end < totalPages - 1) pages.push("...");
    pages.push(totalPages);
    return pages;
  };

  const renderPaginationBar = () => {
    if (feed?.locked || totalItems === 0) return null;
    const fromIdx = (currentPage - 1) * perPage + 1;
    const toIdx = Math.min(totalItems, currentPage * perPage);

    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-2.5 font-mono text-xs">
        <div className="flex items-center gap-3 text-muted-foreground">
          <span>
            {isRu
              ? `Показано ${fmt(fromIdx)}–${fmt(toIdx)} из ${fmt(totalItems)} · Стр. ${fmt(currentPage)} / ${fmt(totalPages)}`
              : `Showing ${fmt(fromIdx)}–${fmt(toIdx)} of ${fmt(totalItems)} · Page ${fmt(currentPage)} / ${fmt(totalPages)}`}
          </span>
          <select
            value={perPage}
            onChange={(e) => {
              const nextPp = Number(e.target.value) || 10;
              setPerPage(nextPp);
              setPage(1);
            }}
            className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs text-foreground outline-none focus:border-primary"
          >
            <option value={10}>{isRu ? "По 10 / стр." : "10 / page"}</option>
            <option value={20}>{isRu ? "По 20 / стр." : "20 / page"}</option>
            <option value={50}>{isRu ? "По 50 / стр." : "50 / page"}</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            disabled={currentPage <= 1 || loading}
            onClick={() => setPage(1)}
            title={isRu ? "Первая страница" : "First page"}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:border-primary hover:text-foreground disabled:opacity-40"
          >
            <ChevronsLeft size={14} />
          </button>
          <button
            type="button"
            disabled={currentPage <= 1 || loading}
            onClick={() => setPage(Math.max(1, currentPage - 1))}
            title={isRu ? "Предыдущая" : "Previous"}
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-border bg-background px-2.5 text-muted-foreground transition-colors hover:border-primary hover:text-foreground disabled:opacity-40"
          >
            <ChevronLeft size={14} />
            <span className="hidden sm:inline">{isRu ? "Назад" : "Prev"}</span>
          </button>

          {getPageNumbers().map((p, idx) =>
            p === "..." ? (
              <span key={`dots-${idx}`} className="px-1.5 text-muted-foreground">
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                disabled={loading}
                onClick={() => setPage(Number(p))}
                className={`inline-flex h-8 min-w-[32px] items-center justify-center rounded-lg px-2 text-xs font-bold transition-all ${
                  Number(p) === currentPage
                    ? "bg-primary text-primary-foreground shadow"
                    : "border border-border bg-background text-muted-foreground hover:border-primary hover:text-foreground"
                }`}
              >
                {p}
              </button>
            )
          )}

          <button
            type="button"
            disabled={currentPage >= totalPages || loading}
            onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
            title={isRu ? "Следующая" : "Next"}
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-border bg-background px-2.5 text-muted-foreground transition-colors hover:border-primary hover:text-foreground disabled:opacity-40"
          >
            <span className="hidden sm:inline">{isRu ? "Вперёд" : "Next"}</span>
            <ChevronRight size={14} />
          </button>
          <button
            type="button"
            disabled={currentPage >= totalPages || loading}
            onClick={() => setPage(totalPages)}
            title={isRu ? "Последняя страница" : "Last page"}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:border-primary hover:text-foreground disabled:opacity-40"
          >
            <ChevronsRight size={14} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Global Live Counters across all 6 BORIS radars */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { k: "GitHub Radar [FREE]", v: fmt(stats.github_repos || 33122), tabId: "github" as RadarTab },
          { k: "DeFiLlama [RADAR+]", v: fmt(stats.defillama_protocols || 9396), tabId: "defillama" as RadarTab },
          { k: "Contracts [RADAR+]", v: fmt(stats.verified_contracts || 245189), tabId: "contracts" as RadarTab },
          { k: "Soroban [RADAR+]", v: fmt(stats.soroban_targets || 641), tabId: "soroban" as RadarTab },
          { k: "ZK Verifiers [RAW+]", v: fmt(stats.zk_verifiers || 4982), tabId: "zk" as RadarTab },
          { k: isRu ? "Архив [RADAR+]" : "Archive [RADAR+]", v: fmt(Math.max(Number(stats.audits_archive || 0), 20826)), tabId: "audits_base" as RadarTab },
        ].map((c, i) => (
          <button
            key={i}
            type="button"
            onClick={() => {
              setTab(c.tabId);
              setChain("all");
              setPage(1);
            }}
            className={`rounded-xl border p-3.5 text-left transition-all ${
              tab === c.tabId
                ? "border-primary bg-primary/10"
                : "border-border bg-card hover:border-primary/40"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground truncate">{c.k}</p>
            </div>
            <p className="mt-1 font-mono text-lg font-bold text-foreground">{c.v}</p>
          </button>
        ))}
      </div>

      {/* Telegram Bot Radar Alert Toggles (when TG is synced) */}
      {user?.tg_id && user.tier?.toUpperCase() !== "GUEST" && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-card px-4 py-3 font-mono text-xs">
          <div className="flex items-center gap-2">
            <Bell size={14} className="text-primary" />
            <span className="text-foreground font-semibold">
              {isRu
                ? `Пуш-алерты радаров в Telegram (@${user.tg_username || user.tg_id}):`
                : `Telegram Push Alerts (@${user.tg_username || user.tg_id}):`}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={savingAlerts}
              onClick={() => handleToggleAlert("gh")}
              className={`rounded-lg border px-3 py-1 text-[11px] font-semibold transition-all ${
                ghAlerts
                  ? "border-green-500/50 bg-green-500/15 text-green-400"
                  : "border-border bg-background text-muted-foreground hover:text-foreground"
              }`}
            >
              {ghAlerts ? "🔔 GitHub: ON" : "🔕 GitHub: OFF"}
            </button>
            <button
              type="button"
              disabled={savingAlerts}
              onClick={() => handleToggleAlert("defi")}
              className={`rounded-lg border px-3 py-1 text-[11px] font-semibold transition-all ${
                defiAlerts
                  ? "border-green-500/50 bg-green-500/15 text-green-400"
                  : "border-border bg-background text-muted-foreground hover:text-foreground"
              }`}
            >
              {defiAlerts ? "🔔 DeFiLlama: ON" : "🔕 DeFiLlama: OFF"}
            </button>
            <button
              type="button"
              disabled={savingAlerts}
              onClick={() => handleToggleAlert("expl")}
              className={`rounded-lg border px-3 py-1 text-[11px] font-semibold transition-all ${
                explAlerts
                  ? "border-green-500/50 bg-green-500/15 text-green-400"
                  : "border-border bg-background text-muted-foreground hover:text-foreground"
              }`}
            >
              {explAlerts ? "🔔 Contracts: ON" : "🔕 Contracts: OFF"}
            </button>
            {alertMsg && <span className="text-[11px] text-primary">{alertMsg}</span>}
          </div>
        </div>
      )}

      {/* Radar Stream Sub-Tabs with Tier Badges */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTab(t.id);
              setChain("all");
              setPage(1);
            }}
            className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 font-mono text-xs font-semibold transition-all ${
              tab === t.id
                ? "bg-primary text-primary-foreground shadow"
                : "border border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>{isRu ? t.labelRu : t.labelEn}</span>
            <span
              className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                tab === t.id
                  ? "bg-black/25 text-primary-foreground"
                  : t.tierBadge === "FREE"
                  ? "border border-green-500/40 bg-green-500/15 text-green-400"
                  : "border border-primary/40 bg-primary/15 text-primary"
              }`}
            >
              {t.lockedForUser ? `🔒 ${t.tierBadge}` : t.tierBadge}
            </span>
          </button>
        ))}
      </div>

      {/* GitHub Omni-Harvester 6-Vertical Selector & OSPEC Pipeline Bar */}
      {tab === "github" && !feed?.locked && (
        <div className="space-y-3 rounded-xl border border-primary/30 bg-card p-3.5 font-mono text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 pb-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                OMNI-HARVESTER v2.0 ⇄ OSPEC
              </span>
              <span className="text-[11px] text-muted-foreground">
                {isRu
                  ? "Широкополосный сбор, классификация по 6 вертикалям и прямая передача в OSPEC Secret Scanner"
                  : "Wide-spectrum GitHub harvesting across 6 verticals with direct handoff to OSPEC Secret Scanner"}
              </span>
            </div>
            <button
              type="button"
              onClick={handleRunOmniHarvest}
              disabled={omniRunning}
              className="inline-flex items-center gap-1.5 rounded-lg border border-primary/50 bg-primary/15 px-3 py-1.5 text-[11px] font-bold text-primary transition-all hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
            >
              {omniRunning ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
              <span>
                {isRu
                  ? `⚡ Прогнать Omni-Harvester (${ghVertical === "ALL" ? "Все 6 вертикалей" : ghVertical})`
                  : `⚡ Run Omni-Harvester (${ghVertical === "ALL" ? "All 6 Verticals" : ghVertical})`}
              </span>
              {!isPaid && <span className="ml-1 rounded bg-black/30 px-1 py-0.5 text-[9px]">🔒 RADAR+</span>}
            </button>
          </div>

          {omniBanner && (
            <div className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-[11px] text-foreground">
              {omniBanner}
            </div>
          )}

          {/* 6 Vertical Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[10px] uppercase tracking-wider text-muted-foreground">
              {isRu ? "Вертикаль:" : "Vertical:"}
            </span>
            {[
              { id: "ALL", labelRu: "🌐 Все репо", labelEn: "🌐 All Repos", cnt: stats?.omni_stats?.total_github_repos || stats?.github_repos },
              { id: "WEB3_DEFI", labelRu: "⛓️ Web3 & DeFi", labelEn: "⛓️ Web3 & DeFi", cnt: stats?.omni_stats?.by_vertical?.WEB3_DEFI },
              { id: "AI_AGENTS", labelRu: "🤖 AI Agents & MCP", labelEn: "🤖 AI Agents & MCP", cnt: stats?.omni_stats?.by_vertical?.AI_AGENTS },
              { id: "INFRA_CLOUD", labelRu: "☁️ Infra & Cloud", labelEn: "☁️ Infra & Cloud", cnt: stats?.omni_stats?.by_vertical?.INFRA_CLOUD },
              { id: "STARTUP_SAAS", labelRu: "🚀 Startups & SaaS", labelEn: "🚀 Startups & SaaS", cnt: stats?.omni_stats?.by_vertical?.STARTUP_SAAS },
              { id: "QUANT_HFT", labelRu: "📈 Quant & HFT", labelEn: "📈 Quant & HFT", cnt: stats?.omni_stats?.by_vertical?.QUANT_HFT },
              { id: "DORK_LEAKS", labelRu: "🔑 Code Dorks", labelEn: "🔑 Code Dorks", cnt: stats?.omni_stats?.by_vertical?.DORK_LEAKS },
            ].map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => {
                  setGhVertical(v.id);
                  setPage(1);
                }}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-all ${
                  ghVertical === v.id
                    ? "border-primary bg-primary text-primary-foreground shadow"
                    : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
                }`}
              >
                <span>{isRu ? v.labelRu : v.labelEn}</span>
                {v.cnt !== undefined && (
                  <span className={`rounded px-1 py-0.2 text-[9px] ${ghVertical === v.id ? "bg-black/25 text-primary-foreground" : "bg-card text-muted-foreground"}`}>
                    {fmt(v.cnt)}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* OSPEC Chain Status Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="mr-1 text-[10px] uppercase tracking-wider text-muted-foreground">
              {isRu ? "Конвейер OSPEC:" : "OSPEC Chain:"}
            </span>
            {[
              { id: "ALL", labelRu: "Все статусы", labelEn: "All Statuses", cnt: stats?.omni_stats?.total_github_repos },
              { id: "FINDINGS", labelRu: "🔥 Утечки в OSPEC", labelEn: "🔥 OSPEC Leaks Found", cnt: stats?.omni_stats?.ospec_with_findings },
              { id: "PENDING", labelRu: "⏳ В очереди OSPEC", labelEn: "⏳ Queued for OSPEC", cnt: stats?.omni_stats?.ospec_pending },
              { id: "CLEAN", labelRu: "🟢 Проверено (Clean)", labelEn: "🟢 OSPEC Clean", cnt: stats?.omni_stats?.ospec_clean },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => {
                  setOspecFilter(st.id);
                  setPage(1);
                }}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-semibold transition-all ${
                  ospecFilter === st.id
                    ? "border-primary bg-primary/20 text-primary"
                    : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
                }`}
              >
                <span>{isRu ? st.labelRu : st.labelEn}</span>
                {st.cnt !== undefined && (
                  <span className="opacity-80">({fmt(st.cnt)})</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search & Chain Filter Bar */}
      {!feed?.locked && (
        <div className="flex flex-wrap items-center gap-2.5 rounded-xl border border-border bg-card p-3.5">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setPage(1);
                  loadFeed({ q: query, p: 1 });
                }
              }}
              placeholder={
                tab === "audits_base"
                  ? isRu
                    ? "Поиск по 20,826 готовым аудитам (1inch, aave, curve, lido, 0x...)"
                    : "Search 20,826 completed audits (1inch, aave, curve, lido, 0x...)"
                  : isRu
                  ? "Поиск по имени, 0x-адресу, репозиторию или тегам…"
                  : "Filter by name, 0x address, repo or tags…"
              }
              className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 font-mono text-xs text-foreground outline-none focus:border-primary"
            />
          </div>

          {(tab === "contracts" || tab === "zk") && (
            <select
              value={chain}
              onChange={(e) => {
                setChain(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs text-foreground outline-none focus:border-primary"
            >
              <option value="all">{isRu ? "Все сети" : "All Chains"}</option>
              <option value="ethereum">ETHEREUM</option>
              <option value="base">BASE</option>
              <option value="polygon">POLYGON</option>
              <option value="bsc">BSC</option>
              <option value="arbitrum">ARBITRUM</option>
            </select>
          )}

          <button
            type="button"
            onClick={() => {
              setPage(1);
              loadFeed({ q: query, p: 1 });
            }}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 font-mono text-xs font-semibold text-primary-foreground hover:bg-primary-dim disabled:opacity-50"
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            <span>{isRu ? "Найти / Обновить" : "Filter / Refresh"}</span>
          </button>
        </div>
      )}

      {/* Top Pagination Carousel */}
      {renderPaginationBar()}

      {/* Locked State for GUEST or RAW+ ZK */}
      {feed?.locked ? (
        <div className="rounded-2xl border border-primary/35 bg-card p-10 text-center bg-radial-red">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/40 bg-primary/15 text-primary">
            <Lock size={26} />
          </div>
          <span className="rounded-full border border-primary/40 bg-primary/15 px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest text-primary">
            {feed?.required_tier === "RAW" ? "RAW / BLACKBOX TIER REQUIRED" : "RADAR+ TIER REQUIRED"}
          </span>
          <h4 className="mt-4 text-xl font-bold text-foreground">
            {isRu
              ? "Этот радарный контур доступен с тарифа RADAR и выше (GitHub Radar открыт бесплатно)"
              : "This Autonomous Radar Requires RADAR+ Tier (GitHub Radar is Free)"}
          </h4>
          <p className="mx-auto mt-2 max-w-xl font-mono text-xs text-muted-foreground leading-relaxed">
            {isRu
              ? "GitHub Radar (33,122+ репозиториев) открыт для всех пользователей. Доступ к DeFiLlama Radar (9.3K протоколов), Verified Contracts (245K контрактов), Soroban Radar, архиву AUDITS_BASE (10.5K аудитов) и ZK Groth16 открывается по подписке RADAR / RAW / BLACKBOX."
              : "GitHub Radar (33,122+ repos) is open to all users. Access to DeFiLlama Radar (9.3K protocols), Verified Contracts (245K contracts), Soroban Radar, AUDITS_BASE (10.5K audits), and ZK Groth16 requires a RADAR / RAW / BLACKBOX subscription."}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                setTab("github");
                setPage(1);
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-5 py-2.5 font-mono text-xs font-semibold text-foreground hover:border-primary"
            >
              <span>{isRu ? "🔥 Перейти в бесплатный GitHub Radar" : "🔥 Open Free GitHub Radar"}</span>
            </button>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent("boris-open-checkout", { detail: { tier: tab === "zk" ? "raw" : "radar" } }))}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 font-mono text-xs font-semibold text-primary-foreground hover:bg-primary-dim btn-glow"
            >
              <span>{isRu ? "Оплатить доступ в крипте (RADAR+)" : "Unlock Instantly with Crypto"}</span>
              <ArrowUpRight size={14} />
            </button>
          </div>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center rounded-xl border border-border bg-card p-12 font-mono text-xs text-muted-foreground">
          <Loader2 size={18} className="mr-2 animate-spin text-primary" />
          <span>{isRu ? "Синхронизация с радарными демонами…" : "Syncing with live radar daemons…"}</span>
        </div>
      ) : !feed?.items || feed.items.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center font-mono text-xs text-muted-foreground">
          {isRu ? "По вашему запросу записей не найдено." : "No radar discoveries matched your filter."}
        </div>
      ) : (
        <div className="space-y-2.5">
          {feed.items.map((item: any) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
            >
              <div className="min-w-0 flex-1 font-mono">
                <div className="flex flex-wrap items-center gap-2">
                  {item.chain && (
                    <span className="rounded border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                      {item.chain}
                    </span>
                  )}
                  {item.vertical && (
                    <span
                      className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${
                        item.vertical === "AI_AGENTS"
                          ? "border-purple-500/40 bg-purple-500/15 text-purple-300"
                          : item.vertical === "INFRA_CLOUD"
                          ? "border-cyan-500/40 bg-cyan-500/15 text-cyan-300"
                          : item.vertical === "STARTUP_SAAS"
                          ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                          : item.vertical === "QUANT_HFT"
                          ? "border-amber-500/40 bg-amber-500/15 text-amber-300"
                          : item.vertical === "DORK_LEAKS"
                          ? "border-red-500/50 bg-red-500/15 text-red-400"
                          : "border-blue-500/40 bg-blue-500/15 text-blue-300"
                      }`}
                    >
                      {item.vertical === "AI_AGENTS"
                        ? "🤖 AI & MCP"
                        : item.vertical === "INFRA_CLOUD"
                        ? "☁️ INFRA"
                        : item.vertical === "STARTUP_SAAS"
                        ? "🚀 STARTUP"
                        : item.vertical === "QUANT_HFT"
                        ? "📈 QUANT/HFT"
                        : item.vertical === "DORK_LEAKS"
                        ? "🔑 DORK LEAK"
                        : "⛓️ WEB3/DEFI"}
                    </span>
                  )}
                  {item.ospec_status && (
                    <button
                      type="button"
                      onClick={() => {
                        if (item.ospec_status === "findings" && item.identifier) {
                          if (!isPaid) {
                            window.dispatchEvent(new CustomEvent("boris-open-checkout", { detail: { tier: "radar" } }));
                            return;
                          }
                          sessionStorage.setItem("boris_pending_ospec_repo", item.identifier);
                          window.dispatchEvent(new CustomEvent("boris-open-ospec-repo", { detail: { repo: item.identifier } }));
                        }
                      }}
                      className={`rounded border px-2 py-0.5 text-[10px] font-bold transition-all ${
                        item.ospec_status === "findings"
                          ? "cursor-pointer border-red-500/50 bg-red-500/15 text-red-400 hover:bg-red-500 hover:text-white"
                          : item.ospec_status === "clean"
                          ? "cursor-default border-green-500/40 bg-green-500/10 text-green-400"
                          : item.ospec_status === "pending"
                          ? "cursor-default border-yellow-500/40 bg-yellow-500/10 text-yellow-300"
                          : "cursor-default border-border bg-background text-muted-foreground"
                      }`}
                    >
                      {item.ospec_status === "findings"
                        ? isRu
                          ? `🔥 OSPEC: ${item.ospec_findings_count || 1} секретов ↗`
                          : `🔥 OSPEC: ${item.ospec_findings_count || 1} secrets ↗`
                        : item.ospec_status === "clean"
                        ? isRu
                          ? "🟢 OSPEC: Чисто"
                          : "🟢 OSPEC: Clean"
                        : item.ospec_status === "pending"
                        ? isRu
                          ? "⏳ В очереди OSPEC"
                          : "⏳ OSPEC Queued"
                        : item.ospec_status}
                    </button>
                  )}
                  <span className="truncate text-sm font-bold text-foreground">{item.name}</span>
                  {item.score ? (
                    <span className="rounded bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                      Score: <b className="text-foreground">{item.score}</b>
                    </span>
                  ) : null}
                  {item.language ? (
                    <span className="rounded border border-primary/30 bg-background px-1.5 py-0.5 text-[10px] uppercase text-primary">
                      {item.language}
                    </span>
                  ) : null}
                  {item.stars > 0 ? (
                    <span className="rounded border border-border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      ⭐ {item.stars}
                    </span>
                  ) : null}
                  {Array.isArray(item.tags) &&
                    item.tags.slice(0, 4).map((tg: string, idx: number) => (
                      <span
                        key={idx}
                        className="rounded border border-border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground"
                      >
                        {tg}
                      </span>
                    ))}
                </div>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {item.identifier} {item.description ? `· ${item.description}` : ""}
                </p>
                {item.discovered_at && (
                  <p className="mt-0.5 text-[10px] text-muted-foreground/80">
                    {String(item.discovered_at).slice(0, 19).replace("T", " ")}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                {item.source === "defillama" && item.identifier && (
                  <button
                    type="button"
                    onClick={() => handleEnrichDefillama(item.identifier)}
                    disabled={enrichLoadingSlug === item.identifier}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-background px-3 py-2 font-semibold text-foreground hover:border-primary hover:text-primary transition-colors"
                  >
                    {enrichLoadingSlug === item.identifier ? (
                      <Loader2 size={13} className="animate-spin text-primary" />
                    ) : (
                      <Search size={13} className="text-primary" />
                    )}
                    <span>
                      {expandedSlug === item.identifier
                        ? isRu ? "Скрыть профиль" : "Hide Profile"
                        : isRu ? "Найти GitHub / TVL" : "Enrich GitHub / TVL"}
                    </span>
                  </button>
                )}

                {item.source === "github" && item.ospec_status === "findings" && item.identifier && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!isPaid) {
                        window.dispatchEvent(new CustomEvent("boris-open-checkout", { detail: { tier: "radar" } }));
                        return;
                      }
                      sessionStorage.setItem("boris_pending_ospec_repo", item.identifier);
                      window.dispatchEvent(new CustomEvent("boris-open-ospec-repo", { detail: { repo: item.identifier } }));
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/50 bg-red-500/15 px-3 py-2 font-semibold text-red-400 hover:bg-red-500 hover:text-white transition-colors"
                  >
                    <span>🔑 {isRu ? "В OSPEC" : "Open in OSPEC"}</span>
                  </button>
                )}

                {item.task_id ? (
                  <button
                    type="button"
                    onClick={() => onOpenDossier(item.task_id)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 font-semibold text-primary-foreground hover:bg-primary-dim"
                  >
                    <Eye size={13} />
                    <span>{isRu ? "Открыть досье" : "Open Dossier"}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      onPrefillScan(
                        item.source === "github" && item.url
                          ? item.url
                          : item.identifier
                      )
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary/15 border border-primary/40 px-3 py-2 font-semibold text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    <Zap size={13} />
                    <span>{isRu ? "В сканер" : "Scan Target"}</span>
                  </button>
                )}

                {item.url && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-2 text-muted-foreground hover:border-primary hover:text-foreground"
                  >
                    <span>Source</span>
                    <ArrowUpRight size={12} />
                  </a>
                )}
              </div>

              {/* Expanded DeFiLlama Enriched Profile */}
              {item.source === "defillama" &&
                expandedSlug === item.identifier &&
                enrichedProtocols[item.identifier] && (
                  <div className="w-full mt-2 rounded-xl border border-primary/30 bg-background p-4 font-mono text-xs space-y-3">
                    {enrichedProtocols[item.identifier].error ? (
                      <p className="text-red-400">⚠️ {enrichedProtocols[item.identifier].error}</p>
                    ) : (
                      <>
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-primary">
                              📊 {enrichedProtocols[item.identifier].name}
                            </span>
                            {enrichedProtocols[item.identifier].category && (
                              <span className="rounded bg-card px-2 py-0.5 text-[10px] text-muted-foreground">
                                {enrichedProtocols[item.identifier].category}
                              </span>
                            )}
                            {enrichedProtocols[item.identifier].tvl_usd > 0 && (
                              <span className="rounded border border-green-500/40 bg-green-500/10 px-2 py-0.5 text-[10px] font-bold text-green-400">
                                TVL: ${fmt(Math.round(enrichedProtocols[item.identifier].tvl_usd))}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-[11px]">
                            {enrichedProtocols[item.identifier].homepage && (
                              <a
                                href={enrichedProtocols[item.identifier].homepage}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                              >
                                🌐 Website ↗
                              </a>
                            )}
                            {enrichedProtocols[item.identifier].socials?.twitter && (
                              <a
                                href={enrichedProtocols[item.identifier].socials.twitter}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                              >
                                🐦 X/Twitter ↗
                              </a>
                            )}
                          </div>
                        </div>

                        {Array.isArray(enrichedProtocols[item.identifier].chains) &&
                          enrichedProtocols[item.identifier].chains.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-[10px] uppercase text-muted-foreground">Chains:</span>
                              {enrichedProtocols[item.identifier].chains.map((ch: string, ci: number) => (
                                <span
                                  key={ci}
                                  className="rounded border border-border bg-card px-2 py-0.5 text-[10px] text-foreground"
                                >
                                  {ch}
                                </span>
                              ))}
                            </div>
                          )}

                        {/* Discovered GitHub Repositories with 1-Click Scan */}
                        <div>
                          <p className="mb-1.5 text-[10px] uppercase tracking-wider text-primary font-bold">
                            {isRu ? "Найденные GitHub-репозитории протокола:" : "Discovered Protocol GitHub Repositories:"}
                          </p>
                          {Array.isArray(enrichedProtocols[item.identifier].github_repos) &&
                          enrichedProtocols[item.identifier].github_repos.length > 0 ? (
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                              {enrichedProtocols[item.identifier].github_repos.map((gh: string, gi: number) => (
                                <div
                                  key={gi}
                                  className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2"
                                >
                                  <a
                                    href={gh}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="truncate text-[11px] font-semibold text-foreground hover:text-primary"
                                  >
                                    📦 {gh.replace("https://github.com/", "")}
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => onPrefillScan(gh)}
                                    className="shrink-0 inline-flex items-center gap-1 rounded bg-primary px-2.5 py-1 text-[10px] font-bold text-primary-foreground hover:bg-primary-dim"
                                  >
                                    <Zap size={11} />
                                    <span>{isRu ? "Скан репо" : "Scan Repo"}</span>
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[11px] text-muted-foreground">
                              {isRu ? "Публичные репозитории не привязаны." : "No public GitHub repositories linked."}
                            </p>
                          )}
                        </div>

                        {/* Linked On-Chain Contracts */}
                        {Array.isArray(enrichedProtocols[item.identifier].contracts) &&
                          enrichedProtocols[item.identifier].contracts.length > 0 && (
                            <div>
                              <p className="mb-1.5 text-[10px] uppercase tracking-wider text-primary font-bold">
                                {isRu ? "Привязанные смарт-контракты:" : "Linked Smart Contracts:"}
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {enrichedProtocols[item.identifier].contracts.map((ca: string, ci: number) => {
                                  const cleanAddr = ca.includes(":") ? ca.split(":").pop()! : ca;
                                  return (
                                    <button
                                      key={ci}
                                      type="button"
                                      onClick={() => onPrefillScan(cleanAddr)}
                                      className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-card px-3 py-1.5 text-[11px] text-foreground hover:border-primary hover:text-primary"
                                    >
                                      <code>{ca}</code>
                                      <Zap size={11} className="text-primary" />
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                      </>
                    )}
                  </div>
                )}
            </div>
          ))}
        </div>
      )}

      {/* Bottom Pagination Carousel */}
      {renderPaginationBar()}
    </div>
  );
};

export default RadarStreamPanel;
