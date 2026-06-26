# GymBuddy — Dark-Glassmorphism Migration (All 4 Steps)

End-to-end visual overhaul. Every step is presentation-only: no schema, no server fns, no query keys, no hooks change. Steps are sequential — each builds on the utilities from the previous one.

---

## Step 1 — Global Core Architecture & Theme Migration ✅ (done)

**Files**: `src/styles.css`, `src/routes/__root.tsx`, `src/routes/_authenticated/route.tsx`

- New design tokens: `--bg-base #0A0C0F`, `--bg-layer #0F1318`, mesh-gradient stops (Indigo / Emerald / Wine), neon palette (`--color-neon-orange #FF6B35`, `--color-neon-green #00E5A0`, `--color-neon-blue #4D9EFF`, `--color-neon-amber #FFB830`, `--color-neon-purple #A67BFF`), glass surfaces (`--glass-1/2/3`, `--glass-border`), text scale (`--text-primary/secondary/muted`).
- Core glass utilities: `glass-shell`, `glass-card`, `glass-btn` (+ `-ghost`, `-outline`, `-sm`), `glass-stat`.
- Backward-compat aliases: every existing `clay-*` class maps to its glass equivalent so old pages keep building while later steps swap them.
- `__root.tsx`: Inter loaded via `<link>` in root head, `<html className="dark">`, `theme-color #0A0C0F`.
- `_authenticated/route.tsx`: locked mobile shell — `fixed inset-0 overflow-hidden` root with mesh-gradient backdrop, centered 375px `glass-shell` on desktop, frozen header (`pt-[env(safe-area-inset-top)]`), `flex-1 overflow-y-auto overscroll-contain` main, frozen 5-tab bottom nav (Home, Workout, Nutrition, Calendar, Profile) with orange-tint active pill + glowing dot.

---

## Step 2 — Home & Workout Dark-Glass Restyle

**Files**: `src/styles.css`, `src/routes/_authenticated/home.tsx`, `src/routes/_authenticated/day.$dayId.tsx`

### New utilities (append to `styles.css`)

- Tinted card variants: `glass-card-orange / -green / -amber / -blue / -purple` (inset top highlight + colored ring shadow, gradient tint).
- `glass-pill`, `focus-pill` (neon-blue tint), `muscle-pill`.
- `glass-input`: dark glass field, neon-orange focus ring, native number spinners hidden for dark theme.
- `@keyframes pulse-glow` + `flame-halo` (48px halo around streak flame).
- `prog-bar` with neon-orange fill + glow.
- `day-row` hover, `glass-btn-green` with `[data-complete="true"]` filled-green success state.

All color literals are spelled out (no nested `color-mix()`) for Safari/Lightning CSS reliability.

### `home.tsx`

- Greeting: `Hey {name} 👋` + `glass-pill` showing `Week {N} · {monthName}`.
- Prompt/Reset → `glass-btn glass-btn-ghost`.
- Streak hero: `glass-card glass-card-orange` with inner `flame-halo`; absolute top-right `PERSONAL BEST` amber `glass-pill`.
- New 2-col metric grid (above day list): `glass-card-green` Workouts Done + `glass-card-amber` Calories (from `diet?.daily_calories ?? '—'`).
- Day list: `glass-card p-0` with `divide-dashed divide-white/10`, rows use `day-row`, neon-green check when done.
- Diet preview, "Week done" banner: clay → glass equivalents.

### `day.$dayId.tsx`

- Subtitle pill: `glass-pill` reading `Week {week_number ?? '—'} · Day {day_index}`.
- Progress card: `glass-card` + `prog-bar`.
- Exercise list rows: `glass-card` buttons with a chevron rotating `-90°↔0°` based on `activeIdx === idx`; muscle chips use `muscle-pill`.
- Sticky finish bar: `glass-btn glass-btn-green` with `data-complete={!!day.completed_at}`; shows `CheckCircle2` when complete.
- `ExerciseSheet`: inputs/textareas → `glass-input`; range `accent-[var(--color-neon-orange)]`; form-cue → `glass-card-orange` with left neon border; instructions → `glass-card` with chevron rotate; Save/Skip → `glass-btn`/`glass-btn-ghost`. Sheet shell uses `bg-[rgba(15,19,24,0.95)] backdrop-blur-3xl` ahead of Step 4's global sheet unification.

---

## Step 3 — Nutrition & Calendar Dark-Glass Restyle

