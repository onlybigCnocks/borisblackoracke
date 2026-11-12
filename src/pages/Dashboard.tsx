import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { RevealOnScroll, GlowCard } from "@/components/ui-boris";
import DemoScanner from "@/components/DemoScanner";
import ToolsPanel from "@/components/ToolsPanel";
import {
  ArrowUpRight,
  Key,
  Copy,
  Check,
  RefreshCw,
  LogOut,
  Shield,
  Eye,
  Download,
  Radar,
  Bell,
  Plus,
  Trash2,
  Activity,
  Lock,
  Wrench,
} from "lucide-react";
import {
  apiGetMe,
  apiRotateKey,
  apiGetArchivedScan,
  apiAddWatchlist,
  apiRemoveWatchlist,
  apiGetRadarFeed,
  getScanExportUrl,
  clearAuthSession,
  getSavedToken,
  getSavedUser,
  type BorisUser,
  type BorisScanRecord,
  type BorisWatchlistItem,
  type BorisRadarAudit,
} from "@/lib/auth";

const VERDICT_BADGE: Record<string, string> = {
  SIGNIFICANT_SURFACE: "border-red-500/50 bg-red-500/15 text-red-400",
  MODERATE_SURFACE: "border-amber-500/50 bg-amber-500/15 text-amber-400",
  MINIMAL_SURFACE: "border-green-500/50 bg-green-500/15 text-green-400",
  CLEAN: "border-green-500/50 bg-green-500/15 text-green-400",
  SCANNING: "border-primary/50 bg-primary/15 text-primary",
  HIGH: "border-red-500/50 bg-red-500/15 text-red-400",
  LOW: "border-green-500/50 bg-green-500/15 text-green-400",
};

