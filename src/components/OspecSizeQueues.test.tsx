import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import OspecSizeQueues from './OspecSizeQueues';
describe('OSPEC size queue panel', () => {
  it('shows weights and unknown separately', () => {
    render(<OspecSizeQueues isRu data={{ counts: [
      { lane: 'fast', state: 'pending', count: 12 },
      { lane: 'heavy', state: 'running', count: 3 },
      { lane: 'unknown', state: 'pending', count: 100 },
    ] }} />);
    expect(screen.getByText('60%')).toBeInTheDocument();
    expect(screen.getByText('25%')).toBeInTheDocument();
    expect(screen.getByText('15%')).toBeInTheDocument();
    expect(screen.getByText(/Ещё не классифицированы: 100/)).toBeInTheDocument();
  });
  it('does not invent zero queues when data is absent', () => {
    const { container } = render(<OspecSizeQueues isRu />);
    expect(screen.getByText(/Счётчики очередей не получены/)).toBeInTheDocument();
    expect(container.textContent).not.toContain('Ожидают: 0');
  });
});
