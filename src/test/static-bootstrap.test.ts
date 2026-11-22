import { describe, expect, it } from "vitest";
import html from "../../index.html?raw";
const page = new DOMParser().parseFromString(html, "text/html");

describe("static bootstrap fallback", () => {
  it("shows a neutral accessible loading shell, never a demo account or scan history", () => {
    const root = page.querySelector("#root")!;
    expect(root).not.toBeNull();
    expect(root.textContent).not.toMatch(/guest|demo\s*operator|demo@|тариф|досье|история|сканов|MODERATE_SURFACE|SIGNIFICANT_SURFACE|0x[\da-f]{40}/i);
    expect(root.querySelector("h1")?.textContent).toContain("Black Oracle");
    const status = root.querySelector('[role="status"]');
    expect(status?.textContent).toMatch(/loading/i);
    expect(status?.getAttribute("aria-live")).toBe("polite");
    expect(status?.getAttribute("aria-atomic")).toBe("true");
    expect(root.querySelector('[hidden], [aria-hidden="true"]')).toBeNull();
    expect(root.innerHTML).not.toMatch(/opacity\s*:\s*0(?:\D|$)|visibility\s*:\s*hidden|display\s*:\s*none/);
    expect(root.querySelector("noscript")?.textContent).toMatch(/enable javascript/i);
    expect(root.querySelector('a[href="/"]')?.textContent).toMatch(/home/i);
    expect(root.querySelector('a[href="https://t.me/V_swarm"]')?.textContent).toMatch(/support/i);
  });

  it("preserves the Vite module entry outside the replaceable root", () => {
    const modules = page.querySelectorAll('script[type="module"]');
    expect(modules).toHaveLength(1);
    expect(modules[0].getAttribute("src")).toBe("/src/main.tsx");
    expect(modules[0].closest("#root")).toBeNull();
  });

  it("preserves release metadata, canonical URL and structured product data", () => {
    expect(page.title).toBe("BORIS Beta v1.45 — Web3 Threat Intelligence Platform | Black Oracle");
    expect(page.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe("https://black-oracle.com/");
    for (const selector of ['meta[name="description"]', 'meta[property="og:title"]', 'meta[property="og:description"]', 'meta[name="twitter:title"]', 'meta[name="twitter:description"]']) {
      expect(page.querySelector(selector)?.getAttribute("content")).toContain("BORIS Beta v1.45");
    }
    const product = JSON.parse(page.querySelector('script[type="application/ld+json"]')!.textContent!);
    expect(product).toMatchObject({
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "BORIS — Black Oracle Risk Inspector System",
      softwareVersion: "1.45",
      url: "https://black-oracle.com",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD", description: "Free GUEST tier — 3 scans/day" },
    });
  });
});
