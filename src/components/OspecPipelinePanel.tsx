import { useEffect, useRef, useState } from 'react';
import { authHeaders } from '@/lib/auth';
const API = import.meta.env.VITE_API_URL || 'https://api.black-oracle.com';
type Status = { ok: boolean; running: boolean; state: string; generation?: string; engine?: string; counts?: Record<string, number | null>; heartbeat?: unknown; scope?: string; limitations?: string[] };

export default function OspecPipelinePanel({ tier, isRu }: { tier?: string; isRu: boolean }) {
  const allowed = tier?.toUpperCase() === 'BLACKBOX';
  const [data, setData] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const serial = useRef(0);
  const lock = useRef(false);
  const current = useRef<AbortController | null>(null);
  async function request(action: string, signal: AbortSignal): Promise<Status> {
    const res = await fetch(`${API}/api/tools/ospec-daemon-control`, { method: 'POST', signal, headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ action }) });
    const body = await res.json();
    const status = body.status;
    if (!res.ok || body.ok === false || !status || status.ok !== true || typeof status.running !== 'boolean' || !['running','paused','stopped','completed'].includes(status.state.toLowerCase())) throw new Error(typeof body.detail === 'string' ? body.detail : body.error || `Pipeline state unavailable (HTTP ${res.status})`);
    return status;
  }
  async function refresh() {
    if (!allowed || lock.current) return;
    current.current?.abort(); const abort = new AbortController(); current.current = abort;
    const id = ++serial.current;
    const timer = window.setTimeout(() => abort.abort(), 15000);
    try { const status = await request('status', abort.signal); if (id === serial.current) { setData(status); setError(''); } }
    catch (e) { if (id === serial.current) { setData(null); setError(e instanceof Error ? e.message : 'Pipeline unavailable'); } }
    finally { window.clearTimeout(timer); }
  }
  useEffect(() => {
    ++serial.current; current.current?.abort(); lock.current = false; setData(null); setError(''); setBusy(false);
    if (allowed) void refresh();
    const timer = window.setInterval(() => { if (!document.hidden) void refresh(); }, 30000);
    return () => { ++serial.current; current.current?.abort(); window.clearInterval(timer); };
  }, [tier]);
  async function control() {
    if (!allowed || lock.current || !data || error) return;
    lock.current = true; setBusy(true); current.current?.abort();
    const id = ++serial.current; const abort = new AbortController(); current.current = abort;
    const timer = window.setTimeout(() => abort.abort(), 30000);
    const action = data.running ? 'pause' : data.state.toLowerCase() === 'paused' ? 'resume' : 'start';
    try {
      await request(action, abort.signal);
      const status = await request('status', abort.signal);
      if (status.running !== (action !== 'pause')) throw new Error('Server did not confirm the requested state');
      if (id === serial.current) { setData(status); setError(''); }
    } catch (e) { if (id === serial.current) { setData(null); setError(e instanceof Error ? e.message : 'Control failed'); } }
    finally { window.clearTimeout(timer); if (id === serial.current) { lock.current = false; setBusy(false); } }
  }
  if (!allowed) return <p className="text-xs text-muted-foreground">🔒 OSPEC pipeline · BLACKBOX</p>;
  const labels: [string, string, string][] = [['total','Targets','Цели'],['completed','Completed','Завершено'],['pending','Pending','Ожидают'],['retry','Retry','Повтор'],['active','Active','Активны'],['incomplete','Incomplete','Неполные'],['outbox','Publication backlog','Ожидают публикации']];
  return <section aria-label="OSPEC pipeline control" className="w-full rounded-xl border border-primary/35 bg-card p-3 space-y-2 font-mono text-xs">
    <h3 className="font-bold text-primary">OSPEC · {isRu ? 'Статический конвейер' : 'Static pipeline'}</h3>
    <div className="flex flex-wrap gap-2">
      <button type="button" disabled={busy || !data || !!error} onClick={() => void control()} className="rounded border border-primary px-3 py-2 disabled:opacity-50">{busy ? (isRu ? 'Проверка…' : 'Checking…') : !data ? (isRu ? 'Статус неизвестен' : 'State unknown') : data.running ? (isRu ? 'Работает · Пауза' : 'Running · Pause') : data.state.toLowerCase() === 'paused' ? (isRu ? 'Пауза · Продолжить' : 'Paused · Resume') : `${data.state} · ${isRu ? 'Старт' : 'Start'}`}</button>
      <button type="button" disabled={busy} onClick={() => void refresh()} className="rounded border px-3 py-2 disabled:opacity-50">{isRu ? 'Обновить статус' : 'Refresh status'}</button>
    </div>
    {error && <p role="alert" className="text-destructive">{error}</p>}
    <dl className="flex flex-wrap gap-4">{labels.map(([key,en,ru]) => <div key={key}><dt>{isRu ? ru : en}</dt><dd className="font-bold">{typeof data?.counts?.[key] === 'number' ? data.counts[key]!.toLocaleString() : '—'}</dd></div>)}</dl>
    <p>{isRu ? 'Поколение' : 'Generation'}: {data?.generation ?? '—'} · Engine: {data?.engine ?? '—'}</p>
    <p>Heartbeat: {data?.heartbeat == null ? '—' : JSON.stringify(data.heartbeat)}</p>
    <p>{isRu ? 'Сбор новых репозиториев отдельно. Неполный скан ≠ чистый. Статический анализ не проверяет живость ключей.' : 'Discovery is separate. Incomplete is not clean. Static scanning does not validate credentials.'}</p>
    {data?.limitations?.map(text => <p key={text}>{text}</p>)}
  </section>;
}
