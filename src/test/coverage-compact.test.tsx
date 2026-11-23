import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { OspecRescanCoverage } from '../components/OspecRescanCoverage';

describe('compact coverage disclosure', () => {
  it('shows historical zero-hit partial evidence without a failed badge', () => {
    render(<OspecRescanCoverage repoCoverage={{'https://github.com/fixture/partial':{status:'failed',coverage:{complete:false,succeeded:234,required:235,eligible:47,finalization:{succeeded:46,required:47}}}}} isRu />);
    fireEvent.click(screen.getByRole('button', {name:'Подробнее'}));
    expect(screen.getByText('Неполный скан')).toBeInTheDocument();
    expect(screen.queryByText(/· Ошибка/)).not.toBeInTheDocument();
    expect(screen.getByText(/Файлы: 46\/47/)).toBeInTheDocument();
  });
  it('keeps an unknown page compact and reveals repositories only on request', () => {
    const findings = Array.from({length:32}, (_,i) => ({repo_url:`https://github.com/fixture/repo-${i}`}));
    const {container} = render(<OspecRescanCoverage findings={findings} isRu />);
    expect(screen.queryByText(findings[0].repo_url)).not.toBeInTheDocument();
    const toggle = screen.getByRole('button', {name:/Подробнее/});
    expect(toggle).toHaveAttribute('aria-expanded','false');
    expect(container.textContent).not.toMatch(/UNKNOWN|Publication:|Engine:|Commit:/);
    fireEvent.click(toggle);
    expect(screen.getByText(findings[0].repo_url)).toBeInTheDocument();
    expect(screen.getAllByText('Нет данных')).toHaveLength(32);
    expect(container.textContent).not.toContain('—/—');
    fireEvent.click(screen.getByRole('button', {name:/Свернуть/}));
    expect(screen.queryByText(findings[0].repo_url)).not.toBeInTheDocument();
  });
});
