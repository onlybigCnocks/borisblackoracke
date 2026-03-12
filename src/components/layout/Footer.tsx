import { useTranslation } from "react-i18next";
import BorisLogo from "../BorisLogo";
import { LINKS } from "@/lib/data";

const Footer = () => {
  const { t } = useTranslation();
  return (
    <footer className="border-t border-border bg-background">
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <div className="flex items-center gap-3">
            <BorisLogo size={28} />
            <span className="font-bold tracking-wider text-foreground">BORIS</span>
            <span className="text-sm text-muted-foreground">© 2026</span>
          </div>
          <div className="flex flex-wrap gap-6">
            <a href={LINKS.enChannel} target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground transition-colors hover:text-primary">{t("footer.enChannel")}</a>
            <a href={LINKS.ruChannel} target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground transition-colors hover:text-primary">{t("footer.ruChannel")}</a>
            <a href={LINKS.support} target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground transition-colors hover:text-primary">{t("footer.support")}</a>
            <a href={LINKS.bot} target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground transition-colors hover:text-primary">{t("footer.bot")}</a>
          </div>
        </div>
        <p className="mt-8 max-w-3xl text-xs leading-relaxed text-muted-foreground/60">
          {t("footer.disclaimer")}
        </p>
      </div>
    </footer>
  );
};

export default Footer;
