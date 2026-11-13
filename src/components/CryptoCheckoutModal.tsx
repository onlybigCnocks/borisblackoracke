import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Copy,
  Check,
  RefreshCw,
  ShieldCheck,
  Wallet,
  Sparkles,
  Tag,
  Clock,
  ExternalLink,
  Zap,
  Lock,
} from "lucide-react";
import {
  apiGetPaymentPlans,
  apiQuotePayment,
  apiCreatePaymentInvoice,
  apiSwitchInvoiceNetwork,
  apiCheckPaymentInvoice,
  apiGetMe,
  apiLogin,
  apiRegister,
  getSavedToken,
  type BorisPaymentNetwork,
  type BorisPaymentQuote,
  type BorisPaymentInvoice,
} from "@/lib/auth";

type BaseTierKey = "radar" | "raw" | "blackbox";

const DEFAULT_NETWORKS: BorisPaymentNetwork[] = [
  { id: "arbitrum", name: "Arbitrum One", short: "ARB", family: "evm", chain_id: 42161, chain_hex: "0xa4b1", fee_hint: "~$0.01 · 2s", recommended: true, tokens: ["USDT", "USDC"] },
  { id: "base", name: "Base", short: "BASE", family: "evm", chain_id: 8453, chain_hex: "0x2105", fee_hint: "~$0.01 · 2s", recommended: true, tokens: ["USDC", "USDT"] },
  { id: "bsc", name: "BNB Chain", short: "BSC", family: "evm", chain_id: 56, chain_hex: "0x38", fee_hint: "~$0.03 · 3s", recommended: true, tokens: ["USDT", "USDC"] },
  { id: "tron", name: "TRON (TRC-20)", short: "TRC20", family: "tron", chain_id: 0, chain_hex: "", fee_hint: "TRC-20 · 3s", recommended: false, tokens: ["USDT"] },
  { id: "solana", name: "Solana (SPL)", short: "SOL", family: "solana", chain_id: 0, chain_hex: "", fee_hint: "~$0.005 · 1s", recommended: false, tokens: ["USDC", "USDT"] },
  { id: "polygon", name: "Polygon", short: "POLY", family: "evm", chain_id: 137, chain_hex: "0x89", fee_hint: "~$0.01 · 3s", recommended: false, tokens: ["USDT", "USDC"] },
  { id: "ethereum", name: "Ethereum", short: "ERC20", family: "evm", chain_id: 1, chain_hex: "0x1", fee_hint: "L1 · 12s", recommended: false, tokens: ["USDT", "USDC"] },
];

const EVM_CHAIN_PARAMS: Record<string, any> = {
  arbitrum: {
    chainId: "0xa4b1",
    chainName: "Arbitrum One",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: ["https://arb1.arbitrum.io/rpc"],
    blockExplorerUrls: ["https://arbiscan.io"],
  },
  base: {
    chainId: "0x2105",
    chainName: "Base",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: ["https://mainnet.base.org"],
    blockExplorerUrls: ["https://basescan.org"],
  },
  bsc: {
    chainId: "0x38",
    chainName: "BNB Smart Chain",
    nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
    rpcUrls: ["https://bsc-dataseed.binance.org"],
    blockExplorerUrls: ["https://bscscan.com"],
  },
  polygon: {
    chainId: "0x89",
    chainName: "Polygon Mainnet",
    nativeCurrency: { name: "POL", symbol: "POL", decimals: 18 },
    rpcUrls: ["https://polygon-rpc.com"],
    blockExplorerUrls: ["https://polygonscan.com"],
  },
};