**Files**: `src/styles.css`, `src/routes/_authenticated/diet.tsx`, `src/routes/_authenticated/calendar.tsx`

### New utilities

- `glass-macro-dot` (8px colored dot).
- `glass-day-btn`, `glass-day-btn-active` (orange tint + glow), `glass-day-btn-completed` (green tint + `::after` glowing 4px dot).
- `protein-highlight` (left amber border + tint).
- `kcal-pill` (amber pill), `allergy-pill` (red pill, hover state).
- `weekly-progress-fill` (purple→blue gradient bar with halo).

### `diet.tsx`

- Empty/error/loading: glass cards + neon-orange spinner.
- Week selector pills: `glass-pill` (active uses inline orange neon override).
- Day strip: `glass-day-btn` / `glass-day-btn-active`; workout-day indicator uses `glass-macro-dot` colored neon-orange.
- Day badges: `focus-pill` (workout) / `glass-pill` (rest/today).
- **New summary header** above meals (when `dietForDay` exists): `glass-card glass-card-amber`, 2-column layout.
  - Left: inline SVG donut, `stroke=rgba(255,255,255,0.08)` track, `var(--color-neon-amber)` arc from `day.totalApproxCalories / 2500` (clamped). Center text `{totalApproxCalories} / 2500 kcal`.
  - Right: 3 vertical macro pills (Protein/Carbs/Fat), each a `glass-pill` with green/blue/orange `glass-macro-dot`; values derived inline from total kcal using 0.30/0.45/0.25 (display only, no schema).
- Meal cards: `glass-card` + `kcal-pill`; each item rendered as a row with a 6px neon-orange bullet; header row gets a `Flag Allergy` `allergy-pill` button toggling local `useState<boolean>` + sonner toast (no backend).
- Total card → `glass-card glass-card-amber`. Protein note → `protein-highlight`. Regenerate → `glass-btn-ghost glass-btn-sm`.

### `calendar.tsx`

- Empty / loading → glass + neon-orange spinner.
- View toggle (Week/Month): two `glass-pill` capsules; active uses inline orange neon override.
- `WeekStrip`: `glass-day-btn` / `glass-day-btn-active` / `glass-day-btn-completed`. Indicator dot shown only when `isToday && !done && !isSelected`.
- `MonthGrid`: chevron buttons → `bg-[var(--glass-1)] border border-white/12` ghost circles; weekday headers `text-[var(--text-muted)]`; cells → `glass-day-btn min-h-[36px]` + conditional active/completed modifiers; other-month cells `text-white/15`.
- `SelectedDayPanel`:
  - Workout card → `glass-card-blue`, icon tile blue-tinted, Done chip → green `glass-pill`, exercise chips `muscle-pill`, link → `glass-btn-sm`.
  - Rest day → `glass-card` with muted moon glyph.
  - Meals → `glass-card-amber`, `kcal-pill` for totals/rows, `divide-white/8 divide-dashed`, link → `glass-btn-outline glass-btn-sm`.
  - **New weekly progression card**: `glass-card-purple` with `weekly-progress-fill` whose width = `(weekDoneDays / 7) * 100%` derived inline from `dateToDay` (no new query). Right-aligned `{n}/7`.
  - Status footer → `glass-card-orange`.

---

## Step 4 — Profile, Modal Sweep & Edge Routes Cleanup

**Files**: `src/styles.css`, `src/routes/_authenticated/profile.tsx`, `src/routes/_authenticated/home.tsx`, `src/routes/_authenticated/day.$dayId.tsx`, `src/routes/_authenticated/onboarding.tsx`, `src/routes/_authenticated/progress.tsx`, `src/routes/_authenticated/review.$weekId.tsx`, `src/routes/auth.tsx`

### Final utilities

- `glass-modal-overlay` (fixed inset-0, `bg-black/60 backdrop-blur-sm`, flex bottom-center).
- `glass-bottom-sheet` (`rgba(15,19,24,0.95)`, `backdrop-blur-3xl`, `rounded-t-[28px]`, top white/12 border, `0 -8px 32px rgba(0,0,0,0.5)` shadow, max-w 375px, max-h 90vh, scrollable).
- `glass-sheet-handle` (36×4 white/15), `glass-sheet-close` (28×28 glass circle with X).
- `profile-radial-glow` (top-left orange radial), `profile-avatar` (64px orange→purple gradient, 2.5px white/25 border, orange halo).
- `achievement-badge-unlocked` (56px, glass-3 + purple ring + purple halo, hover scale 1.05), `achievement-badge-locked` (glass-1, opacity 30%).

