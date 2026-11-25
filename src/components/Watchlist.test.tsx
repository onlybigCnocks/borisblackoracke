import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AddToWatchlistButton } from "./AddToWatchlistButton";
import { WatchlistPanel } from "./WatchlistPanel";
const locale = vi.hoisted(() => ({ language: "en" }));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ i18n: locale }) }));
beforeEach(() => { localStorage.setItem("boris_auth_token", "test-only"); localStorage.setItem("boris_auth_user", JSON.stringify({ tier: "RADAR" })); });
afterEach(() => { cleanup(); localStorage.clear(); vi.unstubAllGlobals(); });
it("lets history searches choose a real monitoring target without submitting the search", () => {
 const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
 render(<AddToWatchlistButton target="CRITICAL" allowChooseTarget />);
 fireEvent.click(screen.getByRole("button", { name: "Choose monitoring target" }));
 expect(screen.getByLabelText("GitHub repository")).toHaveValue("");
 expect(screen.getByRole("button", { name: "Add to watchlist" })).toBeDisabled();
 expect(fetcher).not.toHaveBeenCalled();
});

it("opens a prefilled repo dialog and saves using authenticated API with readback", async () => {
 const fetcher = vi.fn().mockImplementation(async () => new Response(JSON.stringify({ watchlist: [{ id: 1, target: "aave/aave-v3-core", kind: "repo", chain: "" }], events: [] })));
 vi.stubGlobal("fetch", fetcher);
 render(<AddToWatchlistButton target="aave/aave-v3-core" />);
 fireEvent.click(screen.getByRole("button", { name: "+ Watch" }));
 expect(screen.getByRole("dialog")).toBeInTheDocument();
 expect(screen.getByLabelText("GitHub repository")).toHaveValue("aave/aave-v3-core");
 fireEvent.click(screen.getByRole("button", { name: "Add to watchlist" }));
 await screen.findByText("Watching");
 expect(fetcher).toHaveBeenCalledTimes(2);
 expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({ target: "aave/aave-v3-core", kind: "repo", interval_minutes: 60, monitor_holders: false });
 expect(fetcher.mock.calls[0][1].headers.Authorization).toBe("Bearer test-only");
});

it("requires explicit chain for a contract and preserves holder opt-in", async () => {
 const address = "0x" + "1".repeat(40);
 const fetcher = vi.fn().mockImplementation(async () => new Response(JSON.stringify({ watchlist: [{ id: 2, target: address, kind: "contract", chain: "base" }], events: [] })));
 vi.stubGlobal("fetch", fetcher);
 render(<AddToWatchlistButton target={address} monitor_holders />);
 fireEvent.click(screen.getByRole("button", { name: "+ Watch" }));
 expect(screen.getByLabelText("Contract address")).toHaveValue(address);
 expect(screen.getByLabelText("Chain")).toHaveValue("");
 expect(screen.getByRole("button", { name: "Add to watchlist" })).toBeDisabled();
 fireEvent.change(screen.getByLabelText("Chain"), { target: { value: "base" } });
 fireEvent.click(screen.getByRole("button", { name: "Add to watchlist" }));
 await screen.findByText("Watching");
 expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({ kind: "contract", target: address, chain: "base", monitor_holders: true });
});

it("renders monitoring state and confirms pause by readback, retaining failed deletes", async () => {
 let paused = false;
 const fetcher = vi.fn().mockImplementation(async (_url, options) => {
  if (options?.method === "DELETE") return new Response(JSON.stringify({ ok: false }), { status: 500 });
  if (options?.method === "PATCH") paused = JSON.parse(options.body).paused;
  return new Response(JSON.stringify({ watchlist: [{ id: 7, target: "aave/aave-v3-core", kind: "repo", paused, interval_minutes: 60, last_checked_at: null, last_changed_at: null, last_error: "Probe unavailable", last_verdict: "UNKNOWN" }], events: [{ id: 1, target_id: 7, event_type: "error", title: "Provider unavailable", created_at: 1 }] }));
 });
 vi.stubGlobal("fetch", fetcher);
 render(<WatchlistPanel tier="RADAR" />);
 await screen.findByText("aave/aave-v3-core");
 expect(screen.getByText("Probe unavailable")).toBeInTheDocument();
 expect(screen.getByText("Provider unavailable")).toBeInTheDocument();
 expect(screen.getByText("Last checked")).toBeInTheDocument();
 fireEvent.click(screen.getByRole("button", { name: "Pause" }));
 await screen.findByRole("button", { name: "Resume" });
 fireEvent.click(screen.getByRole("button", { name: "Delete" }));
 await screen.findByRole("alert");
 expect(screen.getByText("aave/aave-v3-core")).toBeInTheDocument();
});

