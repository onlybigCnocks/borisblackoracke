import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { RevealOnScroll, SectionLabel, SectionTitle, GlowCard } from "@/components/ui-boris";
import { MODULES } from "@/lib/data";
import BorisLogo from "@/components/BorisLogo";

const Index = () => {
  const { t, i18n } = useTranslation();
  const isRu = i18n.language === "ru";

  return (
    <div className="bg-radial-red">
      <div className="radar-scanline" />
      {/* Hero */}
      <section className="container mx-auto px-4 pb-20 pt-24 md:pt-32">
        <RevealOnScroll>
          <div className="flex items-center gap-2 mb-6">
            <span className="relative flex h-2.5 w-2.5">
              <span className="pulse-dot absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
            </span>
            <span className="font-mono text-sm text-muted-foreground">{t("hero.badge")}</span>
          </div>

          <h1 className="mb-4 text-5xl font-black leading-tight md:text-7xl lg:text-8xl">
            <span className="text-glow text-primary">{t("hero.title1")}</span>
            <br />
            <span className="text-foreground">{t("hero.title2")}</span>
          </h1>

          <p className="mb-6 font-mono text-lg text-muted-foreground">{t("hero.subtitle")}</p>

          <p className="mb-10 max-w-3xl text-base leading-relaxed text-muted-foreground md:text-lg">
            {t("hero.desc")}
          </p>

          <div className="flex flex-wrap gap-4 mb-16">
            <Link
              to="/scan"
              className="rounded-lg bg-primary px-8 py-3.5 text-base font-semibold text-primary-foreground transition-all duration-200 hover:bg-primary-dim btn-glow"
            >
              {t("hero.cta1")}
            </Link>
            <Link
              to="/about"
              className="rounded-lg border border-border px-8 py-3.5 text-base font-semibold text-foreground transition-all duration-200 hover:border-primary hover:text-primary"
            >
              {t("hero.cta2")}
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            {[
              { val: "19", label: t("hero.stat1") },
              { val: "500+", label: t("hero.stat2") },
              { val: "12", label: t("hero.stat3") },
              { val: "<25m", label: t("hero.stat4") },
              { val: "9", label: t("hero.stat5") },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="font-mono text-3xl font-bold text-primary md:text-4xl">{s.val}</div>
                <div className="mt-1 font-mono text-xs text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </RevealOnScroll>
      </section>

      {/* Quote Banner */}
      <RevealOnScroll>
        <section className="border-y border-border bg-card/50">
          <div className="container mx-auto px-4 py-10 text-center">
            <p className="font-mono text-lg italic text-primary md:text-xl">
              "{t("quote.text")}"
            </p>
            <p className="mt-2 font-mono text-xs text-muted-foreground">— {t("quote.attr")}</p>
          </div>
        </section>
      </RevealOnScroll>

      {/* 19 Analysis Modules */}
      <section className="container mx-auto px-4 py-20">
        <RevealOnScroll>
          <SectionLabel>{t("modules.label")}</SectionLabel>
          <SectionTitle>{t("modules.title")}</SectionTitle>
        </RevealOnScroll>

        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))" }}>
          {MODULES.map((m, i) => (
            <RevealOnScroll key={i}>
              <GlowCard>
                <div className="mb-3 flex items-center gap-3">
                  <span className="text-2xl">{m.icon}</span>
                  <span className="font-mono text-xs text-muted-foreground">#{String(i + 1).padStart(2, "0")}</span>
                  <span className="text-sm font-semibold text-foreground">{isRu ? m.nameRu : m.name}</span>
                </div>
                <ul className="space-y-1.5">
                  {(isRu ? m.pointsRu : m.points).map((p, j) => (
                    <li key={j} className="flex gap-2 text-xs leading-relaxed text-muted-foreground">
                      <span className="mt-0.5 text-primary">›</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </GlowCard>
            </RevealOnScroll>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-4 py-20">
        <RevealOnScroll>
          <SectionLabel>{t("howItWorks.label")}</SectionLabel>
          <SectionTitle>{t("howItWorks.title")}</SectionTitle>
        </RevealOnScroll>

        <div className="grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <RevealOnScroll key={n}>
              <GlowCard>
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 font-mono text-lg font-bold text-primary">
                  {n}
                </div>
                <h3 className="mb-2 text-lg font-semibold text-foreground">
                  {t(`howItWorks.step${n}title`)}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {t(`howItWorks.step${n}desc`)}
                </p>
              </GlowCard>
            </RevealOnScroll>
          ))}
        </div>
      </section>

      {/* Philosophy */}
      <section className="container mx-auto px-4 py-20">
        <RevealOnScroll>
          <SectionTitle>{t("philosophy.title")}</SectionTitle>
          <div className="grid gap-4 md:grid-cols-3">
            {(["p1", "p2", "p3"] as const).map((k) => (
              <div key={k} className="rounded-xl border-l-2 border-primary bg-card p-6">
                <p className="text-sm leading-relaxed text-muted-foreground">{t(`philosophy.${k}`)}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 rounded-xl border border-border bg-card p-6 text-center">
            <p className="font-mono text-sm text-primary">{t("philosophy.formula")}</p>
            <p className="mt-4 text-sm text-muted-foreground">{t("philosophy.mobility")}</p>
          </div>
        </RevealOnScroll>
      </section>

      {/* What BORIS is NOT */}
      <section className="container mx-auto px-4 py-20">
        <RevealOnScroll>
          <SectionTitle>{t("notSection.title")}</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(t("notSection.items", { returnObjects: true }) as string[]).map((item, i) => (
              <div key={i} className="rounded-xl border border-primary/30 bg-card p-6">
                <span className="text-2xl font-bold text-primary">✗</span>
                <p className="mt-2 text-sm font-medium text-foreground">{item}</p>
              </div>
            ))}
          </div>
        </RevealOnScroll>
      </section>

      {/* Pricing */}
      <section className="container mx-auto px-4 py-20">
        <RevealOnScroll>
          <SectionLabel>{t("pricing.label")}</SectionLabel>
          <SectionTitle>{t("pricing.title")}</SectionTitle>
        </RevealOnScroll>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {(["guest", "radar", "raw", "blackbox"] as const).map((tier) => {
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
                  <div className="mt-2 mb-4">
                    <span className="text-3xl font-bold text-foreground">{t(`pricing.${tier}.price`)}</span>
                    {tier !== "guest" && <span className="text-sm text-muted-foreground">{t(`pricing.${tier}.period`)}</span>}
                  </div>
                  <ul className="space-y-2 mb-6">
                    {(t(`pricing.${tier}.features`, { returnObjects: true }) as string[]).map((f, i) => (
                      <li key={i} className="flex gap-2 text-xs text-muted-foreground">
                        <span className="text-primary">›</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/pricing"
                    className={`block w-full rounded-lg py-2.5 text-center text-sm font-semibold transition-all duration-200 ${
                      tier === "guest"
                        ? "border border-border text-foreground hover:border-primary hover:text-primary"
                        : "bg-primary text-primary-foreground hover:bg-primary-dim btn-glow"
                    }`}
                  >
                    {tier === "guest" ? t("pricing.free") : t("pricing.subscribe")}
                  </Link>
                </div>
              </RevealOnScroll>
            );
          })}
        </div>
        <p className="mt-6 text-center text-sm text-muted-foreground">{t("pricing.note")}</p>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-20">
        <RevealOnScroll>
          <div className="rounded-2xl border border-border bg-card p-12 text-center bg-radial-red">
            <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">{t("cta.title")}</h2>
            <p className="mb-8 text-muted-foreground">{t("cta.desc")}</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/scan" className="rounded-lg bg-primary px-8 py-3.5 font-semibold text-primary-foreground transition-all hover:bg-primary-dim btn-glow">
                {t("cta.btn1")}
              </Link>
              <Link to="/about" className="rounded-lg border border-border px-8 py-3.5 font-semibold text-foreground transition-all hover:border-primary hover:text-primary">
                {t("cta.btn2")}
              </Link>
            </div>
          </div>
        </RevealOnScroll>
      </section>
    </div>
  );
};

export default Index;