### `profile.tsx`

- Hero: `glass-card profile-radial-glow` + `profile-avatar` initial, name `text-primary text-xl font-extrabold`, sub `text-secondary`.
- New 3-col physical metrics grid (Age, Height, Weight) using compact `glass-card glass-stat`.
- Stats grid (2-col): `glass-card` with neon-orange values.
- Profile details: single `glass-card p-0` with `divide-y divide-[rgba(255,255,255,0.06)]`; label `text-secondary`, value `text-primary`.
- Allergies: red-tinted `glass-card`; tags → `allergy-pill` with X; input → `glass-input` rounded-full; Add → `glass-btn glass-btn-sm`.
- Weekly progress: `glass-card` + `prog-bar` neon-orange.
- **New Achievements** grid (3-col, 6 tokens derived from existing `stats`):
  - First Workout (`weeksStarted>0`), Week Complete (`weeksDone>0`), Consistent (`avgCompletion>=70`), Reviewer (`reviewsDone>0`), Month Strong (`weeksDone>=4`), Perfectionist (`avgCompletion>=95`).
  - Each uses `achievement-badge-unlocked` (with lucide icon: Flame/Trophy/Target/MessageSquare/CalendarCheck/Crown) or `achievement-badge-locked` (Lock icon overlay). Tooltip via `title`.
- Actions: View Progress → `glass-btn-outline`; Edit Profile / Sign Out → `glass-btn-ghost`.

### Global modal & bottom-sheet unification

Replace ad-hoc `bg-black/45 backdrop-blur-sm` + `bg-white rounded-t-[28px]` shells in `home.tsx` (`Modal`), `day.$dayId.tsx` (`ExerciseSheet`), and any inline sheets with:

```tsx
<div className="glass-modal-overlay" onClick={onClose}>
  <div className="glass-bottom-sheet" onClick={(e) => e.stopPropagation()}>
    <div className="glass-sheet-handle" />
    <div className="flex items-start justify-between gap-2 mb-3">
      <h3 className="text-base font-extrabold text-[var(--text-primary)]">{title}</h3>
      <button onClick={onClose} className="glass-sheet-close"><X className="h-4 w-4" /></button>
    </div>
    {children}
  </div>
</div>
```

All inputs inside sheets → `glass-input`; all buttons → `glass-btn*`; all text classes → `text-[var(--text-primary|secondary|muted)]`.

### Edge routes sweep (`onboarding.tsx`, `auth.tsx`, `progress.tsx`, `review.$weekId.tsx`)

- `clay-card*` → `glass-card*`; `clay-btn*` → `glass-btn*`.
- Inputs/textareas/selects → `glass-input`.
- `text-[color:var(--text-dark|mid|light)]` → `text-[var(--text-primary|secondary|muted)]`; `bg-white` → `bg-[var(--glass-1)]`.
- Drop legacy hard `shadow-[0_3px_0_0_...]`; rely on glass-card shadow or neon halos.
- Auth page: inner card → `glass-card profile-radial-glow`.
- Review page sliders: native + `accent-[var(--color-neon-orange)]`; comment textarea → `glass-input`.

After Step 4 the `clay-*` aliases in `styles.css` remain as a safety net; no component reads them and they can be removed in a follow-up.

---

## Operational summary

```text
Step 1 (done)
  EDIT  src/styles.css
  EDIT  src/routes/__root.tsx
  EDIT  src/routes/_authenticated/route.tsx

Step 2
  EDIT  src/styles.css                              # append utilities
  EDIT  src/routes/_authenticated/home.tsx
  EDIT  src/routes/_authenticated/day.$dayId.tsx

Step 3
  EDIT  src/styles.css                              # append utilities
  EDIT  src/routes/_authenticated/diet.tsx
  EDIT  src/routes/_authenticated/calendar.tsx

Step 4
  EDIT  src/styles.css                              # append final utilities
  EDIT  src/routes/_authenticated/profile.tsx
  EDIT  src/routes/_authenticated/home.tsx          # Modal → glass shell
  EDIT  src/routes/_authenticated/day.$dayId.tsx    # ExerciseSheet → glass shell
  EDIT  src/routes/_authenticated/onboarding.tsx
  EDIT  src/routes/_authenticated/progress.tsx
  EDIT  src/routes/_authenticated/review.$weekId.tsx
  EDIT  src/routes/auth.tsx
```

No backend, schema, server-fn, query-key, or routing changes anywhere across the four steps.
