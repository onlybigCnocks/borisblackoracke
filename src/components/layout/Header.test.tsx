import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Header from './Header';
vi.mock('react-i18next',()=>({useTranslation:()=>({t:(s:string)=>s,i18n:{language:'ru',changeLanguage:vi.fn()}})}));
afterEach(()=>{cleanup();localStorage.clear();});
it('ignores an invalid saved theme and exposes an accessible mobile menu',()=>{
 localStorage.setItem('boris_ui_theme','unknown-css-theme');
 render(<MemoryRouter future={{v7_startTransition:true,v7_relativeSplatPath:true}}><Header/></MemoryRouter>);
 expect(document.documentElement.getAttribute('data-theme')).toBe('crimson');
 const menu=screen.getByRole('button',{name:'Открыть меню'});expect(menu).toHaveAttribute('aria-expanded','false');
 fireEvent.click(menu);expect(screen.getByRole('button',{name:'Закрыть меню'})).toHaveAttribute('aria-expanded','true');
 fireEvent.keyDown(window,{key:'Escape'});expect(screen.getByRole('button',{name:'Открыть меню'})).toHaveAttribute('aria-expanded','false');
});
