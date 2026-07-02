## Findings

Scanned `src/` for `375`, `100vh`, and `safe-area-inset-bottom`:

- Three files still cap content at `max-w-[375px]`:
  - `src/components/GapChoiceModal.tsx:53` — modal card
  - `src/routes/auth.tsx:72` — sign-in column
  - `src/routes/_authenticated/day.$dayId.tsx:219` — sticky "Finish workout" bar
- `src/routes/auth.tsx:72` uses `min-h-screen` (Tailwind maps this to `100vh` → shifts on mobile URL bar).
- `src/lib/error-page.ts:9` inline CSS uses `min-height: 100vh`.
- BottomNav (`src/routes/_authenticated/route.tsx:160`) already sets `paddingBottom: "calc(env(safe-area-inset-bottom) + 10px)"` — already safe-area aware. No change needed; this satisfies the intent (guarantees ≥10px base + full inset on notched phones), and is stronger than a bare `env(..., 12px)` fallback.
- `.glass-card` (16px padding) and `.glass-stat` (14px/12px padding, `text-align: center`) are fluid — they already resize with their parent and have no fixed widths. At 320px the interior is 320 − 32 (shell px-4) = 288px, which is still comfortable for existing 2-col stat grids. No intrinsic overflow risk from the utilities themselves.

## Changes

1. **`src/components/GapChoiceModal.tsx:53`** — replace `max-w-[375px]` with `max-w-[480px]` so the modal tracks the new shell width.
2. **`src/routes/auth.tsx:72`** — replace `max-w-[375px]` with `max-w-[480px]`, and `min-h-screen` with `min-h-dvh` (Tailwind v4 arbitrary-value equivalent for `min-height: 100dvh`).
3. **`src/routes/_authenticated/day.$dayId.tsx:219`** — replace `max-w-[375px]` with `max-w-[480px]` on the sticky "Finish workout" bar so it stays flush with shell content edges.
4. **`src/lib/error-page.ts:9`** — replace `min-height: 100vh` with `min-height: 100dvh` in the inline error-page CSS.

## Not changing

- BottomNav padding — already handles safe area (see above).
- `.glass-card`, `.glass-stat`, or any other interior spacing/wrapping. Nothing in the utilities is width-locked; will re-check visually only if the user reports overflow at either extreme.
- No `min-w-[320px]` needed on the modal/auth/sticky bars since the shell already enforces `min-width: 320px` and these children are `mx-auto` inside it — adding it would create horizontal overflow at very narrow parents.

## Verification

After edits, `rg -n "max-w-\[375px\]|min-h-screen|100vh" src/ --glob '!routeTree.gen.ts'` should return zero shell-affecting hits (the only surviving `100vh` would be none).