import { useEffect, useRef, useState } from 'react';
import { authHeaders } from '@/lib/auth';
import OspecSizeQueues from './OspecSizeQueues';
const API = import.meta.env.VITE_API_URL || 'https://api.black-oracle.com';
type Status = { size_queues?: { counts?: { lane: string; state: string; count: number }[] }; ok: boolean; running: boolean; state: string; generation?: string; engine?: string; counts?: Record<string, number | null>; heartbeat?: unknown; scope?: string; limitations?: string[] };

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
  if (!allowed) return <p className="text-xs text-muted-foreground">🔒 {isRu ? 'Управление OSPEC · BLACKBOX' : 'OSPEC controls · BLACKBOX'}</p>;
  const count = (key: string) => typeof data?.counts?.[key] === 'number' ? data.counts[key]!.toLocaleString(isRu ? 'ru-RU' : 'en-US') : '—';
  return <section aria-label="OSPEC pipeline control" className="flex flex-wrap items-center gap-2 text-xs">
    <button type="button" disabled={busy || !data || !!error} onClick={() => void control()} className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-bold transition-all disabled:opacity-50 ${data?.running ? 'border-green-500/70 bg-green-500/20 text-green-300' : 'border-amber-500/70 bg-amber-500/20 text-amber-300'}`}>
      <span>{busy ? (isRu ? 'Проверка…' : 'Checking…') : !data ? (isRu ? 'Авто-Скан: статус неизвестен' : 'Auto-Scan: state unknown') : data.running ? (isRu ? '🟢 Авто-Скан: РАБОТАЕТ (⏸ Стоп)' : '🟢 Auto-Scan: ON (⏸ Pause)') : data.state.toLowerCase() === 'paused' ? (isRu ? '⏸ Авто-Скан: ПАУЗА (▶ Продолжить)' : '⏸ Auto-Scan: PAUSED (▶ Resume)') : (isRu ? '▶ Авто-Скан: запуск' : '▶ Auto-Scan: start')}</span>
    </button>
    <button type="button" disabled={busy} onClick={() => void refresh()} className="rounded-lg border px-2.5 py-1.5 disabled:opacity-50">{isRu ? '↻ Обновить' : '↻ Refresh'}</button>
    {data && <span className="text-muted-foreground">{isRu ? `Проверено ${count('completed')}/${count('total')} · в работе ${count('active')} · повтор ${count('retry')}` : `Scanned ${count('completed')}/${count('total')} · active ${count('active')} · retry ${count('retry')}`}</span>}
    {data && Number(data.counts?.previous_engine_completed || 0) > 0 && <span className="text-muted-foreground">{isRu ? `Из них предыдущей версией: ${count('previous_engine_completed')}` : `Including previous engine: ${count('previous_engine_completed')}`}</span>}
    {data && <OspecSizeQueues data={data.size_queues} isRu={isRu} />}
    {error && <p role="alert" className="w-full text-destructive">{isRu ? '⚠ Не удалось подтвердить состояние OSPEC. Сбор репозиториев работает отдельно. Обновите статус.' : '⚠ OSPEC state could not be confirmed. Repository discovery is independent. Refresh status.'}</p>}
  </section>;
}
