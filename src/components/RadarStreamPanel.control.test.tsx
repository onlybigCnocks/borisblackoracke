import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RadarStreamPanel from './RadarStreamPanel';
import RadarDaemonDeck from './RadarDaemonDeck';
vi.mock('react-i18next', () => ({ useTranslation: () => ({ i18n: { language: 'ru' } }) }));
vi.mock('@/lib/auth', async (original) => ({
  ...await original<typeof import('@/lib/auth')>(),
  apiGetRadarFeed: vi.fn(async () => ({ stats: {}, items: [], total: 0, total_pages: 1, page: 1, locked: false })),
}));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); localStorage.clear(); });
it('uses the saved session and displays an HTTP denial instead of success for ZK control', async () => {
  localStorage.setItem('boris_auth_token', 'test-session-not-a-real-token');
  const fetcher = vi.fn(async (_url: string, init?: RequestInit) => new Response(JSON.stringify(
    init?.method === 'POST' ? {detail: 'Control denied by server'} : {ok:true, daemons:{zk_mass_scanner:{running:true}}}
  ), {status: init?.method === 'POST' ? 403 : 200, headers:{'Content-Type':'application/json'}}));
  vi.stubGlobal('fetch', fetcher);
  render(<MemoryRouter future={{v7_startTransition:true, v7_relativeSplatPath:true}}><RadarStreamPanel user={{tier:'BLACKBOX'} as any} onOpenDossier={()=>{}} onPrefillScan={()=>{}} /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', {name:/ZK Math Radar/}));
  const control = await screen.findByRole('button', {name:/Стоп/});
  await waitFor(() => expect(control.hasAttribute('disabled')).toBe(false));
  fireEvent.click(control);
  await waitFor(() => expect(fetcher.mock.calls.some(([, init])=>init?.method === 'POST')).toBe(true));
  const call = fetcher.mock.calls.find(([, init])=>init?.method === 'POST')!;
  expect((call[1]?.headers as Record<string,string>).Authorization).toBe('Bearer test-session-not-a-real-token');
  expect(await screen.findByText(/Control denied by server/)).toBeTruthy();
  expect(screen.queryByText(/Статус ZK Масс-Скана обновлён/)).toBeNull();
});

it.each([
  ['contracts', /Верифицированные контракты/],
  ['soroban', /Soroban \/ Stellar/],
  ['defillama', /^📊 DeFiLlama RADAR\+$/],
])('loads real status and confirms stop for %s', async (radar, tabLabel) => {
  const key = { contracts:'explorer_contracts', soroban:'soroban_radar', defillama:'defillama_radar' }[radar]!;
  let running = true;
  const fetcher = vi.fn(async (_url: string, init?: RequestInit) => {
    if (init?.method === 'POST') { expect(JSON.parse(String(init.body))).toEqual({radar, action:'stop'}); running = false; }
    return new Response(JSON.stringify(init?.method === 'POST' ? {ok:true, running} : {ok:true, daemons:{[key]:{running}}}), {status:200});
  });
  vi.stubGlobal('fetch', fetcher);
  render(<MemoryRouter future={{v7_startTransition:true, v7_relativeSplatPath:true}}><RadarStreamPanel user={{tier:'BLACKBOX'} as any} onOpenDossier={()=>{}} onPrefillScan={()=>{}} /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', {name:tabLabel}));
  fireEvent.click(await screen.findByRole('button', {name:/Стоп/}));
  expect(await screen.findByRole('button', {name:/Старт/})).toBeTruthy();
});

it('does not trust a successful command when status readback contradicts it', async () => {
  vi.stubGlobal('fetch', vi.fn(async (_url, init) => new Response(JSON.stringify(
    init?.method === 'POST' ? {ok:true, running:false} : {ok:true, daemons:{explorer_contracts:{running:true}}}
  ), {status:200})));
  render(<RadarDaemonDeck radar="contracts" isRu onChain={()=>{}} />);
  fireEvent.click(await screen.findByRole('button', {name:/Стоп/}));
  expect(await screen.findByRole('alert')).toHaveTextContent('Сервер не подтвердил');
  expect(screen.getByRole('button', {name:'Статус неизвестен'})).toBeDisabled();
});

it('shows unknown, not paused or zero, when status is unavailable', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({detail:'Status unavailable'}), {status:503})));
  render(<RadarDaemonDeck radar="soroban" isRu onChain={()=>{}} />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Status unavailable');
  expect(screen.getByRole('button', {name:'Статус неизвестен'})).toBeDisabled();
  expect(screen.queryByRole('button', {name:/Старт/})).toBeNull();
});

it('renders real zero counts and network bars, and forwards the selected chain', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ok:true, daemons:{explorer_contracts:{running:false,total_contracts:0,by_chain:{ethereum:0,base:12}}}}), {status:200})));
  const onChain = vi.fn();
  render(<RadarDaemonDeck radar="contracts" isRu onChain={onChain} />);
  fireEvent.click(await screen.findByRole('button', {name:'base 12'}));
  expect(onChain).toHaveBeenCalledWith('base');
  expect(screen.getByRole('button', {name:'ethereum 0'})).toBeTruthy();
});

it('keeps a healthy radar usable when another radar has an unknown status', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ok:false, daemons:{
    soroban_radar:{running:null,error:'Legacy worker ownership unknown'},
    explorer_contracts:{running:true,total_contracts:12}
  }}), {status:200})));
  render(<RadarDaemonDeck radar="contracts" isRu onChain={()=>{}} />);
  expect(await screen.findByRole('button', {name:/Стоп/})).toBeEnabled();
});
