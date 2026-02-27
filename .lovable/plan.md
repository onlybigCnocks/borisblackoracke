

## Issues

1. **"ПОПУЛЯРНЫЙ" badge on RAW tier is clipped** — the `absolute -top-3` badge is cut off by the parent card's `overflow` or by the grid layout. Need to add `overflow-visible` to the card and ensure the grid row doesn't clip it.

2. **Monthly/Yearly toggle looks wrong** — the toggle knob styling needs fixing: the circle should be properly centered and the transition should be smooth. The current `bg-foreground` (white) circle on `bg-muted` track looks off.

## Plan

### 1. Fix "ПОПУЛЯРНЫЙ" badge clipping (both Index.tsx and Pricing.tsx)
- Add `overflow-visible` to the pricing card `div` that has `relative` positioning
- Add `pt-4` (or `mt-4`) to the popular card wrapper so the badge has space above it

### 2. Fix monthly/yearly toggle (Pricing.tsx)
- Increase toggle size slightly for better UX
- Fix knob positioning with `left-0.5` / `left-[calc(100%-1.625rem)]` for proper slide
- Ensure the track has a clear inactive state (`bg-[#1e1e1e]`) vs active (`bg-primary`)