const CryptoCheckoutModal = () => {
  const { i18n } = useTranslation();
  const isRu = i18n.language?.startsWith("ru");

  const [open, setOpen] = useState(false);
  const [tier, setTier] = useState<BaseTierKey>("raw");
  const [yearly, setYearly] = useState(false);
  const [method, setMethod] = useState<"onchain" | "cryptobot" | "ref_balance">("onchain");

  const [networks, setNetworks] = useState<BorisPaymentNetwork[]>(DEFAULT_NETWORKS);
  const [selectedNet, setSelectedNet] = useState<string>("arbitrum");
  const [selectedAsset, setSelectedAsset] = useState<string>("USDT");

  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState("");
  const [promoError, setPromoError] = useState<string | null>(null);

  const [quote, setQuote] = useState<BorisPaymentQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

  const [invoice, setInvoice] = useState<BorisPaymentInvoice | null>(null);
  const [creatingInv, setCreatingInv] = useState(false);
  const [switchingNet, setSwitchingNet] = useState(false);
  const [checkingInv, setCheckingInv] = useState(false);
  const [walletBusy, setWalletBusy] = useState(false);
  const [txHashInput, setTxHashInput] = useState("");
  const [showTxInput, setShowTxInput] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [paidSuccess, setPaidSuccess] = useState(false);
  const [countdown, setCountdown] = useState<number>(3600);

  const [copiedAddr, setCopiedAddr] = useState(false);
  const [copiedAmt, setCopiedAmt] = useState(false);

  // Inline quick auth state when opened by logged-out visitor
  const [hasToken, setHasToken] = useState<boolean>(!!getSavedToken());
  const [authMode, setAuthMode] = useState<"login" | "register">("register");
  const [authEmail, setAuthEmail] = useState("");
  const [authPass, setAuthPass] = useState("");
  const [authName, setAuthName] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authErr, setAuthErr] = useState<string | null>(null);

  const planId = yearly ? `${tier}_yearly` : tier;

  // Listen to global checkout trigger from any page / component
  useEffect(() => {
    const onOpen = (ev: Event) => {
      const detail = (ev as CustomEvent).detail || {};
      if (detail.planId) {
        const pid = String(detail.planId).toLowerCase();
        setYearly(pid.endsWith("_yearly"));
        const base = pid.replace("_yearly", "") as BaseTierKey;
        if (base === "radar" || base === "raw" || base === "blackbox") setTier(base);
      } else {
        if (detail.tier && ["radar", "raw", "blackbox"].includes(detail.tier)) {
          setTier(detail.tier);
        }
        if (typeof detail.yearly === "boolean") {
          setYearly(detail.yearly);
        }
      }
      setHasToken(!!getSavedToken());
      setInvoice(null);
      setPaidSuccess(false);
      setErrorMsg(null);
      setOpen(true);
    };

    const onAuthChange = () => setHasToken(!!getSavedToken());

    window.addEventListener("boris-open-checkout", onOpen);
    window.addEventListener("boris-auth-change", onAuthChange);
    return () => {
      window.removeEventListener("boris-open-checkout", onOpen);
      window.removeEventListener("boris-auth-change", onAuthChange);
    };
  }, []);

  // Load networks & user subscription metadata when modal opens
  useEffect(() => {
    if (!open) return;
    apiGetPaymentPlans()
      .then((res) => {
        if (res.networks?.length) setNetworks(res.networks);
      })
      .catch(() => {});
  }, [open, hasToken]);

  // Refresh price quote whenever plan or promo changes
  useEffect(() => {
    if (!open) return;
    setQuoteLoading(true);
    setErrorMsg(null);
    apiQuotePayment(planId, appliedPromo)
      .then((q) => {
        setQuote(q);
        setPromoError(null);
      })
      .catch((err: any) => {
        setPromoError(err.message);
      })
      .finally(() => setQuoteLoading(false));
  }, [open, planId, appliedPromo, hasToken]);

  // Reset active invoice if user changes plan or payment method tab
  useEffect(() => {
    if (invoice && invoice.status !== "paid") {
      setInvoice(null);
    }
  }, [planId, method]);

  // Countdown timer for active pending invoice
  useEffect(() => {
    if (!open || !invoice || invoice.status !== "pending") return;
    setCountdown(invoice.remaining_seconds || 3600);
    const t = setInterval(() => {
      setCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [open, invoice?.id, invoice?.status]);

  // Auto-poll active invoice status every 6 seconds
  useEffect(() => {
    if (!open || !invoice || invoice.status !== "pending" || paidSuccess) return;
    const poll = setInterval(async () => {
      try {
        const res = await apiCheckPaymentInvoice(invoice.id);
        if (res.paid) {
          await handleFulfilledSuccess(res.invoice);
        }
      } catch {
        // silent background poll
      }
    }, 6000);
    return () => clearInterval(poll);
  }, [open, invoice?.id, invoice?.status, paidSuccess]);

  const handleFulfilledSuccess = async (paidInv: BorisPaymentInvoice) => {
    setInvoice(paidInv);
    setPaidSuccess(true);
    await apiGetMe().catch(() => {});
    window.dispatchEvent(new Event("boris-auth-change"));
    window.dispatchEvent(new Event("boris-scan-done"));
  };

  const handleQuickAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthBusy(true);
    setAuthErr(null);
    try {
      const savedRef = localStorage.getItem("boris_ref_code") || undefined;
      if (authMode === "register") {
        await apiRegister(authEmail.trim(), authPass, authName.trim() || undefined, savedRef);
      } else {
        await apiLogin(authEmail.trim(), authPass);
      }
      setHasToken(true);
    } catch (err: any) {
      setAuthErr(err.message);
    } finally {
      setAuthBusy(false);
    }
  };

  const handleApplyPromo = async () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) {
      setAppliedPromo("");
      setPromoError(null);
      return;
    }
    setQuoteLoading(true);
    setPromoError(null);
    try {
      const q = await apiQuotePayment(planId, code);
      setQuote(q);
      setAppliedPromo(code);
      if (invoice && invoice.status === "pending") setInvoice(null);
    } catch (err: any) {
      setPromoError(err.message);
    } finally {
      setQuoteLoading(false);
    }
  };

  const handleCreateInvoice = async () => {
    setCreatingInv(true);
    setErrorMsg(null);
    try {
      const res = await apiCreatePaymentInvoice({
        plan_id: planId,
        method,
        network: selectedNet,
        asset: selectedAsset,
        promo_code: appliedPromo,
      });
      setInvoice(res.invoice);
      setQuote(res.quote);
      if (res.invoice.status === "paid" || method === "ref_balance") {
        await handleFulfilledSuccess(res.invoice);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setCreatingInv(false);
    }
  };

  const handleSelectNetOrAsset = async (newNetId: string, newAsset?: string) => {
    const netObj = networks.find((n) => n.id === newNetId) || DEFAULT_NETWORKS[0];
    const validAsset =
      newAsset && netObj.tokens.includes(newAsset)
        ? newAsset
        : netObj.tokens.includes(selectedAsset)
        ? selectedAsset
        : netObj.tokens[0];

    setSelectedNet(newNetId);
    setSelectedAsset(validAsset);

    if (invoice && invoice.status === "pending" && invoice.method === "onchain") {
      setSwitchingNet(true);
      setErrorMsg(null);
      try {
        const res = await apiSwitchInvoiceNetwork(invoice.id, newNetId, validAsset);
        setInvoice(res.invoice);
      } catch (err: any) {
        setErrorMsg(err.message);
      } finally {
        setSwitchingNet(false);
      }
    }
  };

  const handleManualCheck = async () => {
    if (!invoice) return;
    setCheckingInv(true);
    setErrorMsg(null);
    try {
      const res = await apiCheckPaymentInvoice(invoice.id, txHashInput.trim() || undefined);
      if (res.paid) {
        await handleFulfilledSuccess(res.invoice);
      } else {
        setErrorMsg(
          isRu
            ? "Транзакция пока не подтверждена в блокчейне. Как только блок закроется (обычно 3–20 сек), доступ откроется автоматически."
            : "Transfer not confirmed on-chain yet. Your tier unlocks automatically within 3–20s of block confirmation."
        );
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setCheckingInv(false);
    }
  };

  const handlePayWithWeb3Wallet = async () => {
    if (!invoice || !invoice.network_meta || invoice.network_meta.family !== "evm") return;
    const eth = (window as any).ethereum;
    if (!eth) {
      setErrorMsg(
        isRu
          ? "Web3-кошелёк (MetaMask / Rabby / Trust / OKX) не обнаружен в браузере. Отсканируйте QR-код с телефона или скопируйте адрес."
          : "No browser Web3 wallet detected (MetaMask / Rabby / Trust / OKX). Scan the QR code or copy the deposit address."
      );
      return;
    }
    setWalletBusy(true);
    setErrorMsg(null);
    try {
      const accounts: string[] = await eth.request({ method: "eth_requestAccounts" });
      if (!accounts?.length) throw new Error("Wallet connection cancelled");

      const targetChainHex = invoice.network_meta.chain_hex;
      if (targetChainHex) {
        try {
          await eth.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: targetChainHex }],
          });
        } catch (switchErr: any) {
          if (switchErr?.code === 4902 && EVM_CHAIN_PARAMS[invoice.network]) {
            await eth.request({
              method: "wallet_addEthereumChain",
              params: [EVM_CHAIN_PARAMS[invoice.network]],
            });
          } else {
            throw switchErr;
          }
        }
      }

      const txHash: string = await eth.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: accounts[0],
            to: invoice.network_meta.token_contract,
            value: "0x0",
            data: invoice.evm_transfer_data,
          },
        ],
      });

      setTxHashInput(txHash);
      // Poll faster right after wallet broadcast
      for (let i = 0; i < 10; i++) {
        await new Promise((r) => setTimeout(r, 3000));
        const chk = await apiCheckPaymentInvoice(invoice.id, txHash);
        if (chk.paid) {
          await handleFulfilledSuccess(chk.invoice);
          return;
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Wallet transaction cancelled");
    } finally {
      setWalletBusy(false);
    }
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const curNetObj = networks.find((n) => n.id === selectedNet) || DEFAULT_NETWORKS[0];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[92vh] overflow-y-auto border-primary/40 bg-card sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-mono text-lg font-bold text-foreground">
            <ShieldCheck className="text-primary" size={20} />
            <span>
              {isRu ? "Крипто-касса BORIS · Мгновенный доступ" : "BORIS Crypto Checkout · Instant Activation"}
            </span>
          </DialogTitle>
          <DialogDescription className="font-mono text-xs text-muted-foreground">
            {isRu
              ? "0% комиссия · Без KYC · Автоматическая активация на сайте и в Telegram-боте"
              : "0% gateway fee · No KYC · Instant sync across Web Terminal & Telegram Bot"}
          </DialogDescription>
        </DialogHeader>

        {/* SUCCESS STATE */}
        {paidSuccess && invoice ? (
          <div className="my-4 rounded-2xl border border-primary/50 bg-primary/10 p-6 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
              <Check size={28} />
            </div>
            <h3 className="font-mono text-xl font-bold text-foreground">
              {isRu ? `Тариф ${invoice.base_tier} активирован!` : `${invoice.base_tier} Tier Activated!`}
            </h3>
            <p className="mt-2 font-mono text-xs text-muted-foreground">
              {isRu
                ? `Оплата $${invoice.amount_usd.toFixed(2)} подтверждена. Все закрытые модули разведки, квоты и экспорт JSON разблокированы.`
                : `Payment of $${invoice.amount_usd.toFixed(2)} confirmed. All intelligence modules, quotas, and JSON exports are now unlocked.`}
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 font-mono text-xs font-semibold text-primary-foreground transition-all hover:bg-primary-dim btn-glow"
            >
              <Sparkles size={14} />
              <span>{isRu ? "Перейти к работе" : "Continue to Terminal"}</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4 pt-1">
            {/* 1. Plan & Billing Selector */}
            <div className="rounded-xl border border-border bg-background/70 p-3">
              <div className="mb-2.5 flex items-center justify-between gap-2">
                <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                  {isRu ? "1. Уровень доступа" : "1. Intelligence Tier"}
                </span>
                <div className="inline-flex rounded-lg border border-border bg-card p-0.5 font-mono text-[11px]">
                  <button
                    type="button"
                    onClick={() => setYearly(false)}
                    className={`rounded-md px-2.5 py-1 transition-all ${
                      !yearly ? "bg-primary font-bold text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {isRu ? "30 дней" : "Monthly"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setYearly(true)}
                    className={`rounded-md px-2.5 py-1 transition-all ${
                      yearly ? "bg-primary font-bold text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {isRu ? "Год (-25%)" : "Yearly (-25%)"}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { k: "radar", name: "RADAR", m: 19, y: 171, sub: isRu ? "25 скан/д" : "25/day" },
                    { k: "raw", name: "RAW", m: 29, y: 261, sub: isRu ? "50 скан/д" : "50/day" },
                    { k: "blackbox", name: "BLACKBOX", m: 49, y: 441, sub: isRu ? "Безлимит" : "Unlimited" },
                  ] as const
                ).map((item) => {
                  const active = tier === item.k;
                  return (
                    <button
                      key={item.k}
                      type="button"
                      onClick={() => setTier(item.k)}
                      className={`rounded-xl border p-2.5 text-left transition-all ${
                        active
                          ? "border-primary bg-primary/15 shadow-sm"
                          : "border-border bg-card hover:border-primary/40"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-foreground">{item.name}</span>
                        {active && <span className="h-2 w-2 rounded-full bg-primary" />}
                      </div>
                      <div className="mt-1 font-mono text-base font-bold text-primary">
                        ${yearly ? item.y : item.m}
                        <span className="text-[10px] font-normal text-muted-foreground">
                          {yearly ? (isRu ? "/год" : "/yr") : isRu ? "/мес" : "/mo"}
                        </span>
                      </div>
                      <div className="font-mono text-[10px] text-muted-foreground">{item.sub}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* If visitor is not logged in: inline 5-second sign-in / sign-up */}
            {!hasToken ? (
              <form onSubmit={handleQuickAuth} className="rounded-xl border border-primary/40 bg-background/80 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-foreground">
                    <Lock size={13} className="text-primary" />
                    <span>
                      {authMode === "register"
                        ? isRu
                          ? "Быстрое создание аккаунта для привязки тарифа"
                          : "Quick account setup to bind your subscription"
                        : isRu
                        ? "Вход в аккаунт оператора"
                        : "Sign in to operator account"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode(authMode === "register" ? "login" : "register");
                      setAuthErr(null);
                    }}
                    className="font-mono text-[11px] text-primary underline"
                  >
                    {authMode === "register"
                      ? isRu
                        ? "Уже есть аккаунт? Войти"
                        : "Have an account? Sign in"
                      : isRu
                      ? "Создать аккаунт"
                      : "Create account"}
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {authMode === "register" && (
                    <input
                      type="text"
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                      placeholder={isRu ? "Никнейм (опц.)" : "Nickname (optional)"}
                      className="rounded-lg border border-border bg-card px-3 py-2 font-mono text-xs text-foreground outline-none focus:border-primary sm:col-span-2"
                    />
                  )}
                  <input
                    type="email"
                    required
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="Email"
                    className="rounded-lg border border-border bg-card px-3 py-2 font-mono text-xs text-foreground outline-none focus:border-primary"
                  />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={authPass}
                    onChange={(e) => setAuthPass(e.target.value)}
                    placeholder={isRu ? "Пароль (мин. 6 симв.)" : "Password (min 6 chars)"}
                    className="rounded-lg border border-border bg-card px-3 py-2 font-mono text-xs text-foreground outline-none focus:border-primary"
                  />
                </div>
                {authErr && <p className="font-mono text-xs text-destructive">{authErr}</p>}
                <button
                  type="submit"
                  disabled={authBusy}
                  className="w-full rounded-xl bg-primary py-2.5 font-mono text-xs font-bold text-primary-foreground transition-all hover:bg-primary-dim btn-glow disabled:opacity-50"
                >
                  {authBusy
                    ? isRu
                      ? "Подождите…"
                      : "Please wait…"
                    : isRu
                    ? "Продолжить к крипто-оплате →"
                    : "Continue to Crypto Payment →"}
                </button>
              </form>
            ) : (
              <>
                {/* 2. Promo Code & Price Breakdown */}
                <div className="rounded-xl border border-border bg-background/70 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Tag size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        value={promoInput}
                        onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                        placeholder={isRu ? "Промокод (если есть)" : "Promo code (optional)"}
                        className="w-full rounded-lg border border-border bg-card py-1.5 pl-8 pr-2.5 font-mono text-xs text-foreground outline-none focus:border-primary"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleApplyPromo}
                      disabled={quoteLoading}
                      className="rounded-lg border border-border bg-card px-3 py-1.5 font-mono text-xs font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
                    >
                      {isRu ? "Применить" : "Apply"}
                    </button>
                  </div>
                  {promoError && <p className="font-mono text-[11px] text-destructive">{promoError}</p>}

                  {quote && (
                    <div className="space-y-1 border-t border-border/60 pt-2 font-mono text-xs">
                      {quote.proration_credit_usd > 0 && (
                        <div className="flex justify-between text-green-400">
                          <span>{isRu ? "Перерасчёт текущей подписки:" : "Active tier upgrade credit:"}</span>
                          <span>−${quote.proration_credit_usd.toFixed(2)}</span>
                        </div>
                      )}
                      {quote.discount_usd > 0 && (
                        <div className="flex justify-between text-primary">
                          <span>
                            {isRu ? `Скидка (${quote.promo_code}):` : `Promo (${quote.promo_code}):`}
                          </span>
                          <span>−${quote.discount_usd.toFixed(2)}</span>
                        </div>
                      )}
                      {quote.bonus_days > 0 && (
                        <div className="flex justify-between text-primary">
                          <span>{isRu ? "Бонусные дни:" : "Bonus duration:"}</span>
                          <span>+{quote.bonus_days}d</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-0.5 text-sm font-bold text-foreground">
                        <span>
                          {isRu
                            ? `Итого к оплате (${quote.total_days} дн.):`
                            : `Total due (${quote.total_days} days):`}
                        </span>
                        <span className="text-base text-primary">${quote.final_amount_usd.toFixed(2)} USD</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Payment Method Tabs */}
                <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-border bg-background/70 p-1 font-mono text-xs">
                  <button
                    type="button"
                    onClick={() => setMethod("onchain")}
                    className={`rounded-lg py-2 px-2 font-semibold transition-all ${
                      method === "onchain"
                        ? "bg-primary text-primary-foreground shadow"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    🔗 On-Chain (0%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMethod("cryptobot")}
                    className={`rounded-lg py-2 px-2 font-semibold transition-all ${
                      method === "cryptobot"
                        ? "bg-primary text-primary-foreground shadow"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    ⚡ @CryptoBot
                  </button>
                  <button
                    type="button"
                    onClick={() => setMethod("ref_balance")}
                    className={`rounded-lg py-2 px-2 font-semibold transition-all ${
                      method === "ref_balance"
                        ? "bg-primary text-primary-foreground shadow"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    💰 {isRu ? "Реф-баланс" : "Ref Balance"}
                  </button>
                </div>

                {/* METHOD A: ON-CHAIN DIRECT */}
                {method === "onchain" && (
                  <div className="space-y-3 rounded-xl border border-border bg-background/60 p-3.5">
                    {/* Network Pills */}
                    <div>
                      <div className="mb-1.5 flex items-center justify-between font-mono text-[11px] text-muted-foreground">
                        <span>{isRu ? "Сеть блокчейна (можно менять на лету):" : "Select Network (instant switch):"}</span>
                        <span className="text-primary">{curNetObj.fee_hint}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {networks.map((n) => (
                          <button
                            key={n.id}
                            type="button"
                            disabled={switchingNet}
                            onClick={() => handleSelectNetOrAsset(n.id)}
                            className={`rounded-lg border px-2.5 py-1.5 font-mono text-[11px] font-semibold transition-all ${
                              selectedNet === n.id
                                ? "border-primary bg-primary/20 text-primary"
                                : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                            }`}
                          >
                            {n.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Stablecoin Pills */}
                    {curNetObj.tokens.length > 1 && (
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] text-muted-foreground">
                          {isRu ? "Токен:" : "Token:"}
                        </span>
                        {curNetObj.tokens.map((tk) => (
                          <button
                            key={tk}
                            type="button"
                            disabled={switchingNet}
                            onClick={() => handleSelectNetOrAsset(selectedNet, tk)}
                            className={`rounded-md border px-3 py-1 font-mono text-xs font-bold transition-all ${
                              selectedAsset === tk
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-card text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {tk}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Generate or Display Active On-Chain Invoice */}
                    {!invoice ? (
                      <button
                        type="button"
                        onClick={handleCreateInvoice}
                        disabled={creatingInv}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-mono text-xs font-bold text-primary-foreground transition-all hover:bg-primary-dim btn-glow disabled:opacity-50"
                      >
                        <Wallet size={15} />
                        <span>
                          {creatingInv
                            ? isRu
                              ? "Генерация персонального HD-адреса…"
                              : "Deriving dedicated HD address…"
                            : isRu
                            ? `Получить адрес оплаты · $${quote?.final_amount_usd.toFixed(2) || "—"} ${selectedAsset}`
                            : `Generate Deposit Address · $${quote?.final_amount_usd.toFixed(2) || "—"} ${selectedAsset}`}
                        </span>
                      </button>
                    ) : (
                      <div className="space-y-3 pt-1">
                        <div className="flex flex-col items-center gap-3 sm:flex-row">
                          {invoice.qr_svg && (
                            <div className="shrink-0 rounded-xl bg-white p-2 shadow-md">
                              <img
                                src={invoice.qr_svg}
                                alt="Deposit QR"
                                className="h-32 w-32 object-contain"
                              />
                            </div>
                          )}

                          <div className="min-w-0 flex-1 space-y-2 w-full">
                            <div className="flex items-center justify-between font-mono text-[11px]">
                              <span className="inline-flex items-center gap-1 text-primary font-semibold">
                                <RefreshCw size={11} className="animate-spin" />
                                {isRu ? "Авто-проверка блока каждые 6 сек" : "Auto-scanning blocks every 6s"}
                              </span>
                              <span className="inline-flex items-center gap-1 text-muted-foreground">
                                <Clock size={11} />
                                {formatTimer(countdown)}
                              </span>
                            </div>

                            {/* Exact Amount Copy Box */}
                            <div className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 font-mono text-xs">
                              <div>
                                <span className="text-[10px] text-muted-foreground block">
                                  {isRu ? `Точная сумма (${invoice.network_meta?.name || invoice.network}):` : `Exact amount (${invoice.network_meta?.name || invoice.network}):`}
                                </span>
                                <span className="text-sm font-bold text-primary">
                                  {invoice.amount_usd.toFixed(2)} {invoice.asset}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(invoice.amount_usd.toFixed(2));
                                  setCopiedAmt(true);
                                  setTimeout(() => setCopiedAmt(false), 1800);
                                }}
                                className="inline-flex items-center gap-1 rounded border border-border bg-background px-2 py-1 text-[11px] text-muted-foreground hover:border-primary hover:text-foreground"
                              >
                                {copiedAmt ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                                <span>{copiedAmt ? (isRu ? "Ок" : "Copied") : isRu ? "Сумма" : "Copy"}</span>
                              </button>
                            </div>

                            {/* Dedicated HD Address Copy Box */}
                            <div className="rounded-lg border border-primary/30 bg-card px-3 py-2 font-mono">
                              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                <span>
                                  {isRu ? "Персональный адрес депозита (без MEMO):" : "Dedicated deposit address (no MEMO):"}
                                </span>
                                {invoice.network_meta?.explorer_addr && (
                                  <a
                                    href={invoice.network_meta.explorer_addr}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-0.5 text-primary hover:underline"
                                  >
                                    <span>Explorer</span>
                                    <ExternalLink size={10} />
                                  </a>
                                )}
                              </div>
                              <div className="mt-1 flex items-center justify-between gap-2">
                                <span className="truncate text-xs font-semibold text-foreground select-all">
                                  {invoice.deposit_address}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(invoice.deposit_address);
                                    setCopiedAddr(true);
                                    setTimeout(() => setCopiedAddr(false), 1800);
                                  }}
                                  className="shrink-0 inline-flex items-center gap-1 rounded bg-primary px-2.5 py-1 text-[11px] font-bold text-primary-foreground hover:bg-primary-dim"
                                >
                                  {copiedAddr ? <Check size={12} /> : <Copy size={12} />}
                                  <span>{copiedAddr ? (isRu ? "Скопировано" : "Copied") : isRu ? "Копировать" : "Copy"}</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* 1-Click Web3 Browser Wallet + Manual Check Row */}
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {invoice.network_meta?.family === "evm" && (
                            <button
                              type="button"
                              onClick={handlePayWithWeb3Wallet}
                              disabled={walletBusy}
                              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 px-3 font-mono text-xs font-bold text-primary-foreground transition-all hover:bg-primary-dim btn-glow disabled:opacity-50"
                            >
                              <Zap size={14} />
                              <span>
                                {walletBusy
                                  ? isRu
                                    ? "Подтвердите в кошельке…"
                                    : "Confirm in Wallet…"
                                  : isRu
                                  ? "Оплатить в 1 клик (Web3 Wallet)"
                                  : "Pay in 1-Click (Web3 Wallet)"}
                              </span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={handleManualCheck}
                            disabled={checkingInv}
                            className={`inline-flex items-center justify-center gap-1.5 rounded-xl border border-primary/40 bg-card py-2.5 px-3 font-mono text-xs font-semibold text-foreground transition-all hover:border-primary hover:bg-primary/10 disabled:opacity-50 ${
                              invoice.network_meta?.family !== "evm" ? "sm:col-span-2" : ""
                            }`}
                          >
                            <RefreshCw size={13} className={checkingInv ? "animate-spin text-primary" : "text-primary"} />
                            <span>
                              {checkingInv
                                ? isRu
                                  ? "Проверка блокчейна…"
                                  : "Checking chain…"
                                : isRu
                                ? "Я отправил — проверить сейчас"
                                : "I Sent Payment — Verify Now"}
                            </span>
                          </button>
                        </div>

                        {/* Optional TX Hash Accelerator */}
                        <div>
                          <button
                            type="button"
                            onClick={() => setShowTxInput(!showTxInput)}
                            className="font-mono text-[11px] text-muted-foreground underline hover:text-foreground"
                          >
                            {isRu ? "Указать TX Hash вручную (опционально)" : "Paste TX Hash manually (optional)"}
                          </button>
                          {showTxInput && (
                            <div className="mt-1.5 flex gap-1.5">
                              <input
                                type="text"
                                value={txHashInput}
                                onChange={(e) => setTxHashInput(e.target.value)}
                                placeholder="0x..."
                                className="flex-1 rounded-lg border border-border bg-card px-2.5 py-1.5 font-mono text-xs text-foreground outline-none focus:border-primary"
                              />
                              <button
                                type="button"
                                onClick={handleManualCheck}
                                disabled={checkingInv || !txHashInput.trim()}
                                className="rounded-lg bg-primary px-3 py-1.5 font-mono text-xs font-semibold text-primary-foreground disabled:opacity-40"
                              >
                                {isRu ? "Проверить" : "Verify"}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* METHOD B: @CRYPTOBOT INSTANT TELEGRAM */}
                {method === "cryptobot" && (
                  <div className="space-y-3 rounded-xl border border-border bg-background/60 p-4 text-center">
                    <p className="font-mono text-xs text-muted-foreground">
                      {isRu
                        ? "Мгновенная оплата с баланса Telegram @CryptoBot в любой монете: USDT, USDC, TON, BTC, ETH, BNB, TRX."
                        : "Instant 1-click payment via Telegram @CryptoBot in USDT, USDC, TON, BTC, ETH, BNB, or TRX."}
                    </p>
                    {!invoice ? (
                      <button
                        type="button"
                        onClick={handleCreateInvoice}
                        disabled={creatingInv}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-mono text-xs font-bold text-primary-foreground transition-all hover:bg-primary-dim btn-glow disabled:opacity-50"
                      >
                        <Zap size={15} />
                        <span>
                          {creatingInv
                            ? isRu
                              ? "Создание счёта в @CryptoBot…"
                              : "Creating @CryptoBot invoice…"
                            : isRu
                            ? `Создать счёт @CryptoBot · $${quote?.final_amount_usd.toFixed(2) || "—"}`
                            : `Create @CryptoBot Invoice · $${quote?.final_amount_usd.toFixed(2) || "—"}`}
                        </span>
                      </button>
                    ) : (
                      <div className="space-y-3">
                        {invoice.qr_svg && (
                          <div className="mx-auto inline-block rounded-xl bg-white p-2.5 shadow">
                            <img src={invoice.qr_svg} alt="CryptoBot QR" className="h-32 w-32" />
                          </div>
                        )}
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <a
                            href={invoice.pay_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-2.5 px-4 font-mono text-xs font-bold text-primary-foreground transition-all hover:bg-primary-dim btn-glow"
                          >
                            <span>{isRu ? "Открыть @CryptoBot и оплатить" : "Open @CryptoBot to Pay"}</span>
                            <ExternalLink size={14} />
                          </a>
                          <button
                            type="button"
                            onClick={handleManualCheck}
                            disabled={checkingInv}
                            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-primary/40 bg-card py-2.5 px-4 font-mono text-xs font-semibold text-foreground hover:border-primary"
                          >
                            <RefreshCw size={13} className={checkingInv ? "animate-spin text-primary" : "text-primary"} />
                            <span>{isRu ? "Проверить" : "Check Status"}</span>
                          </button>
                        </div>
                        <p className="font-mono text-[11px] text-primary">
                          {isRu
                            ? "Окно автоматически обновит ваш тариф сразу после оплаты в Telegram."
                            : "This window will automatically unlock your tier right after payment in Telegram."}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* METHOD C: INTERNAL REFERRAL BALANCE */}
                {method === "ref_balance" && (
                  <div className="space-y-3 rounded-xl border border-border bg-background/60 p-4 text-center font-mono">
                    <p className="text-xs text-muted-foreground">
                      {isRu ? "Доступный реферальный баланс:" : "Available Referral Balance:"}{" "}
                      <span className="font-bold text-primary">
                        ${(quote?.ref_balance_usd ?? 0).toFixed(2)} USD
                      </span>
                    </p>
                    <button
                      type="button"
                      onClick={handleCreateInvoice}
                      disabled={creatingInv || !quote?.can_pay_with_ref_balance}
                      className="w-full rounded-xl bg-primary py-3 text-xs font-bold text-primary-foreground transition-all hover:bg-primary-dim btn-glow disabled:opacity-40"
                    >
                      {quote?.can_pay_with_ref_balance
                        ? isRu
                          ? `Оплатить $${quote.final_amount_usd.toFixed(2)} с реф-баланса мгновенно`
                          : `Pay $${quote.final_amount_usd.toFixed(2)} from Referral Balance Instantly`
                        : isRu
                        ? "Недостаточно средств на реферальном балансе"
                        : "Insufficient Referral Balance"}
                    </button>
                  </div>
                )}

                {errorMsg && (
                  <div className="rounded-xl border border-primary/40 bg-primary/10 px-3.5 py-2.5 font-mono text-xs text-foreground">
                    {errorMsg}
                  </div>
                )}
              </>
            )}

            <div className="flex items-center justify-between border-t border-border pt-2 font-mono text-[11px] text-muted-foreground">
              <span>{isRu ? "Нужен кастомный корпоративный инвойс?" : "Need custom enterprise billing?"}</span>
              <a
                href="https://t.me/V_swarm"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                @V_swarm →
              </a>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CryptoCheckoutModal;
