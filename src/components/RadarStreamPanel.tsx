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
} from "lucide-react";
import {
  apiGetRadarFeed,
  apiUpdateRadarSettings,
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
  const [query, setQuery] = useState<string>("");
  const [minScore, setMinScore] = useState<number>(0);

  const [loading, setLoading] = useState<boolean>(true);
  const [feed, setFeed] = useState<any>({ stats: {}, items: [], locked: false });

  // Telegram Radar Alert Settings (synced with users_db.json)
  const tgMeta = user?.tg_meta || {};
  const [ghAlerts, setGhAlerts] = useState<boolean>(Boolean(tgMeta.radar_alerts_enabled));
  const [defiAlerts, setDefiAlerts] = useState<boolean>(Boolean(tgMeta.defillama_alerts_enabled));
  const [explAlerts, setExplAlerts] = useState<boolean>(Boolean(tgMeta.explorer_alerts_enabled));
  const [savingAlerts, setSavingAlerts] = useState<boolean>(false);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

  useEffect(() => {
    if (user?.tg_meta) {
      setGhAlerts(Boolean(user.tg_meta.radar_alerts_enabled));
      setDefiAlerts(Boolean(user.tg_meta.defillama_alerts_enabled));
      setExplAlerts(Boolean(user.tg_meta.explorer_alerts_enabled));
    }
  }, [user?.tg_meta]);

  const loadFeed = async (override?: { t?: RadarTab; c?: string; q?: string; ms?: number }) => {
    setLoading(true);
    try {
      const data = await apiGetRadarFeed({
        tab: override?.t ?? tab,
        chain: override?.c ?? chain,
        q: override?.q ?? query,
        min_score: override?.ms ?? minScore,
        limit: 40,
      });
      setFeed(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeed({ t: tab, c: chain });
  }, [tab, chain]);

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

  const TABS: Array<{ id: RadarTab; labelRu: string; labelEn: string; count?: number }> = [
    { id: "github", labelRu: "🔥 GitHub Репо", labelEn: "🔥 GitHub Repos", count: stats.github_repos },
    { id: "defillama", labelRu: "📊 DeFiLlama", labelEn: "📊 DeFiLlama", count: stats.defillama_protocols },
    { id: "contracts", labelRu: "🔗 Верифицированные контракты", labelEn: "🔗 Verified Contracts", count: stats.verified_contracts },
    { id: "soroban", labelRu: "🛡️ Soroban / Stellar", labelEn: "🛡️ Soroban Radar", count: stats.soroban_targets },
    { id: "zk", labelRu: "🔐 ZK Groth16 [RAW+]", labelEn: "🔐 ZK Groth16 [RAW+]", count: stats.zk_verifiers },
    { id: "audits_base", labelRu: "📚 Архив аудитов (10.5K)", labelEn: "📚 Audit Archive (10.5K)", count: stats.audits_archive },
  ];

  return (
    <div className="space-y-5">
      {/* Global Live Counters across all 6 BORIS radars */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { k: "GitHub Radar", v: fmt(stats.github_repos || 33121) },
          { k: "DeFiLlama", v: fmt(stats.defillama_protocols || 9396) },
          { k: "Verified Contracts", v: fmt(stats.verified_contracts || 245175) },
          { k: "Soroban Radar", v: fmt(stats.soroban_targets || 641) },
          { k: "ZK Verifiers", v: fmt(stats.zk_verifiers || 4982) },
          { k: isRu ? "Архив AUDITS_BASE" : "AUDITS_BASE Archive", v: fmt(stats.audits_archive || 10572) },
        ].map((c, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-3.5">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground truncate">{c.k}</p>
            </div>
            <p className="mt-1 font-mono text-lg font-bold text-foreground">{c.v}</p>
          </div>
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

      {/* Radar Stream Sub-Tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTab(t.id);
              setChain("all");
            }}
            className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 font-mono text-xs font-semibold transition-all ${
              tab === t.id
                ? "bg-primary text-primary-foreground shadow"
                : "border border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>{isRu ? t.labelRu : t.labelEn}</span>
          </button>
        ))}
      </div>

      {/* Search & Chain Filter Bar */}
      {!feed?.locked && (
        <div className="flex flex-wrap items-center gap-2.5 rounded-xl border border-border bg-card p-3.5">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadFeed({ q: query })}
              placeholder={
                tab === "audits_base"
                  ? isRu
                    ? "Поиск по 10,572 готовым аудитам (1inch, uniswap, curve, 0x...)"
                    : "Search 10,572 completed audits (1inch, uniswap, curve, 0x...)"
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
              onChange={(e) => setChain(e.target.value)}
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
            onClick={() => loadFeed({ q: query })}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 font-mono text-xs font-semibold text-primary-foreground hover:bg-primary-dim disabled:opacity-50"
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            <span>{isRu ? "Найти / Обновить" : "Filter / Refresh"}</span>
          </button>
        </div>
      )}

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
              ? "Прямой поток 5 автономных радаров и архива из 10,572 аудитов"
              : "Live Stream of 5 Autonomous Radars & 10,572-Audit Archive"}
          </h4>
          <p className="mx-auto mt-2 max-w-xl font-mono text-xs text-muted-foreground leading-relaxed">
            {isRu
              ? "Доступ к живому потоку находок GitHub Radar (33K репо), DeFiLlama (9.3K протоколов), Verified Contracts (245K контрактов), Soroban, ZK Groth16 и архиву AUDITS_BASE открывается с тарифа RADAR."
              : "Access to live discoveries across GitHub Radar (33K repos), DeFiLlama (9.3K protocols), Verified Contracts (245K contracts), Soroban, ZK Groth16, and the AUDITS_BASE archive requires RADAR+."}
          </p>
          <div className="mt-6 flex justify-center">
            <Link
              to="/pricing"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 font-mono text-xs font-semibold text-primary-foreground hover:bg-primary-dim btn-glow"
            >
              <span>{isRu ? "Повысить тариф (RADAR / RAW / BLACKBOX)" : "Upgrade Tier"}</span>
              <ArrowUpRight size={14} />
            </Link>
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
                  <span className="truncate text-sm font-bold text-foreground">{item.name}</span>
                  {item.score ? (
                    <span className="rounded bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                      Score: <b className="text-foreground">{item.score}</b>
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RadarStreamPanel;
