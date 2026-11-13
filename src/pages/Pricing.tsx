import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { RevealOnScroll, SectionLabel, SectionTitle } from "@/components/ui-boris";
import { ShieldCheck, Zap, Wallet, Sparkles } from "lucide-react";
import { getSavedUser, openCryptoCheckout, type BorisUser } from "@/lib/auth";

type Tier = "guest" | "radar" | "raw" | "blackbox";

const Pricing = () => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.startsWith("ru") ? "ru" : "en";
  const [yearly, setYearly] = useState(false);
  const [user, setUser] = useState<BorisUser | null>(getSavedUser());

  useEffect(() => {
    const sync = () => setUser(getSavedUser());
    window.addEventListener("boris-auth-change", sync);
    return () => window.removeEventListener("boris-auth-change", sync);
  }, []);

  const tiers: Tier[] = ["guest", "radar", "raw", "blackbox"];
  const currentTier = (user?.tier || "GUEST").toLowerCase();

  return (
    <div className="container mx-auto min-h-screen px-4 py-12">
      <RevealOnScroll>
        <SectionLabel>{t("pricing.label")}</SectionLabel>
        <SectionTitle>{t("pricing.title")}</SectionTitle>

        {/* Sovereign Crypto Payment Badges */}
        <div className="mx-auto mb-6 flex max-w-3xl flex-wrap items-center justify-center gap-2 font-mono text-xs">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 font-semibold text-primary">
            <ShieldCheck size={13} />
            {lang === "ru" ? "0% комиссия · Без KYC" : "0% Fee · No KYC"}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-muted-foreground">
            <Wallet size={13} className="text-primary" />
            Arbitrum · Base · BSC · TRC-20 · Solana · Polygon
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-muted-foreground">
            <Zap size={13} className="text-primary" />
            @CryptoBot 1-Click
          </span>
        </div>

        <div className="mb-8 flex items-center justify-center gap-4">
          <span className={`text-sm font-medium transition-colors ${!yearly ? "text-foreground" : "text-muted-foreground"}`}>{t("pricing.monthly")}</span>
          <button
            onClick={() => setYearly(!yearly)}
            aria-label="Toggle yearly pricing"
            className="relative h-8 w-14 rounded-full border border-border bg-background-secondary p-1 transition-colors duration-300 focus:outline-none"
          >
            <span
              className={`block h-6 w-6 rounded-full bg-primary shadow-lg transition-transform duration-300 ease-in-out ${yearly ? "translate-x-6" : "translate-x-0"}`}
            />
          </button>
          <span className={`text-sm font-medium transition-colors ${yearly ? "text-foreground" : "text-muted-foreground"}`}>{t("pricing.yearly")}</span>
          {yearly && <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-semibold text-primary">{t("pricing.save")}</span>}
        </div>
      </RevealOnScroll>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-12">
        {tiers.map((tier) => {
          const isPopular = tier === "raw";
          const isCurrent = currentTier === tier && tier !== "guest";
          return (
            <RevealOnScroll key={tier}>
              <div className={`glow-card relative flex h-full flex-col justify-between overflow-visible rounded-xl border ${isPopular ? "border-primary" : "border-border"} bg-card p-6 pt-8 transition-all duration-300 hover:border-border-hover hover:bg-accent`}>
                {isPopular && (
                  <span className="absolute -top-3.5 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-primary px-4 py-1 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-lg shadow-primary/30">
                    {t("pricing.popular")}
                  </span>
                )}
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-mono text-lg font-bold text-foreground">{t(`pricing.${tier}.name`)}</h3>
                    {isCurrent && (
                      <span className="rounded border border-primary/40 bg-primary/15 px-2 py-0.5 font-mono text-[10px] font-bold text-primary">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <div className="mt-2 mb-6">
                    {tier === "guest" ? (
                      <span className="text-3xl font-bold text-foreground">{t("pricing.free")}</span>
                    ) : (
                      <>
                        <span className="text-3xl font-bold text-foreground">
                          {yearly ? t(`pricing.${tier}.priceYearly`) : t(`pricing.${tier}.price`)}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {yearly ? (lang === "ru" ? "/год" : "/yr") : t(`pricing.${tier}.period`)}
                        </span>
                      </>
                    )}
                  </div>
                  <ul className="space-y-2 mb-6">
                    {(t(`pricing.${tier}.features`, { returnObjects: true }) as string[]).map((f, i) => (
                      <li key={i} className="flex gap-2 text-xs text-muted-foreground">
                        <span className="text-primary">›</span><span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (tier !== "guest") {
                      openCryptoCheckout({ tier, yearly });
                    }
                  }}
                  className={`flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-center font-mono text-xs font-bold transition-all duration-200 ${
                    tier === "guest"
                      ? "border border-border text-muted-foreground cursor-default"
                      : "bg-primary text-primary-foreground hover:bg-primary-dim btn-glow"
                  }`}
                >
                  {tier === "guest" ? (
                    <span>{t("pricing.free")}</span>
                  ) : (
                    <>
                      <Sparkles size={13} />
                      <span>
                        {isCurrent
                          ? lang === "ru"
                            ? "Продлить в крипте"
                            : "Extend with Crypto"
                          : lang === "ru"
                          ? "Оплатить криптой →"
                          : "Pay with Crypto →"}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </RevealOnScroll>
          );
        })}
      </div>

      <p className="mb-16 text-center font-mono text-xs text-muted-foreground">
        {lang === "ru"
          ? "Мгновенная оплата USDT / USDC на персональный HD-адрес (Arbitrum, Base, BSC, TRC-20, Solana, Polygon, ERC-20), в 1 клик через Web3-кошелёк или @CryptoBot."
          : "Instant USDT / USDC checkout via dedicated HD address (Arbitrum, Base, BSC, TRC-20, Solana, Polygon, ERC-20), 1-click Web3 wallet, or @CryptoBot."}
      </p>

      {/* Partners / Affiliate Section */}
      <RevealOnScroll>
        <div className="mx-auto max-w-3xl rounded-xl border-2 border-primary/30 bg-gradient-to-br from-card to-background p-8 md:p-12 text-center">
          <span className="text-4xl mb-4 block">🤝</span>
          <h2 className="font-mono text-2xl font-bold text-foreground mb-2">
            {lang === "ru" ? "Партнёрская программа" : "Affiliate Program"}
          </h2>
          <p className="text-muted-foreground mb-6">
            {lang === "ru"
              ? "Зарабатывай до 30% с каждого привлечённого пользователя"
              : "Earn up to 30% from every referred user"}
          </p>

          <ul className="mb-8 space-y-3 text-left max-w-md mx-auto">
            {(lang === "ru"
              ? [
                  "15-30% комиссия с покупок",
                  "Мгновенные выплаты в крипте (USDT/USDC)",
                  "Персональный дашборд и аналитика",
                  "Для блогеров, аудиторов, KOL, владельцев каналов",
                ]
              : [
                  "15-30% commission on all purchases",
                  "Instant crypto payouts (USDT/USDC)",
                  "Personal dashboard & analytics",
                  "For crypto influencers, auditors, KOLs, channel owners",
                ]
            ).map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="text-primary mt-0.5">›</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <a
            href="https://t.me/V_swarm"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded-lg bg-primary px-8 py-3 font-semibold text-primary-foreground transition-all hover:bg-primary-dim btn-glow"
          >
            {lang === "ru" ? "Стать партнёром" : "Become a Partner"}
          </a>
          <p className="mt-3 text-xs text-muted-foreground">
            {lang === "ru" ? "Напишите — обсудим условия" : "DM us to discuss terms"}
          </p>
        </div>
      </RevealOnScroll>
    </div>
  );
};

export default Pricing;
