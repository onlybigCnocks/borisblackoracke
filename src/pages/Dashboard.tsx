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
  Users,
  Settings,
} from "lucide-react";
import {
  apiGetMe,
  apiRotateKey,
  apiGetArchivedScan,
  apiAddWatchlist,
  apiRemoveWatchlist,
  apiGetRadarFeed,
  apiGetReferral,
  apiBindReferral,
  apiSyncTelegram,
  apiInitTelegramDeeplink,
  apiUpdateProfile,
  getScanExportUrl,
  clearAuthSession,
  getSavedToken,
  getSavedUser,
  authHeaders,
  type BorisUser,
  type BorisScanRecord,
  type BorisWatchlistItem,
  type BorisRadarAudit,
} from "@/lib/auth";

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://api.black-oracle.com";

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
  const [activeTab, setActiveTab] = useState<"history" | "tools" | "watchlist" | "radar" | "referral">("history");

  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [loadingScanId, setLoadingScanId] = useState<string | null>(null);

  const [watchTarget, setWatchTarget] = useState("");
  const [watchLabel, setWatchLabel] = useState("");
  const [addingWatch, setAddingWatch] = useState(false);
  const [driftBusy, setDriftBusy] = useState<string | null>(null);
  const [driftInfo, setDriftInfo] = useState<any>(null);
  const [refData, setRefData] = useState<any>(null);
  const [refCodeInput, setRefCodeInput] = useState("");
  const [refMsg, setRefMsg] = useState<string | null>(null);
  const [tgInput, setTgInput] = useState("");
  const [tgSyncing, setTgSyncing] = useState(false);
  const [tgWaitingApp, setTgWaitingApp] = useState(false);
  const [tgMsg, setTgMsg] = useState<string | null>(null);

  // Profile Settings Drawer State
  const [editingProfile, setEditingProfile] = useState(false);
  const [profName, setProfName] = useState("");
  const [profEmail, setProfEmail] = useState("");
  const [profAvatar, setProfAvatar] = useState("");
  const [profPassword, setProfPassword] = useState("");
  const [profSaving, setProfSaving] = useState(false);
  const [profMsg, setProfMsg] = useState<string | null>(null);

  const openProfileEditor = () => {
    setProfName(user?.name || "");
    setProfEmail(user?.email || "");
    setProfAvatar(user?.avatar_url || "");
    setProfPassword("");
    setProfMsg(null);
    setEditingProfile((prev) => !prev);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfSaving(true);
    setProfMsg(null);
    try {
      const res = await apiUpdateProfile({
        name: profName.trim(),
        email: profEmail.trim(),
        avatar_url: profAvatar.trim(),
        new_password: profPassword.trim() || undefined,
      });
      setUser(res.user);
      setProfPassword("");
      setProfMsg(isRu ? "✅ Настройки профиля сохранены" : "✅ Profile settings saved");
      setTimeout(() => setEditingProfile(false), 900);
    } catch (err: any) {
      setProfMsg(`⚠️ ${err.message}`);
    } finally {
      setProfSaving(false);
    }
  };

  const handleLaunchTelegramAppSync = async () => {
    setTgWaitingApp(true);
    setTgMsg(
      isRu
        ? "Открываем приложение Telegram… Нажмите «Запустить / Start» в боте @BlackOracleBORIS_bot."
        : "Launching Telegram app… Press 'Start' in @BlackOracleBORIS_bot."
    );
    try {
      const dl = await apiInitTelegramDeeplink();
      // Trigger native tg:// protocol to open Telegram Desktop / Mobile app directly
      window.location.href = dl.tg_app_url;

      // Poll /api/auth/me every 2.5s for up to 60s to detect instant completion
      const prevTg = user?.tg_id || "";
      const prevTier = user?.tier || "GUEST";
      for (let i = 0; i < 24; i++) {
        await new Promise((r) => setTimeout(r, 2500));
        const me = await apiGetMe().catch(() => null);
        if (me?.user && (me.user.tg_id && (me.user.tg_id !== prevTg || me.user.tier !== prevTier || i >= 1))) {
          setUser(me.user);
          setTgMsg(
            isRu
              ? `✅ Синхронизировано через Telegram App: @${me.user.tg_username || me.user.tg_id} · Тариф: ${me.user.tier}`
              : `✅ Synced via Telegram App: @${me.user.tg_username || me.user.tg_id} · Tier: ${me.user.tier}`
          );
          setTgWaitingApp(false);
          return;
        }
      }
    } catch (err: any) {
      setTgMsg(`⚠️ ${err.message}`);
    } finally {
      setTgWaitingApp(false);
    }
  };

  const handleSyncTelegram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tgInput.trim()) return;
    setTgSyncing(true);
    setTgMsg(null);
    try {
      const res = await apiSyncTelegram(tgInput.trim());
      if (res.user) setUser(res.user);
      setTgMsg(
        isRu
          ? `✅ Привязан @${res.tg_username || res.tg_id} · Тариф: ${res.effective_tier} · Сканов: ${res.tg_scans}`
          : `✅ Linked @${res.tg_username || res.tg_id} · Tier: ${res.effective_tier} · Scans: ${res.tg_scans}`
      );
      setTgInput("");
    } catch (err: any) {
      setTgMsg(`⚠️ ${err.message}`);
    } finally {
      setTgSyncing(false);
    }
  };

  const handleRescanDrift = async (s: BorisScanRecord) => {
    setDriftBusy(s.task_id);
    setDriftInfo(null);
    try {
      const r = await fetch(`${API_BASE_URL}/api/demo-scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ target: s.target }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.detail || `HTTP ${r.status}`);
      }
      const { task_id } = await r.json();

      let finished = false;
      for (let i = 0; i < 90 && !finished; i++) {
        await new Promise((res) => setTimeout(res, 2000));
        const pr = await fetch(`${API_BASE_URL}/api/demo-scan/status/${task_id}`, { headers: authHeaders() });
        const pj = await pr.json().catch(() => ({}));
        if (pj.status === "finished" || pj.status === "failed") finished = true;
      }

      const dr = await fetch(`${API_BASE_URL}/api/tools/drift-compare`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ old_task_id: s.task_id, new_task_id: task_id }),
      });
      const dj = await dr.json().catch(() => ({}));
      if (!dr.ok) throw new Error(dj.detail || `HTTP ${dr.status}`);
      setDriftInfo({ ...dj, target_label: s.project || s.target });
    } catch (e: any) {
      setDriftInfo({ error: e.message || "Drift comparison failed" });
    } finally {
      setDriftBusy(null);
    }
  };

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
    apiGetReferral().then(setRefData);
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
        <div className="mb-8 rounded-2xl border border-primary/30 bg-card p-6 bg-radial-red">
          <div className="flex flex-wrap items-center justify-between gap-4">
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
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="font-mono text-xl font-bold text-foreground md:text-2xl">
                    {user?.name || "Operator"}
                  </h1>
                  <span className="rounded border border-primary/40 bg-primary/15 px-2.5 py-0.5 font-mono text-xs font-bold text-primary">
                    {user?.tier || "GUEST"}
                  </span>
                  <button
                    type="button"
                    onClick={openProfileEditor}
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-background/80 px-2.5 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                  >
                    <Settings size={12} />
                    <span>{isRu ? "Настройки профиля" : "Edit Profile"}</span>
                  </button>
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

          {editingProfile && (
            <form
              onSubmit={handleSaveProfile}
              className="mt-5 border-t border-border pt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
            >
              <div>
                <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {isRu ? "Никнейм / Имя" : "Nickname / Display Name"}
                </label>
                <input
                  type="text"
                  value={profName}
                  onChange={(e) => setProfName(e.target.value)}
                  required
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 font-mono text-xs text-foreground outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Email
                </label>
                <input
                  type="email"
                  value={profEmail}
                  onChange={(e) => setProfEmail(e.target.value)}
                  required
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 font-mono text-xs text-foreground outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {isRu ? "URL аватарки (опц.)" : "Avatar URL (optional)"}
                </label>
                <input
                  type="url"
                  value={profAvatar}
                  onChange={(e) => setProfAvatar(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 font-mono text-xs text-foreground outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {isRu ? "Новый пароль (опц.)" : "New Password (optional)"}
                </label>
                <input
                  type="password"
                  value={profPassword}
                  onChange={(e) => setProfPassword(e.target.value)}
                  placeholder={isRu ? "Оставьте пустым без смены" : "Leave blank to keep"}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 font-mono text-xs text-foreground outline-none focus:border-primary"
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-4 flex flex-wrap items-center justify-between gap-3 pt-1">
                <span className="font-mono text-xs text-primary">{profMsg || ""}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingProfile(false)}
                    className="rounded-xl border border-border bg-background px-4 py-2 font-mono text-xs text-muted-foreground hover:text-foreground"
                  >
                    {isRu ? "Отмена" : "Cancel"}
                  </button>
                  <button
                    type="submit"
                    disabled={profSaving}
                    className="rounded-xl bg-primary px-5 py-2 font-mono text-xs font-semibold text-primary-foreground transition-all hover:bg-primary-dim disabled:opacity-50 btn-glow"
                  >
                    {profSaving
                      ? isRu ? "Сохранение…" : "Saving…"
                      : isRu ? "Сохранить профиль" : "Save Profile"}
                  </button>
                </div>
              </div>
            </form>
          )}
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

        {/* Telegram Account Sync Card (Native App Launch + Fallback) */}
        <GlowCard className="mb-8 border-primary/30">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-primary font-semibold">
                <span>⚡ {isRu ? "Синхронизация с Telegram (@BlackOracleBORIS_bot)" : "Telegram Bot Tier Sync (@BlackOracleBORIS_bot)"}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {user?.tg_id
                  ? isRu
                    ? `Синхронизировано с Telegram: @${user.tg_username || user.tg_id} (ID: ${user.tg_id}) · Тариф ${user.tier} · Сканов: ${user.scans_total}`
                    : `Synced with Telegram: @${user.tg_username || user.tg_id} (ID: ${user.tg_id}) · Tier ${user.tier} · Scans: ${user.scans_total}`
                  : isRu
                  ? "Нажмите кнопку ниже — откроется приложение Telegram, нажмите «Start», и ваш тариф (RADAR / RAW / BLACKBOX) + история сканов автоматически синхронизируются."
                  : "Click below to launch the Telegram app natively, press 'Start', and your tier + scan count will sync automatically."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleLaunchTelegramAppSync}
                disabled={tgWaitingApp}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 font-mono text-xs font-semibold text-primary-foreground transition-all hover:bg-primary-dim btn-glow disabled:opacity-50"
              >
                <ArrowUpRight size={14} />
                <span>
                  {tgWaitingApp
                    ? isRu ? "Ожидание подтверждения в Telegram…" : "Waiting for Telegram App…"
                    : isRu ? "Открыть Telegram App и синхронизировать" : "Sync via Telegram App"}
                </span>
              </button>

              <form onSubmit={handleSyncTelegram} className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={tgInput}
                  onChange={(e) => setTgInput(e.target.value)}
                  placeholder={user?.tg_username ? `@${user.tg_username}` : isRu ? "или @username / ID" : "or @username / ID"}
                  className="w-36 rounded-lg border border-border bg-background px-2.5 py-2 font-mono text-xs text-foreground outline-none focus:border-primary"
                />
                <button
                  type="submit"
                  disabled={tgSyncing || !tgInput.trim()}
                  className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs text-muted-foreground transition-colors hover:border-primary hover:text-foreground disabled:opacity-40"
                >
                  <RefreshCw size={12} className={tgSyncing ? "animate-spin" : ""} />
                  <span>{isRu ? "По ID" : "By ID"}</span>
                </button>
              </form>
            </div>
          </div>
          {tgMsg && <p className="mt-2 font-mono text-xs text-primary">{tgMsg}</p>}
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
              onClick={() => setActiveTab("referral")}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 font-mono text-xs font-semibold transition-all ${
                activeTab === "referral"
                  ? "bg-primary text-primary-foreground shadow"
                  : "border border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              <Users size={14} />
              <span>{isRu ? "Партнёрка" : "Referral"}</span>
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
              <span>{isRu ? "Мониторинг 24/7" : "24/7 Watchlist"}</span>
              <span className="rounded border border-primary/40 bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold text-primary">
                SOON
              </span>
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
        {driftInfo && (
          <div className="mb-6 rounded-xl border border-primary/40 bg-card p-5">
            <div className="flex items-start justify-between gap-3">
              <p className="font-mono text-xs font-bold uppercase tracking-wider text-primary">
                {isRu ? "Audit Drift — сравнение сканов" : "Audit Drift — scan comparison"}
              </p>
              <button
                onClick={() => setDriftInfo(null)}
                className="font-mono text-[11px] text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>
            {driftInfo.error ? (
              <p className="mt-2 font-mono text-xs text-destructive">{driftInfo.error}</p>
            ) : (
              <>
                <p className="mt-2 truncate font-mono text-xs text-foreground">{driftInfo.target_label}</p>
                <div className="mt-3 flex flex-wrap gap-4 font-mono text-xs">
                  <span className="text-muted-foreground">
                    {driftInfo.old_verdict} → <b className="text-foreground">{driftInfo.new_verdict}</b>
                  </span>
                  <span className={Number(driftInfo.delta_total) > 0 ? "text-destructive" : "text-primary"}>
                    ΔTotal {Number(driftInfo.delta_total) > 0 ? "+" : ""}{driftInfo.delta_total}
                  </span>
                  <span className={Number(driftInfo.delta_critical) > 0 ? "text-destructive" : "text-primary"}>
                    ΔCritical {Number(driftInfo.delta_critical) > 0 ? "+" : ""}{driftInfo.delta_critical}
                  </span>
                  <span className={Number(driftInfo.delta_high) > 0 ? "text-destructive" : "text-primary"}>
                    ΔHigh {Number(driftInfo.delta_high) > 0 ? "+" : ""}{driftInfo.delta_high}
                  </span>
                </div>
                {driftInfo.added_patterns?.length > 0 && (
                  <p className="mt-2 font-mono text-[11px] text-destructive">
                    + {driftInfo.added_patterns.map((a: any) => `${a.type}×${a.count}`).join(", ")}
                  </p>
                )}
                {driftInfo.resolved_patterns?.length > 0 && (
                  <p className="mt-1 font-mono text-[11px] text-primary">
                    − {driftInfo.resolved_patterns.map((a: any) => `${a.type}×${a.count}`).join(", ")}
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === "referral" && (
          <div className="space-y-5">
            <div className="rounded-xl border border-border bg-card p-5">
              <h4 className="font-mono text-xs font-semibold uppercase tracking-wider text-primary">
                {isRu ? "Партнёрская программа BORIS" : "BORIS Affiliate Program"}
              </h4>
              <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                {isRu
                  ? `Ваша ставка: ${Math.round((refData?.commission_rate ?? 0.1) * 100)}% с каждого оплаченного реферала. Ставка растёт с тарифом: GUEST 10% · RADAR 20% · RAW 25% · BLACKBOX 30%.`
                  : `Your rate: ${Math.round((refData?.commission_rate ?? 0.1) * 100)}% of every paid referral. Rate scales with tier: GUEST 10% · RADAR 20% · RAW 25% · BLACKBOX 30%.`}
              </p>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-border bg-background p-4">
                  <p className="font-mono text-[10px] uppercase text-muted-foreground">{isRu ? "Код" : "Code"}</p>
                  <p className="mt-1 font-mono text-lg font-bold text-primary">{refData?.code || "—"}</p>
                </div>
                <div className="rounded-lg border border-border bg-background p-4 sm:col-span-2">
                  <p className="font-mono text-[10px] uppercase text-muted-foreground">{isRu ? "Ссылка" : "Link"}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <p className="flex-1 truncate font-mono text-[11px] text-foreground">{refData?.link || "—"}</p>
                    <button
                      onClick={() => {
                        if (refData?.link) {
                          navigator.clipboard.writeText(refData.link);
                          setRefMsg(isRu ? "Ссылка скопирована" : "Link copied");
                          setTimeout(() => setRefMsg(null), 2000);
                        }
                      }}
                      className="rounded border border-border px-2 py-1 font-mono text-[10px] text-muted-foreground hover:border-primary hover:text-primary"
                    >
                      {isRu ? "Копировать" : "Copy"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-3">
                {[
                  { k: isRu ? "Приглашено" : "Invited", v: refData?.total_invited ?? 0 },
                  { k: isRu ? "Оплатили" : "Paid", v: refData?.paid_invited ?? 0 },
                  { k: isRu ? "К выплате" : "Payout", v: `$${Number(refData?.pending_payout_usd ?? 0).toFixed(2)}` },
                ].map((c, i) => (
                  <div key={i} className="rounded-lg border border-border bg-background p-4 text-center">
                    <p className="font-mono text-[10px] uppercase text-muted-foreground">{c.k}</p>
                    <p className="mt-1 font-mono text-lg font-bold text-foreground">{c.v}</p>
                  </div>
                ))}
              </div>
              {refMsg && <p className="mt-2 font-mono text-[11px] text-primary">{refMsg}</p>}
            </div>

            {refData?.invited?.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-5">
                <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-primary">
                  {isRu ? "Рефералы" : "Referrals"}
                </p>
                <div className="space-y-1.5">
                  {refData.invited.map((r: any, i: number) => (
                    <div key={i} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2 font-mono text-[11px]">
                      <span className="text-foreground">{r.email}</span>
                      <span className="text-muted-foreground">{r.tier}</span>
                      <span className="text-primary">{r.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-xl border border-border bg-card p-5">
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {isRu ? "Ввести чужой реф-код (если вас пригласили)" : "Bind an inviter's referral code"}
              </p>
              <div className="mt-2 flex gap-2">
                <input
                  value={refCodeInput}
                  onChange={(e) => setRefCodeInput(e.target.value.toUpperCase())}
                  placeholder="BOXXXXXXXX"
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs text-foreground outline-none focus:border-primary"
                />
                <button
                  onClick={async () => {
                    try {
                      await apiBindReferral(refCodeInput);
                      setRefMsg(isRu ? "Код привязан" : "Code bound");
                      apiGetReferral().then(setRefData);
                    } catch (e: any) {
                      setRefMsg(e.message);
                    }
                  }}
                  disabled={!refCodeInput}
                  className="rounded-lg bg-primary px-4 py-2 font-mono text-xs font-semibold text-primary-foreground disabled:opacity-40"
                >
                  {isRu ? "Привязать" : "Bind"}
                </button>
              </div>
            </div>
          </div>
        )}

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
                          <button
                            onClick={() => handleRescanDrift(s)}
                            disabled={driftBusy === s.task_id}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-muted-foreground transition-colors hover:border-primary hover:text-foreground disabled:opacity-50"
                          >
                            <RefreshCw size={13} className={driftBusy === s.task_id ? "animate-spin" : ""} />
                            <span>
                              {driftBusy === s.task_id
                                ? isRu ? "Рескан…" : "Rescan…"
                                : isRu ? "Rescan и Drift" : "Rescan & Drift"}
                            </span>
                          </button>
                        ) : null}

                        <Link
                          to={`/report/${s.task_id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
                        >
                          <ArrowUpRight size={13} />
                          <span>{isRu ? "Поделиться" : "Share"}</span>
                        </Link>

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

        {/* TAB 2: Watchlist & Contract Drift Alerts — SOON Stub */}
        {activeTab === "watchlist" && (
          <div className="rounded-2xl border border-primary/30 bg-card p-10 text-center bg-radial-red">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/40 bg-primary/15 text-primary">
              <Bell size={28} />
            </div>
            <span className="rounded-full border border-primary/40 bg-primary/15 px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest text-primary">
              COMING SOON // 24/7 DRIFT WATCHER
            </span>
            <h4 className="mt-4 text-xl font-bold text-foreground">
              {isRu
                ? "Непрерывный 24/7 мониторинг смарт-контрактов и GitHub-репозиториев (RADAR+)"
                : "Continuous 24/7 Smart Contract & GitHub Repository Drift Monitoring (RADAR+)"}
            </h4>
            <p className="mx-auto mt-2 max-w-xl font-mono text-xs text-muted-foreground leading-relaxed">
              {isRu
                ? "Автоматический демон отслеживания новых коммитов после аудита (Audit Drift), смены Proxy-имплементации и движений топ-холдеров готовится к запуску для подписчиков RADAR / RAW / BLACKBOX. Для разового сравнения двух сканов используйте кнопку «Rescan и Drift» в истории сканов."
                : "Autonomous daemon for tracking post-audit commits (Audit Drift), proxy implementation upgrades, and whale movements is preparing for launch for RADAR+ tiers. Use 'Rescan & Drift' in your scan history for on-demand drift comparison."}
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
