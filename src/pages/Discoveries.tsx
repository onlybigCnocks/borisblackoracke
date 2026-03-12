import { useTranslation } from "react-i18next";
import { useState } from "react";
import { RevealOnScroll, GlowCard, SectionTitle } from "@/components/ui-boris";

const tabs = ["github", "defi", "verified", "soroban", "zk"] as const;

const mockDiscoveries = [
  { name: "compound-finance/compound-protocol", score: 72, source: "GitHub", age: "2y", tags: ["DeFi", "Lending"] },
  { name: "aave/aave-v3-core", score: 68, source: "GitHub", age: "1y", tags: ["DeFi", "Lending"] },
  { name: "Uniswap", score: 45, source: "DeFiLlama", age: "3y", tags: ["DEX", "AMM"] },
  { name: "Lido", score: 58, source: "DeFiLlama", age: "2y", tags: ["Staking", "LSD"] },
  { name: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D", score: 31, source: "Etherscan", age: "4y", tags: ["DEX Router"] },
];

const RadarOfflinePlaceholder = ({ title, description }: { title: string; description: string }) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card/50 px-6 py-16 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
        <span className="text-xl text-primary">📡</span>
      </div>
      <h3 className="mb-2 font-mono text-lg font-semibold text-foreground">{title}</h3>
      <p className="mb-4 max-w-md text-sm text-muted-foreground">{description}</p>
      <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-2">
        <p className="font-mono text-xs text-primary">{t("discoveries.radarOffline")}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t("discoveries.radarConnect")}</p>
      </div>
    </div>
  );
};

const Discoveries = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<typeof tabs[number]>("github");

  const isListTab = activeTab === "github" || activeTab === "defi" || activeTab === "verified";

  return (
    <div className="container mx-auto min-h-screen px-4 py-12">
      <RevealOnScroll>
        <SectionTitle>{t("discoveries.title")}</SectionTitle>

        <div className="mb-8 flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                activeTab === tab ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground hover:border-primary hover:text-primary"
              }`}
            >
              {t(`discoveries.tabs.${tab}`)}
            </button>
          ))}
        </div>

        {isListTab ? (
          <div className="space-y-3">
            {mockDiscoveries.map((d, i) => (
              <GlowCard key={i}>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="font-mono text-sm font-semibold text-foreground">{d.name}</h3>
                    <div className="mt-1 flex gap-2">
                      {d.tags.map((tag) => (
                        <span key={tag} className="rounded border border-border px-2 py-0.5 text-[10px] text-muted-foreground">{tag}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-mono text-lg font-bold text-primary">{d.score}</p>
                      <p className="text-[10px] text-muted-foreground">{t("discoveries.score")}</p>
                    </div>
                    <button className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-all hover:border-primary hover:text-primary">
                      {t("discoveries.scan")}
                    </button>
                  </div>
                </div>
              </GlowCard>
            ))}
          </div>
        ) : activeTab === "soroban" ? (
          <RadarOfflinePlaceholder
            title={t("discoveries.sorobanTitle")}
            description={t("discoveries.sorobanDesc")}
          />
        ) : (
          <RadarOfflinePlaceholder
            title={t("discoveries.zkTitle")}
            description={t("discoveries.zkDesc")}
          />
        )}
      </RevealOnScroll>
    </div>
  );
};

export default Discoveries;
