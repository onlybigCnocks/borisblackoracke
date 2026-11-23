import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { OspecRescanVersions } from '../components/OspecRescanVersions';
describe('optional finding history',()=>{
 it('renders nothing for an empty history',()=>{
  const {container}=render(<OspecRescanVersions versions={[]} page={{total:0,offset:0,limit:10,has_more:false}} rank={3} isRu />);
  expect(container).toBeEmptyDOMElement();
 });
 it('keeps existing history optional without internal publication jargon',()=>{
  const {container}=render(<OspecRescanVersions versions={[{cls:'REAL',kind:'secret:fixture',secret_full:'fixture-only'}]} rank={3} isRu />);
  expect(screen.queryByText('fixture-only')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'История находки'}));
  expect(screen.getByText('fixture-only')).toBeInTheDocument();
  expect(container.textContent).not.toMatch(/upstream|проекция API|повторного сканирования|UNKNOWN|Publication:|Engine:/);
 });
});
