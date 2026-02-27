import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Menu, X } from "lucide-react";
import BorisLogo from "../BorisLogo";

const Header = () => {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const toggleLang = () => {
    i18n.changeLanguage(i18n.language === "ru" ? "en" : "ru");
  };

  const navLinks = [
    { to: "/scan", label: t("nav.scanner") },
    { to: "/pricing", label: t("nav.pricing") },
    { to: "/about", label: t("nav.about") },
    { to: "/discoveries", label: t("nav.discoveries") },
    { to: "/market", label: t("nav.market") },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="fixed top-0 left-0 right-0 z-[9998] border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-3">
          <BorisLogo size={32} />
          <span className="text-lg font-bold tracking-wider text-foreground">BORIS</span>
          <span className="rounded border border-primary/30 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-primary">
            {t("common.beta")}
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {navLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`text-sm font-medium transition-colors duration-200 ${
                isActive(l.to) ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleLang}
            className="rounded border border-border px-2.5 py-1 font-mono text-xs font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            {i18n.language === "ru" ? "EN" : "RU"}
          </button>

          <Link
            to="/scan"
            className="hidden rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:bg-primary-dim btn-glow md:block"
          >
            {t("nav.launch")}
          </Link>

          <button onClick={() => setOpen(!open)} className="text-foreground md:hidden">
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border bg-background p-4 md:hidden">
          {navLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              className="block py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
          <Link
            to="/scan"
            onClick={() => setOpen(false)}
            className="mt-3 block rounded-lg bg-primary px-4 py-2.5 text-center text-sm font-semibold text-primary-foreground"
          >
            {t("nav.launch")}
          </Link>
        </div>
      )}
    </header>
  );
};

export default Header;
