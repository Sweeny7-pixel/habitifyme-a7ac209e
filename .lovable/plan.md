## Scope
Save the full V4 roadmap for reference, then implement only **Phase 1 (audit) + Phase 2 (XP Engine) + Phase 3 (Level System)**. Everything else (Habit Score, check-in, triggers, achievements, etc.) is deferred to later turns and left as documentation.

No changes to existing UI, navigation, onboarding, workout generation, or the four AI helpers in `src/lib/gym.functions.ts`. This is additive.

## Phase 1 — Audit (read-only, done during implementation)
Confirm existing routes, `_authenticated` layout, `profiles`/`weeks`/`workout_days`/`exercise_logs`/`week_reviews` tables, and the current server-fn pattern in `src/lib/gym.functions.ts` before wiring XP calls. No file changes.

## Phase 2 — XP Engine

### Database migration
New table `public.xp_transactions`:
- `id uuid PK default gen_random_uuid()`
- `user_id uuid NOT NULL` (indexed)
- `reason text NOT NULL` (e.g. `workout_complete`, `weekly_review`, `profile_complete`, `sunday_planning`, `diet_logging`, `streak_7`, `bonus_surprise`)
- `amount integer NOT NULL` (signed, so deductions are negative)
- `metadata jsonb NOT NULL default '{}'`
- `created_at timestamptz NOT NULL default now()` (indexed)
- Optional `dedupe_key text` with a **partial unique index** on `(user_id, dedupe_key) WHERE dedupe_key IS NOT NULL` — prevents double-award for the same source event (e.g. `workout_day:<id>`).

Grants + RLS in the same migration (per the cloud rules):
- `GRANT SELECT, INSERT ON public.xp_transactions TO authenticated;` (no UPDATE/DELETE from client)
- `GRANT ALL ON public.xp_transactions TO service_role;`
- Enable RLS.
- Policy: `SELECT` own rows (`auth.uid() = user_id`), `INSERT` own rows (`auth.uid() = user_id`).
- Index on `(user_id, created_at desc)`.

### XP config (configurable, no hardcoding in UI)
New file `src/lib/xp-config.ts`:
```ts
export const XP_REWARDS = {
  workout_complete: 50,
  gym_checkin: 20,
  weekly_review: 40,
  streak_7: 150,
  profile_complete: 25,
  sunday_planning: 30,
  diet_logging: 15,
  bonus_surprise: 150,
} as const;
export type XpReason = keyof typeof XP_REWARDS;
export const BONUS_SURPRISE_CHANCE = 0.10;
```

### Server functions
New file `src/lib/xp.functions.ts` (client-safe path, per stack rules — NOT under `src/server/`). All use `.middleware([requireSupabaseAuth])`:
- `awardXP({ reason, dedupeKey?, metadata? })` — looks up amount from `XP_REWARDS`, inserts a row via `context.supabase`, rolls a `bonus_surprise` (10%) and inserts a second row if it hits. Returns `{ awarded, bonus }`. Idempotent via `dedupe_key`.
- `deductXP({ reason, amount, metadata? })` — inserts a negative row.
- `getXPSummary()` — returns `{ totalXP, weeklyXP, level, xpIntoLevel, xpForNextLevel, recent: XpTransaction[] }`. Level math imported from `xp-config.ts`.
- `getXPHistory({ limit? })` — recent transactions.

### Wiring (minimal, no UI redesign)
- Call `awardXP({ reason: 'workout_complete', dedupeKey: 'workout_day:'+dayId })` from the existing workout-finish handler in `src/routes/_authenticated/day.$dayId.tsx`.
- Call `awardXP({ reason: 'weekly_review', dedupeKey: 'week_review:'+weekId })` from the existing weekly-review submit in `src/routes/_authenticated/review.$weekId.tsx`.
- Call `awardXP({ reason: 'profile_complete', dedupeKey: 'profile:'+userId })` once at the end of `saveProfile` flow in onboarding.
- No new pages, no changes to home/calendar/diet layouts yet.

## Phase 3 — Level System

Pure functions in `src/lib/xp-config.ts` (no DB — levels are derived from `totalXP`):
```ts
export const LEVEL_THRESHOLDS = [0, 150, 400, 800, 1400, 2200, 3200, 4400, 5800, 7400];
export function getLevel(totalXP: number): number { /* binary search */ }
export function getLevelProgress(totalXP: number): { level, xpIntoLevel, xpForNextLevel, pct };
```

Levels are returned by `getXPSummary`; no dedicated UI for celebration/badges in this cycle (deferred to Phase 11/15). Consumers get the numbers; visual polish is a later phase.

## Non-goals (deferred)
- Habit Score (Phase 4), Habit Dashboard (Phase 5), Check-in (Phase 6), Triggers/Recovery/Sunday/Surprise UI (Phase 7-10), Achievements (Phase 11), Offline (Phase 12), Analytics events (Phase 13), Segmentation (Phase 14), Animations (Phase 15), other tables (Phase 16), edge functions (Phase 17), broader refactor/tests (Phase 18-20).
- No changes to existing components, styles, navigation, or the four AI helpers.
- Not fixing the earlier `LOVABLE_API_KEY missing` error in this cycle (raise separately if it still reproduces).

## Files touched
- **New:** `supabase/migrations/<ts>_xp_transactions.sql` (via migration tool), `src/lib/xp-config.ts`, `src/lib/xp.functions.ts`, `.lovable/plan.md` (roadmap for reference).
- **Edited (small call-site additions only):** `src/routes/_authenticated/day.$dayId.tsx`, `src/routes/_authenticated/review.$weekId.tsx`, `src/routes/_authenticated/onboarding.tsx`.

## Verification
- Migration approved and applied; `xp_transactions` visible with RLS + grants.
- Finish a workout → one `workout_complete` row appears; finishing the same day again does NOT insert a duplicate (dedupe key).
- `getXPSummary()` returns correct `totalXP` and `level` for a seeded user.
