import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Menu, X } from "lucide-react";
import BorisLogo from "../BorisLogo";

const Header = () => {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const toggleLang = () => {
    i18n.changeLanguage(i18n.language === "ru" ? "en" : "ru");
  };

  const scrollToScanner = () => {
    setOpen(false);
    if (location.pathname !== "/") {
      navigate("/");
      setTimeout(() => {
        document.getElementById("demo-scanner")?.scrollIntoView({ behavior: "smooth" });
      }, 300);
    } else {
      document.getElementById("demo-scanner")?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const navLinks = [
    { type: "action" as const, action: scrollToScanner, label: t("nav.scanner") },
    { type: "link" as const, to: "/pricing", label: t("nav.pricing") },
    { type: "link" as const, to: "/about", label: t("nav.about") },
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
          {navLinks.map((l, i) =>
            l.type === "action" ? (
              <button
                key={i}
                onClick={l.action}
                className="text-sm font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground"
              >
                {l.label}
              </button>
            ) : (
              <Link
                key={l.to}
                to={l.to!}
                className={`text-sm font-medium transition-colors duration-200 ${
                  isActive(l.to!) ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {l.label}
              </Link>
            )
          )}
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleLang}
            className="rounded border border-border px-2.5 py-1 font-mono text-xs font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            {i18n.language === "ru" ? "EN" : "RU"}
          </button>

          <button
            onClick={scrollToScanner}
            className="hidden rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:bg-primary-dim btn-glow md:block"
          >
            {t("nav.launch")}
          </button>

          <button onClick={() => setOpen(!open)} className="text-foreground md:hidden">
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border bg-background p-4 md:hidden">
          {navLinks.map((l, i) =>
            l.type === "action" ? (
              <button
                key={i}
                onClick={l.action}
                className="block w-full text-left py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {l.label}
              </button>
            ) : (
              <Link
                key={l.to}
                to={l.to!}
                onClick={() => setOpen(false)}
                className="block py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {l.label}
              </Link>
            )
          )}
          <button
            onClick={scrollToScanner}
            className="mt-3 block w-full rounded-lg bg-primary px-4 py-2.5 text-center text-sm font-semibold text-primary-foreground"
          >
            {t("nav.launch")}
          </button>
        </div>
      )}
    </header>
  );
};

export default Header;
