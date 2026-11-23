import { afterEach, expect, it, vi } from "vitest";
import { cleanup, act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import ToolsPanel from "./ToolsPanel";
vi.mock("react-i18next", () => ({ useTranslation: () => ({ i18n: { language: "ru" } }) }));
vi.mock("@/lib/auth", async original => ({ ...await original<object>(), apiGetToolHistory: async () => [] }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); localStorage.clear(); });
const response = (data: object, status = 200) => new Response(JSON.stringify(data), { status });
function openBridges(fetcher: ReturnType<typeof vi.fn>) {
  localStorage.setItem("boris_auth_token", "fixture");
  localStorage.setItem("boris_auth_user", JSON.stringify({ tier: "BLACKBOX" }));
  vi.stubGlobal("fetch", fetcher);
  render(<ToolsPanel />);
  fireEvent.click(screen.getByRole("button", { name: /Cross-Chain Мосты/ }));
}
it("offers validated non-EVM provenance links without EVM actions", async () => {
  openBridges(vi.fn().mockResolvedValue(response({ total_matching: 1, bridges: [{ address: "wormDTUJ6AWPNvk59vGQbDvGJmqbDTdgWgAqcLBCgUb", chain: "solana", family: "non_evm", name: "Solana candidate", provenance: [{ source: "wormhole", url: "https://raw.githubusercontent.com/wormhole-foundation/wormhole-sdk-ts/main/core/base/src/constants/contracts/tokenBridge.ts", digest: "a".repeat(64), locator: "/Mainnet/Solana" }, { source: "bad", url: "javascript:alert(1)", digest: "a".repeat(64) }] }] })));
  await screen.findByText("Solana candidate");
  expect(screen.getByRole("link", { name: "Registry source: wormhole" })).toHaveAttribute("href", "https://raw.githubusercontent.com/wormhole-foundation/wormhole-sdk-ts/main/core/base/src/constants/contracts/tokenBridge.ts");
  expect(screen.getByRole("link", { name: "Explorer: solana" })).toHaveAttribute("href", "https://explorer.solana.com/address/wormDTUJ6AWPNvk59vGQbDvGJmqbDTdgWgAqcLBCgUb");
  expect(screen.queryByRole("link", { name: "Registry source: bad" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "New scan" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "💸 Funds Flow" })).toBeDisabled();
});
it("links only a server-proven canonical archived report route", async () => {
  openBridges(vi.fn().mockResolvedValue(response({ total_matching: 1, bridges: [{ address: "0x" + "2".repeat(40), chain: "base", family: "evm", name: "Archived candidate", archived_reports: [{ task_id: "base-report", href: "/report/base-report", chain: "base", address: "0x" + "2".repeat(40), source: "scan_archive" }] }] })));
  await screen.findByText("Archived candidate");
  expect(screen.getByRole("link", { name: "Archived report" })).toHaveAttribute("href", "/report/base-report");
});
it("prefills the existing scanner without submitting or bypassing quotas", async () => {
  const address = "0x40ec5B33f54e0E8A33A975908C5BA1c14e5BbbDf";
  const fetcher = vi.fn().mockResolvedValue(response({ total_matching: 1, bridges: [{ address, chain: "ethereum", family: "evm", name: "Scanner candidate", tvl_usd: null }] }));
  openBridges(fetcher);
  await screen.findByText("Scanner candidate");
  fireEvent.click(screen.getByRole("button", { name: "New scan" }));
  expect(localStorage.getItem("boris_prefill_target")).toBe(address);
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it("rejects Avalanche cross-tools because installed Funds Flow config supports six networks", async () => {
  openBridges(vi.fn().mockResolvedValue(response({ total_matching: 1, bridges: [{ address: "0x" + "1".repeat(40), chain: "avalanche", family: "evm", name: "Avalanche candidate", tvl_usd: null }] })));
  await screen.findByText("Avalanche candidate");
  expect(screen.getByRole("button", { name: "💸 Funds Flow" })).toBeDisabled();
  expect(screen.getByRole("button", { name: /Proxy & Slots/ })).toBeDisabled();
});
it("preserves the exact Base target and network when opening Funds Flow", async () => {
  const address = "0x" + "2".repeat(40);
  openBridges(vi.fn().mockResolvedValue(response({ total_matching: 1, bridges: [{ address, chain: "base", family: "evm", name: "Base candidate", tvl_usd: null }] })));
  await screen.findByText("Base candidate");
  fireEvent.click(screen.getByRole("button", { name: "💸 Funds Flow" }));
  expect(screen.getByRole("combobox", { name: "Сеть блокчейна" })).toHaveValue("base");
  expect(screen.getByDisplayValue(address)).toBeInTheDocument();
});
it("disables EVM tools for an unresolved network even with an EVM-shaped address", async () => {
  openBridges(vi.fn().mockResolvedValue(response({ total_matching: 1, bridges: [{ address: "0x" + "1".repeat(40), chain: "eip155:999999", family: "evm", name: "Unresolved", tvl_usd: null }] })));
  await screen.findByText("Unresolved");
  expect(screen.getByTitle("Просмотреть 14-дневные потоки средств хранилища")).toBeDisabled();
  expect(screen.getByTitle("Инспектировать EIP-1967 слоты админа и имплементации")).toBeDisabled();
});
it("persists a partial harvest and resumes on the next click", async () => {
  const fetcher = vi.fn().mockImplementation(async url => String(url).endsWith("/harvest") ? response({ ok: false, status: "partial_or_failed", sources: [{ source: "wormhole", status: "partial", cursor: 100, total: 200 }] }, 409) : response({ total_matching: 0 }));
  openBridges(fetcher);
  await screen.findByText("Найдено: 0");
  fireEvent.click(screen.getByRole("button", { name: /Запустить Радар-Конвейер/ }));
  await screen.findByText(/Продолжение требуется/);
  const call = fetcher.mock.calls.find(([url]) => String(url).endsWith("/harvest"));
  expect(JSON.parse(call![1].body).resume).toBe(true);
  expect(screen.getByRole("button", { name: /Продолжить сбор/ })).toBeEnabled();
});
it("renders API zero and unknown counts without claiming a complete world catalog", async () => {
  openBridges(vi.fn().mockResolvedValue(response({ stats: { total_contracts: 0, total_protocols: 0, bridge_hacks_count: 0 }, bridges: [], total_matching: 0 })));
  await waitFor(() => expect(screen.getByRole("button", { name: /Каталог протоколов \(0\)/ })).toBeInTheDocument());
  expect(screen.getByRole("button", { name: /Развёртывания контрактов \(0\)/ })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /База Взломов Мостов \(0\)/ })).toBeInTheDocument();
  expect(screen.queryByText(/5,731|65.3B|54.9B|Все Известные/)).not.toBeInTheDocument();
  expect(screen.getByText(/TVL каталога: —/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Вперёд/ })).toBeDisabled();
});
it("keeps pagination bound to the completed query when the search input is edited", async () => {
  const fetcher = vi.fn().mockImplementation(async (_url, init) => response({ total_matching: 101, offset: JSON.parse(init.body).offset, limit: 50 }));
  openBridges(fetcher);
  await screen.findByText("Найдено: 101");
  fireEvent.change(screen.getByPlaceholderText(/0x\.\.\. адрес хранилища/), { target: { value: "new-draft" } });
  fireEvent.click(screen.getByRole("button", { name: /Вперёд/ }));
  await waitFor(() => expect(JSON.parse(fetcher.mock.lastCall![1].body)).toMatchObject({ q: "", offset: 50 }));
});
it("does not reopen bridges after leaving during harvest", async () => {
  let finish: (value: Response) => void;
  const fetcher = vi.fn().mockImplementation(async url => String(url).endsWith("/harvest") ? new Promise<Response>(resolve => { finish = resolve; }) : response({ total_matching: 0 }));
  openBridges(fetcher);
  await screen.findByText("Найдено: 0");
  fireEvent.click(screen.getByRole("button", { name: /Запустить Радар-Конвейер/ }));
  fireEvent.click(screen.getByRole("button", { name: /Холдеры и киты/ }));
  await act(async () => finish(response({ ok: true, new_discovered: 0 })));
  expect(fetcher).toHaveBeenCalledTimes(2);
});
it.each(["contracts", "protocols", "hacks"])("paginates %s using selected-tab totals and echoed page size", async (tab) => {
  const fetcher = vi.fn().mockImplementation(async (_url, init) => {
    const body = JSON.parse(init.body);
    return response({ stats: { total_protocols: 400 }, view_tab: body.view_tab, offset: body.offset, limit: 20, total_matching: 21, bridges: [], protocols: [], bridge_hacks: [] });
  });
  openBridges(fetcher);
  await screen.findByText(/Найдено: 21/);
  if (tab !== "contracts") fireEvent.click(screen.getByRole("button", { name: tab === "protocols" ? /Каталог протоколов/ : /База Взломов Мостов/ }));
  await waitFor(() => expect(JSON.parse(fetcher.mock.lastCall![1].body).view_tab).toBe(tab));
  fireEvent.click(screen.getByRole("button", { name: /Вперёд/ }));
  await waitFor(() => expect(JSON.parse(fetcher.mock.lastCall![1].body)).toMatchObject({ view_tab: tab, offset: 20, limit: 20 }));
  await waitFor(() => expect(screen.getByRole("button", { name: /Вперёд/ })).toBeDisabled());
  fireEvent.click(screen.getByRole("button", { name: /Назад/ }));
  await waitFor(() => expect(JSON.parse(fetcher.mock.lastCall![1].body).offset).toBe(0));
});
it.each([401, 403, 500])("surfaces catalog HTTP %s instead of rendering a false empty result", async status => {
  openBridges(vi.fn().mockResolvedValue(response({ detail: "Каталог недоступен" }, status)));
  await screen.findByText("Каталог недоступен");
  expect(screen.queryByText(/Найдено:/)).not.toBeInTheDocument();
});
it("does not infer unknown totals from page length and resets filters and page size", async () => {
  const fetcher = vi.fn().mockImplementation(async () => response({ bridges: [] }));
  openBridges(fetcher);
  await screen.findByText("Найдено: —");
  expect(screen.getByRole("button", { name: /Каталог протоколов/ })).toHaveTextContent("(—)");
  expect(screen.getByRole("button", { name: /Вперёд/ })).toBeDisabled();
  fireEvent.change(screen.getByRole("combobox", { name: "Записей на странице" }), { target: { value: "100" } });
  await waitFor(() => expect(JSON.parse(fetcher.mock.lastCall![1].body)).toMatchObject({ offset: 0, limit: 100 }));
  await screen.findByText("Найдено: —");
  fireEvent.click(screen.getByRole("button", { name: "base" }));
  await waitFor(() => expect(JSON.parse(fetcher.mock.lastCall![1].body)).toMatchObject({ chain: "base", offset: 0, view_tab: "contracts" }));
});
it("refreshes the catalog after an explicitly successful harvest", async () => {
  const fetcher = vi.fn().mockImplementation(async url => String(url).endsWith("/harvest") ? response({ ok: true, new_discovered: 0 }) : response({ total_matching: 0 }));
  openBridges(fetcher);
  await screen.findByText("Найдено: 0");
  fireEvent.click(screen.getByRole("button", { name: /Запустить Радар-Конвейер/ }));
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(3));
  await screen.findByText("Найдено: 0");
});
it.each([{ ok: false, error: "Сбор недоступен" }, { success: false, detail: "Сбор недоступен" }, {}])("does not silently accept harvest application failures: %j", async payload => {
  const fetcher = vi.fn().mockImplementation(async url => String(url).endsWith("/harvest") ? response(payload) : response({ total_matching: 0 }));
  openBridges(fetcher);
  await screen.findByText("Найдено: 0");
  fireEvent.click(screen.getByRole("button", { name: /Запустить Радар-Конвейер/ }));
  await screen.findByText(/Сбор недоступен|Не удалось подтвердить сбор/);
  expect(fetcher).toHaveBeenCalledTimes(2);
});
it("shows stored coverage only when the dashboard supplies it", async () => {
  openBridges(vi.fn().mockResolvedValue(response({ total_matching: 0, coverage: { contracts_with_recorded_bytecode: 0, contracts_without_recorded_bytecode: 12, verified_bridge_contracts: null, verification_status: "not_tracked" } })));
  await screen.findByText(/Записей с сохранённым байткодом: 0/);
  expect(screen.getByText(/Без сохранённого байткода: 12/)).toBeInTheDocument();
  expect(screen.getByText(/Подтверждённых контрактов мостов: —/)).toBeInTheDocument();
});
it("ignores a stale tab response and opens protocol contracts with the new query", async () => {
  let finish: (value: Response) => void;
  const fetcher = vi.fn().mockImplementation(async (_url, init) => {
    const b = JSON.parse(init.body);
    if (b.view_tab === "protocols") return new Promise<Response>(resolve => { finish = resolve; });
    return response({ total_matching: 0, bridge_hacks: [] });
  });
  openBridges(fetcher);
  await screen.findByText("Найдено: 0");
  fireEvent.click(screen.getByRole("button", { name: /Каталог протоколов/ }));
  fireEvent.click(screen.getByRole("button", { name: /База Взломов Мостов/ }));
  await screen.findByText("Найдено: 0");
  await act(async () => finish(response({ total_matching: 999, protocols: [] })));
  expect(screen.queryByText("Найдено: 999")).not.toBeInTheDocument();
  fetcher.mockImplementation(async () => response({ total_matching: 1, protocols: [{ slug: "fixture", name: "Fixture Bridge" }] }));
  fireEvent.click(screen.getByRole("button", { name: /Каталог протоколов/ }));
  fireEvent.click(await screen.findByRole("button", { name: /Контракты моста/ }));
  await waitFor(() => expect(JSON.parse(fetcher.mock.lastCall![1].body)).toMatchObject({ q: "Fixture Bridge", view_tab: "contracts", offset: 0 }));
});
