import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within, act } from "@testing-library/react";
import ToolsPanel from "./ToolsPanel";
import { OspecRescanVersions } from "./OspecRescanVersions";
import { OspecRescanCoverage } from "./OspecRescanCoverage";
import fixtures from "./fixtures/ospec-api.json";
vi.mock("react-i18next", () => ({ useTranslation: () => ({ i18n: { language: "en" } }) }));
vi.mock("@/lib/auth", async original => ({ ...await original<object>(), apiGetToolHistory: async () => [] }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); localStorage.clear(); sessionStorage.clear(); });
function expandCoverage() {
  const button = screen.queryByRole("button", {name:"Details"}) || screen.queryByRole("button", {name:"Подробнее"});
  if (button) fireEvent.click(button);
}
function open(payload: object, tier = "BLACKBOX") {
  localStorage.setItem("boris_auth_token", "fixture");
  localStorage.setItem("boris_auth_user", JSON.stringify({ tier }));
  vi.stubGlobal("fetch", vi.fn().mockImplementation(async url => new Response(JSON.stringify(String(url).endsWith("/catalog") ? {ok:false} : payload))));
  render(<ToolsPanel />);
  fireEvent.click(screen.getByRole("button", {name:/OSPEC \(1.1M/}));
}
it("renders final API partial coverage rather than a historic clean verdict", async () => {
  open(fixtures.partial.BLACKBOX);
  const panel = await screen.findByRole("region", {name:"OSPEC rescan coverage"});
  expandCoverage();
  expect(panel).toHaveTextContent("Incomplete");
  expect(panel).toHaveTextContent("Stages: 4/5");
  expect(panel).toHaveTextContent("Merge: 0/1");
  expect(panel).toHaveTextContent("does not mean clean or queued");
  expect(panel).not.toHaveTextContent("COMPLETE ·");
});
it.each(["RADAR", "RAW", "BLACKBOX"] as const)("renders collision versions with %s projection, never inventing a masked value", async tier => {
  open(fixtures.complete[tier], tier);
  const versions = await screen.findByRole("region", {name:"OSPEC rescan versions"});
  const button = screen.queryByRole("button", {name:"Finding history"});
  if (button && button.getAttribute("aria-expanded") === "false") fireEvent.click(button);
  expect(versions).toHaveTextContent("2222222222222222222222222222222222222222");
  expect(versions).toHaveTextContent("1111111111111111111111111111111111111111");
  expect(versions).not.toHaveTextContent("not guaranteed current");
  if (tier === "RADAR") expect(versions).toHaveTextContent("Secret unavailable at this tier");
  if (tier === "RAW") expect(versions).toHaveTextContent("Masked preview");
  if (tier === "RADAR") expect(versions).not.toHaveTextContent(".env");
  if (tier === "RAW") expect(versions).toHaveTextContent(".env:1");
});
it("clears previous coverage during a new search instead of showing an old verdict", async () => {
  open(fixtures.complete.BLACKBOX);
  await screen.findByRole("region", {name:"OSPEC rescan coverage"});
  let finish!: (value: Response) => void;
  vi.stubGlobal("fetch", vi.fn().mockImplementation(() => new Promise<Response>(resolve => {finish = resolve;})));
  fireEvent.click(screen.getByRole("button", {name:"Run"}));
  expect(screen.queryByRole("region", {name:"OSPEC rescan coverage"})).not.toBeInTheDocument();
  await act(async () => finish(new Response(JSON.stringify(fixtures.failed.BLACKBOX))));
  expect(await screen.findByRole("region", {name:"OSPEC rescan coverage"})).toHaveTextContent("Incomplete: 1");
});
it("ignores a superseded OSPEC response so an older complete result cannot replace failure", async () => {
  open(fixtures.partial.BLACKBOX);
  await screen.findByRole("region", {name:"OSPEC rescan coverage"});
  const finishes: ((value: Response) => void)[] = [];
  vi.stubGlobal("fetch", vi.fn().mockImplementation(() => new Promise<Response>(resolve => finishes.push(resolve))));
  fireEvent.click(screen.getByRole("button", {name:"Run"}));
  fireEvent.keyDown(screen.getByPlaceholderText(/Фильтр по типу секрета/), {key:"Enter"});
  await act(async () => finishes[1](new Response(JSON.stringify(fixtures.failed.BLACKBOX))));
  expect(await screen.findByRole("region", {name:"OSPEC rescan coverage"})).toHaveTextContent("Incomplete: 1");
  await act(async () => finishes[0](new Response(JSON.stringify(fixtures.complete.BLACKBOX))));
  expect(screen.getByRole("region", {name:"OSPEC rescan coverage"})).toHaveTextContent("Incomplete: 1");
});
it("renders independently published zero-finding COMPLETE with provenance, not a no-risk verdict", async () => {
  open(fixtures.zero.BLACKBOX);
  const coverage = await screen.findByRole("region", {name:"OSPEC rescan coverage"});
  expandCoverage();
  expect(coverage).toHaveTextContent("https://github.com/org/emptyComplete");
  expect(coverage).toHaveTextContent(fixtures.zero.BLACKBOX.repo_coverage["https://github.com/org/empty"].publication_key);
  expect(coverage).toHaveTextContent("Static analysis does not verify credentials");
});
it.each(["missing"] as const)("shows explicit unknown for actual %s API payload", async variant => {
  open(fixtures[variant].BLACKBOX);
  const coverage = await screen.findByRole("region", {name:"OSPEC rescan coverage"});
  expect(coverage).toHaveTextContent("No data");
  expect(coverage).not.toHaveTextContent(" · COMPLETE");
  expect(coverage).not.toHaveTextContent(" · INCOMPLETE");
});
it("deduplicates repo coverage without hiding versions from multiple findings", () => {
  const row = fixtures.partial.BLACKBOX.findings[0];
  render(<OspecRescanCoverage findings={[row, row]} isRu={false} />);
  expandCoverage();
  expect(screen.getAllByText(row.repo_url)).toHaveLength(1);
});
it("displays real pending stage counts without inventing a pending campaign verdict", () => {
  const row = fixtures.partial.BLACKBOX.findings[0];
  render(<OspecRescanCoverage findings={[{...row, rescan:{status:"partial", coverage:{...row.rescan.coverage, states:{pending:2, succeeded:3}}}}]} isRu={false} />);
  expandCoverage();
  expect(screen.getByRole("region")).toHaveTextContent("Pending stages: 2");
  expect(screen.getByRole("region")).toHaveTextContent("Incomplete");
});
it.each([1,2])("enforces rank %s on BLACKBOX history versions without leaking disallowed fields", rank => {
  const real = fixtures.complete.BLACKBOX.findings[0].rescan_versions[0];
  const privateVersion = {...real, cls:"SUSPECT", path:"non-real-path-fixture"};
  render(<OspecRescanVersions versions={[privateVersion, real]} rank={rank} isRu={false} />);
  fireEvent.click(screen.getByRole("button", {name:"Finding history"}));
  expect(screen.getByRole("region")).not.toHaveTextContent("non-real-path-fixture");
  expect(screen.getByRole("region")).not.toHaveTextContent("SUSPECT");
  expect(screen.getByRole("region")).toHaveTextContent("Secret unavailable at this tier");
  if (rank === 1) expect(screen.getByRole("region")).not.toHaveTextContent(".env");
});
it("does not promote missing or contradictory coverage to complete", () => {
  render(<OspecRescanCoverage findings={[{repo_url:"org/missing",rescan:{status:"complete"}}, {repo_url:"org/contradictory",rescan:{status:"complete",coverage:{complete:false}}}]} isRu={false} />);
  expandCoverage();
  expect(screen.getByRole("region")).toHaveTextContent("org/missingNo data");
  expect(screen.getByRole("region")).toHaveTextContent("org/contradictoryIncomplete");
});
it("localizes coverage and versions in Russian", () => {
  render(<><OspecRescanCoverage findings={fixtures.partial.RAW.findings} isRu /><OspecRescanVersions versions={fixtures.partial.RAW.findings[0].rescan_versions} rank={2} isRu /></>);
  expandCoverage();
  expect(screen.getByRole("region", {name:"Покрытие OSPEC"})).toHaveTextContent("Этапы: 4/5");
  const ruBtn = screen.queryByRole("button", {name:"История находки"});
  if (ruBtn && ruBtn.getAttribute("aria-expanded") === "false") fireEvent.click(ruBtn);
  expect(screen.getByRole("region", {name:"OSPEC rescan versions"})).toHaveTextContent("Маска");
});
