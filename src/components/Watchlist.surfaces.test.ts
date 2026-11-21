import { URL } from "node:url";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
const source = (name: string) => readFileSync(new URL(name, import.meta.url), "utf8");
it.each(["../pages/Dashboard.tsx", "../pages/Report.tsx", "./DemoScanner.tsx", "./RadarStreamPanel.tsx", "./ToolsPanel.tsx"])("provides reusable watch entry points in %s", name => {
 expect(source(name)).toContain("<AddToWatchlistButton");
});
it("replaces the dashboard placeholder with the real watchlist", () => {
 expect(source("../pages/Dashboard.tsx")).toContain("<WatchlistPanel");
 expect(source("../pages/Dashboard.tsx")).not.toContain("COMING SOON // 24/7 DRIFT WATCHER");
});
