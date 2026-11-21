import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import Dashboard from "./Dashboard";

const account = { id: "ui-user", name: "Test Operator", email: "test@example.invalid", tier: "GUEST", api_key: "private-key-test-only", scans_total: 0, created_at: 1, auth_provider: "email" };
const actions = vi.hoisted(() => ({ checkout: vi.fn(), copy: vi.fn(), rotate: vi.fn() }));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ i18n: { language: "en" } }) }));
vi.mock("@/components/DemoScanner", () => ({ default: () => <section id="demo-scanner">Scanner test boundary</section> }));
vi.mock("@/components/ToolsPanel", () => ({ default: () => <div>Tools test boundary</div> }));
vi.mock("@/components/RadarStreamPanel", () => ({ default: () => <div>Radar test boundary</div> }));
vi.mock("@/lib/auth", async (original) => ({
  ...await original<object>(),
  getSavedUser: () => account,
  getSavedToken: () => "test-session",
  apiGetMe: async () => ({ user: account, scans: [], watchlist: [] }),
  apiGetPaymentHistory: async () => null,
  apiGetReferral: async () => null,
  apiGetRadarFeed: async () => ({ audits: [] }),
  openCryptoCheckout: actions.checkout,
  apiRotateKey: actions.rotate,
}));
beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: actions.copy.mockResolvedValue(undefined) } }); });
afterEach(cleanup);
const mount = async (url = "/dashboard") => {
  let view: ReturnType<typeof render>;
  await act(async () => { view = render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={[url]}><Dashboard /></MemoryRouter>); });
  return view!;
};

it("masks the API key until explicit reveal and keeps Copy functional", async () => {
  await mount();
  await screen.findByText("Test Operator");
  expect(screen.queryByText(account.api_key)).not.toBeInTheDocument();
  fireEvent.click(screen.getByText("Account & integrations · API key / Telegram"));
  // jsdom does not implement the native details toggle default action.
  screen.getByText("Account & integrations · API key / Telegram").closest("details")!.open = true;
  fireEvent.click(screen.getByRole("button", { name: "Show API key" }));
  expect(screen.getByText(account.api_key)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Copy" }));
  expect(actions.copy).toHaveBeenCalledWith(account.api_key);
  fireEvent.click(screen.getByRole("button", { name: "Hide API key" }));
  expect(screen.queryByText(account.api_key)).not.toBeInTheDocument();
  expect(actions.rotate).not.toHaveBeenCalled();
});

it("restores actual dashboard panels without checkout and honors explicit events", async () => {
  localStorage.setItem("boris_dashboard_tab:v1:ui-user", "billing");
  const view = await mount();
  await waitFor(() => expect(screen.getByRole("button", { name: "Crypto Billing", pressed: true })).toBeInTheDocument());
  expect(actions.checkout).not.toHaveBeenCalled();
  act(() => window.dispatchEvent(new CustomEvent("boris-open-ospec-repo")));
  expect(screen.getByText("Tools test boundary")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Live Radar Feed/ }));
  expect(screen.getByText("Radar test boundary")).toBeInTheDocument();
  view.unmount();
  await mount();
  expect(screen.getByText("Radar test boundary")).toBeInTheDocument();
});

it("puts workspace navigation ahead of the scanner and honors direct tab links", async () => {
  localStorage.setItem("boris_dashboard_tab:v1:ui-user", "radar");
  await mount("/dashboard?tab=tools");
  await screen.findByText("Tools test boundary");
  const nav = screen.getByRole("navigation", { name: "Workspace" });
  expect(nav.compareDocumentPosition(screen.getByText("Scanner test boundary")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});
