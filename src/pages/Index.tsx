import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { RevealOnScroll, SectionLabel, SectionTitle, GlowCard } from "@/components/ui-boris";
import { MODULES } from "@/lib/data";
import DemoScanner from "@/components/DemoScanner";
import ContactCTA from "@/components/ContactCTA";

const Index = () => {
  const { t, i18n } = useTranslation();
  const isRu = i18n.language === "ru";

  const scrollToScanner = () => {
    document.getElementById("demo-scanner")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="bg-radial-red">
      
      {/* Hero */}
      <section className="container mx-auto px-4 pb-20 pt-24 md:pt-32">
        <RevealOnScroll>
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/90 px-3.5 py-1.5 font-mono text-xs font-semibold text-foreground">
              <span className="relative flex h-2 w-2">
                <span className="pulse-dot absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
              </span>
              {t("hero.badge")}
            </span>
            <a
              href="#ai-cortex-showcase"
              className="group inline-flex items-center gap-2.5 rounded-full border border-primary/60 bg-primary/15 px-4 py-1.5 shadow-lg shadow-primary/20 transition-all hover:border-primary hover:bg-primary/25"
            >
              <span className="font-mono text-xs font-extrabold uppercase tracking-wider text-primary">
                ⚡ POWERED BY AI // BORIS NEURAL CORTEX & SWARM
              </span>
              <span className="rounded bg-primary px-2 py-0.5 font-mono text-[10px] font-black uppercase tracking-wider text-primary-foreground">
                SOON · v1.5
              </span>
            </a>
          </div>

          <h1 className="mb-4 text-5xl font-black leading-tight md:text-7xl lg:text-8xl">
            <span className="text-glow text-primary animate-hero-pulse">{t("hero.title1")}</span>
            <br />
            <span className="text-foreground animate-hero-pulse">{t("hero.title2")}</span>
          </h1>

          <p className="mb-4 font-mono text-lg text-muted-foreground">{t("hero.subtitle")}</p>

          <div className="mb-6 inline-flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-card/80 px-4 py-2.5 font-mono text-xs">
            <span className="font-bold text-primary">🧠 NEURO-SYMBOLIC ARCHITECTURE:</span>
            <span className="text-foreground">
              {isRu
                ? "20 детерминированных слоёв высекают сухой JSON фактов → ИИ-интерпретатор связывает его с 20 826 аудитами и 2 539 эксплойтами (0% галлюцинаций · доступно с тарифа RAW+, младшим тирам — детерминированный отчёт)."
                : "20 deterministic layers prove hard JSON facts → AI Interpreter grounds them in 20,826 audits & 2,539 exploits (0% hallucinations · available from RAW+ tier; deterministic report on lower tiers)."}
            </span>
          </div>

          <p className="mb-10 max-w-3xl text-base leading-relaxed text-muted-foreground md:text-lg">
            {t("hero.desc")}
          </p>

          <div className="flex flex-wrap gap-4 mb-16">
            <button
              onClick={scrollToScanner}
              className="rounded-lg bg-primary px-8 py-3.5 text-base font-semibold text-primary-foreground transition-all duration-200 hover:bg-primary-dim btn-glow"
            >
              {t("hero.cta1")}
            </button>
            <Link
              to="/auth?demo=1"
              className="rounded-lg border border-green-500/50 bg-green-500/15 px-6 py-3.5 font-mono text-sm font-bold text-green-400 transition-all duration-200 hover:bg-green-500/25"
            >
              👁️ {isRu ? "Гостевой Демо-Кабинет (1 клик)" : "1-Click Guest Demo Cabinet"}
            </Link>
            <a
              href="#ai-cortex-showcase"
              className="rounded-lg border border-primary/50 bg-primary/10 px-6 py-3.5 font-mono text-sm font-bold text-primary transition-all duration-200 hover:bg-primary hover:text-primary-foreground"
            >
              ⚡ {isRu ? "AI-Кортекс и Рой Агентов [SOON v1.5]" : "AI Cortex & Agent Swarm [SOON v1.5]"}
            </a>
            <Link
              to="/about"
              className="rounded-lg border border-border px-8 py-3.5 text-base font-semibold text-foreground transition-all duration-200 hover:border-primary hover:text-primary"
            >
              {t("hero.cta2")}
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            {[
              { val: "20", label: isRu ? "Слоёв перекрёстного анализа (+OSPEC)" : "Cross-Layer Modules (+OSPEC)" },
              { val: "14", label: isRu ? "Разведывательных движков в терминале" : "Interactive Intelligence Engines" },
              { val: "20,826", label: isRu ? "Готовых аудитов в архиве" : "Archived Engineering Audits" },
              { val: "2,539", label: isRu ? "Разборов взломов + Foundry PoC" : "Exploit Writeups + Foundry PoCs" },
              { val: "289K+", label: isRu ? "Целей 24/7 радаров (9 сетей)" : "24/7 Radar Targets (9 Chains)" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-border/70 bg-card/50 p-4 text-center">
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

      {/* Demo Scanner */}
      <RevealOnScroll>
        <DemoScanner />
      </RevealOnScroll>

      {/* POWERED BY AI — BORIS NEURAL CORTEX SHOWCASE */}
      <section id="ai-cortex-showcase" className="container mx-auto px-4 py-16">
        <RevealOnScroll>
          <div className="relative overflow-hidden rounded-2xl border-2 border-primary/50 bg-card p-6 md:p-10 shadow-2xl shadow-primary/10">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/50 bg-primary/15 px-3.5 py-1 font-mono text-xs font-extrabold uppercase tracking-wider text-primary">
                <span>🧠 POWERED BY AI // BORIS NEURAL CORTEX & AGENT SWARM</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-border bg-background/80 px-3 py-1 font-mono text-[11px] font-semibold text-muted-foreground">
                  {isRu ? "🔒 AI-Кортекс: с тарифа RAW+ (GUEST / RADAR — детерминированный отчёт)" : "🔒 AI Cortex: RAW+ tiers (GUEST / RADAR receive deterministic report)"}
                </span>
                <span className="rounded-full border border-amber-500/50 bg-amber-500/15 px-3.5 py-1 font-mono text-xs font-black uppercase tracking-wider text-amber-400">
                  ⚡ ROADMAP v1.5 · SOON
                </span>
              </div>
            </div>

            <h2 className="text-2xl font-black tracking-tight text-foreground md:text-4xl mb-4">
              {isRu
                ? "Детерминированный сканер-молот обретает ИИ-кортекс и управление роем"
                : "Deterministic Threat Engine Meets Neural Cortex & Autonomous Swarm Control"}
            </h2>
            <p className="max-w-4xl text-sm md:text-base leading-relaxed text-muted-foreground mb-8">
              {isRu
                ? "В 2024–2025 годах рынок смеялся над «AI-аудиторами», которые скармливали сырой Solidity-код напрямую в LLM и получали выдумки. BORIS изначально строился как бескомпромиссный аналоговый сканер-молот (20 перекрёстных слоёв, включая OSPEC-разведку секретов, 14 спец-движков и 6 круглосуточных радаров), высекающий только доказанные математические и ончейн-факты. В обновлении v1.5 к этому механическому ядру подключается ИИ-интерпретатор и контур управления собственным роем агентов: модель никуда не ходит и ничего не додумывает — она берёт готовый JSON-отчёт Бориса, сверяет его с 20 826 архивными аудитами и 2 539 разборами взломов и переводит инженерную телеметрию на человеческий язык."
                : "Early 'AI security scanners' failed because they fed raw Solidity files straight into LLMs and hallucinated vulnerabilities. BORIS was engineered first as a deterministic 20-layer mechanical hammer (including OSPEC secret intelligence, 14 specialized engines, and 6 continuous 24/7 radars) that extracts only provable mathematical and on-chain facts. In v1.5, BORIS gains its Neural Cortex and personal Agent Swarm orchestration: an AI interpreter that never guesses on raw code — instead, it ingests BORIS's verified JSON dossier, cross-references 20,826 archived audits and 2,539 exploit writeups, and translates complex multi-layer telemetry into crystal-clear human intelligence."}
            </p>

            {/* 3-Step Pipeline */}
            <div className="grid gap-4 md:grid-cols-3 mb-8">
              <div className="rounded-xl border border-border bg-background/80 p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-bold uppercase text-primary">[01] DETERMINISTIC CORE</span>
                  <span className="rounded bg-green-500/15 px-2 py-0.5 font-mono text-[10px] font-bold text-green-400">LIVE · v1.4</span>
                </div>
                <h3 className="font-mono text-sm font-bold text-foreground mb-1.5">
                  {isRu ? "🦾 20 слоёв механического анализа" : "🦾 20-Layer Mechanical Execution"}
                </h3>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {isRu
                    ? "Статанализ 12 языков, чтение EIP-1967 слотов прокси через RPC, математика кривой BN254 для ZK Groth16, OSPEC-сканер секретов, граф потоков за 14 дней и стаканы деривативов → строгий детерминированный отчёт (на всех тарифах)."
                    : "12-language AST analysis, live EIP-1967 RPC storage slot reads, BN254 ZK Groth16 curve math, OSPEC secret scanner, 14-day funds flow graphs, and derivatives orderbooks → strict deterministic report (across all tiers)."}
                </p>
              </div>

              <div className="rounded-xl border border-border bg-background/80 p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-bold uppercase text-primary">[02] KNOWLEDGE CORPUS</span>
                  <span className="rounded bg-green-500/15 px-2 py-0.5 font-mono text-[10px] font-bold text-green-400">LIVE · v1.4</span>
                </div>
                <h3 className="font-mono text-sm font-bold text-foreground mb-1.5">
                  {isRu ? "📚 20,826 аудитов & 2,539 взломов" : "📚 20,826 Audits & 2,539 Exploits"}
                </h3>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {isRu
                    ? "Локальная память сервера: 1 678 полных инженерных разборов взломов с Foundry PoC, 861 кейс DeFiHackLabs, 20 826 готовых аудиторских досье и 7 087 подтверждённых REAL находок OSPEC."
                    : "Sovereign on-server memory: 1,678 deep exploit post-mortems with Foundry PoCs, 861 DeFiHackLabs cases, 20,826 audit dossiers, and 7,087 verified REAL OSPEC findings."}
                </p>
              </div>

              <div className="rounded-xl border border-primary/50 bg-primary/10 p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-bold uppercase text-primary">[03] AI CORTEX & SWARM</span>
                  <span className="rounded bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-400">SOON · v1.5 (RAW+)</span>
                </div>
                <h3 className="font-mono text-sm font-bold text-foreground mb-1.5">
                  {isRu ? "🧠 ИИ-Интерпретатор JSON и свой рой" : "🧠 AI Dossier Interpreter & Agent Swarm"}
                </h3>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {isRu
                    ? "От тарифа RAW+: ИИ читает доказанный JSON Бориса + прецеденты взломов и переводит их на человеческий язык, а в v1.5 позволяет запускать собственный рой агентов по выбранным целям."
                    : "From RAW+ tier: AI reads BORIS's verified JSON + matched exploit precedents to produce an executive human breakdown, with personal Agent Swarm orchestration arriving in v1.5."}
                </p>
              </div>
            </div>

            {/* Live Side-by-Side Terminal Preview */}
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-border bg-background p-4 font-mono text-xs">
                <div className="flex items-center justify-between border-b border-border pb-2 mb-3 text-[11px] text-muted-foreground">
                  <span>📄 INPUT: BORIS_DETERMINISTIC_DOSSIER.json</span>
                  <span className="text-green-400 font-bold">20/20 LAYERS VERIFIED</span>
                </div>
                <pre className="overflow-x-auto text-[11px] leading-relaxed text-muted-foreground">
{`{
  "target": "0x...GovPoolProxy",
  "eip1967_admin_type": "SINGLE_EOA_NO_TIMELOCK",
  "invariant_chains": [
    "NO_SNAPSHOT + ARBITRARY_CALL + FLASH_LIQUIDITY"
  ],
  "spot_oracle_reads": ["UniV3.slot0 (no TWAP)"],
  "ospec_leaks_detected": { "cls": "REAL", "kind": "hex_privkey", "is_live": true },
  "audit_drift": { "age_days": 549, "new_unreviewed_files": 14 },
  "holders_top10_corrected_pct": 88.3,
  "matched_exploit_precedents": ["beanstalk-governance", "uranium-spot"]
}`}
                </pre>
              </div>

              <div className="rounded-xl border border-primary/40 bg-background p-4 font-mono text-xs">
                <div className="flex items-center justify-between border-b border-border pb-2 mb-3 text-[11px]">
                  <span className="font-bold text-primary">🧠 OUTPUT: BORIS NEURAL CORTEX BRIEFING</span>
                  <span className="rounded bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary">AI INTERPRETER · SOON</span>
                </div>
                <div className="space-y-2.5 text-[11px] leading-relaxed text-foreground">
                  <p>
                    <b className="text-primary">{isRu ? "1. Реальный контроль:" : "1. Control Reality:"}</b>{" "}
                    {isRu
                      ? "Несмотря на позиционирование DAO, прокси EIP-1967 управляется одиночным EOA-кошельком без Timelock-задержки, а 88.3% очищенного от бирж сапплая сосредоточено у Top-10 адресов."
                      : "Despite DAO claims, the EIP-1967 proxy admin is a single EOA wallet with zero Timelock delay, and 88.3% of CEX-adjusted supply sits in Top-10 wallets."}
                  </p>
                  <p>
                    <b className="text-primary">{isRu ? "2. Главная цепочка риска:" : "2. Primary Risk Chain:"}</b>{" "}
                    {isRu
                      ? "В голосовании отсутствует блок-снэпшот (NO_SNAPSHOT) при наличии функции произвольного вызова (ARBITRARY_CALL). Аналогично прецеденту Beanstalk из нашей базы (2,539 кейсов), это создаёт вектор мгновенного прохождения пропозала через flash-loan."
                      : "Governance lacks block snapshots (NO_SNAPSHOT) while exposing ARBITRARY_CALL. Matching the Beanstalk precedent in our 2,539-exploit corpus, flash-borrowed tokens can pass and execute a proposal in one block."}
                  </p>
                  <p>
                    <b className="text-primary">{isRu ? "3. Пост-аудитный дрейф:" : "3. Post-Audit Drift:"}</b>{" "}
                    {isRu
                      ? "Последний PDF-аудит проведён 549 дней назад; с тех пор в Git изменено 14 контрактов вне периметра проверки, включая чтение спотовой цены UniV3 slot0 без TWAP."
                      : "Last PDF audit is 549 days old; 14 contracts were modified in Git post-audit, introducing unprotected UniV3 slot0 spot reads without TWAP."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </RevealOnScroll>
      </section>

      {/* Contact CTA */}
      <RevealOnScroll>
        <ContactCTA />
      </RevealOnScroll>

      {/* 19 Analysis Modules */}
      <section className="container mx-auto px-4 py-20">
        <RevealOnScroll>
          <SectionLabel>{t("modules.label")}</SectionLabel>
          <SectionTitle>{t("modules.title")}</SectionTitle>
        </RevealOnScroll>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {MODULES.map((m, i) => (
            <RevealOnScroll key={i}>
              <GlowCard className="h-full">
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
      <section id="pricing" className="container mx-auto px-4 py-20">
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
              <button onClick={scrollToScanner} className="rounded-lg bg-primary px-8 py-3.5 font-semibold text-primary-foreground transition-all hover:bg-primary-dim btn-glow">
                {t("cta.btn1")}
              </button>
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
