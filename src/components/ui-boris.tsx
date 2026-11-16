import { useTranslation } from "react-i18next";
import { useRef, useEffect, useState, ReactNode } from "react";

export const RevealOnScroll = ({ children, className = "" }: { children: ReactNode; className?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true);
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-300 ease-out ${visible ? "translate-y-0 opacity-100" : "opacity-100"} ${className}`}
    >
      {children}
    </div>
  );
};

export const SectionLabel = ({ children }: { children: ReactNode }) => (
  <span className="mb-3 inline-block font-mono text-xs font-semibold uppercase tracking-[0.2em] text-primary">
    {children}
  </span>
);

export const SectionTitle = ({ children }: { children: ReactNode }) => (
  <h2 className="mb-8 text-3xl font-bold text-foreground md:text-4xl">{children}</h2>
);

export const GlowCard = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <div className={`glow-card rounded-xl border border-border bg-card p-6 transition-all duration-300 hover:border-border-hover hover:bg-accent ${className}`}>
    {children}
  </div>
);