it("shows duplicate/idempotent adds as Watching only after canonical readback", async () => {
 const fetcher = vi.fn().mockImplementation(async () => new Response(JSON.stringify({ watchlist: [{ id: 9, target: "aave/aave-v3-core", kind: "repo" }], events: [] })));
 vi.stubGlobal("fetch", fetcher);
 render(<AddToWatchlistButton target="https://github.com/aave/aave-v3-core.git" />);
 fireEvent.click(screen.getByRole("button", { name: "+ Watch" }));
 fireEvent.click(screen.getByRole("button", { name: "Add to watchlist" }));
 await screen.findByText("Watching");
 expect(fetcher).toHaveBeenCalledTimes(2);
});
it("keeps unknown networks unselected and rejects non-GitHub targets", () => {
 const view = render(<AddToWatchlistButton target={"0x" + "2".repeat(40)} chain="solana" />);
 fireEvent.click(screen.getByRole("button", { name: "+ Watch" }));
 expect(screen.getByLabelText("Chain")).toHaveValue("");
 expect(screen.getByRole("button", { name: "Add to watchlist" })).toBeDisabled();
 view.unmount();
 render(<AddToWatchlistButton target="https://example.com/owner/repo" />);
 expect(screen.getByRole("button", { name: /Unsupported/ })).toBeDisabled();
});
it("does not claim success when readback omits the submitted target", async () => {
 vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => new Response(JSON.stringify({ watchlist: [], events: [] }))));
 render(<AddToWatchlistButton target="aave/aave-v3-core" />);
 fireEvent.click(screen.getByRole("button", { name: "+ Watch" }));
 fireEvent.click(screen.getByRole("button", { name: "Add to watchlist" }));
 await screen.findByRole("alert");
 expect(screen.queryByText("Watching")).not.toBeInTheDocument();
});
it.each([{ status: 409, body: { detail: "Duplicate target" } }, { status: 200, body: { ok: false, watchlist: [], events: [] } }, { status: 200, body: {} }, { status: 401, body: { detail: "Session expired" } }])("shows add failures without success ($status)", async ({ status, body }) => {
 vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => new Response(JSON.stringify(body), { status })));
 render(<AddToWatchlistButton target="aave/aave-v3-core" />);
 fireEvent.click(screen.getByRole("button", { name: "+ Watch" }));
 fireEvent.click(screen.getByRole("button", { name: "Add to watchlist" }));
 await screen.findByRole("alert");
 expect(screen.getByRole("dialog")).toBeInTheDocument();
 expect(screen.queryByText("Watching")).not.toBeInTheDocument();
});

it("flags contradictory pause readback rather than confirming it", async () => {
 vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => new Response(JSON.stringify({ watchlist: [{ id: 7, target: "aave/aave-v3-core", kind: "repo", paused: false, interval_minutes: 60 }], events: [] }))));
 render(<WatchlistPanel tier="RADAR" />);
 fireEvent.click(await screen.findByRole("button", { name: "Pause" }));
 expect(await screen.findByRole("alert")).toHaveTextContent("not confirmed");
});
it("does not fetch the panel for GUEST", () => {
 const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
 render(<WatchlistPanel tier="GUEST" />);
 expect(screen.getByRole("heading", { name: /RADAR/ })).toBeInTheDocument();
 expect(fetcher).not.toHaveBeenCalled();
});
it("resets saved status when a result switches target", async () => {
 vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => new Response(JSON.stringify({ watchlist: [{ id: 1, target: "aave/aave-v3-core", kind: "repo" }], events: [] }))));
 const view = render(<AddToWatchlistButton target="aave/aave-v3-core" />);
 fireEvent.click(screen.getByRole("button", { name: "+ Watch" })); fireEvent.click(screen.getByRole("button", { name: "Add to watchlist" })); await screen.findByText("Watching");
 view.rerender(<AddToWatchlistButton target="dexe-network/DeXe-Protocol" />);
 expect(screen.getByRole("button", { name: "+ Watch" })).toBeInTheDocument();
});
it("localizes the form in Russian and supports Escape without a write", async () => {
 locale.language = "ru"; const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
 try {
 render(<AddToWatchlistButton target="aave/aave-v3-core" />);
 fireEvent.click(screen.getByRole("button", { name: "+ Следить" }));
 expect(screen.getByLabelText("GitHub репозиторий")).toHaveValue("aave/aave-v3-core");
 expect(screen.getByLabelText("Сеть")).toBeInTheDocument();
 fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
 await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
 expect(fetcher).not.toHaveBeenCalled();
 } finally { locale.language = "en"; }
});
it("locks GUEST and unsupported targets without requests", () => {
 const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
 localStorage.setItem("boris_auth_user", JSON.stringify({ tier: "GUEST" }));
 const view = render(<AddToWatchlistButton target="aave/aave-v3-core" />);
 expect(screen.getByRole("button", { name: /RADAR/ })).toBeDisabled();
 view.unmount();
 localStorage.setItem("boris_auth_user", JSON.stringify({ tier: "RADAR" }));
 render(<AddToWatchlistButton target="stellar:unsupported" />);
 expect(screen.getByRole("button", { name: /Unsupported/ })).toBeDisabled();
 expect(fetcher).not.toHaveBeenCalled();
});

