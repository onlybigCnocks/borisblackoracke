import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Shield, Mail, Lock, User, ArrowRight, Terminal, AlertCircle } from "lucide-react";
import BorisLogo from "@/components/BorisLogo";
import { apiLogin, apiRegister, apiGoogleAuth, getSavedToken } from "@/lib/auth";

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  "413186817939-this8dsm2d5o719ee19ae3lotc1t4vlm.apps.googleusercontent.com";

declare global {
  interface Window {
    google?: any;
  }
}

const Auth = () => {
  const { i18n } = useTranslation();
  const isRu = i18n.language === "ru";
  const navigate = useNavigate();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [googleHint, setGoogleHint] = useState(false);

  const googleBtnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (getSavedToken()) {
      navigate("/dashboard");
    }
  }, [navigate]);

  // Load Google Identity Services SDK if GOOGLE_CLIENT_ID is provided
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    const existingScript = document.getElementById("google-gsi-script");
    const initGsi = () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: async (response: any) => {
            if (!response?.credential) return;
            setError("");
            setLoading(true);
            try {
              await apiGoogleAuth({ credential: response.credential });
              navigate("/dashboard");
            } catch (err: any) {
              setError(err.message || (isRu ? "Ошибка входа через Google" : "Google sign-in failed"));
            } finally {
              setLoading(false);
            }
          },
        });
        if (googleBtnRef.current) {
          window.google.accounts.id.renderButton(googleBtnRef.current, {
            theme: "filled_black",
            size: "large",
            width: 360,
            text: "continue_with",
          });
        }
      }
    };

    if (!existingScript) {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.id = "google-gsi-script";
      script.async = true;
      script.defer = true;
      script.onload = initGsi;
      document.body.appendChild(script);
    } else {
      initGsi();
    }
  }, [isRu, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setGoogleHint(false);

    const em = email.trim().toLowerCase();
    if (!em || !em.includes("@")) {
      setError(isRu ? "Введите корректный Email" : "Enter a valid email address");
      return;
    }
    if (password.length < 6) {
      setError(isRu ? "Пароль должен быть не менее 6 символов" : "Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      if (mode === "register") {
        const refCode = new URLSearchParams(window.location.search).get("ref") || undefined;
        await apiRegister(em, password, name.trim(), refCode);
      } else {
        await apiLogin(em, password);
      }
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message || (isRu ? "Ошибка авторизации" : "Authentication error"));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleCustomClick = () => {
    if (GOOGLE_CLIENT_ID && window.google?.accounts?.oauth2) {
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: "openid email profile",
        callback: async (resp: any) => {
          if (resp?.access_token) {
            setLoading(true);
            setError("");
            try {
              await apiGoogleAuth({ access_token: resp.access_token });
              navigate("/dashboard");
            } catch (err: any) {
              setError(err.message || "Google auth failed");
            } finally {
              setLoading(false);
            }
          }
        },
      });
      tokenClient.requestAccessToken();
    } else {
      setGoogleHint(true);
    }
  };

  return (
    <div className="bg-radial-red min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-primary/35 bg-card p-8 shadow-[0_0_50px_hsl(var(--primary)/0.12)]">
        {/* Header */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex items-center gap-2.5">
            <BorisLogo size={36} />
            <span className="font-mono text-xl font-black tracking-wider text-foreground">BORIS</span>
            <span className="rounded border border-primary/40 bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-bold text-primary">
              NEXUS ID
            </span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {mode === "login"
              ? isRu ? "Вход в личный кабинет" : "Sign In to Terminal"
              : isRu ? "Регистрация оператора" : "Create Operator Account"}
          </h1>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            {isRu
              ? "Локальное шифрованное хранилище BORIS (Zero-Third-Party DB)"
              : "Self-hosted encrypted BORIS vault (Zero-Third-Party DB)"}
          </p>
        </div>

        {/* Mode Switch Tabs */}
        <div className="mb-6 grid grid-cols-2 rounded-xl border border-border bg-background p-1 font-mono text-xs">
          <button
            type="button"
            onClick={() => { setMode("login"); setError(""); }}
            className={`rounded-lg py-2.5 font-semibold transition-all ${
              mode === "login"
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {isRu ? "Вход" : "Sign In"}
          </button>
          <button
            type="button"
            onClick={() => { setMode("register"); setError(""); }}
            className={`rounded-lg py-2.5 font-semibold transition-all ${
              mode === "register"
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {isRu ? "Регистрация" : "Register"}
          </button>
        </div>

        {/* Google Sign-In Button (Custom Cyber Styled) */}
        <button
          type="button"
          disabled={loading}
          onClick={handleGoogleCustomClick}
          className="mb-4 flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-background py-3.5 px-4 font-mono text-xs font-semibold text-foreground transition-all hover:border-primary/60 hover:bg-accent disabled:opacity-50"
        >
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#EA4335"
              d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.8C6.2 7.2 8.9 5 12 5z"
            />
            <path
              fill="#4285F4"
              d="M23.5 12.3c0-.8-.1-1.7-.2-2.5H12v4.8h6.5c-.3 1.5-1.1 2.8-2.4 3.6l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
            />
            <path
              fill="#FBBC05"
              d="M5.3 14.8c-.2-.8-.4-1.6-.4-2.5s.2-1.7.4-2.5L1.6 7C.6 9 0 11.2 0 13.5s.6 4.5 1.6 6.5l3.7-2.9z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.1-6.7-5l-3.7 2.8C3.5 21.4 7.4 24 12 24z"
            />
          </svg>
          <span>{isRu ? "Продолжить через Google" : "Continue with Google"}</span>
        </button>

        {googleHint && (
          <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 font-mono text-[11px] text-amber-300">
            {isRu
              ? "Модуль Google загружается или блокируется AdBlock. Попробуйте ещё раз через секунду или войдите по Email."
              : "Google SDK is still loading or blocked by an adblocker. Try again in a moment or sign in with Email below."}
          </div>
        )}

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="shrink-0 whitespace-nowrap font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {isRu ? "или по Email" : "or with Email"}
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <div>
              <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                {isRu ? "Позывной / Имя" : "Callsign / Name"}
              </label>
              <div className="relative">
                <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={isRu ? "Например: AuditLead" : "e.g. AuditLead"}
                  maxLength={60}
                  className="w-full rounded-xl border border-border bg-background py-3 pl-10 pr-4 font-mono text-sm text-foreground outline-none transition-all focus:border-primary"
                />
              </div>
            </div>
          )}

          <div>
            <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              Email
            </label>
            <div className="relative">
              <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operator@domain.com"
                required
                className="w-full rounded-xl border border-border bg-background py-3 pl-10 pr-4 font-mono text-sm text-foreground outline-none transition-all focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              {isRu ? "Пароль (мин. 6 символов)" : "Password (min 6 chars)"}
            </label>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full rounded-xl border border-border bg-background py-3 pl-10 pr-4 font-mono text-sm text-foreground outline-none transition-all focus:border-primary"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 font-mono text-xs text-red-400">
              <AlertCircle size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 px-6 font-semibold text-primary-foreground transition-all hover:bg-primary-dim btn-glow disabled:opacity-50"
          >
            <span>
              {loading
                ? isRu ? "Авторизация..." : "Authenticating..."
                : mode === "login"
                ? isRu ? "Войти в терминал" : "Enter Terminal"
                : isRu ? "Создать аккаунт" : "Create Account"}
            </span>
            <ArrowRight size={16} />
          </button>
        </form>

        {/* Footer note */}
        <div className="mt-6 flex items-center justify-center gap-2 border-t border-border pt-4 font-mono text-[11px] text-muted-foreground">
          <Shield size={13} className="text-primary" />
          <span>
            {isRu
              ? "Автовыпуск персонального API-ключа сразу после входа"
              : "Personal API key provisioned automatically upon login"}
          </span>
        </div>
      </div>
    </div>
  );
};

export default Auth;
