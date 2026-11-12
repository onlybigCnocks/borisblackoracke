import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { RevealOnScroll, GlowCard } from "@/components/ui-boris";
import DemoScanner from "@/components/DemoScanner";
import {
  ArrowUpRight,
  Key,
  Copy,
  Check,
  RefreshCw,
  LogOut,
  Shield,
} from "lucide-react";
import {
  apiGetMe,
  apiRotateKey,
  clearAuthSession,
  getSavedToken,
  getSavedUser,
  type BorisUser,
  type BorisScanRecord,
} from "@/lib/auth";

const VERDICT_BADGE: Record<string, string> = {
  SIGNIFICANT_SURFACE: "border-red-500/50 bg-red-500/15 text-red-400",
  MODERATE_SURFACE: "border-amber-500/50 bg-amber-500/15 text-amber-400",
  MINIMAL_SURFACE: "border-green-500/50 bg-green-500/15 text-green-400",
  CLEAN: "border-green-500/50 bg-green-500/15 text-green-400",
  SCANNING: "border-primary/50 bg-primary/15 text-primary",
};

const Dashboard = () => {
  const { i18n } = useTranslation();
  const isRu = i18n.language === "ru";
  const navigate = useNavigate();

  const [user, setUser] = useState<BorisUser | null>(getSavedUser());
  const [scans, setScans] = useState<BorisScanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [quickInput, setQuickInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [rotating, setRotating] = useState(false);

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
        })
        .catch(() => {
          navigate("/auth");
        })
        .finally(() => setLoading(false));
    };
    fetchProfile();
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
      })
      .catch(() => {});
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
              {isRu ? "Лимит в веб-песочнице" : "Web Sandbox Quota"}
            </p>
            <p className="mt-1 font-mono text-2xl font-bold text-foreground">
              10 / {isRu ? "час" : "hr"}
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

        {/* User Scan History */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">
              {isRu ? "История ваших сканирований" : "Your Inspection History"}
            </h3>
            <button
              onClick={refreshHistory}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 font-mono text-xs text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
            >
              <RefreshCw size={12} />
              <span>{isRu ? "Обновить" : "Refresh"}</span>
            </button>
          </div>
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
            <div className="space-y-2.5">
              {scans.map((s) => {
                const badge = VERDICT_BADGE[s.verdict || "SCANNING"] || VERDICT_BADGE.SCANNING;
                const dateStr = new Date(s.created_at * 1000).toLocaleString();
                return (
                  <div
                    key={s.task_id}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
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
                    <div className="flex items-center gap-4 font-mono text-xs">
                      <div>
                        <span className="text-muted-foreground">Patterns: </span>
                        <span className="font-bold text-foreground">{s.patterns_total}</span>
                        {" ("}
                        <span className="text-red-400">{s.patterns_critical}C</span>
                        {" / "}
                        <span className="text-orange-400">{s.patterns_high}H</span>
                        {")"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </RevealOnScroll>
    </div>
  );
};

export default Dashboard;
