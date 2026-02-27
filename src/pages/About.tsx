import { useTranslation } from "react-i18next";
import { RevealOnScroll } from "@/components/ui-boris";

const sections = ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8", "s9", "s10", "s11", "s12"] as const;

const About = () => {
  const { t } = useTranslation();

  return (
    <div className="container mx-auto min-h-screen max-w-3xl px-4 py-12">
      <RevealOnScroll>
        <h1 className="mb-12 text-4xl font-black text-foreground md:text-5xl">
          {t("about.title")}
        </h1>
      </RevealOnScroll>

      {sections.map((s) => (
        <RevealOnScroll key={s}>
          <div className="mb-12">
            <h2 className="mb-4 text-xl font-bold text-foreground">{t(`about.${s}title`)}</h2>
            {s === "s4" ? (
              <ul className="space-y-2">
                {(t(`about.${s}items`, { returnObjects: true }) as string[]).map((item, i) => (
                  <li key={i} className="flex gap-3 text-muted-foreground">
                    <span className="text-primary font-bold">✗</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="border-l-2 border-primary pl-6">
                <p className="leading-relaxed text-muted-foreground">{t(`about.${s}text`)}</p>
              </div>
            )}
          </div>
        </RevealOnScroll>
      ))}

      <RevealOnScroll>
        <div className="mt-16 rounded-xl border border-border bg-card p-8">
          <p className="text-xs leading-relaxed text-muted-foreground/60">{t("footer.disclaimer")}</p>
        </div>
      </RevealOnScroll>
    </div>
  );
};

export default About;
