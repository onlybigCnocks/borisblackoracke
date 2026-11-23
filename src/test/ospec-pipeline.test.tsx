import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DiscoveryBackfillControl from '@/components/DiscoveryBackfillControl';
import OspecPipelinePanel from '@/components/OspecPipelinePanel';
vi.mock('@/lib/auth', () => ({ authHeaders: () => ({ Authorization: 'Bearer fixture' }) }));
const state = (running = true) => ({ ok: true, running, state: running ? 'RUNNING' : 'PAUSED', generation: 'fixture-generation', engine: 'fixture-engine', counts: { total: 10, completed: 3, pending: 4, retry: 1, active: 2, incomplete: 1, outbox: 2 }, heartbeat: null, scope: 'static', limitations: ['No credential probes'] });
const response = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
describe('OSPEC shared pipeline control', () => {
  it('keeps Backfill discovery control separate and verifies readback', async () => {
    const fetcher=vi.fn().mockImplementationOnce(()=>response({ok:true,status:{ok:true,running:false}})).mockImplementationOnce(()=>response({ok:true,status:{ok:true,running:true}})).mockImplementationOnce(()=>response({ok:true,status:{ok:true,running:true}}));
    vi.stubGlobal('fetch',fetcher);
    render(<DiscoveryBackfillControl tier="BLACKBOX" isRu={false} />);
    fireEvent.click(await screen.findByRole('button',{name:/Discovery.*Start/}));
    await screen.findByRole('button',{name:/Discovery.*Pause/});
    expect(fetcher.mock.calls.map(call=>JSON.parse(call[1].body).action)).toEqual(['backfill_status','start_backfill','backfill_status']);
  });
  it('reads campaign progress and confirms pause via separate readback', async () => {
    const fetcher = vi.fn().mockImplementationOnce(() => response({status: state()})).mockImplementationOnce(() => response({ok:true,status:state(false)})).mockImplementationOnce(() => response({status:state(false)}));
    vi.stubGlobal('fetch', fetcher);
    render(<OspecPipelinePanel tier="BLACKBOX" isRu={false} />);
    const button = await screen.findByRole('button', { name: /Auto-Scan: ON/ });
    expect(screen.getByText(/Scanned 3\/10/)).toBeInTheDocument();
    fireEvent.click(button);
    await screen.findByRole('button', { name: /Auto-Scan: PAUSED/ });
    expect(JSON.parse(fetcher.mock.calls[1][1].body).action).toBe('pause');
    expect(JSON.parse(fetcher.mock.calls[2][1].body).action).toBe('status');
  });
  it.each(['GUEST','RADAR','RAW'])('does not fetch or control for %s', async tier => {
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    render(<OspecPipelinePanel tier={tier} isRu={false} />);
    expect(screen.getByText(/BLACKBOX/)).toBeInTheDocument();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each([401,403,500])('fails closed on HTTP %s', async code => {
    vi.stubGlobal('fetch', vi.fn(() => response({detail:'Denied'}, code)));
    render(<OspecPipelinePanel tier="BLACKBOX" isRu={false} />);
    await screen.findByRole('alert');
    expect(screen.getByRole('button', { name: /Auto-Scan: state unknown/ })).toBeDisabled();
  });
  it('rejects unconfirmed control and cannot double-submit', async () => {
    let finish!: (r: Response) => void;
    const fetcher = vi.fn().mockImplementationOnce(() => response({status:state()})).mockImplementationOnce(() => new Promise(r => { finish=r; }));
    vi.stubGlobal('fetch',fetcher);
    render(<OspecPipelinePanel tier="BLACKBOX" isRu={false} />);
    const button = await screen.findByRole('button', {name:/Auto-Scan: ON/});
    fireEvent.click(button); fireEvent.click(button);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(button).toBeDisabled();
    finish(new Response(JSON.stringify({ok:false,error:'Not confirmed'})));
    await screen.findByRole('alert');
    expect(screen.getByRole('button',{name:/Auto-Scan: state unknown/})).toBeDisabled();
  });
  it.each([true, false])('keeps the selected language and hides technical dumps: ru=%s', async isRu => {
    vi.stubGlobal('fetch', vi.fn(() => response({status: {...state(false), heartbeat: {lease_expires: null}, limitations: ['Static detection is not credential validity.']}})));
    const view = render(<OspecPipelinePanel tier="BLACKBOX" isRu={isRu} />);
    await screen.findByRole('button', {name: isRu ? /Авто-Скан: ПАУЗА/ : /Auto-Scan: PAUSED/});
    const text = view.container.textContent || '';
    for (const hidden of ['fixture-generation', 'fixture-engine', 'Heartbeat', 'lease_expires', 'Static detection is not credential validity.', 'Publication backlog']) expect(text).not.toContain(hidden);
    if (isRu) { expect(text).toContain('Проверено 3/10'); expect(text).not.toMatch(/Scanned|Refresh|Auto-Scan/); }
    else { expect(text).toContain('Scanned 3/10'); expect(text).not.toMatch(/Проверено|Обновить|Авто-Скан/); }
  });
  it('discards a late status response across tier changes', async () => {
    let finish!: (r: Response) => void;
    const fetcher = vi.fn(() => new Promise(r => { finish=r; })); vi.stubGlobal('fetch', fetcher);
    const view=render(<OspecPipelinePanel tier="BLACKBOX" isRu={false} />);
    view.rerender(<OspecPipelinePanel tier="RAW" isRu={false} />);
    finish(new Response(JSON.stringify({status:state()})));
    await waitFor(() => expect(screen.queryByText(/Scanned/)).not.toBeInTheDocument());
    expect(screen.queryByRole('button',{name:/Pause/})).not.toBeInTheDocument();
  });
});
