import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const css=readFileSync('src/index.css','utf8');
function tokens(name:string) {
 const block=css.match(new RegExp('\\[data-theme="'+name+'"\\]\\s*\\{([^}]+)'))?.[1]||'';
 return Object.fromEntries([...block.matchAll(/--([\w-]+):\s*([^;]+);/g)].map(m=>[m[1],m[2].trim()]));
}
function lum(hsl:string){
 const [h,s,l]=hsl.replace(/%/g,'').split(/\s+/).map(Number);const S=s/100,L=l/100;
 const a=S*Math.min(L,1-L);const f=(n:number)=>{const k=(n+h/30)%12;return L-a*Math.max(-1,Math.min(k-3,9-k,1));};
 const rgb=[f(0),f(8),f(4)].map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4);
 return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];
}
function contrast(a:string,b:string){const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
describe.each(['crimson','mono','emerald','light'])('accessible %s palette',theme=>{
 const t=tokens(theme);
 it('defines a distinct high contrast action accent',()=>{expect(t.action).toBeTruthy();expect(t.action).not.toBe(t.primary);expect(contrast(t.action,t['action-foreground'])).toBeGreaterThanOrEqual(4.5);});
 it('keeps body and secondary text readable on cards',()=>{expect(contrast(t.foreground,t.card)).toBeGreaterThanOrEqual(7);expect(contrast(t['muted-foreground'],t.card)).toBeGreaterThanOrEqual(4.5);});
});
