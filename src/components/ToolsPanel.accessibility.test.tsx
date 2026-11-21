import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ToolsPanel from './ToolsPanel';
vi.mock('react-i18next', () => ({ useTranslation: () => ({ i18n: { language: 'en' } }) }));
vi.mock('@/lib/auth', () => ({
  getSavedUser: () => ({ id: 'synthetic', tier: 'RAW' }),
  authHeaders: () => ({}),
  apiGetToolHistory: vi.fn().mockResolvedValue([]),
  apiGetToolHistoryItem: vi.fn(),
  apiGetOspecFindingDetail: vi.fn(),
  apiGetHackWriteup: vi.fn(),
}));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it('exposes a named blockchain selector and keeps selection local', async () => {
  const fetchSpy = vi.fn().mockRejectedValue(new Error('Network prohibited in this fixture'));
  vi.stubGlobal('fetch', fetchSpy);
  render(<ToolsPanel />);
  const select = await screen.findByRole('combobox', { name: 'Blockchain network' });
  expect(select).toHaveValue('ethereum');
  fireEvent.change(select, { target: { value: 'base' } });
  await waitFor(() => expect(select).toHaveValue('base'));
  expect(fetchSpy).not.toHaveBeenCalled();
});
