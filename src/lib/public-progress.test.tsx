import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import DemoScanner, { ResultTeaser } from "@/components/DemoScanner";
import { publicProgressEvent, publicProgressStep } from "@/lib/public-progress";

vi.mock("react-i18next", () => ({ useTranslation: () => ({ i18n: { language: "en" } }) }));
vi.mock("@/lib/auth", () => ({
  getSavedUser: () => ({ tier: "RAW" }), getSavedToken: () => null,
  getScanExportUrl: (id: string) => `/export/${id}`,
}));

afterEach(() => { cleanup(); localStorage.clear(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("public scan progress", () => {
  it("maps restored engine events without exposing raw logs or claiming engines already run", () => {
    localStorage.setItem("boris_active_scans_v2", JSON.stringify([{
      taskId: "test-task", target: "https://github.com/example/contract", startTime: Date.now(),
      step: "Running Slither", progress: 0.1, tail: ["Running SeMgReP", "✅ credential=private-fixture"],
    }]));
    const { container } = render(<DemoScanner />);
    expect(container.textContent).not.toMatch(/slither|semgrep|private-fixture|real engines active/i);
    expect(screen.getByText("Pattern analysis — running")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Launch 2nd Worker/ })).toBeDisabled();
  });

  it("provides a labelled input and readable primary scan action", () => {
    render(<DemoScanner />);
    expect(screen.getByRole("textbox", { name: "Scan target" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Run Analysis" })).toHaveClass("btn-action");
  });

  it("updates equal-length tail batches and presents failures without diagnostic leakage", async () => {
    vi.useFakeTimers();
    localStorage.setItem("boris_active_scans_v2", JSON.stringify([{
      taskId: "test-task", target: "https://github.com/example/contract", startTime: Date.now(),
      step: "static_analysis", progress: 0.5, tail: ["Running Slither"],
    }]));
    const fetcher = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ status: "scanning", step: "static_analysis", progress: 0.5, tail: ["Running Semgrep"] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ status: "scanning", step: "static_analysis", progress: 0.5, tail: ["Semgrep failed"] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ status: "error", message: "Slither failed: credential=private-fixture" }) });
    vi.stubGlobal("fetch", fetcher);
    const { container } = render(<DemoScanner />);
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(screen.getByText("Pattern analysis — running")).toBeInTheDocument();
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(screen.getByText("Pattern analysis — failed")).toBeInTheDocument();
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(screen.getByRole("alert")).toHaveTextContent("Scan failed. Try again or contact support.");
    expect(container.textContent).not.toMatch(/slither|semgrep|private-fixture/i);
  });

  it("does not misreport an API rejection as server unavailability", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({ detail: "Semgrep credential=private-fixture" }) }));
    const { container } = render(<DemoScanner />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "example/contract" } });
    fireEvent.click(screen.getByRole("button", { name: "Run Analysis" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not start the scan. Try again or contact support.");
    expect(container.textContent).not.toMatch(/semgrep|private-fixture|server unavailable/i);
  });

  it.each([
    ["sLiThEr failed: credential=private-fixture", "Static code analysis — failed"],
    ["SEMPREG timeout after 90s", "Pattern analysis — timed out"],
    ["Sliter skipped", "Static code analysis — skipped"],
    ["MYTHRIL unavailable", "Symbolic analysis — unavailable"],
    ["✅ Aderyn completed", "Static code analysis — complete"],
    ["Running Semgrep failed", "Pattern analysis — failed"],
    ["Running Slither 0 errors", "Static code analysis — running"],
    ["Slither", "Static code analysis"],
    ["Analyzing: contracts/Slither.sol", "Inspecting source file"],
    ["Found 12 contracts", "Found 12 contracts"],
    ["Cloning https://github.com/example/semgrep?credential=private-fixture", "Fetching source code"],
  ])("projects operational event %s without raw suffixes", (event, expected) => {
    expect(publicProgressEvent(event, "en")).toBe(expected);
  });

  it("localizes failures and rejects arbitrary content instead of rewriting it", () => {
    expect(publicProgressEvent("Semgrep failed", "ru")).toBe("Анализ паттернов — ошибка");
    for (const value of [null, {}, 17, "contract SemgrepToken {}", "✅ credential=private-fixture", "SlitherToken done", "owner/semgrep", "NOTICE: Slither copyright"]) {
      expect(publicProgressEvent(value, "en")).toBeNull();
    }
    expect(publicProgressStep("⏳ Waiting in queue...", "en")).toBe("Waiting in queue…");
    expect(publicProgressStep("🔍 Статический анализ", "en")).toBe("Static analysis");
    expect(publicProgressStep("📦 Fetching source code...", "ru")).toBe("Загрузка исходного кода…");
  });

  it("maps engine-list metadata while preserving target, paths and legal text", () => {
    const result = {
      status: "done", project: "SemgrepToken", verdict: "CLEAN", scan_date: "2026-11-21",
      layers: {}, facts: { en: ["Contract Slither is user content"] }, scope: {},
      analyzed_files: { shown: ["src/Slither.sol"], total: 1, more: 0 },
      analysis_status: [{ key: "static_engines", label: { en: "Static analysis" }, status: "done", detail: { en: "sLiThEr, SEMGREP, Mythril, Aderyn" } }],
      disclaimer: { main: { en: "NOTICE: Slither copyright retained" } },
    } as unknown as Parameters<typeof ResultTeaser>[0]["result"];
    render(<ResultTeaser result={result} isRu={false} />);
    expect(screen.queryByText("sLiThEr, SEMGREP, Mythril, Aderyn", { exact: false })).not.toBeInTheDocument();
    expect(screen.getByText("(Static code analysis · Pattern analysis · Symbolic analysis)")).toBeInTheDocument();
    expect(screen.getByText("SemgrepToken")).toBeInTheDocument();
    expect(screen.getByText("src/Slither.sol", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("NOTICE: Slither copyright retained")).toBeInTheDocument();
    expect(result.analysis_status![0].detail!.en).toBe("sLiThEr, SEMGREP, Mythril, Aderyn");
  });
});
