import { useState } from "react";
import { useTranslation } from "react-i18next";
import { RevealOnScroll, SectionLabel, SectionTitle } from "@/components/ui-boris";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type Tier = "guest" | "radar" | "raw" | "blackbox";

const Pricing = () => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.startsWith("ru") ? "ru" : "en";
  const [yearly, setYearly] = useState(false);
  const [selectedTier, setSelectedTier] = useState<Tier | null>(null);

  const tiers: Tier[] = ["guest", "radar", "raw", "blackbox"];

  return (
    <div className="container mx-auto min-h-screen px-4 py-12">
      <RevealOnScroll>
        <SectionLabel>{t("pricing.label")}</SectionLabel>
        <SectionTitle>{t("pricing.title")}</SectionTitle>

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
          return (
            <RevealOnScroll key={tier}>
              <div className={`glow-card relative overflow-visible rounded-xl border ${isPopular ? "border-primary" : "border-border"} bg-card p-6 pt-8 transition-all duration-300 hover:border-border-hover hover:bg-accent`}>
                {isPopular && (
                  <span className="absolute -top-3.5 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-primary px-4 py-1 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-lg shadow-primary/30">
                    {t("pricing.popular")}
                  </span>
                )}
                <h3 className="font-mono text-lg font-bold text-foreground">{t(`pricing.${tier}.name`)}</h3>
                <div className="mt-2 mb-6">
                  {tier === "guest" ? (
                    <span className="text-3xl font-bold text-foreground">{t("pricing.free")}</span>
                  ) : (
                    <>
                      <span className="text-3xl font-bold text-foreground">
                        {yearly ? t(`pricing.${tier}.priceYearly`) : t(`pricing.${tier}.price`)}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {yearly ? "/yr" : t(`pricing.${tier}.period`)}
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
                <button
                  onClick={() => tier !== "guest" && setSelectedTier(tier)}
                  className={`block w-full rounded-lg py-2.5 text-center text-sm font-semibold transition-all duration-200 ${
                    tier === "guest"
                      ? "border border-border text-foreground"
                      : "bg-primary text-primary-foreground hover:bg-primary-dim btn-glow"
                  }`}
                >
                  {tier === "guest" ? t("pricing.free") : t("pricing.subscribe")}
                </button>
              </div>
            </RevealOnScroll>
          );
        })}
      </div>

      <p className="mb-16 text-center text-sm text-muted-foreground">{t("pricing.note")}</p>

      {/* Payment Method Modal */}
      <Dialog open={!!selectedTier} onOpenChange={(open) => { if (!open) setSelectedTier(null); }}>
        <DialogContent className="border-border bg-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground font-mono">
              {lang === "ru" ? "Выберите способ оплаты" : "Choose payment method"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {selectedTier && (
                <span className="font-semibold text-foreground">
                  {t(`pricing.${selectedTier}.name`)} — {yearly ? t(`pricing.${selectedTier}.priceYearly`) : t(`pricing.${selectedTier}.price`)}{yearly ? "/yr" : t(`pricing.${selectedTier}.period`)}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2 space-y-3">
            {/* Option 1: Telegram Bot */}
            <a
              href="https://t.me/BlackOracleBORIS_bot?start=subscribe"
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-xl border border-border p-4 transition-all duration-200 hover:border-primary hover:bg-primary/5"
            >
              <div className="flex items-center gap-3 mb-1">
                <span className="text-xl">💬</span>
                <span className="font-semibold text-foreground">
                  {lang === "ru" ? "Оплатить через Telegram Bot" : "Pay via Telegram Bot"}
                </span>
              </div>
              <p className="ml-8 text-xs text-muted-foreground">
                {lang === "ru"
                  ? "Моментальная крипто-оплата через CryptoBot (USDT, TON, BTC, ETH)"
                  : "Instant crypto payments via CryptoBot (USDT, TON, BTC, ETH)"}
              </p>
            </a>

            {/* Option 2: Request Invoice */}
            <a
              href="mailto:contact@black-oracle.com?subject=Invoice%20Request"
              className="block rounded-xl border border-border p-4 transition-all duration-200 hover:border-primary hover:bg-primary/5"
            >
              <div className="flex items-center gap-3 mb-1">
                <span className="text-xl">📧</span>
                <span className="font-semibold text-foreground">
                  {lang === "ru" ? "Запросить инвойс" : "Request Invoice"}
                </span>
              </div>
              <p className="ml-8 text-xs text-muted-foreground">
                {lang === "ru"
                  ? "Для команд и компаний. Отправим крипто-инвойс в течение 24ч."
                  : "For teams & enterprises. We'll send a crypto invoice within 24h."}
              </p>
            </a>
          </div>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            {lang === "ru"
              ? "Все платежи в криптовалюте. KYC не требуется."
              : "All payments in crypto. No KYC required."}
          </p>
        </DialogContent>
      </Dialog>

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
            href="https://t.me/GenEXEC_BORIS"
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
