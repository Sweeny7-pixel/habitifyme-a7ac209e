## Changes

**src/styles.css line 229** (`@utility glass-shell`):
```
  max-width: 480px;
  min-width: 320px;
```
(replaces `max-width: 375px;`)

**src/styles.css line 635** (`@utility glass-bottom-sheet`):
```
  max-width: 480px;
  min-width: 320px;
```
(replaces `max-width: 375px;`)

## Not changing (already correct)

- **Bottom nav safe area:** `src/routes/_authenticated/route.tsx` line 160 already sets `paddingBottom: "calc(env(safe-area-inset-bottom) + 10px)"` on the `<footer>` that wraps the nav. No change needed.
- **Viewport height:** no `100vh` anywhere in `src/styles.css` or `_authenticated/route.tsx`. The shell already uses `100dvh` in the `@media (min-width: 420px)` block (line 238). No change needed.
- Colors, glass/blur, neon accents, clay aliases, and card interior spacing all untouched.