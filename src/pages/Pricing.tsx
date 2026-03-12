import { useState } from "react";
import { useTranslation } from "react-i18next";
import { RevealOnScroll, SectionLabel, SectionTitle, GlowCard } from "@/components/ui-boris";
import { WALLETS } from "@/lib/data";
import { QRCodeSVG } from "qrcode.react";

type Tier = "guest" | "radar" | "raw" | "blackbox";
type PayMethod = keyof typeof WALLETS;

const Pricing = () => {
  const { t } = useTranslation();
  const [yearly, setYearly] = useState(false);
  const [selectedTier, setSelectedTier] = useState<Tier | null>(null);
  const [payMethod, setPayMethod] = useState<PayMethod | null>(null);

  const tiers: Tier[] = ["guest", "radar", "raw", "blackbox"];
  const payMethods: { key: PayMethod; label: string }[] = [
    { key: "USDT_TRC20", label: "USDT TRC20" },
    { key: "USDT_ERC20", label: "USDT ERC20" },
    { key: "TON", label: "TON" },
    { key: "BTC", label: "BTC" },
    { key: "ETH", label: "ETH" },
  ];

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

      {/* Payment Modal */}
      {selectedTier && (
        <RevealOnScroll>
          <GlowCard className="max-w-lg mx-auto">
            <h3 className="mb-4 font-mono text-lg font-bold text-foreground">
              {t(`pricing.${selectedTier}.name`)} — {yearly ? t(`pricing.${selectedTier}.priceYearly`) : t(`pricing.${selectedTier}.price`)}{yearly ? "/yr" : t(`pricing.${selectedTier}.period`)}
            </h3>

            <div className="mb-4 flex flex-wrap gap-2">
              {payMethods.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setPayMethod(key)}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
                    payMethod === key ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {payMethod && (
              <div className="text-center">
                <div className="inline-block rounded-xl bg-foreground p-4 mb-4">
                  <QRCodeSVG value={WALLETS[payMethod]} size={180} bgColor="#f0f0f0" fgColor="#080808" />
                </div>
                <p className="mb-4 break-all rounded-lg border border-border bg-background-secondary p-3 font-mono text-xs text-foreground">
                  {WALLETS[payMethod]}
                </p>
                <button
                  onClick={() => {
                    window.open("https://t.me/BlackOracleBORIS_bot", "_blank");
                    const { toast } = await import("@/hooks/use-toast");
                    toast({ title: t("pricing.paidToast") || "Confirm payment in Telegram bot" });
                  }}
                  className="w-full rounded-lg bg-primary py-3 font-semibold text-primary-foreground transition-all hover:bg-primary-dim btn-glow"
                >
                  ✓ I paid
                </button>
              </div>
            )}

            <button
              onClick={() => { setSelectedTier(null); setPayMethod(null); }}
              className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground"
            >
              {t("common.cancel")}
            </button>
          </GlowCard>
        </RevealOnScroll>
      )}

      <p className="mt-8 text-center text-sm text-muted-foreground">{t("pricing.note")}</p>
    </div>
  );
};

export default Pricing;