const Dashboard = () => {
  const { i18n } = useTranslation();
  const isRu = i18n.language === "ru";
  const navigate = useNavigate();

  const [user, setUser] = useState<BorisUser | null>(getSavedUser());
  const [scans, setScans] = useState<BorisScanRecord[]>([]);
  const [watchlist, setWatchlist] = useState<BorisWatchlistItem[]>([]);
  const [radarAudits, setRadarAudits] = useState<BorisRadarAudit[]>([]);
  const [activeTab, setActiveTab] = useState<"history" | "tools" | "watchlist" | "radar">("history");

  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [loadingScanId, setLoadingScanId] = useState<string | null>(null);

  const [watchTarget, setWatchTarget] = useState("");
  const [watchLabel, setWatchLabel] = useState("");
  const [addingWatch, setAddingWatch] = useState(false);

  useEffect(() => {
    const token = getSavedToken();
    if (!token) {
      navigate("/auth");
      return;
    }
    const fetchProfile = () => {
      apiGetMe()
        .then((data) => {
          setUser(data.user);
          setScans(data.scans || []);
          setWatchlist(data.watchlist || []);
        })
        .catch(() => {
          navigate("/auth");
        })
        .finally(() => setLoading(false));
    };
    fetchProfile();
    apiGetRadarFeed().then((feed) => {
      setRadarAudits(feed.audits || []);
    });
    window.addEventListener("boris-scan-started", fetchProfile);
    window.addEventListener("boris-scan-done", fetchProfile);
    return () => {
      window.removeEventListener("boris-scan-started", fetchProfile);
      window.removeEventListener("boris-scan-done", fetchProfile);
    };
  }, [navigate]);

  const handleCopyKey = () => {
    if (!user?.api_key) return;
    navigator.clipboard.writeText(user.api_key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRotateKey = async () => {
    setRotating(true);
    try {
      const newKey = await apiRotateKey();
      setUser((prev) => (prev ? { ...prev, api_key: newKey } : prev));
    } catch {
      // ignore
    } finally {
      setRotating(false);
    }
  };

  const handleLogout = () => {
    clearAuthSession();
    navigate("/auth");
  };

  // Refresh history periodically while on dashboard
  const refreshHistory = () => {
    apiGetMe()
      .then((data) => {
        setUser(data.user);
        setScans(data.scans || []);
        setWatchlist(data.watchlist || []);
      })
      .catch(() => {});
  };

  const handleOpenSavedScan = async (taskId: string) => {
    setLoadingScanId(taskId);
    try {
      const archived = await apiGetArchivedScan(taskId);
      window.dispatchEvent(
        new CustomEvent("boris-load-archived-scan", {
          detail: { taskId, result: archived },
        })
      );
      document.getElementById("demo-scanner")?.scrollIntoView({ behavior: "smooth" });
    } catch {
      // ignore
    } finally {
      setLoadingScanId(null);
    }
  };

  const handleAddWatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!watchTarget.trim()) return;
    setAddingWatch(true);
    try {
      const updated = await apiAddWatchlist(watchTarget.trim(), watchLabel.trim());
      setWatchlist(updated);
      setWatchTarget("");
      setWatchLabel("");
    } catch {
      // ignore
    } finally {
      setAddingWatch(false);
    }
  };

  const handleDeleteWatch = async (id: number) => {
    try {
      await apiRemoveWatchlist(id);
      setWatchlist((prev) => prev.filter((item) => item.id !== id));
    } catch {
      // ignore
    }
  };

  if (loading && !user) {
    return (
      <div className="container mx-auto flex min-h-[60vh] items-center justify-center px-4">
        <span className="font-mono text-sm text-muted-foreground">
          {isRu ? "Загрузка терминала оператора..." : "Loading operator terminal..."}
        </span>
      </div>
    );
  }

  return (
    <div className="container mx-auto min-h-screen px-4 py-12">
      <RevealOnScroll>
        {/* Top Profile Header */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-primary/30 bg-card p-6 bg-radial-red">
          <div className="flex items-center gap-4">
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.name}
                className="h-14 w-14 rounded-full border border-primary/50 object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-primary/40 bg-primary/15 font-mono text-xl font-bold text-primary">
                {(user?.name || user?.email || "B")[0].toUpperCase()}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="font-mono text-xl font-bold text-foreground md:text-2xl">
                  {user?.name || "Operator"}
                </h1>
                <span className="rounded border border-primary/40 bg-primary/15 px-2.5 py-0.5 font-mono text-xs font-bold text-primary">
                  {user?.tier || "GUEST"}
                </span>
              </div>
              <p className="font-mono text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/pricing"
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 font-mono text-xs font-semibold text-primary-foreground transition-all hover:bg-primary-dim btn-glow"
            >
              <span>{isRu ? "Повысить тариф" : "Upgrade Tier"}</span>
              <ArrowUpRight size={14} />
            </Link>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-4 py-2.5 font-mono text-xs font-semibold text-muted-foreground transition-all hover:border-primary hover:text-foreground"
            >
              <LogOut size={14} />
              <span>{isRu ? "Выйти" : "Sign Out"}</span>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          <GlowCard>
            <p className="font-mono text-xs text-muted-foreground">
              {isRu ? "Всего сканов" : "Total Scans"}
            </p>
            <p className="mt-1 font-mono text-2xl font-bold text-foreground">
              {Math.max(user?.scans_total || 0, scans.length)}
            </p>
          </GlowCard>
          <GlowCard>
            <p className="font-mono text-xs text-muted-foreground">
              {isRu ? "Текущий уровень" : "Active Tier"}
            </p>
            <p className="mt-1 font-mono text-2xl font-bold text-primary">
              {user?.tier || "GUEST"}
            </p>
          </GlowCard>
          <GlowCard>
            <p className="font-mono text-xs text-muted-foreground">
              {isRu ? "Суточная квота (24ч)" : "Daily Quota (24h)"}
            </p>
            <p className="mt-1 font-mono text-2xl font-bold text-foreground">
              {user?.daily_limit === -1 || user?.tier?.toUpperCase() === "BLACKBOX"
                ? `${user?.scans_today ?? 0} / ∞`
                : `${user?.scans_today ?? 0} / ${
                    user?.daily_limit ??
                    (user?.tier?.toUpperCase() === "RAW"
                      ? 50
                      : user?.tier?.toUpperCase() === "RADAR"
                      ? 25
                      : 3)
                  }`}
            </p>
          </GlowCard>
          <GlowCard>
            <p className="font-mono text-xs text-muted-foreground">
              {isRu ? "Хранилище" : "Vault Mode"}
            </p>
            <p className="mt-1 font-mono text-lg font-bold text-green-400">
              LOCAL SQLite WAL
            </p>
          </GlowCard>
        </div>

        {/* API Key Management Card */}
        <GlowCard className="mb-8 border-primary/30">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-primary">
                <Key size={14} />
                <span>{isRu ? "Персональный API-ключ оператора" : "Personal Operator API Key"}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {isRu
                  ? "Используйте заголовок X-Boris-Api-Key для автоматизации запросов к api.black-oracle.com"
                  : "Pass in X-Boris-Api-Key header to authenticate direct calls to api.black-oracle.com"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyKey}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs text-foreground transition-colors hover:border-primary"
              >
                {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                <span>{copied ? (isRu ? "Скопировано" : "Copied") : (isRu ? "Копировать" : "Copy")}</span>
              </button>
              <button
                onClick={handleRotateKey}
                disabled={rotating}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs text-muted-foreground transition-colors hover:border-primary hover:text-foreground disabled:opacity-50"
              >
                <RefreshCw size={14} className={rotating ? "animate-spin" : ""} />
                <span>{isRu ? "Перевыпустить" : "Rotate"}</span>
              </button>
            </div>
          </div>
          <div className="mt-3 rounded-lg border border-border bg-background px-4 py-3 font-mono text-xs text-foreground select-all overflow-x-auto">
            {user?.api_key || "boris_live_••••••••••••••••••••••••••••••••"}
          </div>
        </GlowCard>

        {/* Embedded Live Scanner right inside the Operator Cabinet */}
        <div className="mb-10 rounded-2xl border border-border bg-card/40 px-2">
          <DemoScanner />
        </div>

        {/* Navigation Tabs: History vs Watchlist vs 24/7 Radar Feed */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab("history")}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 font-mono text-xs font-semibold transition-all ${
                activeTab === "history"
                  ? "bg-primary text-primary-foreground shadow"
                  : "border border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              <Activity size={14} />
              <span>{isRu ? `История сканов (${scans.length})` : `Scan History (${scans.length})`}</span>
            </button>
            <button
              onClick={() => setActiveTab("tools")}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 font-mono text-xs font-semibold transition-all ${
                activeTab === "tools"
                  ? "bg-primary text-primary-foreground shadow"
                  : "border border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              <Wrench size={14} />
              <span>{isRu ? "Инструменты разведки" : "Intelligence Tools"}</span>
            </button>
            <button
              onClick={() => setActiveTab("watchlist")}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 font-mono text-xs font-semibold transition-all ${
                activeTab === "watchlist"
                  ? "bg-primary text-primary-foreground shadow"
                  : "border border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              <Bell size={14} />
              <span>{isRu ? `Мониторинг и Алерты (${watchlist.length})` : `Watchlist & Alerts (${watchlist.length})`}</span>
            </button>
            <button
              onClick={() => setActiveTab("radar")}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 font-mono text-xs font-semibold transition-all ${
                activeTab === "radar"
                  ? "bg-primary text-primary-foreground shadow"
                  : "border border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              <Radar size={14} />
              <span>24/7 Live Radar Feed</span>
              <span className="rounded border border-primary/40 bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold text-primary">
                SOON
              </span>
            </button>
          </div>

          <button
            onClick={refreshHistory}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
          >
            <RefreshCw size={12} />
            <span>{isRu ? "Обновить" : "Refresh"}</span>
          </button>
        </div>

        {/* TAB 1: User Scan History */}
        {activeTab === "tools" && <ToolsPanel />}

        {activeTab === "history" && (
          <div>
            {scans.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-8 text-center">
                <Shield className="mx-auto mb-2 text-muted-foreground" size={28} />
                <p className="font-mono text-sm text-foreground">
                  {isRu ? "У вас пока нет сохранённых сканов" : "No saved scans in your history yet"}
                </p>
                <p className="mt-1 font-mono text-xs text-muted-foreground">
                  {isRu
                    ? "Все сканы, запущенные вами после входа в аккаунт, автоматически сохраняются здесь."
                    : "Every scan you run while signed in is automatically recorded here."}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {scans.map((s) => {
                  const badge = VERDICT_BADGE[s.verdict || "SCANNING"] || VERDICT_BADGE.SCANNING;
                  const dateStr = new Date(s.created_at * 1000).toLocaleString();
                  return (
                    <div
                      key={s.task_id}
                      className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/50"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2.5">
                          <span className={`rounded border px-2 py-0.5 font-mono text-[10px] font-bold ${badge}`}>
                            {s.verdict || "SCANNING"}
                          </span>
                          <span className="truncate font-mono text-sm font-semibold text-foreground">
                            {s.project || s.target}
                          </span>
                        </div>
                        <p className="mt-1 font-mono text-xs text-muted-foreground truncate">
                          Target: {s.target} · {dateStr}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
                        <div className="mr-2">
                          <span className="text-muted-foreground">Patterns: </span>
                          <span className="font-bold text-foreground">{s.patterns_total}</span>
                          {" ("}
                          <span className="text-red-400">{s.patterns_critical}C</span>
                          {" / "}
                          <span className="text-orange-400">{s.patterns_high}H</span>
                          {")"}
                        </div>

                        <button
                          onClick={() => handleOpenSavedScan(s.task_id)}
                          disabled={loadingScanId === s.task_id}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 font-semibold text-primary-foreground transition-all hover:bg-primary-dim disabled:opacity-50"
                        >
                          <Eye size={13} />
                          <span>
                            {loadingScanId === s.task_id
                              ? isRu ? "Загрузка..." : "Loading..."
                              : isRu ? "Открыть досье" : "Open Dossier"}
                          </span>
                        </button>

                        {user?.tier && user.tier.toUpperCase() !== "GUEST" ? (
                          <a
                            href={getScanExportUrl(s.task_id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
                          >
                            <Download size={13} />
                            <span>JSON</span>
                          </a>
                        ) : (
                          <Link
                            to="/pricing"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                          >
                            <Lock size={12} className="text-primary" />
                            <span>JSON [RADAR+]</span>
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Watchlist & Contract Drift Alerts (RADAR+ Tier) */}
        {activeTab === "watchlist" && (
          <div className="space-y-6">
            {(!user?.tier || user.tier.toUpperCase() === "GUEST") ? (
              <div className="rounded-2xl border border-primary/35 bg-card p-10 text-center bg-radial-red">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/40 bg-primary/15 text-primary">
                  <Lock size={26} />
                </div>
                <span className="rounded-full border border-primary/40 bg-primary/15 px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest text-primary">
                  RADAR+ TIER REQUIRED
                </span>
                <h4 className="mt-4 text-xl font-bold text-foreground">
                  {isRu
                    ? "Непрерывный 24/7 мониторинг смарт-контрактов и GitHub-репозиториев"
                    : "Continuous 24/7 Smart Contract & GitHub Repository Drift Monitoring"}
                </h4>
                <p className="mx-auto mt-2 max-w-xl font-mono text-xs text-muted-foreground leading-relaxed">
                  {isRu
                    ? "Отслеживание новых коммитов после аудита (Audit Drift), смены Proxy-имплементации, вызовов привилегированных функций и перемещений средств топ-холдеров доступно начиная с тарифа RADAR ($19/мес)."
                    : "Tracking post-audit commits (Audit Drift), proxy implementation upgrades, privileged function calls, and top-holder movements is available starting from the RADAR tier ($19/mo)."}
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <Link
                    to="/pricing"
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 font-mono text-xs font-semibold text-primary-foreground transition-all hover:bg-primary-dim btn-glow"
                  >
                    <span>{isRu ? "Открыть доступ (RADAR / RAW / BLACKBOX)" : "Unlock Watchlist (RADAR+)"}</span>
                    <ArrowUpRight size={14} />
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <form onSubmit={handleAddWatch} className="rounded-xl border border-border bg-card p-5">
                  <h4 className="mb-3 font-mono text-xs uppercase tracking-wider text-primary font-semibold">
                    {isRu
                      ? "➕ Добавить смарт-контракт или GitHub-репо на непрерывный 24/7 мониторинг"
                      : "➕ Add Smart Contract or GitHub Repo to 24/7 Drift Watchlist"}
                  </h4>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <input
                      type="text"
                      value={watchTarget}
                      onChange={(e) => setWatchTarget(e.target.value)}
                      placeholder="0x... or github.com/org/repo"
                      required
                      className="sm:col-span-2 rounded-xl border border-border bg-background px-4 py-3 font-mono text-xs text-foreground outline-none focus:border-primary"
                    />
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={watchLabel}
                        onChange={(e) => setWatchLabel(e.target.value)}
                        placeholder={isRu ? "Метка (напр. Main Vault)" : "Label (e.g. Main Vault)"}
                        className="flex-1 rounded-xl border border-border bg-background px-3 py-3 font-mono text-xs text-foreground outline-none focus:border-primary"
                      />
                      <button
                        type="submit"
                        disabled={addingWatch}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-3 font-mono text-xs font-semibold text-primary-foreground transition-all hover:bg-primary-dim disabled:opacity-50"
                      >
                        <Plus size={14} />
                        <span>{isRu ? "Следить" : "Watch"}</span>
                      </button>
                    </div>
                  </div>
                </form>

                {watchlist.length === 0 ? (
                  <div className="rounded-xl border border-border bg-card p-8 text-center font-mono text-xs text-muted-foreground">
                    {isRu
                      ? "Список наблюдения пуст. Добавьте адрес контракта или репозиторий выше для отслеживания новых коммитов, смены Proxy-имплементации и движений китов."
                      : "Watchlist is empty. Add a contract or repo above to track proxy upgrades, new commits, and whale movements."}
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {watchlist.map((w) => (
                      <div
                        key={w.id}
                        className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-4"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                            <span className="font-mono text-sm font-bold text-foreground">{w.label}</span>
                            <span className="rounded border border-primary/40 bg-primary/10 px-2 py-0.5 font-mono text-[10px] text-primary">
                              DRIFT GUARD ACTIVE
                            </span>
                          </div>
                          <p className="mt-1 font-mono text-xs text-muted-foreground truncate">{w.target}</p>
                        </div>
                        <button
                          onClick={() => handleDeleteWatch(w.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-1.5 font-mono text-xs text-muted-foreground hover:border-red-500/50 hover:text-red-400"
                        >
                          <Trash2 size={13} />
                          <span>{isRu ? "Удалить" : "Remove"}</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* TAB 3: 24/7 Live Autonomous Radar Feed — SOON Stub */}
        {activeTab === "radar" && (
          <div className="rounded-2xl border border-primary/30 bg-card p-10 text-center bg-radial-red">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/40 bg-primary/15 text-primary">
              <Radar size={28} />
            </div>
            <span className="rounded-full border border-primary/40 bg-primary/15 px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest text-primary">
              COMING SOON // BORIS RADAR STREAM
            </span>
            <h4 className="mt-4 text-xl font-bold text-foreground">
              {isRu
                ? "Прямой эфир 5 автономных радаров (GitHub · DeFiLlama · Verified Contracts · Soroban · ZK)"
                : "24/7 Autonomous Radar Stream (GitHub · DeFiLlama · Verified Contracts · Soroban · ZK)"}
            </h4>
            <p className="mx-auto mt-2 max-w-xl font-mono text-xs text-muted-foreground leading-relaxed">
              {isRu
                ? "Модуль синхронизации фоновых радаров с веб-терминалом находится в закрытом тестировании для подписчиков RADAR / RAW / BLACKBOX. Сейчас поток находок в реальном времени доступен через Telegram-контур."
                : "Direct web synchronization of BORIS autonomous radars is in closed testing for RADAR / RAW / BLACKBOX tiers. Live discovery alerts are currently streamed via the Telegram terminal."}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                to="/pricing"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 font-mono text-xs font-semibold text-primary-foreground transition-all hover:bg-primary-dim btn-glow"
              >
                <span>{isRu ? "Тарифы доступа (RADAR / RAW / BLACKBOX)" : "View Access Tiers"}</span>
                <ArrowUpRight size={14} />
              </Link>
            </div>
          </div>
        )}
      </RevealOnScroll>
    </div>
  );
};

export default Dashboard;
