import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { WatchlistPanel } from "./WatchlistPanel";
const locale = vi.hoisted(() => ({ language: "en" }));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ i18n: locale }) }));
beforeEach(() => { localStorage.setItem("boris_auth_token", "test-only"); });
afterEach(() => { cleanup(); localStorage.clear(); vi.unstubAllGlobals(); locale.language = "en"; });
it.each([
 { language: "en", guidance: "Events are always visible here. Telegram alerts require a linked BORIS Telegram account. Adding a watch opts in to its change alerts, independently of global radar bells." },
 { language: "ru", guidance: "События всегда видны здесь. Для уведомлений нужен привязанный Telegram-аккаунт BORIS. Добавляя цель, вы соглашаетесь на уведомления о её изменениях независимо от общих колокольчиков радаров." },
])("explains watch-specific notification consent in $language", async ({ language, guidance }) => {
 locale.language = language;
 vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => new Response(JSON.stringify({ watchlist: [], events: [] }))));
 render(<WatchlistPanel tier="RADAR" />);
 await screen.findByText(language === "ru" ? "Пока нет целей." : "No targets yet.");
 expect(screen.getByText(guidance)).toBeInTheDocument();
});
it.each([
 { language: "en", instruction: "Network required: delete this legacy target and add it again with the correct chain. Monitoring is paused.", resume: "Resume", remove: "Delete" },
 { language: "ru", instruction: "Нужна сеть: удалите эту старую цель и добавьте её заново с правильной сетью. Мониторинг на паузе.", resume: "Продолжить", remove: "Удалить" },
])("keeps CHAIN_REQUIRED paused with actionable recovery in $language", async ({ language, instruction, resume, remove }) => {
 locale.language = language;
 let deleted = false;
 const fetcher = vi.fn().mockImplementation(async (_url, options) => {
  if (options.method === "DELETE") { deleted = true; return new Response(JSON.stringify({ ok: true })); }
  return new Response(JSON.stringify({ watchlist: deleted ? [] : [{ id: 8, target: "0x" + "1".repeat(40), kind: "contract", chain: null, paused: true, interval_minutes: 60, last_verdict: "CHAIN_REQUIRED" }], events: [] }));
 });
 vi.stubGlobal("fetch", fetcher);
 render(<WatchlistPanel tier="RADAR" />);
 await screen.findByRole("button", { name: remove });
 expect(screen.getByText(instruction)).toBeInTheDocument();
 expect(screen.getByRole("button", { name: resume })).toBeDisabled();
 fireEvent.click(screen.getByRole("button", { name: resume }));
 expect(fetcher.mock.calls.some(([, options]) => options.method === "PATCH")).toBe(false);
 fireEvent.click(screen.getByRole("button", { name: remove }));
 await screen.findByText(language === "ru" ? "Пока нет целей." : "No targets yet.");
 expect(fetcher.mock.calls.map(([, options]) => options.method)).toEqual(["GET", "DELETE", "GET"]);
});
it.each([
 { language: "en", active: "Active", explanation: "Status unknown: successful monitoring has not been confirmed." },
 { language: "ru", active: "Активно", explanation: "Статус неизвестен: успешная проверка мониторинга не подтверждена." },
])("does not present UNKNOWN as successful monitoring in $language", async ({ language, active, explanation }) => {
 locale.language = language;
 vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => new Response(JSON.stringify({ watchlist: [{ id: 9, target: "owner/repo", kind: "repo", paused: false, interval_minutes: 60, last_verdict: "UNKNOWN", last_checked_at: null }], events: [] }))));
 render(<WatchlistPanel tier="RADAR" />);
 await screen.findByText("owner/repo");
 expect(screen.getByText(explanation)).toBeInTheDocument();
 expect(screen.getByText(`GitHub · ${active} · UNKNOWN`)).toBeInTheDocument();
 expect(screen.queryByText(/MONITORING/)).not.toBeInTheDocument();
});
