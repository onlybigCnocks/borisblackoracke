import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Menu, X, User, Palette } from "lucide-react";
import BorisLogo from "../BorisLogo";
import { getSavedUser, type BorisUser } from "@/lib/auth";

export type BorisTheme = "crimson" | "mono" | "emerald" | "light";

const THEMES: Array<{ id: BorisTheme; label: string; dot: string }> = [
  { id: "crimson", label: "Crimson", dot: "#dc2626" },
  { id: "mono", label: "Mono B&W", dot: "#f5f5f5" },
  { id: "emerald", label: "Terminal", dot: "#10b981" },
  { id: "light", label: "Light", dot: "#cbd5e1" },
];

const LS_THEME = "boris_ui_theme";

const Header = () => {
  const { t, i18n } = useTranslation();
  const isRu = i18n.language === "ru";
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<BorisUser | null>(getSavedUser());
  const [theme, setTheme] = useState<BorisTheme>(() => {
    return (localStorage.getItem(LS_THEME) as BorisTheme) || "crimson";
  });
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(LS_THEME, theme);
  }, [theme]);

  const cycleTheme = () => {
    const idx = THEMES.findIndex((x) => x.id === theme);
    const next = THEMES[(idx + 1) % THEMES.length].id;
    setTheme(next);
  };

  useEffect(() => {
    const sync = () => setUser(getSavedUser());
    window.addEventListener("boris-auth-change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("boris-auth-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

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

        <div className="flex items-center gap-2.5">
          {/* Theme Switcher Pills (Desktop) */}
          <div className="hidden sm:flex items-center gap-1 rounded-lg border border-border bg-card/80 p-1">
            {THEMES.map((th) => {
              const active = theme === th.id;
              return (
                <button
                  key={th.id}
                  type="button"
                  onClick={() => setTheme(th.id)}
                  title={`Theme: ${th.label}`}
                  className={`flex items-center gap-1.5 rounded px-2 py-1 font-mono text-[10px] font-semibold transition-all ${
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span
                    className="h-2 w-2 rounded-full border border-black/30"
                    style={{ backgroundColor: th.dot }}
                  />
                  <span className="hidden lg:inline">{th.label}</span>
                </button>
              );
            })}
          </div>

          {/* Mobile quick theme cycle button */}
          <button
            type="button"
            onClick={cycleTheme}
            title="Switch Theme"
            className="sm:hidden rounded border border-border p-1.5 text-muted-foreground hover:border-primary hover:text-primary"
          >
            <Palette size={15} />
          </button>

          <button
            onClick={toggleLang}
            className="rounded border border-border px-2.5 py-1 font-mono text-xs font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            {i18n.language === "ru" ? "EN" : "RU"}
          </button>

          {user ? (
            <Link
              to="/dashboard"
              className="hidden items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3.5 py-1.5 font-mono text-xs font-semibold text-primary transition-all hover:bg-primary/20 md:inline-flex"
            >
              <User size={14} />
              <span className="max-w-[120px] truncate">{user.name || user.email}</span>
            </Link>
          ) : (
            <Link
              to="/auth"
              className="hidden items-center gap-1.5 rounded-lg border border-border px-3.5 py-1.5 font-mono text-xs font-semibold text-foreground transition-all hover:border-primary hover:text-primary md:inline-flex"
            >
              <User size={14} />
              <span>{isRu ? "Кабинет" : "Sign In"}</span>
            </Link>
          )}

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
          <div className="my-2 flex flex-wrap gap-1.5 py-2 border-y border-border">
            {THEMES.map((th) => (
              <button
                key={th.id}
                type="button"
                onClick={() => setTheme(th.id)}
                className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-mono text-xs ${
                  theme === th.id ? "border-primary bg-primary/15 text-primary font-bold" : "border-border text-muted-foreground"
                }`}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: th.dot }} />
                <span>{th.label}</span>
              </button>
            ))}
          </div>
          <Link
            to={user ? "/dashboard" : "/auth"}
            onClick={() => setOpen(false)}
            className="block py-3 font-mono text-sm font-semibold text-primary"
          >
            {user ? `⚡ ${user.name || user.email}` : isRu ? "→ Вход / Регистрация" : "→ Sign In / Register"}
          </Link>
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
