import { useEffect, useRef, useState } from 'react';
import { authHeaders } from '@/lib/auth';
const API = import.meta.env.VITE_API_URL || 'https://api.black-oracle.com';
export default function DiscoveryBackfillControl({ tier, isRu }: { tier?: string; isRu: boolean }) {
  const allowed=tier?.toUpperCase()==='BLACKBOX';
  const [running,setRunning]=useState<boolean|null>(null);
  const [busy,setBusy]=useState(false); const [error,setError]=useState('');
  const epoch=useRef(0); const lock=useRef(false); const request=useRef<AbortController|null>(null);
  async function call(action:string,signal:AbortSignal) {
    const response=await fetch(`${API}/api/tools/ospec-daemon-control`,{method:'POST',signal,headers:{'Content-Type':'application/json',...authHeaders()},body:JSON.stringify({action})});
    const body=await response.json();
    if(!response.ok || body.ok!==true || body.status?.ok!==true || typeof body.status.running!=='boolean') throw new Error(typeof body.detail==='string'?body.detail:'Discovery state not confirmed');
    return body.status.running as boolean;
  }
  async function perform(change=false) {
    if(!allowed || lock.current || (change && running===null))return;
    lock.current=true;setBusy(true); const id=++epoch.current;
    request.current?.abort();const abort=new AbortController();request.current=abort;
    const timer=window.setTimeout(()=>abort.abort(),30000);
    try {
      const wanted=!running;
      if(change)await call(wanted?'start_backfill':'pause_backfill',abort.signal);
      const next=await call('backfill_status',abort.signal);
      if(change && next!==wanted)throw new Error('Discovery readback mismatch');
      if(id===epoch.current){setRunning(next);setError('');}
    }catch(e){if(id===epoch.current){setRunning(null);setError(e instanceof Error?e.message:'Discovery unavailable');}}
    finally{window.clearTimeout(timer);if(id===epoch.current){lock.current=false;setBusy(false);}}
  }
  useEffect(()=>{++epoch.current;request.current?.abort();lock.current=false;setRunning(null);setError('');if(allowed)void perform();return()=>{++epoch.current;request.current?.abort();};},[tier]);
  if(!allowed)return null;
  return <div className="flex flex-wrap items-center gap-2 text-xs">
    <button type="button" disabled={busy || running===null} onClick={()=>void perform(true)} className="rounded border px-3 py-2 disabled:opacity-50">Discovery / Backfill · {running===null?(isRu?'Неизвестно':'Unknown'):running?(isRu?'Пауза':'Pause'):(isRu?'Старт':'Start')}</button>
    <button type="button" disabled={busy} onClick={()=>void perform()} className="rounded border px-2 py-2">{isRu?'Обновить сбор':'Refresh discovery'}</button>
    {error && <span role="alert">{error}</span>}
  </div>;
}
