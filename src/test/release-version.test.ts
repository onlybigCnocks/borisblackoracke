import { readFileSync } from "node:fs";
import { URL } from "node:url";
import { describe, expect, it } from "vitest";
import en from "../i18n/en";
import ru from "../i18n/ru";

const source = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("Beta1.45 public release consistency", () => {
  it.each(["../../index.html", "../pages/Dashboard.tsx", "../pages/Index.tsx", "../../README.md"])("publishes the current version in %s", path => {
    const text = source(path);
    expect(text).toContain("1.45");
    expect(text).not.toMatch(/1\.4[34](?!\d)/);
  });
  it.each([en, ru])("keeps localized hero and shared header/footer badges current", locale => {
    expect(locale.hero.badge).toContain("1.45");
    expect(locale.common.beta).toContain("1.45");
  });
  it("uses the localized release badge in header and footer", () => {
    for (const path of ["../components/layout/Header.tsx", "../components/layout/Footer.tsx"]) {
      expect(source(path)).toContain('t("common.beta")');
    }
  });
  it("publishes matching metadata and structured software version", () => {
    const html = source("../../index.html");
    expect(html).toMatch(/<title>[^<]*Beta v1\.45/);
    for (const name of ["description", "og:title", "og:description", "twitter:title", "twitter:description"]) {
      expect(html).toMatch(new RegExp(`(?:name|property)="${name}" content="[^"]*1\\.45`));
    }
    expect(html).toContain('"softwareVersion": "1.45"');
  });
  it("preserves the v1.5 AI roadmap", () => {
    expect(source("../pages/Index.tsx")).toContain("SOON · v1.5");
    expect(JSON.stringify(en)).toContain("SOON v1.5");
    expect(JSON.stringify(ru)).toContain("SOON v1.5");
  });
});
