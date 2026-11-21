import { useCallback, useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { WATCH_CHAINS, WATCH_INTERVALS, canWatch, normalizeWatchChain, useWatchAuth, watchKind, watchRequest, type WatchTarget } from "@/lib/watchlist";

export const watchControl = "min-h-10 min-w-0 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";
export function WatchlistForm({ initial = { target: "" }, onSaved }: { initial?: WatchTarget; onSaved?: () => void }) {
 const { i18n } = useTranslation(); const ru = i18n.language.startsWith("ru"); const id = useId();
 const inferred = initial.kind || watchKind(initial.target);
 const [repo, setRepo] = useState(inferred === "repo" ? initial.target : "");
 const [address, setAddress] = useState(inferred === "contract" ? initial.target : "");
 const [chain, setChain] = useState(normalizeWatchChain(initial.chain));
 const [holders, setHolders] = useState(!!initial.monitor_holders); const [interval, setInterval] = useState(60);
 const valid = (!address && watchKind(repo.trim()) === "repo") || (!repo && watchKind(address.trim()) === "contract" && !!chain);
 const [busy, setBusy] = useState(false); const [error, setError] = useState("");
 return <form className="grid min-w-0 gap-3" onSubmit={async e => {
  e.preventDefault(); if (!valid || busy || !canWatch()) return; setBusy(true); setError("");
  try { await watchRequest("POST", { target: (repo || address).trim(), kind: repo ? "repo" : "contract", ...(address ? { chain } : {}), label: initial.label || "", interval_minutes: interval, monitor_holders: !!address && holders }); const snapshot = await watchRequest("GET");
   const canonical = (v: string) => v.replace(/^https?:\/\/github\.com\//, "").replace(/\/$/, "").replace(/\.git$/, "").toLowerCase();
   if (!snapshot.watchlist.some(item => canonical(item.target) === canonical((repo || address).trim()) && item.kind === (repo ? "repo" : "contract") && (!address || item.chain === chain))) throw new Error(ru ? "Цель не подтверждена сервером. Обновите список." : "Target not confirmed by server. Refresh the list.");
   window.dispatchEvent(new Event("boris-watchlist-change")); onSaved?.(); }
  catch (err) { setError(err instanceof Error ? err.message : String(err)); } finally { setBusy(false); }
 }}>
  <label htmlFor={`${id}-repo`}>{ru ? "GitHub репозиторий" : "GitHub repository"}</label>
  <input id={`${id}-repo`} className={watchControl} value={repo} disabled={busy} onChange={e => { setRepo(e.target.value); setAddress(""); }} placeholder="owner/repo" />
  <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,10rem)]">
   <label className="grid min-w-0 gap-2">{ru ? "Адрес контракта" : "Contract address"}<input className={watchControl} value={address} disabled={busy} onChange={e => { setAddress(e.target.value); setRepo(""); }} placeholder="0x…" /></label>
   <label className="grid min-w-0 gap-2">{ru ? "Сеть" : "Chain"}<select className={watchControl} value={chain} disabled={busy} onChange={e => setChain(e.target.value)}><option value="">{ru ? "Выберите сеть" : "Select chain"}</option>{WATCH_CHAINS.map(c => <option key={c} value={c}>{c}</option>)}</select></label>
  </div>
  <p className="text-xs text-muted-foreground">{ru ? "Заполните одно поле: репозиторий или контракт с сетью." : "Fill one target: repository or contract with chain."}</p>
  {address && <label className="flex items-start gap-2"><input type="checkbox" checked={holders} disabled={busy} onChange={e => setHolders(e.target.checked)} />{ru ? "Топ-холдеры (если доступен источник; иначе ошибка статуса)" : "Top holders (if a source is available; otherwise a status error)"}</label>}
  <label htmlFor={`${id}-interval`}>{ru ? "Интервал (мин)" : "Interval (minutes)"}</label>
  <select id={`${id}-interval`} className={watchControl} value={interval} disabled={busy} onChange={e => setInterval(Number(e.target.value))}>{WATCH_INTERVALS.map(n => <option key={n} value={n}>{n}</option>)}</select>
  {error && <p role="alert" className="break-words text-sm text-destructive">{error}</p>}
  <button type="submit" disabled={busy || !valid} className={`${watchControl} btn-action`}>{busy ? (ru ? "Сохранение…" : "Saving…") : (ru ? "Добавить в мониторинг" : "Add to watchlist")}</button>
 </form>;
}
export function AddToWatchlistButton(props: WatchTarget) {
 const { i18n } = useTranslation(); const ru = i18n.language.startsWith("ru");
 const [open, setOpen] = useState(false); const [saved, setSaved] = useState(false);
 useEffect(() => { setSaved(false); setOpen(false); }, [props.target, props.chain]);
 const [allowed, setAllowed] = useState(canWatch); useWatchAuth(useCallback(() => setAllowed(canWatch()), []));
 const supported = !!watchKind(props.target || "") && (!props.kind || props.kind === watchKind(props.target));
 const lock = !allowed ? "🔒 RADAR+" : !supported ? (ru ? "Не поддерживается" : "Unsupported target") : "";
 return <Dialog open={open && allowed} onOpenChange={setOpen}>
  <DialogTrigger asChild><button type="button" disabled={!!lock} title={lock || props.target} className={watchControl}>{lock || (saved ? (ru ? "Отслеживается" : "Watching") : (ru ? "+ Следить" : "+ Watch"))}</button></DialogTrigger>
  <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto"><DialogTitle>{ru ? "Мониторинг" : "Watchlist"}</DialogTitle><DialogDescription>{ru ? "Проверки без полного сканирования." : "Checks without a full scan."}</DialogDescription><WatchlistForm initial={props} onSaved={() => { setSaved(true); setOpen(false); }} /></DialogContent>
 </Dialog>;
}
