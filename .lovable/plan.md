## Goal

Fix broken exercise images in prompt-generated plans by normalizing image URL construction in one place, and add a render-time fallback so a failed image never leaves a broken icon on screen.

## Notes on the request

- The target file is `src/lib/gym.functions.ts` (the project has no `src/server/gymbuddy.server.ts`). Both `generateFourWeekPlan` and `generatePlanFromPrompt` live there.
- `src/lib/exercise-db.server.ts` already returns absolute URLs (line 82 prefixes `IMAGE_BASE` when needed). So `match.images` in `generatePlanFromPrompt` is already absolute — but the inconsistency the user flagged is real: one path prefixes, the other trusts upstream. A single `toImageUrl` helper that no-ops on absolute URLs makes both paths identical and safe against future changes.
- `raw.githubusercontent.com` actually serves images with correct `Content-Type`; a server-function proxy would add latency, double bandwidth, and bypass the CDN. I'll skip the proxy route and instead use the lighter `onError` fallback the user listed as the first option. We can revisit the proxy if real users still report broken images after this.

## Changes

### 1. `src/lib/gym.functions.ts`

Add helper right after the existing `IMAGE_BASE` constant (~line 395):

```ts
function toImageUrl(img: string): string {
  if (!img) return "";
  if (img.startsWith("http://") || img.startsWith("https://")) return img;
  return `${IMAGE_BASE}${img}`;
}
```

Update both call sites to use it:

- Line 664 (`generateFourWeekPlan`):
  `images: (cat?.images ?? []).map(toImageUrl)`
- Line 876 (`generatePlanFromPrompt`):
  `images: (match.images ?? []).map(toImageUrl)`

### 2. `src/routes/_authenticated/day.$dayId.tsx`

Two `<img>` tags render exercise images (the card thumbnail and the bottom-sheet demo). Add an `onError` handler to each that hides the broken image and clears `onerror` to prevent infinite loops, matching the pattern in the request:

```tsx
onError={(e) => {
  const el = e.currentTarget;
  el.onerror = null;
  el.style.display = "none";
}}
```

The existing `bg-white/5` container already provides a neutral placeholder when the image is hidden, so no extra markup is needed.

## Out of scope

- Server-side image proxy (`getExerciseImage` server function). Adds cost and latency for a Content-Type issue we have no current evidence of on GitHub's CDN. Keep as a follow-up if the `onError` fallback isn't enough.
- Changes to `exercise-db.server.ts` — it already normalizes correctly.
