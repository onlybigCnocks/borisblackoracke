import { useState } from 'react';
import { authHeaders } from '@/lib/auth';
type Page = { total: number; offset: number; limit: number; has_more: boolean; items: { url: string; reason: string; attempts: number; deferred_at: number }[] };
const API = import.meta.env.VITE_API_URL || 'https://api.black-oracle.com';
export default function OspecDeferredPanel({ isRu }: { isRu: boolean }) {
  const [open, setOpen] = useState(false); const [data, setData] = useState<Page | null>(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function load(offset = 0) {
    if (busy) return; setBusy(true); setError('');
    try {
      const res = await fetch(`${API}/api/tools/ospec/deferred?offset=${offset}&limit=20`, { headers: authHeaders() });
      const body = await res.json();
      if (!res.ok || body.ok !== true || !Array.isArray(body.items) || !Number.isInteger(body.total)) throw new Error(body.detail || 'Deferred queue unavailable');
      setData(body);
    } catch (e) { setError(e instanceof Error ? e.message : 'Deferred queue unavailable'); }
    finally { setBusy(false); }
  }
  return <section className="w-full rounded-xl border border-amber-500/30 p-3" aria-label="OSPEC deferred retries">
    <button type="button" aria-expanded={open} onClick={() => { const next = !open; setOpen(next); if (next) void load(); }} className="font-semibold">{isRu ? 'Отложенные повторные сканы' : 'Deferred retries'}{data ? ` · ${data.total.toLocaleString()}` : ''} {open ? '▴' : '▾'}</button>
    {open && <div className="mt-2 space-y-2">
      <p className="text-muted-foreground">{isRu ? 'Исключены из автоматического сканирования. Находки и история сохранены.' : 'Excluded from automatic scans. Findings and history retained.'}</p>
      {error && <p role="alert" className="text-destructive">{error}</p>}
      {busy && <p>{isRu ? 'Загрузка…' : 'Loading…'}</p>}
      {data?.items.map(item => <div key={item.url} className="rounded border border-border p-2 break-all"><a href={item.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{item.url}</a><p className="text-muted-foreground">{item.reason} · {isRu ? 'Попыток' : 'Attempts'}: {item.attempts} · {new Date(item.deferred_at * 1000).toLocaleString()}</p></div>)}
      {data && data.total === 0 && <p>{isRu ? 'Отложенных сканов нет' : 'No deferred scans'}</p>}
      <div className="flex gap-2"><button disabled={busy || !data || data.offset === 0} onClick={() => void load(Math.max(0, (data?.offset || 0) - 20))}>{isRu ? 'Назад' : 'Previous'}</button><button disabled={busy || !data?.has_more} onClick={() => void load((data?.offset || 0) + 20)}>{isRu ? 'Далее' : 'Next'}</button><button disabled={busy} onClick={() => void load(data?.offset || 0)}>{isRu ? 'Обновить список' : 'Refresh list'}</button></div>
    </div>}
  </section>;
}
