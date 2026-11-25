import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { it, expect, vi, afterEach } from 'vitest';
import OspecDeferredPanel from './OspecDeferredPanel';
vi.mock('@/lib/auth', () => ({ authHeaders: () => ({ Authorization: 'Bearer inert-test' }) }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it('loads deferred list only on expansion and does not claim scan completion', async () => {
 const fetcher=vi.fn().mockResolvedValue(new Response(JSON.stringify({ok:true,total:1,offset:0,limit:20,has_more:false,items:[{url:'https://github.com/owned/fixture',reason:'scan_incomplete',attempts:2,deferred_at:1}]})));
 vi.stubGlobal('fetch',fetcher);render(<OspecDeferredPanel isRu />);
 expect(fetcher).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:/Отложенные/}));
 await screen.findByText('https://github.com/owned/fixture');
 expect(screen.getByText(/Исключены из автоматического/)).toBeInTheDocument();
 expect(screen.getByRole('button',{name:'Далее'})).toBeDisabled();
});
it('shows failed load rather than empty successful list', async () => {
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({detail:'Denied'}),{status:403})));
 render(<OspecDeferredPanel isRu />);fireEvent.click(screen.getByRole('button',{name:/Отложенные/}));
 await screen.findByRole('alert');expect(screen.queryByText('Отложенных сканов нет')).not.toBeInTheDocument();
});
