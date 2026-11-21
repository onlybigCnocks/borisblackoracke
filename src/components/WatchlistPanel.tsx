import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { apiRemoveWatchlist } from "@/lib/auth";
import { canWatch, WATCH_INTERVALS, watchRequest, type WatchSnapshot } from "@/lib/watchlist";
import { WatchlistForm, watchControl } from "./AddToWatchlistButton";

export function WatchlistPanel({ tier }: { tier: string }) {
 const { i18n } = useTranslation(); const ru = i18n.language.startsWith("ru"); const allowed = canWatch(tier);
 const [data, setData] = useState<WatchSnapshot | null>(null); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
 const generation = useRef(0);
 const refresh = useCallback(async () => {
  const version = ++generation.current;
  try { const next = await watchRequest("GET"); if (version === generation.current) { setData(next); setError(""); } return next; }
  catch (err) { if (version === generation.current) setError(err instanceof Error ? err.message : String(err)); throw err; }
 }, []);
 useEffect(() => {
  if (!allowed) return;
  const update = () => { void refresh().catch(() => {}); };
  update(); const timer = window.setInterval(update, 60000); window.addEventListener("boris-watchlist-change", update);
  return () => { generation.current++; window.clearInterval(timer); window.removeEventListener("boris-watchlist-change", update); };
 }, [allowed, refresh]);
 const change = async (id: number, patch?: object) => {
  setBusy(true); setError("");
  try {
   if (patch) await watchRequest("PATCH", patch, id); else await apiRemoveWatchlist(id);
   const next = await refresh(); const item = next.watchlist.find(row => row.id === id);
   if (patch ? !item || Object.entries(patch).some(([key, value]) => item[key as keyof typeof item] !== value) : !!item) throw new Error(ru ? "Изменение не подтверждено сервером." : "Change not confirmed by server.");
  }
  catch (err) { setError(err instanceof Error ? err.message : String(err)); } finally { setBusy(false); }
 };
 const date = (value?: number | string | null) => {
  if (value == null) return ru ? "Ещё нет" : "Not yet";
  const d = new Date(typeof value === "number" ? value * 1000 : value); return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString(ru ? "ru-RU" : "en-US");
 };
 if (!allowed) return <section className="rounded-xl border border-border bg-card p-5"><h2 className="text-lg font-semibold">🔒 RADAR+</h2><p>{ru ? "Мониторинг репозиториев и контрактов доступен на RADAR / RAW / BLACKBOX." : "Repository and contract monitoring requires RADAR / RAW / BLACKBOX."}</p></section>;
 return <section className="min-w-0 space-y-4 rounded-xl border border-border bg-card p-3 sm:p-5" aria-label={ru ? "Мониторинг" : "Watchlist"}>
  <header className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-semibold">{ru ? "Мониторинг 24/7" : "24/7 Watchlist"}</h2><button type="button" className={watchControl} disabled={busy} onClick={() => void refresh().catch(() => {})}>{ru ? "Обновить" : "Refresh"}</button></header>
  <p className="text-xs text-muted-foreground">{ru ? "Лимиты: RADAR 5 · RAW 25 · BLACKBOX 100. Базовые проверки без полного скана." : "Limits: RADAR 5 · RAW 25 · BLACKBOX 100. Basic checks, not full scans."}</p>
  <p className="text-xs text-muted-foreground">{ru ? "События всегда видны здесь. Для уведомлений нужен привязанный Telegram-аккаунт BORIS. Добавляя цель, вы соглашаетесь на уведомления о её изменениях независимо от общих колокольчиков радаров." : "Events are always visible here. Telegram alerts require a linked BORIS Telegram account. Adding a watch opts in to its change alerts, independently of global radar bells."}</p>
  <WatchlistForm />
  {error && <p role="alert" className="break-words text-sm text-destructive">{error}</p>}
  {!data && !error && <p role="status">{ru ? "Загрузка…" : "Loading…"}</p>}
  {data?.watchlist.length === 0 && <p>{ru ? "Пока нет целей." : "No targets yet."}</p>}
  <div className="grid min-w-0 gap-3 lg:grid-cols-2">{data?.watchlist.map(item => <article key={item.id} className="min-w-0 space-y-3 rounded-lg border border-border bg-background p-3">
   <h3 className="break-all font-mono text-sm font-semibold">{item.label || item.target}</h3>{item.label && <p className="break-all text-xs text-muted-foreground">{item.target}</p>}
   <p className="text-xs">{item.kind === "repo" ? "GitHub" : item.chain || "—"} · {item.paused ? (ru ? "На паузе" : "Paused") : (ru ? "Активно" : "Active")} · {item.last_verdict || "UNKNOWN"}</p>
   <dl className="grid grid-cols-2 gap-2 text-xs"><dt>{ru ? "Проверено" : "Last checked"}</dt><dd>{date(item.last_checked_at)}</dd><dt>{ru ? "Изменено" : "Last changed"}</dt><dd>{date(item.last_changed_at)}</dd></dl>
   {item.last_error && <p className="break-words text-xs text-destructive">{item.last_error}</p>}
   {item.last_verdict === "UNKNOWN" && <p className="text-xs text-muted-foreground">{ru ? "Статус неизвестен: успешная проверка мониторинга не подтверждена." : "Status unknown: successful monitoring has not been confirmed."}</p>}
   {item.last_verdict === "CHAIN_REQUIRED" && <p className="text-xs text-destructive">{ru ? "Нужна сеть: удалите эту старую цель и добавьте её заново с правильной сетью. Мониторинг на паузе." : "Network required: delete this legacy target and add it again with the correct chain. Monitoring is paused."}</p>}
   <div className="flex flex-wrap gap-2"><button className={watchControl} disabled={busy || item.last_verdict === "CHAIN_REQUIRED"} onClick={() => void change(item.id, { paused: !item.paused })}>{item.paused ? (ru ? "Продолжить" : "Resume") : (ru ? "Пауза" : "Pause")}</button><button className={watchControl} disabled={busy} onClick={() => void change(item.id)}>{ru ? "Удалить" : "Delete"}</button>
    <select aria-label={`${ru ? "Интервал" : "Interval"}: ${item.target}`} className={watchControl} disabled={busy} value={item.interval_minutes} onChange={e => void change(item.id, { interval_minutes: Number(e.target.value) })}>{WATCH_INTERVALS.map(n => <option key={n} value={n}>{n} {ru ? "мин" : "min"}</option>)}</select>
   </div>
   {item.kind === "contract" && <label className="flex gap-2 text-xs"><input type="checkbox" checked={!!item.monitor_holders} disabled={busy} onChange={e => void change(item.id, { monitor_holders: e.target.checked })} />{ru ? "Мониторинг топ-холдеров" : "Monitor top holders"}</label>}
  </article>)}</div>
  <h3 className="font-semibold">{ru ? "События" : "Events"}</h3>
  {data?.events.length === 0 && <p className="text-sm text-muted-foreground">{ru ? "Пока нет событий." : "No events yet."}</p>}
  <ul className="space-y-2">{data?.events.map(event => <li key={event.id} className="min-w-0 break-words rounded-lg border border-border p-3 text-sm"><p>{event.title}</p><p className="text-xs text-muted-foreground">#{event.target_id} · {event.event_type} · {date(event.created_at)}</p>{event.details != null && <details><summary className="cursor-pointer text-xs">{ru ? "Подробности" : "Details"}</summary><pre className="max-h-48 overflow-auto whitespace-pre-wrap break-all text-xs">{JSON.stringify(event.details, null, 2)}</pre></details>}</li>)}</ul>
 </section>;
}
