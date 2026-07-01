## Fix: Weekly progress bar looks 100% full when 0/5 completed

### Bug
In `src/styles.css`, `@utility weekly-progress-fill` sets the purple→blue gradient on the **track** itself. The inner `<div style={{ width: pct% }}>` has no background, so at 0% the visible bar is still the full gradient track — misleading users into thinking the week is complete.

### Fix
Swap the styles so the track is a muted glass surface and the inner fill carries the gradient + glow.

```css
@utility weekly-progress-fill {
  height: 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  overflow: hidden;

  > div {
    height: 100%;
    border-radius: 999px;
    background: linear-gradient(90deg, var(--neon-purple), var(--neon-blue));
    box-shadow: 0 0 12px rgba(166, 123, 255, 0.35);
    transition: width .3s ease;
  }
}
```

No component changes needed — `calendar.tsx` already renders the correct `<div style={{ width: `${pct}%` }} />` structure. One CSS-only edit.
